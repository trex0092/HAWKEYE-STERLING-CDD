/** Renders whichever workstation modal is currently open. */
import { useUI } from '@/store/useUI';
import { RegisterModal } from './RegisterModal';
import { ActivityLogModal } from './ActivityLogModal';

export function ModalRoot() {
  const modal = useUI((s) => s.modal);
  if (modal === 'register') return <RegisterModal />;
  if (modal === 'activity') return <ActivityLogModal />;
  return null;
}
