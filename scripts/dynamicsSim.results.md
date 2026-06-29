# v12 match-dynamics sim — results

Monte-Carlo validation of the **v12** finishing tweaks: `BASE_CONVERSION` 0.80 → **0.75**, plus
**Park the Bus** (stacked back line cuts the opponent's open-play conversion by 0.20) and **Snap
Shot** (a near-maxed attacking round can fire an early shot on a partial meter, resetting it).

- **Date:** 2026-06-29
- **Harness:** `scripts/dynamicsSim.ts` — drives the **real** engine `resolveRound` (v11 probabilistic
  finishing + the new v12 mechanics). *(Note: `scripts/balanceSim.ts` is a stale v10 curve-sweep that
  still models the old deterministic "cross 1.0 → goal" finishing and does **not** exercise these.)*
- **Sample:** 3,000 matches per cell. Both sides play the engine AI (`decideTurn`) except the focused
  Park-the-Bus test (D), which forces a turtle defender vs an overloading attacker.
- **Mechanic A/B:** toggled per-match via `MatchState.rules` (default on in production); the OFF
  baseline keeps `BASE_CONVERSION` 0.75 but disables Park the Bus + Snap Shot, so the A/B isolates
  *just the two new mechanics*.
- **Reproduce:** `N=3000 pnpm exec tsx --tsconfig supabase/scripts/tsconfig.scripts.json scripts/dynamicsSim.ts`

## Raw output (N=3000)

```
v12 dynamics sim — 3000 matches/cell — REAL engine resolveRound (v11 finishing + v12 Park the Bus / Snap Shot)
BASE_CONVERSION 0.75 · PARK_THE_BUS_PENALTY 0.20 · SNAP_THRESHOLD 0.40 / SNAP_CAP 0.10

A) Headline — v12 rules ON, both sides engine AI
  archetype × tier        G/match  P-win%  mercy  ET   snap/100shots  busShots  busSaved%
  star-run vs D             4.08   74%     0%   43%         5.51       896   45%
  star-run vs B             4.05   41%     3%   40%         5.42       820   41%
  star-run vs S             4.12   55%     6%   29%         6.54       744   42%
  all-common vs B           4.06   25%     2%   33%         5.90       783   43%
  quickplay-allstar vs S    3.78   59%     6%   30%         6.27       841   41%

B) A/B — same matchups, v12 mechanics OFF (baseline = v11 finishing @0.75) vs ON
  archetype × tier        G/m OFF  G/m ON   Δgoals    P-win OFF  P-win ON   Δwin
  star-run vs D             4.05    4.08  +0.03   75%       74%     -1.1pp
  star-run vs B             4.01    4.05  +0.04   42%       41%     -1.0pp
  star-run vs S             4.04    4.12  +0.08   57%       55%     -1.9pp
  all-common vs B           4.02    4.06  +0.04   24%       25%     +0.3pp
  quickplay-allstar vs S    3.73    3.78  +0.05   59%       59%     -0.3pp

C) Balance invariant — star-run must still beat all-common (rules ON)
  vs Tier B:  star  41% (4.05 G/m)   common  25% (4.06 G/m)   gap +17pp
  vs Tier A:  star  37% (4.47 G/m)   common  21% (4.45 G/m)   gap +16pp

D) Park the Bus focused — quickplay-allstar attacker (overload) vs Tier-C turtle (GK+DEF wall)
   the wall already throttles the FILL; this isolates the extra CONVERSION cut on shots that get through
   mode      atk goals/m  shot conv%(non-bus)  shot conv%(bus)  busShots  attacker win%
   bus OFF      2.05             78.9%               —         0   100%
   bus ON       2.04             79.0%           55.5%      1574   100%

Legend: snap/100shots = Snap Shots per 100 total shots · busShots = open-play shots that faced a parked bus
        busSaved% = share of bus-faced shots saved · shot conv% = goals / shots · Δ = ON minus OFF.
Target (GDD §7/§19): total ~4–6 goals/match; star clearly beats common; Park the Bus drops a shot's
        conversion ~0.20 (defensible, not a wall); Snap Shot ≈ neutral on total goals.
```

## Interpretation (vs the GDD §19 acceptance items)

### Scoring band (§19 item 1) — in band, at the floor
Totals land at **~4.0 goals/match** across archetypes — inside the documented ~4–6 band, but at its
**low end**. The cause is the `BASE_CONVERSION` 0.80 → 0.75 change (the OFF baseline, which also runs
at 0.75, is ~4.0 too — so the new mechanics are *not* what trimmed scoring). If livelier scoring (~5)
is wanted, nudge `BASE_CONVERSION` back toward ~0.77 or loosen the xG fill curve, then re-sim.

### Star vs common invariant (§19 item 8) — holds firmly
Star-led decks beat all-common by **+17pp (Tier B)** and **+16pp (Tier A)**. The core "premium
investment pays off" guarantee is unaffected by the v12 tweaks.

### Snap Shot (§19 item 19) — neutral on goals ✓
Snap Shots fire **~5–6.5 per 100 shots** (only on near-maxed attacking rounds). Enabling the v12
mechanics moves total goals by just **+0.03 … +0.08 G/match** and player win-rate by **~−1 to 0 pp**
(within noise). Because a snap **resets the meter to 0 either way**, it's a tempo mechanic (score now
vs. keep building), not a source of bonus goals — exactly as designed.

