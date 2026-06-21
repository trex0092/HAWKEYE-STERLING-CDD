/**
 * Expiry notifier — reads customer compliance assessments from the Asana
 * "Customer Database" project and files follow-up tasks for anything expired or
 * overdue, so the reminders land in Asana (Inbox + My Tasks). No email.
 *
 * Why this exists: Asana's built-in reminders only fire from a task Due Date or
 * a real Date custom field — never from text inside a description. The expiry
 * dates here live in each task's description (the "COMPLIANCE ASSESSMENT"
 * template) on purpose, to avoid date columns that slow the database down. So a
 * scheduled job reads those descriptions via the API and creates assigned
 * renewal tasks. It adds zero columns and zero load to the customer database.
 *
 * What it watches (all read from the description):
 *   - License / registration expiry   (Section 1: "License Expiry Date")
 *   - Passport expiry                  (Section 4: per-individual)
 *   - Emirates ID expiry               (Section 4: per-individual)
 *   - Periodic review / refresh due    (derived: latest review/registration
 *                                       date + REVIEW_INTERVAL_MONTHS)
 *
 * Trigger timing is "on/after expiry" — items are flagged once their date is on
 * or before today (Asia/Dubai). Blank / "N/A" / unparseable values are skipped,
 * so it is safe to run while assessments are still being filled in.
 *
 * Auth follows netlify/functions/asana.mts: a Personal Access Token in
 * ASANA_TOKEN (or ASANA_PAT). Configure via env / GitHub Actions secrets.
 *
 * Run: `node scripts/expiry-notifier.mjs`  (set DRY_RUN=1 to print, not write).
 */

import { pathToFileURL } from 'node:url';

const ASANA_API = 'https://app.asana.com/api/1.0';

// ----- config (env with sensible defaults) --------------------------------

export function readConfig(env = process.env) {
  return {
    token: env.ASANA_TOKEN ?? env.ASANA_PAT ?? '',
    // Source project holding the customer assessments.
    sourceProjectGid: env.ASANA_PROJECT_GID ?? '1214107620220121',
    // Project the renewal follow-up tasks are filed under ("Compliance Renewals").
    renewalsProjectGid: env.RENEWALS_PROJECT_GID ?? '1215884707932023',
    // Who the follow-up tasks are assigned to (account owner by default).
    assigneeGid: env.ASSIGNEE_GID ?? '1213645083721304',
    workspaceGid: env.ASANA_WORKSPACE_GID ?? '1213645083721316',
    reviewIntervalMonths: Number(env.REVIEW_INTERVAL_MONTHS ?? '12'),
    timeZone: env.TIMEZONE ?? 'Asia/Dubai',
    dryRun: isTruthy(env.DRY_RUN),
  };
}

function isTruthy(v) {
  return v != null && v !== '' && v !== '0' && String(v).toLowerCase() !== 'false';
}

// ----- date helpers --------------------------------------------------------

const MONTHS = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7,
  sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

const JUNK_VALUES = new Set([
  '', 'n/a', 'na', 'none', 'null', 'nil', '-', '--', '—', '–',
  'tbd', 'tbc', 'pending', 'to be confirmed', 'to be advised', 'unknown', 'x',
]);

/** Build a UTC-midnight Date, rejecting overflow (e.g. 31 February). */
function buildDate(year, month, day) {
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month || d.getUTCDate() !== day) {
    return null;
  }
  return d;
}

/**
 * Tolerant date parser for human-typed values. Returns a UTC-midnight Date or
 * null. Handles: "March 13, 2028", "13 March 2028", "2028-03-13",
 * "13/03/2028", "13-03-2028", "13.03.2028". Numeric day/month is read
 * day-first (UAE convention) unless the first part is clearly a month (>12).
 */
export function parseDate(raw) {
  if (raw == null) return null;
  const value = String(raw).trim().replace(/\s+/g, ' ');
  const lower = value.toLowerCase();
  if (JUNK_VALUES.has(lower)) return null;

  // ISO: 2028-03-13
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
  if (m) return buildDate(+m[1], +m[2] - 1, +m[3]);

  // Numeric with separators: 13/03/2028, 13-03-2028, 13.03.2028
  m = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/.exec(value);
  if (m) {
    let a = +m[1];
    let b = +m[2];
    const year = +m[3];
    let day, month;
    if (a > 12) {
      day = a; month = b; // unambiguously day-first
    } else if (b > 12) {
      month = a; day = b; // unambiguously month-first
    } else {
      day = a; month = b; // ambiguous → day-first (UAE convention)
    }
    return buildDate(year, month - 1, day);
  }

  // Month name first: "March 13, 2028" / "Mar 13 2028"
  m = /^([a-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})$/i.exec(lower);
  if (m && MONTHS[m[1]] !== undefined) {
    return buildDate(+m[3], MONTHS[m[1]], +m[2]);
  }

  // Day first with month name: "13 March 2028"
  m = /^(\d{1,2})\s+([a-z]+),?\.?\s+(\d{4})$/i.exec(lower);
  if (m && MONTHS[m[2]] !== undefined) {
    return buildDate(+m[3], MONTHS[m[2]], +m[1]);
  }

  return null;
}

