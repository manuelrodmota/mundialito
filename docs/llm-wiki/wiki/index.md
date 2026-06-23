---
document_type: index
summary: >-
  Summary catalog for the client LLM wiki — one line per page, frontmatter
  inline.
last_updated: '2026-06-23T20:48:06.792Z'
related:
  - ARCHITECTURE.md
  - SERVICES.md
---
# client LLM Wiki

Summary catalog of every page in this wiki. Each line carries the page summary, document type, tags, and related pages — frontmatter inline so a single read of `index.md` serves Tier 1 retrieval.

## Architecture

- [ARCHITECTURE](ARCHITECTURE.md) — *architecture* — mundialito-client is a **single-service repository** — one TypeScript SPA with no backend of its own. There is no monorepo workspace tool; the repository roo... **Tags:** architecture, topology, typescript, react, vite.

## Services catalog

- [SERVICES](SERVICES.md) — *services* — Catalog of services detected in this project with links to service docs. **Tags:** services, catalog. **Related:** [[ARCHITECTURE]].

## Per-service docs

- [javascript-scripts](services/javascript-scripts.md) — *service* — `javascript-scripts` is the production client application for Mundialito — a card-based World Cup match game. It is a single-service TypeScript SPA responsib... **Tags:** service, javascript, library.
- [mundialito-client](services/mundialito-client.md) — *service* — `mundialito-client` is a TypeScript single-page application and the only deployed runtime. Built on React 19.2.6 and Vite 8 (port 5173 in dev), it hosts the ... **Tags:** service, typescript, frontend, react, vite.

## How agents should use this

- Start with this index. Read the 1–3 page bodies whose summaries match your question.
- Follow `**Related:**` `[[wikilinks]]` only when the matched pages reference them.
- Stop wikilink traversal at depth 2.
- If the wiki does not answer your question, fall back to graph MCP tools — never re-read the wiki cover-to-cover.
