/**
 * Central assessment store (Zustand).
 *
 * Holds the whole assessment as controlled state plus the session gate/clock.
 * Band, risk score, palette and the report banner are *derived* from
 * `entity.jurisdiction` (see lib/risk.ts) — never stored.
 */
import { create } from 'zustand';
import {
  SANCTIONS_LISTS,
  ADVERSE_CATEGORIES,
  PF_FACTORS,
  type ResultValue,
  type LevelValue,
  type RbaValue,
} from '@/data/labels';
import { SESSION_DURATION_SECONDS } from '@/lib/auth';

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
  gender: string;
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

function blankPerson(id: number): Person {
  return {
    id,
    designation: '',
    name: '',
    shares: '',
    type: 'Individual',
    nationality: '',
    gender: '',
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
  return {
    referenceNumber: 'RA-20260617-017',
    assessmentDate: '17/06/2026',
    nextReviewDate: '17/06/2027',
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

export interface AssessmentState {
  // session
  locked: boolean;
  remaining: number;
  now: Date;

  // assessment
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
}

export const useAssessment = create<AssessmentState>((set) => ({
  // session
  locked: true,
  remaining: SESSION_DURATION_SECONDS,
  now: new Date(),

  // assessment
  admin: freshAdmin(),
  entity: freshEntity(),
  sanctions: freshSanctions(),
  adverse: freshAdverse(),
  pf: freshPf(),
  persons: [blankPerson(1)],
  nextId: 2,
  rba: freshRba(),
  signoff: {
    preparedBy: '',
    preparedRole: 'Compliance Officer',
    approvedBy: '',
    approvedRole: 'Managing Director',
  },
  versions: [],

  // session actions
  tick: () =>
    set((s) => {
      const r = s.remaining > 0 ? s.remaining - 1 : 0;
      return { now: new Date(), remaining: r, locked: r === 0 ? true : s.locked };
    }),
  unlock: () => set({ locked: false, remaining: SESSION_DURATION_SECONDS }),
  lock: () => set({ locked: true, remaining: 0 }),

  // assessment actions
  setAdmin: (patch) => set((s) => ({ admin: { ...s.admin, ...patch } })),
  setEntity: (patch) => set((s) => ({ entity: { ...s.entity, ...patch } })),
  setJurisdiction: (jurisdiction) =>
    set((s) => ({ entity: { ...s.entity, jurisdiction } })),
  setSanction: (i, patch) =>
    set((s) => {
      const sanctions = s.sanctions.slice();
      sanctions[i] = { ...sanctions[i], ...patch };
      return { sanctions };
    }),
  setAdverse: (i, patch) =>
    set((s) => {
      const adverse = s.adverse.slice();
      adverse[i] = { ...adverse[i], ...patch };
      return { adverse };
    }),
  setPf: (i, patch) =>
    set((s) => {
      const pf = s.pf.slice();
      pf[i] = { ...pf[i], ...patch };
      return { pf };
    }),
  addPerson: () =>
    set((s) => ({ persons: [...s.persons, blankPerson(s.nextId)], nextId: s.nextId + 1 })),
  removePerson: (id) => set((s) => ({ persons: s.persons.filter((p) => p.id !== id) })),
  setPerson: (id, patch) =>
    set((s) => ({
      persons: s.persons.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })),
  setRba: (patch) => set((s) => ({ rba: { ...s.rba, ...patch } })),
  setSignoff: (patch) => set((s) => ({ signoff: { ...s.signoff, ...patch } })),

  // RESET — clean screening/risk defaults; keeps entity identity + sign-off.
  reset: () =>
    set({
      entity: freshEntity(),
      sanctions: freshSanctions(),
      adverse: freshAdverse(),
      pf: freshPf(),
      persons: [blankPerson(1)],
      nextId: 2,
      rba: freshRba(),
    }),
}));
