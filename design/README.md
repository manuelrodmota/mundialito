# Handoff: World Cup Clash — v10 Balance Pass (build "v9.html")

## Overview
**World Cup Clash** (working project name *WorldCupHeartstone*) is a single-player, roguelike **football card-battler**. You draft a squad of real World Cup players, then play a bracket of matches against historic national teams. Each match is a tactical, simultaneous-reveal card duel played over a 90-minute clock: you secretly commit players into **Attack** and **Defense** lanes, both sides reveal, and chances are converted to goals via an **xG** (expected-goals) model. There is no HP — **you win by scoring goals.**

This package documents the current build, whose entry file is `World Cup Clash v9.html`. It contains the **v9** deck-building change and the **v10 balance pass** (see *What changed* below). It is the canonical, latest version — earlier vN files are superseded.

## About the Design Files
The files in this bundle are **design references implemented in HTML/CSS + React (via in-browser Babel)** — a working, interactive prototype that demonstrates the intended look, feel, rules, and math. **They are not production code to ship as-is.** In-browser Babel transpilation, global `window.WCC*` namespaces, and the layered `vN.css` cascade are prototyping conveniences, not a target architecture.

The task is to **recreate this design and its game logic in the target codebase's environment** — using its established framework, state management, build tooling, and component/styling patterns. If no codebase exists yet, choose an appropriate stack (e.g. React + TypeScript + Vite, or a game framework) and implement there. The **game rules and tuning are the spec**; the **engine files are the source of truth for that math** and should be ported faithfully (ideally to typed, unit-tested modules). The visual layer should be rebuilt cleanly rather than carried over verbatim.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, interactions, animations, and a fully working game engine are all present. Recreate the UI to match, and port the engine logic exactly (the numbers are deliberately balanced — see *Design Tokens → Game tuning*).

---

## What changed in this version (the new rules)

The v10 balance pass exists because Monte-Carlo simulation showed the previous build over-rewarded **quantity** (walls of cheap common players) over **quality** (a few stars). v10 makes a small premium core competitive with a full bench. **Five linked changes**, all in `js/engine9.js`:

1. **Gentle per-round field cost.** The stamina to *field* a card is flattened by rarity to **common 2 / rare 2 / epic 3 / legendary 4** (`FIELD_COST` in `engine9.js`). This is separate from the deck-build **slot** cost (common 0 / rare 1 / epic 2 / legendary 3), which is unchanged. A premium deck can now afford 3–4 bodies on the pitch.
2. **Star-core stamina discount.** In a lane holding **≥1 premium** (non-common) card, the **single most-expensive card pays full price** and **every other card in that lane is half-price** (`Math.floor(base × 0.5)`, minimum 1). An all-common lane gets no discount. → `laneStaminaCost()`.
3. **Diminishing returns on lane stacking.** Within a lane, each card's stat contribution is sorted high→low and multiplied by the weight vector **`[1.00, 0.85, 0.70, 0.55, 0.40, 0.25]`** (`STACK_WEIGHTS`). The 4th–5th body adds very little. → `laneStack()`.
4. **Retuned xG curve.** Slope **`/210`** and cap **`0.50`** (previously `/150`, `0.60`), holding a match to a lively ~5–6 goals.
5. **Sudden-death extra time.** Golden goal is now *true* sudden death: in each extra-time passage **only the side that creates the bigger chance can bank xG** — the other's chance "comes to nothing." Level games resolve in a round or two instead of trading goals into a marathon. → the `applyXg` branch inside `reveal()`.

**Also (v9 — `jsx/Builder9.jsx`):** the slot budget now buys a **premium core only** (commons are not hand-pickable in the builder); the rest of the 11 auto-fills with **random commons** via **"Fill bench (random)"** (re-click to re-roll).

**Carried over from v7/v8:** minimum 5-card hand (draw back up to 5 each round); at most **2 Tactical plays per half** (4 per match); Tactical cards are **single-use** (exiled after play) and **revealed to both sides**; **premium players lock to the bench until halftime / extra time**; 90' resolves by **3-goal mercy rule** or most goals at full time.

> **Engine namespace note:** the active match engine is exported as `window.WCC9E` (defined in `engine9.js`). It extends run-level helpers from `window.WCC3E` (`engine3.js`). The card component reads the new field cost through a global `window.fieldCostOf(card)` shim so older card markup stays backward-safe.

