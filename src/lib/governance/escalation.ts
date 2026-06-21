/**
 * Escalation (ESC) — periodic-table block "ESC".
 *
 * src/lib/risk.ts already escalates the *customer* band on screening hits. This
 * routes *AI/operational* high-severity events (a high AI-risk draft, a detected
 * injection threat, an anomaly) to a human reviewer queue flag, so they don't pass
 * silently. It does not act autonomously — it raises a review item the analyst/
 * MLRO must clear (HITL preserved).
 *
 * Pure and dependency-free.
 */
import type { AiRiskScore } from './aiRisk';
import type { ThreatScan } from '../security/threatIntel';

export type EscalationSeverity = 'medium' | 'high';

export interface EscalationItem {
  source: 'ai-risk' | 'threat' | 'anomaly';
  severity: EscalationSeverity;
  reason: string;
  /** Suggested reviewer role. */
  routeTo: 'approver' | 'mlro';
}

/** Decides whether an AI output / threat scan warrants human escalation. */
export function escalateAiEvent(risk: AiRiskScore, threat?: ThreatScan): EscalationItem[] {
  const items: EscalationItem[] = [];
  if (risk.tier === 'high') {
    items.push({
      source: 'ai-risk',
      severity: 'high',
      reason: `AI output risk ${risk.score}/100: ${risk.reasons.join('; ')}`,
      routeTo: 'mlro',
    });
  }
  if (threat?.worst === 'high') {
    items.push({
      source: 'threat',
      severity: 'high',
      reason: `High-severity injection signature(s): ${threat.threats.map((t) => t.id).join(', ')}`,
      routeTo: 'mlro',
    });
  }
  return items;
}

/** Wraps an anomaly into an escalation item. */
export function escalateAnomaly(reason: string): EscalationItem {
  return { source: 'anomaly', severity: 'medium', reason, routeTo: 'approver' };
}