### Park the Bus (§19 item 18) — defensible, not a wall ✓
The focused test (D) is the direct proof: a shot's conversion drops from **79.0% (non-bus) → 55.5%
(bus)** — a **~23.5pp** cut, ≈ the 0.20 penalty plus the pity/momentum lift on the non-bus baseline.
Yet the attacker's goals barely move (**2.05 → 2.04**) and it still wins **100%** of these matches:
the bus turns ~23pp of the shots that reach the wall into saves, but the turtle sacrifices all attack
(scores ~0) and most of the suppression already happens in the *fill* (DEF_eff), so the conversion cut
only *delays* goals. In realistic AI-vs-AI play (section A) a parked bus is uncommon (~0.25–0.30
bus-faced shots/match) and ~41–45% of those shots are saved.

## Verdict
All four acceptance checks pass. The two new mechanics behave as specified and are balance-neutral;
the only watch-item is absolute scoring sitting at the **low end** of the band after the 0.80 → 0.75
base-conversion drop — a one-knob tweak if more goals are desired.

**Verification:** 258 engine tests pass (incl. new Park-the-Bus / Snap-Shot unit tests in
`src/engine/xg.test.ts`); `tsc -b` and ESLint clean.

> **Caveat on section A's win%:** those cells use *strict single-tier* matchmaking and omit the
> Arcade run's per-stage AI handicap + deck growth, so the win% column is a **mechanic-balance probe,
> not a difficulty-curve model.** For the player-facing difficulty curve, see the follow-up below
> (use `scripts/arcadeSim.ts`).

---

## Follow-up — difficulty-curve monotonicity (Tier S)

**Observation.** In section A, star-run win% by tier is non-monotonic at the top: D 74% → B 41% →
A 37% → **S 55%** — Tier S (champions, the hardest tier) looks *easier* than A/B.

**Diagnosis (deterministic; `TIERCURVE=1` / `TIERDUMP=1`):**

1. **Not deck growth.** The sim rebuilds a fixed budget-10 star-run deck each match; the paired test
   reuses *one* deck across all five tiers and still inverts → it's the opponent pool, not the deck.
2. **The Tier-S pool has a weak tail.** Per-team top-11 OVR:
   - Tier A (4 teams): 83.3 → 85.7 — a tight elite cluster.
   - Tier S (22 teams): **80.7 → 88.3** — the 7 pre-1990 champions (Uruguay 1930 80.7 … Argentina
     1986 83.7) are weaker than *every* Tier-A team, and some Tier-B teams. The mean hides it
     (S 85.1 ≈ A 84.8); the distribution is the problem. A uniform Final draw lands a weak champion a
     good fraction of the time → easier than the curated Tier-A SF.

   Paired fixed-deck tier curve (one deck vs each tier):
   ```
                          D     C     B     A     S
   NO handicap (raw)     74%   56%   41%   39%   56%    ← inverts at S
   WITH stage handicap   83%   56%   34%   21%   36%    ← still inverts (A hardest)
   ```