---

## Screens / Views

The app is a single React tree (`jsx/App9.jsx`, component `App9`) that switches between four screens via a `screen` state value: `menu`, `builder`, `run`, and the in-match `Board9`. A persistent **Tweaks** panel (dev/design tuning) is mounted from `tweaks-panel.jsx`.

### 1. Main Menu (`screen === "menu"`)
- **Purpose:** entry point; start a run, read how-to-play, open Tweaks.
- **Layout:** centered column on the dark pitch-green background. Title lockup, primary "Start a run" button, and an expandable **How to play** section (the rules copy lives in `App9.jsx` as a list of `[heading, body]` pairs — keep this copy; it is the player-facing rules summary and already reflects v10).
- **Components:** primary/ghost buttons (see Design Tokens), how-to accordion.

### 2. Squad Builder (`screen === "builder"`, `jsx/Builder9.jsx`, component `Builder9`)
- **Purpose:** draft an XI plus an optional tactical card under a **10-slot** budget.
- **Layout:** two-pane. **Left** = filter/search bar (text search; selects for World Cup year, nation, position, rarity) over a scrolling grid of player cards. **Right** = the current squad, grouped: premium picks, **"Bench · random commons"**, and the tactical slot, with a slot-budget meter and a captain crown.
- **Key behaviors (v9):**
  - The pickable pool is **premiums only** (`c.slots > 0`); commons are filtered out of the grid and cannot be toggled.
  - **Budget:** sum of pick `slots` must be ≤ `slotBudget` (10). Premiums: rare 1 / epic 2 / legendary 3.
  - **Roster size:** exactly **11** players. Premium picks + rolled commons must not exceed 11; adding a premium trims rolled commons to make room.
  - **"Fill bench (random)"** keeps the premium picks, then shuffles the common pool and slices enough to reach 11. Re-clicking re-rolls.
  - **Captain:** exactly one premium pick is crowned (★). Auto-assigned to the first premium picked; user can re-crown.
  - **Tactical:** at most **1** card carried into the run from the builder.
  - The rarity filter labels: "All premiums / Rare (1) / Epic (2) / Legendary (3)".
- **Components:** `Card2` (the player card, see below); filter selects; slot meter; remove (✕) and crown (★) buttons on each squad row.

### 3. Run / Bracket (`screen === "run"`, `jsx/Run8.jsx`)
- **Purpose:** the roguelike meta-layer — progress through a bracket of historic opponents, earn rewards (new cards / tactical swaps) between matches, carry a tactical deck (cap **4**).
- **Layout:** bracket/ladder view of upcoming opponents with crests, current squad summary, and a reward screen between matches.
- **Logic source:** run helpers (`STAGES`, opponents, rewards, preset XIs) live in `engine3.js` (`window.WCC3E`), reused by `WCC9E`.

