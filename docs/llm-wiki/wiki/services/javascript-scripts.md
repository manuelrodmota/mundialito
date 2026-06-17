---
document_type: service
summary: >-
  The `javascript-scripts` service is the client-side SPA for the Mundialito
  card-game project. It is a pure browser application built with React 19,
  TypeScrip...
last_updated: '2026-06-15T00:42:43.827Z'
tags:
  - service
  - javascript
  - library
service_id: javascript-scripts
---
# Javascript Scripts

## Purpose

The `javascript-scripts` service is the client-side SPA for the Mundialito card-game project. It is a pure browser application built with React 19, TypeScript, and Vite 8. Its responsibility is rendering the game UI — squad selection, match board, and card interactions — and bridging between React component state and a JavaScript game engine exposed on `window.WCC_ENGINE`. There is no server-side rendering, no backend, and no routing layer; the service is a single-page client scaffold with an iterative series of board component prototypes (`Board.jsx` through `Board5.jsx`) that represent successive design experiments.

---

## Public API / Surface

As a library-typed frontend service, this project exposes no HTTP routes, webhooks, or queue topics. Its external surface is exactly the compiled static bundle that Vite emits.

**Developer-facing CLI commands** (source: `package.json`):

| Command | Purpose |
|---|---|
| `vite` | Start the Vite dev server with HMR (port 5173) |
| `tsc -b && vite build` | Type-check and produce an optimised production bundle |
| `eslint .` | Run ESLint across the entire source tree |

No exported library symbols are published to npm. The sole integration seam visible to the outside is the `window.WCC_ENGINE` global that the game engine is expected to populate before the React tree renders — this is the de-facto contract between the engine bundle and the UI layer.

---

## Internal Architecture

The source tree is minimal: `src/` holds seven files — `main.tsx` (Vite entry point), `App.tsx` (root component), companion CSS, and static assets under `src/assets/`. The design-time prototypes live in a separate `design/` directory containing JSX and JS variants of the board and engine.

The two architectural hubs identified by coupling analysis are:

- `design/jsx/Board5.jsx::Board5` — coupling score 145, the most evolved board prototype
- `design/js/engine4.js::reveal` — coupling score 125, the engine function that drives card reveal

No dependency-injection container, no repository layer, no middleware stack, and no background workers are present. State management is handled entirely through React's built-in hooks (`useState`, `useRef`, `useEffect`) inside individual components — no external state library (Redux, Zustand, Jotai, etc.) is in use.

---

## Request Lifecycle

Because this is a browser SPA, the "request" is the initial page load and subsequent user interactions:

1. **Bundle load** — The browser fetches the Vite-compiled JS/CSS bundle from the static host.
2. **Engine initialisation** — The game-engine script populates `window.WCC_ENGINE` before (or during) React bootstrap.
3. **React root mount** — `src/main.tsx` calls `ReactDOM.createRoot` and renders the top-level `<App />` component into the DOM.
4. **App render** — `src/App.tsx` renders the active view. No router or auth wrapper has been detected; navigation state (not determined by analysis) is managed locally.
5. **Board mount** — A `Board` component receives `squad`, `captainId`, `tuning`, `motion`, and `cardSize` props. On first render it calls `window.WCC_ENGINE.newMatch(squad, captainId, tuning)` and stores the match object in a `useRef`, preventing repeated engine instantiation across re-renders.
6. **User interaction** — Card taps, selection, and animation transitions drive a set of `useState` slices (`tossed`, `selected`, `anim`, `inspect`, `shake`). A `force` counter state is used to trigger imperative re-renders when the engine mutates game state outside React.
7. **Viewport resize** — A `useEffect` listener tracks `window.innerHeight` into a `vh` state slice, allowing the board to reflow when the browser viewport changes.

---

## Data Layer

There are no owned databases, queue topics, cache key prefixes, or object-store buckets. All mutable runtime state is ephemeral, held in React component state and the in-memory match object returned by `window.WCC_ENGINE.newMatch`. There is no persistence layer of any kind.

---

## Configuration

(no environment variables consumed)

No `.env` files, no `import.meta.env` reads, and no `process.env` references were detected in the client source tree. The Vite dev server port defaults to 5173.

---

## Integrations

**`window.WCC_ENGINE` (game engine global)** — The board components depend on a globally-scoped engine object. This is the only runtime integration the service has; if the engine script fails to load or does not populate `window.WCC_ENGINE`, the board cannot initialise a match.

**Backend API** — (not determined by analysis). The analysis found no `fetch`, `axios`, or API-client patterns in the client source. It is unresolved whether the application is purely static or calls a backend service. See `api-backend-url` verification item in the upstream analysis.

No message buses, third-party SDKs, or inbound webhooks are present.

---

## Service-Specific Patterns

**Ref-bridged imperative engine** — Game engine state lives outside React's ownership. Components hold a `useRef` to the match object and call engine methods directly; when the engine mutates, a `force`-counter state is incremented to schedule a re-render. This is an intentional escape hatch around React's data-flow model for the game loop.

**Iterative prototype series** — `Board.jsx` through `Board5.jsx` (300–489 lines each) and `engine1.js` through `engine4.js` form a progressive prototype ladder. Each iteration adds behaviour without replacing the prior version, indicating that design exploration is preferred over abstraction consolidation at this stage. Consumer agents querying component behaviour should prefer the highest-numbered variant (`Board5`, `engine4`) as the most current.

**Monolithic board component** — Each board variant accumulates all match state (`tossed`, `selected`, `anim`, `inspect`, `shake`, `dmgByCard`, `vh`) in a single component scope rather than distributing into child components or custom hooks. This is consistent with the prototype-first development mode observed.

**No test coverage** — No test runner (`jest`, `vitest`, or otherwise) is declared in `package.json`, and no test files exist in the source tree. The absence appears to be a current state of the project rather than an explicit architectural decision; see `mundialito-client-no-tests` verification item.

**Quality gates** — ESLint runs locally (`eslint .`) with `eslint-plugin-react-hooks` (Rules of Hooks enforcement) and `eslint-plugin-react-refresh` (component-export lint). TypeScript type-checking is integrated into the build command (`tsc -b`) but is not wired to a pre-commit hook or CI pipeline.
