# WORLD CUP CLASH — Game Design Document **v7**
*(working title — alternatives: Road to Glory, Stoppage Time, Total Football)*

A **Slay the Spire–style arcade roguelike** themed on World Cup football. Play the headline **Arcade Run** — a 7‑match journey to the Final against **real historic national teams** — or **Quickplay** a single match at a difficulty you choose. You don't chip an HP bar — **you score goals**, driven by **expected goals (xG)**. A match is a **full 90 minutes**: lead by **3 goals** and it's an instant win, otherwise **whoever's ahead at full time wins** (level → golden-goal extra time). Each round (a slice of the clock) you pick a **formation**, secretly field a **capped lineup** across **attack/defense lanes**, and play single-use **Tactical Cards**. Your **star players are once-per-half trumps**; **fatigue** means you can't park the bus forever.

---

## 0. What changed

**v7 (this revision) — the 90-minute match:**
- **No more "race to 3."** A match is a full **90 minutes (10 rounds)**; **whoever leads at full time wins** (§14).
- **Mercy rule:** any **3-goal lead** (3-0, 4-1, 5-2…) ends the match instantly (§14). *(This also retires the old simultaneous-3 edge case — reaching 3 only matters as part of a 3-goal lead, and a 3-goal lead can only belong to one side.)*
- **Extra time** on a full-time draw: sudden-death **golden goal**, **xG doubled**, meters reset to 0 (§14).
- **Star players are once-per-half:** a played non-gray **player** locks until **halftime (round 5)**, then returns (and refreshes again for extra time) — so commons are your sustain engine (§6).
- **Tactical Cards are single-use:** exiled the moment they're played (§6, §12).
- **Rounds shown as a match clock** (HT 45', FT 90'); the 5-ball score strip is replaced by a normal scoreboard (§14, §16).

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
- **Build a loaded squad up front** (there are no rewards to earn): ~16 players within a **slot budget of 20** *(double the run's 10 — enough for a genuinely star-studded squad)*, **plus up to 3 Tactical Cards** as a **separate allowance** (not drawn from the player budget — the same player-vs-tactical split the run uses), and designate a Captain. Deliberately more generous than the run's lean 11, since your deck won't grow during the game and you'll pick a difficulty to match.
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
ROUND: draw 3 → refresh stamina (8, then 10 after R5, 12 after R8) → pick FORMATION, commit lineup to
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

`cost` (stamina), `rarity`, `slots` from the `overall` band: Common 60–79 (0 slots, cost 1–2) · Rare 80–86 (1, cost 3) · Epic 87–91 (2, cost 4) · Legendary 92–99 (3, cost 5).

**Rarity multiplier.** A card contributes `stat × rarityMult` to its lane each round (this is your "rarer card = more impact" lever): **common ×1.0 · rare ×1.1 · epic ×1.2 · legendary ×1.3.** So a 95-ATK legendary attacker effectively brings **123**, and a 90-DEF legendary defender brings **117** to suppress the opponent's xG. It's deliberately gentle — the **card cap** (§6) is what actually fixes cheap-card flooding; the multiplier is shine on top, and the easiest dial to turn back toward 1.0 if stars get too strong.

---

## 5. Your Squad & Progression *(unchanged from v3)*

- **Start:** pick **11 players** within a **slot budget of 10**, plus optionally **one** Tactical Card; designate a **Captain** (always in your opening hand, grants Captain's Pride). Commons are free (0 slots) — fill out the XI with role-players.
- **After each win:** **+1 random player** (rarity odds improve as you advance) and **choose 1 of 3 Tactical Cards**.
- Deck grows from ~11–12 cards to ~17 players + ~7 Tactical Cards by the Final. *(Optional StS touch: occasionally offer to remove a card.)*

---

## 6. Stamina + Card Flow

- Squad shuffled into a **draw pile**. **Opening hand 5** (Captain included). **Draw 3** each round; unplayed cards stay (hand cap **8**).
- **Where played cards go (the v7 split):**
  - **Common players (grays)** → **discard**, and **reshuffle** back into the draw pile when it empties. They are your **infinite sustain engine**.
  - **Premium players (rare / epic / legendary)** → a **locked pile**: once played, they're benched and **do not return until halftime (round 5)**, when they shuffle back into your draw pile (and they return again to start **extra time**). So each star is roughly a **once-per-half** play.
  - **Tactical Cards** → **exiled**: **single-use**, gone for the rest of the match (no halftime return). Each Tactical in your deck is one use.
- **Deckbuilding consequence:** because stars lock and tacticals exile, your **grays aren't filler — they're what keeps you fielding a lineup** through the middle of each half. You can't run an all-premium deck or you'd have nothing to play once your stars are spent.
- **Stamina ramps for late-game escalation**, identical for both players, full refresh each round: **8** stamina rounds 1–5, **10** rounds 6–8, **12** rounds 9–10. **Water Break** adds temporary stamina on top for one round.
- **Per-round card cap** (the key balance lever): field at most **4 player cards** (attack + defense combined) per round, ramping **4** (R1–5) / **5** (R6–8) / **6** (R9–10). Tactical Cards don't count toward the cap. The cap equalizes how many players each side fields, so a star-led lineup beats an equal-count common lineup on **per-card quality** — and you can still fill the cap *with* a star (5-cost legendary + three 1-cost commons = 8 stamina, 4 cards).
- Stamina never covers your whole hand → every round is "who do I leave on the bench?"

> **Halftime (round 5)** is a real reset: locked **premium players return** to your draw pile **and fatigue clears** for both sides — a second-half fresh start. Spent **Tactical Cards stay gone.**

---

## 7. Scoring — the xG engine *(the scoring core)*

There is **no HP**. Instead, each team has an **xG meter** (its accumulated expected goals). Both meters fill every round:

- **Your meter** fills from **your attack vs their defense**.
- **Their meter** fills from **their attack vs your defense**.
- When a meter **crosses 1.0**, that team **scores a GOAL**; the meter keeps the remainder (e.g. 1.3 → goal, 0.3 carries over).
- **First team to 3 goals wins** the match.

**xG added per round** for a team:
```
Δ        = yourATK_eff − theirDEF_eff           // see modifiers below
xG_round = clamp( 0.05 + max(0, Δ) / 150 , 0 , 0.60 )
```
- `0.05` is a small floor (even a stifled attack nicks a chance now and then — keeps games from stalling at 0–0).
- `/150` slope and `0.60` cap are **tuning knobs**, but **lively scoring is the goal** — this is an arcade game, not a sim. The **full 90 is just the rule that ends a match**; the **3-goal mercy is the governor** that keeps fast scoring from spiralling: decisive games end early on a 3-goal lead, while close games become high-scoring thrillers that reach full time (to get there the margin must stay ≤2 the whole way, so scores climb — 4–3, 5–4 — but never run away to 8–2). Tune so **mercy fires around mid-match** in lopsided games (not round 2, or the 90' is vestigial) and **defense still visibly suppresses goals** (or defenders/GKs stop mattering).

**Defense is rate-control, not drain.** Your `DEF_eff` is the term subtracted from the opponent's attack, so **playing defenders lowers how fast *their* bar fills — it does not reduce xG they've already banked.** Stack defenders and their add this round drops toward the `0.05` floor (to `0.025` under Catenaccio, to `0` for a round under Time Wasting), so you can stall them, but you score nothing yourself (empty attack lane → your add ~0.05) and a defense-heavy round raises your fatigue, which later lets their bar climb faster. If **both** sides turtle, both bars still creep up by the floor and both tire — so it drifts toward a goal rather than deadlocking. A **GK** is the most efficient defensive piece (high DEF + a flat save-suppression on their xG). *(Whether a dominant defensive round should actively **drain** banked xG is an open lever — §19.)*

**Effective stats** (`ATK_eff`, `DEF_eff`) fold in, in this order: each card's **`stat × rarityMult`** (§4) summed across the lane → **synergies & Captain's Pride** → **formation multiplier** (§9) → **fatigue penalty on defense** (§8) → active Tactical Cards. **Position roles flow straight into xG**: a FWD in attack raises `ATK_eff` (more xG = higher chance to score, exactly as intended); a **GK or DEF** in defense raises `DEF_eff` (less opponent xG = higher chance to keep it out). A **GK additionally applies a flat xG-suppression ("save quality")** beyond its DEF, so keepers matter.

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

1. **Draw** — both draw 3; trigger Powers; apply any start-of-round fatigue/heat.
2. **Plan** — both privately **pick a Formation** and assign hand cards to **ATTACK / DEFENSE** (face-down), up to the **card cap** for the round (4/5/6, §6) and within stamina. **Tactical Cards are played face-up the moment they're committed — both players see them** and may keep adjusting their hidden lineups (and play their own Tactical Cards, e.g. VAR in response to an Offside Trap) until both **lock in**. *No separate phase — it all happens inside the planning window.*
3. **Intent** — each side continuously sees the opponent's **formation + any Tactical Cards played + committed card-count & stamina** — **never the player identities**.
4. **Reveal** — lineups flip simultaneously.
5. **Resolve (strict order):** a) **Instant** Tacticals (VAR → Offside → Referee → Injury) edit the boards → b) synergies, Powers, Captain's Pride → c) **formation multipliers** → d) **fatigue** applied to defense → e) **compute xG_round for both teams** (doubled in extra time) and add to meters; any meter crossing 1.0 → **GOAL** → f) **update fatigue** from this round's attack/defense weighting → g) **cleanup:** grays → discard, spent **premium players → locked**, spent **Skills/Instants → exiled**, Powers stay active. At **round 5 (halftime)** locked players return and fatigue clears for both. Then **check the score** (§14).
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

