# Animation Hand-off — GOAL & SAVE

Spec for redesigning the two match-reveal animations in **mundialito-client**
(React 19 + Vite + Framer Motion). Hand this whole file to the design tool.
When the new versions come back, they plug into the integration contract at the
bottom — `MatchBoard` does not need rewiring if the contract is respected.

---

## 1. What these animations are

During a match's **reveal cinematic**, each side's shot resolves to one of two
full-screen beats, shown over a dimmed pitch:

- **GOAL** — a side scored. Big italic wordmark + scoreline.
- **SAVE** — a side took a shot (meter was full, or a forced tactical fired) but
  the keeper won. "SAVED!" wordmark + flavor line + the shot probability.

Both are mounted inside a click-to-dismiss `<Overlay>` and auto-advance on a timer.

There are **two variants of each**: `you` (the player, gold) vs `them` (the
opponent, red).

---

## 2. Current source — GOAL

**File:** `src/ui/organisms/Goal/index.tsx`

```tsx
import { motion, useReducedMotion } from 'framer-motion'

interface GoalProps {
  isYou: boolean
  scorer?: string
  /** Scoreline after this goal, [you, them]. */
  score?: readonly [number, number]
}

const slam = {
  hidden: { scale: 0.4, opacity: 0 },
  visible: { scale: 1, opacity: 1 },
}
const sub = {
  hidden: { y: 14, opacity: 0 },
  visible: { y: 0, opacity: 1 },
}

/** GOAL blast — big italic gold/red wordmark + score subtitle over a dimmed pitch.
 * pointer-events:none so the surrounding Overlay veil receives click-to-dismiss.
 * Skips animation under prefers-reduced-motion. Styling lives in v9.css (.goal-blast).
 */
export function Goal({ isYou, scorer, score }: GoalProps) {
  const reduce = useReducedMotion()
  const title = isYou ? 'YOU SCORE' : scorer ? `${scorer.toUpperCase()} SCORES` : 'THEY SCORE'
  const line = score ? `${title} · ${score[0]} – ${score[1]}` : title

  return (
    <div className={`goal-blast ${isYou ? 'you' : 'them'}`}>
      <div className="gb-net" />
      <motion.div
        className="gb-text"
        variants={reduce ? undefined : slam}
        initial="hidden"
        animate="visible"
        transition={reduce ? undefined : { type: 'spring', stiffness: 320, damping: 18 }}
      >
        GOAL
      </motion.div>
      <motion.div
        className="gb-sub"
        variants={reduce ? undefined : sub}
        initial="hidden"
        animate="visible"
        transition={reduce ? undefined : { delay: 0.12, duration: 0.3 }}
      >
        {line}
      </motion.div>
    </div>
  )
}
```

---

## 3. Current source — SAVE

**This is a local component inside `MatchBoard`, not its own file.**
**File:** `src/ui/organisms/MatchBoard/index.tsx` (~line 291)

```tsx
/** v11: a missed shot — the meter was full (or a forced tactical fired) but the keeper won. */
function ShotMiss({ p, mine, scorer }: { p: number; mine: boolean; scorer?: string }) {
  const { t } = useLang()
  return (
    <div
      className={`shot-miss${mine ? ' mine' : ''}`}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#dfe7f5' }}
    >
      <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: 1 }}>{t('match.shot.saved')}</div>
      <div style={{ fontSize: 15, opacity: 0.85 }}>
        {mine ? t('match.shot.youMissed') : t('match.shot.theyMissed', { opp: scorer ?? '' })}
      </div>
      <div style={{ fontSize: 13, opacity: 0.6 }}>{t('match.shot.atChance', { pct: Math.round(p * 100) })}</div>
    </div>
  )
}
```

The SAVE styling is mostly inline; the only CSS hooks are `.shot-miss` and
`.shot-miss .saved` (see §4).

---

## 4. Current CSS

**File:** `src/ui/tokens/css/v9.css`

### SAVE (~line 771)

```css
/* v11 missed-shot reveal card */
.shot-miss { text-shadow: 0 2px 10px rgba(0, 0, 0, 0.6); }
.shot-miss .saved { color: #ff7a6a; }
```

