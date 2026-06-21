/**
 * AI Compliance Co-pilot integration seam — Governance Layer 5 (Human Oversight).
 *
 * Mirrors the Asana seam: the browser can't hold a model key, so this POSTs the
 * source text to a backend that calls the model server-side. By default it calls
 * the bundled Netlify Function (`/.netlify/functions/ai-copilot`); override with
 * `VITE_AI_COPILOT_URL`.
 *
 * Oversight is enforced at the data layer, not just the UI: this function NEVER
 * mutates the assessment or the report. It only returns a labelled DRAFT plus a
 * grounding verdict. The analyst must explicitly accept, edit, or discard it. If
 * the backend is unconfigured (HTTP 503) or anything fails, the caller keeps the
 * deterministic narrative — AI is strictly additive and never load-bearing.
 */
import type { NarrativeParagraph } from '@/lib/narrative';

/** Bundled serverless route; used when no explicit URL is configured. */
const DEFAULT_COPILOT_ENDPOINT = '/.netlify/functions/ai-copilot';

export type CopilotMode = 'narrative-polish' | 'adverse-triage';

export interface CopilotDraft {
  /** The model's suggested text — advisory only, awaiting analyst decision. */
  draft: string;
  /** Pinned model id that produced the draft (recorded in the activity log). */
  model: string;
  /** True when the draft introduced no facts beyond the source. */
  grounded: boolean;
  /** Fact tokens found in the draft but not the source (possible fabrication). */
  ungrounded: string[];
}

export type CopilotResult =
  | { ok: true; value: CopilotDraft }
  | { ok: false; reason: 'not-configured' | 'request-failed'; detail?: string };

/** Flattens deterministic narrative paragraphs into a single grounding source. */
export function narrativeToSource(paragraphs: NarrativeParagraph[]): string {
  return paragraphs.map((p) => `${p.heading}\n${p.body}`).join('\n\n');
}

/**
 * Asks the co-pilot to rephrase/triage the given source. Returns a DRAFT for the
 * analyst to review — it is never applied automatically.
 */
export async function requestCopilot(mode: CopilotMode, source: string): Promise<CopilotResult> {
  const endpoint = import.meta.env.VITE_AI_COPILOT_URL || DEFAULT_COPILOT_ENDPOINT;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, source }),
    });
    // 503 = backend reachable but no model key → keep the deterministic narrative.
    if (res.status === 503) return { ok: false, reason: 'not-configured' };
    if (!res.ok) return { ok: false, reason: 'request-failed', detail: `HTTP ${res.status}` };
    const body = (await res.json()) as Partial<CopilotDraft> & { ok?: boolean };
    if (!body?.draft) return { ok: false, reason: 'request-failed', detail: 'empty-response' };
    return {
      ok: true,
      value: {
        draft: body.draft,
        model: body.model ?? 'unknown',
        grounded: body.grounded ?? false,
        ungrounded: body.ungrounded ?? [],
      },
    };
  } catch (e) {
    return {
      ok: false,
      reason: 'request-failed',
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}