Three categories: **Instant** (resolves first, reactive — e.g. VAR), **Skill** (one-shot), **Power** (persists for the match). **Every Tactical Card is single-use** — you can't replay it: **Instants and Skills are exiled** the moment they resolve (no halftime return), and a **Power** stays **active on your board** for the rest of the match (also unrepeatable). So a deck's 1 (run) to 3 (Quickplay) tacticals are precious one-shot trumps. Start with **≤1**; earn the rest. **A Skill that boosts a phase of play requires a matching-role player in your lineup and buffs that player**; officiating/disruption Instants and match-long Powers are unconditional. Values are tuning starting points.

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
- **Level at full time → Extra Time:** sudden death — **first to score wins (golden goal).** To keep it fast, **each ET round's xG is doubled**, and ET begins with **both xG meters reset to 0**, **all locked players returned**, and **fatigue cleared** (a clean, fresh sprint — not an instant goal off a near-full meter). *Safety:* if somehow still scoreless after ~5 ET rounds, the **higher accumulated ET xG** wins. ET produces a winner in **both** modes (no draws).
- **Lose → run over** (Arcade Run). **Win the run:** take the Final.
- **Momentum / On Form:** scoring, or 3 high-pressure rounds in a row, grants **+0.10 xG** next round.

The score is a normal **scoreboard** (e.g. "ARG 3 – 2 BRA") with the clock — the old 5-ball strip is retired, since scores can now exceed 3–2.