### GOAL — ⚠️ defined TWICE; please consolidate into one block

**Block A (~line 810)** — owns the keyframe `animation:` declarations:

```css
/* ---- GOAL blast — the money moment (GDD §16) ---- */
.goal-blast {
  position: fixed; inset: 0; z-index: 60; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 10px; pointer-events: none;
  background: radial-gradient(80% 60% at 50% 50%, rgba(10, 13, 21, 0.75), rgba(10, 13, 21, 0.92));
  animation: gbVeil 220ms ease-out both;
}
.goal-blast .gb-net {
  position: absolute; inset: 0; opacity: 0.14;
  background:
    repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.7) 0 1px, transparent 1px 26px),
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.7) 0 1px, transparent 1px 26px);
  animation: gbRipple 900ms cubic-bezier(0.2, 0.8, 0.3, 1) both;
}
.goal-blast .gb-text {
  font-size: clamp(90px, 14vw, 190px); font-weight: 900; font-style: italic;
  letter-spacing: -0.02em; line-height: 1;
  animation: gbSlam 480ms cubic-bezier(0.16, 1.2, 0.3, 1) both;
  text-shadow: 0 6px 50px rgba(0, 0, 0, 0.8);
}
.goal-blast.you .gb-text { color: #e8c873; }
.goal-blast.them .gb-text { color: #ff6a5c; }
.goal-blast .gb-sub {
  font-size: clamp(15px, 1.6vw, 22px); font-weight: 800; letter-spacing: 0.3em;
  color: rgba(255, 255, 255, 0.85); white-space: nowrap;
  animation: gbSub 420ms 180ms ease-out both;
}
@keyframes gbVeil { from { opacity: 0; } to { opacity: 1; } }
@keyframes gbSlam {
  0% { opacity: 0; transform: scale(2.4) rotate(-3deg); }
  60% { opacity: 1; transform: scale(0.96); }
  100% { transform: scale(1); }
}
@keyframes gbSub { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
@keyframes gbRipple { from { transform: scale(1.16); opacity: 0; } to { transform: scale(1); opacity: 0.14; } }
```

**Block B (~line 2014)** — declared LAST, so it wins for layout. It does NOT
redeclare `animation`, so the keyframes above still apply. This split is the
trap to fix:

```css
/* ============================================================
   v10 — GOAL blast (design wordmark). Authoritative over the
   merged v4xg .goal-blast (this is last in the cascade).
   ============================================================ */
.goal-blast {
  position: absolute; inset: 0; pointer-events: none;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
  background: radial-gradient(60% 50% at 50% 50%, rgba(10, 13, 21, 0.5), rgba(6, 8, 14, 0.88));
}
.goal-blast .gb-net {
  position: absolute; inset: 0; opacity: 0.1;
  background:
    repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.5) 0 1px, transparent 1px 14px),
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.5) 0 1px, transparent 1px 14px);
  -webkit-mask-image: radial-gradient(60% 50% at 50% 50%, #000, transparent 75%);
  mask-image: radial-gradient(60% 50% at 50% 50%, #000, transparent 75%);
}
.goal-blast .gb-text {
  font-size: clamp(90px, 14vw, 190px); font-weight: 900; font-style: italic;
  letter-spacing: -0.04em; line-height: 0.9; position: relative; z-index: 1;
  text-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
}
.goal-blast.you .gb-text { color: #e8c873; }
.goal-blast.them .gb-text { color: #ff6a5c; }
.goal-blast .gb-sub {
  font-size: clamp(13px, 1.4vw, 18px); font-weight: 800; letter-spacing: 0.28em;
  color: rgba(255, 255, 255, 0.9); position: relative; z-index: 1;
  font-variant-numeric: tabular-nums;
}
```

### Reduced-motion (~line 878)

```css
@media (prefers-reduced-motion: reduce) {
  .goal-blast, .goal-blast .gb-text, .goal-blast .gb-sub, .goal-blast .gb-net { animation: none !important; }
  /* ... other rules ... */
}
```

---

## 5. i18n strings (must stay keyed, not hardcoded)

**File:** `src/ui/i18n/locales/match.ts`

