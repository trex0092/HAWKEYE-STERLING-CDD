import { useState } from 'react';
import { useAssessment } from '@/store/useAssessment';
import { useUI } from '@/store/useUI';
import { useToast } from '@/store/useToast';
import { Modal } from '@/components/ui/Modal';
import {
  getRegister,
  saveToRegister,
  removeFromRegister,
  type RegisterRecord,
} from '@/lib/register';
import { Register as RegisterIcon, RemovePerson, ReAssess } from '@/components/icons';

export function RegisterModal() {
  const snapshot = useAssessment((s) => s.snapshot);
  const restore = useAssessment((s) => s.restore);
  const close = useUI((s) => s.closeModal);
  const showToast = useToast((s) => s.show);
  const [records, setRecords] = useState<RegisterRecord[]>(() => getRegister());

  const saveCurrent = () => {
    setRecords(saveToRegister(snapshot()));
    showToast('Saved to register.');
  };

  return (
    <Modal title="Assessment register" onClose={close}>
      <button
        type="button"
        className="hk-btn-add"
        style={{ marginBottom: 14 }}
        onClick={saveCurrent}
      >
        <RegisterIcon size={13} strokeWidth={2.2} />
        Save current assessment
      </button>

      {records.length === 0 ? (
        <div className="hk-modal-empty">
          The register is empty. Save the current assessment to add it here; saved records persist
          in this browser and can be reloaded later.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {records.map((r) => (
            <div
              key={r.ref}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                gap: 10,
                alignItems: 'center',
                background: 'var(--surface-row)',
                border: '1px solid var(--border-row)',
                borderRadius: 10,
                padding: '10px 12px',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    color: 'var(--magenta-bright)',
                  }}
                >
                  {r.ref}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {r.entity} · {r.jurisdiction}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--text-faint)',
                    marginTop: 2,
                  }}
                >
                  Saved {new Date(r.savedAt).toLocaleString()}
                </div>
              </div>
              <button
                type="button"
                className="hk-btn-add"
                onClick={() => {
                  restore(r.snapshot);
                  close();
                  showToast(`Loaded ${r.ref}.`);
                }}
              >
                <ReAssess size={12} strokeWidth={2.2} />
                Load
              </button>
              <button
                type="button"
                className="hk-btn-remove"
                onClick={() => setRecords(removeFromRegister(r.ref))}
              >
                <RemovePerson size={11} strokeWidth={2} />
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
