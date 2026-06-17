# mundialito-client

## Tech Stack

- **mundialito-client** (TypeScript) — React 19.2.6, Vite, ESLint

## File Placement Guide

| File Type | Location Pattern | Example |
| --------- | ---------------- | ------- |
| React component | `src/{name}.tsx` | `src/App.tsx` |
| CSS stylesheet | `src/{name}.css` | `src/App.css` |
| Entry point | `src/main.tsx` | `src/main.tsx` |
| Static asset | `src/assets/{name}` | `src/assets/hero.png` |

## Directory Structure

```
project/
└── src/
    └── assets/  # Static asset
```

## Services & Ports

| Service | Type | Port | Role |
| ------- | ---- | ---- | ---- |
| mundialito-client | frontend | 5173 | React frontend |

## Essential Commands

| Command | Description |
| ------- | ----------- |
| `vite` | Start dev environment (_root) |
| `tsc -b && vite build` | Build (_root) |
| `eslint .` | Run linters (_root) |

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
