/**
 * Threat Intelligence (THREAT) — periodic-table block "THREAT".
 *
 * Signature-based detection of LLM-specific attack patterns (OWASP LLM Top-10
 * style): prompt injection, jailbreak/role-override attempts, system-prompt
 * exfiltration and instruction smuggling. Applied to untrusted AI inputs (the
 * analyst-pasted adverse-media text) and, defensively, to AI outputs. It does not
 * call any external feed — the "feed" is a curated, in-code signature set that is
 * versioned with the app.
 *
 * Pure and dependency-free so the browser, the Netlify function and Vitest share it.
 */

export type ThreatSeverity = 'low' | 'medium' | 'high';

export interface ThreatSignature {
  id: string;
  severity: ThreatSeverity;
  re: RegExp;
  description: string;
}

/** Curated signatures. Versioned with the app; bump SIGNATURE_VERSION on change. */
export const SIGNATURE_VERSION = '2026.06.1';

export const SIGNATURES: readonly ThreatSignature[] = [
  {
    id: 'injection-ignore',
    severity: 'high',
    re: /\b(ignore|disregard|forget)\b.{0,30}\b(previous|above|prior|earlier|all)\b.{0,20}\b(instruction|prompt|rule|context)/i,
    description: 'Prompt-injection: instruction-override phrasing',
  },
  {
    id: 'jailbreak-role',
    severity: 'high',
    re: /\b(you are now|act as|pretend to be|from now on you are|developer mode|DAN)\b/i,
    description: 'Jailbreak: role / persona override',
  },
  {
    id: 'system-exfil',
    severity: 'high',
    re: /\b(reveal|print|repeat|show|expose)\b.{0,25}\b(system prompt|your instructions|the prompt|api key|secret)/i,
    description: 'System-prompt / secret exfiltration attempt',
  },
  {
    id: 'instruction-smuggle',
    severity: 'medium',
    re: /<\/?(system|assistant|tool|instructions?)\b/i,
    description: 'Smuggled role tags in untrusted content',
  },
  {
    id: 'override-format',
    severity: 'medium',
    re: /\b(new instructions?:|begin system prompt|###\s*system)/i,
    description: 'Fake instruction delimiter',
  },
  {
    id: 'data-exfil-url',
    severity: 'low',
    re: /\b(send|post|exfiltrate|upload)\b.{0,20}\bhttps?:\/\//i,
    description: 'Possible data-exfiltration directive',
  },
];

export interface ThreatDetection {
  id: string;
  severity: ThreatSeverity;
  description: string;
}

export interface ThreatScan {
  threats: ThreatDetection[];
  /** Highest severity seen, or null when clean. */
  worst: ThreatSeverity | null;
  signatureVersion: string;
}

const RANK: Record<ThreatSeverity, number> = { low: 0, medium: 1, high: 2 };

/** Scans text against the signature set. */
export function scanThreats(text: string): ThreatScan {
  const threats: ThreatDetection[] = [];
  for (const sig of SIGNATURES) {
    if (sig.re.test(text)) {
      threats.push({ id: sig.id, severity: sig.severity, description: sig.description });
    }
  }
  const worst = threats.reduce<ThreatSeverity | null>(
    (acc, t) => (acc === null || RANK[t.severity] > RANK[acc] ? t.severity : acc),
    null,
  );
  return { threats, worst, signatureVersion: SIGNATURE_VERSION };
}

/** True when a high-severity attack pattern is present (caller should block/flag). */
export function hasHighThreat(text: string): boolean {
  return scanThreats(text).worst === 'high';
}
