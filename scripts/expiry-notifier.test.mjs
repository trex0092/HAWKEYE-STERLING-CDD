import { describe, it, expect } from 'vitest';
import {
  parseDate,
  parseAssessment,
  collectDueItems,
  makeDedupKey,
  buildRenewalTask,
  extractExistingKeys,
  addMonths,
  todayInTimeZone,
} from './expiry-notifier.mjs';

const iso = (d) => (d ? d.toISOString().slice(0, 10) : null);

describe('parseDate', () => {
  it('parses the common human formats', () => {
    expect(iso(parseDate('March 13, 2028'))).toBe('2028-03-13');
    expect(iso(parseDate('13 March 2028'))).toBe('2028-03-13');
    expect(iso(parseDate('2028-03-13'))).toBe('2028-03-13');
    expect(iso(parseDate('13/03/2028'))).toBe('2028-03-13'); // day-first
    expect(iso(parseDate('13-03-2028'))).toBe('2028-03-13');
    expect(iso(parseDate('13.03.2028'))).toBe('2028-03-13');
    expect(iso(parseDate('Dec 10, 2026'))).toBe('2026-12-10');
  });

  it('reads ambiguous numeric dates day-first, unambiguous ones correctly', () => {
    expect(iso(parseDate('03/04/2028'))).toBe('2028-04-03'); // ambiguous → day-first
    expect(iso(parseDate('03/13/2028'))).toBe('2028-03-13'); // month-first when 2nd part > 12
  });

  it('skips blanks, N/A and unparseable junk', () => {
    for (const v of ['', '   ', 'N/A', 'na', '-', '—', 'TBD', 'pending', null, undefined, 'soon']) {
      expect(parseDate(v)).toBeNull();
    }
  });

  it('rejects impossible calendar dates', () => {
    expect(parseDate('2028-02-31')).toBeNull();
    expect(parseDate('31/02/2028')).toBeNull();
  });
});

const SAMPLE = `================================================================
COMPLIANCE ASSESSMENT - CUSTOMER & COUNTERPARTY DUE DILIGENCE 2026
================================================================

SECTION 1 - CUSTOMER INFORMATION

Company Name                    : Veritas Metals Trading LLC
Customer Code                   : CAS-VER-0042
Country of Registration         : United Arab Emirates
Date of Registration            : January 10, 2015
License Expiry Date             : March 13, 2020

SECTION 4 - IDENTIFICATIONS

INDIVIDUAL 1
Designation                     : Director
Name                            : Jane Doe
Passport Number/ID              : A1234567
Passport Expiry Date            : 01 January 2021
Emirates ID                     : 784-1990-1234567-1
Emirates ID Expiry              : N/A

INDIVIDUAL 2
Designation                     : Shareholder
Name                            : John Roe
Passport Expiry Date            :
Emirates ID Expiry              : 2099-12-31

SECTION 8 - REVIEW & VERSION CONTROL

Ver. 01 | Date: January 10, 2015 | Reviewed By: A | Type: Initial | Summary: Account Opening
Ver. 02 | Date: February 01, 2018 | Reviewed By: B | Type: Periodic | Summary:
`;

describe('parseAssessment', () => {
  const parsed = parseAssessment(SAMPLE, 'Veritas');

  it('reads the customer code and license date', () => {
    expect(parsed.customerCode).toBe('CAS-VER-0042');
    expect(iso(parsed.license)).toBe('2020-03-13');
  });

  it('keeps passport / Emirates ID dates per individual and skips blanks/N/A', () => {
    expect(parsed.individuals).toHaveLength(2);
    expect(parsed.individuals[0].name).toBe('Jane Doe');
    expect(iso(parsed.individuals[0].passport)).toBe('2021-01-01');
    expect(parsed.individuals[0].emiratesId).toBeNull(); // N/A
    expect(parsed.individuals[1].passport).toBeNull(); // blank
    expect(iso(parsed.individuals[1].emiratesId)).toBe('2099-12-31');
  });

  it('takes the latest dated version line for review derivation', () => {
    expect(iso(parsed.lastReviewDate)).toBe('2018-02-01');
    expect(iso(parsed.registrationDate)).toBe('2015-01-10');
  });
});

describe('collectDueItems', () => {
  const parsed = parseAssessment(SAMPLE, 'Veritas');
  const today = new Date(Date.UTC(2026, 5, 21)); // 2026-06-21

  it('flags only items on/before today and derives the review due date', () => {
    const items = collectDueItems(parsed, today, 12);
    const byType = Object.fromEntries(items.map((i) => [i.type, i]));

    // License (2020) and Jane's passport (2021) are expired.
    expect(byType.license).toBeTruthy();
    expect(byType.passport.person).toBe('Jane Doe');
    // Individual 2's Emirates ID is 2099 — not due.
    expect(items.some((i) => i.type === 'emirates-id')).toBe(false);
    // Review = latest version (2018-02-01) + 12 months = 2019 → overdue.
    expect(iso(byType.review.date)).toBe('2019-02-01');
  });

  it('flags nothing when all dates are in the future', () => {
    const future = parseAssessment(SAMPLE.replace(/20\d\d/g, '2099'), 'Veritas');
    expect(collectDueItems(future, today, 12)).toEqual([]);
  });
});

describe('dedup keys + idempotency', () => {
  const today = new Date(Date.UTC(2026, 5, 21));
  const parsed = parseAssessment(SAMPLE, 'Veritas');
  const items = collectDueItems(parsed, today, 12);

  it('builds stable keys that include type, person and date', () => {
    const license = items.find((i) => i.type === 'license');
    expect(license.dedupKey).toBe('CAS-VER-0042|license|2020-03-13');
    const passport = items.find((i) => i.type === 'passport');
    expect(passport.dedupKey).toBe('CAS-VER-0042|passport|individual-1|2021-01-01');
  });

  it('round-trips through task notes so existing tasks are detected', () => {
    const license = items.find((i) => i.type === 'license');
    const task = buildRenewalTask('CAS-VER-0042', license, 'https://app.asana.com/x');
    expect(task.name).toContain('Renew License');
    expect(task.dueOn).toBe('2020-03-13');
    const keys = extractExistingKeys([{ notes: task.notes }]);
    expect(keys.has(license.dedupKey)).toBe(true);
  });

  it('makeDedupKey is deterministic', () => {
    const item = { type: 'review', date: new Date(Date.UTC(2019, 1, 1)) };
    expect(makeDedupKey('CAS-VER-0042', item)).toBe('CAS-VER-0042|review|2019-02-01');
  });
});

describe('date utilities', () => {
  it('addMonths rolls the year over', () => {
    expect(iso(addMonths(new Date(Date.UTC(2025, 10, 1)), 12))).toBe('2026-11-01');
  });

  it('todayInTimeZone returns a UTC-midnight calendar date', () => {
    // 2026-06-21 23:30 UTC is already 2026-06-22 in Dubai (UTC+4).
    const t = todayInTimeZone('Asia/Dubai', new Date('2026-06-21T23:30:00Z'));
    expect(iso(t)).toBe('2026-06-22');
  });
});
