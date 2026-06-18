/** Transient UI state: which modal is open, and the analyst-override popover. */
import { create } from 'zustand';

export type ModalKind = 'register' | 'activity' | null;

interface UIState {
  modal: ModalKind;
  overrideOpen: boolean;
  openModal: (modal: Exclude<ModalKind, null>) => void;
  closeModal: () => void;
  toggleOverride: () => void;
  closeOverride: () => void;
}

export const useUI = create<UIState>((set) => ({
  modal: null,
  overrideOpen: false,
  openModal: (modal) => set({ modal }),
  closeModal: () => set({ modal: null }),
  toggleOverride: () => set((s) => ({ overrideOpen: !s.overrideOpen })),
  closeOverride: () => set({ overrideOpen: false }),
}));
