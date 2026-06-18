# Handoff: Per-nation football jersey art for player cards

## Overview
This feature replaces the generic role silhouette inside each player card (World Cup Clash) with a
vector **football jersey rendered in the player's national kit colours**. Each jersey is drawn
procedurally as an SVG from a small per-nation "kit" config (base colour, trim colour, pattern),
so all 48+ nations are produced by one renderer rather than hand-drawn files.

## About the design files
The files in this bundle are **design references created in HTML/JS** — a working prototype of the
look and the rendering logic, not a drop-in production module. The task is to **recreate this in the
target codebase's existing environment** (React, Vue, SwiftUI, native canvas, etc.) using its
established component and styling patterns. The included `Jersey.jsx` is plain JS that builds an SVG
string; the geometry, colours and layering below are the source of truth and can be reimplemented in
any framework or even server-side.

## Fidelity
**High-fidelity.** Final colours, geometry, layering and sizing. Recreate pixel-accurately. The SVG
path data and hex values below are exact.

---

## What it looks like

A short-sleeve crew-neck football shirt, front view, on a transparent background:

- **Crew neck** (rounded collar ring), **set-in short sleeves** with a sharp angular tip and an
  armhole seam line, a slightly tapered body, rounded hem.
- The shirt's **trim colour** outlines the whole shirt and draws the collar ring, both cuff rings,
  and the two shoulder/armhole seam lines.
- Surface detail (in draw order): flat fill / pattern → vertical knit hairlines → side-shadow
  gradient (darkens torso edges for 3D) → diagonal sheen highlight → two fabric fold lines → a soft
  chest highlight. A drop shadow sits under the whole shirt.
- **No number** is rendered on the card variant (the card already shows the rating). The standalone
  gallery (`jersey_gallery_reference.html`) shows the same shirt **with** an optional number "10"
  in the Anton font, black fill + 2.5px white outline ("Border B") — kept for reference in case a
  squad number is wanted later.

### Canvas
- SVG `viewBox="0 0 300 340"` (width:height ≈ 0.88). No intrinsic width/height — sized by CSS.

### Silhouette path data (exact)
```
BODY    = M132,46 C140,46 146,62 150,62 C154,62 160,46 168,46 C182,52 196,57 212,63 C228,70 243,79 254,89 C259,95 262,101 262,109 L260,135 Q259,141 252,140 L219,127 Q214,126 214,133 L211,295 Q211,302 202,302 L98,302 Q89,302 89,295 L86,133 Q86,126 81,127 L48,140 Q41,141 40,135 L38,109 C38,101 41,95 46,89 C57,79 72,70 88,63 C104,57 118,52 132,46 Z
COLLAR  = M132,46 C140,46 146,62 150,62 C154,62 160,46 168,46
SEAM_L  = M131,49 C105,66 90,98 86,131
SEAM_R  = M169,49 C195,66 210,98 214,131
CUFF_L  = M40,135 L81,127
CUFF_R  = M260,135 L219,127
```

### Layer build order (inside a clipPath set to BODY)
1. `fillEl` — the pattern (see Patterns).
2. **Knit texture** — vertical lines every 7px from x=44→256, full height, `stroke #000 width 0.7 opacity 0.04`.
3. **Side-shadow gradient** (`sh`) — horizontal `linearGradient` (x 0→1) darkening the torso edges:
   stops (offset / colour / opacity): `0 #000 .06`, `.15 #000 .17`, `.24 #000 .04`, `.31 #000 .26`,
   `.42 #000 .02`, `.5 #fff .07`, `.58 #000 .02`, `.69 #000 .26`, `.76 #000 .04`, `.85 #000 .17`,
   `1 #000 .06`. Painted as a full-canvas rect.
4. **Sheen** (`sheen`) — diagonal `linearGradient` (0,0→1,1): `.36 #fff 0`, `.5 #fff .14`, `.64 #fff 0`. Full-canvas rect.
5. **Fold lines** — `M122,150 Q128,225 122,296` and `M178,150 Q172,225 178,296`, `stroke #000 width 4 opacity 0.07 round`.
6. **Chest highlight** — `<ellipse cx=150 cy=120 rx=46 ry=28 fill #fff opacity 0.06>`.

