/**
 * Assessment register — a localStorage-backed list of saved assessments.
 * Keyed by reference number; saving the same reference updates it in place.
 * Swap these reads/writes for an API when persistence moves server-side.
 */
import type { AssessmentSnapshot } from '@/store/useAssessment';

const KEY = 'hawkeye-cdd-register';

export interface RegisterRecord {
  ref: string;
  entity: string;
  jurisdiction: string;
  savedAt: number;
  snapshot: AssessmentSnapshot;
}

export function getRegister(): RegisterRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RegisterRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveToRegister(snapshot: AssessmentSnapshot): RegisterRecord[] {
  const record: RegisterRecord = {
    ref: snapshot.admin.referenceNumber || 'UNREFERENCED',
    entity: snapshot.entity.legalName || 'Unnamed entity',
    jurisdiction: snapshot.entity.jurisdiction,
    savedAt: Date.now(),
    snapshot,
  };
  const existing = getRegister().filter((r) => r.ref !== record.ref);
  const next = [record, ...existing];
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function removeFromRegister(ref: string): RegisterRecord[] {
  const next = getRegister().filter((r) => r.ref !== ref);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
