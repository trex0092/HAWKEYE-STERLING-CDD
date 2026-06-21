/**
 * Central assessment store (Zustand) with localStorage persistence.
 *
 * Holds the whole assessment as controlled state plus the session gate/clock.
 * Band, risk score, palette and the report banner are *derived* from the
 * effective band (analyst override ?? jurisdiction → band; see lib/risk.ts).
 *
 * Persistence: the assessment data is persisted; the session (locked/remaining/
 * now) is intentionally NOT persisted, so a reload always re-engages the lock.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  SANCTIONS_LISTS,
  ADVERSE_CATEGORIES,
  PF_FACTORS,
  type ResultValue,
  type LevelValue,
  type RbaValue,
} from '@/data/labels';
import { SESSION_DURATION_SECONDS } from '@/lib/auth';
import type { RiskBand } from '@/lib/risk';

export interface AdminInfo {
  referenceNumber: string;
  assessmentDate: string;
  nextReviewDate: string;
  assessedBy: string;
  role: string;
}

export interface EntityInfo {
  legalName: string;
  jurisdiction: string;
  tradingName: string;
  registrationNo: string;
  registeredAddress: string;
  websiteEmail: string;
}

export interface SanctionRow {
  result: ResultValue;
  date: string;
  remarks: string;
}

export interface AdverseRow {
  finding: ResultValue;
  details: string;
}

export interface PfRow {
  level: LevelValue;
  notes: string;
}

export interface Person {
  id: number;
  designation: string;
  name: string;
  shares: string;
  type: string;
  nationality: string;
  dob: string;
  passportNo: string;
  passportExpiry: string;
  emiratesId: string;
  emiratesIdExpiry: string;
  proofOfAddress: string;
  pepStatus: string;
}

export interface Rba {
  classification: RbaValue;
  cddLevel: string;
  decision: string;
  triggerEvents: boolean;
}

export interface Signoff {
  preparedBy: string;
  preparedRole: string;
  approvedBy: string;
  approvedRole: string;
}

export interface VersionEntry {
  ver: string;
  date: string;
  by: string;
  type: string;
  summary: string;
}

export interface ActivityEntry {
  id: number;
  ts: number;
  message: string;
}

/** An AI-assisted narrative the analyst has explicitly reviewed and accepted. */
export interface AiNarrative {
  /** The accepted (possibly analyst-edited) prose. */
  text: string;
  /** Pinned model id that produced the original draft (for the audit trail). */
  model: string;
  acceptedAt: number;
}

/** A serialisable snapshot of just the assessment data (for the register). */
export interface AssessmentSnapshot {
  admin: AdminInfo;
  entity: EntityInfo;
  sanctions: SanctionRow[];
  adverse: AdverseRow[];
  pf: PfRow[];
  persons: Person[];
  nextId: number;
  rba: Rba;
  signoff: Signoff;
  versions: VersionEntry[];
  overrideBand: RiskBand | null;
  completed: boolean;
}

function blankPerson(id: number): Person {
  return {
    id,
    designation: '',
    name: '',
    shares: '',
    type: 'Individual',
    nationality: '',
    dob: '',
    passportNo: '',
    passportExpiry: '',
    emiratesId: '',
    emiratesIdExpiry: '',
    proofOfAddress: 'Provided',
    pepStatus: 'Not PEP',
  };
}

function freshAdmin(): AdminInfo {
  // Start blank — a reference number and review date must be assigned by the firm,
  // not pre-seeded with sample values that would otherwise flow into the export.
  return {
    referenceNumber: '',
    assessmentDate: todayStr(),
    nextReviewDate: '',
    assessedBy: '',
    role: '',
  };
}
function freshEntity(): EntityInfo {
  return {
    legalName: '',
    jurisdiction: 'United Kingdom',
    tradingName: '',
    registrationNo: '',
    registeredAddress: '',
    websiteEmail: '',
  };
}
const freshSanctions = (): SanctionRow[] =>
  SANCTIONS_LISTS.map(() => ({ result: 'Negative', date: '', remarks: '' }));
const freshAdverse = (): AdverseRow[] =>
  ADVERSE_CATEGORIES.map(() => ({ finding: 'Negative', details: '' }));
const freshPf = (): PfRow[] => PF_FACTORS.map(() => ({ level: 'Low', notes: '' }));
function freshRba(): Rba {
  return {
    classification: 'Low Risk',
    cddLevel: 'Standard CDD',
    decision: 'Pending',
    triggerEvents: false,
  };
}
function freshSignoff(): Signoff {
  return {
    preparedBy: '',
    preparedRole: 'Compliance Officer',
    approvedBy: '',
    approvedRole: 'Managing Director',
  };
}