---

## 15. Tuning Table (every knob)

| Parameter | v7 value |
|---|---|
| Run length | 7 matches (3 group · R16 · QF · SF · Final) · loss = run over |
| Match length | **10 rounds = 90'** (≈9'/round); halftime R5 (45'), full time R10 (90') |
| Win condition | **lead by 3 → instant win**; else **most goals at full time**; level → extra time |
| Extra time | **golden goal**, **xG ×2**, meters reset to 0, stars + fatigue refreshed; safety: higher ET xG after ~5 ET rounds |
| xG per round | `clamp(0.05 + max(0, ATK_eff − DEF_eff)/150, 0, 0.60)` → goal at 1.0 (carry); **keep scoring lively** — mercy + full-90 bound the score (see §7, §19) |
| Card flow | grays cycle freely · **premium players lock → return at halftime / start of ET** (once-per-half) · **Tactical Cards single-use (exiled)** |
| Starting XI | 11 players, slot budget **10**, + 0–1 Tactical |
| Quickplay deck | ~16 players, slot budget **20**, + **up to 3** Tactical; pick difficulty → opponent tier |
| Slot costs | Common 0 · Rare 1 · Epic 2 · Legendary 3 · Tactical 1 (legendary Tacticals 2–3) |
| Reward / win | +1 random player (rarity by stage) + choose-1-of-3 Tactical |
| Opening hand | 5 (Captain) · Draw 3/round · hand cap 8 |
| Stamina | **8**/round (R1–5), **10** (R6–8), **12** (R9–10), both players |
| **Card cap / round** | **4** (R1–5) · **5** (R6–8) · **6** (R9–10) — player cards only, attack+defense combined |
| **Rarity multiplier** | Common ×1.0 · Rare ×1.1 · Epic ×1.2 · Legendary ×1.3 (applied to each card's stat) |
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

North star: **FIFA Ultimate Team card art on a Slay-the-Spire run.** Stadium-at-night, glossy. Card frames by rarity (silver/blue/purple/gold), position badge, **ATK (red) / DEF (blue)** pips.

1. **Main menu / Mode select** — **Arcade Run** vs **Quickplay**, plus Collection and How to Play. Choosing **Quickplay** opens a **difficulty picker** (Easy / Medium / Hard / Legendary → opponent tier) and the **loaded-deck builder** (~16 players / **20 slots** + **up to 3 Tactical Cards**); then straight into a single match.
2. **Run Map / Bracket** — 7-stop ladder, progress lit, next opponent crest + year + difficulty stars; Final glows.
3. **XI Builder** — filterable pool, **Slot Budget meter** (x/10 in the Run, **x/20 in Quickplay**), Captain star, **Tactical tray** (max **1** in the Run, **up to 3** in Quickplay), ATK/DEF + cost curves.
4. **Locker Room** *(Arcade Run only)* — reward player reveal, **choose-1-of-3 Tactical**, set Captain, deck list, next-opponent preview.
5. **Match Board (centerpiece):**
   - **Scoreboard + match clock:** a normal **numeric scoreboard** ("ARG 2 – 1 BRA") and a **running clock** — kickoff → **45' HALFTIME** (round 5) → **90' FULL TIME** (round 10) → **ET** if level. A subtle **"–3 to win"** marker hints at the mercy threshold.
   - **xG meter** per team — **always visible**, shown as a **filling bar (not a precise decimal)** so it reads as football. The round's gain **animates in on reveal**, and a **fatigue "heat" glow** shows when that side's defense is tiring (§8). Both bars on screen at all times is load-bearing — it's how you make the attack-vs-defend call, and watching the opponent's bar **flatline against your wall** is the payoff for defending. A bar crossing 1.0 → **full-screen "GOAL!!!"**, crowd roar, net-ripple.
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
  board: { attack: CardInPlay[]; defense: CardInPlay[] };
  formation: Formation;
  powers: TacticalCard[];        // active Power tacticals for the match
  captainId: string; momentum: number; handOfGodUsed: boolean;
}

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
  deck: Card[]; captainId: string; defeated: string[]; alive: boolean;
}
```

**Round resolution (pseudocode):**
```
// At commit/lock-in: reject a lineup if it exceeds the cap or stamina:
function validLineup(m, p):
    cards = laneCards(m,p,"attack") + laneCards(m,p,"defense")
    return cards.length <= CARD_CAP(m.round)
        and sum(c.cost for c in cards) <= STAMINA(m.round) + tempStamina(m,p)   // Water Break etc.