3. **NOT a live bug — the shipped run is monotone.** The real Arcade run (`arcadeSim.ts`, with
   "tier-and-above" matchmaking + the per-stage handicap + deck growth) gives a clean curve:
   ```
   group 92.1% → r16 68.4% → qf 64.9% → sf 57.3% → final 54.8%
   ```
   The Final *is* the hardest stage. The strict single-tier cells overstated the issue.

**Residue worth noting.** The Final is only **~2.5pp** harder than the SF (vs 7–24pp for every other
step) — the weak-champion tail compresses the top of the curve, so the Final leans on the 1.125×
handicap rather than on elite opponents. Latent fragility, not a visible break.

**Hardening options (if a bigger Final peak is wanted), cleanest first:**
- **Champion strength-floor on the Final** — normalize a drawn champion's `aiStrengthMult` up to a
  champion floor (weak champions boosted, strong ones not). Localized; keeps all 22 eligible. *Rec.*
- Bump the `final` handicap 1.125 → ~1.2 (one line, but the strong champions get brutal).
- Era-boost the pre-1990 champions' ratings (fixes the source, but touches the shared card pool).

### Applied (v12 difficulty pass)
Both of the first two were implemented:
- `STAGE_AI_STRENGTH.final` **1.125 → 1.15** (tried 1.2 first; dialed back — 1.2 made the Final a spike,
  completion 5.8%, Final win 34%; 1.15 keeps a clean step without a wall).
- **Champion strength-floor** (`aiStrengthMultFor` in `src/run/runState.ts`, `CHAMPION_STRENGTH_FLOOR`
  = 86): any champion opponent's `aiStrengthMult` is multiplied by `max(1, 86 / squadTop11OVR)`, so a
  weak champion is normalized up to champion strength (a strong one is never weakened). Wired into the
  live run (`useArcadeRun`) and `arcadeSim.ts` via the shared `aiStrengthMultFor(stage, opponent)`.

Real arcade run (`arcadeSim.ts`, 3000 runs), per-match win% by stage:

```
                   r16    qf     sf    final   completion
original (1.125)   68.4   64.9   57.3   54.8     10.9%   ← SF→Final only 2.5pp (the thin margin)
1.2 + floor        65.9   60.8   53.8   34.4      5.8%   ← fixed, but a spike
1.15 + floor (kept)65.9   60.8   53.8   44.3      7.5%   ← clean ~9.5pp step, no spike
```

Run funnel at the kept setting (final 1.15 + champion floor):
```
stage            reach a run   beat the stage   clear through
Group (×3)          100.0%         78.3%            78.3%
Round of 16          78.3%         65.9%            51.6%
Quarter-final        51.6%         60.8%            31.4%
Semi-final           31.4%         53.8%            16.9%
Final                16.9%         44.3%             7.5%
```

The inversion is fixed and the Final is decisively the hardest stage (SF→Final gap 2.5pp → **9.5pp**),
with a monotone curve (92 → 66 → 61 → 54 → 44) and no difficulty spike. Trophy completion 7.5% is a
skill *lower bound* (the AI plays the human side). Tests: `aiStrengthMultFor` + the 1.15 Final handicap
covered in `src/run/runState.test.ts`.

---

## v12 — 8-round match + coupled curve re-tune (2026-06-29)

