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
import { record } from '@/lib/governance/telemetry';
import { scoreAiOutput } from '@/lib/governance/aiRisk';
import { consentGate } from '@/lib/governance/gdpr';
import { scanOutbound } from '@/lib/security/dlp';

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

export type CopilotReason =
  | 'not-configured'
  | 'request-failed'
  | 'consent-required'
  | 'dlp-blocked';

export type CopilotResult =
  | { ok: true; value: CopilotDraft }
  | { ok: false; reason: CopilotReason; detail?: string };

/** Per-call options. `consent` gates the GDPR lawful-basis check. */
export interface CopilotOptions {
  consent?: boolean;
}

/** Secret patterns that must never be sent to the model (PII is redacted server-side). */
const SECRET_KINDS = new Set(['anthropic-key', 'bearer-token', 'private-key']);

/** Flattens deterministic narrative paragraphs into a single grounding source. */
export function narrativeToSource(paragraphs: NarrativeParagraph[]): string {
  return paragraphs.map((p) => `${p.heading}\n${p.body}`).join('\n\n');
}

/**
 * Asks the co-pilot to rephrase/triage the given source. Returns a DRAFT for the
 * analyst to review — it is never applied automatically.
 *
 * Two egress guards run before any network call (GDPR + DLP): the request is
 * blocked unless lawful-basis consent is recorded, and blocked if a secret
 * (API key/token) is detected in the outbound text.
 */
export async function requestCopilot(
  mode: CopilotMode,
  source: string,
  opts: CopilotOptions = {},
): Promise<CopilotResult> {
  // GDPR: no AI processing of personal data without a recorded lawful basis.
  if (opts.consent === false) {
    const gate = consentGate(false);
    record({ actor: 'system', action: 'ai-call', outcome: 'deny', detail: gate.reason });
    return { ok: false, reason: 'consent-required', detail: gate.reason };
  }
  // DLP: never let a secret leave the boundary, even though PII is redacted server-side.
  const secrets = scanOutbound(source).filter((f) => SECRET_KINDS.has(f.kind));
  if (secrets.length) {
    const kinds = secrets.map((s) => s.kind).join(', ');
    record({ actor: 'system', action: 'ai-call', outcome: 'deny', detail: `dlp:${kinds}` });
    return { ok: false, reason: 'dlp-blocked', detail: kinds };
  }

  const endpoint = import.meta.env.VITE_AI_COPILOT_URL || DEFAULT_COPILOT_ENDPOINT;
  // LAT: measure round-trip latency for the performance/monitoring layer.
  const startedAt = Date.now();
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, source }),
    });
    const latencyMs = Date.now() - startedAt;
    // 503 = backend reachable but no model key → keep the deterministic narrative.
    if (res.status === 503) {
      record({
        actor: 'system',
        action: 'ai-call',
        outcome: 'error',
        detail: 'not-configured',
        latencyMs,
      });
      return { ok: false, reason: 'not-configured' };
    }
    if (!res.ok) {
      record({
        actor: 'system',
        action: 'ai-call',
        outcome: 'error',
        detail: `HTTP ${res.status}`,
        latencyMs,
      });
      return { ok: false, reason: 'request-failed', detail: `HTTP ${res.status}` };
    }
    const body = (await res.json()) as Partial<CopilotDraft> & { ok?: boolean };
    if (!body?.draft) {
      record({
        actor: 'system',
        action: 'ai-call',
        outcome: 'error',
        detail: 'empty-response',
        latencyMs,
      });
      return { ok: false, reason: 'request-failed', detail: 'empty-response' };
    }
    const value: CopilotDraft = {
      draft: body.draft,
      model: body.model ?? 'unknown',
      grounded: body.grounded ?? false,
      ungrounded: body.ungrounded ?? [],
    };
    // LOG/PERF/RISK: record AI-call telemetry (side-effect; result shape unchanged).
    record({
      actor: 'system',
      action: 'ai-call',
      outcome: 'ok',
      latencyMs,
      ai: {
        model: value.model,
        grounded: value.grounded,
        ungroundedCount: value.ungrounded.length,
        riskScore: scoreAiOutput(value.draft, source).score,
        latencyMs,
      },
    });
    return { ok: true, value };
  } catch (e) {
    record({
      actor: 'system',
      action: 'ai-call',
      outcome: 'error',
      latencyMs: Date.now() - startedAt,
      detail: e instanceof Error ? e.message : String(e),
    });
    return {
      ok: false,
      reason: 'request-failed',
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}
