---
name: multi-file-workflows
description: Ordered checklists for cross-cutting changes — add component, add page, etc.
disable-model-invocation: false
version: 1.0
---

# Multi-File Workflows

## Adding a New React Component

1. Create the component file at `src/{ComponentName}.tsx`
2. Create a matching stylesheet at `src/{ComponentName}.css`
3. Import the stylesheet inside the component file
4. Export the component and import it in the parent file

```tsx
// src/{ComponentName}.tsx
import './{ComponentName}.css';

interface {ComponentName}Props {
  // define props here
}

export function {ComponentName}({ }: {ComponentName}Props) {
  return <div className="{component-name}"></div>;
}
```

```css
/* src/{ComponentName}.css */
.{component-name} {
}
```

> **Gotcha**: Omitting the CSS import means styles never load — Vite only bundles CSS that is explicitly imported.

## Adding a New UI Library Component (`src/ui/`)

1. Pick the atomic layer (`atoms` / `molecules` / `organisms`) and create `src/ui/{layer}/{Name}/index.tsx`
2. Add the co-located test `src/ui/{layer}/{Name}/{Name}.test.tsx`
3. Re-export the component (and any public types) from that layer's barrel `src/ui/{layer}/index.ts` — `src/ui/index.ts` already re-exports each layer barrel, so no edit there
4. Reference engine shapes with `import type` only (see code-conventions); keep the component presentational/stateless
5. Run `npm run test` and `npm run build` — both must stay green

> **Gotcha**: A component not re-exported from its layer barrel is invisible to `src/ui/index.ts` consumers even though the file compiles — wire the barrel in the same change.

## Adding a Stateful Screen / Mode Flow (`src/ui/screens/` + `src/ui/{mode}/`)

Use this for data-aware containers that wire the engine + repos, NOT presentational components (those follow the workflow above).

1. Put pure orchestration in `src/ui/{mode}/` — a hook (`use{Mode}Match.ts`) and/or helper (`build{Mode}Deck.ts`). This tier is the ONLY `src/ui/**` place allowed to import engine runtime + Supabase repos (see code-conventions). Thread one seeded `makeRng` for determinism; take a `SupabaseClient` rather than calling `getSupabaseClient()` deep inside.
2. Create the screen container `src/ui/screens/{Name}/index.tsx` — it consumes the hook and renders presentational organisms (passing data down as props).
3. Add co-located tests: `src/ui/{mode}/{name}.test.ts(x)` for the hook/helper and `src/ui/screens/{Name}/{Name}.test.tsx` for the container (see testing-conventions — mock the Supabase client, seed the rng).
4. Re-export the screen from `src/ui/screens/index.ts` (`src/ui/index.ts` already `export *`s `./screens`, so no edit there).
5. Run `npm run test` and `npm run build` — both must stay green.

> **Gotcha**: keep engine runtime + data-repo imports out of the presentational organisms — if a `src/ui/{mode}/` or `screens/` import leaks into an `atoms/molecules/organisms` file you have crossed the tier boundary. The engine mutates `MatchState` in place, so the hook must publish a state snapshot (not the live ref) for render-safe reads (see code-conventions).

## Adding a New Static Asset

1. Place the file in `src/assets/{filename}`
2. Import it in the component that uses it (not via a string path)
3. Reference the imported value in JSX

```tsx
// src/SomeComponent.tsx
import myAsset from './assets/{filename}';

export function SomeComponent() {
  return <img src={myAsset} alt="description" />;
}
```

> **Gotcha**: Never use a raw string like `'/src/assets/...'` — the path won't survive Vite's production fingerprinting.

## Adding Engine Code

1. Add engine logic under `src/engine/{name}.ts` (pure TS — no JSX/DOM, no `Math.random()`); re-export any new public symbol from `src/engine/index.ts`
2. Add a co-located Vitest test `src/engine/{name}.test.ts` (see testing-conventions)
3. Use `.ts`-suffixed relative imports between engine files (see code-conventions)
4. Run `npm run test` and `npm run build` (`tsc -b && vite build`) — both must stay green

> **Gotcha**: engine behaviour must stay deterministic — thread a seeded `Rng` rather than reading `Math.random()`, and assert same-seed reproducibility in the co-located test (`src/engine/match.test.ts` is the reference).

## Adding a Supabase Data-Access Repo / Mapper (`src/data/remote/`)

1. (If the schema changed) add a migration under `supabase/migrations/{ts}_{name}.sql`, then `pnpm db:reset` + `pnpm db:types` to regenerate `src/data/remote/database.types.ts`
2. Add the repo/mapper at `src/data/remote/{name}.ts`, typed against the generated `Database` types; take a `SupabaseClient<Database>` as a parameter (don't call `getSupabaseClient()` inside)
3. Re-export the new public symbols from the barrel `src/data/remote/index.ts` (`src/data/index.ts` already `export *`s the barrel, so no edit there)
4. Add a co-located `src/data/remote/{name}.test.ts` that passes a mock client (see testing-conventions — never a live DB)
5. Run `npm run test` and `npm run build` — both must stay green with the Supabase stack down

> **Gotcha**: hand-edits to `database.types.ts` are lost on the next `pnpm db:types` — change the SQL migration and regenerate instead. A repo not re-exported from `remote/index.ts` is invisible to `src/data` consumers even though it compiles.