GDD `(1)` cut the match **10 → 8 rounds** (halftime R4 / 45', full time R8 / 90'; stamina & card-cap
ramps re-pegged R1–4 / R5–6 / R7–8; clock 15'/round) and coupled a fill-curve loosening to keep
scoring in band: **`PRESSURE_FULL` 1.0 → 0.85**, **`XG_CAP` 0.55 → 0.60**, **`SNAP_THRESHOLD` 0.40 →
0.50** (`BASE_CONVERSION` stays 0.75 — add *shots*, not certainty). Stated targets: **~5–6 G/match,
ET ~20–25%**.

What held:
- **Balance invariant** strengthened — star-run beats all-common **+28pp (B) / +27pp (A)** (fewer
  rounds amplify per-card quality).
- **Park the Bus / Snap Shot** still validated — A/B Δgoals ≈ 0 (`-0.06…+0.05`), Δwin ~−1…0pp; bus
  cuts a shot's conversion **78.2% → 58.2%**; snaps fire ~2.3–4.3/100 shots (down, as `SNAP_THRESHOLD`
  rose) and stay neutral.
- **Difficulty curve** still monotone, Final hardest, completion 7.9% (≈ unchanged from 7.5%).

What did NOT hit target — the re-tune **undershoots**:

```
                       total G/match     ET%        vs target
dynamics (AI v AI)     ~3.7              38–47%     5–6 G / 20–25% ET  → MISS
arcade run (real)      4.44 (2.60+1.84)  36.2%      5–6 G / 20–25% ET  → MISS
(prev, 10-round)       4.74              36%
```