| Key | EN | ES |
|-----|----|----|
| `match.shot.saved` | `SAVED!` | `¡ATAJADA!` |
| `match.shot.youMissed` | `Your chance goes begging — the keeper wins it.` | `Tu ocasión se esfuma — el portero la gana.` |
| `match.shot.theyMissed` | `{opp} blow their chance.` | `{opp} desperdician su ocasión.` |
| `match.shot.atChance` | `shot taken at {pct}%` | `remate al {pct}%` |

GOAL wordmark text (`GOAL`, `YOU SCORE`, etc.) is currently hardcoded English in
the component — fine to keep, or key it if you want.

---

## 6. How they're triggered (do not change this wiring)

**File:** `src/ui/organisms/MatchBoard/index.tsx` (~line 1004)

```tsx
{showGoalYou && roundReport && (
  <Overlay open onClick={() => setRevealStep(3)}>
    {youScored
      ? <Goal isYou score={[roundReport.youGoalsTotal, roundReport.themGoalsTotal - (theyScored ? 1 : 0)]} />
      : <ShotMiss p={youShot?.p ?? 0} mine />}
  </Overlay>
)}
{showGoalThem && roundReport && (
  <Overlay open onClick={() => setRevealStep(5)}>
    {theyScored
      ? <Goal isYou={false} scorer={match.opponent.name} score={[roundReport.youGoalsTotal, roundReport.themGoalsTotal]} />
      : <ShotMiss p={theyShot?.p ?? 0} mine={false} scorer={match.opponent.name} />}
  </Overlay>
)}
```

Reveal sequence: `1` your-attack clash → `2` YOUR goal/save beat → `3` their
clash → `4` THEIR goal/save beat → `5` round report. The overlay auto-advances
on a timer **or** on click.

---

## 7. Integration contract — what the new design MUST respect

So the new animations drop in without touching `MatchBoard`:

1. **Two states × two variants.** GOAL and SAVE, each with `you` (gold) and
   `them` (red) variants.
2. **Same props in:**
   - `Goal`: `isYou: boolean`, `scorer?: string`, `score?: readonly [number, number]`
   - `ShotMiss`: `p: number` (0–1 shot probability), `mine: boolean`, `scorer?: string`
3. **Mounts inside a full-screen `<Overlay>`** that owns click-to-dismiss →
   the animation root MUST be `pointer-events: none` so clicks fall through.
4. **Timing budget** (constants in `MatchBoard`): `GOAL_HOLD = 1900ms`,
   `CLASH_MS = 1100ms`. Keep the animation's settle/read under ~1.6s.
5. **Reduced motion:** must no-op under `prefers-reduced-motion` — via Framer's
   `useReducedMotion()` and/or a `@media (prefers-reduced-motion: reduce)` block.
6. **Color tokens:** GOAL gold `#e8c873` (you) / red `#ff6a5c` (them);
   SAVE wordmark `#ff7a6a`. Wordmarks are `font-weight: 900`, italic,
   `clamp(90px, 14vw, 190px)`.
7. **Positioning:** root is `position: absolute; inset: 0` inside the Overlay —
   it covers the pitch, not the whole document.
8. **i18n:** SAVE copy stays keyed (EN/ES); don't hardcode.

### ⚠️ One decision to make up front
The GOAL currently animates on **two layers at once** — Framer Motion variants
(`slam`/`sub`) in the `.tsx` **and** CSS keyframes (`gbSlam`/`gbVeil`/`gbSub`/
`gbRipple`) in v9.css. These can fight over `transform`/`opacity`. Pick **one**
driver — recommendation: Framer for the wordmark/subtitle, CSS only for ambient
bits (net ripple, veil). And **collapse the duplicate `.goal-blast` blocks** into
one.

---

## 8. Ignore — legacy / dead code (do NOT redesign)

- `src/ui/organisms/GoalCelebration/` — exported and tested but never rendered live.
- `goalEvents` queue in `useQuickplayMatch.ts` / `useArcadeRun.ts` — set, never consumed.
- `goalBlast` export in `src/ui/motion/index.ts` — unused by the real `Goal`.

The only live paths are `<Goal>` and `<ShotMiss>` as mounted in §6.