/** dd/mm/yyyy for "today". */
function todayStr(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

let activitySeq = 1;

export interface AssessmentState {
  // session (not persisted)
  locked: boolean;
  remaining: number;

  // assessment (persisted)
  admin: AdminInfo;
  entity: EntityInfo;
  sanctions: SanctionRow[];
  adverse: AdverseRow[];
  pf: PfRow[];
  persons: Person[];
  nextId: number;
  rba: Rba;
  signoff: Signoff;
  versions: VersionEntry[];
  activity: ActivityEntry[];
  overrideBand: RiskBand | null;
  completed: boolean;
  lastSavedAt: number | null;
  /** Analyst-accepted AI-assisted narrative; null means use the deterministic one. */
  aiNarrative: AiNarrative | null;

  // session actions
  tick: () => void;
  unlock: () => void;
  lock: () => void;

  // assessment actions
  setAdmin: (patch: Partial<AdminInfo>) => void;
  setEntity: (patch: Partial<EntityInfo>) => void;
  setJurisdiction: (jurisdiction: string) => void;
  setSanction: (i: number, patch: Partial<SanctionRow>) => void;
  setAdverse: (i: number, patch: Partial<AdverseRow>) => void;
  setPf: (i: number, patch: Partial<PfRow>) => void;
  addPerson: () => void;
  removePerson: (id: number) => void;
  setPerson: (id: number, patch: Partial<Person>) => void;
  setRba: (patch: Partial<Rba>) => void;
  setSignoff: (patch: Partial<Signoff>) => void;
  reset: () => void;

  // wired workflow actions
  logActivity: (message: string) => void;
  acceptAiNarrative: (text: string, model: string) => void;
  clearAiNarrative: () => void;
  setOverrideBand: (band: RiskBand | null) => void;
  completeAssessment: () => void;
  reassess: () => void;
  snapshot: () => AssessmentSnapshot;
  restore: (snapshot: AssessmentSnapshot) => void;
}

/** Marks the data as freshly autosaved (persist middleware writes on every set). */
const saved = () => ({ lastSavedAt: Date.now() });

/**
 * Optional, fire-and-forget mirror of each activity entry to a backend audit log
 * (Layer 6). Off unless `VITE_AUDIT_ENDPOINT` is set; failures are swallowed so
 * the in-app log never depends on it. Replace the localStorage trail with this
 * when a durable, cross-device audit store is available.
 */
function mirrorToAudit(entry: ActivityEntry): void {
  const endpoint = import.meta.env.VITE_AUDIT_ENDPOINT;
  if (!endpoint || typeof fetch === 'undefined') return;
  void fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
    keepalive: true,
  }).catch(() => {
    /* audit mirror is best-effort; the local log remains the source of truth */
  });
}

function makeActivity(message: string): ActivityEntry {
  const entry: ActivityEntry = { id: activitySeq++, ts: Date.now(), message };
  mirrorToAudit(entry);
  return entry;
}

