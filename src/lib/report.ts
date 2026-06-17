/**
 * Builds the CDD Assessment Report view-model from live assessment state.
 *
 * The banner + required diligence are band-driven (jurisdiction → band, per the
 * spec). Section 07 mirrors the analyst's RBA selects. Descriptive fields fall
 * back to the design's sample values when blank so the export always reads as a
 * complete document.
 */
import type { AssessmentState } from '@/store/useAssessment';
import { SANCTIONS_LISTS, ADVERSE_CATEGORIES, PF_FACTORS } from '@/data/labels';
import {
  paletteForBand,
  reportPalette,
  riskLabelForBand,
  effectiveBand,
  type RiskBand,
} from '@/lib/risk';

/* Light-mode status colours (report palette). */
function lightResult(v: string): string {
  return v === 'Positive' ? '#c0392b' : v === 'Pending' ? '#b8860b' : '#1f9d57';
}
function lightLevel(v: string): string {
  return v === 'High' ? '#c0392b' : v === 'Medium' ? '#b8860b' : '#1f9d57';
}
function lightRisk(v: string): string {
  return v === 'High Risk' ? '#c0392b' : v === 'Medium Risk' ? '#b8860b' : '#1f9d57';
}
/* Decision colour follows the decision itself (not the risk band). */
function lightDecision(v: string): string {
  return v === 'Rejected' ? '#c0392b' : v === 'Pending' ? '#b8860b' : '#1f9d57';
}

const or = (value: string, fallback: string) => (value.trim() ? value.trim() : fallback);

export interface KeyValue {
  k: string;
  v: string;
}

export interface ReportModel {
  band: RiskBand;
  bandColor: string;
  bandBorder: string;
  bandBg: string;
  ref: string;
  date: string;
  bannerRiskLabel: string;
  cddLabel: string;
  bannerDecision: string;
  bannerDecisionColor: string;
  admin: KeyValue[];
  entity: KeyValue[];
  sanctions: { list: string; result: string; resultColor: string; date: string }[];
  adverse: { cat: string; find: string; findColor: string }[];
  person: KeyValue[];
  pf: { factor: string; level: string; levelColor: string }[];
  rbaOverall: string;
  rbaOverallColor: string;
  cddLevelName: string;
  decision: string;
  decisionColor: string;
  versions: { ver: string; date: string; by: string; type: string; summary: string }[];
}

const SAMPLE_DATE = '17/06/2026';

const SAMPLE_VERSIONS = [
  {
    ver: '01',
    date: '29/09/2022',
    by: 'Compliance Department',
    type: 'Initial',
    summary: 'Account opening',
  },
  {
    ver: '02',
    date: '10/01/2025',
    by: 'Compliance Department',
    type: 'Periodic',
    summary: 'KYC refresh',
  },
  {
    ver: '03',
    date: '17/06/2026',
    by: 'Compliance Department',
    type: 'Periodic',
    summary: 'Periodic KYC review',
  },
];

/** Just the assessment data the report reads — lets callers subscribe narrowly. */
export type ReportInput = Pick<
  AssessmentState,
  | 'admin'
  | 'entity'
  | 'sanctions'
  | 'adverse'
  | 'pf'
  | 'persons'
  | 'rba'
  | 'versions'
  | 'overrideBand'
>;

export function buildReportModel(s: ReportInput): ReportModel {
  const band = effectiveBand(s.entity.jurisdiction, s.overrideBand);
  const pal = paletteForBand(band);
  const rPal = reportPalette(band);
  const p0 = s.persons[0];

  return {
    band,
    bandColor: rPal.color,
    bandBorder: rPal.border,
    bandBg: rPal.bg,
    ref: or(s.admin.referenceNumber, 'RA-20260617-017'),
    date: or(s.admin.assessmentDate, SAMPLE_DATE),
    bannerRiskLabel: riskLabelForBand(band),
    cddLabel: pal.label,
    bannerDecision: or(s.rba.decision, 'Approved'),
    bannerDecisionColor: lightDecision(or(s.rba.decision, 'Approved')),

    admin: [
      { k: 'REFERENCE NUMBER', v: or(s.admin.referenceNumber, 'RA-20260617-017') },
      { k: 'ASSESSMENT DATE', v: or(s.admin.assessmentDate, SAMPLE_DATE) },
      { k: 'NEXT REVIEW DATE', v: or(s.admin.nextReviewDate, '17/06/2027') },
      { k: 'ASSESSED BY', v: or(s.admin.assessedBy, 'Compliance Department') },
      { k: 'ROLE / DEPARTMENT', v: or(s.admin.role, 'Compliance Officer') },
      { k: 'REVIEW TYPE', v: 'Periodic' },
    ],
    entity: [
      { k: 'LEGAL ENTITY NAME', v: or(s.entity.legalName, 'Meridian Bullion Trading DMCC') },
      { k: 'JURISDICTION', v: or(s.entity.jurisdiction, 'United Arab Emirates') },
      { k: 'TRADING NAME', v: or(s.entity.tradingName, 'Meridian Bullion') },
      { k: 'REGISTRATION / LICENCE NO.', v: or(s.entity.registrationNo, 'DMCC-184220') },
      {
        k: 'REGISTERED ADDRESS',
        v: or(s.entity.registeredAddress, 'Unit 3204, JBC 2, JLT, Dubai, UAE'),
      },
      { k: 'WEBSITE / EMAIL', v: or(s.entity.websiteEmail, 'compliance@meridianbullion.ae') },
    ],
    sanctions: SANCTIONS_LISTS.map((list, i) => {
      const row = s.sanctions[i];
      return {
        list,
        result: row.result,
        resultColor: lightResult(row.result),
        date: or(row.date, SAMPLE_DATE),
      };
    }),
    adverse: ADVERSE_CATEGORIES.map((cat, i) => {
      const row = s.adverse[i];
      return { cat, find: row.finding, findColor: lightResult(row.finding) };
    }),
    person: [
      { k: 'DESIGNATION', v: or(p0?.designation ?? '', 'Shareholder & Director') },
      { k: 'NAME', v: or(p0?.name ?? '', 'Layla Haddad') },
      { k: 'SHARES %', v: or(p0?.shares ?? '', '100') },
      { k: 'TYPE', v: or(p0?.type ?? '', 'Individual') },
      { k: 'NATIONALITY', v: or(p0?.nationality ?? '', 'Lebanon') },
      { k: 'DATE OF BIRTH', v: or(p0?.dob ?? '', '14/03/1981') },
      { k: 'PASSPORT EXPIRY', v: or(p0?.passportExpiry ?? '', '22/08/2031') },
      { k: 'PROOF OF ADDRESS', v: or(p0?.proofOfAddress ?? '', 'Provided') },
    ],
    pf: PF_FACTORS.map((factor, i) => {
      const row = s.pf[i];
      return { factor, level: row.level, levelColor: lightLevel(row.level) };
    }),
    rbaOverall: s.rba.classification,
    rbaOverallColor: lightRisk(s.rba.classification),
    cddLevelName: s.rba.cddLevel,
    decision: or(s.rba.decision, 'Approved'),
    decisionColor: lightDecision(or(s.rba.decision, 'Approved')),
    versions: s.versions.length > 0 ? s.versions : SAMPLE_VERSIONS,
  };
}
