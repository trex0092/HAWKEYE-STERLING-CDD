# Handoff: Hawkeye Sterling — Customer & Counterparty Due Diligence (CDD)

## Overview
A compliance workstation for AML/CFT customer due diligence in the DPMS (dealers in precious
metals & stones) sector. An analyst opens an entity assessment, fills nine sections, and the app
derives a **risk band** (CDD / SDD / EDD) from the selected jurisdiction. A session-lock gate
guards entry, and the assessment can be exported as a 2‑page PDF report.

Two design files are included:
- **Hawkeye Sterling.dc.html** — the interactive assessment workstation (dark "cyberpunk" theme).
- **CDD Assessment Report.dc.html** — the print/PDF export view (light A4 document).

## About the Design Files
These files are **design references created in HTML** — prototypes that show the intended look and
behavior. They are **not production code to copy directly**. They are authored in a small in-house
"Design Component" runtime (`<x-dc>` + a `Component` logic class); **do not** port that runtime.

The task is to **recreate these designs in the target codebase's existing environment** (React, Vue,
Svelte, etc.) using its established component library, state, routing, and styling patterns. If no
front-end environment exists yet, choose the most appropriate framework and implement there. Treat
the HTML as the source of truth for layout, spacing, color, type, copy, and interaction — not for
code structure.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, and interactions are specified. Recreate
the UI pixel-accurately using the codebase's own primitives. All hex values, font sizes, and radii
below are exact.

---

## Screens / Views

### 1. Session Lock Gate (overlay)
- **Purpose**: Re-authenticate after the 60-minute session expires before the workstation is usable.
- **Layout**: Fixed full-screen overlay (`z-index:100`) with a blurred/darkened backdrop
  (`backdrop-filter: blur(8px)`, radial violet+blue glows over `rgba(5,6,12,.86)`). A centered card,
  `width:520px`, `border-radius:20px`, `background:rgba(13,15,25,.94)`, `1px` border
  `rgba(130,95,210,.3)`, `padding:34px 40px 32px`, with a 2px top gradient bar
  (`#e85aff → #7aa6ff`).
- **Components**:
  - **Robot medallion** — 108×108 circular, the violet logo robot (`robot-logo.png`) inside two
    counter-rotating ring borders (top `#e85aff`/right `#b07bff` spinning 7s; bottom `#7aa6ff`/left
    `#36e0d0` spinning −10s) + a dashed outer ring (24s). Inner image inset 18px, glow
    `0 0 40px rgba(176,123,255,.55)`. A small 🔒 badge (30px, bg `#13101f`, border
    `rgba(232,90,255,.5)`) sits bottom-right. **The medallion is clickable and unlocks** (delight).
  - Caption `TAP THE BOT TO UNLOCK` — JetBrains Mono, 10px, letter-spacing `.2em`, `#8a7bbf`, centered.
  - **Title** "Session expired" — Space Grotesk 700, 26px, `#eef0f7`.
  - **Subtitle** "Your 1-hour session has ended — please re-enter your passphrase to continue." —
    15px, `#e3b341` (amber), line-height 1.55.
  - **Passphrase input** — `type=password`, full width, 15px, bg `rgba(10,12,22,.8)`, border
    `rgba(130,95,210,.25)`, radius 12px, padding `15px 18px`. Focus: border `#e85aff` + ring
    `0 0 0 3px rgba(232,90,255,.14)`. **Enter key unlocks.**
  - **UNLOCK button** — full width, Space Grotesk 600, 14px, letter-spacing `.14em`, color `#dcb3ff`,
    bg `rgba(232,90,255,.08)`, border `rgba(232,90,255,.55)`, radius 12px, padding 15px, glow
    `0 0 22px rgba(232,90,255,.14)`. Hover: bg `rgba(232,90,255,.16)`, glow `.3`.
- **Note**: This is a mock gate — any passphrase (or tapping the bot, or Enter) unlocks. Wire to real
  auth in production.

