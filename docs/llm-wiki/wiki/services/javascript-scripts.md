---
document_type: service
summary: >-
  `javascript-scripts` is the production client application for Mundialito — a
  card-based World Cup match game. It is a single-service TypeScript SPA
  responsib...
last_updated: '2026-06-23T20:48:06.792Z'
tags:
  - service
  - javascript
  - library
service_id: javascript-scripts
---
# Javascript Scripts

## Purpose

`javascript-scripts` is the production client application for Mundialito — a card-based World Cup match game. It is a single-service TypeScript SPA responsible for the complete user-facing experience: bootstrapping game data from Supabase, running the deterministic match engine, orchestrating Quickplay and Arcade Run game modes, and rendering the animated card-game UI. The service owns no backend of its own; it is a pure browser application that reads from a Supabase Postgres instance (local Docker in dev, hosted in prod).

---

## Public API / Surface

This service exposes no HTTP endpoints or webhooks — it is a client-only SPA. Its public surface consists of the npm scripts defined in `package.json` and the data-layer barrel re-exported from `src/data/remote/index.ts`.

**CLI commands (npm scripts):**

| Command | Action |
|---|---|
| `pnpm dev` | Starts Vite dev server on port 5173 |
| `pnpm build` | Type-checks (`tsc -b`) then bundles (`vite build`) |
| `vitest run` | Runs engine unit tests |
| `eslint .` | Lints entire project |
| `pnpm db:reset` | Resets local Supabase schema |
| `pnpm seed` | Seeds local Postgres from CSV fixtures |

**Exported data-layer surface** (`src/data/remote/index.ts`): barrel re-exporting all repo functions consumed by UI screens — primarily `fetchPlayers` and `fetchCampaignTeamsByDifficulty`. Consumer agents can use `query_graph_tool` with `pattern: "children_of"` on `src/data/remote/index.ts` for the full export list.

---

## Internal Architecture

The service is vertically sliced into three tiers with a deliberate dependency direction: engine → data → UI.

**Engine tier** (`src/engine/`) — pure TypeScript with no framework or DOM dependency. Contains state-transition functions (`match.ts`, `board.ts`, `ai.ts`, `rng.ts`) that operate on immutable `MatchState` objects. Shared by both game modes without any React coupling. Unit-tested headlessly via Vitest.

**Data tier** (`src/data/remote/`) — thin PostgREST wrappers over Supabase. A lazy singleton client (`client.ts`) is shared by two repos (`players.repo.ts`, `opponents.repo.ts`) whose output is mapped to engine domain types via `mappers.ts`. All writes are denied at the DB layer by RLS policy.

**Run/orchestration tier** (`src/ui/run/`, `src/ui/quickplay/`) — React hooks (`useArcadeRun`, `useQuickplayMatch`) that wire engine state transitions to React state and handle game-mode lifecycle. These are the largest hooks in the project (~395 and ~362 lines respectively) and duplicate substantial match-flow logic; fixes must land in both.

**UI tier** (`src/ui/`) — screens, organisms, and atoms following the atomic design hierarchy. `MatchBoard` (~450 lines) is the largest single UI component. Animation uses Framer Motion; drag-to-lane card placement uses dnd-kit.

**Design prototype** (`design/`) — an older HTML/JSX interactive prototype (`Board7.jsx` et al.) that is the visual/behavioral source of truth but is not part of the production build. It is indexed by the graph but its large-function signals should not be treated as `src/` quality signals.

**Highest-degree hubs** (by graph score):

| Node | Kind | Score |
|---|---|---|
| `src/engine/rng.ts::makeRng` | Function | 180 |
| `src/ui/run/useArcadeRun.ts::useArcadeRun` | Function | 153 |
| `design/jsx/Board7.jsx::Board7` | Function | 153 |

**Bridge nodes** (highest betweenness centrality): `MatchBoard`, `Quickplay`, `useArcadeRun`.

---

## Request Lifecycle (or Job Lifecycle)

The following describes the data-bootstrap flow that runs at app startup before the first game is playable:

