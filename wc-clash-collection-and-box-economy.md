# WORLD CUP CLASH — Collection, Boxes & Team Perks *(final)*

The persistent meta-progression layer that sits on top of the arcade run. Players are unlocked
from **boxes**; duplicates convert; owning a nation's players unlocks **team perks**; run results,
account level, and a welcome bundle grant boxes. Modeled on Hearthstone / Gwent / FUT, adapted to
WCC. This is the canonical spec; it also ships condensed as GDD §20.

---

## 0. Foundations (locked decisions)

- **Commons are collectible**, not a free pool. The ~7k-player dataset is mostly commons — that
  volume fills the boxes and gives the collection a long tail. Everything is earned.
- **Your collection = your run-start pool (Arcade).** At deck-build you draft from what you own; a bigger
  collection + stronger team perks → deeper runs → better reward boxes. That loop is the point.
- **WCC is collection-gated** (like HS / FUT) **for the Arcade Run + meta**: a newcomer can't field a
  star- or nation-stacked deck until they collect. The **welcome bundle** (§4) covers the cold-start.
  **Quickplay is ungated** — all players available, no login — the try-before-you-register sandbox.
- **In-run unlocks stay temporary** (roguelike); the **box** is the persistent reward.
- **Box-tier names** are kept off the card rarities to avoid collision: **Group / Knockout /
  Champions** (a "Group box" can still drop a legendary; the name is its quality tier).

---

## 1. Deckbuild — pick your own commons (+ a random button)  *(RESOLVED)*

In the **Arcade Run**, after spending your slot budget on premiums, you fill the remaining roster
spots with **commons you've collected** (the 0-slot tier); **Quickplay** instead offers the **full
pool** (all players, no login):