### 2. Assessment Workstation (main)
- **Purpose**: Capture and score a single entity's due-diligence assessment.
- **Layout**: Sticky top bar, then a page title, then a two-column grid:
  `grid-template-columns: minmax(0,1fr) 366px; gap:14px;` inside `max-width:1480px; margin:0 auto;
  padding:14px 30px 0`. Left column = form sections; right column = avatar + required-diligence +
  action cells. Below the grid, full-width sections 03–09 stacked (`flex column; gap:14px`).
  Page background: `#07080f` with three radial glows (violet top-right, blue top-left, green bottom).
- **Top bar**: `position:sticky; top:0; z-index:40; background:rgba(9,10,18,.82);
  backdrop-filter:blur(14px); border-bottom:1px solid rgba(130,95,210,.22); padding:14px 30px`.
  - Left: 46px logo medallion (violet robot in two spinning rings) + wordmark **HAWKEYE STERLING**
    (Space Grotesk 700, 18px, letter-spacing `.14em`, gradient text `#f48bff → #b07bff → #7aa6ff`).
  - Right: `● ALL SYSTEMS LIVE` (green `#3ddc84`, pulsing dot) · countdown pill `⏱ 59:59`
    (JetBrains Mono, amber `#e3b341`, border `rgba(227,179,65,.4)`) · `⊟ LOCK` button
    (re-locks the session).
- **Page title**: "Customer & Counterparty **Due Diligence**" — Space Grotesk 700, 24px; the words
  "Due Diligence" use the violet→blue gradient text.
- **Form sections** (left + full width). Every section uses the same header pattern:
  a magenta 2‑digit index (`#f48bff`, JetBrains Mono 13px 700), a Space Grotesk 600 14px
  letter-spacing `.1em` `white-space:nowrap` title, then a flex‑1 gradient hairline
  (`linear-gradient(90deg,#e85aff,rgba(54,224,208,.25) 70%,transparent)`).
  - **01 Assessment Administration** — 3-col then 2-col grid. Fields: Reference Number
    (`RA-20260617-017`, mono), Assessment Date, Next Review Date, Assessed By, Role / Department.
  - **02 Entity Identification** — 2-col grid. Fields: Legal Entity Name, **Jurisdiction &
    Incorporation** (select — drives the risk band), Trading Name, Registration / Licence No.,
    Registered Address, Website / Email.
  - **03 Sanctions Screening** — rows of `[list | result select | date | remarks]`
    (`grid-template-columns: minmax(0,2.2fr) 140px 150px minmax(0,2fr)`). 6 lists.
  - **04 Adverse Media Screening** — rows `[category | finding select | details]`. 7 categories.
  - **05 Identifications** — one card per person (`+ Add person` / `REMOVE`), each a 4-col grid of
    13 fields (designation, name, shares %, type, nationality, gender, DOB, passport no., passport
    expiry, Emirates ID, Emirates ID expiry, proof of address, PEP status).
  - **06 Proliferation Financing (PF) Assessment** — rows `[factor | level select | notes]`. 6 factors.
  - **07 Risk-Based Assessment (RBA)** — `[Overall Risk Classification | CDD Level Required |
    Relationship Decision | ☐ Trigger events present]`.
  - **08 Sign-off & Authorization** — 4 fields (Prepared by / role, Approved by / role) + a retention
    note ending "…minimum of **10 years**."
  - **09 Review & Version Control** — table `[Ver | Date | By | Type | Summary]`. Empty state:
    "No reviews logged yet — a timestamped, auto-numbered entry will appear here once the first
    review is logged."
- **Right sidebar**:
  - **Avatar panel** — 162px orbital medallion whose **robot image and ring/glow color change with the
    risk band**: CDD→green robot (`robot-cdd.png`), SDD→gold robot (`robot-sdd.png`),
    EDD→red robot (`robot-edd.png`). Top/right ring = band color; bottom/left ring stays
    `#e85aff`/`#7aa6ff`; outer dashed ring uses band border color; inner glow uses band glow.
  - **Required Diligence panel** — header hairline, then a band-colored pill box
    `✓ CDD — Customer Due Diligence` (Space Grotesk 600, **13px**, border/bg/text = band color),
    then `▶ ANALYST OVERRIDE`.
  - **Action cells panel** — 8 stacked full-width buttons, each Space Grotesk 600 12px,
    `padding:11px`, radius 10px, colored tint+border+text, hover = stronger tint:
    `⎙ PRINT / EXPORT PDF` (violet `#c4a3ff`), `✓ COMPLETE ASSESSMENT` (green `#3ddc84`),
    `☰ REGISTER` (magenta `#f48bff`), `▤ ACTIVITY LOG` (amber `#e3b341`),
    `↗ SEND TO ASANA` (blue `#7aa6ff`), `↺ RESET` (red `#ff5d73`), `⟳ RE-ASSESS` (cyan `#36e0d0`),
    `⚙ RISK DATA` (olive `#c9c24a`). Footer line `Autosaved <h:mm:ss AM/PM>` (mono, 10px, `#5a6478`).

