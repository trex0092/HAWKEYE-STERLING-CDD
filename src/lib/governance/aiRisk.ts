/**
 * AI-output Risk Scoring (RISK) — periodic-table block "RISK".
 *
 * IMPORTANT: this is distinct from the customer/CDD risk band in src/lib/risk.ts.
 * This scores the risk of *trusting a given AI output*: it combines hallucination
 * (grounding), bias and injection-threat signals into a 0..100 score and a tier.
 * Callers surface it in the AI review modal so the analyst sees how safe the draft
 * is before accepting, and feed it to drift/anomaly tracking.
 *
 * Pure and dependency-free; composes the assurance modules.
 */
import { scoreHallucination } from './hallucination';
import { detectBias } from './bias';
import { scanThreats } from '../security/threatIntel';

export type AiRiskTier = 'low' | 'medium' | 'high';

export interface AiRiskScore {
  /** 0 (safe) … 100 (do not trust). */
  score: number;
  tier: AiRiskTier;
  factors: {
    hallucinationRate: number;
    biasScore: number;
    threat: 'low' | 'medium' | 'high' | 'none';
  };
  reasons: string[];
}

const THREAT_WEIGHT = { none: 0, low: 10, medium: 30, high: 60 } as const;

/** Scores an AI draft for trustworthiness against its grounding source. */
export function scoreAiOutput(draft: string, source: string): AiRiskScore {
  const hall = scoreHallucination(draft, source);
  const bias = detectBias(draft);
  const threat = scanThreats(draft);
  const threatLevel = threat.worst ?? 'none';

  const reasons: string[] = [];
  if (!hall.grounded) reasons.push(`${hall.ungrounded.length} ungrounded fact(s)`);
  if (bias.biased) reasons.push(`${bias.findings.length} bias flag(s)`);
  if (threat.worst) reasons.push(`${threatLevel}-severity injection signal in output`);

  const score = Math.round(
    Math.min(100, hall.rate * 60 + bias.score * 25 + THREAT_WEIGHT[threatLevel]),
  );
  const tier: AiRiskTier = score >= 60 ? 'high' : score >= 25 ? 'medium' : 'low';

  return {
    score,
    tier,
    factors: { hallucinationRate: hall.rate, biasScore: bias.score, threat: threatLevel },
    reasons,
  };
}
