/**
 * Secure Data Pipeline (PIPE) — periodic-table block "PIPE".
 *
 * Composes the data-protection controls into one ordered, auditable egress
 * pipeline used before text reaches the model: validate size/shape → scan for
 * injection (threatIntel) → redact PII (redaction) → DLP egress check. Each stage
 * can fail closed. Reuses the existing modules rather than reimplementing them, so
 * there is a single path data takes out of the trust boundary.
 *
 * Pure and dependency-free.
 */
import { redactSensitive, type RedactionMap } from '../ai/redaction';
import { scanThreats, type ThreatScan } from './threatIntel';
import { scanOutbound, type DlpFinding } from './dlp';

export const MAX_PIPELINE_CHARS = 24_000;

export interface PipelineResult {
  ok: boolean;
  /** Redacted, validated text ready to send (only when ok). */
  output: string;
  /** placeholder -> original, to restore the model's reply. */
  map: RedactionMap;
  threat: ThreatScan;
  dlp: DlpFinding[];
  /** Why the pipeline blocked, when ok === false. */
  blockedReason?: 'empty' | 'too-large' | 'high-threat' | 'dlp-leak';
}

/**
 * Runs the egress pipeline. Blocks on empty/oversized input, on a high-severity
 * injection signature, and on residual sensitive data after redaction.
 */
export function runEgressPipeline(text: string): PipelineResult {
  const threat = scanThreats(text);
  const empty: PipelineResult = { ok: false, output: '', map: {}, threat, dlp: [] };

  if (!text.trim()) return { ...empty, blockedReason: 'empty' };
  if (text.length > MAX_PIPELINE_CHARS) return { ...empty, blockedReason: 'too-large' };
  if (threat.worst === 'high') return { ...empty, blockedReason: 'high-threat' };

  const { redacted, map } = redactSensitive(text);
  const dlp = scanOutbound(redacted);
  if (dlp.length) return { ok: false, output: '', map, threat, dlp, blockedReason: 'dlp-leak' };

  return { ok: true, output: redacted, map, threat, dlp };
}
