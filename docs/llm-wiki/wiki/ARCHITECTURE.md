---
document_type: architecture
summary: >-
  mundialito-client is a **single-service repository** — one TypeScript SPA with
  no backend of its own. There is no monorepo workspace tool; the repository
  roo...
last_updated: '2026-06-23T20:48:06.792Z'
tags:
  - architecture
  - topology
  - typescript
  - react
  - vite
---
# Architecture

## Monorepo / Repository Shape

mundialito-client is a **single-service repository** — one TypeScript SPA with no backend of its own. There is no monorepo workspace tool; the repository root is both the project root and the only `package.json`. Package management is done with **pnpm**.

The top-level layout reflects three distinct tiers: a pure, framework-agnostic match engine (`src/engine/`), a run-orchestration layer (`src/ui/run/` and `src/ui/quickplay/`), and the React UI layer (`src/ui/`). A `design/` directory holds an older HTML/JSX interactive prototype that serves as the visual and behavioural source of truth but is not the production app.

| Workspace / Path | Purpose |
| --- | --- |
| `src/engine/` | Pure-TS match engine — no React, no DOM, fully unit-testable |
| `src/ui/run/` | Arcade Run orchestration hooks |
| `src/ui/quickplay/` | Quickplay orchestration hooks |
| `src/ui/screens/` | Stateful screen containers |
| `src/ui/organisms/` | Composed UI components |
| `src/ui/atoms/` | Primitive UI components |
| `src/ui/tokens/` | CSS design tokens |
| `src/ui/i18n/` | Dependency-free EN/ES i18n (`useLang()` / `t()`) |
| `src/data/remote/` | Supabase repository modules |
| `src/ui/gallery/` | Design system gallery |
| `design/` | Legacy HTML/JSX prototype (read-only reference) |
| `supabase/` | Docker local stack, migrations, and seed CSVs |
| `scripts/` | Balance simulation utilities (`arcadeSim.ts`, `balanceSim.ts`) |

---

## Service Inventory

| ID | Type | Language | Port | Role |
| --- | --- | --- | --- | --- |
| [[mundialito-client]] | frontend | TypeScript 5 / React 19.2.6 + Vite 8 | 5173 | Card-game SPA — match engine, drag-and-drop squad builder, animated game board |

The `design/` directory contains JavaScript files classified by the analyser as a separate `javascript-scripts` library but they are not a deployed service — they are a static reference prototype consumed by developers only.

---

## Service Communication

mundialito-client is a single-process SPA; there are no inter-service HTTP calls between deployed services.

| Source | Target | Protocol | Notes |
| --- | --- | --- | --- |
| mundialito-client (browser) | Supabase hosted API | HTTPS / REST + PostgREST | Read-only queries for players, ratings, and campaign teams via `@supabase/supabase-js` anon key |
| mundialito-client (browser) | Supabase hosted API | HTTPS / Realtime (optional) | Not actively used for real-time sync in current scope |
| Local dev browser | Supabase Docker stack | HTTP (localhost) | Same anon key flow, directed at the local Docker endpoint instead of hosted |

All data access goes through thin repository modules in `src/data/remote/`. The match engine itself is pure in-memory TypeScript and makes no network calls.

---

## External Integrations

| Vendor | Client Wrapper Path | Auth Mechanism | Environments |
| --- | --- | --- | --- |
| Supabase (Postgres + PostgREST) | `src/data/remote/*.repo.ts`, `src/data/remote/database.types.ts` | Anon key (`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` env vars) | Production (hosted Supabase), local dev (Docker) |
| Vercel (hosting) | None — static build deployed via `vercel redeploy` | Git-connected project `mundialito` on manuelrodmotas-projects | Production alias `mundialito-rho.vercel.app` |

No third-party analytics, error monitoring, payment, or auth providers have been detected in the codebase.

---

## Authentication & Authorisation

The application currently uses Supabase's **anon key** for all database reads. This key is public by design (Supabase RLS is the enforcement boundary). No user-facing login flow or session lifecycle is present in the current scope.

Access control model:

- Supabase Row-Level Security (RLS) is the intended long-term enforcement mechanism for per-user state.
- In the current build all reads are unauthenticated and scoped to read-only public game data (players, ratings, opponents).
- There is no JWT issuance, no session cookie, and no role registry in the client.

If user accounts are introduced, the natural integration point is `@supabase/supabase-js` `auth` methods feeding into RLS policies on the existing tables.

---

## Request Lifecycle

### Browser → Game Data (most common path)

1. **App boot** — Vite serves `index.html`; React mounts the router.
2. **Screen render** — a screen component (e.g. `src/ui/screens/Quickplay/index.tsx`) initialises a data-fetch hook.
3. **Repository call** — the hook calls a function in `src/data/remote/` (e.g. `players.repo.ts`), which issues a PostgREST query via `@supabase/supabase-js` using the anon key.
4. **Supabase responds** — the hosted (or Docker) Postgres returns rows; the repo deserialises them into typed objects (`src/data/remote/database.types.ts`).
5. **State update** — hook state updates, triggering a re-render; cards and board data flow as props into organism components.

