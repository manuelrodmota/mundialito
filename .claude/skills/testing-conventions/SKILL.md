---
name: testing-conventions
description: Project-specific testing conventions, fixtures, mocking rules, and examples
disable-model-invocation: false
version: 1.0
---

# Testing Conventions

## Testing Philosophy

No test runner is currently configured in this project. When a test suite is added, the recommendation is **Vitest** (first-party Vite integration, same config as the build tool) with **React Testing Library** for component tests.

## Planned Setup (add when ready)

Install:

```bash
npm install -D vitest @testing-library/react @testing-library/user-event jsdom
```

`vite.config.ts` extension:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
  },
});
```

## Unit Test Patterns (target convention)

```tsx
// src/__tests__/{ComponentName}.test.tsx
import { render, screen } from '@testing-library/react';
import { {ComponentName} } from '../{ComponentName}';

describe('{ComponentName}', () => {
  it('renders expected content', () => {
    render(<{ComponentName} />);
    expect(screen.getByRole('...')).toBeInTheDocument();
  });
});
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