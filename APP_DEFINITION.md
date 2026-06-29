# WORLD CUP CLASH — Game Design Document **v12**
*(working title — alternatives: Road to Glory, Stoppage Time, Total Football)*

Important: FULL DESIGN OF THE APP IS AT ./design => Includes the full Design System (`World Cup Clash - Design System.html`) + the interactive HTML prototype (`World Cup Clash.html`), the **v10 balance build**: it loads `js/engine9.js` (the v10 match engine, `window.WCC9E`) + `js/engine3.js` (run helpers, `WCC3E`), `jsx/Board9.jsx` + `App9.jsx` + `Builder9.jsx` + board widgets, `css/v9.css`, and national-team crests under `assets/crests/`. The current handoff notes live at **`design/README.md`**. *(The shipping rules engine is the pure-TS port under `src/engine/`, which is the authority for the v10 balance pass below; `design/js/engine9.js` is the design source of truth for that math, and the `design/` prototype is the behavioral reference for UI/flow.)*

A **Slay the Spire–style arcade roguelike** themed on World Cup football. Play the headline **Arcade Run** — a 7‑match journey to the Final against **real historic national teams** — or **Quickplay** a single match at a difficulty you choose. You don't chip an HP bar — **you score goals**, driven by **expected goals (xG)**. A match is a **full 90 minutes**: lead by **3 goals** and it's an instant win, otherwise **whoever's ahead at full time wins** (level → golden-goal extra time). Each round (a slice of the clock) you pick a **formation**, secretly field a **capped lineup** across **attack/defense lanes**, and play single-use **Tactical Cards**. Your **star players are once-per-half trumps**; **fatigue** means you can't park the bus forever.

---

## 0. What changed

