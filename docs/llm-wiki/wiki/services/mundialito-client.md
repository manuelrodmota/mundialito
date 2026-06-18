---
document_type: service
summary: >-
  `mundialito-client` is a TypeScript single-page application responsible for
  delivering the entire user-facing frontend experience. Built on React 19.2.6
  and ...
last_updated: '2026-06-17T20:18:56.000Z'
tags:
  - service
  - typescript
  - frontend
  - react
service_id: mundialito-client
---
# mundialito-client

## Purpose

`mundialito-client` is a TypeScript single-page application responsible for delivering the entire user-facing frontend experience. Built on React 19.2.6 and served by Vite on port 5173 in development, it acts as a pure client-side SPA with no server-side rendering. The application hosts an interactive card/board game (World Cup Clash). The match rules now live in a pure, framework-agnostic TypeScript engine under `src/engine/` (a faithful port of the v8 prototype `design/js/engine8.js`); the React/board layer historically reads an externally injected `window.WCC_ENGINE` global, and the new `src/engine/` module is the shared, headless rules implementation both the eventual UI and the offline simulator consume.

---

## Public API / Surface

This service does not expose an HTTP API, queue topics, or webhooks — it is a browser-delivered frontend. Its "surface" consists of the assets and entry HTML served by Vite:

| Entry Point | Role |
|---|---|
| `src/main.tsx` | Root Vite entry; mounts the React component tree into the DOM |
| `src/App.tsx` | Top-level React component; application shell |
| `src/assets/` | Static assets fingerprinted by Vite at build time |
| `src/engine/index.ts` | Public surface of the pure TS v8 match engine (`newMatch`, round resolution, config/tuning, seeded RNG, types) consumed by the simulator and the future UI |
| `npm run sim` / `npm run sim:check` | CLI entry points (`tsx`) for the headless Monte-Carlo simulator and its fixed-seed reproducibility self-check |

---

## Internal Architecture

The `src/` tree now separates the React shell from pure game logic:

```
src/
  main.tsx          # Vite entry, ReactDOM.createRoot
  App.tsx           # Root component
  App.css           # App-scoped styles
  assets/           # Images and other static files
  engine/           # Pure framework-agnostic TS v8 match engine (no DOM/I/O)
    types.ts        # v8 data model
    config.ts       # DEFAULT_TUNING — every tunable knob (xG curve, fatigue, caps)
    rng.ts          # seeded deterministic PRNG (mulberry32)
    engine.ts       # match resolution (xG, fatigue, card flow, mercy/ET)
    index.ts        # public surface
  sim/              # Node-only headless Monte-Carlo simulator (excluded from the browser build)
    policies.ts     # deterministic decision policies (baseline = §18 AI heuristic)
    rosters.ts      # mock archetype decks × opponent tiers
    run.ts          # seeded Monte-Carlo runner → console summary + results.csv + summary.json
    selfcheck.ts    # fixed-seed reproducibility self-check
```

A parallel `design/` directory at the repository root holds iterative JSX prototypes (`Board.jsx` through `Board5.jsx`, 300–489 lines each). These files are not part of the production Vite bundle — they appear to be workbench prototypes that have evolved independently of the `src/` tree.

No router, auth wrapper, dependency-injection container, or background workers have been detected in the current `src/` files. No CI/CD pipeline configuration exists.

---

## Request Lifecycle

The lifecycle describes how a user's browser session initializes the application:

1. **Vite entry** (`src/main.tsx`) — Vite serves `index.html`, which loads the compiled JS bundle. `main.tsx` calls `ReactDOM.createRoot` to mount the React tree into the DOM.
2. **App shell** (`src/App.tsx`) — The root `App` component renders. No router or auth guard layer has been detected at this level.
3. **Game engine hydration** — Board components (in `design/`) access `window.WCC_ENGINE` on first render, calling `E.newMatch(...)` and storing the result in a `useRef`. React state slices then drive re-renders in response to game events.

Whether `App.tsx` renders a Board component directly or via lazy routing is (not determined by analysis) from the current `src/` file count alone.

---

## Data Layer

`mundialito-client` owns no server-side data stores, database collections, or message queues — it is a pure frontend application. All transient UI state is held in React component state and refs within the browser session. The game match state is maintained in a mutable object returned by `window.WCC_ENGINE.newMatch(...)` and pinned to a `useRef` inside Board components.

No IndexedDB, localStorage, or sessionStorage usage has been detected (not determined by analysis).

---

## Configuration

(no environment variables consumed)

The `structure_architecture` and `data_flows_integrations` analyzers found no `required_vars` or `infrastructure_services_hints` in the project inspection output. Vite's default behavior applies: the dev server runs on port 5173, and any `VITE_*` variables present in a `.env` file would be inlined at build time — but none are currently declared.

> **Open question:** It is unverified whether the app calls a backend API. If a `VITE_API_URL` or similar variable exists outside the scanned files, the configuration section above is incomplete.

---

## Integrations

**Inbound:** None detected. The application is served statically by Vite; no webhooks or inbound API calls are present.

**Outbound / runtime:** The only detected external dependency at runtime is `window.WCC_ENGINE` — a game engine object expected to be available on the global `window` before Board components render. How and when this global is injected (inline script, CDN asset, or a sibling bundle entry) is (not determined by analysis).

No `fetch`, `axios`, or API client patterns were found in the `src/` source files. Whether the application calls a backend REST or GraphQL endpoint cannot be confirmed from current analysis.

---

## Service-Specific Patterns

**Global-bridge pattern** — Game engine state is not managed through React context or a state library. Instead, `window.WCC_ENGINE` is read directly inside Board components. A `useRef` anchors the match object across re-renders, and a `useState` counter (`force`) is incremented to trigger re-renders when the engine mutates state outside of React's awareness.

**Iterative prototype duplication** — The `design/` directory contains five successive versions of the Board component (`Board.jsx` through `Board5.jsx`). Each version is a full standalone copy rather than a shared abstraction, consistent with a rapid-prototyping workflow where the latest version is the authoritative one. The hub-node analysis confirms `Board5` (coupling score 145) and the `reveal` function in `engine4.js` (score 125) are the current hotspots in that lineage.

**Co-located styles** — CSS files live beside their `.tsx` counterparts in `src/`. There is no global design-token file or CSS-in-JS library; styles are component-scoped by convention.

**Build-time type enforcement** — The build script is `tsc -b && vite build`, ensuring TypeScript compilation errors block the production bundle. Running `vite build` alone (without `tsc -b`) bypasses type checking and is considered incorrect per project convention.

**No test suite** — No test runner (`jest`, `vitest`, etc.) appears in `package.json` devDependencies, and no test files exist in the `src/` tree. Whether this is intentional or a planned addition is (not determined by analysis).
