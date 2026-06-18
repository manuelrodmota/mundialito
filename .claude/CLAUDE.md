# mundialito-client

## The Game — World Cup Clash (v10)

This project is **World Cup Clash**, a **Slay the Spire–style arcade roguelike** themed on World Cup football. The full game design document is **`APP_DEFINITION.md`** (GDD v10) — read it first for any gameplay work. The complete design system + an interactive HTML/React prototype (the behavioral source of truth) live in **`design/`**, with the v8 handoff at `design/design_handoff_world_cup_clash_v8/` (engine `design/js/engine8.js`, board `design/jsx/Board8.jsx`, styles `design/css/v8.css`). Player-card figure art is a **per-nation jersey kit** (procedural SVG) — handoff at `design/design_handoff_jersey_cards/` (`Jersey.jsx` + README); to be built with the PlayerCard component (SCRUM-29 / WCC-020).

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

- **mundialito-client** (TypeScript) — React 19.2.6, Vite, ESLint

## File Placement Guide

| File Type | Location Pattern | Example |
| --------- | ---------------- | ------- |
| React component | `src/{name}.tsx` | `src/App.tsx` |
| CSS stylesheet | `src/{name}.css` | `src/App.css` |
| Entry point | `src/main.tsx` | `src/main.tsx` |
| Static asset | `src/assets/{name}` | `src/assets/hero.png` |
| Match engine (pure TS, framework-agnostic) | `src/engine/{name}.ts` | `src/engine/engine.ts` |
| Node-only sim harness (excluded from browser build) | `src/sim/{name}.ts` | `src/sim/run.ts` |

## Directory Structure

```
project/
└── src/
    ├── assets/  # Static asset
    ├── engine/  # Pure TS v8 match engine — no JSX/DOM; public surface via index.ts
    └── sim/     # Node-only Monte-Carlo harness (own tsconfig.sim.json; out/ git-ignored)
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
| `npm run sim` | Run the headless Monte-Carlo match simulator (`SIM_N` / `SIM_OUT` env vars) |
| `npm run sim:check` | Fixed-seed reproducibility self-check (exit 0 = pass) |

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
