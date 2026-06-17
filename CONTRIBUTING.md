# Contributing

Thanks for contributing to Hawkeye Sterling CDD. This guide covers local setup
and the conventions CI enforces.

## Prerequisites

- **Node 20+** (see `.nvmrc` — run `nvm use`)
- npm

## Setup

```bash
npm install
cp .env.example .env.local   # optional; adjust VITE_* as needed
npm run dev                  # http://localhost:5173  (unlock passphrase: "sterling")
```

## Scripts

| Script              | Purpose                       |
| ------------------- | ----------------------------- |
| `npm run dev`       | Vite dev server               |
| `npm run build`     | Type-check + production build |
| `npm run preview`   | Serve the production build    |
| `npm run test`      | Vitest suite                  |
| `npm run lint`      | ESLint                        |
| `npm run format`    | Prettier (write)              |
| `npm run typecheck` | `tsc --noEmit`                |

## Before opening a PR

Run the same gates CI runs and make sure they pass:

```bash
npm run lint && npm run typecheck && npm run test && npm run build
```

## Conventions

- **Branches:** `feature/<short-name>`, `fix/<short-name>`, `chore/<short-name>`.
- **Commits:** imperative mood, concise subject (≤ ~72 chars), with a body when
  useful. Conventional Commits prefixes (`feat:`, `fix:`, `chore:`) are welcome.
- **Code style:** Prettier + ESLint are the source of truth — run `npm run format`.
- **Tests:** add/adjust tests under `src/test/` for behaviour changes.
- **Structure:** keep UI primitives in `src/components/ui`, screen pieces in
  `src/components/workstation`, derivations in `src/lib`, and state in `src/store`.

## Pull requests

- Target `main`; keep PRs focused and reviewable.
- Fill in the PR template; link any related issue.
- All CI checks must pass before merge.
