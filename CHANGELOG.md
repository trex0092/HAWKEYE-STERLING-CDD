# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Project metadata and community health files: `LICENSE` (proprietary),
  `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, issue/PR templates,
  `CODEOWNERS`, Dependabot, `.editorconfig`, `.nvmrc`, `CHANGELOG.md`.
- CodeQL code-scanning workflow.
- Netlify deployment config (`netlify.toml`) with SPA redirects.

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