**v12 (this revision) — meta-progression (collection, boxes & team perks); commons now pickable:**
A persistent layer wraps the run: you build a permanent collection by opening boxes, and owning a nation's players unlocks team perks. Two rules shift to support it.
- **Pick-your-own commons** (§5, §16, §17): you now hand-pick the commons that fill your roster from the ones you've **collected**, with a **"Fill randomly" button** for speed. This reverses v9's roll-only rule. It's viable now because commons are **earned** (you can only field what you own), but established players with deep common pools can optimise, so the star-vs-common balance gets a **re-sim** with a best-commons archetype (§19) before it's considered locked.
- **Collection & boxes** (§20): players are unlocked from **boxes** — Group / Knockout / Champions, 5 cards each, premium-weighted by tier. Duplicates convert to a crafting currency (or XP). A **new-player welcome bundle** (2 Group + 1 Knockout + 1 Champions, the Champions box guaranteeing a Legendary) seeds the first deck; **run results** and **account level** grant more boxes.
- **Commons are collectible** (§5, §20): no longer a free shared pool — earned like everything else. The ~7k-player dataset is mostly commons, which is exactly the volume that fills the boxes and gives the collection a long tail.
- **Quickplay is the no-login sandbox** (§2, §16): it offers **all players** (no collection needed), so anyone can try the full game before registering. Collection-gating, the EXP level, the Arcade Run, **Account/Collection**, and **Multiplayer** (the future PvP mode) all sit behind **login**; registering (login + username) grants the 4-box welcome bundle (§20).
- **Team perks** (§20): owning a share of a nation's players unlocks tiered, equippable **nation perks** — the reason commons are worth collecting. They add flat stat bonuses to fielded players, so they also get a sim archetype (§19) before locking.
- **Prestige** (§20, economy §7): at **level 50** you can reset to level 1 for a **prestige rank** (Prestige I–X) + an exclusive cosmetic badge — a Multiplayer-visible flex. You keep all cards/boxes and re-level for the full box rewards again (a mild, accepted Champions boost). The team-perk "Prestige layer" is renamed **Iconic XI** to free the name.
- **Finishing & defense/attack tweaks** (§7, §15): base shot conversion lowered **0.80 → 0.75** (a full meter is a bit less of a sure thing), plus a matched pair of edge-case mechanics — **Park the Bus** (stack your back line, GK + ≥2 DEF or ≥3 DEF, to **cut the opponent's open-play conversion by 0.20** that round — the answer to an already-full meter) and its mirror **Snap Shot** (a near-maxed attacking round, `xG_round` near its cap, gets a **slim ≤10% chance of an early shot on a partial meter**; the attempt **resets your bar to 0 either way**, so it's a tempo gamble, not free goals). Forced shots (Penalty/Hand of God) ignore the bus. Both are slim and structurally costed (defense sacrifices attack; attack-stacking exposes the back line), and get a sim re-check (§19, items 18–19) before locking. *(The xG bar stays a **threshold** model — not a 50%-onward gradient.)*
- **Match length 10 → 8 rounds** (§13, §15, §6): matches were running long, so a match is now **8 rounds** — **4 per half** (halftime at R4 / 45', full time R8 / 90'; clock `0/15/30/45 ∥ 46/60/75/90`) — with the stamina (8/10/12) and card-cap (4/5/6) ramps re-pegged to **R1–4 / R5–6 / R7–8**. Folded into the **same re-sim** as the scoring re-tune below: ~20% fewer rounds is ~20% fewer goals, so the curve is being tuned **at 8 rounds**, not retrofitted.
- **Scoring re-tune + Final hardening — RESOLVED (v12 sweep)** (§7, §15, §16, §19): the structural changes validated (balance invariant *stronger* at 8 rounds, +28 / +27pp; Park the Bus & Snap Shot neutral; difficulty curve monotone). Scoring **landed** via a 12-cell sweep — shipped **`PRESSURE_FULL` 0.70 / `XG_CAP` 0.65 / `SNAP_THRESHOLD` 0.55** (fatigue unchanged), validated at **5.04 G/match**, in band. **Extra time proved structural** — flat ~34% across *every* cell, unmoved by curve or fatigue (refuting the "fatigue is the ET lever" hypothesis: more goals lift both sides equally), so the ~20–25% ET target isn't reachable by *scoring* tuning — instead it's hit by a **partial xG tie-break** (§19 #5): a clear accumulated-xG edge (gap ≥ **1.0**) decides a level-at-full-time game, only genuinely-even games go to ET — swept to **ET ~23%** (decides ~11% of matches), at a small completion cost (~7.9% → ~6.2%, level Finals now go to the stronger side). The Arcade **Final** is hardened & validated: **stage handicap 1.125 → 1.15** + a **champion strength-floor** (`OVR 86`) → a monotone curve with the Final decisively hardest (SF→Final ~9pp, ~8% trophy completion).

**v11 — probabilistic finishing, lane force-multiplier, tactical correctness:**
The v10 balance held, but a deterministic "fill 1.0 → guaranteed goal" made matches metronomic (I score, you score) and several Tactical Cards didn't match this spec in the shipped engine. v11 fixes both.
- **Probabilistic finishing — "Pressure → Conversion"** (§7, §10, §14, §15, §17): a full xG meter no longer auto-scores — it triggers a **SHOT** that converts with probability `P` = `BASE_CONVERSION` **0.80** + **pity** (per consecutive miss) + **momentum**, capped **0.95**. A **goal empties** the meter; a **miss drops it by half** so you keep pressing. The odds are **telegraphed** before lock-in. This breaks the metronome while keeping the better deck on top (it fills faster → shoots more often → scores more); the sim shows a star deck still beating a common deck ~85%.
- **Rarity multiplier is now a LANE force-multiplier** (§4): a star's tier multiplier lifts the **whole lane's** stat, but **only when the lane has ≥2 cards** (a lone star gets no boost — it'd just inflate its own overall). Highest tier wins per lane. **Gold goalkeepers** (overall ≥ `GOLD_THRESHOLD` 87) anchor at **×1.3** even if only epic-rated. (Was: per-card `stat × rarityMult`, applied unconditionally.)
- **Tactical cards corrected to spec** (§12): **Penalty Kick** and **Hand of God** are now **forced SHOTS** (≈**0.78** / ≈**0.95** conversion, Hand of God once per match) rather than flat-xG adds; the other attacking tacticals (Tiki-Taka, Long Ball, Counter-Attack, Nutmeg) still **fill** the meter. The remaining effects now behave exactly as this table already described (Catenaccio halves opponent xG, Counter triggers on your DEF ≥ their ATK, Nutmeg/Talisman/Total Football actually apply, Injury persists for the match, Time Wasting zeroes the opponent's next-round xG floor, Water Break grants its +2 stamina the **same** round).
- **Extra time** is shot-based sudden death: both sides build pressure, the **higher-pressure side shoots first**, and the **first goal ends the passage**.

**v10 — balance pass, locked from the Monte-Carlo sim:**
The output of the balance simulator (thousands of matches per archetype × opponent tier). It fixes the core inversion where cheap all-common decks out-performed star-led ones, makes premium investment reliably pay off — including Quickplay's loaded all-star decks — and keeps scoring lively without spiralling.
- **Diminishing returns on lane stacking** (§7, §15, §17): a lane's card contributions are sorted high-to-low and weighted `[1.00, 0.85, 0.70, 0.55, 0.40, 0.25]`, so the 4th–5th body in a lane adds little. A few strong cards now beat a wall of commons — the root fix for cheap-card flooding, working with the card cap.
- **Star-core stamina discount** (§6, §15, §17): in a lane containing **≥1 premium**, the single most-expensive card pays full per-round stamina and **every other card in that lane is half-price** (min 1). A star core can field a full lineup instead of one legendary and empty space.
- **Gentle per-round stamina curve** (§4, §6, §15): the cost to **field** a card is flattened to **common 2 / rare 2 / epic 3 / legendary 4** (deck-build **slot** costs unchanged). Premium decks can now put 3–4 bodies on the pitch each round.
- **Retuned xG curve** (§7, §15, §17): `/210` slope, `0.50` cap (floor unchanged at `0.05`) — holds total scoring to a lively-but-sane ~5–6 goals/match after the cheaper lineups had pushed it into a goal-fest.
- **Golden-goal extra time fixed** (§14, §17): ET now resolves as true sudden death — the first meter to cross 1.0 ends it, and unlike regulation both sides **cannot** bank a goal in the same passage, so level games end in a round or two instead of trading into 9–9 marathons.
- **Net effect (sim):** a realistic star-led Run deck and a loaded Quickplay all-star deck both clearly beat an all-common deck at every tier; a strong back line concedes measurably less against the toughest opponents; matches play like tense football — most decided by a goal, with the better deck still winning the close ones (and the sudden-death ones). *Soft spots flagged for the next tuning pass: rares are a weak middle tier, and Tactical Cards are net-negative for an otherwise-common deck (§19).*

**v9 — commons are rolled, not picked:**
- **Random-common fill** (§5, §16): your slot budget buys your **premium** core; the remaining roster spots **auto-fill with random commons**, and you **can't hand-pick** them. Stops the min-max where you'd cherry-pick every top-rated common (all the 79s) and make the budget meaningless; turns the bench into genuine squad depth. Applies to the Run and Quickplay. *(Superseded by v12: commons are now collectible and pickable — see §5/§20.)*

**v8 — hand & tactical limits:**
- **Minimum hand of 5** (§6, §10): draw up to 5 each round; grays reshuffle mid-draw. Drops the old draw-3 / 8-cap.
- **Tactical play cap** (§6, §12): ≤2 Tactical Cards per half, 4 per match.
- **Run tactical deck cap ~4** (§5): Tactical rewards become a swap past the cap.

**v7 — the 90-minute match:**
- Full **90 minutes (10 rounds)**; **3-goal-lead mercy** → instant win; else **full-time leader wins**; level → **golden-goal extra time** (xG doubled) (§14).
- **Stars once-per-half** (lock → return at halftime/ET); **Tactical Cards single-use** (§6). Numeric scoreboard + match clock (§16).

**v6:**
- **Quickplay mode** (§2): build a full deck and play one match at a chosen difficulty.

**v5 — balance pass:**
- **Stamina ramps** for late escalation: 8 (R1–5) → 10 (R6–8) → 12 (R9–10) (§6).
- **Per-round card cap** 4 → 5 → 6 (§6): the structural fix for "cheap-card flooding."
- **Rarity multiplier** on a card's stat contribution (§4): common ×1.0 · rare ×1.1 · epic ×1.2 · legendary ×1.3.

**v4 — the big shift (from v3):**

| v3 | v4 |
|---|---|
| **Morale (HP), continuous damage** | **Goals**, driven by **xG accumulation** (§7). |
| Stoppage Time (+3 damage at low HP) | **Removed** — late drama comes from **fatigue** (§8). |
| Tactical effects in HP terms | All Tactical effects **re-statted to xG / goals** (§12). |
| Tactical cards hidden until reveal | **Tactical cards visible the moment they're played**; lineups stay hidden (§7). |
| (new) | **Fatigue**: defending raises it, attacking lowers it (§8). Many Tactical Cards **require & buff a matching-role player** (§12). |

Everything else — the 7-match run, the slot-budget decks, formations, Intent, synergies, historic-team opponents — carries over.

---

## 1. The Pitch

It's the World Cup. You manage a side built from footballers across every tournament in history, and you have **seven matches** to lift the trophy. Football is about **goals**, so that's how you win: every round you create chances, those chances accumulate as **expected goals**, and when your xG crosses a full goal — **GOAL.** First to **3** takes the match. Each round you choose a **formation** (go for the throat or sit deep), secretly field a lineup split between **attack and defense**, and fire off **Tactical Cards** your opponent can see coming. Defend too long and your back line **tires**, so the pressure never lets up. The Final is brutal — your only opponents are the **historic champions of the world**, Uruguay 1930 through Argentina 2022. One life. Win the run or start again.

---

## 2. Game Modes & the Run

Two modes share the **same match engine** (xG, formations, fatigue, Tactical Cards, the card cap — all of it):

- **Arcade Run** — the headline mode, described below: a 7-match journey up the bracket with a lean XI that grows via rewards, and permadeath.
- **Quickplay** — build a full deck and play **one match** at a difficulty you pick. No run, no permadeath, no rewards. For a fast game, or to test deck ideas and learn the systems.

### Quickplay
- **Build a loaded squad up front** (no mid-match reward players to grow your deck): a **~16-player roster**, spending a **slot budget of 20** on premiums *(double the run's 10 — enough for a genuinely star-studded squad)* with the rest **filled with commons from the full pool** (Quickplay has **all players available** — no login or collection needed; it's the try-before-you-register sandbox), **plus up to 3 Tactical Cards** as a **separate allowance** (not drawn from the player budget — the same player-vs-tactical split the run uses), and designate a Captain. Deliberately more generous than the run's lean 11, since your deck won't grow during the game and you'll pick a difficulty to match — and a harder pick pays more account XP on a win (§20).
- **Pick a difficulty**, which sets the opponent's tier: **Easy → D/C · Medium → B · Hard → A · Legendary → S** (a World Cup champion). Same historic-team pool as the run (§13).
- Play one match under the **standard rules** (90 minutes, mercy at a 3-goal lead, xG, fatigue, formations, the card cap, single-use Tactical Cards).
- **Level at full time → extra time** decides it, same as the run — so a Quickplay match always produces a winner. *(If you'd prefer casual draws here, that's a one-line toggle — see §19.)*

### The Run (Arcade)

A fixed 7-match knockout ladder. **Lose any match → the run ends** (roguelike permadeath; an *Arcade Continues* mode can come later). **The score resets to 0–0 at the start of every match.**

| # | Stage | Opponent pool | Difficulty |
|---|---|---|---|
| 1–2 | Group | Any historic team (weighted easy) | ★ |
| 3 | Group | Any historic team | ★★ |
| 4 | Round of 16 | Tier C and above | ★★★ |
| 5 | Quarter-final | Tier B and above | ★★★★ |
| 6 | Semi-final | Tier A and above | ★★★★★ |
| 7 | **Final** | **Champions only** (Tier S) | ★★★★★★ |

Between matches: the **Locker Room** (add your reward player, choose your reward Tactical Card, set Captain, review deck).

---

## 3. Core Loop (three nested levels)

```
RUN:   pick XI → 7 matches up the bracket → lift the trophy
MATCH: vs one historic team, 0–0, full 90' (8 rounds). Lead by 3 → instant win;
       else most goals at full time wins; level → golden-goal extra time (§14).
ROUND: draw up to 5 → refresh stamina (8, then 10 after R4, 12 after R6) → pick FORMATION, commit lineup to
       ATTACK/DEFENSE lanes, play single-use TACTICAL CARDS (cards face-up, lineup hidden)
       → REVEAL lineups → fill both pressure meters → a FULL meter takes a SHOT (≈75%+) → GOAL or SAVED
       → fatigue updates → spent stars lock, tacticals exile → check score (HT reset at R4)
```

---

## 4. Card Anatomy — two-stat players *(unchanged)*

Each player has **ATK** and **DEF**, from one `overall` + position. ATK feeds your xG when attacking; DEF (plus GK save quality) suppresses the opponent's xG when defending.

| Position | ATK | DEF | Role |
|---|---|---|---|
| FWD | `overall` | `round(overall × 0.55)` | **Finishing** — raises your xG up top |
| MID | `round(overall × 0.85)` | `round(overall × 0.78)` | **Tempo** — balanced, enables passing combos |
| DEF | `round(overall × 0.55)` | `overall` | **Cover** — suppresses opponent xG |
| GK | `0` | `overall + 5` | **Saves** — defense-lane only; extra xG suppression (§7) |

`cost` (per-round stamina to field), `rarity`, `slots` from the `overall` band: Common 60–79 (0 slots, **cost 2**) · Rare 80–86 (1 slot, **cost 2**) · Epic 87–89 (2 slots, **cost 3**) · Legendary 90–99 (3 slots, **cost 4**). *(The per-round field cost is the **gentle curve** from the v10 balance pass — flattened from the old 2/3/4/6 so premium decks can put 3–4 bodies on the pitch; the **slot** costs that bound deck-building are unchanged. A lane with a premium also gets the **star-core discount**, §6.)*

**Rarity multiplier — a LANE force-multiplier (v11).** A star's tier multiplier (**common ×1.0 · rare ×1.1 · epic ×1.2 · legendary ×1.3**) now multiplies the **whole lane's** effective stat, **but only when the lane has ≥2 cards** — so a star *lifts its lanemates*, not just itself. **Alone, a star gets no multiplier** (multiplying a single card is just inflating its overall, which is pointless), so the lever only matters when you build a line *around* the star. With multiple stars in a lane, the **highest tier wins**. **Gold goalkeepers** (legendary-tier colour, overall ≥ `GOLD_THRESHOLD` = 87) anchor at the **×1.3** legendary multiplier even if their rating only reaches the epic band — elite keepers are defensive keystones; no other position gets this bump. The match UI shows the active **×mult badge** on the top star card the moment a 2nd card joins its lane. (Previously this was a per-card `stat × rarityMult` applied unconditionally; v11 gates it to ≥2 and applies it lane-wide so pairing a star with support is the rewarded play.) Still gentle — the **card cap** (§6) and **diminishing returns on lane stacking** (§7) remain the primary anti-flooding levers; this is shine on top and the easiest dial to turn back toward 1.0.

---

## 5. Your Squad & Progression

- **Start:** spend a **slot budget of 10** on **premium players** (Rare 1 / Epic 2 / Legendary 3) to form your core, designate a **Captain** (always in your opening hand, grants Captain's Pride), and optionally include **one** Tactical Card. Your roster is **11 players** total.
- **Commons: pick your own, or auto-fill (v12).** Once your slot budget is spent on premiums, you fill the remaining roster spots with **commons you've collected** (the 0-slot tier — this is the **Arcade Run**; **Quickplay** offers the full pool, §2): **hand-pick them**, or hit **"Fill randomly"** to let the game complete the roster from your owned commons. *(Commons are now earned, not a free pool — see the collection economy, §20 — so you can only field commons you actually own.)* **Balance note:** picking your best commons is a small power bump over random (under diminishing returns the lane's *top* card lands at full weight), so the star-vs-common balance is being re-checked in the sim (§19); if it over-tilts, the diminishing-returns weights or the common OVR band are the dials. The ownership gate softens the old cherry-pick worry — a newcomer can't pick 79s they don't own — but deep collections can optimise.
- **After each win:** **+1 random player** (rarity odds improve as you advance) and a **Tactical Card reward (choose 1 of 3)**. *(These are run-scoped; permanent collection growth comes from boxes, §20.)*
- **Tactical deck cap (~4, tunable):** you carry at most **~4 Tactical Cards** in your Run deck. Once you're at the cap, a Tactical reward becomes a **swap** — take the new one and exile one you hold, or decline. This lines up with the 4-per-match play cap (§6), so you almost never draw a tactical you can't use, and it makes the reward a real *choice* (à la Slay the Spire) rather than endless piling-on. *(This is the fix for "7 tacticals by the Final" — the deck cap bounds the count, the per-half play cap bounds the burst.)*
- Deck grows from ~11–12 cards to roughly **~17 players + ~4 Tactical Cards** by the Final — stronger every round, but with a hard ceiling on tactical spam. *(Optional StS touch: occasionally offer to remove a player card too.)*

---

## 6. Stamina + Card Flow

- Squad shuffled into a **draw pile**. **Opening hand 5** (Captain included). At the **start of each round you draw back up to 5** — your **minimum hand** (draw 5 minus whatever you held over). If the draw pile empties mid-draw, **shuffle the gray discard back in and keep drawing until you reach 5**, so a thin deck never leaves you stuck with a 2-card hand. Drawing *to* 5 means you can't hoard a fat hand — a deliberate trade for a consistent, always-playable one.
- **Where played cards go (the v7 split):**
  - **Common players (grays)** → **discard**, and **reshuffle** back into the draw pile when it empties. They are your **infinite sustain engine**.
  - **Premium players (rare / epic / legendary)** → a **locked pile**: once played, they're benched and **do not return until halftime (round 4)**, when they shuffle back into your draw pile (and they return again to start **extra time**). So each star is roughly a **once-per-half** play.
  - **Tactical Cards** → **exiled**: **single-use**, gone for the rest of the match (no halftime return). And you may play **at most 2 Tactical Cards per half** (first half = rounds 1–4, second = 5–8) — **4 per match maximum**. So even a Tactical-stuffed deck can only fire 4 swings a game; surplus tacticals sit as reserves. *(Extra time grants no extra allowance — by then most are spent; play any leftovers freely.)*
- **Deckbuilding consequence:** because stars lock and tacticals exile, your **grays aren't filler — they're what keeps you fielding a lineup** through the middle of each half. You can't run an all-premium deck or you'd have nothing to play once your stars are spent.
- **Stamina ramps for late-game escalation**, identical for both players, full refresh each round: **8** stamina rounds 1–4, **10** rounds 5–6, **12** rounds 7–8. **Water Break** adds temporary stamina on top for one round.
- **Per-round card cap** (the key balance lever): field at most **4 player cards** (attack + defense combined) per round, ramping **4** (R1–4) / **5** (R5–6) / **6** (R7–8). Tactical Cards don't count toward the cap. The cap equalizes how many players each side fields, so a star-led lineup beats an equal-count common lineup on **per-card quality** (amplified by diminishing returns, §7) — and the **star-core discount** below lets you still fill the cap *with* a star (e.g. a 4-cost legendary anchoring your attack with two commons half-priced to 1 each beside it + a common in defense = 8 stamina, 4 cards).
- **Star-core discount** (the v10 rule that makes premium lineups affordable): in a lane that **contains at least one premium** (rare / epic / legendary), the lane's **single most-expensive card pays full** per-round stamina and **every other card in that lane is half-price** (rounded down, minimum 1). So a common (2) or rare (2) beside a star costs **1**, an epic (3) costs **1**, a second legendary (4) costs **2**; a lane of **all commons gets no discount** (no premium to anchor it). One big star no longer crowds out your whole lineup — it pulls its supporting cast in cheaply.
- Stamina never covers your whole hand → every round is "who do I leave on the bench?"

> **Halftime (round 4)** is a real reset: locked **premium players return** to your draw pile **and fatigue clears** for both sides — a second-half fresh start. Spent **Tactical Cards stay gone.**

---

## 7. Scoring — the xG engine *(the scoring core)*

There is **no HP**. Instead, each team has an **xG meter** — now a **pressure / chance gauge** — that fills every round:

- **Your meter** fills from **your attack vs their defense**.
- **Their meter** fills from **their attack vs your defense**.
- When a meter **fills (reaches `PRESSURE_FULL` = 0.70)**, that team **takes a SHOT** — see **v11 finishing** below. It is **not** an automatic goal.
- **Most goals at full time wins** (mercy at a 3-goal lead; level → golden-goal ET, §14).

### v11 — probabilistic finishing ("Pressure → Conversion")

A full meter no longer auto-scores (the old `cross 1.0 → guaranteed goal` produced a predictable "I score / you score" metronome). Instead, reaching full triggers a **shot that converts with probability `P`**:

- **Conversion `P`** = `BASE_CONVERSION` (0.75 at a full meter) + **pity** (`+PITY_STEP` per consecutive miss, capped `PITY_CAP`) + **momentum** (a side on top finishes a touch better, up to `MOMENTUM_CONVERSION`), clamped to `CONVERSION_CAP` (0.95 — open play is never certain).
- **Goal** → bank it, the meter **empties to 0**.
- **Miss** → the meter **drops by `MISS_DROP_FRAC`** (half) — you keep some pressure and try again next round; each miss raises the next shot's pity bonus.
- **Telegraphed:** the meter shows the conversion `P` *before* you lock in, so a missed full-meter chance is a risk you saw, not an arbitrary coin-flip.
- **Park the Bus (the defensive answer to a full meter):** if your defensive lane is stacked this round — a **goalkeeper + ≥2 defenders**, or **≥3 defenders** — you *park the bus*: the opponent's open-play shot conversion this round is **reduced by `PARK_THE_BUS_PENALTY` (0.20)**, so a full-meter shot that would convert at 0.75 lands at ~0.55. This is the counter to "their bar is full, a goal is coming" — but it **costs** you the round (those slots aren't attacking, so your own meter barely moves), **raises your fatigue** (§8), and a **denied shot still builds the attacker's pity**, so the bus *delays* goals rather than walling them out. **Forced shots (Penalty, Hand of God) ignore it** — you can't park the bus against a penalty. *(Tunable; sim-flagged §19.)*
- **Snap Shot (the attacking mirror):** the opposite case — when your round's chance is *exceptional* (your `xG_round` is near its `0.65` cap, i.e. your attack is overwhelming their defense), you get a **slim chance (≤`SNAP_CAP` 0.10) of an immediate shot even on a partial meter** — the screamer out of nothing. It scales only with a near-maxed attacking round (nothing below `SNAP_THRESHOLD` 0.55), so it rewards a genuinely dominant attack, not steady pressure. If it fires it's a normal open-play shot (so **Park the Bus still blunts it**), and **taking it spends your pressure — the meter resets to 0 whether it goes in or not** (a speculative early effort ends the move). So it's a genuine **gamble, not free upside**: you cash your build-up for a low-odds early goal, which keeps it roughly **tempo-neutral** (score *now* vs. keep building toward a full-meter shot) rather than a source of bonus goals. The cost is also structural: a monster attacking round needs an attack-stacked lineup, leaving you **light at the back** (their meter climbs faster), and an opponent parking the bus shrinks the overload that triggers it. *(Tunable; sim-flagged §19.)*
- **Tactical finishers** (§12): **Penalty Kick** forces a shot at ~`PENALTY_CONVERSION` (0.78) and **Hand of God** a near-certain shot (`HAND_OF_GOD_CONVERSION` 0.95, once per match) — regardless of build-up. The other attacking tacticals (Tiki-Taka, Long Ball, Counter-Attack, Nutmeg) still **fill** the meter (create the chance).
- **Why the better deck still wins:** fill is unchanged and deterministic, so a stronger attack reaches full **more often** → takes **more shots** → scores more across the match. The roll only adds drama and desyncs the metronome; sim shows a star deck still beating a common deck ~85% (§19).
- **Extra time** is sudden death: both sides build, the higher-pressure side shoots first, and the **first goal ends the passage** — a penalty-shootout-grade finish.

**xG added per round** for a team:
```
Δ        = yourATK_eff − theirDEF_eff           // see modifiers below
xG_round = clamp( 0.05 + max(0, Δ) / 210 , 0 , 0.65 )
```
- `0.05` is a small floor (even a stifled attack nicks a chance now and then — keeps games from stalling at 0–0).
- `/210` slope, cap **`0.65`**, **`PRESSURE_FULL` `0.70`** (v12 — **RESOLVED by the §19 #1 sweep**): v11's 0.75 conversion plus the 8-round cut had dropped totals to **~4.4 goals/match**, so the fill curve was loosened to add **shots, not certainty** (the 0.75 finish is untouched) — a lower full-meter threshold + a higher dominant-round cap. A 12-cell sweep found goals scale cleanly with `PRESSURE_FULL` (0.80→~4.7, 0.75→~4.9, **0.70→~5.0**) and are ≈ insensitive to the cap; it **landed at 0.70 / 0.65**, validated at **5.04 G/match** (in the ~5–6 band, no overshoot, defense still suppresses). Extra time proved **structural** — ~34% across *every* sweep cell, unmoved by curve or fatigue — so the ~20–25% ET target is **retired as untunable** (only a tie-break rule lowers it, §19 #5). Keep any future change inside the ~5–6 band with **defense still visibly suppressing goals** (a strong back line concedes clearly less, or defenders/GKs lose their point).

**Defense is rate-control, not drain.** Your `DEF_eff` is the term subtracted from the opponent's attack, so **playing defenders lowers how fast *their* bar fills — it does not reduce xG they've already banked.** Stack defenders and their add this round drops toward the `0.05` floor (to `0.025` under Catenaccio, to `0` for a round under Time Wasting), so you can stall them, but you score nothing yourself (empty attack lane → your add ~0.05) and a defense-heavy round raises your fatigue, which later lets their bar climb faster. If **both** sides turtle, both bars still creep up by the floor and both tire — so it drifts toward a goal rather than deadlocking. A **GK** is the most efficient defensive piece (high DEF + a flat save-suppression on their xG). Beyond slowing the fill, a **heavily stacked back line (Park the Bus, §7) cuts the *conversion* of a shot you can't prevent** — the defensive answer to an already-full meter. *(Whether a dominant defensive round should actively **drain** banked xG is an open lever — §19.)*

**Effective stats** (`ATK_eff`, `DEF_eff`) fold in, in this order: each card's **`stat × rarityMult`** (§4), then **combined across the lane with diminishing returns** (the lane's contributions are sorted high-to-low and weighted `[1.00, 0.85, 0.70, 0.55, 0.40, 0.25]`, so the 4th–5th body in a lane adds little) → **synergies & Captain's Pride** → **formation multiplier** (§9) → **fatigue penalty on defense** (§8) → active Tactical Cards. **Diminishing returns is the v10 lever that makes quality beat quantity:** a fifth common stacked into a lane barely moves the needle, while a single high-rated star (amplified by its rarity multiplier) lands at full weight. **Position roles flow straight into xG**: a FWD in attack raises `ATK_eff` (more xG = higher chance to score, exactly as intended); a **GK or DEF** in defense raises `DEF_eff` (less opponent xG = higher chance to keep it out). A **GK additionally applies a flat xG-suppression ("save quality")** beyond its DEF, so keepers matter.

> **Why xG instead of a coin-flip per round?** It keeps the variance low and skill-driven — sustained good play *reliably* accumulates into chances, so you rarely lose a match you dominated, while a tight game can still swing on a single late shot. Smoother than rolling each round, still unmistakably football.

---

## 8. Fatigue *(new — one bar, folded into xG)*

You **cannot defend forever.** Fatigue represents your back line tiring, and it **accelerates the opponent's xG meter** — it is *not* a second progress bar, it's the **fill-rate dial on the one xG bar** (shown as a "heat" indicator on your goal).

- Each team has a hidden **fatigue value F** (0–30, starts 0 each match).
- **Defending raises F, attacking lowers it.** Concretely, per round:
  `Fatigue change = (defense weight − attack weight) × rate`, clamped — a defense-heavy round tires you, an attack-heavy round rests you, a balanced round is roughly neutral.
- **Fatigue lowers your effective defense:** `DEF_eff = DEF_total × (1 − F / 60)` (at F = 30, your defense is at 50%), which **raises the opponent's xG_round** against you.
- **Reset:** the **Water Break / Fresh Legs** Tactical Card sets your F to 0; an automatic **Halftime at round 4** clears F for **both** teams.

This does the work the old Stoppage Time did — defenses fray as the match wears on, so **late rounds get higher-scoring and the closing minutes become dramatic** — and it gives every round a real tension: **attack** (fill your meter *and* rest your legs, but leave yourself open this round) vs **defend** (safe now, but tiring and not scoring). It's also the natural counter to defensive stacking (Fortress/Catenaccio): turtle too long and your own fatigue hands the opponent the goal.

---

## 9. Formations *(unchanged mechanic — now feeds xG)*

Pick one each round; it multiplies your committed **ATK_eff / DEF_eff** (applied after synergies, before fatigue), which in turn scales the xG each side accrues. Free, changes every round.

| Formation | Shape | ATK | DEF |
|---|---|---|---|
| **Offensive** | 3-4-3 | **×1.2** | ×0.8 |
| **Balanced** *(default)* | 4-3-3 | ×1.0 | ×1.0 |
| **Defensive** | 5-4-1 | ×0.8 | **×1.2** |

Formation is a **broadcast stance** (shown via Intent); lane allocation is your **hidden execution**. Symmetric multipliers → trades, not hard counters. *Opponents have a `preferredFormation` and may switch (Italy '82 Defensive, Brazil '70 Offensive).*

---

## 10. The Round — phases

1. **Draw** — both **draw up to 5** (refill to the 5-card minimum; grays reshuffle in if the pile runs out); trigger Powers; apply any start-of-round fatigue/heat.
2. **Plan** — both privately **pick a Formation** and assign hand cards to **ATTACK / DEFENSE** (face-down), up to the **card cap** for the round (4/5/6, §6) and within stamina. **Tactical Cards are played face-up the moment they're committed — both players see them** (capped at **2 per half**, §6) and may keep adjusting their hidden lineups (and play their own Tactical Cards, e.g. VAR in response to an Offside Trap) until both **lock in**. *No separate phase — it all happens inside the planning window.*
3. **Intent** — each side continuously sees the opponent's **formation + any Tactical Cards played + committed card-count & stamina** — **never the player identities**.
4. **Reveal** — lineups flip simultaneously.
5. **Resolve (strict order):** a) **Instant** Tacticals (VAR → Offside → Referee → Injury) edit the boards → b) synergies, Powers, Captain's Pride → c) **formation multipliers** → d) **fatigue** applied to defense → e) **compute xG_round for both teams** (doubled in extra time) and add to the pressure meters; any meter that **fills triggers a SHOT** that converts with probability `P` (v11 §7) → **GOAL** (meter empties) or **SAVED** (meter drops) → f) **update fatigue** from this round's attack/defense weighting → g) **cleanup:** grays → discard, spent **premium players → locked**, spent **Skills/Instants → exiled**, Powers stay active. At **round 4 (halftime)** locked players return and fatigue clears for both. Then **check the score** (§14).
6. **Check score** (§14) — a **3-goal lead ends it instantly**; otherwise play on to **full time (90')**, then the **leader wins** (or **golden-goal extra time** if level).

**Visible Tacticals, hidden lineups:** because Tactical Cards swing games hard, telegraphing them creates a commitment/timing game (playing one first tips your hand — the chaos you want), while hidden lineups preserve the core bluff. **Debuff Tacticals auto-target by rule** (Offside = "their highest-ATK attacker") since you can't see the enemy lineup; **buff Tacticals attach to one of your matching-role players** and, by being visible, leak only that you *have* such a player.

---

## 11. Status Effects

| Status | Source | Effect |
|---|---|---|
| **Booked** | Referee | next foul/Referee → Red Card |
| **Red Card** | 2nd booking / certain Tacticals | **exiled** for the match |
| **Pressed** | High Press | your DEF **−10** and **fatigue +6** next round |
| **Injured** | Injury | **−15 ATK/DEF for the match** |
| **On Form** (Momentum) | scoring or 3 high-pressure rounds | **+0.10 xG** next round |

*(Fatigue is tracked separately as the xG rate dial, §8 — not a status.)*

---

## 12. Tactical Cards — re-statted to xG/goals, many tied to players

Three categories: **Instant** (resolves first, reactive — e.g. VAR), **Skill** (one-shot), **Power** (persists for the match). **Every Tactical Card is single-use** — you can't replay it: **Instants and Skills are exiled** the moment they resolve (no halftime return), and a **Power** stays **active on your board** for the rest of the match (also unrepeatable). On top of that, **you may play at most 2 Tactical Cards per half — 4 per match** (§6), and your Run deck holds **~4 tacticals** (§5), so they stay precious one-shot trumps rather than a per-round barrage. Start with **≤1**; earn the rest. **A Skill that boosts a phase of play requires a matching-role player in your lineup and buffs that player**; officiating/disruption Instants and match-long Powers are unconditional. Values are tuning starting points.

| Card | Cat. | Stamina | Requires | Effect (xG terms) |
|---|---|---|---|---|
| **VAR Review** | Instant | 2 | — | Cancel one opposing Tactical Card played this round. |
| **Offside Trap** | Instant | 2 | ≥1 **DEF** | The opponent's **highest-ATK** attacker contributes **0** to their xG this round. |
| **Referee's Whistle** | Instant | 1 | — | **Book** an opposing player; if already Booked → **Red Card** (exile). |
| **Injury** | Instant | 2 | — | **Injure** one opposing player (−15/−15 for the match). |
| **Water Break / Fresh Legs** | Skill | 0 | — | **Reset your fatigue to 0** and gain +2 stamina this round. |
| **Substitution** | Skill | 1 | — | Discard up to 2, draw +1, and **reduce fatigue by 8** (fresh legs). |
| **Tiki-Taka** | Skill | 1 | ≥2 **MID** | **+0.20 xG** this round (passing triangles unlock the chance). |
| **Catenaccio** | Skill | 2 | ≥2 **DEF** | **Halve** the opponent's xG against you this round. |
| **Counter-Attack** | Skill | 1 | a **FWD** | If your DEF_eff ≥ their ATK_eff this round, add **+0.40 xG** (capped) on the break. |
| **High Press** | Skill | 1 | ≥2 **FWD/MID** | Opponent gains **Pressed** (DEF −10, **fatigue +6**) next round. |
| **Long Ball** | Skill | 1 | a **FWD** | A direct chance: **+0.45 xG** this round, ignoring the opponent's defense. |
| **Nutmeg** | Skill | 1 | a **FWD** | That FWD **ignores the opponent's defense** this round (its full ATK feeds your xG). |
| **Penalty Kick** | Skill | 2 | a **FWD** | The FWD takes a penalty: forces a **SHOT this round at ≈0.78 conversion**, regardless of build-up (v11; was +0.85 xG). |
| **Halftime Team Talk** | Skill | 1 | — | Remove all debuffs from your cards, **clear your fatigue**, draw 2. |
| **Time Wasting** | Skill | 1 | — | The opponent's **xG floor drops to 0** next round (a passive attack creates nothing). *(v11: the original "draws 1 fewer" half is not implemented in the shipped engine.)* |
| **Hand of God** | Power | 3 | a **FWD** | **Once per match:** forces a near-certain **SHOT at ≈0.95 conversion** through that FWD (v11; was an automatic +1.0 xG goal). |
| **Fortress** | Power | 3 | — | Persistent: **+8 to your DEF_eff** every round. |
| **Talisman** | Power | 2 | — | Persistent: your **Captain's-nation** cards **+3 ATK / +3 DEF**. |
| **Total Football** | Power | 3 | — | Persistent: each player also gives **50% of its other stat to the opposite lane**. |

GK note: keepers aren't a card — a **GK in your defense lane suppresses opponent xG** (its high DEF + a flat save bonus), which is how "use a keeper → higher chance to defend" is expressed.

---

## 13. Opponents — Historic Teams *(unchanged from v3)*

Every opponent is a real historic national team as an enemy deck (era XI as player cards) with a `strength`, `preferredFormation`, optional `signatureTactical`, and a blurb. **Stage gates which tiers appear** (§2).

| Tier | Feel | Examples | From |
|---|---|---|---|
| **D** | Underdogs | Saudi Arabia '94, Senegal '02, Costa Rica '14, Canada '22 | Group |
| **C** | Dark horses | South Korea '02, Croatia '98, Ghana '10, Morocco '22 | R16 |
| **B** | Contenders | Netherlands '78, Portugal '06, Belgium '18, Colombia '14 | QF |
| **A** | All-time greats | Netherlands '74, Hungary '54, Brazil '82, Netherlands '10 | SF |
| **S** | **Champions** | the 22 below | **Final** |

**Champions (Tier S, Final only):** Uruguay 1930 · Italy 1934 · Italy 1938 · Uruguay 1950 · West Germany 1954 · Brazil 1958 · Brazil 1962 · England 1966 · **Brazil 1970** · West Germany 1974 · Argentina 1978 · Italy 1982 · Argentina 1986 · West Germany 1990 · Brazil 1994 · France 1998 · **Brazil 2002** · Italy 2006 · Spain 2010 · **Germany 2014** · France 2018 · Argentina 2022. *(Add the 2026 winner when known.)*

Matchmaking: filter the pool to allowed tiers, exclude defeated teams, draw one weighted by stage; the Final always picks a champion. Arcade opponents also get a **per-stage AI strength handicap** that steepens up the bracket (**Final ×1.15**), and a drawn champion is lifted to a **champion strength-floor** (`OVR 86`: its `aiStrengthMult` is scaled by `max(1, 86 / its top-11 OVR)`, so weak-era winners are normalized up to champion level and strong ones untouched) so a soft-champion draw is never an easy Final — every Final is a wall (sim-validated monotone, SF→Final **9.5pp**, ~7.9% completion, §19 #20). Give each side signature touches (Brazil '70 Offensive + Tiki-Taka; Italy '82 Defensive + Catenaccio + Fortress; Netherlands '74 Total Football).

---

## 14. Match Structure, Win Condition & Extra Time

- **A match is 8 rounds = 90 minutes**, shown as a running **match clock** (flavor, not a per-round timer): **R1–R4 at 0' / 15' / 30' / 45'** (halftime after R4) ∥ **R5–R8 at 46' / 60' / 75' / 90'** (full time after R8). R5 sits at 46' so the second-half kickoff reads apart from the 45' halftime whistle. *(Implementation: a fixed lookup `[0, 15, 30, 45, 46, 60, 75, 90]`, not a per-round formula.)*
- **Goals** come from the xG engine across the whole 90 (§7) — there is **no "race to 3."** Both meters keep filling all match; the scoreline can be anything (1–0, 3–2, 4–3…).
- **A round resolves fully before the score is checked** — both xG meters update, *then* the game evaluates the result. Goals in the same passage both count.
- **Mercy rule:** the instant a side leads by **3 goals** (3-0, 4-1, 5-2…), the match **ends immediately** — that side wins. Spares a hopeless side from playing out a blowout, and is never ambiguous (a 3-goal lead can only belong to one team). *(This retires the old simultaneous-3 problem entirely.)*
- **Full time (90'):** if no mercy triggered, **whoever is ahead on goals wins.**
- **Level at full time → partial xG tie-break, then Extra Time** (v12 §19#5): first, if one side **created clearly more xG** across the 90 (accumulated-xG gap ≥ `XG_TIEBREAK_GAP` = **1.0**) it **wins outright** — the better chances are rewarded and a one-sided "draw" doesn't go to a coin-flip sprint (decides ~11% of matches). Only a **genuinely even** game (gap < 1.0, ~23% of matches) goes to **Extra Time:** sudden death — **first to score wins (golden goal).** ET rounds resolve as **true sudden death** (v11): both sides build pressure, then the **higher-pressure side shoots first** and the **first goal ends the match** — only one side can score per passage, so ET settles in a round or two instead of trading goals into a 9–9 marathon. To keep it fast, **each ET round's xG fill is doubled**, and ET begins with **both xG meters reset to 0**, **all locked players returned**, and **fatigue cleared** (a clean, fresh sprint). *Safety:* if somehow still level after ~5 ET rounds, the **higher accumulated ET xG** wins. ET produces a winner in **both** modes (no draws).
- **Lose → run over** (Arcade Run). **Win the run:** take the Final.
- **Momentum / On Form:** scoring, or 3 high-pressure rounds in a row, grants **+0.10 xG** next round.

The score is a normal **scoreboard** (e.g. "ARG 3 – 2 BRA") with the clock — the old 5-ball strip is retired, since scores can now exceed 3–2.

---

## 15. Tuning Table (every knob)

| Parameter | value |
|---|---|
| Run length | 7 matches (3 group · R16 · QF · SF · Final) · loss = run over |
| Match length | **8 rounds = 90'**; clock `0/15/30/45` (HT after R4) ∥ `46/60/75/90` (FT after R8) |
| Win condition | **lead by 3 → instant win**; else **most goals at full time**; level → extra time |
| xG tie-break (v12 §19#5) | level at full time + accumulated-xG gap ≥ `XG_TIEBREAK_GAP` **1.0** → higher-xG side wins (no ET); else golden-goal ET. Swept to land **ET ~23%** (was structural ~34%); decides ~11% of matches (~−1.7pp completion) |
| Extra time | **golden goal**, **xG fill ×2**, meters reset to 0, stars + fatigue refreshed; **shot-based sudden death — higher-pressure side shoots first, first goal ends it** (only one side can score per passage); safety: higher ET xG after ~5 ET rounds |
| xG per round (fill) | `clamp(0.05 + max(0, ATK_eff − DEF_eff)/210, 0, 0.65)` → fills the pressure meter (`PRESSURE_FULL` 0.70); a **full meter takes a SHOT** (v11 finishing, §7) — no longer an auto-goal |
| Finishing (v11) | full meter → shot at `P` = `BASE_CONVERSION` 0.75 + pity + momentum − Park-the-Bus, cap 0.95; goal empties, miss drops half; Penalty 0.78 / Hand of God 0.95 forced shots (ignore the bus) |
| Park the Bus (v12) | GK + ≥2 DEF (or ≥3 DEF) this round → opponent's open-play shot conversion `− PARK_THE_BUS_PENALTY` 0.20 (forced shots exempt) |
| Snap Shot (v12) | `xG_round` near the 0.65 cap → slim early-shot chance on a partial meter: `clamp((xG_round − SNAP_THRESHOLD 0.55) × SNAP_SCALE 1.0, 0, SNAP_CAP 0.10)`; converts as a normal shot, and the attempt **resets the meter to 0 (goal or miss)** — a tempo gamble, not free upside |
| Card flow | grays cycle freely · **premium players lock → return at halftime / start of ET** (once-per-half) · **Tactical Cards single-use (exiled)** |
| Starting XI | 11 players, slot budget **10**, + 0–1 Tactical |
| Quickplay deck | ~16 players, slot budget **20**, + **up to 3** Tactical; pick difficulty → opponent tier |
| Slot costs | Common 0 · Rare 1 · Epic 2 · Legendary 3 · Tactical 1 (legendary Tacticals 2–3) |
| **Per-card stamina cost** (to field/round) | **Common 2 · Rare 2 · Epic 3 · Legendary 4** (gentle curve, v10; was 2/3/4/6) |
| Commons (v12) | **collectible & pickable** — pick from your owned commons, or "Fill randomly"; balance re-sim pending (§19) |
| Reward / win | +1 random player (rarity by stage) + choose-1-of-3 Tactical *(run-scoped; permanent unlocks via boxes, §20)* |
| Opening hand / draw | open 5 (Captain) · **draw up to 5 each round (minimum hand 5)**; grays reshuffle mid-draw to guarantee the refill |
| Tactical limits | **≤2 plays per half (4/match)** · Run **deck cap ~4** (swap past cap) · single-use (exiled) — all tunable |
| Stamina | **8**/round (R1–4), **10** (R5–6), **12** (R7–8), both players |
| **Card cap / round** | **4** (R1–4) · **5** (R5–6) · **6** (R7–8) — player cards only, attack+defense combined |
| **Rarity multiplier** | Common ×1.0 · Rare ×1.1 · Epic ×1.2 · Legendary ×1.3 — **lane force-multiplier, lane ≥2 cards** (v11); GK ≥87 anchors ×1.3 |
| **Diminishing returns** (lane stacking, v10) | per lane, contributions sorted high→low × `[1.00, 0.85, 0.70, 0.55, 0.40, 0.25]` — quality beats count |
| **Star-core discount** (v10) | in a lane with ≥1 premium, non-anchor cards cost **×0.5 stamina** (round down, min 1); all-common lane = no discount |
| ATK/DEF split | FWD 1.0/0.55 · MID 0.85/0.78 · DEF 0.55/1.0 · GK 0/+5 def-only (+ save xG-suppression) |
| Formations | Off ×1.2/×0.8 · Bal ×1/×1 · Def ×0.8/×1.2 |
| Fatigue | 0–30; `DEF_eff = DEF_total × (1 − F/60)`; defend raises, attack lowers; cleared at halftime / ET / by Water Break |
| Synergies | Chemistry 3+ same nation +2/+2 · Strike Partnership 2+ FWD +5 ATK · Back Line 3+ DEF +8 DEF · Midfield Engine 2+ MID +1 stamina |
| Captain's Pride | +2/+2 same nation |
| Counter-Attack xG | +0.40 (capped) on a successful defense |
| Momentum | +0.10 xG next round |
| Intent | formation + Tactical Cards + card-count + stamina (lineups hidden) |
| **Collection / boxes** (v12) | see §20 — Group / Knockout / Champions boxes (5 cards); dupes → craft (or XP); nation perks; run / level / welcome-bundle box grants |

---

## 16. UI / Screens — for Claude Design

North star: **FIFA Ultimate Team card art on a Slay-the-Spire run.** Stadium-at-night, glossy. Card frames by rarity (silver/blue/purple/gold), position badge, **ATK (red) / DEF (blue)** pips. The player figure is a **per-nation football-jersey kit** — a procedural SVG rendered in the nation's colours (solid / vertical-stripe / checkerboard), in place of a generic role silhouette; unknown nations fall back to flag-derived colours. *(Kit-art handoff: `design/design_handoff_jersey_cards/`.)*

1. **Entry / Main menu** — three options open **without login**: **Quickplay**, **Login with Google**, **How to Play**. After login, four more enable: **Arcade Run**, **Multiplayer** *(future mode — the PvP flagged in §19/§20)*, and **Account** (with **Collection** inside it); first registration also prompts for a **username**, and grants the **4-box welcome bundle** (§20). **Quickplay** (no login) opens a **difficulty picker** (Easy / Medium / Hard / Legendary → opponent tier) and the **loaded-deck builder** (~16 players / **20 slots** + up to 3 Tactical Cards, **all players available**); then straight into a single match.
2. **Run Map / Bracket** — 7-stop ladder, progress lit, next opponent crest + year + difficulty stars; Final glows.
3. **XI Builder** — pick **premium players** from a filterable pool against a **Slot Budget meter** (x/10 in the Run, **x/20 in Quickplay**), set a Captain, and stock the **Tactical tray** (start ≤**1** in the Run → cap **~4** via rewards; **up to 3** in Quickplay). You **pick the commons** that complete your roster — from your **collection** in the Arcade Run (§20), or from the **full pool** in Quickplay (all players) — or hit a **"Fill randomly"** button to auto-complete. ATK/DEF + cost curves shown for the premiums.
4. **Locker Room** *(Arcade Run only)* — reward player reveal, **choose-1-of-3 Tactical**, set Captain, deck list, next-opponent preview.
5. **Match Board (centerpiece):**
   - **Scoreboard + match clock:** a normal **numeric scoreboard** ("ARG 2 – 1 BRA") and a **running clock** — kickoff → **45' HALFTIME** (round 4) → **90' FULL TIME** (round 8) → **ET** if level. A subtle **"–3 to win"** marker hints at the mercy threshold.
   - **xG meter** per team — **always visible**, shown as a **filling bar (not a precise decimal)** so it reads as football. The round's gain **animates in on reveal**, and a **fatigue "heat" glow** shows when that side's defense is tiring (§8). Both bars on screen at all times is load-bearing — it's how you make the attack-vs-defend call, and watching the opponent's bar **flatline against your wall** is the payoff for defending. A **full bar takes a SHOT** (the bar shows the conversion % beforehand) → **full-screen "GOAL!!!"** (crowd roar, net-ripple) **or "SAVED!"** if the keeper wins it.
   - **Three card zones** beside your hand: the **draw/discard** count (grays cycling), a **bench/locked pile** for spent **premium players** (with a "returns at halftime" cue), and an **exiled** sliver for spent **Tactical Cards**.
   - **Formation selector** (3 shapes) for the round; **ATTACK / DEFENSE** lanes to drag face-down cards into (up to the card cap).
   - **Tactical Cards play face-up in a prominent center slot** with a clear callout ("⚠ OFFSIDE TRAP", "PENALTY!") — visible to both, and they visibly **burn/exile** after resolving. Lineups stay face-down until reveal.
   - **Intent strip:** "Opponent: Offensive (3-4-3) · 3 cards · 6 stamina · played **Catenaccio**."
   - Booked = yellow corner; Red Card animates off; **Halftime (45')** = a "Fresh Legs" beat — benched stars slide back to the deck, fatigue cools, for both sides; **Extra Time** = a distinct golden-goal mode (decks refreshed, doubled-xG bars, "next goal wins" banner).
6. **Result / Run-over / Trophy** — final score + **MVP** (most xG/goals); in the Run, a loss → run summary + restart, the Final → trophy lift; in Quickplay, **Win / Loss** + rematch (ET means no draw by default). **Reward boxes** open here (§20).
7. **Card detail modal** — ATK/DEF, ability/Tactical text, World Cup tag, (opponents) team blurb.
8. **Collection / Store** *(meta, §20)* — browse the collection by nation with **nation-perk tracks** and completion %, **open boxes** (the 5-card reveal), and **craft** missing players from duplicate Scraps.

Feel: snappy drag-to-lane and formation toggles; **the GOAL animation is the money moment** — make it big; Tactical Cards land with weight then burn away (single-use); fatigue heat creeps visibly; the halftime fresh-legs and golden-goal extra-time beats are distinct, dramatic moments; the **box-open** is its own little ceremony.

---

## 17. Data Model — for Claude Code

```ts
type Position = "GK" | "DEF" | "MID" | "FWD";
type Rarity   = "common" | "rare" | "epic" | "legendary";
type Lane     = "attack" | "defense";
type Formation = "offensive" | "balanced" | "defensive";
type TacticalCat = "instant" | "skill" | "power";
type Tier = "S" | "A" | "B" | "C" | "D";

const RARITY_MULT: Record<Rarity, number> =        // v11: a LANE force-multiplier (applied to the
  { common: 1.0, rare: 1.1, epic: 1.2, legendary: 1.3 };     //   whole lane, only when laneSize >= 2; highest tier wins)
const GOLD_THRESHOLD = 87;                          // v11: a GK at/above this overall anchors its lane at ×1.3 (legendary)
const COST_BY_RARITY: Record<Rarity, number> =     // per-round stamina to FIELD a card (v10 gentle curve)
  { common: 2, rare: 2, epic: 3, legendary: 4 };
const STACK_WEIGHTS = [1.00, 0.85, 0.70, 0.55, 0.40, 0.25];  // v10 diminishing returns, per lane (apply to sorted-desc contributions)
const STAR_SYNERGY_DISCOUNT = 0.5;                 // v10: non-anchor cards in a lane with >=1 premium pay this fraction of cost (min 1)
const XG_FLOOR = 0.05, XG_SLOPE = 210, XG_CAP = 0.65;        // xG FILL curve (per round, into the meter)
// v11 probabilistic finishing — a full meter takes a shot that converts at P:
const PRESSURE_FULL = 0.70;                         // meter value that triggers a shot
const BASE_CONVERSION = 0.75;                       // base shot conversion at a full meter
const CONVERSION_CAP = 0.95;                        // open play is never certain
const MISS_DROP_FRAC = 0.5;                         // fraction of the meter lost on a miss
const PITY_STEP = 0.07, PITY_CAP = 0.25;           // +conversion per consecutive miss (bad-luck protection)
const MOMENTUM_CONVERSION = 0.06;                  // max conversion bonus from momentum
const PENALTY_CONVERSION = 0.78, HAND_OF_GOD_CONVERSION = 0.95;   // tactical forced-shot floors
const PARK_THE_BUS_PENALTY = 0.20;                 // GK + >=2 DEF (or >=3 DEF): -conversion on opponent's open-play shot
const SNAP_THRESHOLD = 0.55, SNAP_SCALE = 1.0, SNAP_CAP = 0.10;   // near-maxed xG_round (cap 0.65) → slim early-shot chance on a partial meter
const XG_TIEBREAK_GAP = 1.0;                        // v12 §19#5: level at full time + accumulated-xG gap >= this → higher-xG side wins (no ET)
const STAMINA  = (round: number) => round <= 5 ? 8  : round <= 8 ? 10 : 12;
const CARD_CAP = (round: number) => round <= 5 ? 4  : round <= 8 ? 5  : 6;   // player cards/round

interface TacticalEffect {            // engine switches on `kind`
  kind: "var" | "offsideTrap" | "referee" | "injury"
      | "waterBreak" | "substitution" | "tikiTaka" | "catenaccio"
      | "counterAttack" | "highPress" | "longBall" | "nutmeg"
      | "penalty" | "teamTalk" | "timeWasting"
      | "handOfGod" | "fortress" | "talisman" | "totalFootball";
  amount?: number;                    // e.g. xG bonus, stat delta
  requiresPosition?: Position;        // FWD/MID/DEF/GK gate (buff cards)
  requiresCount?: number;             // e.g. 2 for ">=2 MID"
  duration?: number;
}

interface PlayerCard {
  id: string; type: "player";
  name: string; nation: string; worldCup: number; club?: string;
  position: Position; overall: number;
  atk: number; def: number; saveBonus?: number;   // GK xG-suppression
  cost: number; rarity: Rarity; slots: number;
  ability?: TacticalEffect;
}
interface TacticalCard {
  id: string; type: "tactical"; name: string; category: TacticalCat;
  cost: number; slots: number; rarity: Rarity; effect: TacticalEffect;
}
type Card = PlayerCard | TacticalCard;

type StatusKind = "booked" | "red" | "pressed" | "injured" | "onform";
interface Status { kind: StatusKind; amount?: number; duration?: number; }
interface CardInPlay { card: Card; lane?: Lane; statuses: Status[]; faceDown: boolean; }

interface OpponentTeam {
  id: string; name: string; nation: string; year: number;
  tier: Tier; strength: number; squad: PlayerCard[];
  signatureTactical?: TacticalCard[]; preferredFormation: Formation;
  isChampion: boolean; blurb?: string;
}

interface PlayerState {
  goals: number;                 // uncapped; mercy at a 3-goal lead, else most at full time
  xg: number;                    // v11 PRESSURE meter [0..PRESSURE_FULL]; a full meter takes a shot — goal empties it,
                                 //   miss drops it by MISS_DROP_FRAC; reset to 0 for ET (NOT accumulate-and-carry)
  fatigue: number;               // 0..30, the xG fill-rate dial (NOT a second meter)
  scoredFirstAt: number | null;  // round of first goal (kept for reference)
  maxStamina: number;            // STAMINA(round): 8 / 10 / 12
  stamina: number;               // resets each round (+ Water Break)
  drawPile: Card[]; hand: Card[]; discard: Card[];   // discard = grays only; reshuffles into drawPile when empty
  locked:  Card[];               // benched premium PLAYERS; return to drawPile at halftime & at start of ET
  exiled:  Card[];               // spent Tactical Cards (single-use) + red-carded players (never return)
  tacticalsThisHalf: number;     // plays used this half; cap TACTICALS_PER_HALF (=2); reset at halftime & ET
  board: { attack: CardInPlay[]; defense: CardInPlay[] };
  formation: Formation;
  powers: TacticalCard[];        // active Power tacticals for the match
  captainId: string; momentum: number; handOfGodUsed: boolean;
  missStreak: number;            // v11: consecutive missed shots → pity conversion bonus on the next shot
}

const HAND_SIZE = 5;             // draw up to this each round (minimum hand)
const TACTICALS_PER_HALF = 2;    // max tactical PLAYS per half (4 per match)
const RUN_TACTICAL_DECK_CAP = 4; // max tacticals carried in a Run deck (swap past cap)

interface MatchState {
  round: number;                 // 1..10 regulation
  extraTime: boolean; etRound: number;   // golden-goal ET (xG doubled, meters reset)
  players: [PlayerState, PlayerState];   // [0] human, [1] opponent
  opponent: OpponentTeam;
  phase: "draw" | "plan" | "reveal" | "resolve" | "end";
  winner: 0 | 1 | null;          // (an optional Quickplay-draw toggle could add "draw")
}

interface RunState {
  matchIndex: number; stage: "group" | "r16" | "qf" | "sf" | "final";
  deck: Card[];                  // premiums you picked + commons you picked (or random-filled), to roster size
  captainId: string; defeated: string[]; alive: boolean;
}
```

**Round resolution (pseudocode):**
```
// Deck build: budget buys premiums; commons (0-slot) are PICKED from your OWNED commons,
// or auto-filled at random from them. (v12: pick-your-own; commons must be owned — §20.)
function buildDeck(premiumPicks, commonPicks, rosterSize, ownedCommons):
    assert all(c.rarity != "common" for c in premiumPicks)
    assert all(c in ownedCommons for c in commonPicks)          // can only field commons you own
    assert sum(slotCost(c) for c in premiumPicks) <= BUDGET     // 10 run / 20 quickplay (commons are 0-slot)
    chosen = premiumPicks + commonPicks
    if chosen.length < rosterSize:                              // "Fill randomly" / remaining slots
        chosen += sample(ownedCommons \ commonPicks, rosterSize - chosen.length)
    return shuffle(chosen)

// At commit/lock-in: reject a lineup if it exceeds the card cap or stamina.
// Per-round stamina uses the v10 star-core discount, computed PER LANE:
function laneStamina(cards):                          // cards committed to ONE lane
    if cards.empty: return 0
    hasPremium = any(c.rarity != "common" for c in cards)
    anchor     = argmax(cards, c => c.cost)           // most-expensive card pays full
    total = 0
    for c in cards:                                   // base = COST_BY_RARITY[c.rarity]
        if hasPremium and c != anchor:
            total += max(1, floor(c.cost * STAR_SYNERGY_DISCOUNT))   // half-price support
        else:
            total += c.cost
    return total

function validLineup(m, p):
    atk = laneCards(m,p,"attack"); def = laneCards(m,p,"defense")
    return (atk.length + def.length) <= CARD_CAP(m.round)
        and laneStamina(atk) + laneStamina(def) <= STAMINA(m.round) + tempStamina(m,p)  // Water Break etc.

// stat contribution folds in the rarity multiplier per card:
atkOf(c) = c.atk * RARITY_MULT[c.rarity] * statusMods(c)
defOf(c) = c.def * RARITY_MULT[c.rarity] * statusMods(c)

// Start of round: refill each hand up to HAND_SIZE, recycling grays if the pile runs dry:
function drawToHand(m, p):
    while p.hand.length < HAND_SIZE:
        if p.drawPile.empty:
            if p.discard.empty: break                       // nothing left to recycle (grays make this degenerate)
            p.drawPile = shuffle(p.discard); p.discard = []  // only grays ever live in discard
        p.hand.push(p.drawPile.pop())

// Tactical play guard (during planning): single-use + per-half cap:
function canPlayTactical(p): return p.tacticalsThisHalf < TACTICALS_PER_HALF
function playTactical(m, p, card):
    assert canPlayTactical(p)
    p.tacticalsThisHalf += 1                                 // Instants/Skills exile on resolve; Powers → p.powers

function resolveRound(m):
    resolveInstants(m)                          // VAR → Offside → Referee → Injury edit boards

    // v10: combine a lane's per-card contributions with DIMINISHING RETURNS
    // (sort high->low, weight by STACK_WEIGHTS; the 4th-5th body adds little):
    function laneStack(contribs):
        s = sort(contribs, descending)
        return sum( s[i] * (i < STACK_WEIGHTS.length ? STACK_WEIGHTS[i] : 0) for i in 0..s.length-1 )

    for p in [0,1]:
        atk[p] = laneStack([atkOf(c) for c in laneCards(m,p,"attack")])  + atkSynergy(m,p)
        def[p] = laneStack([defOf(c) for c in laneCards(m,p,"defense")]) + defSynergy(m,p) + saveBonus(m,p)
        fo = FORMATIONS[m.players[p].formation]
        atk[p] = round(atk[p] * fo.atkMult)
        def[p] = round(def[p] * fo.defMult) * (1 - m.players[p].fatigue/60)   // fatigue saps defense

    // per-side xG FILL this round (curve constants are v10-tuned):
    function xgAddFor(scorer):
        delta = atk[scorer] - def[1 - scorer]
        x = clamp(XG_FLOOR + max(0, delta)/XG_SLOPE, 0, XG_CAP)
        x = applyTacticalXg(m, scorer, x)         // Tiki-Taka, Long Ball, Counter, Nutmeg, Momentum...
        if m.extraTime: x *= 2                     // golden-goal ET fills fast
        return x

    // v11 finishing + v12 Snap Shot: a full meter (or a near-maxed attacking round) takes a shot at P; a goal OR a snap attempt empties the meter, a normal full-meter miss drops half
    function takeShot(scorer) -> {scored}:
        forced = forcedShotPending(m, scorer)               // Penalty (0.78) / Hand of God (0.95)
        snap = false
        if m.players[scorer].xg < PRESSURE_FULL and not forced:
            // Snap Shot (v12): a near-maxed attacking round can fire an early shot on a partial meter
            snapChance = clamp((m.players[scorer].xgRound - SNAP_THRESHOLD) * SNAP_SCALE, 0, SNAP_CAP)
            if roll() < snapChance: snap = true
            else: return {scored:false}                     // no shot this round
        P = forced ? forcedConversion(m, scorer)               // penalties / Hand of God ignore the bus (1v1)
                   : clamp(BASE_CONVERSION
                           + min(PITY_CAP, PITY_STEP * m.players[scorer].missStreak)
                           + momentumBonus(m, scorer)            // up to MOMENTUM_CONVERSION
                           - parkTheBusPenalty(m, opp(scorer)),  // GK + >=2 DEF (or >=3 DEF): PARK_THE_BUS_PENALTY
                           0, CONVERSION_CAP)
        if roll() < P:
            m.players[scorer].goals += 1
            m.players[scorer].xg = 0                         // goal empties the meter
            m.players[scorer].missStreak = 0
            return {scored:true}
        else:
            if snap:
                m.players[scorer].xg = 0                     // a Snap Shot spends your pressure: meter resets whether it scores or not (pity untouched)
            else:
                m.players[scorer].xg *= MISS_DROP_FRAC       // normal full-meter miss: keep some pressure
                m.players[scorer].missStreak += 1
            return {scored:false}

    if not m.extraTime:                            // REGULATION: both meters fill; simultaneous goals count (mercy handles it)
        for scorer in [0,1]:
            addPressure(scorer, xgAddFor(scorer))  // fill the meter [0,1]
            takeShot(scorer)                       // full/forced → roll P
    else:                                          // EXTRA TIME: shot-based sudden death — first goal ends it
        m.etRound += 1
        addPressure(0, xgAddFor(0)); addPressure(1, xgAddFor(1))   // both build (fill already ×2)
        order = (xgOf(m,0) >= xgOf(m,1)) ? [0,1] : [1,0]           // higher-pressure side shoots first
        for s in order:
            if takeShot(s).scored: break                          // first golden goal ends the passage

    for p in [0,1]:
        m.players[p].fatigue = clamp(m.players[p].fatigue + fatigueDelta(m,p), 0, 30)   // defend↑ attack↓
    if m.round == 4 and not m.extraTime: halftime(m)    // 45': stars back + fatigue cleared, both sides

    cleanupBoards(m)            // grays→discard · premium players→locked · spent Skills/Instants→exiled · Powers stay
    checkWin(m)

function halftime(m):                               // round 4 reset, both teams
    for p in [0,1]:
        m.players[p].drawPile += m.players[p].locked; shuffle(m.players[p].drawPile)
        m.players[p].locked = []; m.players[p].fatigue = 0; m.players[p].tacticalsThisHalf = 0

function beginExtraTime(m):                          // level at full time → fresh golden-goal sprint
    m.extraTime = true; m.etRound = 0
    for p in [0,1]:
        m.players[p].xg = 0                            // meters reset, goals carry (e.g. 2–2 stays)
        m.players[p].missStreak = 0
        m.players[p].drawPile += m.players[p].locked; shuffle(m.players[p].drawPile)
        m.players[p].locked = []; m.players[p].fatigue = 0; m.players[p].tacticalsThisHalf = 0

function checkWin(m):                                // ONCE, after the full round resolves
    g0 = m.players[0].goals; g1 = m.players[1].goals
    if not m.extraTime:
        if g0 - g1 >= 3: m.winner = 0; return         // 3-goal-lead mercy → instant win
        if g1 - g0 >= 3: m.winner = 1; return
        if m.round < 8:  return                        // keep playing the 90
        if g0 != g1:      m.winner = (g0 > g1 ? 0 : 1); return   // full time: leader wins
        beginExtraTime(m)                              // level at 90' → golden-goal extra time
    else:                                              // EXTRA TIME — golden goal
        if g0 != g1:      m.winner = (g0 > g1 ? 0 : 1); return   // first ET goal decides it
        if m.etRound >= 5: m.winner = (xgOf(m,0) >= xgOf(m,1) ? 0 : 1)   // safety: scoreless ET
```

**Generating data:** ingest a rating dataset → `overall/position/nation/worldCup`; derive `atk/def`, `saveBonus` for GKs, `cost`, `rarity/slots`. Build `OpponentTeam`s (22 champions mandatory Tier-S + ~20–30 more). Seed the ~19 Tactical Cards with their `requiresPosition`/`requiresCount` gates. The ~7k-player dataset also populates the **collection** and the **box drop pools** (§20).

---

## 18. Build Phasing for Claude Code

**MVP — build Quickplay first** (a single match is the fastest path to a playable core; the run shell wraps it afterward):
- **Quickplay flow:** deck builder → difficulty picker → one match → **Win/Loss + rematch** (ET decides level games). No run shell, no rewards needed yet.
- Deck builder (slot budget + Captain + Tactical tray + pick-or-random commons) — used by both modes.
- Card flow: **draw up to a 5-card hand each round** (grays reshuffle if the pile empties), **premium players lock until halftime**, **Tactical Cards single-use (exiled) and capped at 2 plays/half**; **ramping stamina (8/10/12)**; **per-round card cap (4/5/6)**; lane combat + **3 formations**.
- **Rarity lane multiplier** (lane ≥2 cards) + **diminishing returns** + **star-core discount**, so legendaries beat equal-count commons.
- **xG engine + v11 finishing + win logic** (per-team pressure meters, full meter → shot at P; **3-goal-lead mercy → instant win**, full-time leader wins, **shot-based golden-goal extra time** when level; **halftime reset** at round 4).
- **Fatigue** (defend↑/attack↓, cleared at halftime/ET, defense penalty).
- Intent (formation + Tactical Cards + counts).
- ~6 Tactical Cards incl. at least two player-gated ones (Penalty Kick→FWD, Catenaccio→DEF) plus Water Break (fatigue reset), Offside Trap, Counter-Attack, Referee's Whistle.
- ~12 OpponentTeams across tiers incl. a few champions; AI commits first.
- **GOAL animation** even in MVP — it's the core feel.

**V2 — wrap the run around it:** the 7-match **Arcade Run** shell (bracket, permadeath, score resets), **Locker Room** + post-match rewards, full Tactical set + all gates, statuses, Powers, Momentum, all 22 champions + extended pool, signature formations/Tacticals, animation polish, trophy screen, card-removal reward.

**V3 — meta-progression (§20):** the **collection + boxes + team perks** layer (box opening, duplicate craft, nation-perk tracks, run/level/welcome box grants), online leaderboards (fastest/cleanest runs), Arcade Continues, 2026 champion content.

**AI heuristic (MVP):** track its own xG/fatigue → pick formation (Defensive when fresh & protecting a lead, Offensive to chase or when its fatigue is high so it rests by attacking); split lanes to balance scoring vs exposure; play gated Tacticals only when it fields the required role; hold Penalty/Hand of God to convert; use VAR/Offside reactively against visible Tacticals/big commits. Keep it legible.

---

## 19. Open questions to playtest

1. **Scoring band — RESOLVED (v12 sweep); ET found structural.** Goals **landed**: a 12-cell sweep (`PRESSURE_FULL` {0.80, 0.75, 0.70} × `XG_CAP` {0.60, 0.65} × fatigue {current, steeper}) showed goals scale with `PRESSURE_FULL` (0.80→~4.7, 0.75→~4.9, 0.70→~5.0) and are ≈ insensitive to the cap; **shipped `PRESSURE_FULL` 0.70 / cap 0.65 / `SNAP_THRESHOLD` 0.55**, validated @N=3000 at **5.04 G/match** (in band, no overshoot, defense still suppresses, curve monotone 90→66→63→56→47). **ET is structural, not tunable** — it sat at **~34–37% in *every* cell**, flat to both the curve and fatigue. This **refutes the earlier "fatigue is the primary ET lever" hypothesis**: steeper fatigue (DIV 50 / GAIN 4) actually nudged ET *up*, because more goals and more late fraying lift *both* sides symmetrically, so the level-at-full-time rate (→ ET) doesn't move. The **~20–25% ET target is retired as unreachable by tuning**; the only lever is a resolution-rule change — decide level games by accumulated xG (§19 #5) — which is a design choice with its own difficulty-curve cost.
2. **Fatigue weight** (`F/60` defense penalty, gain/loss rate) — strong enough to punish turtling and create late goals, but not a death-spiral? Watch defensive-stack decks (Fortress + Catenaccio).
3. **Tactical xG values & limits** (Penalty/Hand of God forced shots, Long Ball 0.45, Tiki-Taka 0.20, Counter 0.40) — balanced now that each Tactical is **single-use** and you can play **only 2 a half (4/match)** from a **~4-card tactical deck**? Tune the **2/half** and **deck-cap ~4** in the sim: confirm the Final isn't decided by tactical spam, but tacticals still feel impactful when fired.
4. **Visible Tacticals timing game** — does telegraphing make players hoard their one-shot Tacticals to the last second? If lock-in feels like a stare-down, add a short planning timer.
5. **Extra time frequency — RESOLVED via partial xG tie-break (v12, option b).** ET resolves fast (true sudden death, 1–2 rounds — marathons gone), but the v12 sweep proved its *rate* is unmovable by *scoring* tuning (~34%, item 1). So we changed what a level-at-FT game does (option **b**, partial xG tie-break): a side with a **clear accumulated-xG edge** wins outright; only genuinely-even games go to ET. The gap threshold (`XG_TIEBREAK_GAP`) was swept on arcadeSim — **gap 1.0 lands ET ~23%** (validated N=3000: ET 23.2%, tie-break decides 10.7%, goals 4.95, curve still monotone). It reads as fair because the **pressure meter is on screen all match** (unlike hidden real-football xG). **Cost (as predicted):** completion dipped **~7.9% → ~6.2%** — level Finals now go to the stronger side (usually the handicapped champion), so the run got slightly harder; if that's too steep, either raise the gap (→ more ET, higher completion) or shave the Final handicap (item 20) to compensate. *(Options a = full xG tie-break (ET→0) and c = penalty shootout were not taken.)*
6. **Formation ±25%** — still swingy now that it scales xG? Try ±15–20% if goal output spikes on Offensive.
7. **Player-gated Tacticals & lineup leak** — playing "Penalty Kick" reveals you have a FWD; fun read or annoyance?
8. **Do premiums feel worth their slots? — RESOLVED in v10.** The original inversion (cheap all-common decks beating star-led ones) is fixed: in the sim a realistic star-led Run deck *and* a loaded Quickplay all-star deck both clearly beat an all-common deck at every tier, via **diminishing returns** (§7) + the **star-core discount** (§6) + the **gentle field-cost curve** (§4). Dials if it ever drifts: the rarity multiplier (toward 1.0 if stars get too strong), the stack weights, or the discount fraction. *(Re-verify under v12 pickable commons — item 15.)*
9. **Defense: throttle-only or drain?** Defense currently only slows the opponent's fill rate. If defending feels too passive, add a **small capped drain** when `DEF_eff` decisively beats `ATK_eff` (held in reserve; the sim decides).
10. **Quickplay draws** — ET makes every match decisive; if you'd rather allow casual 90' draws in Quickplay, that's a one-line toggle (skip ET when level).
11. **Premium-heavy decks & the half-lock** — a 20-slot Quickplay deck has many stars to rotate; a lean run deck burns through its few stars fast each half. Confirm both feel good (front-loaded star bursts then gray-grind, refreshed at halftime).
12. **Random-common variance** — the **"Fill randomly"** option (§5) draws from a ~60–79 OVR pool, so a lazy fill gives a slightly weaker bench than hand-picking. Mild by design (commons are low-impact); if it ever feels punishing, offer a **draft-style "fill from a random 3 per slot"** middle ground.
13. **Rares are a weak middle tier (v10 sim).** A rare-heavy "balanced" deck underperforms — it trades common sustain for only a small stat bump over commons. Consider widening the rare OVR band (or nudging its rarity multiplier) so rares feel worth a slot, or accept rares as a minor step-up. Tuning item, after the structure is locked.
14. **Tactical Cards are net-negative for an otherwise-common deck (v10 sim).** Adding tacticals to the all-common deck *lowered* its win rate and goals — a played tactical costs a player slot that round, and the current values/caps don't pay it back. Re-check the tactical xG values and the 2/half cap on a realistic (not all-common) deck before concluding, but the values likely want a small buff.
15. **Pick-your-own commons — balance re-sim (v12).** Commons are now hand-picked (§5), not rolled. Add a **"best-owned-commons" deck archetype** to the sim and confirm star-led decks still clearly win; if picking over-tilts toward commons, tighten the diminishing-returns weights or the common OVR band. (Ownership-gating softens it — you can only pick what you've collected — but deep collections can optimise.) Re-runs §8 with the new fill rule.
16. **Team-perk balance (v12, §20).** Nation perks add flat stat bonuses to fielded players, touching the xG fill math. Sim a **"+3/+3 nation" deck** before locking the perk tiers; if a maxed nation outruns the curve, lower the tier bonuses or gate the top tier behind a higher %.
17. **Collection pacing (v12, §20).** Box odds + the ~7k pool set "time to a full nation" and "time to a given legendary." Pull the per-nation and per-rarity counts from the dataset and re-tune the box tables and perk % thresholds to the target pace.
18. **Park the Bus — VALIDATED (v12 sim, 2026-06-29).** The focused test confirms it: a shot's conversion drops **79.0% → 55.5%** under a parked bus (~23.5pp, ≈ the 0.20 penalty + pity/momentum), yet the pure turtle still **loses 100%** (it sacrifices all attack, and most suppression is already in the *fill*) — *defensible, not a wall*, exactly as specced. In AI-vs-AI play a parked bus is uncommon (~0.25–0.30 bus-faced shots/match, ~41–45% saved). No change needed. **Re-confirmed at 8 rounds** (conversion 78.2% → 58.2%, A/B Δgoals ≈ 0).
19. **Snap Shot — VALIDATED, tempo-neutral at 8 rounds.** Confirmed at the raised cap/threshold: snaps fire **~2.3–4.3/100 shots** (down from ~5–6.5, as `SNAP_THRESHOLD` rose) and stay neutral (A/B Δgoals ≈ 0, Δwin ~−1…0pp) — the reset-to-0 keeps it a tempo gamble, not bonus goals. `SNAP_THRESHOLD` **tracks the cap** (cap − 0.10), so it moves with the item-1 sweep (→ 0.55 at the 0.65 center); re-verify it stays genuinely near-max-only at whatever cap the sweep picks.
20. **Difficulty monotonicity — RESOLVED (v12).** Strict single-tier sim cells showed Tier S (champions) playing *easier* than A/B — traced to the champion pool's **weak pre-1990 tail** (Uruguay 1930 80.7 … Argentina 1986 83.7, below every Tier-A side; the mean S 85.1 ≈ A 84.8 hides the lopsided spread). Not a live bug: the real run (`arcadeSim` — tier-and-above gating + per-stage handicap + deck growth) is **monotone** — group 92% → R16 68% → QF 65% → SF 57% → Final 55%. Hardened anyway so the Final is a genuine wall: **Final handicap 1.125 → 1.15** + a **champion strength-floor** (a drawn weak champion is normalized up to a floor; strong champions untouched), so every Final is hard regardless of which champion is drawn rather than a coin-flip on the draw (§16 matchmaking). The strict single-tier win% in earlier reports is a **mechanic-balance probe, not a difficulty model**. **Implemented & validated (v12):** `STAGE_AI_STRENGTH.final` **1.15** (1.2 was tried but spiked the Final — 34% win / 5.8% completion) + `CHAMPION_STRENGTH_FLOOR` **86** (a drawn champion's `aiStrengthMult` ×= `max(1, 86/squadTop11OVR)` — weak-era winners normalized up, strong ones untouched). Real-run curve at 8 rounds: monotone **92 → 66 → 61 → 54 → 44**, SF→Final gap **2.5pp → 9.5pp**, trophy completion **~7.9%** (a skill lower bound — the AI plays the human side).

---

## 20. Collection, Boxes & Team Perks *(v12 — the meta layer)*

A persistent layer wraps the run. Players are unlocked from **boxes**; duplicates convert; owning a nation's players unlocks **team perks**. *(Full spec: `wc-clash-collection-and-box-economy.md`.)*

**Foundations.**
- **Commons are collectible**, not free — the ~7k-player dataset is mostly commons, which fills the boxes and gives the collection a long tail. WCC is **collection-gated** (like FUT) **for the Arcade Run + meta**: your collection is your run-start pool, so a newcomer needs the welcome bundle to cold-start. **Quickplay is ungated** — all players available, no login — the try-before-you-register sandbox (§2).
- **In-run unlocks (the post-win reward player, §5) stay temporary;** the **box** is the persistent reward.
- **Box-tier names** are kept off the card rarities: **Group / Knockout / Champions** (a "Group box" can still drop a legendary).

**Boxes — 5 cards, 1 guaranteed headliner + 4 filler.** The headliner is a **random reveal** (no choosing) — boxes are the random thrill; **crafting** (dupes → Scraps) is the deliberate control. Per-slot odds (C/R/E/L, each column sums to 100):

| Box | Headliner (×1) | Filler (×4) | P(≥1 Legendary) |
|---|---|---|---|
| **Group** (entry) | R 83 · E 15 · L 2 | C 82 · R 16 · E 1.7 · L 0.3 | ~3% |
| **Knockout** (mid) | R 58 · E 37 · L 5 | C 57 · R 33 · E 9 · L 1 | ~9% |
| **Champions** (premium) | E 72 · L 28 | C 26 · R 42 · E 28 · L 4 | ~38% |
| **Champions — Trophy** *(win the Final)* | **L 100** | C 26 · R 42 · E 28 · L 4 | **100%** |

*(Optional pity: N legendary-less Champions boxes → next headliner forced Legendary.)*

**Where boxes come from.**
- **New-player welcome bundle (on registration):** logging in + choosing a username grants **4 boxes — 2 Group + 1 Knockout + 1 Champions**, the welcome Champions box guaranteeing a **Legendary headliner** — every player opens with a star and a nation to chase (≈ 10 commons / 6–7 rares / ~2 epics / ~1.3 legendaries; enough for a first Run deck).
- **Run-end rewards** (skill faucet; no run wasted): group-stage exit → **1 Group**; exit before semis → **1 Group + 1 Knockout**; lose semi/final → **2 Knockout**; **win the Final → 1 Champions — Trophy** (guaranteed Legendary).
- **Account level** (slow, time-based faucet): **XP from playing** — participation + win, escalating with arcade depth (Quickplay scales with chosen difficulty ≈25–65/win; **Multiplayer** much more ≈90/win — between Quickplay and a full run; a full winning run ≈570; *Multiplayer is a future, undesigned mode*) — fills a bar; each level-up grants a box. Tier is a **milestone overlay**: **Group** every level, **Knockout** every 5th, **Champions** every 10th, which keeps Champions boxes scarce even at high level. XP to advance from level L ≈ `min(25 × L, 300)` — front-loaded (level 2 after ~one match), then a flat 300/level plateau so high levels stay reachable (level 50 ≈ 23 runs or ~145 Multiplayer wins, not 70). Run-winning stays the primary path to Champions boxes; this is the trickle. **Prestige:** at **level 50** you can reset to level 1 for a **prestige rank** (Prestige I–X) + an exclusive cosmetic badge — keep all cards/boxes, and re-leveling repeats the full box rewards (milestones included, a mild Champions boost). The badge is a cosmetic flex (profile / Multiplayer / leaderboards), never power or matchmaking. *(Full detail: economy doc §7.)* *(XP from playing is separate from the duplicate → Scraps → craft track.)*

**Duplicates.** You field only one of each player, so any further copy is a duplicate. **Recommended:** dupes → "Scraps" currency → **craft the exact missing player** (priced by rarity) — the genre's best anti-frustration lever. *(Simpler alt: dupes → account XP → boxes.)* With ~7k mostly-common players the conversion faucet stays slow (you pull new commons for a long time).

**Team perks — the reason commons are worth collecting.** Owning players of a nation feeds a **nation collection track**; thresholds (as **% of that nation's pool**) unlock equippable perks for that nation's players when fielded:

| Track | Owned (% of nation) | Perk |
|---|---|---|
| Bronze | 20% | +1 ATK / +1 DEF |
| Silver | 40% | +2 / +2 |
| Gold | 60% | +3 / +3 + a nation-flavoured Tactical Card |
| Icon | 85% | a signature passive |

**Equip 1–2 nation perks per run** — building a run *around* a nation, stacking with Chemistry (3+ same nation) and Captain's Pride (§15). *Iconic XI:* completing a famous side's **actual XI** (the real Brazil 1970 eleven) unlocks a unique reward. **Balance:** perks add flat stat bonuses to fielded players, so they get a sim archetype before locking (§19, items 16–17).

**Earned-only.** Boxes are won through play + duplicate conversion, **not purchased** — sidestepping loot-box regulation/ethics (odds disclosure, regional bans, ESRB "random items" labels). Keep them non-purchasable.

---

*End of v12. A full 90-minute match: lead by 3 to end it early, else most goals at full time, shot-based sudden-death golden-goal extra time if level. Finishing is probabilistic — a full xG meter takes a shot (≈75% + pity/momentum), not an automatic goal — and a star multiplies its whole lane when paired. Your slot budget buys a premium core and you fill the bench with commons you've collected (pick them, or "Fill randomly"); stars are once-per-half trumps; Tactical Cards are single-use and capped at 2 a half. Wrapping it all is the meta layer (§20): unlock players from Group/Knockout/Champions boxes, convert duplicates, and assemble nations for team perks — the reason the long common tail is worth collecting. The v10 balance pass keeps premium investment paying off (diminishing returns, star-core discount, gentle field cost, the retuned xG curve); v12's pickable commons and team perks each get a sim re-check (§19) before they lock. Every value in §15 is a knob.*
