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

### `src/ui/**` components are presentational and import the engine via `import type` only

UI components must not pull engine runtime code into the bundle — they only borrow its types. Every reference to `src/engine/**` from `src/ui/**` is a type import.

```typescript
// WRONG — drags engine runtime into the UI bundle
import { PlayerCard } from '../../../engine/types';

// CORRECT — types only, erased at build time
import type { PlayerCard } from '../../../engine/types';
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