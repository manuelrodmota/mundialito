---
document_type: service
summary: >-
  `mundialito-client` is a TypeScript single-page application and the only
  deployed runtime. Built on React 19.2.6 and Vite 8 (port 5173 in dev), it
  hosts the ...
last_updated: '2026-06-23T20:48:06.792Z'
tags:
  - service
  - typescript
  - frontend
  - react
  - vite
service_id: mundialito-client
---
# mundialito-client

## Purpose

`mundialito-client` is a TypeScript single-page application and the only deployed runtime. Built on React 19.2.6 and Vite 8 (port 5173 in dev), it hosts the entire World Cup Clash card game: a framework-agnostic match engine (`src/engine/`), an Arcade Run orchestration tier (`src/run/`), all UI (`src/ui/`), and a Supabase data access layer (`src/data/remote/`). There is no separate backend — the browser reads player/team data directly from Supabase Postgres via PostgREST using a read-only anon key.

---

## Public API / Surface

No HTTP API, queue topics, or webhooks are exposed. The surface is the set of in-bundle entry points consumed by the React shell:

| Entry Point | Role |
|---|---|
| `src/main.tsx` | Vite entry; `ReactDOM.createRoot` |
| `src/App.tsx` | Application shell; `#ds` gallery gate + screen-state machine (`Screen` union, `useState`, no router) |
| `src/engine/index.ts` | Match engine API: `newMatch` / `startRound` / `resolveRound` / `halftime` / `beginExtraTime` / `checkWin` / `decideTurn` — deterministic given a seed |
| `src/run/index.ts` | Arcade Run orchestration: `runState` (7-stop ladder), `matchmaking`, `rewards` |
| `src/data/remote/index.ts` | Supabase repo barrel: `fetchPlayers`, `fetchCampaignTeamsByDifficulty` |
| `src/ui/index.ts` | Presentational component library barrel (atoms/molecules/organisms, jersey kit, gallery) |

---

## Internal Architecture

Three vertically stacked tiers with strict import discipline:

```
src/
  engine/      # Pure TS, no DOM/I/O; rng.ts (mulberry32), match.ts (state machine), ai.ts
  run/         # Pure TS Arcade Run tier: runState, matchmaking, rewards
  data/
    remote/    # Supabase access: client.ts (lazy singleton), players.repo.ts,
               # opponents.repo.ts, mappers.ts (DB row → PlayerCard), index.ts
    tacticals.ts / opponents.ts / playerPool.ts  # static in-bundle fallbacks
  ui/
    tokens/          # CSS design-token layer
    atoms/ molecules/ organisms/  # presentational; import engine types only
    screens/         # stateful containers: DeckBuilder, Quickplay, Arcade, RunMap,
                     # LockerRoom, RunSummary, ResultScreen
    quickplay/       # useQuickplayMatch hook + buildQuickplayDeck
    run/             # useArcadeRun hook
    jersey/          # per-nation procedural SVG kit
    gallery/         # #ds living design-system
```

**Tier rule:** `atoms`/`molecules`/`organisms` use `import type` for engine types — erased at build, never engine runtime. `useQuickplayMatch` and `useArcadeRun` are the deliberate seam where engine runtime + Supabase repos meet React. Both hooks (~360–395 lines) duplicate match-flow logic; fixes must land in both.

`makeRng` and `useArcadeRun` are the two highest-degree hub nodes by structural analysis; `MatchBoard` and `Quickplay` are the highest-betweenness bridges. The `design/` directory holds iterative JSX prototypes (sanctioned look/feel source for `src/ui/`) but is **not part of the production bundle**.

---

## Request Lifecycle

Two interleaved lifecycles run on game screen mount.

**App boot**
1. Vite serves `index.html`; browser loads the compiled bundle.
2. `main.tsx` → `ReactDOM.createRoot` → mounts `<App />`.
3. Screen-state machine defaults to `MainMenu`; user navigates to Quickplay or Arcade Run.

