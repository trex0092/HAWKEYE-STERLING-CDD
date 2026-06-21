/**
 * AI Co-pilot draft review (Governance Layer 5 — Human Oversight).
 *
 * The analyst reviews the AI-suggested narrative here and explicitly Accepts,
 * edits, or Discards it. Accepting commits the (possibly edited) text to the
 * assessment so the report uses it, clearly labelled as AI-assisted; nothing is
 * applied automatically. A grounding banner warns when the draft may contain
 * facts absent from the deterministic source.
 */
import { useAssessment } from '@/store/useAssessment';
import { useAiCopilot } from '@/store/useAiCopilot';
import { useUI } from '@/store/useUI';
import { useToast } from '@/store/useToast';
import { Modal } from '@/components/ui/Modal';

export function AiCopilotModal() {
  const { status, draft, model, grounded, ungrounded, error, setDraft, reset } = useAiCopilot();
  const acceptAiNarrative = useAssessment((s) => s.acceptAiNarrative);
  const logActivity = useAssessment((s) => s.logActivity);
  const close = useUI((s) => s.closeModal);
  const showToast = useToast((s) => s.show);

  const dismiss = () => {
    reset();
    close();
  };

  const accept = () => {
    acceptAiNarrative(draft, model);
    showToast('AI-assisted narrative accepted.');
    dismiss();
  };

  const discard = () => {
    logActivity('AI-assisted narrative discarded by analyst.');
    showToast('AI draft discarded — keeping deterministic narrative.');
    dismiss();
  };

  return (
    <Modal title="AI narrative — review draft" onClose={dismiss}>
      {status === 'loading' && (
        <div className="hk-modal-empty">Drafting a polished narrative… please wait.</div>
      )}

      {status === 'error' && (
        <div className="hk-modal-empty">
          The AI Co-pilot is unavailable ({error ?? 'request failed'}). The deterministic narrative
          remains in use.
        </div>
      )}

      {status === 'ready' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            This is an <strong>AI-assisted draft</strong> for your review — it does not change the
            risk band or decision. Edit it as needed, then Accept to use it in the report (labelled
            AI-assisted) or Discard to keep the deterministic narrative.
          </div>

          {/* Grounding verdict (Layer 4) */}
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
              ? '✓ Grounding check passed — no facts detected beyond the assessment inputs.'
              : `⚠ Review carefully — possible added facts not in the inputs: ${ungrounded.join(', ')}.`}
          </div>

          <label
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '.14em',
              color: 'var(--text-muted)',
            }}
          >
            DRAFT NARRATIVE (EDITABLE)
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={16}
              style={{
                marginTop: 6,
                width: '100%',
                resize: 'vertical',
                fontFamily: 'var(--font-body, inherit)',
                fontSize: 13,
                lineHeight: 1.55,
                padding: 12,
                borderRadius: 8,
                border: '1px solid rgba(130,95,210,.3)',
                background: 'var(--surface, #fff)',
                color: 'var(--text-primary, #15171f)',
              }}
            />
          </label>

          <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
            Model: {model} · This action is recorded in the activity log.
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="hk-btn-remove" onClick={discard}>
              Discard
            </button>
            <button
              type="button"
              className="hk-btn-add"
              onClick={accept}
              disabled={!draft.trim()}
              style={{ opacity: draft.trim() ? 1 : 0.5 }}
            >
              Accept &amp; use in report
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
