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
import { type User, type Role, findUser } from '@/lib/security/identity';
import { setTelemetrySink, record } from '@/lib/governance/telemetry';
import { authorizeAction } from '@/lib/governance/policy';
import { createEncryptedStorage, clearSessionKey } from '@/lib/security/crypto';
import { eraseLocalData, buildDataExport } from '@/lib/governance/gdpr';
import {
  hashEntry,
  verifyChain,
  type ChainVerification,
  type ChainableEntry,
} from '@/lib/governance/auditChain';

/**
 * Default session identity for the unscoped prototype: with no SSO/IdP configured
 * the single operator runs as administrator, preserving full access exactly as
 * before. A real deployment resolves a narrower role at unlock (see sso.ts), and
 * RBAC/ABAC (lib/governance/policy.ts) then restrict accordingly.
 */
const DEFAULT_USER: User = findUser('admin') ?? { id: 'admin', name: 'Operator', role: 'admin' };

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
  /** Tamper-evident chain hash (SHA-256), set by sealAuditLog(). */
  hash?: string;
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
  /** Resolved session identity (IAM). Null while locked; set at unlock. */
  currentUser: User | null;

  /** GDPR lawful-basis/consent flag — required before any AI processing. */
  consent: boolean;

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
  unlock: (user?: User) => void;
  lock: () => void;
  currentRole: () => Role;

  // governance actions
  setConsent: (value: boolean) => void;
  eraseAll: () => void;
  exportData: () => string;
  sealAuditLog: () => Promise<void>;
  verifyAuditLog: () => Promise<ChainVerification>;

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

/**
 * Wire structured telemetry (lib/governance/telemetry.ts) to the same best-effort
 * backend audit sink. This lights up MON / PERF / USAGE / DRIFT / ANOM without any
 * new integration — the in-memory ring is the source, the optional endpoint a mirror.
 */
setTelemetrySink((event) => {
  const endpoint = import.meta.env.VITE_AUDIT_ENDPOINT;
  if (!endpoint || typeof fetch === 'undefined') return;
  void fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'telemetry', ...event }),
    keepalive: true,
  }).catch(() => {
    /* telemetry mirror is best-effort */
  });
});

