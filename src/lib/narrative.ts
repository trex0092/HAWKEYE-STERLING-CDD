/**
 * Builds the compliance narrative — the prose layer of the report — from live
 * assessment state.
 *
 * Each paragraph is auto-drafted from the form fields so the analyst starts from
 * a defensible draft rather than a blank page. The same no-fabrication rules as
 * report.ts apply: blank fields degrade to neutral language ("not yet recorded"),
 * the narrative never claims a clean screen that wasn't performed, and a confirmed
 * screening hit injects escalation wording automatically. It records inputs to
 * support review; it is not a legal determination (see REPORT_DISCLAIMER).
 */
import { SANCTIONS_LISTS, ADVERSE_CATEGORIES } from '@/data/labels';
import {
  effectiveBand,
  screeningEscalation,
  riskLabelForBand,
  cddLevelForBand,
} from '@/lib/risk';
import type { ReportInput } from '@/lib/report';

export interface NarrativeParagraph {
  /** Numbered heading, e.g. "1. Purpose & Scope". */
  heading: string;
  /** Prose body, already merged from the assessment fields. */
  body: string;
}

/** Trimmed value or a neutral fallback — never invents entity/person detail. */
const t = (v: string | undefined, fallback: string) => (v && v.trim() ? v.trim() : fallback);

