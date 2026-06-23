---
name: multi-file-workflows
description: Ordered checklists for cross-cutting changes in World Cup Clash
disable-model-invocation: false
version: 1.0
---

# Multi-File Workflows

## Adding a New UI Screen

1. Create screen container at `src/ui/screens/{Name}/index.tsx`
2. Create orchestration hook at `src/ui/{mode}/use{Name}.ts` if the screen is stateful
3. Wire the route in the app router

```typescript
// src/ui/screens/NewScreen/index.tsx
import type { FC } from 'react';

export const NewScreen: FC = () => {
  return <div />;
};
```

## Adding a New Engine Feature

1. Create or modify the module at `src/engine/{name}.ts`
2. Export the new symbol via `src/engine/index.ts`
3. Add a co-located test at `src/engine/{name}.test.ts`
4. Update **both** `src/ui/quickplay/useQuickplayMatch.ts` **and** `src/ui/run/useArcadeRun.ts`

> **Gotcha**: Skipping step 4 leaves one game mode broken. The two orchestrators must always stay in sync.

```typescript
// src/engine/newFeature.ts
export function computeNewFeature(input: FeatureInput): FeatureOutput {
  // pure, deterministic — no Math.random(), no side effects
}
```

## Adding a New Supabase Table

1. Create migration at `supabase/migrations/{timestamp}_{name}.sql`
2. Run `pnpm db:reset` to apply it locally
3. Run `pnpm db:types` to regenerate `src/data/remote/database.types.ts`
4. Create repo at `src/data/remote/{name}.repo.ts`
5. Export from `src/data/remote/index.ts`

```typescript
// src/data/remote/{name}.repo.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export async function fetch{Name}(client: SupabaseClient<Database>) {
  const { data, error } = await client.from('{table}').select('*');
  if (error) throw error;
  return data;
}
```

## Adding a New UI Component

1. Create at `src/ui/{atoms|molecules|organisms}/{Name}/index.tsx`
2. Add co-located test at `src/ui/{atoms|molecules|organisms}/{Name}/{Name}.test.tsx`
3. Export from the tier barrel if consumed outside the tier

```typescript
// src/ui/atoms/NewAtom/index.tsx
import type { FC } from 'react';

interface Props {
  children: React.ReactNode;
}

export const NewAtom: FC<Props> = ({ children }) => {
  return <span>{children}</span>;
};
```