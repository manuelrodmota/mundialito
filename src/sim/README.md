# World Cup Clash v8 — Headless xG Match Simulator

Standalone Monte-Carlo simulator for tuning the scoring curve and verifying balance
before any UI is built. Plays thousands of full v8 matches and reports score-distribution
metrics.

## Prerequisites

```bash
npm install
```

The runner requires Node 18+ and uses `tsx` to execute TypeScript directly.

## Running the simulator

```bash
npm run sim
```

Runs the full matrix (5 decks × 3 tiers = 15 cells, 1 000 matches/cell by default).
Writes output to `src/sim/out/results.csv` and `src/sim/out/summary.json`, and prints a
console summary.

### Changing the match count

Use the `SIM_N` environment variable:

```bash
SIM_N=100 npm run sim       # quick iteration
SIM_N=5000 npm run sim      # higher fidelity
```

### Changing the output directory

```bash
SIM_OUT=/tmp/sim-results npm run sim
```

## Reproducibility check

```bash
npm run sim:check
```

Runs the same fixed-seed match twice and asserts byte-identical results.
Exit code 0 = reproducible, non-zero = failure.

## Changing tuning knobs

All engine magic numbers live in `src/engine/config.ts` (`DEFAULT_TUNING`).
Edit the values there and re-run — no engine code changes required.

Key knobs:

| Knob | Default | Effect |
|------|---------|--------|
| `xgFloor` | 0.05 | Minimum xG per round even with zero attack |
| `xgSlope` | 150 | How fast xG rises with ATK − DEF advantage |
| `xgCap` | 0.60 | Maximum xG per round |
| `etXgMult` | 2 | Extra-time xG multiplier |
| `mercyLead` | 3 | Goal lead that triggers instant mercy win |
| `roundCap` | 10 | Regulation rounds (= 90 minutes) |
| `tacticalsPerHalf` | 2 | Max tactical card plays per half |
| `fatigueRate` | 3 | Fatigue gain/loss per defending/attacking player |
| `fatigueDiv` | 60 | Fatigue divisor for DEF penalty |

You can also pass a partial tuning override to `newMatch()` in `src/sim/run.ts` if you
want to test one-off values without changing the shared default.

## Reading the output

### `results.csv`

One row per match, columns in exact order:

```
matchId, seed, playerDeck, opponentTier, goalsHome, goalsAway, endType, endRound, etRounds,
winner, finalXgHome, finalXgAway, tacticalsHome, tacticalsAway
```

`endType` is one of: `mercy`, `fulltime`, `extratime`.
`winner` is `home` (player side) or `away` (AI side).

### `summary.json`

Aggregated metrics per run:

- **scorelines** — counts per scoreline string `"H-A"`
- **endTypeSplit** — percentage breakdown of mercy / fulltime / extratime endings
- **mercyTiming** — histogram: round number → count of mercy endings at that round
- **goalStats** — mean and standard deviation of total goals per match
- **defenseImpact** — mean goals conceded: defense-heavy deck vs all-common deck, per tier
- **starImpact** — win rate: star-heavy deck vs all-common deck, per tier
- **tacticalImpact** — win rate and average goal delta: all-common-tactics vs all-common, per tier

### Output files

`src/sim/out/results.csv` and `src/sim/out/summary.json` are git-ignored
(see `src/sim/out/.gitignore`).

## Architecture

```
src/engine/         Pure TypeScript match engine (shared with future game UI)
  types.ts          v8 data model
  config.ts         DEFAULT_TUNING — all knobs
  rng.ts            Seeded mulberry32 PRNG
  engine.ts         Full v10 match-resolution logic (port of design/js/engine9.js)
  index.ts          Public re-export surface

src/sim/            Node-only simulator harness
  policies.ts       Policy interface + baselinePolicy (port of §18 / aiPlan)
  rosters.ts        Archetype decks and opponent tiers
  run.ts            Monte-Carlo runner
  selfcheck.ts      Deterministic reproducibility self-check
  out/              Generated output (git-ignored)
```

## Build gate

The sim files are excluded from the browser build via `tsconfig.app.json`.
`npm run build` (`tsc -b && vite build`) must stay green; the sim has its own
`tsconfig.sim.json` project reference with `types: ["node"]`.
