/**
 * "Send to Asana" integration seam.
 *
 * A browser SPA can't hold an Asana token safely, so this POSTs a task payload
 * to a backend/webhook you control (`VITE_ASANA_WEBHOOK_URL`), which creates the
 * Asana task server-side. When unconfigured, the caller falls back to exporting
 * the payload as JSON so nothing is lost.
 */

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
  const endpoint = import.meta.env.VITE_ASANA_WEBHOOK_URL;
  if (!endpoint) return { ok: false, reason: 'not-configured' };
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
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
