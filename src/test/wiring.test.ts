/**
 * Tests for the enforcement wiring added on top of the control modules:
 *  - GDPR consent gate + DLP secret-block in the AI egress path
 *  - Zero-trust gating of workflow mutations in the store
 *  - VDB typology suggestions
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { requestCopilot } from '@/lib/integrations/aiCopilot';
import { suggestTypologies } from '@/lib/governance/typologyIndex';
import { useAssessment } from '@/store/useAssessment';

describe('AI egress guards (GDPR consent + DLP)', () => {
  it('blocks the call when consent is withheld (no network)', async () => {
    const r = await requestCopilot('narrative-polish', 'A clean compliance narrative.', {
      consent: false,
    });
    expect(r).toEqual({ ok: false, reason: 'consent-required', detail: expect.any(String) });
  });

  it('blocks the call when a secret would be sent', async () => {
    const r = await requestCopilot('narrative-polish', 'use key sk-ant-abcdefghijkl now', {
      consent: true,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('dlp-blocked');
      expect(r.detail).toContain('anthropic-key');
    }
  });
});

describe('Zero-trust gating of workflow mutations', () => {
  beforeEach(() => {
    localStorage.clear();
    useAssessment.getState().reset();
    useAssessment.setState({ locked: false, versions: [], overrideBand: null, aiNarrative: null });
  });

  it('denies complete / override / AI-accept for a low-privilege role', () => {
    useAssessment.setState({ currentUser: { id: 'analyst', name: 'A', role: 'analyst' } });
    useAssessment.getState().completeAssessment();
    useAssessment.getState().setOverrideBand('high');
    useAssessment.getState().acceptAiNarrative('text', 'model');
    const s = useAssessment.getState();
    expect(s.versions).toHaveLength(0); // complete denied
    expect(s.overrideBand).toBeNull(); // override denied
    expect(s.aiNarrative).toBeNull(); // accept denied
  });

  it('allows the same actions for an approver/admin', () => {
    useAssessment.setState({ currentUser: { id: 'mlro', name: 'M', role: 'mlro' } });
    useAssessment.getState().setOverrideBand('high');
    useAssessment.getState().completeAssessment();
    const s = useAssessment.getState();
    expect(s.overrideBand).toBe('high');
    expect(s.versions).toHaveLength(1);
  });
});

describe('VDB typology suggestions', () => {
  it('suggests the closest typology and filters noise', () => {
    const hits = suggestTypologies('over-invoicing and trade mispricing on shipments', 'analyst');
    expect(hits[0].id).toBe('trade-based');
    expect(suggestTypologies('the weather is nice today', 'analyst').length).toBe(0);
  });
});