### Strokes (drawn after the clipped fill, NOT clipped)
- Body outline: `BODY`, `stroke = trim`, width **3.4**, `stroke-linejoin round`.
- Seams: `SEAM_L` + `SEAM_R`, `stroke = trim`, width **1.6**, opacity **0.5**, round caps.
- Collar: `COLLAR` `stroke = trim` width **10** round; then `COLLAR` `stroke #fff` width **2** opacity **0.35** (rib highlight).
- Cuffs: `CUFF_L` + `CUFF_R`, `stroke = trim`, width **8**, round caps/joins.

### Drop shadow
Applied to the SVG via CSS: `filter: drop-shadow(0 4px 6px rgba(0,0,0,.35))`.

---

## Patterns (`fillEl`)
All patterns fill the 300×340 canvas and are clipped to BODY.
- **solid** — single `rect` filled with `base`.
- **stripes** (vertical) — `base` background, then white/stripe-colour bars of width **23px** starting
  at x=46, every 46px (`stripe` colour). Used by Argentina, Paraguay.
- **checker** (checkerboard) — `base` background, then `stripe`-colour squares of **26px** on a
  checkerboard (`(i+j)%2===0`). Used by Croatia.

A kit is `{ pattern, base, trim }` (+ `stripe` for stripes/checker).

## Design tokens — per-nation kits (hex)
Keyed by nation name. `S(base, trim)` = solid.

| Nation | Pattern | Base | Stripe | Trim |
|---|---|---|---|---|
| Argentina | stripes | `#74ACDF` | `#FFFFFF` | `#0A1A3F` |
| France | solid | `#1E2A78` | — | `#FFFFFF` |
| Brazil | solid | `#FCD116` | — | `#00843D` |
| England | solid | `#FFFFFF` | — | `#0A1A3F` |
| Portugal | solid | `#A50021` | — | `#006847` |
| Spain | solid | `#C60B1E` | — | `#FCD116` |
| Germany | solid | `#FFFFFF` | — | `#111111` |
| Netherlands | solid | `#F36C21` | — | `#111111` |
| Belgium | solid | `#C8102E` | — | `#FCD116` |
| Croatia | checker | `#FFFFFF` | `#D52B1E` | `#0A1A3F` |
| Uruguay | solid | `#5C9BD6` | — | `#14274E` |
| Italy | solid | `#1A47B8` | — | `#FFFFFF` |
| Morocco | solid | `#C1272D` | — | `#006233` |
| Japan | solid | `#14215B` | — | `#FFFFFF` |
| USA / United States | solid | `#FFFFFF` | — | `#0A1A3F` |
| Mexico | solid | `#006847` | — | `#FFFFFF` |
| Senegal | solid | `#FFFFFF` | — | `#00853F` |
| Poland | solid | `#FFFFFF` | — | `#DC143C` |
| South Korea | solid | `#C8102E` | — | `#14215B` |
| Norway | solid | `#C8102E` | — | `#00205B` |
| Canada | solid | `#D52B1E` | — | `#FFFFFF` |
| Nigeria | solid | `#008751` | — | `#FFFFFF` |
| Cameroon | solid | `#007A5E` | — | `#FCD116` |
| Egypt | solid | `#CE1126` | — | `#FFFFFF` |
| Algeria | solid | `#FFFFFF` | — | `#007A3D` |
| Sweden | solid | `#FFCD00` | — | `#1E4FA0` |
| Denmark | solid | `#C8102E` | — | `#FFFFFF` |
| Scotland | solid | `#14274E` | — | `#FFFFFF` |
| Wales | solid | `#C8102E` | — | `#FFFFFF` |
| Australia | solid | `#FFCD00` | — | `#00843D` |
| Iran | solid | `#FFFFFF` | — | `#C8102E` |
| Qatar | solid | `#7A1F3D` | — | `#FFFFFF` |
| Saudi Arabia | solid | `#FFFFFF` | — | `#006C35` |
| Ecuador | solid | `#FFD100` | — | `#1E4FA0` |
| Colombia | solid | `#FCD116` | — | `#1E4FA0` |
| Chile | solid | `#D52B1E` | — | `#0039A6` |
| Hungary | solid | `#CE2939` | — | `#FFFFFF` |
| Georgia | solid | `#FFFFFF` | — | `#E2231A` |
| Serbia | solid | `#C6363C` | — | `#0C4076` |
| Switzerland | solid | `#D52B1E` | — | `#FFFFFF` |
| Ghana | solid | `#FFFFFF` | — | `#CE1126` |
| Slovenia | solid | `#FFFFFF` | — | `#005DA4` |
| Russia | solid | `#FFFFFF` | — | `#0039A6` |
| Ivory Coast / Côte d'Ivoire | solid | `#FF7900` | — | `#007A3D` |
| Tunisia | solid | `#E70013` | — | `#FFFFFF` |
| Costa Rica | solid | `#CE1126` | — | `#002B7F` |
| Austria | solid | `#ED2939` | — | `#FFFFFF` |
| Bosnia (& Herzegovina) | solid | `#1A4FA0` | — | `#FCD116` |
| Türkiye / Turkey | solid | `#E30A17` | — | `#FFFFFF` |
| Czechia / Czech Republic | solid | `#D7141A` | — | `#FFFFFF` |
| Paraguay | stripes | `#D52B1E` | `#FFFFFF` | `#14274E` |
| Cape Verde | solid | `#1A4FA0` | — | `#CE1126` |
| South Africa | solid | `#FCB514` | — | `#007A4D` |
| DR Congo | solid | `#2477C9` | — | `#CE1126` |
| Jordan | solid | `#FFFFFF` | — | `#CE1126` |
| Uzbekistan | solid | `#FFFFFF` | — | `#1565C0` |
| Iraq | solid | `#FFFFFF` | — | `#CE1126` |
| Curaçao | solid | `#1A4FA0` | — | `#FCD116` |
| Haiti | solid | `#14387F` | — | `#D21034` |
| Panama | solid | `#DA121A` | — | `#072357` |
| New Zealand | solid | `#111111` | — | `#FFFFFF` |

