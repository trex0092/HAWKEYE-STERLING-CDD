/**
 * Grounding / no-fabrication check for the AI Co-pilot — Governance Layer 4
 * (Model & Agent Assurance).
 *
 * A compliance narrative must never gain facts the analyst did not record. The
 * AI Co-pilot is only permitted to rephrase the deterministic draft, so any
 * "hard fact" (a number, identifier, percentage, or proper-noun token) that
 * appears in the AI draft but NOT in the grounding source is treated as a
 * potential fabrication. Callers surface the flagged tokens to the analyst and
 * fall back to the deterministic narrative rather than trusting the draft.
 *
 * Heuristic by design — numeric tokens give a high-signal, low-false-positive
 * fabrication check (invented dates, registration numbers, shareholdings).
 * Pure and dependency-free so the Vitest suite and the Netlify function share it.
 */

/** Common capitalised words that legitimately begin sentences — not "facts". */
const STOPWORDS = new Set([
  'The',
  'This',
  'These',
  'Those',
  'That',
  'A',
  'An',
  'It',
  'Its',
  'Their',
  'Each',
  'Against',
  'Having',
  'Ongoing',
  'No',
  'One',
  'Prepared',
  'Screening',
  'Sanctions',
  'Proliferation',
  'Identification',
  'Beneficial',
  'Enhanced',
  'Customer',
  'Compliance',
]);

/**
 * Extracts the "hard fact" tokens from a piece of text:
 *  - numeric tokens of 2+ digits (dates, IDs, percentages, amounts)
 *  - capitalised multi-letter tokens (proper nouns), minus common sentence
 *    starters in STOPWORDS.
 * Returns a normalised set for membership testing.
 */
export function extractFacts(text: string): Set<string> {
  const facts = new Set<string>();

  const numbers = text.match(/\d[\d,.]*\d|\d/g) ?? [];
  for (const num of numbers) {
    const norm = num.replace(/[,.]+$/, '');
    if (/\d{2,}/.test(norm)) facts.add(norm.toLowerCase());
  }

  const proper = text.match(/\b[A-Z][A-Za-z]{2,}\b/g) ?? [];
  for (const word of proper) {
    if (!STOPWORDS.has(word)) facts.add(word.toLowerCase());
  }

  return facts;
}

/**
 * Returns the list of fact tokens present in `draft` but absent from `source`.
 * An empty array means the draft introduced no new facts (well grounded).
 */
export function findUngrounded(draft: string, source: string): string[] {
  const sourceFacts = extractFacts(source);
  const draftFacts = extractFacts(draft);
  const ungrounded: string[] = [];
  for (const fact of draftFacts) {
    if (!sourceFacts.has(fact)) ungrounded.push(fact);
  }
  return ungrounded;
}

/** True when the AI draft introduced no facts beyond the grounding source. */
export function isGrounded(draft: string, source: string): boolean {
  return findUngrounded(draft, source).length === 0;
}
