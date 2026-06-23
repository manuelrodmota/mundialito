---
name: testing-conventions
description: Project-specific testing conventions for Vitest + React Testing Library in World Cup Clash
disable-model-invocation: false
version: 1.0
---

# Testing Conventions

## Testing Philosophy

- Engine modules (`src/engine/`) get unit tests — they are pure functions and must be fully deterministic.
- UI components get RTL tests focused on user-visible behavior, not implementation details.
- Do not test Supabase database behavior in unit or component tests — mock the client at the call boundary.

## Unit Test Patterns

Co-locate engine tests with their module (`src/engine/{name}.test.ts`). Pass a fixed seed to make tests deterministic; never rely on `Math.random()`.

```typescript
// src/engine/xg.test.ts
import { describe, it, expect } from 'vitest';
import { addPressure } from './xg';

describe('addPressure', () => {
  it('clamps the meter at 1.0', () => {
    const result = addPressure({ meter: 0.9 }, 0.2);
    expect(result.meter).toBeLessThanOrEqual(1.0);
  });
});
```

## Component Test Patterns

Use React Testing Library. Query by role and visible text; avoid querying by class or internal structure.

```typescript
// src/ui/atoms/Button/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '.';

it('calls onClick when pressed', () => {
  const handler = vi.fn();
  render(<Button onClick={handler}>Confirm</Button>);
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
  expect(handler).toHaveBeenCalledOnce();
});
```

## What NOT to Mock

- **Seeded RNG functions** — pass a fixed seed instead; mocking hides non-determinism bugs.
- **Pure engine functions** — test them directly; mocking in orchestrator tests masks incorrect wiring.

## Fixture Conventions

- Co-locate test files with their module: `{name}.test.ts` next to `{name}.ts`.
- Component tests: `{Name}.test.tsx` inside the component directory alongside `index.tsx`.

## Coverage Expectations

Run `npm run coverage` for v8 coverage. The engine tier (`src/engine/`) is the highest-priority target; branch coverage on xG computation and stamina logic is the minimum bar.