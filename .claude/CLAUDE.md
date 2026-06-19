# mundialito-client

## The Game — World Cup Clash (v10)

This project is **World Cup Clash**, a **Slay the Spire–style arcade roguelike** themed on World Cup football. The full game design document is **`APP_DEFINITION.md`** (GDD v10) — read it first for any gameplay work. The complete design system + an interactive HTML/React prototype (the behavioral source of truth) live in **`design/`**, with the current handoff at **`design/README.md`** — the **v10 balance build** (prototype entry `design/World Cup Clash.html`): engine `design/js/engine9.js` → `window.WCC9E` (+ run helpers `engine3.js`), board `design/jsx/Board9.jsx`, shell `App9.jsx`, builder `Builder9.jsx`, styles `design/css/v9.css`; national-team crests under `design/assets/crests/`. *(Older vN prototype files — engine8/Board8 etc. — were removed; `design/js/engine9.js` is the design source of truth for the v10 rules, mirrored by the pure-TS `src/engine/`.)* Player-card figure art is a **per-nation jersey kit** (procedural SVG) — `design/jsx/Card2.jsx` + `Jersey.jsx`, handoff at `design/design_handoff_jersey_cards/`; to be built with the PlayerCard component (SCRUM-29 / WCC-020).

**Core concept:** you don't drain an HP bar — you **score goals**, driven by **expected goals (xG)**. Each round (a slice of the match clock) you pick a **formation**, secretly field a **capped lineup** across **attack/defense lanes**, and play single-use **Tactical Cards** (visible to the opponent the moment they're played; lineups stay hidden).

**Two modes share one match engine:**
- **Arcade Run** — a 7-match knockout ladder to the Final vs historic national teams, with a lean XI that grows via rewards and roguelike **permadeath**.
- **Quickplay** — build a loaded deck (a **~16-player roster**: **20 slots** spent on premiums + the bench **auto-filled with random commons**, plus up to 3 Tactical Cards), pick a difficulty (sets opponent tier), play **one match**. No run, no rewards.

