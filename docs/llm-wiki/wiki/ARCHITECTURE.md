---
document_type: architecture
summary: >-
  This repository is a **single-service polyrepo** — there is no monorepo
  tooling, no workspaces, and no sibling packages. The client is a Vite + React
  SPA backed by a Supabase data API (read-only player/team data).
last_updated: '2026-06-19T21:50:27.000Z'
tags:
  - architecture
  - topology
  - typescript
  - react
  - javascript
---
# Architecture

## Monorepo / Repository Shape

This repository is a **single-service polyrepo** — there is no monorepo tooling, no workspaces, and no sibling packages. The entire project is a pure client-side single-page application (SPA) scaffolded with Vite and React. The package manager is `pnpm`.

The top-level layout is minimal. Application source lives under `src/`: the React entry point, one top-level component, CSS, and static assets, plus three pure-logic / presentation subdirectories — `src/engine/` (a framework-agnostic TypeScript layer: canonical v10 domain types + tuning constants + a seeded PRNG, plus the full match-resolution engine + opponent AI — built fresh from the GDD rules, not ported), `src/data/` (static game data — player pool, tactical catalog, opponent teams, derived from the GDD), and `src/ui/` (the presentational React component library + design-token layer). The throwaway Monte-Carlo simulator (`src/sim/` + `tsconfig.sim.json`) was retired. A `supabase/` directory (config, SQL migrations, CSV seed/import scripts) defines a **Supabase Postgres data backend** for the player/team data — local-first via Docker, consumed read-only by the browser through `src/data/remote/`. No bespoke server code or shared library packages live in the repo; the backend is managed Supabase (PostgREST), configured from `supabase/`.

| Workspace / Directory | Contents |
|-----------------------|----------|
| `src/` | React components, stylesheets, entry point, static assets |
| `src/assets/` | Static asset files (images, fonts, etc.) |
| `src/engine/` | Pure framework-agnostic TS, no DOM/I/O, deterministic given a seed: canonical v10 `types.ts` + `constants.ts` + seeded `rng.ts`, plus the full match engine + AI built fresh from the GDD rules (not ported) — `xg`, `effectiveStats`, `synergies`, `fatigue`, `cards`, `validateLineup`, `board`, `tacticals`, `status`, `momentum`, `checkWin`, the `match` state machine (`resolveRound`), and `ai`; public surface via `index.ts` |
| `src/data/` | Game data: `src/data/remote/` = typed Supabase access layer (client, generated `database.types.ts`, DB→`PlayerCard` mappers, deck-builder + opponent repos) — the primary source; `tacticals.ts` + a static fallback pool stay in-bundle; co-located Vitest tests (mock the Supabase client) |
| `src/ui/` | React 19 UI. **Presentational tier** (`atoms`/`molecules`/`organisms` per atomic-design + `tokens/` design-token layer + jersey kit + `#ds` gallery) imports `src/engine/` **type-only**. **Orchestration tier** (`screens/` data-aware screens + `quickplay/` — the `useQuickplayMatch` hook + `buildQuickplayDeck`) is the deliberate integration layer that imports the engine runtime API + the Supabase repos and drives the playable Quickplay loop (deck builder → difficulty → match board → result) |
| `supabase/` | Supabase data backend: `config.toml`, SQL `migrations/` (6 tables + read-only RLS), `scripts/` (idempotent CSV seed + squads↔ratings normalization), `seed/*.csv` (source datasets), `README.md` (local workflow + cloud handoff). CLI local state (`.temp`/`.branches`/`out`) git-ignored |
| `public/` | (not determined by analysis) |

---

## Service Inventory

| ID | Type | Language | Port | Role |
|----|------|----------|------|------|
| [[mundialito-client]] | frontend | TypeScript 6.0.2 | 5173 | React 19 SPA served by Vite dev server |

The `javascript-scripts` group identified by static analysis is a library-type artefact comprised of 40 JavaScript files found in the repository (likely design prototypes or build artefacts in `design/`). It is not a deployable service and has no dedicated port or entry point.

---

## Service Communication

The repo holds no bespoke server code. There is one service boundary: the browser running mundialito-client, which now reads its player/team data from a **Supabase PostgREST API** over HTTPS (the first such call — added by the data-backend layer).

| Source | Target | Protocol | Data Shape |
|--------|--------|----------|------------|
| mundialito-client (browser, `src/data/remote/`) | Supabase PostgREST | HTTPS REST (anon key) | JSON rows (player_ratings, squad_members, campaign_teams, …) → mapped to `PlayerCard`/`OpponentTeam` |

---

## External Integrations

**Supabase** is the one external integration — `@supabase/supabase-js` is the client wrapper, used read-only from `src/data/remote/` for the player/team data. The other runtime deps are client-side UI libraries (React 19, **Framer Motion**, **dnd-kit**, `@fontsource-variable/inter`); the toolchain adds Vite, TypeScript, ESLint, the **Vitest + RTL + jsdom** test stack, and the **Supabase CLI** (+ `csv-parse`/`tsx` for the seed import). Only Supabase reaches a network service.

| Vendor | Client Wrapper Path | Auth Mechanism | Environments |
|--------|---------------------|----------------|--------------|
| Supabase | `src/data/remote/client.ts` (`@supabase/supabase-js`) | anon API key (`VITE_SUPABASE_ANON_KEY`), read-only RLS; service-role key is local/seed-only, never `VITE_*` | local (Docker, `supabase start`) · hosted (WCC-050 handoff) |

---

## Authentication & Authorisation

No authentication or authorisation layer exists in the current codebase. There is no identity provider integration, no token handling code, no session management, and no role or permission registry. The application renders without any auth gate.

