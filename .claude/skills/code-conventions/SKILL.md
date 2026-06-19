---
name: code-conventions
description: Project-specific coding conventions, gotchas, and WRONG/CORRECT examples
disable-model-invocation: false
version: 1.0
---

# Code Conventions

## Naming Conventions

- Component files: PascalCase `.tsx` — `MyComponent.tsx`
- Stylesheet files: match the component name — `MyComponent.css`
- CSS class names: kebab-case — `.hero-banner`, not `.heroBanner`
- Asset files: kebab-case in `src/assets/` — `hero.png`, `logo-dark.svg`
- UI library components live under `src/ui/{atoms|molecules|organisms}/{Name}/` as `index.tsx` (one PascalCase dir per component) with the test co-located as `{Name}.test.tsx`; each layer has its own barrel (`atoms/index.ts`, …) re-exported from `src/ui/index.ts`

## Code-Style Conventions

- Use TypeScript for all source files; `.tsx` for files with JSX, `.ts` for pure logic
- Co-locate a component's CSS file beside the component file (same `src/` directory)
- Imports: third-party packages first, then local relative imports
- No default export barrel files — import components directly from their source file

## Gotchas

### Vite Static Asset Imports vs `public/`

Assets in `src/assets/` are processed and fingerprinted by Vite. Assets placed in `public/` are served as-is with no hashing.

```typescript
// WRONG — string path won't be fingerprinted and may 404 in production
const src = '/src/assets/hero.png';

// CORRECT — Vite resolves and fingerprints the asset at build time
import heroPng from './assets/hero.png';
const src = heroPng;
```

### `tsc -b` Required Before Deploy

The build script runs `tsc -b && vite build`. TypeScript errors that slip past the editor will block the build.

```bash
# WRONG — skips type checking, ships broken types
vite build

# CORRECT — type-check first, then bundle
tsc -b && vite build
```

### Relative imports inside `src/engine` carry the `.ts` extension

`tsconfig.app.json` sets `allowImportingTsExtensions`, and intra-engine relative imports MUST include the `.ts` suffix (e.g. `match.ts` imports `./rng.ts`). App-side (`.tsx`/`.ts` under `src/`) imports stay extensionless.

```typescript
// WRONG — resolves in the editor but is inconsistent with the engine files
import { makeRng } from "./rng";

// CORRECT
import { makeRng } from "./rng.ts";
```

### Engine code stays pure; all randomness flows through the seeded `Rng`

`src/engine/**` must not touch JSX, the DOM, or `Math.random()` — it is shared headless by both game modes. Take an `Rng` (seeded mulberry32) parameter and draw from it so runs stay reproducible.

```typescript
// WRONG — non-deterministic, breaks fixed-seed reproducibility tests
const pick = Math.floor(Math.random() * deck.length);

// CORRECT — deterministic given the seed
const pick = Math.floor(rng.next() * deck.length);
```

### Only the UI orchestration tier imports engine runtime; presentational components are `import type` only

`src/ui/` has two tiers. **Presentational** components (`atoms/` `molecules/` `organisms/`) must not pull engine runtime or data repos into the bundle — every `src/engine/**` reference is a type import, and they never touch `src/data/**`. **Orchestration** files (`src/ui/screens/{Name}/` stateful containers + `src/ui/{mode}/` hooks/helpers, e.g. `quickplay/useQuickplayMatch.ts`) are the *only* `src/ui/**` files allowed to import engine runtime (`makeRng`, `newMatch`, …) and Supabase repos.

```typescript
// WRONG — inside an organism: drags engine runtime + data layer into a presentational component
import { newMatch } from '../../../engine';
import { fetchPlayers } from '../../../data/remote/players.repo';

// CORRECT — organism borrows types only, erased at build time
import type { PlayerCard } from '../../../engine/types';

// CORRECT — orchestration tier (screens/ + {mode}/) may import runtime + repos
import { newMatch, makeRng } from '../../../engine';
import { fetchPlayers } from '../../../data/remote/players.repo';
```

### Drive an in-place-mutated engine MatchState through a ref + a separate state snapshot

The engine mutates `MatchState` in place; reading a ref during render is a React 19 error. In orchestration hooks, hold the live match in a `useRef` (mutated between ticks) and publish a shallow-cloned `useState` snapshot after each engine call so renders read stable data (`useQuickplayMatch.ts` `matchRef` + `matchSnapshot` is the reference).

```typescript
// WRONG — render reads the mutating ref; React flags it and the UI misses updates
return { match: matchRef.current };

// CORRECT — ref for mutation, snapshot for render-safe reads
const [snapshot, setSnapshot] = useState<MatchState | null>(null);
const sync = () => setSnapshot(matchRef.current ? { ...matchRef.current } : null);
resolveRound(matchRef.current, rng); sync();
```

### Only the Supabase anon key is browser-safe; never expose the service-role key

The browser client reads `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (Vite inlines `VITE_*` into the bundle). The service-role key bypasses RLS — it is server/seed-only and must never be a `VITE_*` var or committed.

```ts
// WRONG — inlined into the client bundle, leaks an RLS-bypassing key to every browser
const key = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// CORRECT — browser uses the anon key; seed/import scripts read SUPABASE_SERVICE_ROLE_KEY (non-VITE_, never committed)
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

### `src/data/**` may import the engine; the engine must never import `src/data/**`

The dependency arrow is one-way: data-layer mappers may pull engine types/constants (e.g. `PlayerCard`), but `src/engine/**` stays pure and self-contained — no import of `src/data/**` (which would drag the data/Supabase layer into the headless engine).

```ts
// WRONG — inside src/engine/**: couples the pure engine to the data layer
import { players } from "../data/players.ts";

// CORRECT — inside src/data/remote/mappers.ts: data borrows engine types
import type { PlayerCard } from "../../engine/types.ts";
```

### Framer Motion components must honor reduced motion

Any component with a non-trivial Framer Motion animation reads `useReducedMotion()` and degrades to a static/instant variant when it returns true — don't ship motion that ignores the OS preference.

```tsx
// WRONG — always animates regardless of OS setting
return <motion.div variants={goalBlast} animate="visible" />;

// CORRECT — branch on the preference
const shouldReduceMotion = useReducedMotion();
return <motion.div variants={shouldReduceMotion ? fadeIn : goalBlast} animate="visible" />;
```