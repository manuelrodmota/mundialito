# World Cup Clash

> A **Slay the Spire–style arcade roguelike** themed on World Cup football. You don't drain an HP bar — **you score goals**, driven by **expected goals (xG)**.

<p align="center">
  <a href="https://mundialito-rho.vercel.app/">
    <img src="https://img.shields.io/badge/▶_PLAY_NOW-mundialito--rho.vercel.app-2ea44f?style=for-the-badge&logo=vercel&logoColor=white" alt="Play World Cup Clash now">
  </a>
</p>

Build a squad from footballers across every World Cup in history and take it on a **7-match knockout run** to the Final against the **historic champions of the world** — or jump into a single **Quickplay** match at the difficulty you pick. Each round (a slice of the match clock) you choose a **formation**, secretly field a **capped lineup** across **attack/defense lanes**, and play single-use **Tactical Cards** your opponent can see coming. Your **star players are once-per-half trumps**, and **fatigue** means you can't park the bus forever.

The complete design is the game design document, **[`APP_DEFINITION.md`](./APP_DEFINITION.md) (GDD v10)** — read it first for any gameplay work.

---

## How a match plays

A full **90 minutes = 10 rounds**. There is no HP — each team fills an **xG meter** by attacking. When a meter fills, that team takes a **shot** — a strong chance, but **not a sure thing**: it converts on a probability, so a full meter can still be a great save. Score and the meter empties; miss and it drops a chunk, so you keep the pressure on. The better deck fills faster → shoots more often → wins.