### 3. CDD Assessment Report (PDF export)
- **Purpose**: Printable / PDF record of the assessment. Light A4 document, 2 pages.
- **Layout**: Each page `794×1123px` (A4 @96dpi), white. `@page { size:A4; margin:0 }`. On screen,
  pages sit on a gray backdrop with a drop shadow and a toolbar; in print the shadow/margins are
  removed and pages break (`break-after:page` on page 1).
- **Header band** (dark, `#0e1018`, padding `26px 44px`): top 3px gradient bar
  (`#e85aff→#7aa6ff→#36e0d0`), 48px robot medallion, **HAWKEYE STERLING** wordmark + sub
  "Customer & Counterparty Due Diligence — CDD Assessment Report", right-aligned `REF` / `DATE`.
- **Risk banner**: band-tinted box — left `OVERALL RISK CLASSIFICATION` + big band label; right
  `REQUIRED DILIGENCE · DECISION`. Light band palette: low `#1f9d57`/bg `#eefaf2`,
  med `#b8860b`/bg `#fbf6e6`, high `#c0392b`/bg `#fbece9`.
- **Body**: section headers = magenta index `#c026d3` + Space Grotesk 700 13px title + `#e3e6ec`
  hairline. Page 1: sections 01–04 (key/value grids + sanctions/adverse tables, results in green
  `#1f9d57`). Page 2: 05 Identifications card, 06 PF table, 07 RBA summary, 08 sign-off with
  signature rules, 09 version table. Footer each page: `CONFIDENTIAL · HAWKEYE STERLING COMPLIANCE`
  + `PAGE n OF 2`.
- Body type: Manrope; labels: JetBrains Mono 9px letter-spacing `.1em` `#9aa0ac`; values 12–13px `#15171f`.

---

## Interactions & Behavior
- **Session lock**: `locked` starts `true`. UNLOCK button, Enter in the passphrase field, or tapping
  the robot sets `locked=false` and resets the timer to 3600s. The top-bar `⊟ LOCK` sets
  `locked=true` (timer→0). When the countdown reaches 0 the app auto-locks.
- **Countdown**: 1s interval; format `mm:ss`; starts at `60:00`.
- **Risk band derivation**: selecting a jurisdiction looks it up in a risk map → band
  `low | med | high`. Band sets: risk score (4 / 21 / 25), the avatar robot+ring+glow color, the
  Required-Diligence pill text+color, and the report banner. Mapping of band→label:
  low = "CDD — Customer Due Diligence", med = "SDD — Simplified Due Diligence",
  high = "EDD — Enhanced Due Diligence".
- **Status selects recolor by value** (sanctions/adverse/PF/RBA): Negative/Low/Low Risk → green
  `#3ddc84`; Pending/Medium/Medium Risk → amber `#e3b341`; Positive/High/High Risk → red `#ff5d73`.
  The closed select's text color reflects the current value; options are colored too.
- **Add / Remove person**: `+ Add person` appends an INDIVIDUAL card; `REMOVE` shows when >1 person.
- **PRINT / EXPORT PDF** → `window.print()` (in production, render/print the Report view).
- **RESET** → restores jurisdiction to United Kingdom, one blank person, and all status selects to
  their clean defaults (Negative / Low / Low Risk).
- **Hover**: action cells and buttons deepen their tint; inputs/selects show a magenta focus ring.
- **Animations**: orbital rings spin (`hk-spin` 360°, with reverse variants), medallions "breathe"
  (`hk-breathe`, scale 1→1.015 + brightness), live dots pulse (`hk-pulse`, opacity 0.55→1).