If authentication is added in the future, the natural insertion point would be `src/App.tsx` or a dedicated auth context wrapping the component tree.

---

## Request Lifecycle

Because mundialito-client is a pure SPA, the only meaningful request lifecycle is the **initial page load** served by the Vite dev server (development) or a static file host (production).

**Browser page load (development)**

1. Developer runs `vite` from the repository root; Vite starts on port 5173.
2. Browser navigates to `http://localhost:5173`.
3. Vite serves `index.html` from the project root.
4. The browser loads `src/main.tsx`, which mounts the React application into the DOM.
5. `src/App.tsx` renders the root component tree; child components and stylesheets are loaded via Vite's HMR-aware module graph.
6. All subsequent interactions are handled entirely in-browser via React's reconciler. No network requests leave the browser unless explicitly coded.

**Production static bundle**

1. `tsc -b && vite build` compiles TypeScript and emits optimised bundles to `dist/`.
2. The `dist/` directory is deployed to a static file host (deployment mechanism not determined by analysis).
3. The browser fetches `index.html`, then loads hashed JS/CSS chunks.
4. React hydrates and takes over; no server round-trips occur for UI interactions.

---

## Data Architecture

Player/team reference data lives in a **Supabase Postgres database** (tables: `teams`, `tournaments`, `players`, `player_ratings` [the card pool], `squad_members`, `campaign_teams`), seeded from the CSVs under `supabase/seed/` and read **read-only** by the browser via PostgREST (`src/data/remote/` repositories map rows → `PlayerCard`/`OpponentTeam`). Schema is managed by SQL migrations under `supabase/migrations/`. There is still no client-side ORM/IndexedDB and no dedicated state-management library — transient UI state stays in React primitives (`useState`/`useContext`/`useReducer`); `src/data/tacticals.ts` and a static fallback pool remain in-bundle.

| Store | Technology | Ownership | Schema Management | Local Dev Story |
|-------|-----------|-----------|-------------------|-----------------|
| (none identified) | — | — | — | — |

---

## Deployment Topology

No CI/CD pipeline configuration, Dockerfile, or cloud-provider manifest has been detected in the repository. Deployment is (not determined by analysis).

| Deployment Target | Service Hosted | Deploy Trigger |
|-------------------|----------------|----------------|
| (not determined by analysis) | mundialito-client | (not determined by analysis) |

The production artifact is the `dist/` directory produced by `tsc -b && vite build`. It is a set of static files suitable for any CDN or static file host (Netlify, Vercel, S3 + CloudFront, GitHub Pages, etc.).

---

## Local Development

A developer needs only Node.js, pnpm, and a terminal to run the full local stack — there is no Docker Compose, no emulator, and no backend dependency.

```
# Install dependencies
pnpm install

# Start development server (hot-module replacement enabled)
vite
# → http://localhost:5173

# Type-check + production build
tsc -b && vite build

# Unit tests (Vitest) — co-located *.test.ts / *.test.tsx
pnpm test

# Lint
eslint .
```

Vite's dev server provides near-instant HMR for React component changes. TypeScript errors are surfaced in the terminal via `tsc --watch` or in-editor via the tsconfig.

There are no environment variables documented, no `.env.example`, and no emulated services required. If a backend API is added later, its base URL would typically be injected via a `.env.local` file read by Vite.

---

## Automation & CI

There is no Makefile, Justfile, Taskfile, or shell script automation layer. All workflows are driven by `pnpm` scripts defined in `package.json`.

| Command | Description | When Used |
|---------|-------------|-----------|
| `vite` | Start Vite dev server on port 5173 | Local development |
| `tsc -b && vite build` | Type-check (app + node projects) and emit production bundle to `dist/` | CI build, release |
| `pnpm test` | Run the Vitest suite once (`vitest run`); `pnpm coverage` for a v8 coverage report | Pre-commit, CI test step |
| `eslint .` | Run ESLint across the whole repository | Pre-commit, CI lint step |

The TypeScript build is split into two referenced projects: `tsconfig.app.json` (browser SPA + `src/engine/` + `src/data/` + `src/ui/`) and `tsconfig.node.json` (Vite/Vitest config). The earlier `tsconfig.sim.json` Node-only project was removed when the throwaway simulator was retired.

No CI provider configuration file (GitHub Actions, CircleCI, GitLab CI, Bitrise, etc.) has been detected in the repository. CI is (not determined by analysis).

---

## Coupling Hotspots

The following nodes were identified as high-coupling points by structural analysis. Hub nodes (high total degree) are change-amplification risks; bridge nodes (high betweenness) are connectivity risks.

**Hubs** — changes here have disproportionate blast radius:

- `design/jsx/Board5.jsx::Board5` (Function, score 145)
- `design/js/engine4.js::reveal` (Function, score 125)

Both hub nodes reside in the `design/` directory, which appears to contain prototype or design-iteration files rather than production `src/` code. Their high coupling scores likely reflect dense internal cross-referencing within that directory tree rather than coupling to the production application. They should be reviewed if the design files are intended to be merged into `src/`.

**Bridges** — removal would fragment the dependency graph:

- `qubika-agentic-framework/orchestration/src/services/framework/project-inspection/inspector.service.ts::inspectProject` (Function, score 0.002496)

This bridge node belongs to a path (`qubika-agentic-framework/`) that does not correspond to any declared source directory in mundialito-client's `package.json` or `src/` layout. It is most likely a tooling or framework file included in the static analysis scan but external to the application's own code. Its betweenness score is near zero, indicating minimal real architectural risk.
