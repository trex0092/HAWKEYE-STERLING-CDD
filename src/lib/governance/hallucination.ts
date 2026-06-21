/**
 * Hallucination Detection (HALL) — periodic-table block "HALL".
 *
 * Builds a quantified score on top of the existing grounding check
 * (../ai/grounding.ts). Grounding tells us *which* fact tokens in the draft are
 * absent from the source; this turns that into a rate and a pass/fail the AI risk
 * model and the drift tracker can consume, and exposes the offending tokens for
 * the analyst. Heuristic by design — high-signal on invented numbers/identifiers.
 *
 * Pure and dependency-free; reuses findUngrounded/extractFacts (no duplication).
 */
import { findUngrounded, extractFacts } from '../ai/grounding';

export interface HallucinationReport {
  ungrounded: string[];
  /** ungrounded facts / total draft facts, 0..1 (0 = fully grounded). */
  rate: number;
  grounded: boolean;
}

/** Scores a draft against its grounding source. */
export function scoreHallucination(draft: string, source: string): HallucinationReport {
  const ungrounded = findUngrounded(draft, source);
  const totalFacts = extractFacts(draft).size;
  const rate = totalFacts === 0 ? 0 : ungrounded.length / totalFacts;
  return { ungrounded, rate, grounded: ungrounded.length === 0 };
}