1. **Bootstrap Supabase client** — `src/data/remote/client.ts::getSupabaseClient` lazily constructs a singleton `@supabase/supabase-js` client using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` inlined at build time. `persistSession: false` — no local session storage; purely stateless anonymous reads.

2. **Paginate player_ratings** — `src/data/remote/players.repo.ts::fetchPlayers` loops over PostgREST's 1 000-row page cap, issuing repeated queries until the requested row count is collected or the season is exhausted.

3. **Map DB rows to domain types** — `src/data/remote/mappers.ts::ratingRowToPlayerCard` transforms each raw row into a typed engine `PlayerCard`. A `seenIds` map inside the mapper prevents duplicates across pages.

4. **Fetch campaign opponents** — `src/data/remote/opponents.repo.ts::fetchCampaignTeamsByDifficulty` loads AI opponent data used for Arcade Run matchmaking.

5. **Expose via barrel** — `src/data/remote/index.ts` re-exports all repo functions; UI screens import only from this barrel.

After bootstrap, game state transitions are entirely in-memory: `useArcadeRun` or `useQuickplayMatch` calls engine functions (`startRound`, `resolveRound`, `halftime`, etc.) and stores the resulting `MatchState` in React state.

---

## Data Layer

The service reads from a single Supabase Postgres database and owns no other data stores.

| Table | Role |
|---|---|
| `player_ratings` | Card pool — 296+ player rows with stats (overall, atk, def, cost, rarity, position, nation, worldCup year) |
| `campaign_teams` | AI opponent roster with formation, tier, and strength fields |
| `teams` | Team metadata |
| `tournaments` | Tournament reference data |
| `players` | Base player identity rows |
| `squad_members` | Squad membership join table |

All six tables carry RLS policies granting `SELECT` to the `anon` and `authenticated` roles; `INSERT`/`UPDATE`/`DELETE` are denied. The service-role key is used only in server-side seed scripts and must never appear in `VITE_*` env vars.

Local dev data originates from three committed CSVs in `supabase/seed/` (squads, ratings, campaign_teams) loaded via `pnpm seed`.

---

## Configuration

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | HTTPS base URL for the Supabase project (hosted) or `http://localhost:54321` (local Docker). Inlined at build time by Vite. |
| `VITE_SUPABASE_ANON_KEY` | Public anon key for PostgREST read access. Inlined at build time. Safe to expose to the browser — write access is blocked by RLS. |

No other environment variables are consumed by the production build. The local Docker stack (`pnpm supabase:start`) provides its own local demo values for both vars; no Supabase account is required for local development.

---

## Integrations

**Supabase Postgres** — the only external dependency. Accessed via the PostgREST REST API exposed by `@supabase/supabase-js`. In production, this is the hosted Supabase instance. In local development, `supabase start` runs the full Supabase stack in Docker. See [[data-layer-supabase]] for broader context on the data architecture decision.

No inbound webhooks, message buses, third-party auth providers, or server-to-server integrations exist. The app is purely a browser → Supabase read path.

---

## Service-Specific Patterns

**Pure functional engine state machine** — each engine function (`startRound`, `resolveRound`, `halftime`, `cleanupBoards`) takes immutable state plus a seeded `Rng` and returns new state. No side effects; deterministic replay is guaranteed by seeding `makeRng` with a fixed value in tests.

**Factory-function test fixtures** — engine unit tests build typed stubs via inline factory helpers (`makePlayerCard`, `makeOpp`) rather than external fixture files or snapshot serialization. This keeps test setup co-located and self-documenting.

**Lazy singleton data client** — `getSupabaseClient()` constructs and caches the Supabase client on first call. This avoids re-instantiating the PostgREST client on every repo call while remaining compatible with Vite's module graph.

**Paginated PostgREST collection** — `fetchPlayers` loops with a `while` guard rather than assuming a single page fits the dataset. The pattern is: issue query with `range`, accumulate results, break when fewer rows than page size are returned.

**Barrel re-export data surface** — `src/data/remote/index.ts` is the single import point for all repo functions, decoupling UI consumers from internal repo file layout.

**Duplicated orchestration hooks** — `useArcadeRun` and `useQuickplayMatch` are near-identical match-flow orchestrators. The duplication is a known structural smell (see [[match-orchestrators-duplicated]]); any engine-level fix must be applied to both hooks.
