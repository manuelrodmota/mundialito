---
document_type: service
summary: >-
  `mundialito-client` is a TypeScript single-page application responsible for
  delivering the entire user-facing frontend experience. Built on React 19.2.6
  and ...
last_updated: '2026-06-19T01:49:09.000Z'
tags:
  - service
  - typescript
  - frontend
  - react
service_id: mundialito-client
---
# mundialito-client

## Purpose

`mundialito-client` is a TypeScript single-page application responsible for delivering the entire user-facing frontend experience. Built on React 19.2.6 and served by Vite on port 5173 in development, it acts as a pure client-side SPA with no server-side rendering. The application hosts an interactive card/board game (World Cup Clash). Its source separates three pure-logic / presentation layers: `src/engine/` holds the canonical v10 domain types + tuning constants + a seeded PRNG (the match-resolution engine itself is to be built fresh from the GDD rules, **not** ported from the `design/` prototypes); `src/data/` holds the static game data (player pool, tactical catalog, opponent teams); and `src/ui/` holds the presentational React component library + design-token layer. The UI is presentational/stateless and imports `src/engine/` **types only** (`import type`) — it never depends on engine runtime behaviour.

---

## Public API / Surface

This service does not expose an HTTP API, queue topics, or webhooks — it is a browser-delivered frontend. Its "surface" consists of the assets and entry HTML served by Vite:

| Entry Point | Role |
|---|---|
| `src/main.tsx` | Root Vite entry; mounts the React component tree into the DOM |
| `src/App.tsx` | Top-level React component; application shell. Renders the `#ds` design-system gallery when the URL hash/query selects it, else the default scaffold (screen tickets replace the default) |
| `src/assets/` | Static assets fingerprinted by Vite at build time |
| `src/engine/index.ts` | Public surface of the pure TS engine layer (canonical v10 types, tuning constants, seeded RNG); match-resolution functions are pending the fresh-build engine |
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
  engine/           # Pure framework-agnostic TS (no DOM/I/O)
    types.ts        # canonical v10 data model
    constants.ts    # tuning knobs (xG curve, fatigue, caps, costs, formations)
    rng.ts          # seeded deterministic PRNG (mulberry32)
    index.ts        # public surface (types + constants + rng)
  data/             # Static game data, derived from the GDD
    players.ts / playerPool.ts   # 296 players + toPlayerCard derivation
    tacticals.ts                 # 19 tactical cards
    opponents.ts                 # 38 opponent teams
  ui/               # Presentational React component library + design-token layer
    tokens/         # ported CSS tokens + v8-ordered class CSS (index.css)
    data/nations.ts # shared nation flag-band map + crest sources
    jersey/         # per-nation procedural SVG kit (WCJersey, kitForNation)
    atoms/ molecules/ organisms/   # atomic-design component tree (+ co-located *.test.tsx)
    gallery/        # #ds living design-system gallery
    index.ts        # public barrel
```

A parallel `design/` directory at the repository root holds the iterative JSX prototypes + design system (`Board*.jsx`, `ds/DS*.jsx`, `jsx/Card2.jsx`, the jersey handoff). These files are **not part of the production Vite bundle** — they are the sanctioned look/feel source that `src/ui/` is ported from (the latest version is authoritative).

No router, auth wrapper, dependency-injection container, or background workers have been detected in the current `src/` files. No CI/CD pipeline configuration exists.

---

## Request Lifecycle

The lifecycle describes how a user's browser session initializes the application:

1. **Vite entry** (`src/main.tsx`) — Vite serves `index.html`, which loads the compiled JS bundle. `main.tsx` calls `ReactDOM.createRoot` to mount the React tree into the DOM.
2. **App shell** (`src/App.tsx`) — The root `App` component renders. No router or auth guard layer has been detected; screen selection is state/hash-driven.
3. **Screen selection** — `App.tsx` renders the `#ds` design-system gallery when the URL hash/query selects it, otherwise the default scaffold. The match-board screens and their engine wiring are out of scope until later tickets; the production `src/` tree no longer uses the prototype's `window.WCC_ENGINE` global.

---

## Data Layer

`mundialito-client` owns no server-side data stores, database collections, or message queues — it is a pure frontend application. All transient UI state is held in React component state within the browser session. The static game data (players, tacticals, opponents) is compiled in from `src/data/`. The `src/ui/` components are presentational/stateless — they receive their data via props; no game-match state object is held yet (engine wiring is a later ticket).

No IndexedDB, localStorage, or sessionStorage usage has been detected (not determined by analysis).

---

## Configuration

(no environment variables consumed)

The `structure_architecture` and `data_flows_integrations` analyzers found no `required_vars` or `infrastructure_services_hints` in the project inspection output. Vite's default behavior applies: the dev server runs on port 5173, and any `VITE_*` variables present in a `.env` file would be inlined at build time — but none are currently declared.

> **Open question:** It is unverified whether the app calls a backend API. If a `VITE_API_URL` or similar variable exists outside the scanned files, the configuration section above is incomplete.

---

## Integrations

**Inbound:** None detected. The application is served statically by Vite; no webhooks or inbound API calls are present.

**Outbound / runtime:** No network integrations. The production `src/` tree no longer relies on any `window.*` global (the `window.WCC_ENGINE` bridge was a `design/` prototype convention). Runtime dependencies are all in-bundle UI libraries: Framer Motion (animation), `@dnd-kit/core` (drag-to-lane), and `@fontsource-variable/inter` (typeface).

No `fetch`, `axios`, or API client patterns were found in the `src/` source files. Whether the application calls a backend REST or GraphQL endpoint cannot be confirmed from current analysis.

---

## Service-Specific Patterns

**Engine isolation** — The `src/ui/` component library is presentational/stateless and imports `src/engine/` **types only** (`import type`, erased at build). UI components never call engine runtime functions; values (cost, effect, etc.) arrive as props. The `window.WCC_ENGINE` global-bridge is a `design/` prototype convention only and does not appear in the production `src/` tree.

**Atomic-design component library** — `src/ui/` is organized atoms → molecules → organisms (each `ComponentName/index.tsx` + per-layer barrels), with a CSS **design-token layer** under `src/ui/tokens/` (ported `tokens.css` + the prototype's v8-ordered class CSS) and a per-nation procedural SVG jersey kit. A `#ds`-gated living gallery composes the real components for visual checking.

**Iterative prototype duplication** — The `design/` directory contains successive versions of the Board component + design-system files; the latest version is authoritative. These are the sanctioned look/feel source ported into `src/ui/`, not production bundle code.

**Co-located styles** — Component CSS lives beside its `.tsx` counterpart; app-wide design tokens + the prototype's class CSS are centralized in `src/ui/tokens/index.css` (imported once, in the v8 load order) rather than copied per component.

**Build-time type enforcement** — The build script is `tsc -b && vite build`, ensuring TypeScript compilation errors block the production bundle. Running `vite build` alone (without `tsc -b`) bypasses type checking and is considered incorrect per project convention.

**Vitest test harness** — Tests run on **Vitest + React Testing Library + jsdom** (`pnpm test`; `src/setupTests.ts`), with `*.test.ts(x)` co-located beside source. Coverage via `pnpm coverage` (v8 provider).
