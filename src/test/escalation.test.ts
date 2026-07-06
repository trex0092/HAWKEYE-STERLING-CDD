/**
 * Unit tests for AI/operational escalation routing (src/lib/governance/escalation.ts).
 * Confirms high-severity AI/threat events raise a human-review item (HITL) and
 * that low/medium events pass through without escalation.
 */
import { describe, it, expect } from 'vitest';
import { escalateAiEvent, escalateAnomaly } from '@/lib/governance/escalation';
import type { AiRiskScore } from '@/lib/governance/aiRisk';
import type { ThreatScan } from '@/lib/security/threatIntel';

function risk(
  tier: AiRiskScore['tier'],
  score = 50,
  reasons: string[] = ['baseline'],
): AiRiskScore {
  return { score, tier, factors: { hallucinationRate: 0, biasScore: 0, threat: 'none' }, reasons };
}

function highThreat(id: string): ThreatScan {
  return {
    worst: 'high',
    threats: [{ id, severity: 'high', description: 'injection signature' }],
    signatureVersion: 'test',
  };
}

describe('escalateAiEvent', () => {
  it('routes a high-risk AI output to the MLRO with its reasons', () => {
    const items = escalateAiEvent(risk('high', 82, ['hallucination', 'bias']));
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ source: 'ai-risk', severity: 'high', routeTo: 'mlro' });
    expect(items[0].reason).toContain('82/100');
    expect(items[0].reason).toContain('hallucination');
  });

  it('does not escalate low or medium AI risk', () => {
    expect(escalateAiEvent(risk('low'))).toEqual([]);
    expect(escalateAiEvent(risk('medium'))).toEqual([]);
  });

  it('escalates a high-severity threat scan and names the signature ids', () => {
    const items = escalateAiEvent(risk('low'), highThreat('inj-42'));
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ source: 'threat', severity: 'high', routeTo: 'mlro' });
    expect(items[0].reason).toContain('inj-42');
  });

  it('raises both AI-risk and threat items together, AI first', () => {
    const items = escalateAiEvent(risk('high'), highThreat('inj-7'));
    expect(items.map((i) => i.source)).toEqual(['ai-risk', 'threat']);
  });

  it('ignores a non-high threat scan', () => {
    const scan: ThreatScan = { worst: 'medium', threats: [], signatureVersion: 'test' };
    expect(escalateAiEvent(risk('low'), scan)).toEqual([]);
  });
});

describe('escalateAnomaly', () => {
  it('wraps an anomaly as a medium, approver-routed review item', () => {
    expect(escalateAnomaly('audit-chain gap')).toEqual({
      source: 'anomaly',
      severity: 'medium',
      reason: 'audit-chain gap',
      routeTo: 'approver',
    });
  });
});
