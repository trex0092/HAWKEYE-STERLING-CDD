/**
 * PII redaction for the AI Co-pilot — Governance Layer 2 (Data Governance:
 * data minimisation) and Layer 3 (Security).
 *
 * The deterministic narrative (lib/narrative.ts) legitimately contains personal
 * identifiers — passport numbers, Emirates IDs, dates of birth, emails. Before
 * any text is sent to a third-party model we strip those identifiers and replace
 * each with a stable placeholder token. The model only ever sees the redacted
 * text; the placeholders are restored verbatim in its reply. This keeps raw PII
 * inside our own trust boundary while still letting the model improve the prose.
 *
 * Pure and dependency-free on purpose: imported by the browser bundle, the
 * Netlify function and the Vitest suite alike.
 */

/** A redaction: the original sensitive value and the placeholder that stands in. */
export interface RedactionMap {
  /** placeholder token -> original value */
  [placeholder: string]: string;
}

export interface RedactionResult {
  /** Text with every sensitive value swapped for a placeholder token. */
  redacted: string;
  /** placeholder -> original, for restoreSensitive(). */
  map: RedactionMap;
}

/**
 * Ordered patterns for identifiers we must never send to the model. Order
 * matters: the most specific (Emirates ID, email) run before the generic
 * "long alphanumeric / numeric date" catch-alls so they win the match.
 */
const PATTERNS: { label: string; re: RegExp }[] = [
  // UAE Emirates ID: 784-YYYY-NNNNNNN-N (hyphens optional).
  { label: 'EID', re: /\b784-?\d{4}-?\d{7}-?\d\b/g },
  // Email addresses.
  { label: 'EMAIL', re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  // ISO / numeric dates: 2028-03-13, 13/03/2028, 13-03-2028, 2028/03/13.
  { label: 'DATE', re: /\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b|\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b/g },
  // Passport / licence-style identifiers: a 6–12 char token with letters AND
  // at least two digits (avoids redacting ordinary words and small numbers).
  { label: 'ID', re: /\b(?=[A-Za-z0-9]{6,12}\b)(?=(?:[^0-9]*\d){2})[A-Za-z]*\d[A-Za-z0-9]*\b/g },
];

/**
 * Replaces sensitive identifiers with stable placeholders.
 * Identical values map to the same placeholder so grounding stays intact.
 */
export function redactSensitive(text: string): RedactionResult {
  const map: RedactionMap = {};
  const seen = new Map<string, string>();
  let n = 0;
  let out = text;

  for (const { label, re } of PATTERNS) {
    out = out.replace(re, (match) => {
      let token = seen.get(match);
      if (!token) {
        n += 1;
        token = `[REDACTED-${label}-${n}]`;
        seen.set(match, token);
        map[token] = match;
      }
      return token;
    });
  }

  return { redacted: out, map };
}

/** Restores the original values from a redaction map (inverse of redactSensitive). */
export function restoreSensitive(text: string, map: RedactionMap): string {
  let out = text;
  for (const [token, original] of Object.entries(map)) {
    out = out.split(token).join(original);
  }
  return out;
}
