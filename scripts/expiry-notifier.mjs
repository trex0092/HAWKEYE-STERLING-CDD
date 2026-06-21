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
    // The "Expiry Date" text column on the customer records (already populated),
    // used as the license-expiry source when the description line is blank.
    expiryFieldGid: env.ASANA_EXPIRY_FIELD_GID ?? '1215871723101263',
    // How many days ahead counts as "expiring soon" (0 = only on/after expiry).
    leadDays: Number(env.REMINDER_LEAD_DAYS ?? '2'),
    // Per-customer re-screening cadence (months after last recorded screening).
    screeningIntervalMonths: Number(env.SCREENING_INTERVAL_MONTHS ?? '1'),
    // File one book-wide "screen all customers today" task per day.
    dailyScreening: env.DAILY_SCREENING == null || isTruthy(env.DAILY_SCREENING),
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

  // Most recent Section 2 screening date: only lines carrying both "Result:" and
  // "Date:" (the sanctions/PEP screening rows), so Ver./registration dates are ignored.
  let lastScreeningDate = null;
  for (const line of lines) {
    const m = /result:.*?date:\s*([^|]*)/i.exec(line);
    if (m) {
      const d = parseDate(m[1]);
      if (d && (!lastScreeningDate || d > lastScreeningDate)) lastScreeningDate = d;
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

  return {
    customerCode,
    companyName,
    license,
    registrationDate,
    lastReviewDate,
    lastScreeningDate,
    individuals,
  };
}

// ----- classification ------------------------------------------------------

/**
 * Given a parsed assessment, return the list of items that are expired/overdue
 * as of `today`. Each item carries a stable dedup key for idempotency.
 */
export function collectDueItems(
  parsed,
  today,
  reviewIntervalMonths,
  leadDays = 0,
  screeningIntervalMonths = 0,
) {
  const items = [];
  const dayMs = 86400000;
  const horizon = today.getTime() + Math.max(0, leadDays) * dayMs;

  // null if still beyond the horizon; otherwise "expired" (on/before today) or
  // "upcoming" (within the lead window).
  const statusOf = (date) => {
    if (!date) return null;
    const t = date.getTime();
    if (t > horizon) return null;
    return t <= today.getTime() ? 'expired' : 'upcoming';
  };
  const daysUntil = (date) => Math.round((date.getTime() - today.getTime()) / dayMs);

  const consider = (date, base) => {
    const status = statusOf(date);
    if (!status) return;
    const item = { ...base, date, status, daysUntil: daysUntil(date) };
    item.dedupKey = makeDedupKey(parsed.customerCode, item);
    items.push(item);
  };

  consider(parsed.license, { type: 'license', kind: 'License', person: null });

  for (const ind of parsed.individuals) {
    const who = ind.name || `Individual ${ind.number}`;
    const slug = `individual-${ind.number}`;
    consider(ind.passport, { type: 'passport', kind: 'Passport', person: who, slug });
    consider(ind.emiratesId, { type: 'emirates-id', kind: 'Emirates ID', person: who, slug });
  }

  const reviewBase = parsed.lastReviewDate || parsed.registrationDate;
  if (reviewBase && Number.isFinite(reviewIntervalMonths)) {
    consider(addMonths(reviewBase, reviewIntervalMonths), {
      type: 'review',
      kind: 'Periodic review',
      person: null,
    });
  }

  // Re-screening: due `screeningIntervalMonths` after the last recorded
  // screening date. Skipped entirely when no screening date exists, so blank
  // Section 2 fields don't raise reminders.
  if (parsed.lastScreeningDate && screeningIntervalMonths > 0) {
    consider(addMonths(parsed.lastScreeningDate, screeningIntervalMonths), {
      type: 'screening',
      kind: 'Screening',
      person: null,
      lastScreened: parsed.lastScreeningDate,
    });
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
  const subject = item.person ? `The ${item.kind} for ${item.person}` : `The ${item.kind}`;
  const upcoming = item.status === 'upcoming';
  const inDays =
    item.daysUntil <= 0 ? 'today' : item.daysUntil === 1 ? 'in 1 day' : `in ${item.daysUntil} days`;
  let name;
  let lead;
  if (item.type === 'review') {
    if (upcoming) {
      name = `🔄 Periodic review due soon — ${companyName} (due ${when})`;
      lead = `The periodic CDD review/refresh for ${companyName} is due ${inDays} (${when}). Please plan the re-screening and refresh.`;
    } else {
      name = `🔄 Periodic review due — ${companyName} (due ${when})`;
      lead = `The periodic CDD review/refresh for ${companyName} is due as of ${when}. Please re-screen the customer, refresh the assessment, and record the outcome.`;
    }
  } else if (item.type === 'screening') {
    const since = item.lastScreened ? ` (last screened ${formatDate(item.lastScreened)})` : '';
    name = `🔁 Re-screen — ${companyName} (screening due ${when})`;
    lead = `Sanctions/PEP/adverse-media screening for ${companyName} is due for refresh as of ${when}${since}. Please re-run screening and record the new date in the assessment.`;
  } else if (upcoming) {
    name = `⏳ ${item.kind} expiring soon — ${companyName}${person} (expires ${when})`;
    lead = `${subject} at ${companyName} expires ${inDays} (${when}). Please arrange renewal before it lapses.`;
  } else {
    name = `⚠️ Renew ${item.kind} — ${companyName}${person} (expired ${when})`;
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

/**
 * One book-wide "perform screening today" task per day. Keyed by date so each
 * daily run files exactly one. The `SYSTEM` code keeps it clear of the
 * per-customer auto-delete logic.
 */
export function dailyScreeningTask(today) {
  const when = formatDate(today);
  const dedupKey = `SYSTEM|daily-screening|${isoDate(today)}`;
  const name = `🛡️ Daily sanctions/PEP screening (all customers) — ${when}`;
  const notes = [
    `Run today's sanctions / PEP / adverse-media screening across the customer book for ${when}.`,
    'Record any hits and the screening date on the affected customer assessments.',
    '',
    '— Auto-generated by the expiry notifier. Do not edit the line below.',
    `dedup-key: ${dedupKey}`,
  ].join('\n');
  return { name, notes, dueOn: isoDate(today), dedupKey };
}

/**
 * Read the dedup key out of a task's notes. Captures the whole line (keys can
 * contain spaces when the customer code falls back to the company name).
 */
export function dedupKeyOf(notes) {
  const m = /dedup-key:\s*([^\n]+)/.exec(notes ?? '');
  return m ? m[1].trim() : null;
}

/** Find every `dedup-key: ...` already present in existing renewal task notes. */
export function extractExistingKeys(tasks) {
  const keys = new Set();
  for (const t of tasks) {
    const key = dedupKeyOf(t.notes);
    if (key) keys.add(key);
  }
  return keys;
}

/**
 * Pick the renewal tasks that should be deleted because their underlying date
 * has been renewed (or cleared) and is no longer due. Returns the gids of OPEN,
 * notifier-created tasks (those carrying a `dedup-key:`) whose key is no longer
 * in `dueKeys`. Guarded by `knownCodes` (the customer codes we actually
 * scanned) so hand-made tasks like the "[SAMPLE]" one are never touched.
 */
export function selectStaleTasks(existingTasks, dueKeys, knownCodes) {
  const gids = [];
  for (const t of existingTasks) {
    if (t.completed) continue;
    const key = dedupKeyOf(t.notes);
    if (!key) continue;
    if (dueKeys.has(key)) continue;
    const customerCode = key.split('|')[0];
    if (!knownCodes.has(customerCode)) continue;
    gids.push(t.gid);
  }
  return gids;
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

async function deleteTask(gid, token) {
  const res = await fetch(`${ASANA_API}/tasks/${gid}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Asana delete task ${gid} failed: HTTP ${res.status} ${detail}`.trim());
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
  log.info(
    `Scanning project ${cfg.sourceProjectGid} as of ${isoDate(today)} (${cfg.timeZone}); ` +
      `flagging expired + within ${cfg.leadDays} day(s)...`,
  );

  const tasks = await fetchAllTasks(
    cfg.sourceProjectGid,
    'name,notes,permalink_url,custom_fields.gid,custom_fields.display_value',
    cfg.token,
  );
  log.info(`Read ${tasks.length} customer records.`);

  // Build the full list of due items across all customers, plus the set of
  // customer codes we scanned (used to scope auto-close to real records).
  const due = [];
  const knownCodes = new Set();
  for (const t of tasks) {
    const parsed = parseAssessment(t.notes, t.name);
    // The license expiry lives in the "Expiry Date" column on most records;
    // prefer it, falling back to the description line when the column is blank.
    const columnExpiry = (t.custom_fields ?? []).find((f) => f.gid === cfg.expiryFieldGid)
      ?.display_value;
    parsed.license = parseDate(columnExpiry) ?? parsed.license;
    knownCodes.add(parsed.customerCode);
    const items = collectDueItems(
      parsed,
      today,
      cfg.reviewIntervalMonths,
      cfg.leadDays,
      cfg.screeningIntervalMonths,
    );
    for (const item of items) {
      due.push({
        item,
        name: parsed.companyName,
        code: parsed.customerCode,
        permalink: t.permalink_url,
      });
    }
  }
  log.info(`Found ${due.length} expired/overdue item(s).`);
  const dueKeys = new Set(due.map((d) => d.item.dedupKey));

  // Existing renewal tasks: used both to skip re-filing (idempotency) and to
  // auto-close ones whose date has since been renewed.
  let existing = [];
  let existingKeys = new Set();
  if (cfg.renewalsProjectGid) {
    existing = await fetchAllTasks(cfg.renewalsProjectGid, 'gid,name,notes,completed', cfg.token);
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

  // One book-wide "screen all customers today" task per day.
  if (cfg.dailyScreening && cfg.renewalsProjectGid) {
    const daily = dailyScreeningTask(today);
    if (existingKeys.has(daily.dedupKey)) {
      skipped += 1;
    } else if (cfg.dryRun) {
      log.info(`[dry-run] would create: ${daily.name}`);
      created += 1;
    } else {
      await createTask(
        {
          name: daily.name,
          notes: daily.notes,
          due_on: daily.dueOn,
          assignee: cfg.assigneeGid,
          projects: [cfg.renewalsProjectGid],
          workspace: cfg.workspaceGid,
        },
        cfg.token,
      );
      existingKeys.add(daily.dedupKey);
      created += 1;
      log.info(`Created: ${daily.name}`);
    }
  }

  // Delete renewal tasks whose underlying date is no longer due (renewed).
  const staleGids = selectStaleTasks(existing, dueKeys, knownCodes);
  let deleted = 0;
  for (const gid of staleGids) {
    const name = existing.find((t) => t.gid === gid)?.name ?? gid;
    if (cfg.dryRun) {
      log.info(`[dry-run] would delete: ${name}`);
      deleted += 1;
      continue;
    }
    await deleteTask(gid, cfg.token);
    deleted += 1;
    log.info(`Deleted (renewed): ${name}`);
  }

  log.info(
    `Done. ${created} created${cfg.dryRun ? ' (dry-run)' : ''}, ${skipped} already filed, ` +
      `${deleted} deleted${cfg.dryRun ? ' (dry-run)' : ''}.`,
  );
}

const isEntryPoint =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntryPoint) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  });
}
