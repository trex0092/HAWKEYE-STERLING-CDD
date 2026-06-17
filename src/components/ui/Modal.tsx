/** Generic centred modal with a title, close affordance, Esc-to-close and backdrop click. */
import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="hk-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="hk-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="hk-modal-bar" />
        <div className="hk-modal-head">
          <span className="hk-modal-title">{title}</span>
          <button type="button" className="hk-modal-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="hk-modal-body">{children}</div>
      </div>
    </div>
  );
}
