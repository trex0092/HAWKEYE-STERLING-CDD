# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Project metadata and community health files: `LICENSE` (proprietary),
  `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, issue/PR templates,
  `CODEOWNERS`, Dependabot, `.editorconfig`, `.nvmrc`, `CHANGELOG.md`.
- `.gitattributes` — LF line-ending normalization and Linguist markers
  (`package-lock.json` generated, design `*.dc.html` vendored).
- Workflow linting via `actionlint` (`actionlint.yml`), which lints the
  Actions workflows on any change to `.github/workflows/**`.
- Documentation issue form (`.github/ISSUE_TEMPLATE/documentation.yml`).
- Aggressive security-scanning suite (`security-scan.yml`): **Trivy**
  (dependency + IaC/misconfig), **Zizmor** (GitHub Actions security audit), and a
  **CycloneDX SBOM** artifact — all reporting into the code-scanning dashboard.
- Deepened **CodeQL** to the `security-extended,security-and-quality` query suites.
- Hardened all workflows against their own Zizmor audit: `persist-credentials: false`
  on every checkout, justified `dangerous-triggers` ignores on the intentional
  `pull_request_target` workflows, and a `concurrency` guard on the scan workflow.
- Promoted **Zizmor** from advisory to a **blocking gate** — an insecure workflow
  now fails CI (baseline verified clean). Trivy stays advisory so a transient
  upstream CVE can't block unrelated PRs; Dependency Review stays advisory until
  the Dependency Graph repository setting is enabled (then drop its
  `continue-on-error`).
- Added an importable branch-protection ruleset
  (`.github/rulesets/main-branch-protection.json`) so protecting `main` is a
  one-click **Settings → Rules → Import** rather than a manual form.
- Added **test coverage** (`@vitest/coverage-v8`): an `npm run coverage` script,
  a coverage config with regression-guard thresholds, and CI now runs the suite
  with coverage enforced.
- Added 17 unit tests for previously under-covered modules (`lib/download`,
  `store/useToast`, `lib/governance/escalation`, `store/useAiCopilot`), lifting
  overall coverage to ~77% statements / ~62% branches (149 tests total) and
  raising the enforced floors accordingly.
- Governance compliance files: `GOVERNANCE.md` (roles, decision-making, change
  control) and `SUPPORT.md` (how to get help), linked from the README.
- Path-scoped `CODEOWNERS` covering governance docs, CI/CD, compliance docs,
  core risk logic, and server-side integrations.
- Repository automation: PR auto-labeling (`.github/labeler.yml` +
  `labeler.yml` workflow), scheduled stale issue/PR housekeeping
  (`stale.yml` workflow), and grouped auto-generated release notes
  (`.github/release.yml`).
- Canonical label set (`.github/labels.yml`) with a sync workflow
  (`labels.yml`) so every label referenced by labeling, release notes and
  stale automation exists and stays consistent.
- Code of Conduct enforcement contact and Community Impact Guidelines.
- Conventional Commits PR-title validation (`pr-title.yml` workflow) to keep
  `main` history parseable by release-please and the release-notes grouping.
- OpenSSF Scorecard supply-chain analysis (`scorecard.yml` workflow) with a
  README badge and results published to code scanning.
- Least-privilege `permissions` and a cancel-in-progress `concurrency` block on
  the CI workflow (Scorecard Token-Permissions hardening + CI-minute savings).
- RFC 9116 `security.txt` published at `/.well-known/security.txt` with the
  private disclosure contacts and policy link.
- Question issue form (`.github/ISSUE_TEMPLATE/question.yml`) and matching
  `question` label.
- CodeQL code-scanning workflow.
- Netlify deployment config (`netlify.toml`) with SPA redirects.

### Changed

- Upgraded runtime dependencies to current majors: React 18 → 19, react-router
  6 → 7 (the v7 future flags are now defaults), Zustand 4 → 5, lucide-react
  0.x → 1.x (with matching `@types/react` 19).
- Bumped GitHub Actions: `actions/checkout` 4 → 6, `actions/setup-node` 4 → 6,
  `github/codeql-action` 3 → 4.
- Upgraded the dev toolchain to current majors: ESLint 9 → 10, Vite 5 → 8,
  Vitest 2 → 4, `@vitejs/plugin-react` 4 → 6, plus `@eslint/js` 10,
  `eslint-config-prettier` 10, `eslint-plugin-react-hooks` 7, `globals` 17,
  `@types/node` 25, `jsdom` 29.

### Security

- `npm audit` now reports **0 vulnerabilities** (the esbuild dev-server advisory
  chain is resolved by Vite 8 / Vitest 4).
- **Pinned every GitHub Action to a full commit SHA** (OpenSSF Scorecard
  Pinned-Dependencies), with a version comment on each pin.
- Added **`step-security/harden-runner`** (egress-policy: audit) to the workflows
  that check out and execute repository code (CI, CodeQL, Lighthouse, AI evals,
  expiry notifier).
- Fixed the OpenSSF Scorecard workflow, which referenced a non-existent
  `ossf/scorecard-action@v2` ref and failed on every run; it is now pinned to
  `v2.4.3`.
- Added [`docs/REPOSITORY-HARDENING.md`](docs/REPOSITORY-HARDENING.md), an
  auditable checklist of the admin-only repository settings (branch protection,
  code security features, Discussions, presentation) that complete the setup.

## [1.0.0] - 2026-06-17

### Added

- Session lock gate: passphrase + tap-the-robot unlock, real auth seam, 60-minute
  countdown that auto-locks.
- Assessment workstation: sticky top bar, nine form sections, and a sticky right
  rail (band-driven avatar, Required-Diligence pill, action cells, autosave stamp).
- Jurisdiction-derived risk band (CDD/SDD/EDD) recolouring the avatar, rings/glow,
  and diligence pill; status selects recolour by value.
- Analyst band override layered over the derived band.
- Two-page A4 CDD Assessment Report with Print / Export PDF.
- localStorage persistence + autosave; assessment register (save/load); activity
  log; version-control entries on completion; re-assess and risk-data views.
- Integration seams for server-side auth (`VITE_AUTH_ENDPOINT`) and Asana
  (`VITE_ASANA_WEBHOOK_URL`).
- Tooling: TypeScript, Vite, ESLint + Prettier, Vitest suite, GitHub Actions CI.

[unreleased]: https://github.com/trex0092/hawkeye-sterling-cdd/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/trex0092/hawkeye-sterling-cdd/releases/tag/v1.0.0