- **Hand-pick them** from your collection, **or hit "Fill randomly"** to auto-complete the roster
  from your owned commons (for players who don't want to micro-manage the bench).
- This reverses v9's roll-only rule. It's viable now because commons are **earned** — you can only
  field commons you own, so a newcomer can't cherry-pick 79s they don't have.
- **Balance caveat (must re-sim):** picking your best-owned commons is a small power bump over
  random — under diminishing returns the lane's *top* card gets full weight. So the star-vs-common
  balance needs a sim pass with a **"best-owned-commons" archetype** (GDD §19) before it's locked.
  If it over-tilts toward commons, the diminishing-returns weights or the common OVR band are the
  dials. Squad-building agency on **premiums** (which you already pick) is where the meaningful
  choices live; common-picking is mostly squad flavour + team-perk fuel.

---

## 2. Box structure

- **5 cards per box** (the Hearthstone / Gwent sweet spot). Pacing comes from **rarity scarcity
  inside the box**, not box size.
- **1 guaranteed "headliner" slot + 4 filler.** The headliner has better odds and guarantees the
  box is never worthless.
- **The headliner is a random reveal** (no choosing). A legendary pull is meant to be a *surprise*
  — the FUT "who did I pack?!" spike — so boxes are the **random thrill** and **crafting** (§5) is
  the **deliberate control**: you chase at random, and spend Scraps to craft the specific player (or
  finish the nation) you actually want. Letting you pick from the pack would blunt the thrill and
  let players hyper-optimise one nation. *(Duplicates aren't punished — they convert to Scraps, §5.)*

---

## 3. Drop tables

Per-slot probabilities, each column summing to 100. **C**ommon / **R**are / **E**pic / **L**egendary.

| Box | Headliner (×1) | Filler (×4) |
|---|---|---|
| **Group** (entry) | R 83 · E 15 · L 2 | C 82 · R 16 · E 1.7 · L 0.3 |
| **Knockout** (mid) | R 58 · E 37 · L 5 | C 57 · R 33 · E 9 · L 1 |
| **Champions** (premium) | E 72 · L 28 | C 26 · R 42 · E 28 · L 4 |
| **Champions — Trophy** *(win the Final)* | **L 100** | C 26 · R 42 · E 28 · L 4 |

**What you'll see per box** — chance of *at least one* of each rarity (and expected legendaries for pacing):

| Box | P(≥1 Rare) | P(≥1 Epic) | P(≥1 Legendary) | E[Legendary] |
|---|---|---|---|---|
| Group | ~92% | ~21% | ~3% | 0.03 |
| Knockout | ~92% | ~57% | ~9% | 0.09 |
| Champions | ~89% | ~93% | ~38% | 0.44 |
| Champions — Trophy | ~89% | ~73% | **100%** | 1.16 |

**Optional pity timer** (Hearthstone-style): if a player opens **N** Champions boxes with no
legendary, force the next headliner to Legendary.

---

## 4. New-player welcome bundle

On registration (login + choosing a username), a new account opens **4 boxes — 2 Group + 1 Knockout
+ 1 Champions**.

- **The welcome Champions box guarantees a Legendary headliner** (a **random** legendary — its
  headliner is forced to Legendary, but you don't pick it) — so every player starts with a marquee
  name to build around and a nation to begin chasing for perks. (A normal Champions box is only
  ~38% legendary; the welcome one is forced, so nobody opens flat.) *(Optional onboarding exception:
  if a random first star feels too unguided, this single box could let new players pick 1 of 3
  legendaries — the one place a guided pick earns its keep. Default: random, like every other box.)*
- **Expected starting collection (≈20 cards):**

  | Rarity | Expected count |
  |---|---|
  | Common | ~9.9 |
  | Rare | ~6.5 |
  | Epic | ~2.3 |
  | Legendary | ~1.3 *(1 guaranteed + luck)* |

- That's enough to **spend the 10-slot Run budget**, **fill an 11-player roster** (premiums +
  picked commons), and seed a first nation track. Quickplay's larger roster (~16) will lean on the
  "Fill randomly" button early until the common pool deepens.

---

## 5. Duplicates

You field only **one** of each real player, so **owning a card makes every further copy a
duplicate** — no playset threshold. Convert via either:

- **(Recommended) Craft.** Dupes → "Scraps"; craft the exact missing player, priced by rarity —
  the genre's most-loved anti-frustration system (HS dust, Gwent scraps, LoR shards), because it
  gives control over the collection.
  - Suggested (tune): earn Common **+1** · Rare **+8** · Epic **+25** · Legendary **+100**;
    craft Common **12** · Rare **100** · Epic **400** · Legendary **1600** (earn ≈ 1/12 of craft).
- **(Simpler) XP → box.** Dupes → account XP (§7); leveling yields a box. More random, less UI.

With ~7k mostly-common players you keep pulling **new** commons for a long time, so common dupes
stay rare early and only ramp late — the conversion faucet is naturally slow.

---

## 6. Team perks  *(the reason commons are worth collecting)*

Owning players of a nation feeds a **nation collection track**; thresholds unlock equippable perks
for that nation — so every common, even a 64-rated bench player, is collection progress.

- **Thresholds as % of that nation's available pool** (works for Brazil's 100+ and a minnow's 30):

  | Track | Owned (% of nation) | Perk (applied to that nation's players when fielded) |
  |---|---|---|
  | Bronze | 20% | +1 ATK / +1 DEF |
  | Silver | 40% | +2 / +2 |
  | Gold | 60% | +3 / +3 **+ unlock a nation-flavoured Tactical Card** |
  | Icon | 85% | a signature passive (e.g. nation-wide Momentum on a goal) |

- **Equip 1–2 nation perks per run** — so you build a run *around* a nation, stacking with the
  existing **Chemistry** (3+ same nation) and **Captain's Pride** (GDD §15). A "Brazil deck"
  becomes a real identity, fuelled by collecting Brazilian players (mostly commons).
- **Iconic XI — historic lineup completion:** assembling a famous side's *actual* eleven (the real
  Brazil 1970 XI) unlocks a unique reward — a boss-team perk, a cosmetic, or that XI as a Legends
  challenge.
- **Balance flag:** perks add flat stat bonuses to fielded players, touching the v11 xG fill math.
  Sim a **"+3/+3 nation" deck** before locking the tiers (GDD §19).

---

## 7. Experience & leveling

Playing earns XP toward an **account level**; **each level-up fills the bar and grants a box.**

**XP sources** (tunable starting values):

| Source | XP |
|---|---|
| Play any match (participation) | +10 |
| Win a match | +15 (on top of participation) |
| Arcade — clear a stage | Group +10 · R16 +25 · QF +40 · SF +60 · Final +90 (escalates with depth) |
| Win the arcade run (lift the trophy) | +150 |
| Quickplay match | participation + win only (no stage bonus) → **~25 win** |
| **Multiplayer match** | participation + win + **Multiplayer bonus +65** → **~90 win / ~30 loss** *(future mode — §10; much more than Quickplay, well under a full run)* |

So a Quickplay win ≈ **25**, a **Multiplayer win ≈ 90** (much more — it's competitive PvP), an early
Arcade win ≈ **35**, an Arcade Final win ≈ **115**, and a **full winning run ≈ 570**. A deep run is the
richest single session; **Multiplayer is the fast *repeatable* path** that sits well above Quickplay
and below a full run; every match pays *something*.

**Level-up box tier — a milestone overlay** (better than escalating bands). Every level grants a
box; the tier is the **best milestone that level hits**:

| Level | Box |
|---|---|
| every level (default) | **Group** |
| every 5th (5, 15, 25, 35, …) | **Knockout** |
| every 10th (10, 20, 30, 40, …) | **Champions** |

One box per level at the best applicable tier — so L10 gives a **Champions** box, not also a
Knockout. *(Stacking all applicable tiers is a more-generous option for a bigger milestone moment.)*
This keeps Champions boxes **scarce even for high-level players** (one per 10 levels) — which an
escalating-band model (every late level → Champions) would not. That scarcity is the whole point.

**XP per level — front-loaded start, then a steady plateau (no runaway balloon).** The XP to
*leave* level L ≈ `min(25 × L, 300)`: it ramps 25 → 300 over levels 1–12 (your first match still dings
level 2), then holds flat at **300/level**. The cap is what kills the high-level wall — the old
uncapped `25 × L` grew *cumulative* XP quadratically, which is exactly why level 50 had crept to ~70
runs.

| Reach level | Total XP | ≈ runs | ≈ Multiplayer wins |
|---|---|---|---|
| 2 | 25 | one match | — |
| 5 *(Knockout box)* | 250 | ~0.4 | ~3 |
| 10 *(Champions box)* | 1,125 | ~2 | ~13 |
| 20 | 4,050 | ~7 | ~45 |
| 50 | 13,050 | ~23 | ~145 |
| 100 | 28,050 | ~49 | ~310 |

(≈ runs at ~570 each; ≈ Multiplayer at ~90/win — and real play *mixes* all three, so effective
leveling is faster.) Level 50 drops from ~70 runs to **~23 runs (or ~145 Multiplayer wins, or a
mix)** — a long-haul goal instead of an impossible one — and level 20 from ~11 to **~7**. In the
plateau you gain **~2 levels per run** (≈ 2 level-up boxes) on top of the run-end box (§8), so the
**1000+ box collection** stays a long but genuinely *reachable* horizon.

Dials: raise/lower the **300 cap** to slow/speed the plateau (~2 levels per run at 570/run); drop the
first level to ~10 XP if you want even a *loss* to ding level 2; widen the **Champions milestone**
(every 10th → 15th) if the faster curve now flows Champions boxes (≈ one every 5 runs mid-game) too
fast for the legendary chase — the conservative per-box odds (§3) are the other lever. Run-winning
stays the primary path to Champions boxes (§8); leveling is the steady trickle.

**XP vs duplicates — keep them separate.** The XP bar is fed by **playing** (above). **Duplicates**
feed **Scraps → crafting** (§5), a different track. Only fold dupes into XP if you skip crafting and
use the simpler XP-dupe model.

**Prestige — level reset + status flex.** At **level 50** you can **prestige**: your account level
resets to **1** (XP bar to 0) and your **prestige rank** ticks up — **Prestige I, II, … X** (or
endless). You **keep everything** — collection, cards, boxes; only the level resets. Re-climbing earns
**the full level-up box rewards again, milestones included** (Knockout at 5/15/25…, Champions at
10/20/30…), so the reset is a genuine fresh faucet — you get to "earn the low levels again."

- **The reward is the flex.** Each rank unlocks an **exclusive prestige cosmetic** (a badge /
  card-back / avatar frame you can *only* get at that rank), shown on your **profile, in Multiplayer**
  (opponents see it — the big flex), **on leaderboards, and at match intro**. **Cosmetic only** — it
  never touches matchmaking (MMR) or card power.
- **Accepted tradeoff:** because re-leveling repeats the Champions milestones, a full 1 → 50 cycle
  yields ~15% more Champions boxes per XP than grinding on without resetting — a mild dedication bonus
  for the most committed. If that ever flows legendaries faster than the chase wants, the dial is to
  downgrade post-prestige milestones to **Group only** (the re-climb then floods commons/rares for the
  long tail without farming Champions); the conservative per-box odds (§3) are the other lever.

---

## 8. Run-end rewards  *(skill faucet)*

Depth scales the reward; **no run is wasted**:

| Run outcome | Reward |
|---|---|
| Group-stage exit (lose matches 1–3) | **1 Group box** |
| Exit before semis (lose R16 / QF) | **1 Group + 1 Knockout box** |
| Lose the semi-final or final | **2 Knockout boxes** |
| **Win the Final** | **1 Champions — Trophy box (guaranteed Legendary)** 🏆 |

The Trophy box's guaranteed legendary makes winning unambiguously beat "lose the final → 2 Knockout
boxes" (~17% legendary).

---

## 9. Pacing, longevity & ethics

- **~7k players, mostly commons → a months-to-years completion tail.** Team perks (§6) make
  incremental common collection feel like progress the whole way.
- **Self-limiting:** once a tier is complete, its pulls convert (Scraps / XP) — the economy can't
  run away. For live-service longevity, add players over time (each new World Cup + retro "Legends").
- **Earned-only.** Rewards from play + duplicate conversion, **no purchase** — this avoids the
  loot-box regulatory/ethics problem entirely (odds-disclosure laws, regional bans, ESRB "random
  items" labels). Keep boxes non-purchasable.

---

## 10. Open questions / knobs

1. **Pick-commons balance re-sim** (§1) — add a "best-owned-commons" archetype; confirm star decks
   still win. The #1 thing to verify before locking.
2. **Nation pool sizes** — pull per-nation player counts from the 7k to set perk % thresholds and
   confirm small nations aren't trivial/impossible.
3. **Premium pool size** within the 7k — sets how fast the legendary chase moves; re-check the
   tables once known against a target "time to first full nation" and "time to a given legendary."
4. **Craft vs XP-box** for dupes (§5).
5. **Perk equip count** (1 or 2 per run) and run-equipped vs always-on.
6. **Pity timer** on/off and N (§3).
7. **Welcome-bundle generosity** — is a guaranteed day-one legendary too strong vs the chase, or
   the right onboarding hook? (Lean: hook.)
8. **PvP is undesigned and is a major addition** (§7) — listed only as an XP source. Before it
   ships it needs its own design pass: matchmaking/MMR, and especially the **collection-gating
   fairness problem** — a collection-gated game pits deep collections against new ones, so PvP needs
   MMR plus likely a **power-bracketed or draft/"standard" format** so newcomers aren't stomped.
   Treat it as a V3 feature (with leaderboards); don't let the economy *depend* on PvP XP until the
   mode exists.
