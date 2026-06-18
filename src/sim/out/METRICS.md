# Simulator output — metrics reference

This directory holds the output of the headless Monte-Carlo simulator. Both data
files are **regenerated every run** (`npm run sim`) and are git-ignored:

| File | What it is |
|------|------------|
| `results.csv` / `summary.json` | The first config's raw rows / aggregates (mirrored from `results.<first>.*` — `v10` by default — for continuity). |
| `results.<config>.csv` | One row per match for each config in the sweep (`v10`, `pre-v10`). |
| `summary.<config>.json` | Aggregated metrics per config. |
| `comparison.json` | Cross-config headline metrics side-by-side (endTypeSplit, goalStats, deckWinRates, defense/star/tactical impact, etRoundsHistogram, fulltimeOneGoalPct). |
| `METRICS.md` | This file — what every column / field means. (tracked in git) |

### Balance configs (v10 is the shipping default — GDD v10 §15)
`npm run sim` sweeps (override with `SIM_CONFIGS=v10` or `SIM_CONFIGS=v10,pre-v10`):
- **v10** — the locked shipping rules (`DEFAULT_TUNING`): diminishing returns (`stackWeights`), star-core discount (`starSynergyDiscount`), gentle field-cost curve (`costByRarity`), xG `/210` cap `0.50`, sudden-death ET.
- **pre-v10** — the original baseline (all balance fixes off + the old `/150`, `0.60` curve), kept for the before/after contrast that motivated the v10 pass.

### `deckWinRates` (in each `summary.json`)
`deck → tier → player win %`. The headline ranking signal: shows whether each archetype
beats the opponent tier more or less often than the others. (Player = `home`.)

## The run, in one paragraph

Each run plays a matrix of **player-deck archetypes × opponent tiers**, `N` matches
per cell (default **1000**, override with `SIM_N`). Every match is seeded
deterministically from a fixed base seed, so the whole run is **reproducible** —
re-running with the same knobs produces byte-identical files. Default matrix =
**6 decks × 3 tiers × 1000 = 18,000 matches** per config.

> **Orientation — read this first.** In every metric, **`home` = your player deck**
> and **`away` = the opponent**. So `goalsHome` is the goals *your* deck scored,
> `goalsAway` is goals *conceded*, and every "win %" below is the **player deck's**
> win rate against that opponent tier.

- **Decks:** `all-common` (baseline), `balanced`, `star-heavy`, `defense-heavy`,
  `run-realistic` (a buildable star-led Run deck), and `all-common-tactics` (the baseline
  deck plus Tactical Cards — used only for the tactical-impact comparison).
- **Tiers:** `weak`, `mid`, `champion` (Tier-S).

---

## `results.csv` — one row per match

