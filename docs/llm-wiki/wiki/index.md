---
document_type: index
summary: >-
  Summary catalog for the client LLM wiki — one line per page, frontmatter
  inline.
last_updated: '2026-06-15T00:42:43.827Z'
related:
  - ARCHITECTURE.md
  - SERVICES.md
---
# client LLM Wiki

Summary catalog of every page in this wiki. Each line carries the page summary, document type, tags, and related pages — frontmatter inline so a single read of `index.md` serves Tier 1 retrieval.

## Architecture

- [ARCHITECTURE](ARCHITECTURE.md) — *architecture* — This repository is a **single-service polyrepo** — there is no monorepo tooling, no workspaces, and no sibling packages. The entire project is a pure client-... **Tags:** architecture, topology, typescript, react, javascript.

## Services catalog

- [SERVICES](SERVICES.md) — *services* — Catalog of services detected in this project with links to service docs. **Tags:** services, catalog. **Related:** [[ARCHITECTURE]].

## Per-service docs

- [javascript-scripts](services/javascript-scripts.md) — *service* — The `javascript-scripts` service is the client-side SPA for the Mundialito card-game project. It is a pure browser application built with React 19, TypeScrip... **Tags:** service, javascript, library.
- [mundialito-client](services/mundialito-client.md) — *service* — `mundialito-client` is a TypeScript single-page application responsible for delivering the entire user-facing frontend experience. Built on React 19.2.6 and ... **Tags:** service, typescript, frontend, react.

## How agents should use this

- Start with this index. Read the 1–3 page bodies whose summaries match your question.
- Follow `**Related:**` `[[wikilinks]]` only when the matched pages reference them.
- Stop wikilink traversal at depth 2.
- If the wiki does not answer your question, fall back to graph MCP tools — never re-read the wiki cover-to-cover.
