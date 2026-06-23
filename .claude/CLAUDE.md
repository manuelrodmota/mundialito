# mundialito-client

## Tech Stack

- **pnpm** — package manager

- **mundialito-client** (TypeScript) — React 19.2.6 + Vite 8, Framer Motion ^12.40.0, dnd-kit ^6.3.1, @supabase/supabase-js ^2.108.2

## File Placement Guide

| File Type | Location Pattern | Example |
| --------- | ---------------- | ------- |
| React screen (stateful container) | `src/ui/screens/{Name}/index.tsx` | `src/ui/screens/Quickplay/index.tsx` |
| React organism component | `src/ui/organisms/{Name}/index.tsx` | `src/ui/organisms/MatchBoard/index.tsx` |
| React atom component | `src/ui/atoms/{Name}/index.tsx` | `src/ui/atoms/Button/index.tsx` |
| Match engine module (pure TS) | `src/engine/{name}.ts` | `src/engine/rng.ts` |
| Engine unit test | `src/engine/{name}.test.ts` | `src/engine/match.test.ts` |
| Run orchestration hook | `src/ui/run/{name}.ts` | `src/ui/run/useArcadeRun.ts` |
| Quickplay orchestration hook | `src/ui/quickplay/{name}.ts` | `src/ui/quickplay/useQuickplayMatch.ts` |
| Supabase data repo | `src/data/remote/{name}.ts` | `src/data/remote/players.repo.ts` |
| CSS design tokens | `src/ui/tokens/{name}.css` | `src/ui/tokens/index.css` |
| Design system gallery | `src/ui/gallery/{Name}.tsx` | `src/ui/gallery/DesignSystemGallery.tsx` |

## Directory Structure

```
project/
└── src/
    ├── data/  # Supabase data repo
    ├── engine/  # Match engine module (pure TS), Engine unit test
    └── ui/  # React screen (stateful container), React organism compone…
```

## Essential Commands

| Command | Description |
| ------- | ----------- |
| `pnpm db:reset` | From README.md § How to Run It Locally |
| `pnpm seed` | From README.md § How to Run It Locally |
| `pnpm dev` | From README.md § How to Run It Locally |
| `vitest run` | Run tests (_root) |
| `tsc -b && vite build` | Build (_root) |
| `eslint .` | Run linters (_root) |

### Per-service commands (low-level)

> Prefer the wrapper above when present; these run a single service in isolation and may not start dependent services.

| Service | Start dev environment |
| ------- | --- |
| _root | `vite` |

## Services & Ports

| Service | Type | Port | Role |
| ------- | ---- | ---- | ---- |
| mundialito-client | frontend | 5173 | React frontend |
| supabase-postgres | database | — (SaaS — accessed via HTTPS to Supabase hosted API using anon key; local dev uses Docker-managed Supabase stack with no fixed port in project config) | supabase-postgres |

<!-- LLM_WIKI_START -->
## LLM Wiki
- Router (entry point): `docs/llm-wiki/CLAUDE.md` — decision table, tier discipline, available graph tools. **Read this first.**
- Index (summary catalog): `docs/llm-wiki/wiki/index.md` — one line per page; pick the 1–3 pages whose summaries match your question.
- Graph-backed docs: generated from .code-review-graph/graph.db with wiki-generator synthesis.
- Before broad code changes: load the router → match the index → read only the matched pages. Stop wikilink traversal at depth 2. Fall back to graph MCP tools only if the wiki does not answer.
<!-- LLM_WIKI_END -->

<!-- GRAPH_DISCIPLINE_START -->
## Graph navigation discipline

Top-down, never breadth-first. Graph MCP tools have strict per-result token caps; unbounded calls overflow silently. The full discipline (lean defaults, drill-in budgets, forbidden tools, spill-protocol HARD-FAILURE semantics) lives in the wiki router at `docs/llm-wiki/CLAUDE.md` (or `AGENTS.md` on Codex). Read it before issuing graph queries; do NOT improvise tool parameters from prior knowledge.
<!-- GRAPH_DISCIPLINE_END -->