/** Calendar "today" in a timezone, as a UTC-midnight Date for date-only compares. */
export function todayInTimeZone(timeZone, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (t) => Number(parts.find((p) => p.type === t)?.value);
  return new Date(Date.UTC(get('year'), get('month') - 1, get('day')));
}

export function addMonths(date, months) {
  const d = new Date(date.getTime());
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

// ----- assessment parsing --------------------------------------------------

/** Value after the first ":" on a line matching `label`, or null. */
function fieldValue(lines, labelRegex) {
  for (const line of lines) {
    if (labelRegex.test(line)) {
      const idx = line.indexOf(':');
      if (idx !== -1) return line.slice(idx + 1).trim();
    }
  }
  return null;
}

/**
 * Pull the dates we care about out of a description. Returns the customer code
 * plus parsed Date objects (or null) for each watched item. Individuals are
 * captured per "INDIVIDUAL N" block so passports/IDs keep their owner.
 */
export function parseAssessment(notes, fallbackName = '') {
  const text = notes ?? '';
  const lines = text.split(/\r?\n/);

  const customerCode =
    fieldValue(lines, /customer code\s*:/i) || fallbackName.trim() || 'UNKNOWN';
  const companyName =
    fieldValue(lines, /company name\s*:/i) || fallbackName.trim() || customerCode;

  const license = parseDate(fieldValue(lines, /license expiry date\s*:/i));
  const registrationDate = parseDate(
    fieldValue(lines, /(date of registration|registration date)\s*:/i),
  );

  // Latest dated "Ver. NN | Date: ... | ..." line drives review derivation.
  let lastReviewDate = null;
  for (const line of lines) {
    const m = /ver\.?\s*\d+\s*\|\s*date\s*:\s*([^|]*)/i.exec(line);
    if (m) {
      const d = parseDate(m[1]);
      if (d && (!lastReviewDate || d > lastReviewDate)) lastReviewDate = d;
    }
  }

  // Split Section 4 into per-individual blocks.
  const individuals = [];
  let current = null;
  for (const line of lines) {
    const head = /^\s*individual\s+(\d+)/i.exec(line);
    if (head) {
      current = { number: Number(head[1]), name: '', passport: null, emiratesId: null };
      individuals.push(current);
      continue;
    }
    if (!current) continue;
    if (/^\s*name\s*:/i.test(line) && !current.name) {
      const idx = line.indexOf(':');
      current.name = line.slice(idx + 1).trim();
    } else if (/passport expiry date\s*:/i.test(line)) {
      current.passport = parseDate(line.slice(line.indexOf(':') + 1));
    } else if (/emirates id expiry\s*:/i.test(line)) {
      current.emiratesId = parseDate(line.slice(line.indexOf(':') + 1));
    }
  }

  return { customerCode, companyName, license, registrationDate, lastReviewDate, individuals };
}

// ----- classification ------------------------------------------------------

/**
 * Given a parsed assessment, return the list of items that are expired/overdue
 * as of `today`. Each item carries a stable dedup key for idempotency.
 */
export function collectDueItems(parsed, today, reviewIntervalMonths) {
  const items = [];
  const push = (item) => {
    item.dedupKey = makeDedupKey(parsed.customerCode, item);
    items.push(item);
  };

  if (parsed.license && parsed.license <= today) {
    push({ type: 'license', kind: 'License', person: null, date: parsed.license });
  }

  for (const ind of parsed.individuals) {
    const who = ind.name || `Individual ${ind.number}`;
    const slug = `individual-${ind.number}`;
    if (ind.passport && ind.passport <= today) {
      push({ type: 'passport', kind: 'Passport', person: who, slug, date: ind.passport });
    }
    if (ind.emiratesId && ind.emiratesId <= today) {
      push({ type: 'emirates-id', kind: 'Emirates ID', person: who, slug, date: ind.emiratesId });
    }
  }

  const reviewBase = parsed.lastReviewDate || parsed.registrationDate;
  if (reviewBase && Number.isFinite(reviewIntervalMonths)) {
    const due = addMonths(reviewBase, reviewIntervalMonths);
    if (due <= today) {
      push({ type: 'review', kind: 'Periodic review', person: null, date: due });
    }
  }

  return items;
}

/** Stable key: customer | type [| person] | date. Date keeps renewals distinct. */
export function makeDedupKey(customerCode, item) {
  const parts = [customerCode, item.type];
  if (item.slug) parts.push(item.slug);
  parts.push(isoDate(item.date));
  return parts.join('|');
}

/** Title + notes for the follow-up task. `notes` embeds the dedup key. */
export function buildRenewalTask(companyName, customerCode, item, permalink) {
  const when = formatDate(item.date);
  const person = item.person ? ` / ${item.person}` : '';
  let name;
  let lead;
  if (item.type === 'review') {
    name = `🔄 Periodic review due — ${companyName} (due ${when})`;
    lead = `The periodic CDD review/refresh for ${companyName} is due as of ${when}. Please re-screen the customer, refresh the assessment, and record the outcome.`;
  } else {
    name = `⚠️ Renew ${item.kind} — ${companyName}${person} (expired ${when})`;
    const subject = item.person ? `The ${item.kind} for ${item.person}` : `The ${item.kind}`;
    lead = `${subject} at ${companyName} expired on ${when}. Please obtain the renewed document and update the customer record.`;
  }
  const notes = [
    lead,
    '',
    permalink ? `Source record: ${permalink}` : null,
    `Customer code: ${customerCode}`,
    '',
    '— Auto-generated by the expiry notifier. Do not edit the line below.',
    `dedup-key: ${item.dedupKey}`,
  ]
    .filter((l) => l !== null)
    .join('\n');
  return { name, notes, dueOn: isoDate(item.date) };
}

/** Find every `dedup-key: ...` already present in existing renewal task notes. */
export function extractExistingKeys(tasks) {
  const keys = new Set();
  for (const t of tasks) {
    const m = /dedup-key:\s*(\S+)/.exec(t.notes ?? '');
    if (m) keys.add(m[1]);
  }
  return keys;
}

// ----- Asana API -----------------------------------------------------------

async function asanaGet(path, token) {
  const res = await fetch(`${ASANA_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Asana GET ${path} failed: HTTP ${res.status} ${detail}`.trim());
  }
  return res.json();
}

