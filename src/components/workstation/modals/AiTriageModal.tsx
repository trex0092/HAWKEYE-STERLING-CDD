/**
 * AI adverse-media triage (Governance AI-002; Layers 4 & 5).
 *
 * The analyst pastes raw adverse-media search results; the Co-pilot returns a
 * neutral, themed summary as a **suggestion**. It is advisory only — it never
 * records a finding or changes a risk band; the analyst reads it and enters the
 * structured results in §04. Self-contained: it manages its own request state.
 */
import { useState } from 'react';
import { useAssessment } from '@/store/useAssessment';
import { useUI } from '@/store/useUI';
import { useToast } from '@/store/useToast';
import { Modal } from '@/components/ui/Modal';
import { requestCopilot } from '@/lib/integrations/aiCopilot';

type Status = 'idle' | 'loading' | 'ready' | 'error';

export function AiTriageModal() {
  const close = useUI((s) => s.closeModal);
  const logActivity = useAssessment((s) => s.logActivity);
  const showToast = useToast((s) => s.show);

  const [raw, setRaw] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [summary, setSummary] = useState('');
  const [model, setModel] = useState('');
  const [grounded, setGrounded] = useState(false);
  const [ungrounded, setUngrounded] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const summarize = async () => {
    if (!raw.trim()) return;
    setStatus('loading');
    const result = await requestCopilot('adverse-triage', raw.trim());
    if (result.ok) {
      setSummary(result.value.draft);
      setModel(result.value.model);
      setGrounded(result.value.grounded);
      setUngrounded(result.value.ungrounded);
      setStatus('ready');
      logActivity(`AI adverse-media triage drafted (${result.value.model}) — analyst review.`);
    } else {
      setStatus('error');
      setError(result.reason === 'not-configured' ? 'not configured' : (result.detail ?? 'failed'));
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      showToast('Summary copied — paste into the relevant §04 details.');
    } catch {
      showToast('Could not copy automatically — select and copy the text.');
    }
  };

  return (
    <Modal title="AI adverse-media triage" onClose={close}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Paste raw adverse-media search results below. The summary is an{' '}
          <strong>AI suggestion only</strong> — it does not record a finding or change the risk
          band. Review it, then enter the structured results in §04 yourself.
        </div>

        <label
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '.14em',
            color: 'var(--text-muted)',
          }}
        >
          RAW ADVERSE-MEDIA TEXT
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={8}
            placeholder="Paste search results / article snippets here…"
            style={{
              marginTop: 6,
              width: '100%',
              resize: 'vertical',
              fontSize: 13,
              lineHeight: 1.5,
              padding: 12,
              borderRadius: 8,
              border: '1px solid rgba(130,95,210,.3)',
              background: 'var(--surface, #fff)',
              color: 'var(--text-primary, #15171f)',
            }}
          />
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="hk-btn-add"
            onClick={summarize}
            disabled={!raw.trim() || status === 'loading'}
            style={{ opacity: !raw.trim() || status === 'loading' ? 0.5 : 1 }}
          >
            {status === 'loading' ? 'Summarising…' : 'Summarise'}
          </button>
        </div>

        {status === 'error' && (
          <div className="hk-modal-empty">
            The AI Co-pilot is unavailable ({error}). Enter the §04 findings manually.
          </div>
        )}

        {status === 'ready' && (
          <>
            <div
              role={grounded ? undefined : 'alert'}
              style={{
                fontSize: 12,
                padding: '8px 11px',
                borderRadius: 8,
                border: `1px solid ${grounded ? 'rgba(61,220,132,.4)' : 'rgba(227,179,65,.5)'}`,
                background: grounded ? 'rgba(61,220,132,.08)' : 'rgba(227,179,65,.1)',
                color: grounded ? '#1f9d57' : '#b8860b',
              }}
            >
              {grounded
                ? '✓ No content detected beyond the pasted text.'
                : `⚠ Review — content not clearly in the pasted text: ${ungrounded.join(', ')}.`}
            </div>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={12}
              style={{
                width: '100%',
                resize: 'vertical',
                fontSize: 13,
                lineHeight: 1.55,
                padding: 12,
                borderRadius: 8,
                border: '1px solid rgba(130,95,210,.3)',
                background: 'var(--surface, #fff)',
                color: 'var(--text-primary, #15171f)',
              }}
            />
            <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>Model: {model}</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="hk-btn-remove" onClick={close}>
                Close
              </button>
              <button type="button" className="hk-btn-add" onClick={copy}>
                Copy summary
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
