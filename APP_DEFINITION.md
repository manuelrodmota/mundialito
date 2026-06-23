# WORLD CUP CLASH — Game Design Document **v10**
*(working title — alternatives: Road to Glory, Stoppage Time, Total Football)*

Important: FULL DESIGN OF THE APP IS AT ./design => Includes the full Design System (`World Cup Clash - Design System.html`) + the interactive HTML prototype (`World Cup Clash.html`), the **v10 balance build**: it loads `js/engine9.js` (the v10 match engine, `window.WCC9E`) + `js/engine3.js` (run helpers, `WCC3E`), `jsx/Board9.jsx` + `App9.jsx` + `Builder9.jsx` + board widgets, `css/v9.css`, and national-team crests under `assets/crests/`. The current handoff notes live at **`design/README.md`**. *(The shipping rules engine is the pure-TS port under `src/engine/`, which is the authority for the v10 balance pass below; `design/js/engine9.js` is the design source of truth for that math, and the `design/` prototype is the behavioral reference for UI/flow.)*

A **Slay the Spire–style arcade roguelike** themed on World Cup football. Play the headline **Arcade Run** — a 7‑match journey to the Final against **real historic national teams** — or **Quickplay** a single match at a difficulty you choose. You don't chip an HP bar — **you score goals**, driven by **expected goals (xG)**. A match is a **full 90 minutes**: lead by **3 goals** and it's an instant win, otherwise **whoever's ahead at full time wins** (level → golden-goal extra time). Each round (a slice of the clock) you pick a **formation**, secretly field a **capped lineup** across **attack/defense lanes**, and play single-use **Tactical Cards**. Your **star players are once-per-half trumps**; **fatigue** means you can't park the bus forever.

---

## 0. What changed

**v10 (this revision) — balance pass, locked from the Monte-Carlo sim:**
The output of the balance simulator (thousands of matches per archetype × opponent tier). It fixes the core inversion where cheap all-common decks out-performed star-led ones, makes premium investment reliably pay off — including Quickplay's loaded all-star decks — and keeps scoring lively without spiralling.
- **Diminishing returns on lane stacking** (§7, §15, §17): a lane's card contributions are sorted high-to-low and weighted `[1.00, 0.85, 0.70, 0.55, 0.40, 0.25]`, so the 4th–5th body in a lane adds little. A few strong cards now beat a wall of commons — the root fix for cheap-card flooding, working with the card cap.
- **Star-core stamina discount** (§6, §15, §17): in a lane containing **≥1 premium**, the single most-expensive card pays full per-round stamina and **every other card in that lane is half-price** (min 1). A star core can field a full lineup instead of one legendary and empty space.
- **Gentle per-round stamina curve** (§4, §6, §15): the cost to **field** a card is flattened to **common 2 / rare 2 / epic 3 / legendary 4** (deck-build **slot** costs unchanged). Premium decks can now put 3–4 bodies on the pitch each round.
- **Retuned xG curve** (§7, §15, §17): `/210` slope, `0.50` cap (floor unchanged at `0.05`) — holds total scoring to a lively-but-sane ~5–6 goals/match after the cheaper lineups had pushed it into a goal-fest.
- **Golden-goal extra time fixed** (§14, §17): ET now resolves as true sudden death — the first meter to cross 1.0 ends it, and unlike regulation both sides **cannot** bank a goal in the same passage, so level games end in a round or two instead of trading into 9–9 marathons.
- **Net effect (sim):** a realistic star-led Run deck and a loaded Quickplay all-star deck both clearly beat an all-common deck at every tier; a strong back line concedes measurably less against the toughest opponents; matches play like tense football — most decided by a goal, with the better deck still winning the close ones (and the sudden-death ones). *Soft spots flagged for the next tuning pass: rares are a weak middle tier, and Tactical Cards are net-negative for an otherwise-common deck (§19).*