| Column | Meaning |
|--------|---------|
| `matchId` | Sequential id across the whole run (1…N). |
| `seed` | RNG seed for this match. Re-seeding with this value reproduces the exact match. |
| `playerDeck` | Which archetype the player fielded (`all-common`, `balanced`, `star-heavy`, `defense-heavy`, `all-common-tactics`). |
| `opponentTier` | Opponent strength tier (`weak`, `mid`, `champion`). |
| `goalsHome` | Goals scored by the **player** deck. |
| `goalsAway` | Goals scored by the **opponent** (i.e. goals the player conceded). |
| `endType` | How the match ended: `mercy` (3-goal lead, ended early), `fulltime` (leader at 90'/round 10), or `extratime` (level at full time → golden-goal ET). |
| `endRound` | Regulation round the match ended on (1–10). For `extratime` matches this is `10` (regulation ran the full distance before ET). |
| `etRounds` | Number of extra-time rounds played (`0` for non-ET matches). |
| `winner` | `home` = player deck won, `away` = opponent won. Golden-goal ET guarantees a winner, so this is never a draw. |
| `finalXgHome` | Total accumulated expected goals (xG) for the player across the match. |
| `finalXgAway` | Total accumulated xG for the opponent. (xG drives scoring; a meter crossing 1.0 = a goal, carrying the remainder.) |
| `tacticalsHome` | Number of Tactical Cards the player actually played (counted as exiled tacticals). |
| `tacticalsAway` | Number of Tactical Cards the opponent played. |

---

## `summary.json` — aggregates

### `totalMatches`, `nPerCell`
Total matches simulated, and how many per matrix cell (deck×tier).

### `scorelines`
Map of `"goalsHome-goalsAway" → count`, i.e. the full **final-score distribution**
(player goals – opponent goals). High keys like `"8-8"`/`"11-11"` are golden-goal
extra-time games that ran long.

### `endTypeSplit`  *(percentages of all matches)*
- `mercyPct` — % ended early by the 3-goal mercy rule.
- `fulltimePct` — % decided by the leader at full time (round 10).
- `extratimePct` — % that went to golden-goal extra time.

A healthy arcade mix is "not ~90% instant mercy, not ~0% mercy" — this split is the
main dial the scoring-curve knobs (`xgFloor`/`xgSlope`/`xgCap` in
`src/engine/config.ts`) move.

### `mercyTiming`
Histogram `round → count` of **which regulation round** the mercy rule fired on.
Tells you whether blowouts happen early (round 4–5) or late (round 9–10).

### `goalStats`
- `mean` — average **total** goals per match (`goalsHome + goalsAway`).
- `stdev` — spread of that total. High mean = lively/high-scoring; very high stdev =
  inconsistent (some blowouts, some grinds).

### `defenseImpact`  *(per opponent tier)*
"Does fielding a defense-heavy deck actually concede fewer goals than the baseline,
versus the **same** opponent?"
- `defenseHeavy` — mean goals **conceded** by the `defense-heavy` deck.
- `allCommon` — mean goals **conceded** by the `all-common` baseline.
- `delta` = `allCommon − defenseHeavy`. **Positive delta = defense-heavy concedes
  fewer goals (defense is "working").** Negative = it concedes *more*.

### `starImpact`  *(per opponent tier)*
"Do star players win more than the baseline?"
- `starHeavyWinPct` — player win % with the `star-heavy` deck.
- `allCommonWinPct` — player win % with the `all-common` baseline.
- The design goal is star-heavy winning **clearly but not always** more than baseline.

### `tacticalImpact`  *(per opponent tier)*
"Do Tactical Cards help, under the v8 caps (≤2/half)?"
- `withTacticsWinPct` — player win % with `all-common-tactics` (baseline + tacticals).
- `withoutTacticsWinPct` — player win % with `all-common` (no tacticals).
- `goalDelta` = mean player goals **with** tacticals − **without**. Positive = tacticals
  add scoring. (The win-% pair sanity-checks that tacticals aren't oppressive.)

---

## How to read it (and a caveat)

- **All "win %" are the player deck's win rate** vs that tier — not the opponent's.
- **`delta` sign conventions** are spelled out per metric above; don't assume a sign.
- **Match-length confound:** "goals conceded" and "goals scored" are *per match*, and
  matches end at different points (mercy ends early; ET runs long). A deck that
  dominates and mercy-wins quickly will show **low** goals conceded simply because the
  match was short — not necessarily because its defense is better per round. Keep this
  in mind when comparing `defenseImpact` across decks with very different `endType`
  mixes. Per-round normalization is a good follow-up if you need to isolate true
  defensive strength.

## Changing what's measured
- **Tuning knobs** (xG curve, fatigue, caps, stamina, rarity mults, etc.) live in
  `src/engine/config.ts` (`DEFAULT_TUNING`). Change a value, re-run `npm run sim` — no
  engine edits needed.
- **Matrix size / output dir:** `SIM_N=<n>` and `SIM_OUT=<dir>` env vars.
- **Reproducibility check:** `npm run sim:check`.

See `../README.md` for run instructions.
