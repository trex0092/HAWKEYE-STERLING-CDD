# CDD Assessment — Questionnaire Format

Legend — **Type:** `text` · `date` · `select[…]` · `multi[…]` · `Y/N` · `Y/N/NA` · `repeat` (repeatable block)
Rule: every `Negative/Positive` or `Y/N` question with risk meaning has a conditional **↳ if … → details** follow-up.

---

## Section 1 — Customer Information
| # | Question | Type |
|---|----------|------|
| 1.1 | Company / Legal name | text |
| 1.2 | Legal form / entity type | select[FZE, FZC, LLC, Branch, Sole Est., Other] |
| 1.3 | Country of registration | select[country] |
| 1.4 | Date of registration | date |
| 1.5 | Nature of business / activity | text |
| 1.6 | Activity code (ISIC/NACE) | text |
| 1.7 | Registered address | text |
| 1.8 | Operating address (if different) | text |
| 1.9 | Website / email / phone | text |
| 1.10 | Tax Registration No. (TRN) | text |
| 1.11 | Regulator / supervisor | select[MOE, DMCC, Other] |
| 1.12 | **Commercial registers** | **repeat** → { Register no. `text`, Licence expiry `date` } |
| 1.13 | GoAML registration status | select[Registered, Not registered, N/A] |
| 1.14 | Source of funds (entity) | text |
| 1.15 | Source of wealth (entity) | text |
| 1.16 | Expected transaction volume / value | text |
| 1.17 | Expected cash usage | select[None, Occasional, Frequent] ↳ if not None → details |
| 1.18 | FATF grey-list status | select[Positive, Negative] ↳ if Positive → details |
| 1.19 | CAHRA exposure | select[Positive, Negative] ↳ if Positive → details |
| 1.20 | PEP status (entity) | select[Positive, Negative] ↳ if Positive → Annex 2 |

---

## Section 2 — Sanctions Screening
| # | Question | Type |
|---|----------|------|
| 2.0a | Screening tool used | text |
| 2.0b | Screened parties | multi[Entity, Shareholders, Directors, UBOs, Signatories] |
| 2.0c | Screening date | date |
| 2.1 | **Per list** (UAE EOCN, UNSC, OFAC SDN, UK OFSI, EU, INTERPOL) | **repeat** → { List `text`, Result `select[Positive, Negative]` ↳ if Positive → remarks, Date `date` } |

---

## Section 3 — Adverse Media Screening
| # | Question | Type |
|---|----------|------|
| 3.0 | Screening date | date |
| 3.1 | **Per category** (Criminal/Fraud, ML, TF/PF, Regulatory, Reputation, PEP, Human-rights/Environment) | **repeat** → { Category `text`, Finding `select[Positive, Negative]` ↳ if Positive → details/source } |

---

## Section 4 — Identifications  *(repeatable per individual / corporate)*
| # | Question | Type |
|---|----------|------|
| 4.1 | Designation | text |
| 4.2 | Name | text |
| 4.3 | Individual or corporate | select[Individual, Corporate] |
| 4.4 | Shares % | text |
| 4.5 | Is UBO? | Y/N ↳ if Y → basis of control select[Ownership ≥25%, Other means] |
| 4.6 | Authorized signatory? | Y/N |
| 4.7 | Nationality | select[country] |
| 4.8 | Country of residence / tax residency | select[country] |
| 4.9 | Place / date of birth | text / date |
| 4.10 | Passport / ID no. + expiry | text + date |
| 4.11 | Emirates ID + expiry | text + date |
| 4.12 | Proof of address | select[Utility bill, Tenancy, Bank letter, Other] |
| 4.13 | Source of wealth (individual) | text |
| 4.14 | Sanctions result | select[Positive, Negative] ↳ if Positive → details |
| 4.15 | Adverse-media result | select[Positive, Negative] ↳ if Positive → details |
| 4.16 | PEP result | select[Positive, Negative] ↳ if Positive → Annex 2 |

---

## Section 5 — Proliferation Financing (per factor)
| # | Question | Type |
|---|----------|------|
| 5.1 | **Per PF factor** (6 factors) | **repeat** → { Factor `text`, Risk level `select[Low, Medium, High]` ↳ if not Low → notes } |
| 5.2 | Overall PF conclusion | select[Low, Medium, High] + notes |

---

## Section 6 — Risk-Based Assessment
| # | Question | Type |
|---|----------|------|
| 6.1 | **Risk-scoring matrix** | **repeat** → { Factor `text`, Inherent `select[L/M/H]`, Mitigant `text`, Residual `select[L/M/H]` } |
| 6.2 | Overall classification *(derived from 6.1)* | select[Low, Medium, High] |
| 6.3 | CDD level required | select[Simplified, Standard, Enhanced] |
| 6.4 | Business relationship decision | select[Approved, Pending, Rejected] |
| 6.5 | Trigger events requiring review | multi[Licence expiry, Ownership change, Adverse hit, Threshold breach, Periodic review] |

---

## Section 7 — Sign-off
Prepared by `text` + role · Approved by `text` + role · Date `date`

## Section 8 — Version Control  *(repeatable)*
{ Ver `text`, Date `date`, Reviewed by `text`, Review type `select[Initial, Periodic, Trigger]`, Summary `text` }

---

## Annex 2 — Conditional modules *(each gated)*
| Module | Gate question | If applicable, asks… |
|--------|--------------|----------------------|
| PEP | Applicable? `Y/N/NA` | PEP type, name, current/former, country, SOF/SOW verified, sr-mgmt approval, EDD applied |
| EDD | Triggered? `Y/N/NA` | Triggered by, extra docs, site visit, approval, SOF/SOW, monitoring frequency, conclusion |
| Escalation & Reporting | Applicable? `Y/N/NA` | STR/SAR/DPMSR/Freeze/Partial-match filed (each Y/N/NA + GoAML ref), FIU notified |
| Supply Chain | Applicable? `Y/N/NA` | Material type, country of origin, CAHRA, sanctions, adverse media, LBMA/OECD sourcing check |
