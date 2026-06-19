/**
 * Static row labels and select option sets for the assessment form.
 *
 * The sanctions-list names and PF-factor labels below (including any references to
 * specific lists, resolutions or instruments) are configurable firm content,
 * originally transcribed from the design source. They are presented as the screening
 * checklist the analyst works through — the app does not itself perform screening or
 * verify that these references are current. Each firm should confirm the list/factor
 * set and the currency of every referenced source against official publications.
 */

export const SANCTIONS_LISTS: string[] = [
  'UAE Local Terrorist List (EOCN / Executive Office)',
  'UN Consolidated Sanctions List (UNSC)',
  'OFAC Specially Designated Nationals List (SDN)',
  'UK OFSI Consolidated Financial Sanctions List',
  'EU Consolidated Financial Sanctions List',
  'INTERPOL Red Notices (where applicable)',
];

export const ADVERSE_CATEGORIES: string[] = [
  'Criminal / Fraud Allegations',
  'Money Laundering',
  'Terrorist Financing or Proliferation Financing Links',
  'Regulatory Actions, Fines, or Investigations',
  'Negative Reputation or Commercial Disputes',
  'Political Controversy or PEP Connections',
  'Human Rights, Environmental, or Ethical Violations',
];

export const PF_FACTORS: string[] = [
  'DPMS Sector Inherent PF Exposure (NRA 2024)',
  'Jurisdictional Exposure - Counterparty or Transaction Origin',
  'Dual-Use Goods or Materials (Cabinet Resolution No. 156 of 2025)',
  'UN PF Sanctions List Match (UNSCR 1718/2231/1540)',
  'Unusual Trade Patterns or Transaction Volumes',
  'Links to Proliferation Networks or Controlled Technology',
];

/** Screening result options (sanctions + adverse media). */
export const RESULT_OPTIONS = ['Negative', 'Positive', 'Pending'] as const;
export type ResultValue = (typeof RESULT_OPTIONS)[number];

/** PF level options. */
export const LEVEL_OPTIONS = ['Low', 'Medium', 'High'] as const;
export type LevelValue = (typeof LEVEL_OPTIONS)[number];

/** RBA overall risk classification options. */
export const RBA_OPTIONS = ['Low Risk', 'Medium Risk', 'High Risk'] as const;
export type RbaValue = (typeof RBA_OPTIONS)[number];

export const CDD_LEVEL_OPTIONS = ['Standard CDD', 'Simplified CDD', 'Enhanced CDD'] as const;
export const DECISION_OPTIONS = ['Pending', 'Approved', 'Rejected'] as const;
export const PERSON_TYPE_OPTIONS = ['Individual', 'Corporate'] as const;
export const PROOF_OF_ADDRESS_OPTIONS = ['Provided', 'Pending'] as const;
export const PEP_STATUS_OPTIONS = ['Not PEP', 'PEP', 'Pending Review'] as const;
