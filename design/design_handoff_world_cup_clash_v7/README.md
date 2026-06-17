# Handoff: World Cup Clash — v7 (the 90-minute match)

## Overview
World Cup Clash is a **Slay-the-Spire-style arcade roguelike** themed on World Cup football.
You don't drain an HP bar — you **score goals** driven by expected goals (xG). This bundle is the
**v7** revision: a full 90-minute match with a 3-goal mercy rule, golden-goal extra time, once-per-half
star players, and single-use Tactical Cards.

The authoritative game spec is **`uploads/world-cup-clash-GDD-v7.md`** — read it first. Every number is a
tunable knob and the doc calls them out in §15.

## About the design files
The files here are a **working HTML/React prototype** (in-browser Babel, no build step), not a throwaway
mock. The game logic in `js/engine7.js` is real and complete. When porting to a production codebase, treat
the prototype as the **source of truth for rules + look**, and re-implement against the target app's
framework, build system, and component library. If you keep React, the JSX components can be adapted
directly (remove the in-browser Babel and add a real bundler).

## Fidelity
**High-fidelity, fully interactive.** Final colors, typography, spacing, animations, and a complete playable
match engine. Recreate pixel-for-pixel; behavior is defined by the engine, not guesswork.

## How to run the prototype
Open **`World Cup Clash v7.html`** in a browser (or any static file server). No install/build.
The companion **`World Cup Clash - Design System v7.html`** documents tokens, components and patterns,
rendered live from the production CSS.

## What changed in v7 (vs v5/v6)
All v7 changes live in **new, suffixed files** so the earlier versions still run untouched:

| Concern | v7 file | Change |
|---|---|---|
| Rules engine | `js/engine7.js` (exports `window.WCC7E`) | Mercy rule, full-time leader, golden-goal ET, locked/exiled card flow |
| Match board | `jsx/Board7.jsx` (`window.Board7`) | Numeric scoreboard, match clock, ET mode, bench/exiled piles |
| Board widgets | `jsx/Board7Widgets.jsx` | `CenterBoard7`, `CenterXgBar7`, `DeckPile7` |
| App shell | `jsx/App7.jsx` (`window.App7`) | Wires Board7 + engine7; v7 how-to-play + tweaks |
| Styles | `css/v7.css` | Scoreboard, clock, mercy marker, piles, ET banner/tint |
| DS doc | `ds/DSPatterns7.jsx`, `ds/DSScreens7.jsx`, `ds/DSApp7.jsx` | v7 pattern docs |

### The five v7 rule changes (GDD §6, §8, §14)
1. **No race-to-3.** A match is 10 rounds = 90'. Whoever leads at full time wins.
2. **Mercy rule.** Any 3-goal lead (3-0, 4-1, 5-2…) ends the match instantly.
3. **Golden-goal extra time** on a level full time: meters reset to 0, locked stars + fatigue refresh,
   every xG counts ×2, next goal wins. Safety: after 5 ET rounds, higher accumulated ET xG wins.
4. **Star players are once-per-half.** A played non-common player goes to a **locked pile** and returns to
   the deck at halftime (round 5) and at the start of ET. Commons cycle through draw/discard forever.
5. **Tactical Cards are single-use** — exiled the moment they resolve (no halftime return).

## Engine API (`window.WCC7E`, in `js/engine7.js`)
Pure logic, no UI. Key functions:
- `newMatch(playerCards, captainId, team, tuning)` → `MatchState`
- `startRound(state)` — deals hand, refreshes stamina, runs AI plan
- `setFormation(state, f)` · `canPlace/place/recall(state, card, lane)` · `playTactic/canPlayTactic(state, p, card)`
- `reveal(state)` — resolves the round (instants → synergies → formation → fatigue → xG → cleanup → win check) and returns an event log
- Helpers: `staminaFor(T, round, et)`, `cardCapFor(T, round, et)`, `effStats`, `chemNations`, `GATES`
- Run-level helpers (bracket, opponents, rewards, preset XI) are inherited from `window.WCC3E` (`js/engine3.js`) — **`engine3.js` must load before `engine7.js`.**

