# Hawkeye Sterling — Customer & Counterparty Due Diligence (CDD)

[![CI](https://github.com/trex0092/hawkeye-sterling-cdd/actions/workflows/ci.yml/badge.svg)](https://github.com/trex0092/hawkeye-sterling-cdd/actions/workflows/ci.yml)
[![CodeQL](https://github.com/trex0092/hawkeye-sterling-cdd/actions/workflows/codeql.yml/badge.svg)](https://github.com/trex0092/hawkeye-sterling-cdd/actions/workflows/codeql.yml)
![License: Proprietary](https://img.shields.io/badge/license-proprietary-red)
![Node](https://img.shields.io/badge/node-%3E%3D20-3ddc84)
[![Live on Netlify](https://img.shields.io/badge/live-Netlify-36e0d0)](https://hawkeye-sterling-cdd.netlify.app)

> 🌐 **Live:** https://hawkeye-sterling-cdd.netlify.app — hosted on Netlify (site is password-protected; the in-app session lock also applies).

A compliance workstation for AML/CFT customer due diligence in the DPMS (dealers
in precious metals & stones) sector. An analyst opens an entity assessment, fills
nine sections, and the app assigns a **risk band** (CDD / SDD / EDD) from a
configurable jurisdiction → band lookup — this is the jurisdiction's _inherent_
risk only, distinct from the analyst's own Section 07 risk-based assessment, and
an analyst can override it. A session-lock gate guards entry, and the assessment
can be exported as a 2-page A4 PDF report.

> This tool **supports** a human compliance review; it does not perform live
> screening and does not replace legal or compliance judgement. The jurisdiction
> risk map, retention period and regulatory references are **configurable firm
> policy** that must be verified against current official sources — see
> [`docs/COMPLIANCE-NOTES.md`](docs/COMPLIANCE-NOTES.md).

Built to the design handoff in [`docs/design-handoff/`](docs/design-handoff/)
(README + two `.dc.html` references). The design files were references only — the
app is a fresh implementation in the stack below, not a port of their `<x-dc>`
runtime.

## Stack

- **React 19 + TypeScript + Vite**
- **React Router** — `/` workstation, `/report` export view
- **Zustand** — assessment store (state + derived band) with **localStorage persistence**
- **lucide-react** — icon set (replaces the design's placeholder Unicode glyphs)
- **CSS design tokens** — `src/styles/*` (variables, keyframes, component classes)
- **Vitest + Testing Library** — runtime tests
- **ESLint + Prettier** — linting/formatting
- **GitHub Actions** — CI (lint·typecheck·test·build), CodeQL, Dependency Review, Lighthouse, Dependabot (+ auto-merge), and release-please

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```bash
npm run build        # type-check + production build
npm run preview      # serve the production build
npm run test         # run the Vitest suite
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run format       # prettier --write
```

### Unlocking the session

The lock gate is a **client-side passphrase gate** (`src/lib/auth.ts`), intended as
a prototype session lock — it is **not** backend-verified authentication, and the
passphrase is bundled into the client build. The default development passphrase is
**`sterling`**; override it by copying `.env.example` to `.env.local` and setting
`VITE_SESSION_PASSPHRASE`. Tapping the robot medallion is the designed "delight"
unlock.

> ⚠️ **Before any non-demo deployment:** point the `authenticate()` seam at a real
> backend (set `VITE_AUTH_ENDPOINT`) so credentials are verified server-side, and do
> not rely on the default passphrase. As shipped, the lock is not an access-control
> guarantee.

## Screens

1. **Session lock gate** — passphrase field + tap-the-robot to unlock; a 60-minute
   countdown auto-locks the session at zero.
2. **Assessment workstation** — sticky top bar, nine stacked form sections, and a
   sticky right rail (band-driven avatar, Required-Diligence pill, 8 action cells,
   autosave stamp) pinned below the top bar on scroll. Selecting a jurisdiction
   derives the band (CDD/SDD/EDD) and recolours the avatar, rings/glow and pill.
   Status selects (sanctions / adverse / PF / RBA) recolour by value: green =
   Negative/Low, amber = Pending/Medium, red = Positive/High.
3. **CDD Assessment Report** — the 2-page A4 export, rendered from live state.
   "Print / Export PDF" opens it and triggers the print dialog.

## Actions & persistence

The assessment autosaves to `localStorage` (the rail shows the last-saved time);
the session lock always re-engages on reload. Right-rail actions:

| Action                | Behaviour                                                             |
| --------------------- | --------------------------------------------------------------------- |
| `PRINT / EXPORT PDF`  | Opens the report and triggers print.                                  |
| `COMPLETE ASSESSMENT` | Appends an auto-numbered, timestamped entry to the version log (§09). |
| `REGISTER`            | Save/load assessments to a local register (modal).                    |
| `ACTIVITY LOG`        | Shows the recorded activity timeline (modal).                         |
| `SEND TO ASANA`       | POSTs to `VITE_ASANA_WEBHOOK_URL`; exports JSON if unconfigured.      |
| `RESET`               | Restores clean screening/risk defaults.                               |
| `RE-ASSESS`           | Re-screens all sanctions lists (stamps today).                        |

The **▶ Analyst Override** control under the diligence pill lets an analyst pin
the band (CDD/SDD/EDD) over the jurisdiction-derived value; it drives the avatar,
pill and report.

## How it maps to the design

| Design concept                         | Implementation                           |
| -------------------------------------- | ---------------------------------------- |
| Risk map (jurisdiction → band)         | `src/data/countries.ts`                  |
| Band palette / score / labels          | `src/lib/risk.ts`                        |
| Section copy / option sets             | `src/data/labels.ts`                     |
| State model (incl. derived band)       | `src/store/useAssessment.ts`             |
| Report view-model (+ sample fallbacks) | `src/lib/report.ts`                      |
| Orbital medallions                     | `src/components/ui/OrbitalMedallion.tsx` |
| Glyph → icon swap                      | `src/components/icons.tsx`               |
| Design tokens                          | `src/styles/tokens.css`                  |

## Project structure

```
src/
  data/          country/risk map, labels, option sets
  lib/           risk derivation, report model, auth, formatting
  store/         Zustand assessment store
  components/
    ui/          Panel/SectionHeader/fields/StatusSelect/ActionCell/medallion/toast
    workstation/ TopBar, LockGate, Sidebar, sections/ (01–09)
    icons.tsx    lucide icon registry
  pages/         Workstation, Report
  styles/        tokens, components, workstation, report
  test/          Vitest setup + tests
```

## Deployment (Netlify)

The repo ships a `netlify.toml` (build `npm run build`, publish `dist`, SPA
redirects, Node 20). To deploy: connect the repository in Netlify, or run
`netlify deploy --build`. Set any `VITE_*` variables (see `.env.example`) in the
Netlify site's environment.

## Contributing & policies

- [`CONTRIBUTING.md`](CONTRIBUTING.md) — setup, scripts, conventions
- [`SECURITY.md`](SECURITY.md) — vulnerability reporting
- [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md)
- [`CHANGELOG.md`](CHANGELOG.md)

## Notes & next steps

- **Persistence is client-side** (`localStorage`). The integration seams
  (`src/lib/auth.ts`, `src/lib/integrations/asana.ts`, `src/lib/register.ts`) are
  isolated so they can be repointed at a real backend without touching the UI.
- **`npm audit`** reports advisories only in dev tooling (the esbuild dev-server
  advisory via vite/vitest). They do not affect the production bundle; the only
  remediation is a breaking `vite@8` major, intentionally not taken.
- **Visual fidelity** was matched by transcribing the design's exact tokens and
  verified via the test suite; this environment can't run a browser to screenshot,
  so a quick manual pass in `npm run dev` is recommended.

## License

Proprietary — © 2026 Hawkeye Sterling. All rights reserved. See [`LICENSE`](LICENSE).
The robot portrait assets are client-supplied and may not be reused outside this
project.
