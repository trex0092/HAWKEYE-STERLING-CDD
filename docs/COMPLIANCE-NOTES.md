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
  customer's overall risk rating or the required level of diligence.
- **Sanctions-list checklist and PF-factor labels** (`src/data/labels.ts`), including
  any references to specific lists, resolutions or instruments.
- **Record-retention period.** The UI no longer asserts a fixed number of years; it
  refers to "the firm's records-retention policy and applicable regulatory
  requirements." Configure the actual period per the applicable jurisdiction(s).

## How the risk band is derived (explainability)

- The right-rail/avatar/banner **band (CDD / SDD / EDD)** is derived **only** from the
  selected jurisdiction (`src/lib/risk.ts` → `deriveBand`), optionally overridden by an
  analyst override. Screening results (sanctions / PEP / adverse media / PF) and the
  Section 07 RBA selects do **not** feed this band.
- **Section 07 "Overall Risk (Analyst RBA)"** is a separate, analyst-entered
  determination. The report labels the two distinctly ("Inherent Risk ·
  Jurisdiction-based" vs "Overall Risk (Analyst RBA)") so they are not conflated.

## Known limitations / items for human review

- **Band vs. screening.** Because the band is jurisdiction-only, a low-risk
  jurisdiction with a positive sanctions/PEP hit is not automatically escalated by the
  tool. Whether to wire screening hits into band escalation is a firm/product decision.
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
