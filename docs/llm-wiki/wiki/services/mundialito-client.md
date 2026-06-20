---
document_type: service
summary: >-
  `mundialito-client` is a TypeScript single-page application responsible for
  delivering the entire user-facing frontend experience. Built on React 19.2.6
  and ...
last_updated: '2026-06-20T17:20:19.000Z'
tags:
  - service
  - typescript
  - frontend
  - react
service_id: mundialito-client
---
# mundialito-client

## Purpose

`mundialito-client` is a TypeScript single-page application responsible for delivering the entire user-facing frontend experience. Built on React 19.2.6 and served by Vite on port 5173 in development, it acts as a pure client-side SPA with no server-side rendering. The application hosts an interactive card/board game (World Cup Clash). Its source separates four pure-logic / presentation layers: `src/engine/` holds the canonical v10 domain types + tuning constants + a seeded PRNG, plus the full match-resolution engine + opponent AI — built fresh from the GDD rules, **not** ported from the `design/` prototypes (xG scoring, the effective-stats fold, fatigue, card flow, lineup validation, lane commit/reveal, tactical resolution, statuses, momentum, win/golden-goal ET, the `resolveRound` state machine, and the AI heuristic); `src/run/` holds a framework-agnostic run-orchestration tier (Arcade Run state machine, matchmaking, rewards) that reuses the engine per stage and may import engine types + static `data/`; `src/data/` holds the static game data (player pool, tactical catalog, opponent teams); and `src/ui/` holds the presentational React component library + design-token layer. The UI is presentational/stateless and imports `src/engine/` **types only** (`import type`) — it never depends on engine runtime behaviour.

---

## Public API / Surface

This service does not expose an HTTP API, queue topics, or webhooks — it is a browser-delivered frontend. Its "surface" consists of the assets and entry HTML served by Vite:

| Entry Point | Role |
|---|---|
| `src/main.tsx` | Root Vite entry; mounts the React component tree into the DOM |
| `src/App.tsx` | Top-level React component; application shell. Renders the `#ds` design-system gallery when the URL hash/query selects it, else drives a **screen-state machine** (`Screen` union + `useState`, no router) whose default screen is the `MainMenu` mode-select; imports the DS tokens (`src/ui/tokens/index.css`) at the root |
| `src/assets/` | Static assets fingerprinted by Vite at build time |
| `src/engine/index.ts` | Public surface of the pure TS engine layer: canonical v10 types, tuning constants, seeded RNG, and the match-resolution API — `newMatch` / `startRound` / `resolveRound` / `halftime` / `beginExtraTime` / `checkWin` / `decideTurn` plus pure helpers (`xgAdd`, `validLineup`, `laneStamina`), all deterministic given a seed |
| `src/data/index.ts` | Barrel for the static game data (players, tacticals, opponents) + `toPlayerCard` derivation |
| `src/ui/index.ts` | Public barrel of the presentational component library (atoms/molecules/organisms, jersey kit, design-system gallery) |

---

## Internal Architecture

The `src/` tree now separates the React shell from pure game logic:

```
src/
  main.tsx          # Vite entry, ReactDOM.createRoot
  App.tsx           # Root component; #ds gallery gate
  App.css           # App-scoped styles
  setupTests.ts     # Vitest + React Testing Library / jsdom setup
  assets/           # Images and other static files
  engine/           # Pure framework-agnostic TS (no DOM/I/O); deterministic given a seed
    types.ts        # canonical v10 data model
    constants.ts    # tuning knobs (xG curve, fatigue, caps, costs, formations)
    rng.ts          # seeded deterministic PRNG (mulberry32)
    xg.ts effectiveStats.ts synergies.ts fatigue.ts   # per-round scoring fold
    cards.ts validateLineup.ts board.ts               # card flow, cap/stamina, lane reveal
    tacticals.ts status.ts momentum.ts checkWin.ts    # tacticals, statuses, momentum, win/ET
    match.ts        # state machine: newMatch / startRound / resolveRound / halftime / beginExtraTime
    ai.ts           # opponent AI heuristic (decideTurn)
    index.ts        # public surface (types + constants + rng + match-engine API)
  run/              # Pure framework-agnostic TS Arcade Run tier (reuses the engine per stage)
    runState.ts matchmaking.ts rewards.ts   # 7-stop ladder + permadeath, tier-gated draw, rarity rewards
    index.ts        # public surface
  data/             # Game data layer
    remote/         # typed Supabase access (client, database.types, derive, mappers, players.repo, opponents.repo) — primary source
    players.ts / playerPool.ts   # static fallback pool + shared toPlayerCard derivation
    tacticals.ts                 # 19 tactical cards (static — not in the CSVs)
    opponents.ts                 # static fallback opponent teams
  ui/               # Presentational React component library + design-token layer
    tokens/         # ported CSS tokens + class CSS consolidated into css/v9.css (index.css)
    data/nations.ts # shared nation flag-band map + crest sources
    jersey/         # per-nation procedural SVG kit (WCJersey, kitForNation)
    atoms/ molecules/ organisms/   # presentational atomic-design tree (import type only — never engine runtime)
    screens/        # stateful, data-aware screens: DeckBuilder, DifficultyPicker, Quickplay, Arcade (run shell), RunMap, LockerRoom, RunSummary, ResultScreen
    quickplay/      # orchestration tier: useQuickplayMatch hook + buildQuickplayDeck (engine RUNTIME + Supabase repos)
    run/            # orchestration tier: useArcadeRun hook — the Arcade Run island (engine RUNTIME + src/run logic + static data)
    gallery/        # #ds living design-system gallery
    index.ts        # public barrel
```

