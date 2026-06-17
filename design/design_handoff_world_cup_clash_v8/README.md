# Handoff: World Cup Clash — v8 (hand & tactical limits)

## Overview
World Cup Clash is a **Slay-the-Spire-style arcade roguelike** themed on World Cup football. You don't
drain an HP bar — you **score goals** driven by expected goals (xG). This bundle is the **v8** revision: it
keeps the v7 90-minute match (3-goal mercy, golden-goal extra time, once-per-half stars, single-use
Tactical Cards) and adds three **hand & tactical limits**.

The authoritative game spec is **`uploads/world-cup-clash-GDD-v8.md`** — read it first. Every number is a
tunable knob; the doc lists them in §15 and the v8 deltas in §0.

## About the design files
The files here are a **working HTML/React prototype** (in-browser Babel, no build step), not a throwaway
mock. The game logic in `js/engine8.js` is real and complete. When porting to a production codebase, treat
the prototype as the **source of truth for rules + look**, and re-implement against the target app's
framework, build system, and component library. If you keep React, the JSX components adapt directly (drop
the in-browser Babel, add a real bundler).

## Fidelity
**High-fidelity, fully interactive.** Final colors, typography, spacing, animations, and a complete playable
match engine. Recreate pixel-for-pixel; behavior is defined by the engine, not guesswork.

## How to run the prototype
Open **`World Cup Clash v8.html`** in a browser (or any static file server). No install/build.
The companion **`World Cup Clash - Design System v8.html`** documents tokens, components and patterns,
rendered live from the production CSS. Earlier versions (v7 and below) still run untouched.

## What changed in v8 (vs v7)
All v8 changes live in **new, suffixed files** so v7 still runs:

| Concern | v8 file | Change |
|---|---|---|
| Rules engine | `js/engine8.js` (exports `window.WCC8E`) | Min-hand-5 draw, tactical 2/half cap + tracking, resets at HT/ET |
| Match board | `jsx/Board8.jsx` (`window.Board8`) | Live `x/2 tactics · half` counter chip beside the player-cap chip |
| Run / locker | `jsx/Run8.jsx` (`Locker3`) | Tactical deck cap ~4 → reward becomes a **swap** (exile one, take the new) |
| App shell | `jsx/App8.jsx` | Wires Board8 + engine8; updated how-to-play; new tweaks |
| Styles | `css/v8.css` | `.cap-chip5.tac` counter chip + locker swap-row styling |
| DS doc | `ds/DSPatterns8.jsx`, `ds/DSScreens8.jsx`, `ds/DSApp8.jsx` | New "Hand & tactical limits" pattern section |

> **Also fixed in v8:** the gold "YOU" scoreboard plate's `clip-path` (`css/v7.css`, `.sb-team.you`) was
> flipped so its angled edge mirrors the red plate and nests parallel to the dark score core. This is a
> shared-CSS fix, so v7's board picks it up too.

