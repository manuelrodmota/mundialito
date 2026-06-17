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