**Tier rule:** presentational components (`atoms`/`molecules`/`organisms`) import `src/engine` **types only**; the **orchestration tier** (`src/ui/quickplay/` + `src/ui/run/` hooks/helpers + `src/ui/screens/` containers, plus the pure-TS `src/run/` tier) is the deliberate integration layer that imports the engine runtime API + the Supabase repos / static data and feeds `MatchState` to the board via props.

A parallel `design/` directory at the repository root holds the iterative JSX prototypes + design system (`Board*.jsx`, `ds/DS*.jsx`, `jsx/Card2.jsx`, the jersey handoff). These files are **not part of the production Vite bundle** — they are the sanctioned look/feel source that `src/ui/` is ported from (the latest version is authoritative).

No router, auth wrapper, dependency-injection container, or background workers have been detected in the current `src/` files. No CI/CD pipeline configuration exists.

---

## Request Lifecycle

The lifecycle describes how a user's browser session initializes the application:

1. **Vite entry** (`src/main.tsx`) — Vite serves `index.html`, which loads the compiled JS bundle. `main.tsx` calls `ReactDOM.createRoot` to mount the React tree into the DOM.
2. **App shell** (`src/App.tsx`) — The root `App` component renders. No router or auth guard layer has been detected; screen selection is state/hash-driven.
3. **Screen selection** — `App.tsx` renders the `#ds` design-system gallery when the URL hash/query selects it; otherwise a top-level **screen-state machine** (a `Screen` union driven by `useState`, **no router**) selects the active screen, defaulting to the `MainMenu` mode-select. **Two complete loops now exist.** `MainMenu → Quickplay` mounts the `src/ui/screens/Quickplay` container (deck builder → difficulty picker → match board → result) driven by the `useQuickplayMatch` hook. `MainMenu → Arcade Run` (no longer gated) mounts the `src/ui/screens/Arcade` shell driven by the `useArcadeRun` hook — a 7-match knockout run routing XI-builder → Run Map → match board → Locker Room → Run Summary/Trophy, reusing the same engine per stage (`newMatch(..., "run")`) plus the pure-TS `src/run/` tier (run-state, matchmaking, rewards). Both hooks call `newMatch`/`startRound`/`resolveRound`/`decideTurn` and thread one seeded `Rng`. Collection / How-to-Play still route to a reusable `PlaceholderScreen`. The production `src/` tree no longer uses the prototype's `window.WCC_ENGINE` global.

---

## Data Layer

The player/team reference data is owned by a **Supabase Postgres database** (tables `teams` / `tournaments` / `players` / `player_ratings` [card pool] / `squad_members` / `campaign_teams`), seeded from `supabase/seed/*.csv` and read **read-only** by the browser via PostgREST. `src/data/remote/` holds the typed access layer (repositories + DB→`PlayerCard`/`OpponentTeam` mappers); `src/data/tacticals.ts` and a static fallback pool stay compiled in. Transient UI state is still held in React component state; `src/ui/` components are presentational/stateless (data via props).

No client-side IndexedDB/localStorage/sessionStorage is used; persistence is the remote Supabase DB only.

---

## Configuration

The client consumes two `VITE_*` env vars (inlined by Vite at build): **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_ANON_KEY`** — the Supabase endpoint + the read-only anon key. They are documented in `.env.example` (with the local-stack defaults from `supabase start`); real values live in `.env.local` (git-ignored). The **service-role key is never a `VITE_*` var** — it is used only locally/server-side by the seed/import script (`SUPABASE_SERVICE_ROLE_KEY`). The dev server still runs on port 5173; the local Supabase stack runs on 54421–54427.

---

## Integrations

**Inbound:** None detected. The application is served statically by Vite; no webhooks or inbound API calls are present.

**Outbound / runtime:** **Supabase** — the browser calls the Supabase PostgREST API (read-only, anon key) via `@supabase/supabase-js` from `src/data/remote/client.ts` for player/team data. This is the only network integration. Other runtime deps are in-bundle UI libraries (Framer Motion, `@dnd-kit/core`, `@fontsource-variable/inter`); the `window.WCC_ENGINE` bridge was a retired `design/` prototype convention.

---

## Service-Specific Patterns

**Engine isolation** — The `src/ui/` component library is presentational/stateless and imports `src/engine/` **types only** (`import type`, erased at build). UI components never call engine runtime functions; values (cost, effect, etc.) arrive as props. The `window.WCC_ENGINE` global-bridge is a `design/` prototype convention only and does not appear in the production `src/` tree.

**Atomic-design component library** — `src/ui/` is organized atoms → molecules → organisms (each `ComponentName/index.tsx` + per-layer barrels), with a CSS **design-token layer** under `src/ui/tokens/` (ported `tokens.css` + the prototype's v8-ordered class CSS) and a per-nation procedural SVG jersey kit. A `#ds`-gated living gallery composes the real components for visual checking.

**Iterative prototype duplication** — The `design/` directory contains successive versions of the Board component + design-system files; the latest version is authoritative. These are the sanctioned look/feel source ported into `src/ui/`, not production bundle code.

**Co-located styles** — Component CSS lives beside its `.tsx` counterpart; app-wide design tokens + the prototype's class CSS are centralized in `src/ui/tokens/index.css` (imported once, in the v8 load order) rather than copied per component.

**Build-time type enforcement** — The build script is `tsc -b && vite build`, ensuring TypeScript compilation errors block the production bundle. Running `vite build` alone (without `tsc -b`) bypasses type checking and is considered incorrect per project convention.

**Vitest test harness** — Tests run on **Vitest + React Testing Library + jsdom** (`pnpm test`; `src/setupTests.ts`), with `*.test.ts(x)` co-located beside source. Coverage via `pnpm coverage` (v8 provider).
