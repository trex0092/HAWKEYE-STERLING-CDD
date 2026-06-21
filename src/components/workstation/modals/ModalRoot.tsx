/** Renders whichever workstation modal is currently open. */
import { useUI } from '@/store/useUI';
import { RegisterModal } from './RegisterModal';
import { ActivityLogModal } from './ActivityLogModal';
import { AiCopilotModal } from './AiCopilotModal';
import { AiTriageModal } from './AiTriageModal';

export function ModalRoot() {
  const modal = useUI((s) => s.modal);
  if (modal === 'register') return <RegisterModal />;
  if (modal === 'activity') return <ActivityLogModal />;
  if (modal === 'ai-copilot') return <AiCopilotModal />;
  if (modal === 'ai-triage') return <AiTriageModal />;
  return null;
}
