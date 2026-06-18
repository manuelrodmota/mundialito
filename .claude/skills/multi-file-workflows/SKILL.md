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

## Adding Engine or Node-Sim Code

1. Add engine logic under `src/engine/{name}.ts` (pure TS — no JSX/DOM); re-export any new public symbol from `src/engine/index.ts`
2. Add Node-only harness code under `src/sim/{name}.ts`
3. Use `.ts`-suffixed relative imports between these files (see code-conventions)
4. Keep `src/sim` listed in the `exclude` of `tsconfig.app.json` and covered by `tsconfig.sim.json` (referenced from root `tsconfig.json`)
5. Run `npm run build` (`tsc -b && vite build`) and `npm run sim:check` — both must stay green

> **Gotcha**: `src/sim/**` imports `node:` modules and must never enter the browser bundle. If it is not excluded in `tsconfig.app.json`, `tsc -b` fails because the app project lacks `types: ["node"]`.