/**
 * Data Loss Prevention (DLP) — periodic-table block "DLP".
 *
 * A last-line egress scanner: before any text leaves the app (an AI call, an
 * export, a clipboard copy) it is checked for sensitive values that should never
 * cross the boundary in the clear — residual PII the redactor may have missed plus
 * obvious secrets (API keys, tokens). Callers decide policy: `scanOutbound`
 * reports findings; `assertClean` throws when egress must be blocked.
 *
 * Pure and dependency-free; complements (does not replace) redaction.ts.
 */

export interface DlpFinding {
  kind: string;
  /** A redacted excerpt for the log — never the raw value. */
  sample: string;
}

const RULES: { kind: string; re: RegExp }[] = [
  { kind: 'emirates-id', re: /\b784-?\d{4}-?\d{7}-?\d\b/g },
  { kind: 'email', re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { kind: 'iban', re: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g },
  { kind: 'credit-card', re: /\b(?:\d[ -]?){13,19}\b/g },
  { kind: 'anthropic-key', re: /\bsk-ant-[A-Za-z0-9_-]{8,}\b/g },
  { kind: 'bearer-token', re: /\bBearer\s+[A-Za-z0-9._-]{12,}\b/gi },
  { kind: 'private-key', re: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g },
];

/** Masks the middle of a matched value so the log can show "what kind" not "what". */
function maskSample(value: string): string {
  const v = value.trim();
  if (v.length <= 4) return '****';
  return `${v.slice(0, 2)}…${v.slice(-2)}`;
}

/** Returns every sensitive pattern found in outbound text. */
export function scanOutbound(text: string): DlpFinding[] {
  const findings: DlpFinding[] = [];
  for (const { kind, re } of RULES) {
    const matches = text.match(re);
    if (matches) {
      for (const m of matches) findings.push({ kind, sample: maskSample(m) });
    }
  }
  return findings;
}

/** True when no sensitive value is present in the text. */
export function isClean(text: string): boolean {
  return scanOutbound(text).length === 0;
}

/** Throws a DlpViolation when egress would leak data — use to hard-block a send. */
export class DlpViolation extends Error {
  readonly findings: DlpFinding[];
  constructor(findings: DlpFinding[]) {
    super(`DLP blocked egress: ${findings.map((f) => f.kind).join(', ')}`);
    this.name = 'DlpViolation';
    this.findings = findings;
  }
}

export function assertClean(text: string): void {
  const findings = scanOutbound(text);
  if (findings.length) throw new DlpViolation(findings);
}