### 4. Match Board (the core loop — `jsx/Board9.jsx`, component `Board9`)
- **Purpose:** play one 90-minute match as a series of simultaneous-reveal rounds.
- **Layout (top → bottom):**
  - **Scoreboard header:** numeric goal score, match clock (round → minute mapping; 10 rounds = 90'), both crests, halftime/extra-time state.
  - **Opponent lanes** (face-down until reveal) — Attack and Defense.
  - **Your lanes** — droppable **Attack** and **Defense** zones (`Lane4` in `Board4Widgets.jsx`).
  - **Action dock:** formation picker, **stamina readout**, the **player-cap chip** (e.g. `2/4 on pitch`), the **tactical-cap chip** (`n/2 tactics · half`), and — new in v10 — the **★ star core · support half-price** chip that appears only while a lane holds a premium with ≥2 cards.
  - **Hand:** your draw, drag-or-tap cards into lanes; **Lock in & reveal** / **Pass round** button.
  - **Bench pile** (locked premiums until halftime) and **Exiled pile** (spent tacticals).
- **Round loop:** `startRound` → player plans (place/recall/playTactic) → **reveal** computes both sides' xG, applies goals, advances the clock, checks win ladder → `roundEnd` → repeat.
- **Stamina model (v10 — important):** stamina is **derived, not decremented per card.** Each round, `recompStamina(P)` sets
  `stamina = maxStamina + tacticBonus − playerStaminaSpent(P) − tacticSpent`,
  where `playerStaminaSpent` = `laneStaminaCost(attack) + laneStaminaCost(defense)` with the star-core discount applied holistically. Placement affordability uses `marginalCost(P, card, lane)` (how much adding the card changes the discounted lane total), **not** the card's flat cost — because adding a star can *retroactively* halve its lane-mates.

---

## Interactions & Behavior
- **Drag/tap to field:** cards move from hand into Attack or Defense. GKs cannot enter Attack. Blocked if it would exceed the per-round **card cap** or available **stamina** (by marginal cost). Recall returns a card to hand and recomputes stamina.
- **Simultaneous reveal:** both sides commit hidden; "Lock in" flips the opponent's lanes and animates xG accrual and goals.
- **xG → goals:** a side's xG accumulates; each time the meter crosses **1.0** it scores and the remainder carries (`while (xg >= 1) { xg -= 1; goals++ }`).
- **Win ladder (per `reveal`):** (1) lead ≥ `mercyLead` (3) → instant win; else (2) at `roundCap` (round 10) the leader wins; else (3) if level at 90' → **golden-goal extra time** (`beginExtraTime`): meters reset, benched stars and fatigue refresh, xG counts ×2, and sudden death applies. Safety: if still level after `etRoundCap` (5) ET rounds, higher accumulated ET xG wins.
- **Tactical cards:** revealed to both sides on play, **exiled** after use, gated by preconditions (`GATES`), capped at 2 plays/half. Some are instants (Water Break clears fatigue and grants +2 stamina this round; Substitution discards up to 2 and redraws).
- **Fatigue:** defending raises fatigue, attacking lowers it; fatigue saps effective DEF so the opponent scores more easily. Halftime (round 5→6 boundary) resets fatigue, returns benched stars, and refreshes the tactical allowance.
- **Animations / motion:** a `motion` tweak (`full juice` / reduced) gates card-deal, reveal-flip, and goal-pop animations. The new star-core chip animates in with `starcore-in` (`css/v9.css`); honor `prefers-reduced-motion`.
- **AI opponent:** `aiPlan` / `aiReact` in `engine9.js` field best-stat-first within cap+stamina (using the same `marginalCost`), choose a formation by game state, and play gated tacticals reactively.

## State Management
Per-match state object (`newMatch` in `engine9.js`) holds: `round`, `phase` (`plan`/`reveal`/`roundEnd`/`end`), `extraTime`, `etRound`, `players[2]`, `winner`, `capReason`, `roundXg`, `roundGoals`, `lastEvents`, `offsideZeroed`, `opponent`, `T` (tuning).
Per-player state: `hand`, `deck`, `discard`, `board.{attack,defense}`, `tactics`, `exiled`, `bench`, `goals`, `xg`, `xgTotal`, `etXg`, `stamina`, `maxStamina`, `fatigue`, `tacticsThisHalf`, **`tacticSpent`, `tacticBonus`** (v10), `formation`, `hogUsed`, plus per-round flags.
Run-level state (squad, captain, bracket position, tactical deck, rewards) is managed in `App9`/`Run8` via React state.

**Porting guidance:** keep the engine **pure and UI-agnostic** (it already is — no DOM access). Port `engine9.js` + the reused parts of `engine3.js` to typed modules with unit tests covering: field cost by rarity, the star-core discount (anchor full / rest half / min 1 / all-common = no discount), `laneStack` weighting, the xG→goal crossing, the win ladder, and sudden-death ET.

## Design Tokens

### Colors
Defined as CSS variables in `css/base.css` (and refined across `v2`–`v9.css`). Core palette is a stadium-night theme: deep pitch-green/charcoal backgrounds, off-white text, a dimmed-text token, and rarity accent colors. The v10 star-core chip uses gold: text `#ffd9a0`, border `rgba(232,200,115,0.5)`, fill `rgba(232,200,115,0.12)` (see `css/v9.css`). **Pull exact values from `css/base.css` `:root`** — they are authoritative; don't eyeball from screenshots.

### Rarity system
| Rarity | Overall (OVR) | Build **slots** | Field **stamina** (v10) | Stat **multiplier** |
|---|---|---|---|---|
| Common | ≤ 79 | 0 | 2 | ×1.0 |
| Rare | 80–86 | 1 | 2 | ×1.1 |
| Epic | 87–91 | 2 | 3 | ×1.2 |
| Legendary | ≥ 92 | 3 | 4 | ×1.3 |

Player stats by position from OVR `o` (`statsOf` in `data2.js`): FWD `[o, 0.55o]`, MID `[0.85o, 0.78o]`, DEF `[0.55o, o]`, GK `[0, o+5]` (DEF only) — `[atk, def]`.

### Game tuning (`DEF_T` in `engine9.js` — every value is a knob)
`mercyLead: 3` · `roundCap: 10` · `halftimeRound: 5` · `etRoundCap: 5` · `etXgMult: 2` · `xgFloor: 0.05` · **`xgSlope: 210`** · **`xgCap: 0.50`** · `openingHand: 5` · `handSize: 5` · `handCap: 12` · **`tacticalsPerHalf: 2`** · `staminaPerRound: 8` · `slotBudget: 10` · `cardCapBase: 4` · `rarityMult: {common 1.0, rare 1.1, epic 1.2, legendary 1.3}` · `prideBonus: 2` · `chemBonus: 2` · `formationSwing: 25` · `fatigueMax: 30` · `fatigueDiv: 60` · `fatigueRate: 3` · `pressFatigue: 6` · `pressDef: 10`.
v10 additions (constants near the top of `engine9.js`): `FIELD_COST {common 2, rare 2, epic 3, legendary 4}` · `STAR_DISCOUNT 0.5` · `STACK_WEIGHTS [1.00, 0.85, 0.70, 0.55, 0.40, 0.25]`.

**Ramps:** stamina = base 8 (R1–5) → 10 (R6–8) → 12 (R9–10), ET at top tier (`staminaFor`). Card cap = 4 (R1–5) → 5 (R6–8) → 6 (R9–10), ET +2 (`cardCapFor`).

### Typography, spacing, radius, shadows
All in the CSS layer (`base.css` + `cards.css` + `board.css`). Treat the CSS files as the type/spacing spec; extract the scale rather than re-deriving it.

## Assets
- **National-team crests:** `assets/crests/*.svg` (47 files). Mapped by nation name in `js/data.js` (`CRESTS`); nations without a crest fall back to a colored flag-band chip (`crestSrc()` returns `null`). Source noted in `data.js` as footylogos / footballlogos.org — **verify licensing before shipping** and swap for properly-licensed crests if needed.
- **Player cards:** drawn entirely in CSS/SVG by `jsx/Card2.jsx` + `jsx/Jersey.jsx` (procedural jersey, no per-player photos). No external player imagery.
- **Player & opponent data:** `js/data.js` (raw pool), `data2.js` (derives cards: stats/slots/rarity/cost + the 19 tactical cards), `data3.js` (teams, formations, opponents, rewards), `data4.js` (additional run data).

## Files (in this bundle)
Open `World Cup Clash v9.html` directly in a browser to run the prototype (no build step; it uses CDN React + in-browser Babel). Load order matters and is encoded in the HTML `<head>`/`<body>`.

**Entry:** `World Cup Clash v9.html`
**Engine / data (`js/`):** `data.js`, `data2.js`, `data3.js`, `data4.js`, `engine3.js` (run helpers, `WCC3E`), **`engine9.js`** (match engine, `WCC9E` — the v10 logic).
**UI (`jsx/`):** `App9.jsx` (shell + rules copy + tuning defaults), `Builder9.jsx` (v9 builder), `Run8.jsx` (bracket/run), `Board9.jsx` (match board), `Board3.jsx`, `Board4Widgets.jsx`, `Board7Widgets.jsx` (board sub-components), `Card2.jsx` + `Jersey.jsx` (cards), `tweaks-panel.jsx` (tuning panel).
**Styles (`css/`):** `base.css`, `cards.css`, `board.css`, then `v2`–`v9.css` applied in cascade order. `v9.css` holds the v10 star-core chip styling.
**Assets:** `assets/crests/*.svg`.

> The `vN` numbering is prototype history, not architecture. When porting, **collapse the `vN.css` cascade into one clean stylesheet/theme** and **fold `engine3 + engine9` into a single match-engine module** rather than reproducing the layered overrides.
