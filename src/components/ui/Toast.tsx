/**
 * Minimal toast. Actions that aren't yet backed by a service (REGISTER,
 * ACTIVITY LOG, SEND TO ASANA, …) surface a transient confirmation here instead
 * of being dead buttons. Swap the call sites for real flows when the backend
 * lands.
 */
import { create } from 'zustand';

interface ToastState {
  message: string | null;
  show: (message: string) => void;
  hide: () => void;
}

let timer: ReturnType<typeof setTimeout> | undefined;

export const useToast = create<ToastState>((set) => ({
  message: null,
  show: (message) => {
    set({ message });
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => set({ message: null }), 2600);
  },
  hide: () => {
    if (timer) clearTimeout(timer);
    set({ message: null });
  },
}));

export function Toaster() {
  const message = useToast((s) => s.message);
  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 28,
        transform: 'translateX(-50%)',
        zIndex: 80,
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        letterSpacing: '.06em',
        color: '#dcb3ff',
        background: 'rgba(13,15,25,.94)',
        border: '1px solid rgba(232,90,255,.45)',
        borderRadius: 10,
        padding: '11px 18px',
        boxShadow: '0 18px 50px rgba(0,0,0,.5), 0 0 22px rgba(232,90,255,.18)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {message}
    </div>
  );
}
