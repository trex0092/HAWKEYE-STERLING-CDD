/**
 * Bias Detection (BIAS) — periodic-table block "BIAS".
 *
 * A heuristic check that an AI-drafted compliance narrative stays neutral and
 * evidence-based. It flags (1) loaded / subjective language that has no place in a
 * factual due-diligence record, and (2) unprompted references to protected
 * characteristics (race, religion, nationality-as-judgement, gender) that could
 * indicate biased reasoning. It does not "measure fairness" of a model globally —
 * it guards each output the analyst is about to accept.
 *
 * Pure and dependency-free.
 */

const LOADED_TERMS = [
  'obviously',
  'clearly suspicious',
  'shady',
  'dodgy',
  'criminal type',
  'untrustworthy',
  'as expected',
  'these people',
  'typical of',
  'must be',
  'surely',
];

const PROTECTED_TERMS = [
  'race',
  'racial',
  'religion',
  'religious',
  'muslim',
  'christian',
  'jewish',
  'ethnicity',
  'ethnic',
  'gender',
  'sexual orientation',
];

export interface BiasFinding {
  kind: 'loaded-language' | 'protected-characteristic';
  term: string;
}

export interface BiasReport {
  findings: BiasFinding[];
  /** 0 (neutral) … 1 (heavily flagged), used by the AI risk score. */
  score: number;
  biased: boolean;
}

function findTerms(text: string, terms: string[], kind: BiasFinding['kind']): BiasFinding[] {
  const lower = text.toLowerCase();
  return terms.filter((t) => lower.includes(t)).map((term) => ({ kind, term }));
}

/** Scans a draft for biased language and protected-characteristic references. */
export function detectBias(text: string): BiasReport {
  const findings = [
    ...findTerms(text, LOADED_TERMS, 'loaded-language'),
    ...findTerms(text, PROTECTED_TERMS, 'protected-characteristic'),
  ];
  const score = Math.min(1, findings.length / 4);
  return { findings, score, biased: findings.length > 0 };
}
