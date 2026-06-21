/**
 * Root Cause Analysis (RCause) — periodic-table block "RCause".
 *
 * Turns the free-text error codes the AI path already produces into a structured
 * taxonomy: category, probable cause and a remediation hint. Used by the
 * escalation router and the governance panel so a failure is explained, not just
 * logged. Maps the Netlify function's error codes plus the in-app assurance
 * outcomes (grounding, bias, threat).
 *
 * Pure and dependency-free.
 */

export type FailureCategory =
  | 'configuration'
  | 'connectivity'
  | 'rate-limit'
  | 'model-quality'
  | 'security'
  | 'data'
  | 'unknown';

export interface RootCause {
  category: FailureCategory;
  cause: string;
  remediation: string;
}

const TABLE: Record<string, RootCause> = {
  'not-configured': {
    category: 'configuration',
    cause: 'ANTHROPIC_API_KEY is not set — AI is disabled.',
    remediation: 'Set the key in Netlify env, or continue with the deterministic narrative.',
  },
  'rate-limited': {
    category: 'rate-limit',
    cause: 'Per-client AI call quota exceeded.',
    remediation: 'Wait for the retry window; investigate if unexpected (possible loop/abuse).',
  },
  'model-timeout': {
    category: 'connectivity',
    cause: 'The model did not respond within the timeout.',
    remediation: 'Retry; if persistent, check provider status or reduce input size.',
  },
  'model-unreachable': {
    category: 'connectivity',
    cause: 'The model endpoint could not be reached.',
    remediation: 'Check network/provider status; the app stays on the deterministic narrative.',
  },
  'model-call-failed': {
    category: 'connectivity',
    cause: 'The provider returned a non-OK HTTP status.',
    remediation: 'Inspect the returned detail (auth, quota, model id).',
  },
  'empty-model-response': {
    category: 'model-quality',
    cause: 'The model returned no usable text.',
    remediation: 'Retry; if recurring, review the prompt/source.',
  },
  ungrounded: {
    category: 'model-quality',
    cause: 'The draft introduced facts absent from the source (possible hallucination).',
    remediation: 'Discard the draft; the deterministic narrative is authoritative.',
  },
  biased: {
    category: 'model-quality',
    cause: 'The draft contained loaded or protected-characteristic language.',
    remediation: 'Discard/edit; keep the record neutral and evidence-based.',
  },
  threat: {
    category: 'security',
    cause: 'An injection/jailbreak signature was detected in input or output.',
    remediation: 'Block the input; treat pasted content strictly as data.',
  },
  'dlp-leak': {
    category: 'data',
    cause: 'Sensitive data remained in outbound text after redaction.',
    remediation: 'Do not send; extend redaction coverage for the leaked pattern.',
  },
};

/** Classifies a failure code into a structured root cause. */
export function analyzeRootCause(code: string): RootCause {
  return (
    TABLE[code] ?? {
      category: 'unknown',
      cause: `Unrecognised failure code: ${code}.`,
      remediation: 'Review telemetry around the event.',
    }
  );
}