### Fallback for unknown nations
If a nation isn't in the kit table, derive a kit from the app's simplified flag bands
(`window.WCC2.NATIONS[nation]` = 3 hex bands):
- `base` = band[0]; if band[0] is light (luma > 170) and band[1] isn't, use band[1] instead.
- `trim` = first band whose colour differs from `base`, else `#111111`.
- `pattern` = solid.

---

## Integration into the card
The player card (`Card2_integration.jsx`, component `PCard`) renders the figure slot as:
```jsx
<div className="figure"><WCJersey nation={card.nation} /></div>
```
`WCJersey` (from `Jersey.jsx`) memoises the SVG string per nation and injects it via
`dangerouslySetInnerHTML` into a `.wc-jersey` wrapper.

### Figure / sizing CSS
The card's `.figure` is `flex:1; display:flex; align-items:flex-end; justify-content:center`
(shirt sits toward the bottom of the figure area). The jersey wrapper:
```css
.wc-jersey { width:110%; height:119%; display:flex; align-items:center; justify-content:center; }
.wc-jersey svg { width:100%; height:100%; display:block; filter:drop-shadow(0 4px 6px rgba(0,0,0,.35)); }
```
The 110%/119% intentionally overscans the figure box so the shirt reads large within the card.
(The original sizes during tuning were 84%/98% → 96%/108% → 110%/119%.)

## State / data
No state. Pure function of `nation` (a string). Memoise per nation for performance — there can be
~300 cards on screen at once and each builds one SVG.

## Assets
- No external image assets. Everything is procedural SVG.
- Optional number font (gallery only): **Anton** (Google Fonts). Not used on the card.

## Files in this bundle
- `Jersey.jsx` — the renderer: `buildJerseySVG(kit)`, `kitForNation(nation)`, `WCJersey` React component, and the full kit table. **Primary reference.**
- `Card2_integration.jsx` — the player-card component showing exactly where/how the jersey is slotted in (`<div className="figure"><WCJersey .../></div>`).
- `jersey_gallery_reference.html` — standalone gallery of all 48 teams (with the optional number), useful as a visual catalogue and for the number treatment.
