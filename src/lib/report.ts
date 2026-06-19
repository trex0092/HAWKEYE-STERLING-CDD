/**
 * Builds the CDD Assessment Report view-model from live assessment state.
 *
 * The banner shows the jurisdiction-derived *inherent* risk band (jurisdiction →
 * band; see lib/risk.ts) — it is NOT affected by the screening sections. Section
 * 07 mirrors the analyst's own risk-based assessment (RBA) selects, which is a
 * separate, analyst-driven determination.
 *
 * Blank fields render as a neutral placeholder ("—") rather than invented sample
 * data: a compliance export must never present fabricated entity/person details
 * or a default "Approved" decision. When required fields are missing the model
 * flags `incomplete` so the report can be marked as a draft, and it always
 * carries a `disclaimer` clarifying the report records analyst inputs and is not
 * a legal determination.
 */
import type { AssessmentState } from '@/store/useAssessment';
import { SANCTIONS_LISTS, ADVERSE_CATEGORIES, PF_FACTORS } from '@/data/labels';
import {
  paletteForBand,
  reportPalette,
  riskLabelForBand,
  effectiveBand,
  screeningEscalation,
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

/** Neutral placeholder for any blank field in the export (never invented data). */
export const BLANK = '—';

/** Standing disclaimer printed on the report — the tool supports, never replaces, judgment. */
export const REPORT_DISCLAIMER =
  "This report records the analyst's assessment inputs to support compliance review. " +
  'It is not a legal determination of compliance and does not replace the judgment of the ' +
  'named compliance officer(s). Risk bands, jurisdiction risk, retention periods and ' +
  'regulatory references reflect configurable firm policy and must be verified against ' +
  'current official sources.';

const or = (value: string, fallback: string = BLANK) => (value.trim() ? value.trim() : fallback);

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
  preparedBy: string;
  approvedBy: string;
  /** True when a required field (ref, legal name, assessed-by, first person, sign-off) is blank. */
  incomplete: boolean;
  /** True when a screening hit (sanctions/adverse/PEP) raised the band to EDD. */
  escalated: boolean;
  escalationReasons: string[];
  disclaimer: string;
}

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
  | 'signoff'
  | 'versions'
  | 'overrideBand'
>;

export function buildReportModel(s: ReportInput): ReportModel {
  const escalation = screeningEscalation({
    sanctions: s.sanctions,
    adverse: s.adverse,
    persons: s.persons,
  });
  const band = effectiveBand(s.entity.jurisdiction, s.overrideBand, escalation);
  const pal = paletteForBand(band);
  const rPal = reportPalette(band);
  const p0 = s.persons[0];

  // A blank decision renders as "Pending" (amber) — never a default "Approved".
  const decision = or(s.rba.decision, 'Pending');

  const required = [
    s.admin.referenceNumber,
    s.entity.legalName,
    s.admin.assessedBy,
    p0?.name ?? '',
    s.signoff.preparedBy,
    s.signoff.approvedBy,
  ];
  const incomplete = required.some((v) => !v.trim());

  return {
    band,
    bandColor: rPal.color,
    bandBorder: rPal.border,
    bandBg: rPal.bg,
    ref: or(s.admin.referenceNumber),
    date: or(s.admin.assessmentDate),
    bannerRiskLabel: riskLabelForBand(band),
    cddLabel: pal.label,
    bannerDecision: decision,
    bannerDecisionColor: lightDecision(decision),

    admin: [
      { k: 'REFERENCE NUMBER', v: or(s.admin.referenceNumber) },
      { k: 'ASSESSMENT DATE', v: or(s.admin.assessmentDate) },
      { k: 'NEXT REVIEW DATE', v: or(s.admin.nextReviewDate) },
      { k: 'ASSESSED BY', v: or(s.admin.assessedBy) },
      { k: 'ROLE / DEPARTMENT', v: or(s.admin.role) },
      { k: 'REVIEW TYPE', v: s.versions.length === 0 ? 'Initial' : 'Periodic' },
    ],
    entity: [
      { k: 'LEGAL ENTITY NAME', v: or(s.entity.legalName) },
      { k: 'JURISDICTION', v: or(s.entity.jurisdiction) },
      { k: 'TRADING NAME', v: or(s.entity.tradingName) },
      { k: 'REGISTRATION / LICENCE NO.', v: or(s.entity.registrationNo) },
      { k: 'REGISTERED ADDRESS', v: or(s.entity.registeredAddress) },
      { k: 'WEBSITE / EMAIL', v: or(s.entity.websiteEmail) },
    ],
    sanctions: SANCTIONS_LISTS.map((list, i) => {
      const row = s.sanctions[i];
      // A missing row reads as "Pending" (not yet screened) — never "Negative",
      // which would falsely imply a completed, clear screen.
      const result = row?.result ?? 'Pending';
      return {
        list,
        result,
        resultColor: lightResult(result),
        date: or(row?.date ?? ''),
      };
    }),
    adverse: ADVERSE_CATEGORIES.map((cat, i) => {
      const finding = s.adverse[i]?.finding ?? 'Pending';
      return { cat, find: finding, findColor: lightResult(finding) };
    }),
    person: [
      { k: 'DESIGNATION', v: or(p0?.designation ?? '') },
      { k: 'NAME', v: or(p0?.name ?? '') },
      { k: 'SHARES %', v: or(p0?.shares ?? '') },
      { k: 'TYPE', v: or(p0?.type ?? '') },
      { k: 'NATIONALITY', v: or(p0?.nationality ?? '') },
      { k: 'DATE OF BIRTH', v: or(p0?.dob ?? '') },
      { k: 'PASSPORT EXPIRY', v: or(p0?.passportExpiry ?? '') },
      { k: 'PROOF OF ADDRESS', v: or(p0?.proofOfAddress ?? '') },
    ],
    pf: PF_FACTORS.map((factor, i) => {
      const level = s.pf[i]?.level ?? 'Low';
      return { factor, level, levelColor: lightLevel(level) };
    }),
    rbaOverall: s.rba.classification,
    rbaOverallColor: lightRisk(s.rba.classification),
    cddLevelName: s.rba.cddLevel,
    decision,
    decisionColor: lightDecision(decision),
    versions: s.versions,
    preparedBy: or(s.signoff.preparedBy),
    approvedBy: or(s.signoff.approvedBy),
    incomplete,
    escalated: escalation.escalate,
    escalationReasons: escalation.reasons,
    disclaimer: REPORT_DISCLAIMER,
  };
}