### The three v8 rule changes (GDD §0, §6, §12)
1. **Minimum hand of 5.** Each round you draw back **up to 5** (refill to the 5-card minimum) instead of a
   flat 3. If the draw pile empties mid-draw, the gray discard reshuffles in and you keep drawing to 5, so a
   thin deck never strands you on a 2-card hand. (The old `drawPerRound: 3` / `handCap: 8` are gone;
   `handSize: 5`, `handCap: 12` — the cap is now just a soft ceiling so bonus draws from Team Talk/Substitution aren't tossed.)
2. **Tactical play cap.** At most **2 Tactical Cards per half, 4 per match**. Tracked per side in
   `PlayerState.tacticsThisHalf`; reset at halftime and at the start of extra time. The AI obeys the same cap.
3. **Run tactical deck cap ~4.** Your Run deck carries at most ~4 Tactical Cards. Once at the cap, a
   tactical reward becomes a **swap** — take the new one and exile one you hold, or decline.

## Engine API (`window.WCC8E`, in `js/engine8.js`)
Pure logic, no UI. Inherits run-level helpers from `window.WCC3E` (`js/engine3.js`) — **`engine3.js` must
load before `engine8.js`.** Key functions unchanged from v7:
- `newMatch(playerCards, captainId, team, tuning)` → `MatchState`
- `startRound(state)` — refills hand **up to `T.handSize`** (v8), refreshes stamina, runs AI plan
- `setFormation` · `canPlace/place/recall` · `playTactic/canPlayTactic` · `reveal(state)` (returns an event log)
- Helpers: `staminaFor`, `cardCapFor`, `effStats`, `chemNations`, `GATES`

### v8 logic touch-points (search these in `engine8.js`)
- `drawCards(...)` in `startRound`: `Math.max(0, T.handSize - P.hand.length - P.drawPenaltyNext)` (refill, not flat draw).
- `canPlayTactic`: rejects when `P.tacticsThisHalf >= T.tacticalsPerHalf`.
- `playTactic` (human) and `playT` (AI): increment `P.tacticsThisHalf`; AI early-returns at the cap.
- `halftime` block + `beginExtraTime`: reset `tacticsThisHalf = 0` for both sides.
- The deck-cap swap is run-level, handled in `jsx/Run8.jsx` `Locker3` + `jsx/App8.jsx` `lockerContinue(chosen, capId, swapOutId)`.

### Tuning knobs (defaults in `DEF_T`, overridable via `tuning`/Tweaks)
v7 knobs carry over, plus v8:
`handSize 5 · handCap 12 · tacticalsPerHalf 2` (engine) and `runTacticalCap 4` (run-level, passed to
`Locker3` as the `tacticalCap` prop). Tweaks panel exposes *Tactical plays / half* and *Run tactical deck cap*.

xG per round (unchanged): `clamp(0.05 + max(0, ATK_eff − DEF_eff)/150, 0, 0.60)`; goal at each crossing of 1.0 (carry remainder).

## Data model
TypeScript interfaces are in **GDD §17**. The v8 runtime `PlayerState` adds **`tacticsThisHalf: number`**
to the v7 fields (`locked`, `exiled`, `etXg`). Constants in §17: `HAND_SIZE = 5`, `TACTICALS_PER_HALF = 2`,
`RUN_TACTICAL_DECK_CAP = 4`. Card data + opponents + tactical defs live in `js/data.js`…`data4.js`.

## Screens / views
- **Menu** (`App8.jsx`) — start a run / quick run / how-to-play (v8 copy).
- **Bracket** (`Run8.jsx` → `Bracket3`) — 7-stop ladder.
- **XI Builder** (`Builder3.jsx`) — slot-budget squad builder + Captain + tactical tray (≤1 at start, grows to the ~4 cap).
- **Match Board** (`Board8.jsx`) — numeric scoreboard + clock + mercy marker, per-team xG rails with
  fatigue heat, attack/defense lanes, formation picker, face-up tactical shelf, four card piles, and the new
  **`x/2 tactics · half`** counter (`.cap-chip5.tac`, red when spent) next to the **`x/N players`** cap chip.
- **Locker** (`Run8.jsx` → `Locker3`) — reward player + choose-1-of-3 tactical; at the deck cap it switches
  to swap mode (click a held tactical to mark it OUT, then take the new card).
- **Trophy / Run-over** (`App8.jsx`).

## Design tokens
Brand foundation is the **Hiedra design system** (purple accent `#7F56D9`), re-skinned for a dark
stadium-night theme. Live token reference: `World Cup Clash - Design System v8.html` and
`design-system/tokens.css`. Game accents: gold `#E8C873`, attack-red `#C43C30`/`#FF8D80`, purple `#7F56D9`.
v8 tactical-chip tint: brand purple `rgba(127,86,217,.14)` fill / `#C7B3F0` text; "spent" red `#FF9D93`.
4-pt spacing grid. Inter (400–800). Radii: inputs/buttons 8–10px, cards 12px, pills 999px.

## Files to read, in order
1. `uploads/world-cup-clash-GDD-v8.md` — full spec (v8 deltas in §0)
2. `js/engine8.js` — rules (diff against `js/engine7.js` to see the v8 deltas isolated)
3. `jsx/Board8.jsx` + `jsx/Board7Widgets.jsx` + `css/v8.css` + `css/v7.css` — match-board UI
4. `jsx/Run8.jsx` (`Locker3`) + `jsx/App8.jsx` — run shell, locker swap, flow
5. `World Cup Clash - Design System v8.html` — visual language

## CSS load order (matters)
`base → cards → board → v2 → v3 → v4 → v4xg → v5 → v6 → v7 → v8` (later files override earlier).

## JS / JSX load order (matters)
`data → data2 → data3 → data4 → engine3 → engine8`, then
`tweaks-panel → Card2 → Builder3 → Run8 → Board3 → Board4Widgets → Board7Widgets → Board8 → App8`.

## Assets
Nation flags/crests are drawn in code (`Crest3`/`Flag2` in `jsx/Board3.jsx`, data in `js/data*.js`). No
external image assets are required by the game. Icons follow the Lucide style per the Hiedra system.
