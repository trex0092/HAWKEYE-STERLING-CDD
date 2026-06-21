import { describe, it, expect } from 'vitest';
import {
  parseDate,
  parseAssessment,
  collectDueItems,
  makeDedupKey,
  buildRenewalTask,
  dailyScreeningTask,
  reviewIntervalForRisk,
  extractExistingKeys,
  selectStaleTasks,
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

  it('reads the company name, customer code and license date', () => {
    expect(parsed.companyName).toBe('Veritas Metals Trading LLC');
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

  it('marks expired vs upcoming and respects the lead window', () => {
    const base = parseAssessment(SAMPLE, 'Veritas');
    // License expires in 1 day (within a 2-day lead) → upcoming, not expired.
    base.license = new Date(Date.UTC(2026, 5, 22)); // today + 1
    const license = collectDueItems(base, today, 12, 2).find((i) => i.type === 'license');
    expect(license.status).toBe('upcoming');
    expect(license.daysUntil).toBe(1);

    // 3 days out is beyond the 2-day lead → not flagged.
    base.license = new Date(Date.UTC(2026, 5, 24));
    expect(collectDueItems(base, today, 12, 2).some((i) => i.type === 'license')).toBe(false);

    // Already past → expired regardless of lead.
    base.license = new Date(Date.UTC(2026, 3, 24)); // 24 Apr 2026
    expect(collectDueItems(base, today, 12, 2).find((i) => i.type === 'license').status).toBe(
      'expired',
    );
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
    const task = buildRenewalTask(
      'Veritas Metals Trading LLC',
      'CAS-VER-0042',
      license,
      'https://app.asana.com/x',
    );
    expect(task.name).toContain('Renew License');
    expect(task.name).toContain('Veritas Metals Trading LLC'); // company name, not code
    expect(task.notes).toContain('Customer code: CAS-VER-0042');
    expect(task.dueOn).toBe('2020-03-13');
    const keys = extractExistingKeys([{ notes: task.notes }]);
    expect(keys.has(license.dedupKey)).toBe(true);
  });

  it('matches keys that contain spaces (company-name fallback) without truncating', () => {
    // When a description has no Customer Code, the key is the company name.
    const item = { type: 'license', date: new Date(Date.UTC(2024, 10, 7)) };
    const key = makeDedupKey('NAWAL JEWELLERY TRADING L.L.C', item);
    const task = buildRenewalTask('NAWAL JEWELLERY TRADING L.L.C', 'NAWAL JEWELLERY TRADING L.L.C', {
      ...item,
      kind: 'License',
      person: null,
      status: 'expired',
      daysUntil: -100,
      dedupKey: key,
    });
    const keys = extractExistingKeys([{ notes: task.notes }]);
    expect(keys.has(key)).toBe(true); // full key, not just "NAWAL"
  });

  it('renders an "expiring soon" narrative for upcoming items', () => {
    const item = {
      type: 'license',
      kind: 'License',
      person: null,
      status: 'upcoming',
      daysUntil: 2,
      date: new Date(Date.UTC(2026, 5, 23)),
      dedupKey: 'CAS-VER-0042|license|2026-06-23',
    };
    const task = buildRenewalTask('Veritas Metals Trading LLC', 'CAS-VER-0042', item, null);
    expect(task.name).toContain('expiring soon');
    expect(task.notes).toContain('in 2 days');
  });

  it('makeDedupKey is deterministic', () => {
    const item = { type: 'review', date: new Date(Date.UTC(2019, 1, 1)) };
    expect(makeDedupKey('CAS-VER-0042', item)).toBe('CAS-VER-0042|review|2019-02-01');
  });
});

describe('selectStaleTasks (auto-close when renewed)', () => {
  const knownCodes = new Set(['CAS-VER-0042', 'CAS-HON-0001']);
  const dueKeys = new Set(['CAS-VER-0042|license|2020-03-13']);
  const note = (key) => `dedup-key: ${key}`;

  it('closes an open task whose key is no longer due, for a known customer', () => {
    const tasks = [
      { gid: '1', completed: false, notes: note('CAS-HON-0001|license|2026-04-24') }, // renewed
    ];
    expect(selectStaleTasks(tasks, dueKeys, knownCodes)).toEqual(['1']);
  });

  it('keeps a task whose key is still due', () => {
    const tasks = [{ gid: '2', completed: false, notes: note('CAS-VER-0042|license|2020-03-13') }];
    expect(selectStaleTasks(tasks, dueKeys, knownCodes)).toEqual([]);
  });

  it('ignores already-completed tasks', () => {
    const tasks = [{ gid: '3', completed: true, notes: note('CAS-HON-0001|license|2026-04-24') }];
    expect(selectStaleTasks(tasks, dueKeys, knownCodes)).toEqual([]);
  });

  it('ignores tasks without a dedup-key line', () => {
    const tasks = [{ gid: '4', completed: false, notes: 'a manual note with no key' }];
    expect(selectStaleTasks(tasks, dueKeys, knownCodes)).toEqual([]);
  });

  it('protects hand-made tasks whose code is not a real customer (e.g. SAMPLE)', () => {
    const tasks = [{ gid: '5', completed: false, notes: note('SAMPLE|CAS-VER-0042|license|2026-05-30') }];
    expect(selectStaleTasks(tasks, dueKeys, knownCodes)).toEqual([]);
  });
});

const SCREENING_SAMPLE = `SECTION 1 - CUSTOMER INFORMATION

Company Name                    : Veritas Metals Trading LLC
Customer Code                   : CAS-VER-0042
Date of Registration            : January 10, 2015

SECTION 2 - SANCTIONS SCREENING

UAE Local Terrorist List (EOCN) : Result: Clear | Date: 10 January 2026 | Remarks:
UN Consolidated (UNSC)          : Result: Clear | Date: 05 February 2026 | Remarks:
OFAC SDN List                   : Result: Clear | Date: | Remarks:

SECTION 8 - REVIEW & VERSION CONTROL

Ver. 01 | Date: June 01, 2026 | Reviewed By: A | Type: Initial | Summary:
`;

describe('screening reminders', () => {
  const today = new Date(Date.UTC(2026, 5, 21)); // 2026-06-21

  it('parseAssessment takes the latest Section 2 screening date, ignoring Ver/registration', () => {
    const parsed = parseAssessment(SCREENING_SAMPLE, 'Veritas');
    expect(iso(parsed.lastScreeningDate)).toBe('2026-02-05'); // latest screening, not the Jun Ver. date
  });

  it('lastScreeningDate is null when no Section 2 dates are present', () => {
    const blank = parseAssessment('SECTION 2\nOFAC SDN List : Result: | Date: | Remarks:', 'x');
    expect(blank.lastScreeningDate).toBeNull();
  });

  it('collectDueItems raises a screening item once the interval has elapsed', () => {
    const parsed = parseAssessment(SCREENING_SAMPLE, 'Veritas');
    // last screened 2026-02-05, +1 month = 2026-03-05 ≤ today → due.
    const items = collectDueItems(parsed, today, 12, 0, 1);
    const screening = items.find((i) => i.type === 'screening');
    expect(screening).toBeTruthy();
    expect(iso(screening.date)).toBe('2026-03-05');
    expect(iso(screening.lastScreened)).toBe('2026-02-05');
  });

  it('does not raise screening when recent, or when the interval is 0, or when no date', () => {
    const recent = parseAssessment(SCREENING_SAMPLE.replace(/2026/g, '2099'), 'Veritas');
    expect(collectDueItems(recent, today, 12, 0, 1).some((i) => i.type === 'screening')).toBe(false);

    const parsed = parseAssessment(SCREENING_SAMPLE, 'Veritas');
    expect(collectDueItems(parsed, today, 12, 0, 0).some((i) => i.type === 'screening')).toBe(false);
  });

  it('buildRenewalTask renders the re-screen narrative', () => {
    const item = {
      type: 'screening',
      kind: 'Screening',
      person: null,
      status: 'expired',
      daysUntil: -100,
      date: new Date(Date.UTC(2026, 2, 5)),
      lastScreened: new Date(Date.UTC(2026, 1, 5)),
      dedupKey: 'CAS-VER-0042|screening|2026-03-05',
    };
    const task = buildRenewalTask('Veritas Metals Trading LLC', 'CAS-VER-0042', item, null);
    expect(task.name).toContain('Re-screen');
    expect(task.notes).toContain('last screened');
  });

  it('dailyScreeningTask builds one keyed task per day', () => {
    const t = dailyScreeningTask(today);
    expect(t.name).toContain('Daily sanctions/PEP screening (all customers)');
    expect(t.dedupKey).toBe('SYSTEM|daily-screening|2026-06-21');
    expect(t.dueOn).toBe('2026-06-21');
    expect(extractExistingKeys([{ notes: t.notes }]).has(t.dedupKey)).toBe(true);
  });
});

describe('risk-based CDD review cadence', () => {
  const intervals = { high: 1, medium: 3, low: 6, default: 12 };

  it('maps the risk rating to the review interval', () => {
    expect(reviewIntervalForRisk('High Risk', intervals)).toBe(1);
    expect(reviewIntervalForRisk('MEDIUM', intervals)).toBe(3);
    expect(reviewIntervalForRisk('Low', intervals)).toBe(6);
  });

  it('falls back to the default when missing or unrecognised', () => {
    expect(reviewIntervalForRisk('', intervals)).toBe(12);
    expect(reviewIntervalForRisk(null, intervals)).toBe(12);
    expect(reviewIntervalForRisk('Prohibited', intervals)).toBe(12);
  });

  it('parseAssessment reads the Overall Risk Classification', () => {
    const parsed = parseAssessment(
      'SECTION 6\nOverall Risk Classification     : High\nCDD Level Required : EDD',
      'x',
    );
    expect(parsed.riskClassification).toBe('High');
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
