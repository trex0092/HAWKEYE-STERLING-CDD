/**
 * Transient state for the AI Co-pilot review flow (Governance Layer 5 — Human
 * Oversight). Holds the in-progress draft the analyst is reviewing in the modal:
 * the editable working copy, the model id, and the grounding verdict. Nothing
 * here is persisted — only an explicitly *accepted* draft is committed to the
 * assessment store (see useAssessment.acceptAiNarrative).
 */
import { create } from 'zustand';
import type { CopilotDraft } from '@/lib/integrations/aiCopilot';

export type CopilotStatus = 'idle' | 'loading' | 'ready' | 'error';

interface AiCopilotState {
  status: CopilotStatus;
  /** Editable working copy of the draft (analyst may revise before accepting). */
  draft: string;
  model: string;
  grounded: boolean;
  ungrounded: string[];
  error: string | null;

  begin: () => void;
  succeed: (value: CopilotDraft) => void;
  fail: (message: string) => void;
  setDraft: (text: string) => void;
  reset: () => void;
}

const CLEAN = {
  status: 'idle' as CopilotStatus,
  draft: '',
  model: '',
  grounded: false,
  ungrounded: [] as string[],
  error: null as string | null,
};

export const useAiCopilot = create<AiCopilotState>((set) => ({
  ...CLEAN,
  begin: () => set({ ...CLEAN, status: 'loading' }),
  succeed: (value) =>
    set({
      status: 'ready',
      draft: value.draft,
      model: value.model,
      grounded: value.grounded,
      ungrounded: value.ungrounded,
      error: null,
    }),
  fail: (message) => set({ ...CLEAN, status: 'error', error: message }),
  setDraft: (text) => set({ draft: text }),
  reset: () => set({ ...CLEAN }),
}));
