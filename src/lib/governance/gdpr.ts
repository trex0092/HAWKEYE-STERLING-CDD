/**
 * GDPR controls (GDPR) — periodic-table block "GDPR".
 *
 * Promotes GDPR from documentation to code: data-subject rights and lawful-basis
 * gating implemented against the app's own localStorage store.
 *   - Right to erasure: `eraseLocalData` clears persisted assessment + register +
 *     telemetry.
 *   - Right to portability: `buildDataExport` packages the held data as JSON.
 *   - Lawful basis / consent: `consentGate` blocks AI egress unless consent is on.
 *   - Storage limitation: `isPastRetention` flags records beyond the retention
 *     period so they can be reviewed/purged.
 *
 * Pure helpers + explicit storage operations; dependency-free.
 */
import { resetTelemetry } from './telemetry';

/** localStorage keys the app owns (assessment persist + register). */
export const OWNED_STORAGE_KEYS = ['hawkeye-cdd', 'hawkeye-cdd-register'] as const;

/** Default retention: 10 years (matches the sign-off statement). */
export const RETENTION_YEARS = 10;

/** Consent must be recorded before any personal data is sent to the AI model. */
export interface ConsentDecision {
  allowed: boolean;
  reason: string;
}

export function consentGate(consentGiven: boolean): ConsentDecision {
  return consentGiven
    ? { allowed: true, reason: 'data-subject consent / lawful basis recorded' }
    : { allowed: false, reason: 'no recorded lawful basis — AI processing blocked' };
}

/** True when an assessment dated `assessmentDateMs` is past the retention window. */
export function isPastRetention(assessmentDateMs: number, now: number = Date.now()): boolean {
  const ageMs = now - assessmentDateMs;
  return ageMs > RETENTION_YEARS * 365.25 * 24 * 60 * 60 * 1000;
}

/** Packages currently-held local data for a portability export. */
export function buildDataExport(backing: Storage = localStorage): string {
  const payload: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    note: 'GDPR data portability export — Hawkeye Sterling CDD',
    records: {},
  };
  const records = payload.records as Record<string, unknown>;
  for (const key of OWNED_STORAGE_KEYS) {
    const raw = backing.getItem(key);
    if (raw !== null) {
      try {
        records[key] = JSON.parse(raw);
      } catch {
        records[key] = raw; // ciphertext or non-JSON — include verbatim.
      }
    }
  }
  return JSON.stringify(payload, null, 2);
}

/** Right to erasure: removes all owned local data and clears telemetry. */
export function eraseLocalData(backing: Storage = localStorage): void {
  for (const key of OWNED_STORAGE_KEYS) backing.removeItem(key);
  resetTelemetry();
}
