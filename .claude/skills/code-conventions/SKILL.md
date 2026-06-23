---
name: code-conventions
description: Project-specific coding conventions, tier discipline, and WRONG/CORRECT examples for World Cup Clash
disable-model-invocation: false
version: 1.0
---

# Code Conventions

## Tier Discipline

The codebase has four tiers with a strict unidirectional import rule: `ui` → `run` → `engine`. Data repos (`src/data/remote/`) may be imported by `ui` orchestration and `run`, never by `engine`.

Presentational UI components (atoms/molecules/organisms) may only import engine **types** (type-only imports). Screens and orchestration hooks may import the engine runtime.

```typescript
// WRONG — engine importing from a higher tier
// src/engine/match.ts
import { useArcadeRun } from '../ui/run/useArcadeRun';

// CORRECT — engine imports nothing outside engine/
// src/engine/match.ts
import type { MatchConfig } from './types';
```

## Naming Conventions

| Pattern | Convention |
| ------- | ---------- |
| React component directory | `PascalCase/index.tsx` |
| Engine / run / data module | `camelCase.ts` |
| Hook | `use{Name}.ts` |
| Supabase repo | `{name}.repo.ts` |
| CSS token file | `kebab-case.css` |

## Data Layer Rules

The browser uses only the **anon** Supabase key. The service-role key must never appear in any `VITE_*` variable or be committed.

```typescript
// WRONG — exposes service-role key to the browser bundle
const supabase = createClient(url, import.meta.env.VITE_SUPABASE_SERVICE_KEY);

// CORRECT
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
```

## Gotchas

### Match Orchestrators Must Stay in Sync

`useQuickplayMatch` and `useArcadeRun` are near-identical orchestrators. Any match-flow fix (xG computation, tactical gate, opponent deck build, power routing) must land in **both** files.

```typescript
// WRONG — fixed only one orchestrator
// src/ui/quickplay/useQuickplayMatch.ts
const xg = computeXg(atk, def); // updated

// src/ui/run/useArcadeRun.ts
const xg = legacyXg(atk, def);  // still stale
```

### Engine Must Use the Seeded RNG

Engine functions must be deterministic given the same seed. Never use `Math.random()` inside `src/engine/`.

```typescript
// WRONG
const roll = Math.random();

// CORRECT
import { nextFloat } from './rng';
const roll = nextFloat(rng);
```

## Code-Style Conventions

- Default to no comments; add one only when the WHY is non-obvious.
- Export engine, run, and data/remote public surfaces via their tier's `index.ts` barrel.
- Prefer `import type` for engine types in presentational components to enforce the tier boundary at the module level.