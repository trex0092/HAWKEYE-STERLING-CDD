# Compliance & Data Notes

This file records what the Hawkeye Sterling CDD workstation **is** and **is not**,
so that nothing in the product is mistaken for legal advice or verified regulatory
fact.

## Tool positioning

This application is a **workstation that supports a human compliance reviewer**. It
helps an analyst record and structure a customer/counterparty due-diligence
assessment and produce a report from those inputs. It does **not**:

- perform live sanctions / PEP / adverse-media screening,
- make a legal or regulatory determination, or
- replace the judgement of the firm's compliance officer / MLRO.

The exported report records the analyst's inputs and carries a standing disclaimer
to that effect.

## Configurable firm policy (verify against official sources)

The following are **illustrative, configurable firm content** — not authoritative,
not sourced from any specific regulator, and not guaranteed to be current. Each firm
must review and maintain them against current official publications and its own risk
assessment before any real use:

- **Jurisdiction → risk-band map** (`src/data/countries.ts`, `RISK`). The band is the
  jurisdiction's _inherent_ risk input only. It does not, by itself, set the
  customer's overall risk rating or the required level of diligence. The current band
  assignments are retained as-is and have **not** yet been reconciled against an
  official source. Firm-selected reference sources to validate/maintain the map
  against:
  - FATF high-risk & monitored jurisdictions (official primary source):
    <https://www.fatf-gafi.org/en/countries.html>
  - EU list of high-risk third countries (official — consult the current
    consolidated EU Delegated Regulation list).
  - EU CAHRA — Conflict-Affected and High-Risk Areas (official indicative list).
  - KnowYourCountry country reports (third-party aggregator, not official):
    <https://www.knowyourcountry.com/country-reports/>
- **Sanctions-list checklist and PF-factor labels** (`src/data/labels.ts`), including
  any references to specific lists, resolutions or instruments.
- **Record-retention period.** The UI states the firm policy of "a maximum of 10
  years" alongside "and applicable regulatory requirements." Note that AML record
  retention is commonly framed as a _minimum_ period; confirm whether your obligation
  is a minimum or a maximum and adjust the wording in `Report.tsx` /
  `Section08Signoff.tsx` if needed.

## How the risk band is derived (explainability)

- The **base band (CDD / SDD / EDD)** is derived from the selected jurisdiction
  (`src/lib/risk.ts` → `deriveBand`), optionally raised/lowered by an analyst override.
- **Screening escalation (firm policy, enabled).** A confirmed **sanctions match**, a
  **positive adverse-media finding**, or an **identified PEP** (`screeningEscalation`)
  forces the **effective band up to EDD** and it cannot be shown lower while the hit
  stands — this overrides both the jurisdiction band and a lower analyst override. The
  whole right rail recolours to EDD and an on-screen **alert** explains the reason; the
  report shows a matching escalation note. "Pending" results do not escalate on their
  own. (Resolve a false positive by changing the screening result, not by override.)
- **Section 07 "Overall Risk (Analyst RBA)"** remains a separate, analyst-entered
  determination. The report labels the inputs distinctly ("Inherent Risk ·
  Jurisdiction-based" / "Escalated Risk · Screening hit" vs "Overall Risk (Analyst
  RBA)") so they are not conflated.

## Known limitations / items for human review

- **Band vs. screening (implemented).** A confirmed sanctions/adverse/PEP hit now
  auto-escalates the band to EDD with an alert. Confirm the escalation rule matches
  firm policy — in particular whether "Pending" results, or specific list types,
  should also escalate, and whether an analyst may ever downgrade below a confirmed
  hit (currently they cannot).
- **Access control.** The session lock is a **client-side passphrase gate** intended
  for a prototype; it is not backend-verified authentication. Point the
  `authenticate()` seam (`src/lib/auth.ts`) at a real backend before any non-demo
  deployment, and do not rely on the default development passphrase.
- **Persistence is local.** Assessments persist to `localStorage` only (no backend,
  no concurrency control, last-write-wins across tabs).
- **Evidence capture.** Document/evidence upload is not implemented; the form records
  status fields only.
- **Personal data.** Some person-level fields (e.g. gender, nationality) are collected
  for identity records; confirm collection is justified and minimised under the
  applicable data-protection law. None of these fields feed the risk band.

## Decisions applied (follow-up round)

These reflect the firm's instructions for this round:

| Item                             | Decision applied                                                                       | Notes / to revisit                                      |
| -------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Country risk map                 | Kept as-is; references = FATF, EU high-risk third countries, EU CAHRA, KnowYourCountry | Validate/adjust band assignments against those sources  |
| Records-retention period         | Stated as firm policy: a maximum of 10 years                                           | Confirm min vs max (AML retention is usually a minimum) |
| Sanctions/PEP/adverse hit → band | **Auto-escalate to EDD** with an on-screen alert + matching report note                | Confirm rule (Pending handling, downgrade policy)       |
| Screening coverage               | OFAC, UN, UK, EU, UAE (sanctions §03) + worldwide PEP (§05) + adverse media (§04)      | All already present; these drive the escalation rule    |
| GENDER field                     | Kept (recorded, never used in scoring)                                                 | Review under data-minimisation rules                    |
| Access control                   | Demo-only client-side passphrase                                                       | Add backend auth + change the passphrase                |
| Sanctions/PF labels              | Kept (real, standard list names)                                                       | Confirm they match your firm's list set                 |
| Backend persistence              | Not now (browser `localStorage` only)                                                  | Build if shared/durable records are needed              |
| Document/evidence upload         | Not now (status fields only)                                                           | Build if document capture is required                   |

## Firm to-do before real use

Checklist for the firm's compliance, legal, and operations owners (none of these can
be decided by the tool — they need firm-specific knowledge or qualified sign-off):

- [ ] **Validate the country risk map** (`src/data/countries.ts`) against the cited
      sources and your own risk assessment; correct the High/Medium lists as needed.
- [ ] **Confirm the records-retention period** with compliance/legal — in particular
      whether "10 years" should be a minimum (typical for AML) rather than the maximum
      currently shown — and adjust the UI text accordingly.
- [ ] **Confirm lawful basis and data minimisation** for the personal data collected
      (e.g. gender, nationality, passport, Emirates ID).
- [ ] **Confirm the screening-escalation rule** now implemented (a confirmed
      sanctions/adverse/PEP hit forces EDD and cannot be downgraded) matches firm
      policy, including how "Pending" results should be treated.
- [ ] **Replace the demo login**: change `VITE_SESSION_PASSPHRASE` and point the
      `authenticate()` seam at backend-verified auth (`VITE_AUTH_ENDPOINT`).
- [ ] **Manual smoke test**: fill a real assessment and export the PDF; confirm the
      placeholder / DRAFT / disclaimer behaviour reads correctly.
- [ ] **Run a browser accessibility + Lighthouse audit** (CI has a Lighthouse job).
- [ ] **Run secret/SAST scans** (gitleaks / semgrep) if used; CodeQL and
      Dependency-Review already run in CI.