- **Lead by 3 → instant win** (mercy rule). Otherwise the **leader at full time** wins; **level → golden-goal extra time** (sudden death, stars + fatigue refreshed, xG ×2).
- **xG fill per round:** `clamp(0.05 + max(0, ATK_eff − DEF_eff) / 210, 0, 0.50)`. A full meter then triggers a shot that converts at a base **~80%** (nudged by a pity bonus on misses and momentum) — finishing is **probabilistic, not automatic**. Scoring lands around **~4–6 goals/match**.
- **Star multiplier:** a star (rare → legendary) lifts its **whole lane's** stats when paired with a lanemate — so building *around* your stars is the play (a lone star gets no boost). Gold goalkeepers anchor at the top tier.
- **Fatigue** tires your back line as you defend (raising the opponent's fill-rate) and rests it as you attack; it clears at halftime and at the start of extra time.
- **Card flow:** commons cycle forever (your sustain engine), premium players are once-per-half (return at halftime **and** extra time), Tactical Cards are single-use (≤2 per half).

The balance is the **v10 pass**, locked from a Monte-Carlo simulator — **diminishing returns on lane stacking**, a **star-core stamina discount**, a **gentle field-cost curve**, and the **retuned xG curve** — extended in **v11** with **probabilistic finishing** (the shot model above) that breaks the old deterministic "I score / you score" metronome while keeping the better deck on top.

## Two modes, one engine

- **Arcade Run** — a fixed 7-match ladder (Group → R16 → QF → SF → Final) with a lean XI that grows via rewards, and roguelike **permadeath**.
- **Quickplay** — build a loaded ~16-player squad (20-slot budget on premiums + a random-common bench), pick a difficulty, play one match. No run, no rewards.

Both modes share the same match engine (xG, formations, fatigue, Tactical Cards, the card cap).

## How AI Was Used

This game was built **with AI across the whole lifecycle**. Note that the shipped product is a
deterministic card game — there is no LLM at runtime; AI was the tooling we used *to build* it,
not a feature *inside* it.

- **Implementation & tickets — [Qubika Agentic Framework (QAF)](https://github.com/thisisqubika/qubika-agentic-framework).**
  Qubika's AI agentic SDLC framework drove the build: we authored the work as spec-driven (SDD)
  tickets with `/create-sdd-ticket`, then shipped them through the `/implement-ticket` workflow
  (context-gathering → planning → implementation → validation → pull request). The full JIRA
  breakdown (5 SCRUM epics + 42 stories) was generated this way; SDD sources mirror under
  `.claude-temp/tickets/world-cup-clash/`, and the framework itself is vendored at
  [`qubika-agentic-framework/`](./qubika-agentic-framework).
- **Game definition & balance — Claude.** Claude took the game from concept to the full design
  document (`APP_DEFINITION.md`, GDD v10 + v11 finishing) and tuned the rules — the xG curve, lane
  diminishing-returns, the stamina/cost economy, and the probabilistic shot model — iterating
  against a Monte-Carlo simulator until scoring settled into a lively ~4–6 goals/match band with the
  better deck reliably on top.
- **Visual design — Claude.** The design system, card-art direction, and the high-fidelity
  interactive prototype in [`design/`](./design) (the visual + behavioral source of truth) were
  produced with Claude.
- **Data sourcing — Claude.** The datasets — the player card pool, World Cup editions, and
  campaign opponents (the CSVs in `supabase/seed/`) — were fetch from various sources (mostly Kaggle) then pre-processed and assembled with Claude.

## Tech stack

- **TypeScript** throughout.
- **React 19 + Vite** for the app/UI (the player-facing client) — a fast client-side SPA, the right fit for an animation-heavy card game (no SSR/server need; screens switch via state, not routing).
- **UI / interaction libraries:** Framer Motion (animation) + dnd-kit (drag-to-lane), built over the design tokens + ported design-system components in `design/design-system/` + `design/ds/`.
- A **pure, framework-agnostic TypeScript match engine** (`src/engine/`) — no DOM, no I/O, deterministic given a seed — shared headless by both modes.
- **Vitest** for unit tests (`pnpm test`).

> **Status:** the Foundation layer is in place — canonical v10 types/constants (`src/engine/`), the data layer (296 players, 19 tacticals, 38 opponent teams in `src/data/`), and a Vitest harness. Next up: the match engine (built **fresh from the GDD rules**, SCRUM-6) and the Quickplay **UI** (Vite + React, Framer Motion + dnd-kit, SCRUM-7).

## Repository layout

```
.
├── APP_DEFINITION.md          # GDD v10 — the authoritative game spec (read first)
├── design/                    # Design system + high-fidelity interactive prototype (behavioral + visual source of truth)
│   ├── README.md                          # current handoff — the v10 balance build (read this first)
│   ├── World Cup Clash.html               # playable HTML/React prototype (loads js/engine9.js + jsx/Board9.jsx)
│   ├── World Cup Clash - Design System.html
│   ├── js/engine9.js                       # v10 match engine (window.WCC9E) + engine3.js run helpers
│   ├── assets/crests/                      # national-team crests (SVG)
│   └── design_handoff_jersey_cards/        # per-nation procedural jersey-kit card art (Card2.jsx + Jersey.jsx)
├── src/
│   ├── engine/                # Framework-agnostic TS: v10 types + constants (+ seeded rng). Match engine built fresh under SCRUM-6.
│   ├── data/                  # Player pool (296), tactical catalog (19), opponent teams (38) — derived from the GDD
│   ├── ui/                    # React components + screens (Vite; Framer Motion + dnd-kit)
│   └── assets/                # Static assets
└── docs/llm-wiki/             # LLM-oriented architecture wiki
```

## Design language

North star: **FIFA Ultimate Team card art on a Slay-the-Spire run** — stadium-at-night, glossy. Cards are framed by rarity (silver/blue/purple/gold) with ATK (red) / DEF (blue) pips, and the player figure is a **per-nation procedural jersey kit** rendered in the nation's colours. The `design/` folder holds the full design system plus a **high-fidelity, fully interactive prototype** — treat it as the source of truth for look and behavior when building the UI.

## How to Run It Locally

The app reads its game data (players, teams, ratings) from a **local Supabase Postgres** —
without it the client throws on boot and the UI renders empty. First-time setup is the full
chain below, not just `install` + `dev`.

**No Supabase account needed.** Everything runs locally — `supabase start` spins up the whole
stack on your machine, and the player/team data ships as committed CSVs in `supabase/seed/`.
The keys you'll see are Supabase's universal local demo keys (the same on every machine, not
tied to anyone's account), so a fresh clone runs end-to-end with zero cloud setup.

**About Docker:** the database runs in Docker, but the Supabase CLI manages the containers for
you — `pnpm supabase:start` brings up Postgres, the REST API (PostgREST), and Studio. You just
need **Docker Desktop running**.

### Prerequisites

- **Docker** running (the local Supabase stack runs in containers).
- **Supabase CLI ≥ 2.50** (`supabase --version`; `brew upgrade supabase` if older). The
  committed `supabase/config.toml` uses keys that older CLIs reject.

### First-time setup

```bash
# 1. Install dependencies
pnpm install        # (npm works for most tasks; this repo carries a pnpm lockfile)

# 2. Create your local env file (points the client at the local stack)
cp .env.example .env.local

# 3. Bring up the local Supabase stack (first run pulls Docker images — slow)
pnpm supabase:start

# 4. Apply migrations to the local DB (schema + RLS + grants)
pnpm db:reset

# 5. Seed the game data from the committed CSVs. The import runs server-side and writes
#    through the local service-role key below — the standard local default, NOT tied to
#    any account (if `supabase status` prints a different service_role key, use that):
SUPABASE_URL="http://127.0.0.1:54421" \
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU" \
  pnpm seed

# 6. Run the app
pnpm dev
```

> Grab the local keys/URLs any time with `supabase status`. These are non-secret local demo
> keys, so they're fine to commit. A **real hosted** service-role key is the opposite — keep it
> out of the repo and out of any `VITE_*` var (the browser only ever uses the anon key).

### Day-to-day

```bash
pnpm dev            # dev server (needs the local stack already up)
pnpm build          # tsc -b && vite build  (type-check gates the bundle)
pnpm lint
pnpm supabase:stop  # stop the local stack when you're done
```

### Docker

The data layer is Dockerized and managed by the Supabase CLI, so `pnpm supabase:start` is the
one command that brings the stack up — the CLI generates and runs the Compose project itself.
Full steps are in [First-time setup](#first-time-setup) above.

## Testing

The project uses **Vitest** for unit testing.

```bash
pnpm test          # run all tests once
pnpm test:watch    # run in watch mode (re-runs on file change)
pnpm coverage      # run tests and emit v8 coverage report
```

Tests are **co-located** next to the source they cover (e.g. `src/engine/rng.test.ts`).
Use explicit `import { describe, it, expect } from "vitest"` — no globals.

### Directory boundaries

| Directory | Contents |
| --------- | -------- |
| `src/engine/` | Framework-agnostic TS match engine — no React, no `window`, no `Math.random()` |
| `src/ui/` | React components and pages |
| `src/data/` | Static game data — player pool, tactical catalog, opponent teams (derived from the GDD) |

## Build phasing

- **MVP** — Quickplay end-to-end (deck builder → one match → result), on the shared engine.
- **V2** — the Arcade Run shell (bracket, permadeath, rewards, Locker Room) + the full Tactical set.
- **V3** — meta-progression, leaderboards, Arcade Continues.

## Project tracking

Implementation is tracked as epics + stories in JIRA project **SCRUM** (`manuelrodmota.atlassian.net`); SDD sources mirror under `.claude-temp/tickets/world-cup-clash/`.

## Team

- **Manuel Rodriguez** — Developer
- **Nicolas Cagnina** — Developer

---

*Every value in the GDD's §15 tuning table is a knob — the game is meant to be re-tuned with data from the simulator.*