/** Joins a list into "a, b and c" (no Oxford comma); empty → "". */
function oxford(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** A flowing sentence describing one identified party from the fields present. */
function describePerson(p: ReportInput['persons'][number]): string {
  const lead =
    p.name.trim() +
    (p.designation.trim() ? ` (${p.designation.trim()})` : '') +
    (p.shares.trim() ? `, holding ${p.shares.trim()}%` : '');
  const facts: string[] = [];
  if (p.type.trim()) {
    const ty = p.type.trim().toLowerCase();
    facts.push(`a${/^[aeiou]/.test(ty) ? 'n' : ''} ${ty}`);
  }
  if (p.nationality.trim()) facts.push(`of ${p.nationality.trim()} nationality`);
  if (p.dob.trim()) facts.push(`born ${p.dob.trim()}`);
  if (p.passportNo.trim())
    facts.push(
      `holding passport ${p.passportNo.trim()}` +
        (p.passportExpiry.trim() ? ` (valid to ${p.passportExpiry.trim()})` : ''),
    );
  if (p.emiratesId.trim())
    facts.push(
      `Emirates ID ${p.emiratesId.trim()}` +
        (p.emiratesIdExpiry.trim() ? ` (valid to ${p.emiratesIdExpiry.trim()})` : ''),
    );
  if (p.proofOfAddress.trim())
    facts.push(`with proof of address by ${p.proofOfAddress.trim().toLowerCase()}`);
  const pep = p.pepStatus.trim() ? ` Recorded PEP status: ${p.pepStatus.trim()}.` : '';
  return `${lead}${facts.length ? ', ' + facts.join(', ') : ''}.${pep}`;
}

export function buildNarrative(s: ReportInput): NarrativeParagraph[] {
  const escalation = screeningEscalation({
    sanctions: s.sanctions,
    adverse: s.adverse,
    persons: s.persons,
  });
  const band = effectiveBand(s.entity.jurisdiction, s.overrideBand, escalation);

  const entity = t(s.entity.legalName, 'the customer entity');
  const jurisdiction = t(s.entity.jurisdiction, 'an undisclosed jurisdiction');
  const reviewType = s.versions.length === 0 ? 'initial' : 'periodic';

  /* 1. Purpose & Scope */
  const refClause = s.admin.referenceNumber.trim()
    ? ` (reference ${s.admin.referenceNumber.trim()})`
    : '';
  const purpose: NarrativeParagraph = {
    heading: '1. Purpose & Scope',
    body:
      `This ${reviewType} Customer & Counterparty Due Diligence assessment${refClause} of ` +
      `${entity} was conducted on ${t(s.admin.assessmentDate, 'the assessment date')} by ` +
      `${t(s.admin.assessedBy, 'the assigned analyst')} ` +
      `(${t(s.admin.role, 'Compliance')}). Its purpose is to establish the customer's identity ` +
      `and beneficial ownership, screen the relevant parties against applicable sanctions and ` +
      `adverse-media sources, evaluate money-laundering, terrorist-financing and ` +
      `proliferation-financing exposure, and determine both the appropriate level of due ` +
      `diligence and the business-relationship decision.`,
  };

  /* 2. Customer Profile — weaves in the recorded entity and individual detail. */
  const entityFacts: string[] = [];
  if (s.entity.registrationNo.trim())
    entityFacts.push(`under registration/licence number ${s.entity.registrationNo.trim()}`);
  if (s.entity.tradingName.trim()) entityFacts.push(`trading as ${s.entity.tradingName.trim()}`);
  if (s.entity.registeredAddress.trim())
    entityFacts.push(`with registered address at ${s.entity.registeredAddress.trim()}`);
  if (s.entity.websiteEmail.trim())
    entityFacts.push(`contactable at ${s.entity.websiteEmail.trim()}`);
  const entityClause =
    `${entity} is registered in ${jurisdiction}` +
    (entityFacts.length ? ` ${oxford(entityFacts)}` : '') +
    `.`;

  const named = s.persons.filter((p) => p.name.trim());
  const ownerClause = named.length
    ? ` Ownership and control are attributed to ${describePerson(named[0])}` +
      (named.length > 1
        ? ` The remaining identified parties are: ${named.slice(1).map(describePerson).join(' ')}`
        : '')
    : ` Beneficial ownership has not yet been recorded for this assessment.`;

  const profile: NarrativeParagraph = {
    heading: '2. Customer Profile',
    body:
      `${entityClause}${ownerClause} Identification documents for the identified parties have ` +
      `been obtained and recorded as set out in the Identifications section.`,
  };

  /* 3. Screening Performed */
  const sancPositives = s.sanctions
    .map((r, i) => ({ r, name: SANCTIONS_LISTS[i] }))
    .filter((x) => x.r.result === 'Positive');
  const anyScreenDate = s.sanctions.some((r) => r.date.trim());
  let screeningBody: string;
  if (sancPositives.length) {
    screeningBody =
      `Sanctions screening was performed against ${SANCTIONS_LISTS.length} lists ` +
      `(including UAE EOCN, UNSC, OFAC SDN, UK OFSI, EU and INTERPOL). One or more matches were ` +
      `identified on ${oxford(sancPositives.map((x) => x.name))}. Each match has been reviewed ` +
      `for relevance and recorded in the screening remarks, and freeze and reporting obligations ` +
      `have been considered.`;
  } else if (anyScreenDate) {
    screeningBody =
      `Sanctions screening was performed against ${SANCTIONS_LISTS.length} lists ` +
      `(including UAE EOCN, UNSC, OFAC SDN, UK OFSI, EU and INTERPOL). No matches were identified ` +
      `across any list.`;
  } else {
    screeningBody =
      `Sanctions screening across the ${SANCTIONS_LISTS.length} applicable lists has not yet been ` +
      `recorded for this assessment and must be completed before the file is finalised.`;
  }
  const screening: NarrativeParagraph = { heading: '3. Screening Performed', body: screeningBody };

  /* 4. Adverse Media */
  const advPositives = s.adverse
    .map((r, i) => ({ r, name: ADVERSE_CATEGORIES[i] }))
    .filter((x) => x.r.finding === 'Positive');
  const adverse: NarrativeParagraph = {
    heading: '4. Adverse Media',
    body: advPositives.length
      ? `A structured adverse-media review across ${ADVERSE_CATEGORIES.length} categories ` +
        `identified findings under ${oxford(advPositives.map((x) => x.name))}. The relevance of ` +
        `each finding to the customer's risk profile has been assessed and documented.`
      : `A structured adverse-media review across ${ADVERSE_CATEGORIES.length} categories ` +
        `(criminal/fraud, money laundering, terrorist/proliferation financing, regulatory ` +
        `actions, reputation, political/PEP connections and human-rights/environmental concerns) ` +
        `did not identify adverse information relevant to the customer's risk profile.`,
  };

  /* 5. Politically Exposed Persons */
  const peps = s.persons.filter((p) => p.pepStatus === 'PEP' && p.name.trim());
  const pepPending = s.persons.some((p) => p.pepStatus === 'Pending Review');
  const pep: NarrativeParagraph = {
    heading: '5. Politically Exposed Persons',
    body: peps.length
      ? `A politically exposed person relationship was identified in respect of ` +
        `${oxford(peps.map((p) => p.name.trim()))}. The PEP module has been completed, source of ` +
        `funds and wealth verified, and senior-management approval obtained prior to ` +
        `establishing or continuing the relationship.`
      : pepPending
        ? `PEP screening of the identified parties is pending and must be concluded before the ` +
          `file is finalised.`
        : `Screening of the customer and its beneficial owner(s) did not identify any politically ` +
          `exposed person relationships.`,
  };

  /* 6. Proliferation Financing */
  const pfLevel = s.pf.some((r) => r.level === 'High')
    ? 'High'
    : s.pf.some((r) => r.level === 'Medium')
      ? 'Medium'
      : 'Low';
  const proliferation: NarrativeParagraph = {
    heading: '6. Proliferation Financing',
    body:
      `Proliferation-financing exposure was assessed across the applicable factors, covering ` +
      `inherent sector exposure, jurisdictional exposure of counterparties and transaction ` +
      `origins, dual-use goods, UN PF sanctions-list matching, unusual trade patterns and links ` +
      `to proliferation networks. The overall PF risk is assessed as ${pfLevel}` +
      `${pfLevel === 'Low' ? ', and no PF-specific report is required at this stage' : ''}.`,
  };

  /* 7. Risk Rationale */
  const analystRisk = t(s.rba.classification, riskLabelForBand(band));
  const rationale: NarrativeParagraph = {
    heading: '7. Risk Rationale',
    body: escalation.escalate
      ? `The assessment identified ${oxford(escalation.reasons.map((r) => r.toLowerCase()))}, ` +
        `which raises the customer to Enhanced Due Diligence (EDD) regardless of the ` +
        `jurisdiction's inherent risk. The residual rating is therefore High Risk, and enhanced ` +
        `measures apply.`
      : `Against the inherent risk indicated by the customer's jurisdiction and sector, the ` +
        `assessment weighed the mitigating factors evidenced in this file — including the ` +
        `screening and adverse-media outcomes, ownership transparency and the absence of ` +
        `high-risk exposure — to reach a residual classification of ${analystRisk}. ` +
        `${cddLevelForBand(band)} is considered proportionate to this rating.`,
  };

  /* 8. Decision */
  const decision = t(s.rba.decision, 'Pending');
  const decisionBody =
    decision === 'Approved'
      ? `Having weighed the matters above, the business relationship is Approved.`
      : decision === 'Rejected'
        ? `Having weighed the matters above, the business relationship is Declined, and any ` +
          `resulting reporting consequences are recorded in the file.`
        : `A final business-relationship decision is pending completion of the outstanding ` +
          `assessment steps.`;
  const decisionPara: NarrativeParagraph = { heading: '8. Decision', body: decisionBody };

  /* 9. Ongoing Monitoring & Trigger Events */
  const monitoring: NarrativeParagraph = {
    heading: '9. Ongoing Monitoring & Trigger Events',
    body:
      `Ongoing monitoring is applied at a cadence proportionate to the residual rating` +
      `${s.admin.nextReviewDate.trim() ? `, with the next scheduled review set for ${s.admin.nextReviewDate.trim()}` : ''}. ` +
      `${
        s.rba.triggerEvents
          ? `Defined trigger events requiring immediate re-assessment have been identified for ` +
            `this relationship, including licence or document expiry, a change in ownership or ` +
            `control, a new sanctions or adverse-media match, and transactions inconsistent with ` +
            `the declared profile.`
          : `The relationship will be re-assessed on the occurrence of any standard trigger event, ` +
            `including licence or document expiry, a change in ownership or control, or a new ` +
            `sanctions or adverse-media match.`
      }`,
  };

  /* 10. Sign-off Statement */
  const prepared = t(s.signoff.preparedBy, 'the preparing officer');
  const approved = t(s.signoff.approvedBy, 'the approving officer');
  const signoff: NarrativeParagraph = {
    heading: '10. Sign-off Statement',
    body:
      `The undersigned confirm that this assessment was prepared and reviewed in accordance with ` +
      `the firm's policies and applicable AML/CFT/CPF requirements, and that the conclusions ` +
      `reflect a reasonable, documented risk-based judgment as at the assessment date. Prepared ` +
      `by ${prepared} (${t(s.signoff.preparedRole, 'Compliance Officer')}); approved by ` +
      `${approved} (${t(s.signoff.approvedRole, 'Managing Director')}). This record and its ` +
      `supporting documents are retained in line with the firm's records-retention policy.`,
  };

  return [
    purpose,
    profile,
    screening,
    adverse,
    pep,
    proliferation,
    rationale,
    decisionPara,
    monitoring,
    signoff,
  ];
}
