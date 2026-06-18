---
document_type: architecture
summary: >-
  This repository is a **single-service polyrepo** — there is no monorepo
  tooling, no workspaces, and no sibling packages. The entire project is a pure
  client-...
last_updated: '2026-06-17T20:18:56.000Z'
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

The top-level layout is minimal. Application source lives under `src/`: the React entry point, one top-level component, CSS, and static assets, plus two pure-logic subdirectories added for the game engine — `src/engine/` (a framework-agnostic TypeScript match engine, no DOM/JSX) and `src/sim/` (a Node-only Monte-Carlo simulator harness, excluded from the browser build). No backend, no shared library packages, and no sub-workspace directories exist in the repository root.

| Workspace / Directory | Contents |
|-----------------------|----------|
| `src/` | React components, stylesheets, entry point, static assets |
| `src/assets/` | Static asset files (images, fonts, etc.) |
| `src/engine/` | Pure framework-agnostic TS v8 match engine (no DOM/I/O); public surface via `index.ts`; type-checked by the browser app project |
| `src/sim/` | Node-only headless Monte-Carlo match simulator (policies, seeded runner, rosters, self-check); own `tsconfig.sim.json` project; `out/` git-ignored |
| `public/` | (not determined by analysis) |

---

## Service Inventory

| ID | Type | Language | Port | Role |
|----|------|----------|------|------|
| [[mundialito-client]] | frontend | TypeScript 6.0.2 | 5173 | React 19 SPA served by Vite dev server |

The `javascript-scripts` group identified by static analysis is a library-type artefact comprised of 40 JavaScript files found in the repository (likely design prototypes or build artefacts in `design/`). It is not a deployable service and has no dedicated port or entry point.

---

## Service Communication

This project is a pure frontend SPA with no server-side code and no inter-service calls within the repository. There is one service boundary: the browser running mundialito-client.

Any communication to a backend API would cross that single boundary as outbound HTTP/HTTPS requests from the browser. No such calls have been identified by static analysis of the current source at the time of writing.

| Source | Target | Protocol | Data Shape |
|--------|--------|----------|------------|
| (not determined by analysis) | (not determined by analysis) | (not determined by analysis) | (not determined by analysis) |

---

## External Integrations

No external vendor integrations, third-party SDKs, or API client wrappers have been identified in the codebase. The dependency manifest (`package.json`) declares only Vite, React 19, TypeScript, and ESLint toolchain packages.

| Vendor | Client Wrapper Path | Auth Mechanism | Environments |
|--------|---------------------|----------------|--------------|
| (not determined by analysis) | — | — | — |

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

The application has no data layer. There is no ORM, no local database (IndexedDB, localStorage abstraction, SQLite WASM, etc.), and no dedicated state management library. All state is local to React components using built-in primitives (`useState`, `useContext`, `useReducer`). There are no queues, caches, or object stores.

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
| `tsc -b && vite build` | Type-check (app + node + sim projects) and emit production bundle to `dist/` | CI build, release |
| `eslint .` | Run ESLint across the whole repository | Pre-commit, CI lint step |
| `npm run sim` | Run the headless Monte-Carlo match simulator (`tsx src/sim/run.ts`; `SIM_N` / `SIM_OUT` env vars) | Balance tuning |
| `npm run sim:check` | Fixed-seed reproducibility self-check (`tsx src/sim/selfcheck.ts`) | Engine regression check |

The TypeScript build is split into three referenced projects: `tsconfig.app.json` (browser SPA + `src/engine/`), `tsconfig.node.json` (Vite config), and `tsconfig.sim.json` (Node-only `src/sim/`). `src/sim/**` is excluded from the app project so the Node-only simulator never breaks the browser type-check/bundle.

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