export const useAssessment = create<AssessmentState>()(
  persist(
    (set, get) => ({
      // session
      locked: true,
      remaining: SESSION_DURATION_SECONDS,
      currentUser: null,
      consent: false,

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
      unlock: (user) => {
        const resolved = user ?? DEFAULT_USER;
        record({
          actor: resolved.id,
          role: resolved.role,
          action: 'session-unlock',
          outcome: 'ok',
        });
        set({ locked: false, remaining: SESSION_DURATION_SECONDS, currentUser: resolved });
      },
      lock: () => {
        // ZTA: drop the session identity and the at-rest encryption key on lock.
        clearSessionKey();
        record({
          actor: get().currentUser?.id ?? 'anonymous',
          action: 'session-lock',
          outcome: 'ok',
        });
        set({ locked: true, remaining: 0, currentUser: null });
      },
      currentRole: () => get().currentUser?.role ?? DEFAULT_USER.role,

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
      acceptAiNarrative: (text, model) => {
        const user = get().currentUser ?? DEFAULT_USER;
        if (
          !authorizeAction(
            { action: 'ai-accept', permission: 'ai:accept' },
            { user, sessionActive: true },
          ).allow
        ) {
          set((s) => ({
            activity: [makeActivity(`AI accept denied for role ${user.role}.`), ...s.activity],
          }));
          return;
        }
        record({
          actor: get().currentUser?.id ?? 'analyst',
          role: get().currentUser?.role,
          action: 'ai-accept',
          outcome: 'ok',
          ai: { model, accepted: true },
        });
        set((s) => ({
          aiNarrative: { text, model, acceptedAt: Date.now() },
          activity: [
            makeActivity(`AI-assisted narrative accepted (${model}) — analyst reviewed.`),
            ...s.activity,
          ],
          ...saved(),
        }));
      },

      clearAiNarrative: () =>
        set((s) => ({
          aiNarrative: null,
          activity: [
            makeActivity('AI-assisted narrative removed — reverted to deterministic narrative.'),
            ...s.activity,
          ],
          ...saved(),
        })),

      setOverrideBand: (band) => {
        const user = get().currentUser ?? DEFAULT_USER;
        if (
          !authorizeAction(
            { action: 'band-override', permission: 'band:override' },
            { user, sessionActive: true },
          ).allow
        ) {
          set((s) => ({
            activity: [makeActivity(`Band override denied for role ${user.role}.`), ...s.activity],
          }));
          return;
        }
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
        }));
      },

      completeAssessment: () =>
        set((s) => {
          const user = s.currentUser ?? DEFAULT_USER;
          if (
            !authorizeAction(
              { action: 'assessment-complete', permission: 'assessment:complete' },
              { user, sessionActive: true, resource: { incomplete: false } },
            ).allow
          ) {
            return {
              activity: [makeActivity(`Complete denied for role ${user.role}.`), ...s.activity],
            };
          }
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
          const user = s.currentUser ?? DEFAULT_USER;
          if (
            !authorizeAction(
              { action: 'reassess', permission: 'assessment:edit' },
              { user, sessionActive: true },
            ).allow
          ) {
            return {
              activity: [makeActivity(`Re-assess denied for role ${user.role}.`), ...s.activity],
            };
          }
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

      setConsent: (value) =>
        set((s) => ({
          consent: value,
          activity: [
            makeActivity(
              value
                ? 'GDPR consent / lawful basis recorded for AI processing.'
                : 'GDPR consent withdrawn — AI processing blocked.',
            ),
            ...s.activity,
          ],
          ...saved(),
        })),

      // GDPR right to erasure — zero-trust gated to a data:erase holder.
      eraseAll: () => {
        const user = get().currentUser ?? DEFAULT_USER;
        const decision = authorizeAction(
          { action: 'data-erase', permission: 'data:erase' },
          { user, sessionActive: !get().locked },
        );
        if (!decision.allow) {
          set((s) => ({
            activity: [makeActivity(`Erase denied: ${decision.reason}.`), ...s.activity],
          }));
          return;
        }
        eraseLocalData();
        set({
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
          overrideBand: null,
          completed: false,
          aiNarrative: null,
          consent: false,
          activity: [makeActivity('All local data erased (GDPR right to erasure).')],
          ...saved(),
        });
      },

      // GDPR data portability — zero-trust gated to a data:export holder.
      exportData: () => {
        const user = get().currentUser ?? DEFAULT_USER;
        const decision = authorizeAction(
          { action: 'data-export', permission: 'data:export' },
          { user, sessionActive: !get().locked },
        );
        if (!decision.allow) return JSON.stringify({ error: decision.reason });
        return buildDataExport();
      },

      // AUDIT/TRACE: seal the activity log into a tamper-evident SHA-256 chain.
      sealAuditLog: async () => {
        const ordered = [...get().activity].reverse(); // oldest → newest
        let prev = '';
        for (const e of ordered) {
          e.hash = await hashEntry({ id: e.id, ts: e.ts, message: e.message }, prev);
          prev = e.hash;
        }
        set((s) => ({ activity: [...s.activity], ...saved() }));
      },

      verifyAuditLog: async () => {
        const ordered: ChainableEntry[] = [...get().activity].reverse();
        return verifyChain(ordered);
      },

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
      // ENC: at-rest encryption via the Web-Crypto storage adapter. Transparent
      // before unlock (plaintext passthrough + legacy migration), AES-GCM once the
      // session key is installed at unlock — see src/lib/security/crypto.ts.
      storage: createJSONStorage(() => createEncryptedStorage()),
      // Persist assessment data only — never the session gate/clock/identity.
      partialize: (s) => ({
        consent: s.consent,
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

/**
 * AUDIT/TRACE: auto-seal the activity log. Whenever new entries appear, chain-hash
 * any unsealed ones (SHA-256) so tamper-evidence is automatic, not button-only.
 * Guarded against its own write (sealing flips the flag) so it cannot loop.
 */
let sealing = false;
useAssessment.subscribe((state, prev) => {
  if (state.activity === prev.activity || sealing) return;
  if (!state.activity.some((e) => e.hash === undefined)) return;
  sealing = true;
  void Promise.resolve()
    .then(() => state.sealAuditLog())
    .finally(() => {
      sealing = false;
    });
});