/** Fetch all tasks in a project (paginated), with the given opt_fields. */
async function fetchAllTasks(projectGid, optFields, token) {
  const out = [];
  let offset = null;
  do {
    const q = new URLSearchParams({ opt_fields: optFields, limit: '100' });
    if (offset) q.set('offset', offset);
    const page = await asanaGet(`/projects/${projectGid}/tasks?${q}`, token);
    out.push(...(page.data ?? []));
    offset = page.next_page?.offset ?? null;
  } while (offset);
  return out;
}

async function createTask(data, token) {
  const res = await fetch(`${ASANA_API}/tasks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Asana create task failed: HTTP ${res.status} ${detail}`.trim());
  }
  return res.json();
}

// ----- main ----------------------------------------------------------------

export async function main(env = process.env, log = console) {
  const cfg = readConfig(env);
  if (!cfg.token) {
    log.error('Missing ASANA_TOKEN (or ASANA_PAT). Aborting.');
    process.exitCode = 1;
    return;
  }
  if (!cfg.renewalsProjectGid && !cfg.dryRun) {
    log.error('Missing RENEWALS_PROJECT_GID. Set it to the "Compliance Renewals" project gid, or run with DRY_RUN=1.');
    process.exitCode = 1;
    return;
  }

  const today = todayInTimeZone(cfg.timeZone);
  log.info(`Scanning project ${cfg.sourceProjectGid} as of ${isoDate(today)} (${cfg.timeZone})...`);

  const tasks = await fetchAllTasks(
    cfg.sourceProjectGid,
    'name,notes,permalink_url',
    cfg.token,
  );
  log.info(`Read ${tasks.length} customer records.`);

  // Build the full list of due items across all customers.
  const due = [];
  for (const t of tasks) {
    const parsed = parseAssessment(t.notes, t.name);
    for (const item of collectDueItems(parsed, today, cfg.reviewIntervalMonths)) {
      due.push({
        item,
        name: parsed.companyName,
        code: parsed.customerCode,
        permalink: t.permalink_url,
      });
    }
  }
  log.info(`Found ${due.length} expired/overdue item(s).`);

  // Skip anything we have already filed (idempotent across daily runs).
  let existingKeys = new Set();
  if (cfg.renewalsProjectGid) {
    const existing = await fetchAllTasks(cfg.renewalsProjectGid, 'notes', cfg.token);
    existingKeys = extractExistingKeys(existing);
  }

  let created = 0;
  let skipped = 0;
  for (const { item, name, code, permalink } of due) {
    if (existingKeys.has(item.dedupKey)) {
      skipped += 1;
      continue;
    }
    const task = buildRenewalTask(name, code, item, permalink);
    if (cfg.dryRun) {
      log.info(`[dry-run] would create: ${task.name}`);
      created += 1;
      continue;
    }
    await createTask(
      {
        name: task.name,
        notes: task.notes,
        due_on: task.dueOn,
        assignee: cfg.assigneeGid,
        projects: [cfg.renewalsProjectGid],
        workspace: cfg.workspaceGid,
      },
      cfg.token,
    );
    existingKeys.add(item.dedupKey);
    created += 1;
    log.info(`Created: ${task.name}`);
  }

  log.info(`Done. ${created} created${cfg.dryRun ? ' (dry-run)' : ''}, ${skipped} already filed.`);
}

const isEntryPoint =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntryPoint) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  });
}