// stat contribution folds in the rarity multiplier per card:
atkOf(c) = c.atk * RARITY_MULT[c.rarity] * statusMods(c)
defOf(c) = c.def * RARITY_MULT[c.rarity] * statusMods(c)

function resolveRound(m):
    resolveInstants(m)                          // VAR → Offside → Referee → Injury edit boards

    for p in [0,1]:
        atk[p] = sum(atkOf(c) for c in laneCards(m,p,"attack")) + atkSynergy(m,p)
        def[p] = sum(defOf(c) for c in laneCards(m,p,"defense")) + defSynergy(m,p) + saveBonus(m,p)
        fo = FORMATIONS[m.players[p].formation]
        atk[p] = round(atk[p] * fo.atkMult)
        def[p] = round(def[p] * fo.defMult) * (1 - m.players[p].fatigue/60)   // fatigue saps defense

    for scorer in [0,1]:
        opp   = 1 - scorer
        delta = atk[scorer] - def[opp]
        xgAdd = clamp(0.05 + max(0, delta)/150, 0, 0.60)
        xgAdd = applyTacticalXg(m, scorer, xgAdd)     // Tiki-Taka, Long Ball, Penalty, Counter, Nutmeg, Momentum...
        if m.extraTime: xgAdd *= 2                     // golden-goal ET resolves fast
        addXg(m, scorer, xgAdd)                        // crossing 1.0 => goal++ (record scoredFirstAt), carry remainder

    for p in [0,1]:
        m.players[p].fatigue = clamp(m.players[p].fatigue + fatigueDelta(m,p), 0, 30)   // defend↑ attack↓
    if m.round == 5 and not m.extraTime: halftime(m)    // 45': stars back + fatigue cleared, both sides

    cleanupBoards(m)            // grays→discard · premium players→locked · spent Skills/Instants→exiled · Powers stay
    checkWin(m)