### User Action → Match Simulation

1. User drags a card to a lane — `dnd-kit` fires a drop event handled in the screen component.
2. The screen calls the orchestration hook (`useArcadeRun` or `useQuickplayMatch`).
3. The hook calls the pure-TS match engine (`src/engine/`) passing squad state and an `rng` instance produced by `makeRng`.
4. The engine returns a result object; the hook updates React state.
5. Framer Motion animations are triggered by the state change (xG meter fill, score update, card transitions).

---

## Data Architecture

| Store | Technology | Ownership | Schema Management | Local Dev |
| --- | --- | --- | --- | --- |
| Player / team data | Supabase Postgres | Supabase (hosted SaaS); Docker locally | SQL migrations in `supabase/migrations/`; applied via `pnpm db:reset` | `pnpm supabase:start` → `pnpm db:reset` → `pnpm seed` |
| Seed data | Three committed CSVs in `supabase/seed/` | Repository | Static files; `pnpm seed` imports idempotently | Same as above |
| TypeScript schema types | `src/data/remote/database.types.ts` (generated) | Generated artefact | `pnpm db:types` regenerates from live schema | Re-run after any migration |

The three seed datasets are:

- **Squad compositions** — which players belong to which national team squad.
- **Player ratings** (card pool) — men's players 1950–2026, with per-attribute ratings.
- **Campaign teams** — Arcade Run opponent decks.

There is no cache layer, no queue, and no object store in the current architecture.

---

## Deployment Topology

| Target | Service Hosted | Deploy Trigger |
| --- | --- | --- |
| Vercel (static SPA) | mundialito-client | Git push to `main` via Vercel git integration → automatic preview/production deploy |
| Manual redeploy | mundialito-client | `vercel redeploy` from CI or local (preferred over `vercel --prod` due to 100 MB upload limit) |

The Vercel project is `mundialito` under `manuelrodmotas-projects`; the production alias is `mundialito-rho.vercel.app`. Sensitive environment variables are set via the Vercel dashboard and are not extractable via `vercel env pull`.

No containerised or server-side deployment exists. The SPA is a fully static build (`tsc -b && vite build`) uploaded to Vercel's CDN.

---

## Local Development

Full local stack requires the Supabase Docker CLI in addition to Node/pnpm. First-time setup order is strict:

```
pnpm install          # install JS dependencies
pnpm supabase:start   # boot Docker-managed Supabase (Postgres, PostgREST, Studio)
pnpm db:reset         # drop + re-apply all migrations
pnpm seed             # import the three CSVs idempotently
pnpm dev              # start Vite dev server on :5173
```

The Supabase local stack uses Supabase's universal demo keys (same on every machine). No Supabase cloud account is needed for local development. The Vite dev server runs on **port 5173** with HMR enabled.

For schema changes: edit `supabase/migrations/`, run `pnpm db:reset` to re-apply, then `pnpm db:types` to regenerate TypeScript types.

For balance testing: `scripts/arcadeSim.ts` and `scripts/balanceSim.ts` run headlessly against the engine.

---

## Automation & CI

| Interface | Tool | Commands |
| --- | --- | --- |
| Package scripts | pnpm | `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm test`, `pnpm seed`, `pnpm db:reset`, `pnpm db:types`, `pnpm supabase:start` |
| Test runner | Vitest | `vitest run` (unit tests under `src/engine/*.test.ts`) |
| Linter | ESLint | `eslint .` |
| Type-check + build | tsc + Vite | `tsc -b && vite build` |

No Makefile, Justfile, Taskfile, or shell scripts are present. CI provider and workflows are not determined by analysis — no `.github/workflows/` or equivalent configuration was detected in the structure analysis.

---

## Coupling Hotspots

The analyser identified the following architectural hub and bridge nodes. Changes to these propagate widely.

**Hub nodes** (highest total degree — most connected):

- `src/engine/rng.ts::makeRng` (Function, score 180)
- `src/ui/run/useArcadeRun.ts::useArcadeRun` (Function, score 153)
- `design/jsx/Board7.jsx::Board7` (Function, score 153) — prototype reference file; high degree due to its role as the visual source of truth

**Bridge nodes** (highest betweenness — most on shortest paths between subsystems):

- `src/ui/organisms/MatchBoard/index.tsx::MatchBoard` (Function, score 0.007681)
- `src/ui/screens/Quickplay/index.tsx::Quickplay` (Function, score 0.00637)
- `src/ui/run/useArcadeRun.ts::useArcadeRun` (Function, score 0.003914)

`useArcadeRun` appears in both lists, confirming it as the most structurally critical node in the codebase — it bridges the engine tier, the data tier, and the React UI tier. `makeRng` is the highest hub and is a transitive dependency of every simulation path. Any change to either deserves heightened review attention.
