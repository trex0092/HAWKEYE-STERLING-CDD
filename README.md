# Hawkeye Sterling — Customer & Counterparty Due Diligence (CDD)

A compliance workstation for AML/CFT customer due diligence in the DPMS (dealers
in precious metals & stones) sector. An analyst opens an entity assessment, fills
nine sections, and the app derives a **risk band** (CDD / SDD / EDD) from the
selected jurisdiction. A session-lock gate guards entry, and the assessment can
be exported as a 2-page A4 PDF report.

Built to the design handoff in [`docs/design-handoff/`](docs/design-handoff/)
(README + two `.dc.html` references). The design files were references only — the
app is a fresh implementation in the stack below, not a port of their `<x-dc>`
runtime.

## Stack

- **React 18 + TypeScript + Vite**
- **React Router** — `/` workstation, `/report` export view
- **Zustand** — the assessment store (state + derived band)
- **lucide-react** — icon set (replaces the design's placeholder Unicode glyphs)
- **CSS design tokens** — `src/styles/*` (variables, keyframes, component classes)
- **Vitest + Testing Library** — runtime tests

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```bash
npm run build      # type-check + production build
npm run preview    # serve the production build
npm run test       # run the Vitest suite
npm run typecheck  # tsc --noEmit
```

### Unlocking the session

The lock gate uses real authentication (`src/lib/auth.ts`). The default
passphrase is **`sterling`** — override it by copying `.env.example` to
`.env.local` and setting `VITE_SESSION_PASSPHRASE`. Tapping the robot medallion
is the designed "delight" unlock. `authenticate()` is the single seam to swap for
a backend call.

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

## How it maps to the design

| Design concept | Implementation |
|---|---|
| Risk map (jurisdiction → band) | `src/data/countries.ts` |
| Band palette / score / labels | `src/lib/risk.ts` |
| Section copy / option sets | `src/data/labels.ts` |
| State model (incl. derived band) | `src/store/useAssessment.ts` |
| Report view-model (+ sample fallbacks) | `src/lib/report.ts` |
| Orbital medallions | `src/components/ui/OrbitalMedallion.tsx` |
| Glyph → icon swap | `src/components/icons.tsx` |
| Design tokens | `src/styles/tokens.css` |

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

## Notes & next steps

- **Persistence is not yet wired.** The store is fully controlled client state;
  `COMPLETE ASSESSMENT`, `REGISTER`, `ACTIVITY LOG`, `SEND TO ASANA`, `RE-ASSESS`
  and `RISK DATA` surface a toast and are ready to point at real services. `PRINT
  / EXPORT PDF` and `RESET` are fully functional.
- **`npm audit`** reports advisories only in dev tooling (the esbuild dev-server
  advisory via vite/vitest). They do not affect the production bundle; the only
  remediation is a breaking `vite@8` major, intentionally not taken.