**The match (v10 rules):** a full **90 minutes = 10 rounds**.
- **Mercy rule:** a **3-goal lead** ends the match instantly.
- Otherwise the **leader at full time (90')** wins; **level → golden-goal extra time**. ET is **true sudden death** (xG ×2, meters reset to 0, stars + fatigue refreshed): the first meter to cross 1.0 wins and — unlike regulation — **both sides can't bank a goal in the same passage** (the v10 fix; only the higher-xG side scores each ET round).
- **xG engine (v10-tuned):** `clamp(0.05 + max(0, ATK_eff − DEF_eff)/210, 0, 0.50)` per team per round (was `/150, 0.60`); a meter crossing 1.0 scores a GOAL (carries the remainder). Holds scoring to ~5–6 goals/match.
- **v10 balance pass (locked from the Monte-Carlo sim):** **diminishing returns** on lane stacking (per lane, sort contributions high→low × `[1.00, 0.85, 0.70, 0.55, 0.40, 0.25]` — quality beats count); **star-core stamina discount** (in a lane with ≥1 premium, the costliest card pays full, every other card ×0.5 stamina, min 1; all-common lane = no discount); **gentle per-round field-cost curve** `COST_BY_RARITY = common 2 / rare 2 / epic 3 / legendary 4` (was 2/3/4/6; deck-build **slot** costs unchanged).
- **Fatigue:** defending tires your back line (raises the opponent's fill-rate); attacking rests it. Cleared at halftime (R5) and at the start of ET.
- **Card flow:** **common players cycle** (draw→discard→reshuffle, the sustain engine); **premium players are once-per-half** (lock when played, return at halftime / start of ET); **Tactical Cards are single-use** (exiled when played).
- **Hand & tactical limits:** each round you **draw up to a 5-card minimum hand** (grays reshuffle mid-draw); you may play **≤2 Tactical Cards per half (4/match)**; the Run deck carries **~4 tacticals** (a reward past the cap becomes a swap).
- Ramping **stamina** (8/10/12) and **per-round card cap** (4/5/6); **rarity multiplier** on stat contribution (common 1.0 → legendary 1.3).

**Build phasing:** MVP = Quickplay end-to-end; V2 = the Arcade Run shell + full tactical set; V3 = meta/leaderboards. Engine is pure framework-agnostic TS under `src/engine/`, shared headless by both modes; React UI lives under `src/ui/`.

**Implementation tickets:** the build is tracked as JIRA epics + stories in project **SCRUM** on `manuelrodmota.atlassian.net` (5 epics SCRUM-5…9, 42 stories SCRUM-10…51; `WCC-NNN → SCRUM-(NNN+9)`). SDD sources live in `.claude-temp/tickets/world-cup-clash/`.

## Tech Stack

- **mundialito-client** (TypeScript) — React 19.2.6, Vite, ESLint; UI layer uses Framer Motion + dnd-kit; tests on Vitest + React Testing Library (jsdom)
- **Data backend** — Supabase Postgres, local-first via Docker (`@supabase/supabase-js`). Local dev: `pnpm supabase:start` → `pnpm db:reset` → `pnpm seed`. Env via `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (copy committed `.env.example` → gitignored `.env.local`). The browser uses the **anon** key only; the service-role key is server/seed-only and must **never** be a `VITE_*` var or committed. RLS is read-only public on data tables.

## File Placement Guide

| File Type | Location Pattern | Example |
| --------- | ---------------- | ------- |
| React component | `src/{name}.tsx` | `src/App.tsx` |
| CSS stylesheet | `src/{name}.css` | `src/App.css` |
| Entry point | `src/main.tsx` | `src/main.tsx` |
| Static asset | `src/assets/{name}` | `src/assets/hero.png` |
| Match engine (pure TS, framework-agnostic) | `src/engine/{name}.ts` | `src/engine/engine.ts` |
| Co-located engine test (Vitest) | `src/engine/{name}.test.ts` | `src/engine/match.test.ts` |
| UI component (atomic design) | `src/ui/{atoms\|molecules\|organisms}/{Name}/index.tsx` | `src/ui/atoms/Button/index.tsx` |
| Co-located component test | `src/ui/.../{Name}/{Name}.test.tsx` | `src/ui/atoms/Button/Button.test.tsx` |
| CSS design tokens | `src/ui/tokens/{name}.css` | `src/ui/tokens/index.css` |
| Typed data-access layer (Supabase repos/mappers) | `src/data/remote/{name}.ts` | `src/data/remote/players.repo.ts` |
| DB schema / migrations / seed scripts | `supabase/{migrations\|scripts\|seed}/{name}` | `supabase/migrations/{ts}_init_schema.sql` |

## Directory Structure

```
project/
├── supabase/    # DB backend: config.toml, migrations/ (SQL), scripts/ (TS seed/import), seed/ (CSV); local-first
└── src/
    ├── assets/  # Static asset
    ├── engine/  # Pure TS match engine — no JSX/DOM; public surface via index.ts; co-located *.test.ts
    ├── data/    # Game data: static pool (players/tacticals/opponents) + remote/ typed Supabase repos+mappers (barrel remote/index.ts)
    └── ui/      # Presentational React component library (atomic design); barrel src/ui/index.ts
                 #   atoms/ molecules/ organisms/ (one dir per component: index.tsx + *.test.tsx),
                 #   plus tokens/ (CSS), data/, jersey/ (procedural SVG), motion/, gallery/ (#ds route)
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
| `npm run test` | Run the Vitest suite once (jsdom + RTL); `npm run test:watch` to watch, `npm run coverage` for v8 coverage |
| `pnpm supabase:start` / `supabase:stop` | Start/stop the local Supabase Docker stack |
| `pnpm db:reset` | Drop + re-apply migrations to the local DB |
| `pnpm db:types` | Regenerate `src/data/remote/database.types.ts` from the local schema |
| `pnpm seed` | Idempotent CSV import into the local DB (`supabase/scripts/import.ts`) |

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
