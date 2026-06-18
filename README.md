# World Cup Clash

> A **Slay the Spire–style arcade roguelike** themed on World Cup football. You don't drain an HP bar — **you score goals**, driven by **expected goals (xG)**.

Build a squad from footballers across every World Cup in history and take it on a **7-match knockout run** to the Final against the **historic champions of the world** — or jump into a single **Quickplay** match at the difficulty you pick. Each round (a slice of the match clock) you choose a **formation**, secretly field a **capped lineup** across **attack/defense lanes**, and play single-use **Tactical Cards** your opponent can see coming. Your **star players are once-per-half trumps**, and **fatigue** means you can't park the bus forever.

The complete design is the game design document, **[`APP_DEFINITION.md`](./APP_DEFINITION.md) (GDD v10)** — read it first for any gameplay work.

---

## How a match plays

A full **90 minutes = 10 rounds**. There is no HP — each team fills an **xG meter**, and every time a meter crosses **1.0** it's a **GOAL**.

- **Lead by 3 → instant win** (mercy rule). Otherwise the **leader at full time** wins; **level → golden-goal extra time** (sudden death).
- **xG per round:** `clamp(0.05 + max(0, ATK_eff − DEF_eff) / 210, 0, 0.50)` — tuned for a lively ~5–6 goals/match.
- **Fatigue** tires your back line as you defend (raising the opponent's fill-rate) and rests it as you attack; it clears at halftime and at the start of extra time.
- **Card flow:** commons cycle forever (your sustain engine), premium players are once-per-half, Tactical Cards are single-use (≤2 per half).

The balance is the **v10 pass**, locked from a Monte-Carlo simulator: **diminishing returns on lane stacking**, a **star-core stamina discount**, a **gentle field-cost curve**, and the **retuned xG curve** — so a star-led deck reliably beats a wall of commons while scoring stays in a sane band.

## Two modes, one engine

- **Arcade Run** — a fixed 7-match ladder (Group → R16 → QF → SF → Final) with a lean XI that grows via rewards, and roguelike **permadeath**.
- **Quickplay** — build a loaded ~16-player squad (20-slot budget on premiums + a random-common bench), pick a difficulty, play one match. No run, no rewards.

Both modes share the same match engine (xG, formations, fatigue, Tactical Cards, the card cap).

## Tech stack

- **TypeScript** throughout.
- **React 19** on **Next.js** for the app/UI (the player-facing client).
- A **pure, framework-agnostic TypeScript match engine** (`src/engine/`) — no DOM, no I/O, deterministic given a seed — shared headless by both modes and trivially portable into the Next.js UI.
- **Vitest**-style self-checks / a Node-only Monte-Carlo simulator for balance work (`src/sim/`).

> **Status:** the v10-locked **match engine** and the **headless balance simulator** are in place; the **React (Next.js) UI** is the active build target. (The repo carries an early Vite scaffold under `src/`; the production client is being built on Next.js. The framework-agnostic engine drops into either.)

## Repository layout

```
.
├── APP_DEFINITION.md          # GDD v10 — the authoritative game spec (read first)
├── design/                    # Design system + high-fidelity interactive prototype (behavioral + visual source of truth)
│   ├── World Cup Clash.html               # playable HTML/React prototype (loads js/engine8.js + jsx/Board8.jsx)
│   ├── World Cup Clash - Design System.html
│   ├── design_handoff_world_cup_clash_v8/ # v8 handoff notes
│   └── design_handoff_jersey_cards/        # per-nation procedural jersey-kit card art
├── src/
│   ├── engine/                # Pure TS v10 match engine — public surface via index.ts
│   ├── sim/                   # Node-only Monte-Carlo balance simulator (own tsconfig.sim.json; out/ git-ignored)
│   └── assets/                # Static assets
└── docs/llm-wiki/             # LLM-oriented architecture wiki
```

## Design language

North star: **FIFA Ultimate Team card art on a Slay-the-Spire run** — stadium-at-night, glossy. Cards are framed by rarity (silver/blue/purple/gold) with ATK (red) / DEF (blue) pips, and the player figure is a **per-nation procedural jersey kit** rendered in the nation's colours. The `design/` folder holds the full design system plus a **high-fidelity, fully interactive prototype** — treat it as the source of truth for look and behavior when building the UI.

## Getting started

```bash
# Install dependencies
pnpm install        # (npm works for most tasks; this repo carries a pnpm lockfile)

# Dev server / production build / lint (current scaffold)
pnpm dev
pnpm build          # tsc -b && vite build  (type-check gates the bundle)
pnpm lint

# Headless balance simulator (Node-only)
npm run sim         # Monte-Carlo sweep → console summary + src/sim/out/{results,summary}.csv/json
                    #   SIM_N=<n> matches/cell · SIM_OUT=<dir> · SIM_CONFIGS=v10,pre-v10
npm run sim:check   # fixed-seed reproducibility self-check (exit 0 = pass)
```

See [`src/sim/out/METRICS.md`](./src/sim/out/METRICS.md) for what every simulator metric means.

## Build phasing

- **MVP** — Quickplay end-to-end (deck builder → one match → result), on the shared engine.
- **V2** — the Arcade Run shell (bracket, permadeath, rewards, Locker Room) + the full Tactical set.
- **V3** — meta-progression, leaderboards, Arcade Continues.

## Project tracking

Implementation is tracked as epics + stories in JIRA project **SCRUM** (`manuelrodmota.atlassian.net`); SDD sources mirror under `.claude-temp/tickets/world-cup-clash/`.

---

*Every value in the GDD's §15 tuning table is a knob — the game is meant to be re-tuned with data from the simulator.*