The 20% round cut removed more goals than `PRESSURE_FULL` 0.85 + cap 0.60 added back, so totals fell
(~4.74 → ~4.44 arcade) and ET stayed ~36% — the opposite of the goal. The doc anticipated the cap
might *over*-shoot (→ pull to 0.55); the real risk was the reverse. **More loosening is needed** to
reach 5–6 G / 20–25% ET at 8 rounds — candidates: `PRESSURE_FULL` 0.85 → ~0.75, `XG_CAP` 0.60 → ~0.65,
and/or steepen the late fatigue ramp (GDD §19 #1 reserve lever) so defenses fray by R6–8. Needs a
curve sweep to land the values.

Verification: 832 tests pass; tsc + eslint clean. Clock honors the round2→15'/round3→30' example
(`(round-1)×15`, capped 90'); halftime R4 = 45'.

---

## v12 — scoring sweep (GDD §19 #1) + ET found structural (2026-06-29)

GDD `(3)` loosened the curve further (center `PRESSURE_FULL` 0.75 / cap 0.65 / `SNAP_THRESHOLD` 0.55)
and refined the clock to a fixed lookup `[0,15,30,45,46,60,75,90]` (R5 = 46'). The center alone lifted
goals (arcade 4.44 → 4.87) but ET held ~34%, so I made the curve+fatigue knobs sim-overridable
(`SIM_*` env, browser-safe via `globalThis.process`) and ran the full 12-cell sweep on `arcadeSim`
(N=1200/cell): `PRESSURE_FULL` {0.80,0.75,0.70} × `XG_CAP` {0.60,0.65} × fatigue {current 60/3,
steeper 50/4}, `SNAP_THRESHOLD` = cap − 0.10.

```
PF     CAP    FAT       goalsTotal   ET%
0.80   0.60   current     4.65       36.4
0.80   0.60   steeper     4.72       37.6
0.80   0.65   current     4.68       35.8
0.80   0.65   steeper     4.74       36.4
0.75   0.60   current     4.80       34.8
0.75   0.60   steeper     4.86       35.6
0.75   0.65   current     4.90       34.4
0.75   0.65   steeper     4.96       35.6
0.70   0.60   current     5.09       35.1
0.70   0.60   steeper     5.15       35.2
0.70   0.65   current     5.05       33.7   ← pick
0.70   0.65   steeper     5.12       34.9
```

**Two reads:**
1. **Goals scale with `PRESSURE_FULL`** (0.80→~4.7, 0.75→~4.9, **0.70→~5.1**); `XG_CAP` 0.60 vs 0.65 ≈ noise.
2. **ET is structural** — ~34–37% in *every* cell, invariant to curve and fatigue. **Steeper fatigue did
   NOT lower ET** (it nudged it up), refuting the GDD's "fatigue is the primary ET lever" hypothesis.
   More goals lifts both sides equally, so the level-at-FT rate (→ ET) doesn't move. This re-confirms the
   v10 read: good balance ⇒ close games ⇒ a fair share reach golden-goal ET **by design**.

**Landed:** `PRESSURE_FULL` **0.70**, `XG_CAP` 0.65, `SNAP_THRESHOLD` 0.55, fatigue unchanged (60/3).
Validation @ N=3000: **5.04 G/match**, ET 34.1%, completion 8.0%, curve monotone (90→66→63→56→**47**,
Final hardest). Goals target met; **~20–25% ET target retired** as unreachable by tuning (only a tie-break
rule change — decide level games by accumulated xG, §19 #5 — would cut it, and that's a design choice).

`SIM_*` overrides (`SIM_PRESSURE_FULL`, `SIM_XG_CAP`, `SIM_SNAP_THRESHOLD`, `SIM_FATIGUE_DIV`,
`SIM_FATIGUE_GAIN`) are now wired into `src/engine/constants.ts` for future sweeps (default = shipped
values; browser bundle always uses defaults). Verification: 832 tests pass; tsc + eslint clean.

---

## v12 — partial xG tie-break (GDD §19 #5 option b) (2026-06-29)

ET was shown to be structural (~34%) under scoring tuning, so the §19 #5 decision (option **b**) was
taken: a level-at-full-time game with a **clear accumulated-xG edge** is decided outright; only
genuinely-even games go to golden-goal ET. Implementation: a new `PlayerState.xgAccum` (sum of every
round's fill, distinct from the resetting pressure meter), and `checkWin` compares the gap against
`XG_TIEBREAK_GAP` before falling through to ET. `arcadeSim` now reports tie-break %; threshold is
`SIM_XG_TIEBREAK_GAP`-overridable.

Threshold sweep (arcadeSim N=1500/cell; gap 99 ≈ off):

```
gap    goalsTotal   ET%    tiebreak%   completion%
99       5.04       34.0     0.0          7.6
1.0      4.94       23.0    10.9          5.9   ← pick (ET in 20–25% target)
0.8      4.91       19.5    14.4          5.5
0.7      4.89       17.4    16.6          5.2
0.6      4.87       15.4    18.6          5.1
0.5      4.85       13.3    21.0          5.0
0.4      4.83       10.5    23.5          4.5
0.3      4.80        8.1    25.9          3.9
```

**Shipped: `XG_TIEBREAK_GAP` = 1.0.** Validated @ N=3000: **ET 23.2%** (in the 20–25% target),
tie-break decides **10.7%**, goals **4.95** (unchanged — tie-break doesn't touch scoring), curve still
monotone (group 92 → R16 64 → QF 61 → SF 50 → **Final 41**). **Completion 7.9% → 6.2%** — the predicted
cost: level Finals now go to the stronger side (the handicapped champion). Lever to recover completion:
raise the gap (more ET) or shave the Final handicap (1.15). Tests: tie-break covered in
`src/engine/checkWin.test.ts` (835 total pass); tsc + eslint clean.

### Final-handicap shave (explored, reverted)
To recover the tie-break's ~1.7pp completion, swept `SIM_FINAL_HANDICAP` (now sim-overridable):

```
final   SF win   Final win   completion   ET
1.10    50.0%    55.6% ❌     8.0%        23%   ← Final EASIER than SF (re-inverts curve)
1.115   50.0%    53.7% ❌     7.7%        23%
1.125   50.0%    50.0% (tie)  7.2%        23%
1.135   50.0%    48.1% ✅     6.9%        23%   ← lowest that keeps Final hardest
1.15    50.0%    41.2% ✅     5.9%        23%   ← KEPT
```

Key finding: **completion and "Final is the hardest stage" trade against each other** — you can't fully
recover the tie-break's completion cost without dropping the Final below the SF (curve inversion). Crossover
is ~1.13. **Decision: kept `final` 1.15** — Final decisively hardest (~41% vs SF ~50%), completion ~6.2%
accepted as the price of the ET fix. (`SIM_FINAL_HANDICAP` left in place for future sweeps.)
