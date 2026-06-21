/**
 * AI Compliance Co-pilot — governance assurance tests (Layers 2, 4, 5).
 *
 * These are the golden checks that keep the AI feature honest:
 *  - PII never leaves the trust boundary un-redacted (L2)
 *  - the model is not trusted to invent facts (L4 grounding)
 *  - the client degrades gracefully and never auto-applies output (L5)
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { redactSensitive, restoreSensitive } from '@/lib/ai/redaction';
import { extractFacts, findUngrounded, isGrounded } from '@/lib/ai/grounding';
import { requestCopilot, narrativeToSource } from '@/lib/integrations/aiCopilot';
import { useAssessment } from '@/store/useAssessment';

describe('PII redaction (Layer 2 — data minimisation)', () => {
  it('redacts Emirates ID, email, dates and passport-style identifiers', () => {
    const text =
      'Owner holds passport A1234567 and Emirates ID 784-1990-1234567-8, ' +
      'born 13/03/1990, contactable at owner@example.com.';
    const { redacted, map } = redactSensitive(text);

    expect(redacted).not.toContain('A1234567');
    expect(redacted).not.toContain('784-1990-1234567-8');
    expect(redacted).not.toContain('13/03/1990');
    expect(redacted).not.toContain('owner@example.com');
    // Every original value is recoverable from the map.
    expect(Object.values(map)).toContain('A1234567');
    expect(Object.values(map)).toContain('owner@example.com');
  });

  it('round-trips: restoreSensitive is the inverse of redactSensitive', () => {
    const text = 'Passport B9988776 for owner@firm.ae expiring 2028-03-13.';
    const { redacted, map } = redactSensitive(text);
    expect(restoreSensitive(redacted, map)).toBe(text);
  });

  it('maps identical values to the same placeholder (keeps grounding intact)', () => {
    const { map } = redactSensitive('ID X1234567 and again X1234567.');
    const placeholders = Object.keys(map).filter((k) => map[k] === 'X1234567');
    expect(placeholders).toHaveLength(1);
  });

  it('leaves ordinary prose untouched', () => {
    const text = 'The customer is registered in the United Kingdom.';
    expect(redactSensitive(text).redacted).toBe(text);
  });
});

describe('grounding / no-fabrication (Layer 4 — assurance)', () => {
  it('extracts numeric and proper-noun facts, ignoring sentence starters', () => {
    const facts = extractFacts('Acme Holdings is registered under 12345.');
    expect(facts.has('acme')).toBe(true);
    expect(facts.has('holdings')).toBe(true);
    expect(facts.has('12345')).toBe(true);
    expect(facts.has('the')).toBe(false);
  });

  it('flags an invented registration number as ungrounded', () => {
    const source = 'Registered under licence 12345 in the United Kingdom.';
    const draft = 'Registered under licence 98765 in the United Kingdom.';
    expect(findUngrounded(draft, source)).toContain('98765');
    expect(isGrounded(draft, source)).toBe(false);
  });

  it('flags an invented party name as ungrounded', () => {
    const source = 'Ownership is attributed to a single beneficial owner.';
    const draft = 'Ownership is attributed to Globex Trading FZE.';
    expect(findUngrounded(draft, source)).toEqual(expect.arrayContaining(['globex', 'trading']));
  });

  it('passes a faithful rephrase that adds no new facts', () => {
    const source = 'The customer is registered in the United Kingdom under 12345.';
    const draft = 'The customer is registered under 12345 within the United Kingdom.';
    expect(isGrounded(draft, source)).toBe(true);
  });
});

describe('co-pilot client (Layer 5 — human oversight & graceful fallback)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('flattens narrative paragraphs into a single grounding source', () => {
    const source = narrativeToSource([
      { heading: '1. Purpose', body: 'Body one.' },
      { heading: '2. Profile', body: 'Body two.' },
    ]);
    expect(source).toBe('1. Purpose\nBody one.\n\n2. Profile\nBody two.');
  });

  it('maps a 503 to not-configured (keeps the deterministic narrative)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await requestCopilot('narrative-polish', 'source text');
    expect(result).toEqual({ ok: false, reason: 'not-configured' });
    expect(fetchMock).toHaveBeenCalledWith(
      '/.netlify/functions/ai-copilot',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('returns the draft and grounding verdict on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          draft: 'Polished prose.',
          model: 'claude-haiku-4-5-20251001',
          grounded: true,
          ungrounded: [],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const result = await requestCopilot('narrative-polish', 'source text');
    expect(result).toEqual({
      ok: true,
      value: {
        draft: 'Polished prose.',
        model: 'claude-haiku-4-5-20251001',
        grounded: true,
        ungrounded: [],
      },
    });
  });

  it('reports request-failed on a backend error', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 502 }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await requestCopilot('narrative-polish', 'source text');
    expect(result).toEqual({ ok: false, reason: 'request-failed', detail: 'HTTP 502' });
  });
});

describe('accepted AI narrative in the assessment store (Layers 5/6)', () => {
  beforeEach(() => {
    localStorage.clear();
    useAssessment.getState().reset();
    useAssessment.setState({ activity: [], aiNarrative: null });
  });

  it('defaults to no AI narrative (deterministic narrative is authoritative)', () => {
    expect(useAssessment.getState().aiNarrative).toBeNull();
  });

  it('accepts an analyst-reviewed draft and records it with the model id', () => {
    useAssessment.getState().acceptAiNarrative('Reviewed prose.', 'claude-haiku-4-5-20251001');
    const s = useAssessment.getState();
    expect(s.aiNarrative).toMatchObject({
      text: 'Reviewed prose.',
      model: 'claude-haiku-4-5-20251001',
    });
    // Acceptance is auditable.
    expect(s.activity[0].message).toContain('AI-assisted narrative accepted');
    expect(s.activity[0].message).toContain('claude-haiku-4-5-20251001');
  });

  it('clears the AI narrative back to the deterministic one', () => {
    useAssessment.getState().acceptAiNarrative('Reviewed prose.', 'm');
    useAssessment.getState().clearAiNarrative();
    const s = useAssessment.getState();
    expect(s.aiNarrative).toBeNull();
    expect(s.activity[0].message).toContain('reverted to deterministic');
  });

  it('drops any AI narrative when the assessment is reset', () => {
    useAssessment.getState().acceptAiNarrative('Reviewed prose.', 'm');
    useAssessment.getState().reset();
    expect(useAssessment.getState().aiNarrative).toBeNull();
  });
});
