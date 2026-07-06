/**
 * Unit tests for the AI Co-pilot review-flow store (src/store/useAiCopilot.ts).
 * This holds only the transient draft the analyst reviews; nothing is persisted
 * and nothing is auto-applied (Governance Layer 5 — Human Oversight).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useAiCopilot } from '@/store/useAiCopilot';
import type { CopilotDraft } from '@/lib/integrations/aiCopilot';

const DRAFT: CopilotDraft = {
  draft: 'Polished narrative.',
  model: 'claude-test',
  grounded: true,
  ungrounded: [],
};

describe('useAiCopilot store', () => {
  beforeEach(() => {
    useAiCopilot.getState().reset();
  });

  it('begin() enters loading and clears any prior draft', () => {
    useAiCopilot.getState().setDraft('stale');
    useAiCopilot.getState().begin();
    const s = useAiCopilot.getState();
    expect(s.status).toBe('loading');
    expect(s.draft).toBe('');
    expect(s.error).toBeNull();
  });

  it('succeed() stores the draft, model and grounding verdict', () => {
    useAiCopilot.getState().succeed(DRAFT);
    const s = useAiCopilot.getState();
    expect(s.status).toBe('ready');
    expect(s.draft).toBe('Polished narrative.');
    expect(s.model).toBe('claude-test');
    expect(s.grounded).toBe(true);
    expect(s.ungrounded).toEqual([]);
  });

  it('fail() records the error and clears the draft', () => {
    useAiCopilot.getState().succeed(DRAFT);
    useAiCopilot.getState().fail('model unavailable');
    const s = useAiCopilot.getState();
    expect(s.status).toBe('error');
    expect(s.error).toBe('model unavailable');
    expect(s.draft).toBe('');
  });

  it('setDraft() edits the working copy without changing status', () => {
    useAiCopilot.getState().succeed(DRAFT);
    useAiCopilot.getState().setDraft('Analyst-revised narrative.');
    const s = useAiCopilot.getState();
    expect(s.draft).toBe('Analyst-revised narrative.');
    expect(s.status).toBe('ready');
  });

  it('reset() returns to a clean idle state', () => {
    useAiCopilot.getState().succeed(DRAFT);
    useAiCopilot.getState().reset();
    expect(useAiCopilot.getState()).toMatchObject({
      status: 'idle',
      draft: '',
      model: '',
      grounded: false,
      ungrounded: [],
      error: null,
    });
  });
});