**Supabase data fetch** (triggered by orchestration hooks on screen mount)
1. **Bootstrap singleton client** (`src/data/remote/client.ts:getSupabaseClient`) — lazy singleton reads `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` inlined at build; `persistSession: false` (stateless, no local session storage).
2. **Query `player_ratings`** (`src/data/remote/players.repo.ts:fetchPlayers`) — pages through PostgREST's 1000-row cap in a `while` loop until the requested limit or season is exhausted.
3. **Map DB row → domain** (`src/data/remote/mappers.ts:ratingRowToPlayerCard`) — pure transform; deduplication via `seenIds` map.
4. **Query `campaign_teams`** (`src/data/remote/opponents.repo.ts:fetchCampaignTeamsByDifficulty`) — fetches AI opponent data for Arcade Run matchmaking.
5. **Expose via barrel** (`src/data/remote/index.ts`) — single export surface consumed by screens and hooks.

---

## Data Layer

Player/team reference data lives in **Supabase Postgres** (six tables):

| Table | Contents |
|---|---|
| `player_ratings` | Card pool — men's ratings 1950–2026; primary source for `PlayerCard` |
| `squad_members` | Squad composition linking players to teams/tournaments |
| `players` | Player identity records |
| `teams` | National team records |
| `tournaments` | Tournament edition records |
| `campaign_teams` | Arcade Run AI opponents (tier, strength, preferred formation) |

All six tables carry read-only RLS — `SELECT` granted to `anon` and `authenticated`; INSERT/UPDATE/DELETE denied by default. Schema managed by SQL migrations in `supabase/migrations/`; CSVs in `supabase/seed/` are the seed source.

`src/data/tacticals.ts` (19 tactical cards) and static fallback player/opponent pools remain compiled in-bundle. No IndexedDB or localStorage is used.

---

## Configuration

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase PostgREST endpoint — inlined by Vite at build time |
| `VITE_SUPABASE_ANON_KEY` | Read-only anon key — inlined by Vite at build time |

Local defaults (from `supabase start`) documented in `.env.example`; real values in `.env.local` (git-ignored). `SUPABASE_SERVICE_ROLE_KEY` is used only by local seed scripts and must never appear in any `VITE_*` var.

---

## Integrations

**Inbound:** None. No webhooks, no inbound API surface.

**Outbound:** [[supabase-postgres]] — `@supabase/supabase-js ^2.108.2` from `src/data/remote/client.ts`. Browser issues HTTPS REST calls to Supabase PostgREST using the anon key. This is the only network integration at runtime.

In-bundle UI libs (no network): Framer Motion `^12.40.0` (card animations), `@dnd-kit/core ^6.3.1` (drag-to-lane card placement).

---

## Service-Specific Patterns

**Pure functional engine** — Each state-transition function takes immutable `MatchState` + seeded `Rng`, returns new state. No side effects, no DOM coupling — enabling headless Vitest unit tests and deterministic replay.

**Lazy singleton Supabase client** — `getSupabaseClient()` (`src/data/remote/client.ts`) creates one `SupabaseClient` on first call; `persistSession: false` keeps it stateless. The anon key is the only credential; no sign-in or JWT issuance exists.

**Anonymous read-only access** — RLS at the DB layer enforces read-only for the browser. No user auth, no session management.

**Engine-type-only imports in UI** — Presentational components use `import type` for engine types (erased at build). Engine runtime flows only through the orchestration hooks in `src/ui/quickplay/` and `src/ui/run/`.

**Atomic-design component library** — `src/ui/` is organized atoms → molecules → organisms (`ComponentName/index.tsx` + per-layer barrels), with a design-token layer at `src/ui/tokens/index.css` and a `#ds`-gated living gallery.

**Co-located component styles** — Each component's CSS lives beside its `.tsx`; design tokens centralized in `src/ui/tokens/index.css` (imported once at root).

**Build-type enforcement** — Build command is `tsc -b && vite build`; `vite build` alone skips type checking and is incorrect per project convention.

**Factory functions for test fixtures** — Engine unit tests use inline factory helpers (`makePlayerCard`, `makeOpp`) co-located with the tests rather than external fixture files.