## State Management
- `locked: boolean` — session gate.
- `remaining: number` (seconds) — countdown, decremented each second; 0 → `locked=true`.
- `now: Date` — drives the "Autosaved" timestamp (and any clock).
- `jurisdiction: string` — selected country; key into the risk map → band.
- `persons: id[]` (+ `_nextId`) — identification cards.
- `sancResults[6] / advFindings[7] / pfLevels[6] / rbaClass` — status select values.
- Derived (no stored state): `band`, `riskScore`, palette (color/glow/border/bg/label), avatar image.
- Data fetching: none in the prototype. In production, persist the assessment, autosave, load saved
  files, and back the version log + activity log with real records.

## Design Tokens

### Colors — app (dark)
| Token | Hex |
|---|---|
| Page background | `#07080f` |
| Panel surface | `rgba(16,18,30,.62)` |
| Input surface | `rgba(10,12,22,.7)` |
| Panel border | `rgba(130,95,210,.18)` |
| Input border | `rgba(130,95,210,.22)` |
| Text primary | `#e8eaf2` |
| Text secondary | `#c5ccd9` |
| Label / muted | `#7e889e` |
| Faint | `#5a6478` |
| Magenta (accent / index) | `#e85aff` / `#f48bff` |
| Violet | `#b07bff` / `#7b5bff` |
| Blue | `#7aa6ff` |
| Cyan | `#36e0d0` |
| Green (low / Negative) | `#3ddc84` |
| Amber (med / Pending) | `#e3b341` |
| Red (high / Positive) | `#ff5d73` |
| Olive (Risk Data) | `#c9c24a` |

### Colors — report (light)
Paper `#ffffff` · ink `#15171f` · body `#374151` · muted `#6b7280` / `#9aa0ac` · hairline
`#e3e6ec` / row `#f0f2f6` · header band `#0e1018` · accent `#c026d3` · result green `#1f9d57`.
Band (light): low `#1f9d57`/`#eefaf2`, med `#b8860b`/`#fbf6e6`, high `#c0392b`/`#fbece9`.

### Typography
- Display / headings: **Space Grotesk** (600–700).
- Body: **Manrope** (400–600).
- Labels, numbers, eyebrows, dates: **JetBrains Mono** (400–700), uppercase, letter-spacing `.1–.2em`.
- App sizes: wordmark 18px; page title 24px; section title 14px; body 13–15px; labels 9–11px.
- Report sizes: wordmark 18px; section title 13px; values 12–13px; labels 9px.

### Spacing / radius
- Grid gaps 10–14px; panel padding 12–15px; page gutters 30px (app) / 44px (report).
- Radii: panels 11px, inputs 9–12px, pills/cells 7–10px, medallions 50%.
- Focus ring: `0 0 0 3px rgba(232,90,255,.12–.14)`.

### Shadows / glows
- Avatar inner glow: `0 0 38–42px <band glow>, inset 0 0 24px rgba(0,0,0,.6)`.
- Lock card: `0 30px 90px rgba(0,0,0,.6)`. Report page: `0 14px 50px rgba(0,0,0,.34)`.

## Assets
Robot portraits (AI-generated, supplied by the client) in `assets/`:
- `robot-logo.png` — violet/cosmic android → app + report logo, and the lock-screen medallion.
- `robot-cdd.png` — green android → avatar when band = CDD (low).
- `robot-sdd.png` — gold android → avatar when band = SDD (medium).
- `robot-edd.png` — red android → avatar when band = EDD (high).
- (`robot-vela.png`, `robot-cypher.png`, `robot-ember.png`, `robot-aurora.png` are earlier
  alternates, included for reference; not used by the current screens.)

Icons in the UI are Unicode glyphs (⎙ ✓ ☰ ▤ ↗ ↺ ⟳ ⚙ ⏱ ⊟ ▶ 🔒). Swap for the codebase's icon set.

## Files
- `Hawkeye Sterling.dc.html` — interactive assessment workstation (lock gate + 9 sections + sidebar).
- `CDD Assessment Report.dc.html` — 2-page A4 PDF export view (sample-filled).
- `assets/` — robot images referenced above.