### Win ladder (engine7 `reveal`, step 15)
```
not extra time:
  if |goalDiff| >= mercyLead(3) -> mercy winner
  else if round >= roundCap(10):
     leader wins, or beginExtraTime() if level
extra time (golden goal):
  if goals differ -> winner
  else if etRound >= etRoundCap(5) -> decideExtraTime() (higher ET xG)
```

### Tuning knobs (defaults in `DEF_T`, overridable via `tuning`/Tweaks)
`mercyLead 3 · roundCap 10 · halftimeRound 5 · etRoundCap 5 · etXgMult 2 · xgFloor 0.05 · xgSlope 150 ·
xgCap 0.60 · staminaPerRound 8 (ramps 8/10/12) · cardCapBase 4 (ramps 4/5/6) · rarityMult
{common 1.0, rare 1.1, epic 1.2, legendary 1.3} · formationSwing 25 · fatigueMax 30 · fatigueDiv 60`.

xG per round: `clamp(0.05 + max(0, ATK_eff − DEF_eff)/150, 0, 0.60)`; goal at each crossing of 1.0 (carry remainder).

> Note: with the default curve, sims trend high-scoring and often reach ET. Mercy fires more if you raise
> `xgSlope`/lower `xgCap`, or raise `mercyLead`. This is a balance dial, not a bug.

## Data model
TypeScript interfaces (`PlayerCard`, `TacticalCard`, `OpponentTeam`, `PlayerState`, `MatchState`, `RunState`)
are specified in **GDD §17**. The runtime `PlayerState` in engine7 adds v7 fields: `locked: Card[]`
(benched premium players), `exiled: Card[]` (spent tacticals + red cards), `etXg` (ET xG accumulator),
and `state.extraTime / state.etRound`.

Card data + opponents + tactical definitions live in `js/data.js`, `data2.js`, `data3.js`, `data4.js`.

## Screens / views
- **Menu** (`App7.jsx`) — start a run / quick run / how-to-play.
- **Bracket** (`Run3.jsx` → `Bracket3`) — 7-stop ladder.
- **XI Builder** (`Builder3.jsx`) — slot-budget squad builder + Captain + tactical tray.
- **Match Board** (`Board7.jsx`) — the centerpiece. Numeric scoreboard + running clock + mercy marker
  (`CenterBoard7`), per-team xG rails with fatigue heat, attack/defense lanes, formation picker,
  face-up tactical shelf, and four card piles (draw / bench-locked / discard / exiled). Extra time adds a
  golden banner + pitch tint (`.et-mode`).
- **Locker / Trophy / Run-over** (`App7.jsx`, `Run3.jsx`).

## Design tokens
Brand foundation is the **Hiedra design system** (purple accent `#7F56D9`); the game re-skins it for a dark
stadium-night theme. Live token reference: `World Cup Clash - Design System v7.html` and
`design-system/tokens.css`. Key game accents: gold `#E8C873`, attack-red `#C43C30`/`#FF8D80`,
purple `#7F56D9`. 4-pt spacing grid. Inter (400–800). Radii: inputs/buttons 8–10px, cards 12px.

## Files to read, in order
1. `uploads/world-cup-clash-GDD-v7.md` — full spec
2. `js/engine7.js` — rules
3. `jsx/Board7.jsx` + `jsx/Board7Widgets.jsx` + `css/v7.css` — match-board UI
4. `jsx/App7.jsx` — app shell / flow
5. `World Cup Clash - Design System v7.html` — visual language

## CSS load order (matters)
`base → cards → board → v2 → v3 → v4 → v4xg → v5 → v6 → v7` (later files override earlier).

## Assets
Nation flags/crests are drawn in code (`Crest3`/`Flag2` in `jsx/Board3.jsx`, data in `js/data*.js`).
No external image assets are required by the game. Icons follow the Lucide style per the Hiedra system.
