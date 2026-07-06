# Project Governance

This document describes how **Hawkeye Sterling CDD** is governed: who decides
what, how changes are proposed and accepted, and the standards every change is
held to. It complements [`CONTRIBUTING.md`](CONTRIBUTING.md) (how to contribute)
and [`SECURITY.md`](SECURITY.md) (how to report vulnerabilities).

## Model

The project follows a **maintainer-led** model. It is proprietary software
(see [`LICENSE`](LICENSE)); the repository owner is the final decision-maker on
scope, architecture, releases, and merges.

## Roles

| Role            | Who                    | Responsibilities                                                                                  |
| --------------- | ---------------------- | ------------------------------------------------------------------------------------------------- |
| **Owner**       | [@trex0092](https://github.com/trex0092) | Sets direction, approves and merges changes, cuts releases, owns security response and compliance policy. |
| **Maintainers** | Listed in [`.github/CODEOWNERS`](.github/CODEOWNERS) | Review pull requests, triage issues, uphold the quality gates below.                               |
| **Contributors**| Anyone opening a PR    | Propose changes that meet the [contribution guide](CONTRIBUTING.md) and pass CI.                  |

Code ownership is enforced through [`CODEOWNERS`](.github/CODEOWNERS): a review
from a code owner is required before a pull request affecting owned paths can be
merged.

## How decisions are made

1. **Proposals** start as an issue (bug or feature) or a pull request.
2. **Discussion** happens on the issue/PR thread. For non-trivial or
   architectural changes, agreement with the owner is expected *before*
   significant implementation work.
3. **Decision** rests with the owner (or a delegated maintainer). Rationale is
   recorded on the thread so the decision trail is auditable.
4. **Disagreement** is resolved by the owner, whose decision is final.

## Change control & quality gates

Every change to `main` must clear the automated gates enforced in CI before it
can merge:

- **Continuous integration** — `lint`, `typecheck`, `test`, and `build`
  (`.github/workflows/ci.yml`).
- **Code scanning** — CodeQL static analysis (`.github/workflows/codeql.yml`).
- **Dependency review** — new/updated dependencies are checked for known
  vulnerabilities and disallowed licences (`.github/workflows/dependency-review.yml`).
- **Code owner review** — at least one approving review from a code owner.

Dependencies are kept current automatically via **Dependabot**; patch and minor
updates auto-merge once checks pass, while majors are reviewed manually.

The repository-side controls are complemented by a small set of admin **settings**
(branch protection, code security features, Discussions) recorded in
[`docs/REPOSITORY-HARDENING.md`](docs/REPOSITORY-HARDENING.md).

## Branching & releases

- Development targets `main`; work happens on `feature/*`, `fix/*`, or `chore/*`
  branches (see [`CONTRIBUTING.md`](CONTRIBUTING.md)).
- Commits follow **Conventional Commits**, which drives automated versioning and
  changelog generation via **release-please** (`.github/workflows/release-please.yml`).
- Releases follow **[Semantic Versioning](https://semver.org/)** and are recorded
  in [`CHANGELOG.md`](CHANGELOG.md).

## Compliance & AI governance

As an AML/CFT compliance tool, the project holds additional, documented controls:

- **Compliance policy** and configurable firm parameters —
  [`docs/COMPLIANCE-NOTES.md`](docs/COMPLIANCE-NOTES.md).
- **Governance & security control set** (identity/access, data protection, AI
  risk, monitoring, audit) — [`docs/GOVERNANCE-CONTROLS.md`](docs/GOVERNANCE-CONTROLS.md).
- **AI capability inventory** — [`docs/AI-REGISTER.md`](docs/AI-REGISTER.md).

Any change that touches risk-band logic, jurisdiction mappings, retention
periods, regulatory references, or an AI capability must update the relevant
document in the same pull request.

## Amending this document

Changes to project governance are themselves proposed via pull request and
approved by the owner.
