import { useAssessment } from '@/store/useAssessment';
import { useUI } from '@/store/useUI';
import { Modal } from '@/components/ui/Modal';

export function ActivityLogModal() {
  const activity = useAssessment((s) => s.activity);
  const close = useUI((s) => s.closeModal);

  return (
    <Modal title="Activity log" onClose={close}>
      {activity.length === 0 ? (
        <div className="hk-modal-empty">
          No activity recorded yet. Actions such as completing, re-assessing, overriding the band,
          or resetting will be logged here.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {activity.map((a) => (
            <div
              key={a.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '170px 1fr',
                gap: 12,
                alignItems: 'baseline',
                padding: '9px 4px',
                borderBottom: '1px solid rgba(130,95,210,.08)',
              }}
            >
              <span
                style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-faint)' }}
              >
                {new Date(a.ts).toLocaleString()}
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{a.message}</span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
