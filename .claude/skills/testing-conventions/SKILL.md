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

The match engine is deterministic given a seed. Verify engine/sim changes with the fixed-seed self-check rather than ad-hoc runs:

```bash
npm run sim:check   # runs the same seeded match twice, asserts byte-identical results + stable RNG sequence
```

- Always thread the same seeded `Rng` through a run; never read `Math.random()` in engine/sim code (it breaks reproducibility)
- When adding engine behaviour, extend `src/sim/selfcheck.ts` to assert the new output field stays stable across identical seeds

## Coverage Expectations

- No coverage gate exists today — establish one when the first test file is added
- Prioritise testing user-visible behaviour over implementation details