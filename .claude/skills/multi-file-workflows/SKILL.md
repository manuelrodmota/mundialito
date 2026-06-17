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