**v9 — commons are rolled, not picked:**
- **Random-common fill** (§5, §16): your slot budget buys your **premium** core; the remaining roster spots **auto-fill with random commons**, and you **can't hand-pick** them. Stops the min-max where you'd cherry-pick every top-rated common (all the 79s) and make the budget meaningless; turns the bench into genuine squad depth. Applies to the Run and Quickplay.

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
- **Build a loaded squad up front** (there are no rewards to earn): a **~16-player roster**, spending a **slot budget of 20** on premiums *(double the run's 10 — enough for a genuinely star-studded squad)* with the rest **auto-filled with random commons** (§5), **plus up to 3 Tactical Cards** as a **separate allowance** (not drawn from the player budget — the same player-vs-tactical split the run uses), and designate a Captain. Deliberately more generous than the run's lean 11, since your deck won't grow during the game and you'll pick a difficulty to match.
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
MATCH: vs one historic team, 0–0, full 90' (10 rounds). Lead by 3 → instant win;
       else most goals at full time wins; level → golden-goal extra time (§14).
ROUND: draw up to 5 → refresh stamina (8, then 10 after R5, 12 after R8) → pick FORMATION, commit lineup to
       ATTACK/DEFENSE lanes, play single-use TACTICAL CARDS (cards face-up, lineup hidden)
       → REVEAL lineups → add xG to both meters → GOAL on any crossing of 1.0
       → fatigue updates → spent stars lock, tacticals exile → check score (HT reset at R5)
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

`cost` (per-round stamina to field), `rarity`, `slots` from the `overall` band: Common 60–79 (0 slots, **cost 2**) · Rare 80–86 (1 slot, **cost 2**) · Epic 87–91 (2 slots, **cost 3**) · Legendary 92–99 (3 slots, **cost 4**). *(The per-round field cost is the **gentle curve** from the v10 balance pass — flattened from the old 2/3/4/6 so premium decks can put 3–4 bodies on the pitch; the **slot** costs that bound deck-building are unchanged. A lane with a premium also gets the **star-core discount**, §6.)*

**Rarity multiplier.** A card contributes `stat × rarityMult` to its lane each round (this is your "rarer card = more impact" lever): **common ×1.0 · rare ×1.1 · epic ×1.2 · legendary ×1.3.** So a 95-ATK legendary attacker effectively brings **123**, and a 90-DEF legendary defender brings **117** to suppress the opponent's xG. It's deliberately gentle — the **card cap** (§6) and **diminishing returns on lane stacking** (§7) are what actually fix cheap-card flooding; the multiplier is shine on top, and the easiest dial to turn back toward 1.0 if stars get too strong.

---

## 5. Your Squad & Progression

- **Start:** spend a **slot budget of 10** on **premium players** (Rare 1 / Epic 2 / Legendary 3) to form your core, designate a **Captain** (always in your opening hand, grants Captain's Pride), and optionally include **one** Tactical Card. Your roster is **11 players** total.
- **Commons are rolled, not picked.** Once your budget is spent (or you choose to stop), the remaining roster spots **auto-fill with random commons** — the free, 0-slot tier. You **can't hand-pick which commons** you get: otherwise you'd just grab every top-rated common (all the 79s in a 60–79 pool) and the budget would mean nothing. Random commons keep the budget honest and make your bench real squad depth, not a free batch of near-stars. *(Same in Quickplay; rolled once at deck creation.)*
- **After each win:** **+1 random player** (rarity odds improve as you advance) and a **Tactical Card reward (choose 1 of 3)**.
- **Tactical deck cap (~4, tunable):** you carry at most **~4 Tactical Cards** in your Run deck. Once you're at the cap, a Tactical reward becomes a **swap** — take the new one and exile one you hold, or decline. This lines up with the 4-per-match play cap (§6), so you almost never draw a tactical you can't use, and it makes the reward a real *choice* (à la Slay the Spire) rather than endless piling-on. *(This is the fix for "7 tacticals by the Final" — the deck cap bounds the count, the per-half play cap bounds the burst.)*
- Deck grows from ~11–12 cards to roughly **~17 players + ~4 Tactical Cards** by the Final — stronger every round, but with a hard ceiling on tactical spam. *(Optional StS touch: occasionally offer to remove a player card too.)*

---

## 6. Stamina + Card Flow

- Squad shuffled into a **draw pile**. **Opening hand 5** (Captain included). At the **start of each round you draw back up to 5** — your **minimum hand** (draw 5 minus whatever you held over). If the draw pile empties mid-draw, **shuffle the gray discard back in and keep drawing until you reach 5**, so a thin deck never leaves you stuck with a 2-card hand. Drawing *to* 5 means you can't hoard a fat hand — a deliberate trade for a consistent, always-playable one.
- **Where played cards go (the v7 split):**
  - **Common players (grays)** → **discard**, and **reshuffle** back into the draw pile when it empties. They are your **infinite sustain engine**.
  - **Premium players (rare / epic / legendary)** → a **locked pile**: once played, they're benched and **do not return until halftime (round 5)**, when they shuffle back into your draw pile (and they return again to start **extra time**). So each star is roughly a **once-per-half** play.
  - **Tactical Cards** → **exiled**: **single-use**, gone for the rest of the match (no halftime return). And you may play **at most 2 Tactical Cards per half** (first half = rounds 1–5, second = 6–10) — **4 per match maximum**. So even a Tactical-stuffed deck can only fire 4 swings a game; surplus tacticals sit as reserves. *(Extra time grants no extra allowance — by then most are spent; play any leftovers freely.)*
- **Deckbuilding consequence:** because stars lock and tacticals exile, your **grays aren't filler — they're what keeps you fielding a lineup** through the middle of each half. You can't run an all-premium deck or you'd have nothing to play once your stars are spent.
- **Stamina ramps for late-game escalation**, identical for both players, full refresh each round: **8** stamina rounds 1–5, **10** rounds 6–8, **12** rounds 9–10. **Water Break** adds temporary stamina on top for one round.
- **Per-round card cap** (the key balance lever): field at most **4 player cards** (attack + defense combined) per round, ramping **4** (R1–5) / **5** (R6–8) / **6** (R9–10). Tactical Cards don't count toward the cap. The cap equalizes how many players each side fields, so a star-led lineup beats an equal-count common lineup on **per-card quality** (amplified by diminishing returns, §7) — and the **star-core discount** below lets you still fill the cap *with* a star (e.g. a 4-cost legendary anchoring your attack with two commons half-priced to 1 each beside it + a common in defense = 8 stamina, 4 cards).
- **Star-core discount** (the v10 rule that makes premium lineups affordable): in a lane that **contains at least one premium** (rare / epic / legendary), the lane's **single most-expensive card pays full** per-round stamina and **every other card in that lane is half-price** (rounded down, minimum 1). So a common (2) or rare (2) beside a star costs **1**, an epic (3) costs **1**, a second legendary (4) costs **2**; a lane of **all commons gets no discount** (no premium to anchor it). One big star no longer crowds out your whole lineup — it pulls its supporting cast in cheaply.
- Stamina never covers your whole hand → every round is "who do I leave on the bench?"

> **Halftime (round 5)** is a real reset: locked **premium players return** to your draw pile **and fatigue clears** for both sides — a second-half fresh start. Spent **Tactical Cards stay gone.**

---

## 7. Scoring — the xG engine *(the scoring core)*

There is **no HP**. Instead, each team has an **xG meter** — now a **pressure / chance gauge** — that fills every round:

- **Your meter** fills from **your attack vs their defense**.
- **Their meter** fills from **their attack vs your defense**.
- When a meter **fills (reaches `PRESSURE_FULL` = 1.0)**, that team **takes a SHOT** — see **v11 finishing** below. It is **not** an automatic goal.
- **Most goals at full time wins** (mercy at a 3-goal lead; level → golden-goal ET, §14).

### v11 — probabilistic finishing ("Pressure → Conversion")

A full meter no longer auto-scores (the old `cross 1.0 → guaranteed goal` produced a predictable "I score / you score" metronome). Instead, reaching full triggers a **shot that converts with probability `P`**:

- **Conversion `P`** = `BASE_CONVERSION` (0.80 at a full meter) + **pity** (`+PITY_STEP` per consecutive miss, capped `PITY_CAP`) + **momentum** (a side on top finishes a touch better, up to `MOMENTUM_CONVERSION`), clamped to `CONVERSION_CAP` (0.95 — open play is never certain).
- **Goal** → bank it, the meter **empties to 0**.
- **Miss** → the meter **drops by `MISS_DROP_FRAC`** (half) — you keep some pressure and try again next round; each miss raises the next shot's pity bonus.
- **Telegraphed:** the meter shows the conversion `P` *before* you lock in, so a missed full-meter chance is a risk you saw, not an arbitrary coin-flip.
- **Tactical finishers** (§12): **Penalty Kick** forces a shot at ~`PENALTY_CONVERSION` (0.78) and **Hand of God** a near-certain shot (`HAND_OF_GOD_CONVERSION` 0.95, once per match) — regardless of build-up. The other attacking tacticals (Tiki-Taka, Long Ball, Counter-Attack, Nutmeg) still **fill** the meter (create the chance).
- **Why the better deck still wins:** fill is unchanged and deterministic, so a stronger attack reaches full **more often** → takes **more shots** → scores more across the match. The roll only adds drama and desyncs the metronome; sim shows a star deck still beating a common deck ~85% (§19).
- **Extra time** is sudden death: both sides build, the higher-pressure side shoots first, and the **first goal ends the passage** — a penalty-shootout-grade finish.

**xG added per round** for a team:
```
Δ        = yourATK_eff − theirDEF_eff           // see modifiers below
xG_round = clamp( 0.05 + max(0, Δ) / 210 , 0 , 0.50 )
```
- `0.05` is a small floor (even a stifled attack nicks a chance now and then — keeps games from stalling at 0–0).
- `/210` slope and `0.50` cap are the **v10-tuned** scoring knobs (down from `/150` and `0.60` once the gentle stamina curve let both sides field fuller lineups — otherwise scoring spiralled into 9–9 games). They hold total output to a **lively-but-sane ~5–6 goals/match**. The **3-goal mercy** mainly ends **lopsided** games (you clearly outclassing a weaker side, who get spared a blowout); **evenly-matched** games stay close and tend to reach full time, with a fair share going to golden-goal extra time. That tight feel is **by design** — good balance means both sides field comparable lineups, so the better deck usually wins by a goal (or in sudden death) rather than running away. Tune so **defense still visibly suppresses goals** (a strong back line concedes clearly less, or defenders/GKs lose their point) and scoring stays in that ~5–6 band.

**Defense is rate-control, not drain.** Your `DEF_eff` is the term subtracted from the opponent's attack, so **playing defenders lowers how fast *their* bar fills — it does not reduce xG they've already banked.** Stack defenders and their add this round drops toward the `0.05` floor (to `0.025` under Catenaccio, to `0` for a round under Time Wasting), so you can stall them, but you score nothing yourself (empty attack lane → your add ~0.05) and a defense-heavy round raises your fatigue, which later lets their bar climb faster. If **both** sides turtle, both bars still creep up by the floor and both tire — so it drifts toward a goal rather than deadlocking. A **GK** is the most efficient defensive piece (high DEF + a flat save-suppression on their xG). *(Whether a dominant defensive round should actively **drain** banked xG is an open lever — §19.)*

**Effective stats** (`ATK_eff`, `DEF_eff`) fold in, in this order: each card's **`stat × rarityMult`** (§4), then **combined across the lane with diminishing returns** (the lane's contributions are sorted high-to-low and weighted `[1.00, 0.85, 0.70, 0.55, 0.40, 0.25]`, so the 4th–5th body in a lane adds little) → **synergies & Captain's Pride** → **formation multiplier** (§9) → **fatigue penalty on defense** (§8) → active Tactical Cards. **Diminishing returns is the v10 lever that makes quality beat quantity:** a fifth common stacked into a lane barely moves the needle, while a single high-rated star (amplified by its rarity multiplier) lands at full weight. **Position roles flow straight into xG**: a FWD in attack raises `ATK_eff` (more xG = higher chance to score, exactly as intended); a **GK or DEF** in defense raises `DEF_eff` (less opponent xG = higher chance to keep it out). A **GK additionally applies a flat xG-suppression ("save quality")** beyond its DEF, so keepers matter.

> **Why xG instead of a coin-flip per round?** It keeps the variance low and skill-driven — sustained good play *reliably* accumulates into goals ("they were good for two tonight"), so you rarely lose a match you dominated, while a tight game can still swing on a single late chance. Smoother than rolling each round, still unmistakably football.

---

## 8. Fatigue *(new — one bar, folded into xG)*

You **cannot defend forever.** Fatigue represents your back line tiring, and it **accelerates the opponent's xG meter** — it is *not* a second progress bar, it's the **fill-rate dial on the one xG bar** (shown as a "heat" indicator on your goal).

- Each team has a hidden **fatigue value F** (0–30, starts 0 each match).
- **Defending raises F, attacking lowers it.** Concretely, per round:
  `Fatigue change = (defense weight − attack weight) × rate`, clamped — a defense-heavy round tires you, an attack-heavy round rests you, a balanced round is roughly neutral.
- **Fatigue lowers your effective defense:** `DEF_eff = DEF_total × (1 − F / 60)` (at F = 30, your defense is at 50%), which **raises the opponent's xG_round** against you.
- **Reset:** the **Water Break / Fresh Legs** Tactical Card sets your F to 0; an automatic **Halftime at round 5** clears F for **both** teams.

This does the work the old Stoppage Time did — defenses fray as the match wears on, so **late rounds get higher-scoring and the closing minutes become dramatic** — and it gives every round a real tension: **attack** (fill your meter *and* rest your legs, but leave yourself open this round) vs **defend** (safe now, but tiring and not scoring). It's also the natural counter to defensive stacking (Fortress/Catenaccio): turtle too long and your own fatigue hands the opponent the goal.

---

## 9. Formations *(unchanged mechanic — now feeds xG)*

Pick one each round; it multiplies your committed **ATK_eff / DEF_eff** (applied after synergies, before fatigue), which in turn scales the xG each side accrues. Free, changes every round.

| Formation | Shape | ATK | DEF |
|---|---|---|---|
| **Offensive** | 3-4-3 | **×1.25** | ×0.75 |
| **Balanced** *(default)* | 4-3-3 | ×1.0 | ×1.0 |
| **Defensive** | 5-4-1 | ×0.75 | **×1.25** |

Formation is a **broadcast stance** (shown via Intent); lane allocation is your **hidden execution**. Symmetric multipliers → trades, not hard counters. *Opponents have a `preferredFormation` and may switch (Italy '82 Defensive, Brazil '70 Offensive).*

---

## 10. The Round — phases

1. **Draw** — both **draw up to 5** (refill to the 5-card minimum; grays reshuffle in if the pile runs out); trigger Powers; apply any start-of-round fatigue/heat.
2. **Plan** — both privately **pick a Formation** and assign hand cards to **ATTACK / DEFENSE** (face-down), up to the **card cap** for the round (4/5/6, §6) and within stamina. **Tactical Cards are played face-up the moment they're committed — both players see them** (capped at **2 per half**, §6) and may keep adjusting their hidden lineups (and play their own Tactical Cards, e.g. VAR in response to an Offside Trap) until both **lock in**. *No separate phase — it all happens inside the planning window.*
3. **Intent** — each side continuously sees the opponent's **formation + any Tactical Cards played + committed card-count & stamina** — **never the player identities**.
4. **Reveal** — lineups flip simultaneously.
5. **Resolve (strict order):** a) **Instant** Tacticals (VAR → Offside → Referee → Injury) edit the boards → b) synergies, Powers, Captain's Pride → c) **formation multipliers** → d) **fatigue** applied to defense → e) **compute xG_round for both teams** (doubled in extra time) and add to the pressure meters; any meter that **fills triggers a SHOT** that converts with probability `P` (v11 §7) → **GOAL** (meter empties) or **SAVED** (meter drops) → f) **update fatigue** from this round's attack/defense weighting → g) **cleanup:** grays → discard, spent **premium players → locked**, spent **Skills/Instants → exiled**, Powers stay active. At **round 5 (halftime)** locked players return and fatigue clears for both. Then **check the score** (§14).
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
| **Penalty Kick** | Skill | 2 | a **FWD** | The FWD takes a penalty: **+0.85 xG** this round (a near-certain goal). |
| **Halftime Team Talk** | Skill | 1 | — | Remove all debuffs from your cards, **clear your fatigue**, draw 2. |
| **Time Wasting** | Skill | 1 | — | Opponent draws **1 fewer** next round and their xG floor is **0** next round. |
| **Hand of God** | Power | 3 | a **FWD** | **Once per match:** instantly **+1.0 xG** (a guaranteed goal) through that FWD. |
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

