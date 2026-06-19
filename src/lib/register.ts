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
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as RegisterRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    // Surface corruption rather than silently presenting an empty register (which
    // could look like data loss). The raw value is left intact for recovery.
    console.warn('[register] stored register could not be parsed; leaving it untouched.', err);
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
