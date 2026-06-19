---
name: testing-conventions
description: Project-specific testing conventions, fixtures, mocking rules, and examples
disable-model-invocation: false
version: 1.0
---

# Testing Conventions

## Testing Philosophy

Tests run on **Vitest** with **React Testing Library** in a **jsdom** environment. Config lives in `vitest.config.ts` (globals on, `setupFiles: ['./src/setupTests.ts']` which loads `@testing-library/jest-dom`, v8 coverage). Run with `npm run test` (once), `npm run test:watch`, or `npm run coverage`.

## Test Placement

- **Co-locate** each component test beside its source: `src/ui/{layer}/{Name}/{Name}.test.tsx` next to `index.tsx` — do NOT use a central `src/__tests__/` directory
- Vitest discovers `src/**/*.test.ts` and `src/**/*.test.tsx`

## Unit Test Patterns

```tsx
// src/ui/atoms/{Name}/{Name}.test.tsx
import { render, screen } from '@testing-library/react';
import { {Name} } from './index';

describe('{Name}', () => {
  it('renders expected content', () => {
    render(<{Name} />);
    expect(screen.getByRole('...')).toBeInTheDocument();
  });
});
```

When asserting reduced-motion behaviour, mock the hook rather than the OS query:

```tsx
vi.mock('framer-motion', async (orig) => ({
  ...(await orig<typeof import('framer-motion')>()),
  useReducedMotion: () => true,
}));
```

## Engine Reproducibility Check

The match engine is deterministic given a seed. Assert this with co-located Vitest tests (`src/engine/{name}.test.ts`), not an ad-hoc harness — run two identical seeded runs and `toEqual` the results (`src/engine/match.test.ts` "fixed-seed determinism: same seed → byte-identical final state" and `src/engine/rng.test.ts` are the references).

```ts
// src/engine/match.test.ts — run the same seed twice, assert deep-equal final state
const m1 = runFullMatch(123);
const m2 = runFullMatch(123);
expect(m1).toEqual(m2);
```

- Always thread the same seeded `Rng` through a run; never read `Math.random()` in engine code (it breaks reproducibility)
- When adding engine behaviour, extend the co-located test to assert the new output field stays stable across identical seeds

## Data Layer (Supabase) Tests Mock the Client — Never Hit a Live DB

Repository tests (`src/data/remote/*.repo.test.ts`) must pass with the Supabase stack down, so `npm run test` stays green in CI/local with no Docker. Pass a hand-rolled mock `SupabaseClient` (chainable `vi.fn().mockReturnThis()` query builder, terminal method resolves `{ data, error }`) into the repo function — never the real `getSupabaseClient()`. Pure mapper/derive tests need no client at all.

```ts
// src/data/remote/players.repo.test.ts — mock the query builder, assert mapped output
const client = {
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({ data: rows, error: null }),
  }),
} as unknown as SupabaseClient<Database>;
expect(await fetchPlayers(client)).toEqual(/* mapped PlayerCards */);
```

## Mode-Flow Integration Tests Run the Real Engine — Fixed Seed, Static Opponent, No Supabase

A mode's orchestration tier (`src/ui/{mode}/`) gets a fixed-seed integration test that drives the *real* engine end-to-end with no mocks of game logic and no live data: build the deck with `build{Mode}Deck`, pick a `data/opponents` static opponent, and loop `startRound → decideTurn → resolveRound` to a decisive result (`quickplayFlow.test.tsx` is the reference). Assert a winner is reached (`winner` not null, `=== 0 || === 1` — no draw), it bounds within max rounds (guard against infinite loops), and the same seed reproduces identical goals. Screen-container tests, by contrast, still mock the Supabase client and seed the rng (see the data-layer rule above).

```tsx
// src/ui/{mode}/{mode}Flow.test.tsx — real engine, fixed seed, static opponent
const m1 = runMatchToEnd(FIXED_SEED);
expect(m1.winner === 0 || m1.winner === 1).toBe(true); // decisive, no draw
expect(runMatchToEnd(FIXED_SEED).players[0]!.goals).toBe(m1.players[0]!.goals); // reproducible
```

## Coverage Expectations

- No coverage gate exists today — establish one when the first test file is added
- Prioritise testing user-visible behaviour over implementation details