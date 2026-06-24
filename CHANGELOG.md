# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0](https://github.com/trex0092/HAWKEYE-STERLING-CDD/compare/v1.0.0...v1.1.0) (2026-06-24)


### Features

* add daily + monthly sanctions/PEP screening reminders ([eec3641](https://github.com/trex0092/HAWKEYE-STERLING-CDD/commit/eec3641ba7c26fe73decd584d83631c35d495cc0))
* add governed AI Compliance Co-pilot with 6-layer governance ([689095d](https://github.com/trex0092/HAWKEYE-STERLING-CDD/commit/689095db6f52718997ffeea04d38bc84309fe820))
* auto-close renewal tasks when the date is renewed ([cd8e6bb](https://github.com/trex0092/HAWKEYE-STERLING-CDD/commit/cd8e6bbbc68352b9545d35ec64f6b1e6792ab272))
* code-only governance hardening (layers 2–6) ([dc38273](https://github.com/trex0092/HAWKEYE-STERLING-CDD/commit/dc382737c8c71cd742b285026c0c607e879f653e))
* code-only governance hardening (layers 2–6) ([#29](https://github.com/trex0092/HAWKEYE-STERLING-CDD/issues/29)) ([dc38273](https://github.com/trex0092/HAWKEYE-STERLING-CDD/commit/dc382737c8c71cd742b285026c0c607e879f653e))
* code-only governance hardening across layers 2-6 ([9cb84a8](https://github.com/trex0092/HAWKEYE-STERLING-CDD/commit/9cb84a8e21ebe57cbd60ad92000c08b673c7f6f4))
* delete renewed reminders instead of completing them ([32cc74f](https://github.com/trex0092/HAWKEYE-STERLING-CDD/commit/32cc74ffd134906e026df6c6ec963474e0df5428))
* governed AI Compliance Co-pilot (6-layer AI governance) ([4e6322f](https://github.com/trex0092/HAWKEYE-STERLING-CDD/commit/4e6322ffd4211f46569bea68f07a5454080ceecd))
* governed AI Compliance Co-pilot (6-layer AI governance) ([#28](https://github.com/trex0092/HAWKEYE-STERLING-CDD/issues/28)) ([4e6322f](https://github.com/trex0092/HAWKEYE-STERLING-CDD/commit/4e6322ffd4211f46569bea68f07a5454080ceecd))
* in-app Accept/Edit/Discard review for AI narrative draft ([cb4e0b4](https://github.com/trex0092/HAWKEYE-STERLING-CDD/commit/cb4e0b44fbcb8dfda743415797c172a5eef4bd54))
* notify on expiring customer info via Asana follow-up tasks ([059a264](https://github.com/trex0092/HAWKEYE-STERLING-CDD/commit/059a264641ccb2547fb4ec76ed2e60d599a75a76))
* read Expiry Date column and add a 2-day "expiring soon" window ([f125414](https://github.com/trex0092/HAWKEYE-STERLING-CDD/commit/f12541471daff3a689944af5c6b3585f22c0c175))
* risk-based CDD review cadence + reschedule to 08:40 Dubai ([5ff46c0](https://github.com/trex0092/HAWKEYE-STERLING-CDD/commit/5ff46c083f13e35644ed927c6b14a894418230b9))
* screening-driven EDD escalation + firm policy decisions ([#22](https://github.com/trex0092/HAWKEYE-STERLING-CDD/issues/22)) ([057df95](https://github.com/trex0092/HAWKEYE-STERLING-CDD/commit/057df956dc3183c2724cdc81c797f6a3e28af125))
* show risk rating in the periodic-review task body ([474e655](https://github.com/trex0092/HAWKEYE-STERLING-CDD/commit/474e655be8ef84dedde10ea1512723db731bcd3c))
* source risk rating from per-customer Risk Assessments tasks ([5f32448](https://github.com/trex0092/HAWKEYE-STERLING-CDD/commit/5f32448cd87b641c8db1a612d6f5c637e8d07606))
* use company name in renewal task narrative ([b8d1767](https://github.com/trex0092/HAWKEYE-STERLING-CDD/commit/b8d1767ca3a9a413be5659ed6af8c5b463c0f959))
* use the HD android avatar across the workstation ([#23](https://github.com/trex0092/HAWKEYE-STERLING-CDD/issues/23)) ([7867745](https://github.com/trex0092/HAWKEYE-STERLING-CDD/commit/7867745bdb9fe1cad631fd914d9066dac8c73ab2))


### Bug Fixes

* address deep-review findings (report colours, store, a11y) ([9026bc0](https://github.com/trex0092/HAWKEYE-STERLING-CDD/commit/9026bc0724c542e907e056e8877f63eb8eef3004))
* address deep-review findings (report colours, store, a11y) ([#15](https://github.com/trex0092/HAWKEYE-STERLING-CDD/issues/15)) ([62f8973](https://github.com/trex0092/HAWKEYE-STERLING-CDD/commit/62f8973e0d5808a3ebd2c3ee3288e4d485d945d2))
* **ci:** keep Lighthouse performance non-blocking to stop CI flake ([70db55a](https://github.com/trex0092/HAWKEYE-STERLING-CDD/commit/70db55a044d096369eccb5fd0edba355e6307fef))
* **ci:** stop Lighthouse performance flake (keep it non-blocking) ([4846fa8](https://github.com/trex0092/HAWKEYE-STERLING-CDD/commit/4846fa876fdc08dc31e82dc3bc6a5830de2841bc))
* **ci:** stop Lighthouse performance flake (keep it non-blocking) ([#30](https://github.com/trex0092/HAWKEYE-STERLING-CDD/issues/30)) ([4846fa8](https://github.com/trex0092/HAWKEYE-STERLING-CDD/commit/4846fa876fdc08dc31e82dc3bc6a5830de2841bc))
* de-hallucinate export, reframe unsourced compliance claims, a11y + robustness ([#21](https://github.com/trex0092/HAWKEYE-STERLING-CDD/issues/21)) ([ddb1f1d](https://github.com/trex0092/HAWKEYE-STERLING-CDD/commit/ddb1f1dab1a21b6b8390621efa5b067f4cee5465))
* harden report rendering and complete Asana audit logging ([#18](https://github.com/trex0092/HAWKEYE-STERLING-CDD/issues/18)) ([8fe2d25](https://github.com/trex0092/HAWKEYE-STERLING-CDD/commit/8fe2d25d2aa329b6c99a87a551dc440e3e4409f4))
* match dedup keys that contain spaces (company-name fallback) ([99cc983](https://github.com/trex0092/HAWKEYE-STERLING-CDD/commit/99cc983ab330144bfe61f3b3285e31e911a0349b))
* **ts:** drop deprecated baseUrl for TypeScript 6 ([2c72823](https://github.com/trex0092/HAWKEYE-STERLING-CDD/commit/2c72823117528c6fde3c6e6e47ba1671649b5451))
* use existing ASANA_ACCESS_TOKEN secret in notifier workflow ([fcd8f0c](https://github.com/trex0092/HAWKEYE-STERLING-CDD/commit/fcd8f0cf85c712320635b72bde1790166c6f50f6))

## [Unreleased]

### Added

- Project metadata and community health files: `LICENSE` (proprietary),
  `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, issue/PR templates,
  `CODEOWNERS`, Dependabot, `.editorconfig`, `.nvmrc`, `CHANGELOG.md`.
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