function halftime(m):                               // round 5 reset, both teams
    for p in [0,1]:
        m.players[p].drawPile += m.players[p].locked; shuffle(m.players[p].drawPile)
        m.players[p].locked = []; m.players[p].fatigue = 0

function beginExtraTime(m):                          // level at full time → fresh golden-goal sprint
    m.extraTime = true; m.etRound = 0
    for p in [0,1]:
        m.players[p].xg = 0                            // meters reset, goals carry (e.g. 2–2 stays)
        m.players[p].drawPile += m.players[p].locked; shuffle(m.players[p].drawPile)
        m.players[p].locked = []; m.players[p].fatigue = 0

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
- Card flow: draw/discard with **grays reshuffling**, **premium players lock until halftime**, **Tactical Cards single-use (exiled)**; **ramping stamina (8/10/12)**; **per-round card cap (4/5/6)**; lane combat + **3 formations**.
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

1. **xG curve** (`0.05` floor, `/150` slope, `0.60` cap) — keep scoring **lively/arcade** (the design wants fast goals); the **3-goal mercy + the full 90 bound runaway scores on their own** (margin must stay ≤2 to reach full time). Tune so: **mercy fires around mid-match** in decisive games (not round 2 — else the 90' is vestigial; and not never), close games stay **high-scoring to full time**, ET resolves fast, and — crucially — **defense still visibly suppresses goals** (a strong back line concedes clearly less, or defenders/GKs lose their point). #1 thing to tune.
2. **Fatigue weight** (`F/60` defense penalty, gain/loss rate) — strong enough to punish turtling and create late goals, but not a death-spiral? Watch defensive-stack decks (Fortress + Catenaccio).
3. **Tactical xG values** (Penalty 0.85, Long Ball 0.45, Tiki-Taka 0.20, Counter 0.40) — balanced now that each Tactical is **single-use** (so it's one big swing, not repeated)?
4. **Visible Tacticals timing game** — does telegraphing make players hoard their one-shot Tacticals to the last second? If lock-in feels like a stare-down, add a short planning timer.
5. **Extra time** — does golden-goal + doubled xG resolve quickly and feel fair? Watch the scoreless-ET safety; consider a penalty-shootout minigame as a future alternative.
6. **Formation ±25%** — still swingy now that it scales xG? Try ±15–20% if goal output spikes on Offensive.
7. **Player-gated Tacticals & lineup leak** — playing "Penalty Kick" reveals you have a FWD; fun read or annoyance?
8. **Cap + rarity-multiplier + once-per-half lock** — three things now constrain stars (per-round cap, per-half lock, plus the multiplier boosting them). Verify in the sim that premiums still **feel worth their slots** and aren't *over*-rationed: a star-led deck should clearly beat an all-common deck. If stars feel weak, ease the half-lock (e.g. return them sooner) or raise the multiplier; if too strong, the reverse.
9. **Defense: throttle-only or drain?** Defense currently only slows the opponent's fill rate. If defending feels too passive, add a **small capped drain** when `DEF_eff` decisively beats `ATK_eff` (held in reserve; the sim decides).
10. **Quickplay draws** — ET makes every match decisive; if you'd rather allow casual 90' draws in Quickplay, that's a one-line toggle (skip ET when level).
11. **Premium-heavy decks & the half-lock** — a 20-slot Quickplay deck has many stars to rotate; a lean run deck burns through its few stars fast each half. Confirm both feel good (front-loaded star bursts then gray-grind, refreshed at halftime).

---

*End of v7. A full 90-minute match: lead by 3 to end it early, else most goals at full time, golden-goal extra time if level. Stars are once-per-half trumps, Tactical Cards are single-use, commons are the sustain engine. xG keeps the variance honest; fatigue makes the clock matter. Every value in §15 is a knob.*
