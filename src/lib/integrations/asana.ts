/**
 * "Send to Asana" integration seam.
 *
 * A browser SPA can't hold an Asana token safely, so this POSTs a task payload
 * to a backend that creates the Asana task server-side. By default it calls the
 * bundled Netlify Function (`/.netlify/functions/asana`), which uses the
 * server-side `ASANA_TOKEN`; override the target with `VITE_ASANA_WEBHOOK_URL`.
 * If the backend reports it isn't configured (HTTP 503) the caller falls back to
 * exporting the payload as JSON so nothing is lost.
 */

/** Bundled serverless route; used when no explicit webhook URL is configured. */
const DEFAULT_ASANA_ENDPOINT = '/.netlify/functions/asana';

export interface AsanaTask {
  name: string;
  notes: string;
  reference: string;
  band: string;
  decision: string;
}

export type AsanaResult =
  | { ok: true }
  | { ok: false; reason: 'not-configured' | 'request-failed'; detail?: string };

export function buildAsanaTask(input: {
  reference: string;
  entity: string;
  bandShort: string;
  bandLabel: string;
  decision: string;
  assessedBy: string;
}): AsanaTask {
  const name = `CDD ${input.reference} — ${input.entity || 'Unnamed entity'} [${input.bandShort}]`;
  const notes = [
    `Reference: ${input.reference}`,
    `Entity: ${input.entity || '—'}`,
    `Required diligence: ${input.bandLabel}`,
    `Relationship decision: ${input.decision}`,
    `Assessed by: ${input.assessedBy || '—'}`,
  ].join('\n');
  return {
    name,
    notes,
    reference: input.reference,
    band: input.bandShort,
    decision: input.decision,
  };
}

export async function sendToAsana(task: AsanaTask): Promise<AsanaResult> {
  const endpoint = import.meta.env.VITE_ASANA_WEBHOOK_URL || DEFAULT_ASANA_ENDPOINT;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    // 503 = backend reachable but Asana token not set → fall back to JSON export.
    if (res.status === 503) return { ok: false, reason: 'not-configured' };
    if (!res.ok) return { ok: false, reason: 'request-failed', detail: `HTTP ${res.status}` };
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      reason: 'request-failed',
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}