Matchmaking: filter the pool to allowed tiers, exclude defeated teams, draw one weighted by stage; the Final always picks a champion. Give each side signature touches (Brazil '70 Offensive + Tiki-Taka; Italy '82 Defensive + Catenaccio + Fortress; Netherlands '74 Total Football).

---

## 14. Match Structure, Win Condition & Extra Time

- **A match is 10 rounds = 90 minutes** (≈9' per round). **Halftime after round 5 (45')**, **full time after round 10 (90')**. Rounds are shown as a running **match clock**, not a counter.
- **Goals** come from the xG engine across the whole 90 (§7) — there is **no "race to 3."** Both meters keep filling all match; the scoreline can be anything (1–0, 3–2, 4–3…).
- **A round resolves fully before the score is checked** — both xG meters update, *then* the game evaluates the result. Goals in the same passage both count.
- **Mercy rule:** the instant a side leads by **3 goals** (3-0, 4-1, 5-2…), the match **ends immediately** — that side wins. Spares a hopeless side from playing out a blowout, and is never ambiguous (a 3-goal lead can only belong to one team). *(This retires the old simultaneous-3 problem entirely.)*
- **Full time (90'):** if no mercy triggered, **whoever is ahead on goals wins.**
- **Level at full time → Extra Time:** sudden death — **first to score wins (golden goal).** ET rounds resolve as **true sudden death**: the first meter to cross 1.0 ends the match, and **unlike regulation both sides cannot bank a goal in the same passage** — so ET settles in a round or two instead of trading goals into a 9–9 marathon (the v10 fix). To keep it fast, **each ET round's xG is doubled**, and ET begins with **both xG meters reset to 0**, **all locked players returned**, and **fatigue cleared** (a clean, fresh sprint — not an instant goal off a near-full meter). *Safety:* if somehow still level after ~5 ET rounds, the **higher accumulated ET xG** wins. ET produces a winner in **both** modes (no draws).
- **Lose → run over** (Arcade Run). **Win the run:** take the Final.
- **Momentum / On Form:** scoring, or 3 high-pressure rounds in a row, grants **+0.10 xG** next round.

The score is a normal **scoreboard** (e.g. "ARG 3 – 2 BRA") with the clock — the old 5-ball strip is retired, since scores can now exceed 3–2.

---

## 15. Tuning Table (every knob)

| Parameter | v10 value |
|---|---|
| Run length | 7 matches (3 group · R16 · QF · SF · Final) · loss = run over |
| Match length | **10 rounds = 90'** (≈9'/round); halftime R5 (45'), full time R10 (90') |
| Win condition | **lead by 3 → instant win**; else **most goals at full time**; level → extra time |
| Extra time | **golden goal**, **xG ×2**, meters reset to 0, stars + fatigue refreshed; **true sudden death — both sides can't score in the same passage**; safety: higher ET xG after ~5 ET rounds |
| xG per round (fill) | `clamp(0.05 + max(0, ATK_eff − DEF_eff)/210, 0, 0.50)` → fills the pressure meter; a **full meter takes a SHOT** (v11 finishing, §7) — no longer an auto-goal |
| Finishing (v11) | full meter → shot at `P` = `BASE_CONVERSION` 0.80 + pity + momentum, cap 0.95; goal empties, miss drops half; Penalty 0.78 / Hand of God 0.95 forced shots |
| Card flow | grays cycle freely · **premium players lock → return at halftime / start of ET** (once-per-half) · **Tactical Cards single-use (exiled)** |
| Starting XI | 11 players, slot budget **10**, + 0–1 Tactical |
| Quickplay deck | ~16 players, slot budget **20**, + **up to 3** Tactical; pick difficulty → opponent tier |
| Slot costs | Common 0 · Rare 1 · Epic 2 · Legendary 3 · Tactical 1 (legendary Tacticals 2–3) |
| **Per-card stamina cost** (to field/round) | **Common 2 · Rare 2 · Epic 3 · Legendary 4** (gentle curve, v10; was 2/3/4/6) |
| Reward / win | +1 random player (rarity by stage) + choose-1-of-3 Tactical |
| Opening hand / draw | open 5 (Captain) · **draw up to 5 each round (minimum hand 5)**; grays reshuffle mid-draw to guarantee the refill |
| Tactical limits | **≤2 plays per half (4/match)** · Run **deck cap ~4** (swap past cap) · single-use (exiled) — all tunable |
| Stamina | **8**/round (R1–5), **10** (R6–8), **12** (R9–10), both players |
| **Card cap / round** | **4** (R1–5) · **5** (R6–8) · **6** (R9–10) — player cards only, attack+defense combined |
| **Rarity multiplier** | Common ×1.0 · Rare ×1.1 · Epic ×1.2 · Legendary ×1.3 (applied to each card's stat) |
| **Diminishing returns** (lane stacking, v10) | per lane, contributions sorted high→low × `[1.00, 0.85, 0.70, 0.55, 0.40, 0.25]` — quality beats count |
| **Star-core discount** (v10) | in a lane with ≥1 premium, non-anchor cards cost **×0.5 stamina** (round down, min 1); all-common lane = no discount |
| ATK/DEF split | FWD 1.0/0.55 · MID 0.85/0.78 · DEF 0.55/1.0 · GK 0/+5 def-only (+ save xG-suppression) |
| Formations | Off ×1.25/×0.75 · Bal ×1/×1 · Def ×0.75/×1.25 |
| Fatigue | 0–30; `DEF_eff = DEF_total × (1 − F/60)`; defend raises, attack lowers; cleared at halftime / ET / by Water Break |
| Synergies | Chemistry 3+ same nation +2/+2 · Strike Partnership 2+ FWD +5 ATK · Back Line 3+ DEF +8 DEF · Midfield Engine 2+ MID +1 stamina |
| Captain's Pride | +2/+2 same nation |
| Counter-Attack xG | +0.40 (capped) on a successful defense |
| Momentum | +0.10 xG next round |
| Intent | formation + Tactical Cards + card-count + stamina (lineups hidden) |

---

## 16. UI / Screens — for Claude Design

North star: **FIFA Ultimate Team card art on a Slay-the-Spire run.** Stadium-at-night, glossy. Card frames by rarity (silver/blue/purple/gold), position badge, **ATK (red) / DEF (blue)** pips. The player figure is a **per-nation football-jersey kit** — a procedural SVG rendered in the nation's colours (solid / vertical-stripe / checkerboard), in place of a generic role silhouette; unknown nations fall back to flag-derived colours. *(Kit-art handoff: `design/design_handoff_jersey_cards/`.)*

1. **Main menu / Mode select** — **Arcade Run** vs **Quickplay**, plus Collection and How to Play. Choosing **Quickplay** opens a **difficulty picker** (Easy / Medium / Hard / Legendary → opponent tier) and the **loaded-deck builder** (~16 players / **20 slots** + **up to 3 Tactical Cards**); then straight into a single match.
2. **Run Map / Bracket** — 7-stop ladder, progress lit, next opponent crest + year + difficulty stars; Final glows.
3. **XI Builder** — pick **premium players** from a filterable pool against a **Slot Budget meter** (x/10 in the Run, **x/20 in Quickplay**), set a Captain, and stock the **Tactical tray** (start ≤**1** in the Run → cap **~4** via rewards; **up to 3** in Quickplay). A **"Fill with Commons" button** completes the roster with **random commons** — individual commons aren't pickable (no cherry-picking the best ones). ATK/DEF + cost curves shown for the premiums.
4. **Locker Room** *(Arcade Run only)* — reward player reveal, **choose-1-of-3 Tactical**, set Captain, deck list, next-opponent preview.
5. **Match Board (centerpiece):**
   - **Scoreboard + match clock:** a normal **numeric scoreboard** ("ARG 2 – 1 BRA") and a **running clock** — kickoff → **45' HALFTIME** (round 5) → **90' FULL TIME** (round 10) → **ET** if level. A subtle **"–3 to win"** marker hints at the mercy threshold.
   - **xG meter** per team — **always visible**, shown as a **filling bar (not a precise decimal)** so it reads as football. The round's gain **animates in on reveal**, and a **fatigue "heat" glow** shows when that side's defense is tiring (§8). Both bars on screen at all times is load-bearing — it's how you make the attack-vs-defend call, and watching the opponent's bar **flatline against your wall** is the payoff for defending. A **full bar takes a SHOT** (the bar shows the conversion % beforehand) → **full-screen "GOAL!!!"** (crowd roar, net-ripple) **or "SAVED!"** if the keeper wins it.
   - **Three card zones** beside your hand: the **draw/discard** count (grays cycling), a **bench/locked pile** for spent **premium players** (with a "returns at halftime" cue), and an **exiled** sliver for spent **Tactical Cards**.
   - **Formation selector** (3 shapes) for the round; **ATTACK / DEFENSE** lanes to drag face-down cards into (up to the card cap).
   - **Tactical Cards play face-up in a prominent center slot** with a clear callout ("⚠ OFFSIDE TRAP", "PENALTY!") — visible to both, and they visibly **burn/exile** after resolving. Lineups stay face-down until reveal.
   - **Intent strip:** "Opponent: Offensive (3-4-3) · 3 cards · 6 stamina · played **Catenaccio**."
   - Booked = yellow corner; Red Card animates off; **Halftime (45')** = a "Fresh Legs" beat — benched stars slide back to the deck, fatigue cools, for both sides; **Extra Time** = a distinct golden-goal mode (decks refreshed, doubled-xG bars, "next goal wins" banner).
6. **Result / Run-over / Trophy** — final score + **MVP** (most xG/goals); in the Run, a loss → run summary + restart, the Final → trophy lift; in Quickplay, **Win / Loss** + rematch (ET means no draw by default).
7. **Card detail modal** — ATK/DEF, ability/Tactical text, World Cup tag, (opponents) team blurb.

Feel: snappy drag-to-lane and formation toggles; **the GOAL animation is the money moment** — make it big; Tactical Cards land with weight then burn away (single-use); fatigue heat creeps visibly; the halftime fresh-legs and golden-goal extra-time beats are distinct, dramatic moments.

---

## 17. Data Model — for Claude Code

```ts
type Position = "GK" | "DEF" | "MID" | "FWD";
type Rarity   = "common" | "rare" | "epic" | "legendary";
type Lane     = "attack" | "defense";
type Formation = "offensive" | "balanced" | "defensive";
type TacticalCat = "instant" | "skill" | "power";
type Tier = "S" | "A" | "B" | "C" | "D";

const RARITY_MULT: Record<Rarity, number> =        // applied to each card's stat contribution
  { common: 1.0, rare: 1.1, epic: 1.2, legendary: 1.3 };
const COST_BY_RARITY: Record<Rarity, number> =     // per-round stamina to FIELD a card (v10 gentle curve)
  { common: 2, rare: 2, epic: 3, legendary: 4 };
const STACK_WEIGHTS = [1.00, 0.85, 0.70, 0.55, 0.40, 0.25];  // v10 diminishing returns, per lane (apply to sorted-desc contributions)
const STAR_SYNERGY_DISCOUNT = 0.5;                 // v10: non-anchor cards in a lane with >=1 premium pay this fraction of cost (min 1)
const XG_FLOOR = 0.05, XG_SLOPE = 210, XG_CAP = 0.50;        // v10-tuned scoring curve
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
  xg: number;                    // accumulating meter; goal each crossing of 1.0 (carry remainder); reset to 0 for ET
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
  deck: Card[];                  // premiums you picked + random commons filled to roster size
  captainId: string; defeated: string[]; alive: boolean;
}
```

**Round resolution (pseudocode):**
```
// Deck build: the budget buys premiums; the rest of the roster is RANDOM commons (no cherry-picking):
function buildDeck(picks, rosterSize, commonPool):
    assert all(c.rarity != "common" for c in picks)
    assert sum(slotCost(c) for c in picks) <= BUDGET            // 10 run / 20 quickplay
    fillers = sample(commonPool, rosterSize - picks.length)     // uniform random; player has no say
    return shuffle(picks + fillers)

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

    // per-side xG add this round (curve constants are v10-tuned):
    function xgAddFor(scorer):
        delta = atk[scorer] - def[1 - scorer]
        x = clamp(XG_FLOOR + max(0, delta)/XG_SLOPE, 0, XG_CAP)
        x = applyTacticalXg(m, scorer, x)         // Tiki-Taka, Long Ball, Penalty, Counter, Nutmeg, Momentum...
        if m.extraTime: x *= 2                     // golden-goal ET resolves fast
        return x

    if not m.extraTime:                            // REGULATION: both meters add; simultaneous goals count (mercy handles it)
        for scorer in [0,1]:
            addPressure(scorer, xgAddFor(scorer))  // fill the meter [0,1]
            takeShot(scorer)                       // if full/forced: roll P → goal++ (empty) or miss (drop) — v11 §7
    else:                                          // EXTRA TIME: true sudden death — only the better passage can score
        m.etRound += 1
        a0 = xgAddFor(0); a1 = xgAddFor(1)
        lead = (a0 >= a1) ? 0 : 1                   // the side that created the bigger chance this passage
        addXg(m, lead, (lead == 0 ? a0 : a1))      // if this crosses 1.0 -> golden goal; the trailing side does NOT also score

    for p in [0,1]:
        m.players[p].fatigue = clamp(m.players[p].fatigue + fatigueDelta(m,p), 0, 30)   // defend↑ attack↓
    if m.round == 5 and not m.extraTime: halftime(m)    // 45': stars back + fatigue cleared, both sides

    cleanupBoards(m)            // grays→discard · premium players→locked · spent Skills/Instants→exiled · Powers stay
    checkWin(m)

function halftime(m):                               // round 5 reset, both teams
    for p in [0,1]:
        m.players[p].drawPile += m.players[p].locked; shuffle(m.players[p].drawPile)
        m.players[p].locked = []; m.players[p].fatigue = 0; m.players[p].tacticalsThisHalf = 0

function beginExtraTime(m):                          // level at full time → fresh golden-goal sprint
    m.extraTime = true; m.etRound = 0
    for p in [0,1]:
        m.players[p].xg = 0                            // meters reset, goals carry (e.g. 2–2 stays)
        m.players[p].drawPile += m.players[p].locked; shuffle(m.players[p].drawPile)
        m.players[p].locked = []; m.players[p].fatigue = 0; m.players[p].tacticalsThisHalf = 0

function checkWin(m):                                // ONCE, after the full round resolves
    g0 = m.players[0].goals; g1 = m.players[1].goals
    if not m.extraTime:
        if g0 - g1 >= 3: m.winner = 0; return         // 3-goal-lead mercy → instant win
        if g1 - g0 >= 3: m.winner = 1; return
        if m.round < 10:  return                       // keep playing the 90
        if g0 != g1:      m.winner = (g0 > g1 ? 0 : 1); return   // full time: leader wins
        beginExtraTime(m)                              // level at 90' → golden-goal extra time
    else:                                              // EXTRA TIME — golden goal
        if g0 != g1:      m.winner = (g0 > g1 ? 0 : 1); return   // first ET goal decides it
        if m.etRound >= 5: m.winner = (xgOf(m,0) >= xgOf(m,1) ? 0 : 1)   // safety: scoreless ET
```

**Generating data:** ingest a rating dataset → `overall/position/nation/worldCup`; derive `atk/def`, `saveBonus` for GKs, `cost`, `rarity/slots`. Build `OpponentTeam`s (22 champions mandatory Tier-S + ~20–30 more). Seed the ~19 Tactical Cards with their `requiresPosition`/`requiresCount` gates.

---

## 18. Build Phasing for Claude Code

**MVP — build Quickplay first** (a single match is the fastest path to a playable core; the run shell wraps it afterward):
- **Quickplay flow:** deck builder → difficulty picker → one match → **Win/Loss + rematch** (ET decides level games). No run shell, no rewards needed yet.
- Deck builder (slot budget + Captain + Tactical tray) — used by both modes.
- Card flow: **draw up to a 5-card hand each round** (grays reshuffle if the pile empties), **premium players lock until halftime**, **Tactical Cards single-use (exiled) and capped at 2 plays/half**; **ramping stamina (8/10/12)**; **per-round card cap (4/5/6)**; lane combat + **3 formations**.
- **Rarity multiplier** on stat contribution (trivial — a lookup), so legendaries beat equal-count commons.
- **xG engine + win logic** (per-team meters, goal at 1.0; **3-goal-lead mercy → instant win**, full-time leader wins, **golden-goal extra time** with doubled xG when level; **halftime reset** at round 5).
- **Fatigue** (defend↑/attack↓, cleared at halftime/ET, defense penalty).
- Intent (formation + Tactical Cards + counts).
- ~6 Tactical Cards incl. at least two player-gated ones (Penalty Kick→FWD, Catenaccio→DEF) plus Water Break (fatigue reset), Offside Trap, Counter-Attack, Referee's Whistle.
- ~12 OpponentTeams across tiers incl. a few champions; AI commits first.
- **GOAL animation** even in MVP — it's the core feel.

**V2 — wrap the run around it:** the 7-match **Arcade Run** shell (bracket, permadeath, score resets), **Locker Room** + post-match rewards, full Tactical set + all gates, statuses, Powers, Momentum, all 22 champions + extended pool, signature formations/Tacticals, animation polish, trophy screen, card-removal reward.

**V3:** meta-progression, online leaderboards (fastest/cleanest runs), Arcade Continues, 2026 champion content.

**AI heuristic (MVP):** track its own xG/fatigue → pick formation (Defensive when fresh & protecting a lead, Offensive to chase or when its fatigue is high so it rests by attacking); split lanes to balance scoring vs exposure; play gated Tacticals only when it fields the required role; hold Penalty/Hand of God to convert; use VAR/Offside reactively against visible Tacticals/big commits. Keep it legible.

---

## 19. Open questions to playtest

1. **xG curve** (`0.05` floor, **`/210` slope, `0.50` cap** — v10-tuned) — locked from the sim to ~5–6 goals/match. Remaining watch item is **absolute-scoring drift** if other knobs change: re-check that a strong back line still **visibly suppresses goals** (defenseImpact positive vs the toughest tiers) and totals stay in the ~5–6 band. Note the mercy/ET *mix* is **structural, not curve-tunable** — good balance makes close games, so mercy mainly fires in lopsided matchups and a fair share of even games reach golden-goal ET; don't chase that with the curve.
2. **Fatigue weight** (`F/60` defense penalty, gain/loss rate) — strong enough to punish turtling and create late goals, but not a death-spiral? Watch defensive-stack decks (Fortress + Catenaccio).
3. **Tactical xG values & limits** (Penalty 0.85, Long Ball 0.45, Tiki-Taka 0.20, Counter 0.40) — balanced now that each Tactical is **single-use** and you can play **only 2 a half (4/match)** from a **~4-card tactical deck**? Tune the **2/half** and **deck-cap ~4** in the sim: confirm the Final isn't decided by tactical spam, but tacticals still feel impactful when fired.
4. **Visible Tacticals timing game** — does telegraphing make players hoard their one-shot Tacticals to the last second? If lock-in feels like a stare-down, add a short planning timer.
5. **Extra time** — the v10 sudden-death fix (both sides can't score the same passage) makes ET resolve in **1–2 rounds** in the sim, marathons gone. Still a feel check worth doing: with good balance a fair share of competitive games reach ET, so confirm sudden death feels exciting rather than repetitive. If it grates, the clean alternative is to break ties by **accumulated xG** instead of always playing ET (one-line change; rewards the better-performing deck). A penalty-shootout minigame remains a possible flavour option.
6. **Formation ±25%** — still swingy now that it scales xG? Try ±15–20% if goal output spikes on Offensive.
7. **Player-gated Tacticals & lineup leak** — playing "Penalty Kick" reveals you have a FWD; fun read or annoyance?
8. **Do premiums feel worth their slots? — RESOLVED in v10.** The original inversion (cheap all-common decks beating star-led ones) is fixed: in the sim a realistic star-led Run deck *and* a loaded Quickplay all-star deck both clearly beat an all-common deck at every tier, via **diminishing returns** (§7) + the **star-core discount** (§6) + the **gentle field-cost curve** (§4). Dials if it ever drifts: the rarity multiplier (toward 1.0 if stars get too strong), the stack weights, or the discount fraction.
9. **Defense: throttle-only or drain?** Defense currently only slows the opponent's fill rate. If defending feels too passive, add a **small capped drain** when `DEF_eff` decisively beats `ATK_eff` (held in reserve; the sim decides).
10. **Quickplay draws** — ET makes every match decisive; if you'd rather allow casual 90' draws in Quickplay, that's a one-line toggle (skip ET when level).
11. **Premium-heavy decks & the half-lock** — a 20-slot Quickplay deck has many stars to rotate; a lean run deck burns through its few stars fast each half. Confirm both feel good (front-loaded star bursts then gray-grind, refreshed at halftime).
12. **Random-common variance** — commons fill randomly (§5) and the pool spans ~60–79 OVR, so a bad roll gives a slightly weaker bench. Since commons are low-impact by design this should be mild, but if it ever feels punishing, soften with a **draft-style "fill from a random 3 per slot"** (a little agency without cherry-picking) or narrow the common OVR band.
13. **Rares are a weak middle tier (v10 sim).** A rare-heavy "balanced" deck underperforms — it trades common sustain for only a small stat bump over commons. Consider widening the rare OVR band (or nudging its rarity multiplier) so rares feel worth a slot, or accept rares as a minor step-up. Tuning item, after the structure is locked.
14. **Tactical Cards are net-negative for an otherwise-common deck (v10 sim).** Adding tacticals to the all-common deck *lowered* its win rate and goals — a played tactical costs a player slot that round, and the current values/caps don't pay it back. Re-check the tactical xG values and the 2/half cap on a realistic (not all-common) deck before concluding, but the values likely want a small buff.

---

*End of v10. A full 90-minute match: lead by 3 to end it early, else most goals at full time, true sudden-death golden-goal extra time if level. Your budget buys a premium core and the bench fills with random commons; stars are once-per-half trumps; Tactical Cards are single-use and capped at 2 a half (deck cap ~4); commons are the sustain engine and you always draw back to a 5-card hand. The v10 balance pass makes premium investment pay off — diminishing returns on lane stacking, a star-core stamina discount, a gentle field-cost curve, and a retuned xG curve — so a star-led deck clearly beats a wall of commons, while scoring stays in a lively ~5–6 band and matches play like tense football. Every value in §15 is a knob.*