export const useAssessment = create<AssessmentState>()(
  persist(
    (set, get) => ({
      // session
      locked: true,
      remaining: SESSION_DURATION_SECONDS,

      // assessment
      admin: freshAdmin(),
      entity: freshEntity(),
      sanctions: freshSanctions(),
      adverse: freshAdverse(),
      pf: freshPf(),
      persons: [blankPerson(1)],
      nextId: 2,
      rba: freshRba(),
      signoff: freshSignoff(),
      versions: [],
      activity: [],
      overrideBand: null,
      completed: false,
      lastSavedAt: null,
      aiNarrative: null,

      // session actions
      // The session clock only runs while unlocked; it auto-locks when it hits 0.
      tick: () =>
        set((s) => {
          if (s.locked) return {};
          const r = s.remaining > 0 ? s.remaining - 1 : 0;
          return { remaining: r, locked: r === 0 };
        }),
      unlock: () => set({ locked: false, remaining: SESSION_DURATION_SECONDS }),
      lock: () => set({ locked: true, remaining: 0 }),

      // assessment actions (each marks an autosave)
      setAdmin: (patch) => set((s) => ({ admin: { ...s.admin, ...patch }, ...saved() })),
      setEntity: (patch) => set((s) => ({ entity: { ...s.entity, ...patch }, ...saved() })),
      setJurisdiction: (jurisdiction) =>
        set((s) => ({ entity: { ...s.entity, jurisdiction }, ...saved() })),
      setSanction: (i, patch) =>
        set((s) => {
          const sanctions = s.sanctions.slice();
          sanctions[i] = { ...sanctions[i], ...patch };
          return { sanctions, ...saved() };
        }),
      setAdverse: (i, patch) =>
        set((s) => {
          const adverse = s.adverse.slice();
          adverse[i] = { ...adverse[i], ...patch };
          return { adverse, ...saved() };
        }),
      setPf: (i, patch) =>
        set((s) => {
          const pf = s.pf.slice();
          pf[i] = { ...pf[i], ...patch };
          return { pf, ...saved() };
        }),
      addPerson: () =>
        set((s) => ({
          persons: [...s.persons, blankPerson(s.nextId)],
          nextId: s.nextId + 1,
          ...saved(),
        })),
      removePerson: (id) =>
        set((s) => ({ persons: s.persons.filter((p) => p.id !== id), ...saved() })),
      setPerson: (id, patch) =>
        set((s) => ({
          persons: s.persons.map((p) => (p.id === id ? { ...p, ...patch } : p)),
          ...saved(),
        })),
      setRba: (patch) => set((s) => ({ rba: { ...s.rba, ...patch }, ...saved() })),
      setSignoff: (patch) => set((s) => ({ signoff: { ...s.signoff, ...patch }, ...saved() })),

      // RESET — clears entity, screening, persons, PF, RBA and override to clean
      // defaults (jurisdiction returns to United Kingdom); keeps admin + sign-off.
      reset: () =>
        set((s) => ({
          entity: freshEntity(),
          sanctions: freshSanctions(),
          adverse: freshAdverse(),
          pf: freshPf(),
          persons: [blankPerson(1)],
          nextId: 2,
          rba: freshRba(),
          overrideBand: null,
          completed: false,
          aiNarrative: null,
          activity: [makeActivity('Assessment reset to clean defaults.'), ...s.activity],
          ...saved(),
        })),

      // wired workflow actions
      logActivity: (message) =>
        set((s) => ({ activity: [makeActivity(message), ...s.activity], ...saved() })),

      // Human oversight: commit an AI draft only after the analyst reviews it.
      acceptAiNarrative: (text, model) =>
        set((s) => ({
          aiNarrative: { text, model, acceptedAt: Date.now() },
          activity: [
            makeActivity(`AI-assisted narrative accepted (${model}) — analyst reviewed.`),
            ...s.activity,
          ],
          ...saved(),
        })),

      clearAiNarrative: () =>
        set((s) => ({
          aiNarrative: null,
          activity: [
            makeActivity('AI-assisted narrative removed — reverted to deterministic narrative.'),
            ...s.activity,
          ],
          ...saved(),
        })),

      setOverrideBand: (band) =>
        set((s) => ({
          overrideBand: band,
          activity: [
            makeActivity(
              band
                ? `Analyst override: band set to ${band.toUpperCase()}.`
                : 'Analyst override cleared (back to auto).',
            ),
            ...s.activity,
          ],
          ...saved(),
        })),

      completeAssessment: () =>
        set((s) => {
          const n = s.versions.length + 1;
          const entry: VersionEntry = {
            ver: String(n).padStart(2, '0'),
            date: todayStr(),
            by: s.signoff.preparedBy || s.admin.assessedBy || 'Compliance Department',
            type: s.versions.length === 0 ? 'Initial' : 'Periodic',
            summary: 'Assessment completed',
          };
          return {
            versions: [...s.versions, entry],
            completed: true,
            activity: [
              makeActivity(`Assessment completed — version ${entry.ver} logged.`),
              ...s.activity,
            ],
            ...saved(),
          };
        }),

      reassess: () =>
        set((s) => {
          const date = todayStr();
          return {
            sanctions: s.sanctions.map((r) => ({ ...r, date })),
            activity: [
              makeActivity('Re-assessed — all sanctions lists re-screened today.'),
              ...s.activity,
            ],
            ...saved(),
          };
        }),

      snapshot: () => {
        const s = get();
        return {
          admin: s.admin,
          entity: s.entity,
          sanctions: s.sanctions,
          adverse: s.adverse,
          pf: s.pf,
          persons: s.persons,
          nextId: s.nextId,
          rba: s.rba,
          signoff: s.signoff,
          versions: s.versions,
          overrideBand: s.overrideBand,
          completed: s.completed,
        };
      },

      restore: (snap) =>
        set((s) => ({
          ...snap,
          // A loaded record starts from its deterministic narrative; any prior
          // AI draft does not carry across assessments.
          aiNarrative: null,
          activity: [
            makeActivity(`Loaded assessment ${snap.admin.referenceNumber} from register.`),
            ...s.activity,
          ],
          ...saved(),
        })),
    }),
    {
      name: 'hawkeye-cdd',
      storage: createJSONStorage(() => localStorage),
      // Persist assessment data only — never the session gate/clock.
      partialize: (s) => ({
        admin: s.admin,
        entity: s.entity,
        sanctions: s.sanctions,
        adverse: s.adverse,
        pf: s.pf,
        persons: s.persons,
        nextId: s.nextId,
        rba: s.rba,
        signoff: s.signoff,
        versions: s.versions,
        activity: s.activity,
        overrideBand: s.overrideBand,
        completed: s.completed,
        lastSavedAt: s.lastSavedAt,
        aiNarrative: s.aiNarrative,
      }),
      onRehydrateStorage: () => (state) => {
        // Keep the activity id sequence ahead of any restored entries.
        if (state?.activity?.length) {
          activitySeq = Math.max(...state.activity.map((a) => a.id)) + 1;
        }
      },
    },
  ),
);
