import { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useReducedMotion } from 'framer-motion'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import type { MatchState, PlayerCard, TacticalCard, Formation, Card, CardInPlay, PlayerState, TacticalEffect } from '../../../engine/types'
import type { Intent } from '../../../engine/board'
import type { LaneFx } from '../../../engine/effectiveStats'
import type { RevealBoards, RoundReport, SideReport } from '../../quickplay/useQuickplayMatch'
import { TACTICALS_PER_HALF, CARD_CAP, laneStamina, tacticalGatePassed, cardLaneMult } from '../../quickplay/useQuickplayMatch'
import { Scoreboard } from '../Scoreboard'
import { ExtraTimeBanner } from '../ExtraTime'
import { Lane } from '../Lanes'
import { PitchMarkings } from '../PitchMarkings'
import { DeckPile } from '../../molecules/DeckPile'
import { XGMeter } from '../../molecules/Meters'
import { FormationPicker } from '../FormationPicker'
import { CapChip } from '../../atoms/CapChip'
import { StaminaPips } from '../../atoms/StaminaPips'
import { CardDetailModal, TACTICAL_DESCRIPTIONS, TACTICAL_DESCRIPTION_KEYS } from '../CardDetailModal'
import { PlayerCard as PlayerCardComponent } from '../../molecules/PlayerCard'
import { TacticCard } from '../../molecules/TacticCard'
import { CAT_GLYPH } from '../../molecules/TacticCard/glyphs'
import { SoundControls } from '../../molecules/SoundControls'
import { crestSrc } from '../../data/nations'
import { XGFloat } from '../Lanes'
import { Modal, Overlay } from '../Modal'
import { Goal } from '../Goal'
import { ShotMiss } from '../ShotMiss'
import { CoachMarks } from '../CoachMarks'
import { MATCH_ONBOARDING_STEPS } from '../CoachMarks/steps'
import { planHint } from '../../onboarding/planHint'
import { matchSound } from '../../sound'
import { useLang } from '../../i18n'
import type { Translate } from '../../i18n'

/** Deterministic confetti pieces for the match-win celebration (no RNG, so it doesn't re-roll each render). */
const WIN_CONFETTI = Array.from({ length: 60 }, (_, i) => ({
  left: (i * 36.7) % 100,
  background: ['#e8c873', '#7f56d9', '#3fbf6f', '#5aa7e8', '#ef8a7c'][i % 5] as string,
  animationDuration: `${2.4 + (i % 6) * 0.4}s`,
  animationDelay: `${(i % 10) * 0.18}s`,
}))

// v12 (8-round match): fixed minute lookup. Halftime after R4 (45'); R5 reads 46' so the 2nd-half
// kickoff sits apart from the 45' halftime whistle; full time after R8 (90').
const MATCH_CLOCK = [0, 15, 30, 45, 46, 60, 75, 90]
const ROUND_TO_MINUTE = (round: number, extraTime: boolean): string => {
  if (extraTime) return `90+${(round - 8) * 15}'`
  return `${MATCH_CLOCK[round - 1] ?? 90}'`
}

const ROUND_TO_PHASE = (round: number, extraTime: boolean, t: Translate): string => {
  if (extraTime) return t('match.phase.extraTime')
  if (round <= 4) return t('match.phase.firstHalf')
  return t('match.phase.secondHalf')
}

function fatigueHeat(fatigue: number): 0 | 1 | 2 | 3 {
  if (fatigue >= 25) return 3
  if (fatigue >= 17) return 2
  if (fatigue >= 8) return 1
  return 0
}

const TIER_MAP: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 }

/** Renders filled/empty star spans for opponent tier (S=5…D=1). */
function TierStars({ tier }: { tier: string }) {
  const count = TIER_MAP[tier] ?? 1
  return (
    <span style={{ letterSpacing: 1, fontSize: 12 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ color: i < count ? '#FFD700' : 'rgba(255,255,255,0.25)' }}>
          {i < count ? '★' : '☆'}
        </span>
      ))}
    </span>
  )
}

/** `label` is a formation code (stays literal); `shapeKey` resolves to a translated shape word. */
const FORMATION_LABELS: Record<Formation, { label: string; shapeKey: string }> = {
  balanced: { label: '4-4-2', shapeKey: 'match.shape.balanced' },
  offensive: { label: '3-4-3', shapeKey: 'match.shape.offensive' },
  defensive: { label: '5-4-1', shapeKey: 'match.shape.defensive' },
}

/** One-line setup summary for a side in the round report (formation, star quality, chemistry, fatigue). */
function sideNote(who: string, s: SideReport, t: Translate): string {
  const fm = FORMATION_LABELS[s.formation]
  const parts: string[] = [
    t('match.note.line', {
      shapeLabel: fm.label,
      shape: t(fm.shapeKey),
      atkMult: s.atkMult,
      defMult: s.defMult,
    }),
  ]
  if (s.rarityBonus > 0) parts.push(t('match.note.starQuality', { n: s.rarityBonus }))
  if (s.synAtk > 0 || s.synDef > 0) parts.push(t('match.note.chemistry', { atk: s.synAtk, def: s.synDef }))
  if (s.fatigue > 0) parts.push(t('match.note.fatigue', { n: s.fatigue, mult: s.fatigueDefMult.toFixed(2) }))
  return t('match.note.row', { who, parts: parts.join(' · ') })
}

// --- Friendly round-report language (numbers move to the collapsible "Show the numbers"). ---

const STANCE_KEY: Record<Formation, string> = {
  offensive: 'match.stance.offensive',
  balanced: 'match.stance.balanced',
  defensive: 'match.stance.defensive',
}

/** Turns a round's xG gain into a plain-language chance-quality i18n key. */
function chanceKey(xg: number): string {
  if (xg >= 0.6) return 'match.chance.golden'
  if (xg >= 0.35) return 'match.chance.big'
  if (xg >= 0.2) return 'match.chance.clear'
  if (xg >= 0.1) return 'match.chance.half'
  return 'match.chance.none'
}

/** Human-readable positional requirement for a tactical's gate, or null if it has none. */
function gateLabel(effect: TacticalEffect, t: Translate): string | null {
  if (effect.requiresCount === undefined) return null
  if (effect.kind === 'highPress') return t('match.tactic.reqFwdMid', { n: effect.requiresCount })
  if (effect.requiresPosition === undefined) return null
  return t('match.tactic.reqPos', { n: effect.requiresCount, pos: effect.requiresPosition })
}

/** A friendly one-line setup read for a side. */
function friendlySide(who: string, s: SideReport, xg: number, t: Translate): string {
  return t('match.side.read', {
    who,
    stance: t(STANCE_KEY[s.formation]),
    chance: t(chanceKey(xg)),
    xg: xg.toFixed(2),
  })
}

/** Headline that says what actually happened this round, in football language. */
function summaryLine(r: RoundReport, oppName: string, t: Translate): string {
  const you = r.youGoalsThisRound > 0
  const them = r.themGoalsThisRound > 0
  if (you && them) return t('match.summary.endToEnd')
  if (you) return t('match.summary.clinical')
  if (them) return t('match.summary.punished', { opp: oppName })
  if (r.youXg > r.themXg * 1.25) return t('match.summary.youBetter')
  if (r.themXg > r.youXg * 1.25) return t('match.summary.theyPressed', { opp: oppName })
  return t('match.summary.cagey')
}

// Hearthstone-style fan geometry: each card tilts away from the centre and the
// ends curve downward, so the resting hand reads as an arc that takes little
// vertical room. Computed per card from its index so the CSS only needs to apply
// the resulting `--rot`/`--ty` (hover straightens + lifts via transform, no reflow).
const FAN_SPREAD_DEG = 3.6
const FAN_CURVE_PX = 2.4
const HAND_CARD_SIZE = 92

function DraggableCard({
  card,
  isCaptain,
  selected,
  onSelect,
  index,
  count,
  affordable = true,
  blockLabel,
}: {
  card: Card
  isCaptain: boolean
  selected: boolean
  onSelect: (id: string) => void
  index: number
  count: number
  /** Player cards that can't fit any lane within the cap/stamina budget are dimmed + not selectable. */
  affordable?: boolean
  /** Why the card is blocked, shown as a badge on the dimmed card (e.g. "PITCH FULL", "NEEDS ⚡"). */
  blockLabel?: string
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: card.id })
  const dragging = transform != null
  const offset = index - (count - 1) / 2

  // Deal-in: a freshly-mounted card (newly drawn) slides out of the draw pile, staggered
  // by its position so the hand fans out as a cascade. Cleared once the animation ends.
  const [dealing, setDealing] = useState(true)
  const dealDelay = Math.min(index, 8) * 45
  useEffect(() => {
    const t = setTimeout(() => setDealing(false), dealDelay + 480)
    return () => clearTimeout(t)
  }, [dealDelay])

  const style = {
    '--rot': `${offset * FAN_SPREAD_DEG}deg`,
    '--ty': `${offset * offset * FAN_CURVE_PX}px`,
    ...(transform
      ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 99 }
      : null),
  } as React.CSSProperties

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      // A dimmed (unaffordable) player card can't be fielded — ignore the click so it can't be
      // armed for placement. Tacticals stay clickable so their detail modal can explain the block.
      if (!affordable && card.type === 'player') return
      onSelect(card.id)
    },
    [card.id, card.type, onSelect, affordable],
  )

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`hcard${selected ? ' selected' : ''}${dragging ? ' dragging' : ''}${dealing ? ' dealing' : ''}${affordable ? '' : ' dim'}`}
      onClick={handleClick}
    >
      <div
        className="hcard-arc"
        data-block={!affordable ? blockLabel : undefined}
        style={dealing ? { animationDelay: `${dealDelay}ms` } : undefined}
      >
        {card.type === 'player' ? (
          <PlayerCardComponent card={card as PlayerCard} size={HAND_CARD_SIZE} isCaptain={isCaptain} />
        ) : (
          <TacticCard
            card={card as TacticalCard}
            size={HAND_CARD_SIZE}
            description={TACTICAL_DESCRIPTIONS[(card as TacticalCard).effect.kind]}
          />
        )}
      </div>
    </div>
  )
}

/**
 * A staged player card on the pitch during planning — draggable so it can be moved to the other
 * lane or back to the hand. A plain click still unstages it (the 8px drag threshold keeps the two
 * gestures distinct).
 */
function BoardCard({
  card,
  isCaptain,
  onRemove,
  laneMult,
}: {
  card: PlayerCard
  isCaptain: boolean
  onRemove: () => void
  /** v11 lane force-multiplier this card is providing (>1) — shows a ×mult badge on top. */
  laneMult?: number
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: card.id })
  const style: React.CSSProperties = {
    cursor: 'grab',
    touchAction: 'none',
    ...(transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 99, opacity: 0.85 } : null),
  }
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} onClick={onRemove}>
      <PlayerCardComponent card={card} size={128} isCaptain={isCaptain} laneMult={laneMult} />
    </div>
  )
}

/** Face-down card placeholder rendered for the opponent's committed cards during planning. */
function FaceDownCard({ size = 96 }: { size?: number }) {
  return (
    <div
      className="wcard face-down-card"
      style={{
        width: size,
        height: Math.round(size * 1.42),
        background: 'linear-gradient(160deg, #1a2a4a 0%, #0d1520 100%)',
        borderRadius: 8,
        border: '1.5px solid rgba(255,255,255,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(255,255,255,0.18)',
        fontSize: 28,
        fontWeight: 800,
      }}
    >
      ?
    </div>
  )
}

export interface MatchBoardCommitOptions {
  formation: Formation
  attackCards: PlayerCard[]
  defenseCards: PlayerCard[]
  tacticals?: TacticalCard[]
}

interface MatchBoardProps {
  match: MatchState
  /** Called when the player is ready to commit their turn. */
  onCommit: (opts: MatchBoardCommitOptions) => void
  /** Called to trigger reveal animation + resolve (after commit). */
  onReveal?: () => void
  /** Called to advance to the next round after the report is dismissed. */
  onNextRound?: () => void
  canCommit?: boolean
  opponentIntent?: Intent | null
  /** Snapshot of both boards captured before resolveRound; present in 'reveal' phase. */
  revealBoards?: RevealBoards | null
  /** Round statistics computed from xg/goals delta; present in 'reveal' phase. */
  roundReport?: RoundReport | null
  /** Current board phase — drives plan vs reveal UI. */
  phase?: 'playing' | 'reveal'
  /**
   * Engine `laneFx` helper, injected by the orchestration tier so the board can show the two v10
   * balance levers without importing engine runtime. Omit to hide the lane-group indicators.
   */
  laneFx?: (cards: PlayerCard[], lane: 'attack' | 'defense') => LaneFx | null
  /** Run the one-time first-match coach-mark tour (shown on round 1 of the planning phase). */
  onboarding?: boolean
  /** Called when the player finishes or skips the coach-mark tour. */
  onOnboardingDone?: () => void
  /** When provided, shows a control that bails out of the match (Surrender run / Quit match). */
  onSurrender?: () => void
  /** Tunes the bail-out copy: 'run' (Arcade — abandon the whole run) or 'match' (Quickplay). */
  surrenderKind?: 'run' | 'match'
  /**
   * Multiplayer mode: the round is resolved by the authoritative server, so committing does NOT
   * immediately reveal — the board waits for the opponent and the parent flips to 'reveal' on the
   * server push. Planning is "a-ciegas": the opponent's lineup/intent is hidden, only their played
   * tacticals + lock status show.
   */
  mpMode?: boolean
  /** MP: you've locked in and are waiting for the opponent to commit. */
  mpWaiting?: boolean
  /** MP: the opponent's a-ciegas planning status (lock + played tacticals). */
  mpOpponentStatus?: { lockedIn: boolean; playedTacticals: TacticalCard[] } | null
  /** MP: epoch-ms planning deadline for the countdown timer (null = no timer). */
  planDeadline?: number | null
}

const SURRENDER_COPY = {
  run: {
    button: 'match.surrender.run.button',
    title: 'match.surrender.run.title',
    body: 'match.surrender.run.body',
    confirm: 'match.surrender.run.confirm',
  },
  match: {
    button: 'match.surrender.match.button',
    title: 'match.surrender.match.title',
    body: 'match.surrender.match.body',
    confirm: 'match.surrender.match.confirm',
  },
} as const

/**
 * Presentational match board — full pitch layout mirroring Board9.jsx.
 * Owns the single dnd-kit DndContext; imports the engine via `import type` only.
 *
 * Two-phase rendering:
 *   - 'playing': plan lanes (yours staged, theirs face-down placeholders), intent banner, commit
 *   - 'reveal': both boards flipped, duel clash animation, round report with Next Round button
 */
export function MatchBoard({
  match,
  onCommit,
  onReveal = () => {},
  onNextRound = () => {},
  canCommit = false,
  opponentIntent,
  revealBoards,
  roundReport,
  phase = 'playing',
  laneFx,
  onboarding = false,
  onOnboardingDone = () => {},
  onSurrender,
  surrenderKind = 'run',
  mpMode = false,
  mpWaiting = false,
  mpOpponentStatus = null,
  planDeadline = null,
}: MatchBoardProps) {
  const { t } = useLang()
  const surrenderCopy = SURRENDER_COPY[surrenderKind]
  const p0 = match.players[0]!
  const p1 = match.players[1]!

  const isReveal = phase === 'reveal'

  const [attackCards, setAttackCards] = useState<PlayerCard[]>([])
  const [defenseCards, setDefenseCards] = useState<PlayerCard[]>([])
  const [tacticalCards, setTacticalCards] = useState<TacticalCard[]>([])
  const [detailTac, setDetailTac] = useState<TacticalCard | null>(null)
  // True when the open tactical modal is an already-active Power opened from the shelf (inspect only).
  const [detailInspectOnly, setDetailInspectOnly] = useState(false)
  const [formation, setFormation] = useState<Formation>(p0.formation)
  const [selectedHandId, setSelectedHandId] = useState<string | null>(null)
  const [showSurrender, setShowSurrender] = useState(false)

  // MP planning countdown — `now` lives in state and is updated only by the interval callback
  // (async setState is allowed; no impure Date.now() during render). Display only; the server
  // enforces the deadline authoritatively via resolve-if-expired.
  const timerActive = mpMode && !isReveal && planDeadline !== null
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!timerActive) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [timerActive])
  const secondsLeft = timerActive
    ? Math.max(0, Math.ceil((planDeadline! - now) / 1000))
    : null

  // v10 budget: per-round card cap (4 → 5 → 6) and stamina budget (8 → 10 → 12). Both are
  // enforced on placement so the player can't overfield, exactly like the AI's validLineup.
  // Staged tacticals also draw on the same stamina pool (their own `cost`), so a played card
  // and a played tactical compete for the round's energy.
  const playerCap = CARD_CAP(match.round)
  // Water Break grants its stamina THIS round: staging it lifts the planning budget immediately so
  // you can field an extra player the round you play it (the engine no longer defers it). §12.
  const waterBreakBonus = tacticalCards
    .filter((tac) => tac.effect.kind === 'waterBreak')
    .reduce((sum, tac) => sum + (tac.effect.amount ?? 2), 0)
  const staminaMax = p0.maxStamina + waterBreakBonus
  const tacticalCost = tacticalCards.reduce((sum, t) => sum + t.cost, 0)
  const staminaLeft = staminaMax - laneStamina(attackCards) - laneStamina(defenseCards) - tacticalCost
  // When the player cap is hit, no further player fits regardless of stamina — the blocker is the
  // full pitch, not energy, so the hand badge must say "PITCH FULL" rather than "NEEDS ⚡".
  const capReached = attackCards.length + defenseCards.length >= playerCap

  // v11 lane force-multiplier: the best star's tier multiplier lifts the whole lane, but only once
  // the lane has ≥2 cards. The ×mult badge rides the top-tier card that's providing it.
  const atkLaneMult = attackCards.length >= 2 ? Math.max(1, ...attackCards.map(cardLaneMult)) : 1
  const defLaneMult = defenseCards.length >= 2 ? Math.max(1, ...defenseCards.map(cardLaneMult)) : 1

  // True when adding `card` to `lane` would break the card cap or the stamina budget.
  // laneStamina re-derives the whole lane (star-core discount included), so this stays exact.
  const wouldExceedBudget = useCallback(
    (lane: 'attack' | 'defense', card: PlayerCard): boolean => {
      if (attackCards.length + defenseCards.length >= playerCap) return true
      const nextAttack = lane === 'attack' ? [...attackCards, card] : attackCards
      const nextDefense = lane === 'defense' ? [...defenseCards, card] : defenseCards
      return laneStamina(nextAttack) + laneStamina(nextDefense) + tacticalCost > staminaMax
    },
    [attackCards, defenseCards, playerCap, staminaMax, tacticalCost],
  )

  // A hand player card is playable only if it fits in at least one lane within the budget.
  const canAfford = useCallback(
    (card: PlayerCard): boolean => !wouldExceedBudget('attack', card) || !wouldExceedBudget('defense', card),
    [wouldExceedBudget],
  )

  // Discard fly-off is sequenced on the Next-round click (see handleNextRoundClick):
  // the cards that were PLAYED on the pitch sweep to the discard pile BEFORE the round
  // advances. The resting hand is untouched — those cards stay for the next round.
  const reduceMotion = useReducedMotion()
  const boardRef = useRef<HTMLDivElement>(null)
  const discardRef = useRef<HTMLDivElement>(null)
  const ghostSeqRef = useRef(0)
  const [discardGhosts, setDiscardGhosts] = useState<
    { id: string; x: number; y: number; dx: number; dy: number; delay: number }[]
  >([])
  const [discardPulse, setDiscardPulse] = useState(false)
  const [sweeping, setSweeping] = useState(false)

  // Reveal cinematic, fully sequenced so each beat finishes before the next starts:
  //   1 your-attack clash → 2 YOUR goal (if scored, gated) → 3 their-attack clash
  //   → 4 THEIR goal (if scored, gated) → 5 round report.
  // Goal steps hold the GOAL blast (auto-advance after GOAL_HOLD, or click-to-dismiss),
  // so the opponent's attack only plays after your goal and the report only after theirs.
  const [revealStep, setRevealStep] = useState(0)
  // v11: a shot beat plays whenever a side TOOK a shot (meter full or a forced tactical) — it
  // resolves to GOAL or SAVED. Build the beat on shot.took, not just on whether a goal landed.
  const youShot = roundReport?.you.shot
  const theyShot = roundReport?.them.shot
  const youTookShot = youShot?.took ?? false
  const theyTookShot = theyShot?.took ?? false
  const youScored = youShot?.scored ?? false
  const theyScored = theyShot?.scored ?? false
  const duel: 'A' | 'B' | null = revealStep === 1 ? 'A' : revealStep === 3 ? 'B' : null
  const showYouXg = revealStep >= 1
  const showThemXg = revealStep >= 3
  const showGoalYou = revealStep === 2
  const showGoalThem = revealStep === 4
  const showReport = revealStep >= 5
  const CLASH_MS = 1100
  const GOAL_HOLD = 1900

  // During the reveal, animate each meter from its pre-round value, ONE SIDE AT A TIME, so you
  // never see the opponent's outcome before their goal/save beat plays. Your bar fills at step 1
  // and resolves (goal empties / save drops) at step 2; theirs fills at step 3, resolves at step 4.
  // Outside the reveal it just shows the live pressure. v11 §14.
  const meterValue = (side: 'you' | 'them'): number => {
    const live = Math.min(1, (side === 'you' ? p0 : p1).xg)
    if (!isReveal || !roundReport) return live
    const r = side === 'you' ? roundReport.you : roundReport.them
    const postFill = Math.min(1, r.pressureBefore + r.xg)
    if (side === 'you') {
      if (revealStep < 1) return r.pressureBefore
      if (revealStep === 1) return postFill
      return r.pressureAfter
    }
    if (revealStep < 3) return r.pressureBefore
    if (revealStep === 3) return postFill
    return r.pressureAfter
  }

  // Same sequencing for the SCORE numbers (scoreboard + meters): your goal ticks up at step 2,
  // theirs at step 4 — so the scoreline never reveals the opponent's goal before its beat.
  const goalsValue = (side: 'you' | 'them'): number => {
    const live = (side === 'you' ? p0 : p1).goals
    if (!isReveal || !roundReport) return live
    if (side === 'you') {
      return revealStep < 2 ? roundReport.youGoalsTotal - roundReport.youGoalsThisRound : roundReport.youGoalsTotal
    }
    return revealStep < 4 ? roundReport.themGoalsTotal - roundReport.themGoalsThisRound : roundReport.themGoalsTotal
  }

  // Each step schedules the next; cleanup clears the pending timer. Goal steps (2,4) can be
  // advanced early by clicking the overlay (setRevealStep below).
  useEffect(() => {
    if (!isReveal) return
    let t: ReturnType<typeof setTimeout> | undefined
    if (revealStep === 0) t = setTimeout(() => setRevealStep(1), 40)
    else if (revealStep === 1) t = setTimeout(() => setRevealStep(youTookShot ? 2 : 3), CLASH_MS)
    else if (revealStep === 2) t = setTimeout(() => setRevealStep(3), GOAL_HOLD)
    else if (revealStep === 3) t = setTimeout(() => setRevealStep(theyTookShot ? 4 : 5), CLASH_MS)
    else if (revealStep === 4) t = setTimeout(() => setRevealStep(5), GOAL_HOLD)
    return () => { if (t) clearTimeout(t) }
  }, [isReveal, revealStep, youTookShot, theyTookShot])

  // Reset to plan when leaving reveal, so the next round starts the cinematic clean.
  // Deferred via a timer so the reset is not a synchronous setState in the effect body.
  useEffect(() => {
    if (isReveal) return
    const t = setTimeout(() => setRevealStep(0), 0)
    return () => clearTimeout(t)
  }, [isReveal])

  // Looping crowd ambience for the whole time the board is mounted (one match), stopped on exit.
  useEffect(() => {
    matchSound.startCrowd()
    return () => matchSound.stopCrowd()
  }, [])

  // Shot cue: as each beat lands (your shot at step 2, theirs at step 4), ring the goal roar on a
  // score or the kick→groan miss cue on a shot that didn't go in.
  useEffect(() => {
    if (!showGoalYou) return
    if (youScored) matchSound.playGoal()
    else if (youTookShot) matchSound.playMiss()
  }, [showGoalYou, youScored, youTookShot])
  useEffect(() => {
    if (!showGoalThem) return
    if (theyScored) matchSound.playGoal()
    else if (theyTookShot) matchSound.playMiss()
  }, [showGoalThem, theyScored, theyTookShot])

  // Draw cue: ring once per card that genuinely ENTERS the hand (the round deal), staggered into
  // a riffle. Tied to the engine hand — not to FanCard mount — so playing / staging / unstaging a
  // card (none of which add to the hand) never triggers it. Discards are cued in the sweep below.
  const prevHandIdsRef = useRef<Set<string>>(new Set())
  const handSig = p0.hand.map((c) => c.id).join(',')
  useEffect(() => {
    const prev = prevHandIdsRef.current
    let added = 0
    for (const c of p0.hand) if (!prev.has(c.id)) added += 1
    prevHandIdsRef.current = new Set(p0.hand.map((c) => c.id))
    if (added <= 0) return
    // Space the riffle out so successive draws don't slur together (≈190ms between cards). The
    // separation from the discard riffle comes from delaying the redraw itself (see the sweep).
    const DRAW_CUE_GAP_MS = 190
    const timers: ReturnType<typeof setTimeout>[] = []
    for (let i = 0; i < Math.min(added, 8); i += 1) {
      timers.push(setTimeout(() => matchSound.playCard(), i * DRAW_CUE_GAP_MS))
    }
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handSig])

  // Require an 8px drag before dnd activates, so a plain click selects a card (click-to-place)
  // instead of being swallowed as a micro-drag.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  // The hand fan is a drop target so a staged card can be dragged back off the pitch.
  const { setNodeRef: setHandDropRef, isOver: handDropOver } = useDroppable({ id: 'hand' })

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    const cardId = active.id as string

    // A card already staged on the pitch — move it between lanes, or drop it on the hand to unstage.
    const inAttack = attackCards.some((c) => c.id === cardId)
    const inDefense = defenseCards.some((c) => c.id === cardId)
    if (inAttack || inDefense) {
      if (!over) return
      const card = (attackCards.find((c) => c.id === cardId) ?? defenseCards.find((c) => c.id === cardId))!
      if (over.id === 'hand') {
        if (inAttack) setAttackCards((p) => p.filter((c) => c.id !== cardId))
        else setDefenseCards((p) => p.filter((c) => c.id !== cardId))
      } else if (over.id === 'attack-lane' && inDefense) {
        const nextDefense = defenseCards.filter((c) => c.id !== cardId)
        const nextAttack = [...attackCards, card]
        if (laneStamina(nextAttack) + laneStamina(nextDefense) + tacticalCost > staminaMax) return
        setDefenseCards(nextDefense)
        setAttackCards(nextAttack)
      } else if (over.id === 'defense-lane' && inAttack) {
        const nextAttack = attackCards.filter((c) => c.id !== cardId)
        const nextDefense = [...defenseCards, card]
        if (laneStamina(nextAttack) + laneStamina(nextDefense) + tacticalCost > staminaMax) return
        setAttackCards(nextAttack)
        setDefenseCards(nextDefense)
      }
      return
    }

    // A card dragged from the hand fan.
    const card = p0.hand.find((c) => c.id === cardId)
    if (!card) return
    // Dragging a tactical does the same as clicking it — open its detail modal.
    if (card.type === 'tactical') {
      setDetailTac(card as TacticalCard)
      return
    }
    if (!over || card.type !== 'player') return
    const playerCard = card as PlayerCard
    if (over.id === 'attack-lane') {
      if (wouldExceedBudget('attack', playerCard)) return
      setAttackCards((prev) => [...prev, playerCard])
    } else if (over.id === 'defense-lane') {
      if (wouldExceedBudget('defense', playerCard)) return
      setDefenseCards((prev) => [...prev, playerCard])
    }
  }, [p0.hand, attackCards, defenseCards, wouldExceedBudget, tacticalCost, staminaMax])

  const handleSelectHandCard = useCallback((id: string) => {
    // Tacticals open their detail modal (read effect → play); players toggle for placement.
    const card = p0.hand.find((c) => c.id === id)
    if (card?.type === 'tactical') {
      setDetailTac(card as TacticalCard)
      return
    }
    setSelectedHandId((prev) => (prev === id ? null : id))
  }, [p0.hand])

  const handleAttackZoneClick = useCallback(() => {
    if (!selectedHandId) return
    const card = p0.hand.find((c) => c.id === selectedHandId)
    if (!card || card.type !== 'player') return
    const alreadyPlaced =
      attackCards.some((c) => c.id === selectedHandId) ||
      defenseCards.some((c) => c.id === selectedHandId)
    if (alreadyPlaced) return
    if (wouldExceedBudget('attack', card as PlayerCard)) return
    setAttackCards((prev) => [...prev, card as PlayerCard])
    setSelectedHandId(null)
  }, [selectedHandId, p0.hand, attackCards, defenseCards, wouldExceedBudget])

  const handleDefenseZoneClick = useCallback(() => {
    if (!selectedHandId) return
    const card = p0.hand.find((c) => c.id === selectedHandId)
    if (!card || card.type !== 'player') return
    const alreadyPlaced =
      attackCards.some((c) => c.id === selectedHandId) ||
      defenseCards.some((c) => c.id === selectedHandId)
    if (alreadyPlaced) return
    if (wouldExceedBudget('defense', card as PlayerCard)) return
    setDefenseCards((prev) => [...prev, card as PlayerCard])
    setSelectedHandId(null)
  }, [selectedHandId, p0.hand, attackCards, defenseCards, wouldExceedBudget])

  const handleRemoveFromAttack = useCallback((card: PlayerCard) => {
    setAttackCards((prev) => prev.filter((c) => c.id !== card.id))
  }, [])

  const handleRemoveFromDefense = useCallback((card: PlayerCard) => {
    setDefenseCards((prev) => prev.filter((c) => c.id !== card.id))
  }, [])

  const handleCommit = useCallback(() => {
    onCommit({ formation, attackCards, defenseCards, tacticals: tacticalCards })
    if (mpMode) {
      // MP: the server resolves once BOTH players commit. Keep the committed cards on the pitch
      // (locked) while waiting for the opponent — they're cleared when the reveal arrives (below).
      setSelectedHandId(null)
      return
    }
    // Single-player reveals immediately (the AI already committed); clear the local staging — the
    // reveal renders the snapshot, and the next round draws fresh.
    onReveal()
    setAttackCards([])
    setDefenseCards([])
    setTacticalCards([])
    setSelectedHandId(null)
  }, [onCommit, onReveal, mpMode, formation, attackCards, defenseCards, tacticalCards])

  // Next round: sweep the cards that were PLAYED on the pitch to the discard pile — your
  // own lane cards (l-yatk/l-ydef) fly to your discard pile; their cards fade off the pitch
  // (the opponent has no on-screen pile). The resting hand is left alone — unplayed cards
  // stay for next round, which is exactly what the engine does. Then advance + deal in.
  const handleNextRoundClick = useCallback(() => {
    // MP: cards were kept staged through the "waiting" window; clear them now that we're advancing
    // past the reveal so the next planning round starts from a fresh hand.
    if (mpMode) {
      setAttackCards([])
      setDefenseCards([])
      setTacticalCards([])
    }
    const boardEl = boardRef.current
    const discRect = discardRef.current?.getBoundingClientRect()
    const myCardEls = boardEl
      ? (Array.from(
          boardEl.querySelectorAll(
            '.l-yatk .wcard, .l-yatk .tcard, .l-ydef .wcard, .l-ydef .tcard',
          ),
        ) as HTMLElement[])
      : []
    if (reduceMotion || !discRect || myCardEls.length === 0) {
      onNextRound()
      return
    }
    const endX = discRect.left + discRect.width / 2 - 36
    const endY = discRect.top + discRect.height / 2 - 51
    const seq = ghostSeqRef.current++
    const ghosts = myCardEls.slice(0, 8).map((el, i) => {
      const r = el.getBoundingClientRect()
      const x = r.left + r.width / 2 - 36
      const y = r.top + r.height / 2 - 51
      return { id: `nr${seq}-${i}`, x, y, dx: endX - x, dy: endY - y, delay: i * 45 }
    })
    const maxDelay = (ghosts.length - 1) * 45
    // Dismiss cue per swept card — spaced wider than the visual fly-off so the riffle reads as
    // distinct cards rather than one slur.
    const DISCARD_CUE_GAP_MS = 170
    const n = ghosts.length
    for (let i = 0; i < n; i += 1) {
      setTimeout(() => matchSound.playCard(), i * DISCARD_CUE_GAP_MS)
    }
    // Hold an extra second before dealing the new hand, so the redraw (cards + their draw cues)
    // lands well clear of the discard riffle instead of slurring into it.
    const REDRAW_HOLD_MS = 1000
    setDiscardGhosts(ghosts)
    setSweeping(true)
    setDiscardPulse(true)
    setTimeout(() => {
      onNextRound()
      setSweeping(false)
      setDiscardGhosts([])
      setDiscardPulse(false)
    }, 460 + maxDelay + REDRAW_HOLD_MS)
  }, [reduceMotion, onNextRound, mpMode])

  // Tactical staging — a selected tactical plays on commit (mirrors attack/defense staging).
  const canStageMoreTacticals = p0.tacticalsThisHalf + tacticalCards.length < TACTICALS_PER_HALF
  const detailStaged = detailTac ? tacticalCards.some((c) => c.id === detailTac.id) : false

  // Whether the staged lineup satisfies a tactical's positional gate (e.g. Long Ball needs ≥1 FWD).
  // Checked against the locally-staged lanes — the engine board is empty until commit.
  const stagedGateMet = useCallback(
    (effect: TacticalEffect): boolean => {
      const attack: CardInPlay[] = attackCards.map((c) => ({ card: c, lane: 'attack', statuses: [], faceDown: true }))
      const defense: CardInPlay[] = defenseCards.map((c) => ({ card: c, lane: 'defense', statuses: [], faceDown: true }))
      // tacticalGatePassed only reads `state.board`, so a board-only stand-in is sufficient.
      return tacticalGatePassed({ board: { attack, defense } } as unknown as PlayerState, effect)
    },
    [attackCards, defenseCards],
  )

  const detailGateMet = detailTac ? stagedGateMet(detailTac.effect) : true
  const detailReqLabel = detailTac ? gateLabel(detailTac.effect, t) : null
  // Affordable only if its stamina cost fits the remaining budget (a staged card already spent its cost).
  const detailAffordable = detailTac ? detailStaged || staminaLeft >= detailTac.cost : true
  // Play is offered only when under the per-half cap, the gate is met, AND its cost is affordable —
  // never for an already-active Power opened from the shelf. Unstaging a staged tactical is always allowed.
  const detailShowPrimary =
    detailTac !== null &&
    !detailInspectOnly &&
    (detailStaged || (canStageMoreTacticals && detailGateMet && detailAffordable))
  // Explain the modal's state: an active Power, or why a tactical can't be played right now.
  let detailNote: string | undefined
  if (detailInspectOnly) {
    // A persistent Power vs a one-shot Skill/Instant played this round (e.g. the opponent's card).
    detailNote = detailTac?.category === 'power' ? t('match.tactic.activePower') : t('match.tactic.played')
  } else if (detailTac && !detailStaged) {
    if (!canStageMoreTacticals) detailNote = t('match.tactic.noPlaysLeft', { n: TACTICALS_PER_HALF })
    else if (!detailGateMet && detailReqLabel) detailNote = t('match.tactic.needs', { req: detailReqLabel })
    else if (!detailAffordable) detailNote = t('match.tactic.needsEnergy', { n: detailTac.cost })
  }

  const handleStageTactical = useCallback((tac: TacticalCard) => {
    setTacticalCards((prev) => (prev.some((c) => c.id === tac.id) ? prev : [...prev, tac]))
  }, [])
  const handleUnstageTactical = useCallback((tac: TacticalCard) => {
    setTacticalCards((prev) => prev.filter((c) => c.id !== tac.id))
  }, [])
  const handleTacticalPrimary = useCallback(() => {
    if (!detailTac) return
    if (detailStaged) handleUnstageTactical(detailTac)
    else handleStageTactical(detailTac)
    setDetailTac(null)
  }, [detailTac, detailStaged, handleStageTactical, handleUnstageTactical])

  const hasPremiumInAttack = attackCards.some((c) => c.rarity !== 'common')
  const hasPremiumInDefense = defenseCards.some((c) => c.rarity !== 'common')
  const showStarCore = hasPremiumInAttack || hasPremiumInDefense

  const minute = ROUND_TO_MINUTE(match.round, match.extraTime)
  const phaseLabel = ROUND_TO_PHASE(match.round, match.extraTime, t)

  const mercyDiff = Math.abs(p0.goals - p1.goals)
  const mercyLabel = mercyDiff > 0 ? t('match.mercy', { n: 3 - mercyDiff }) : undefined
  const mercyHot = mercyDiff >= 2

  // Staged cards live in the lane state until commit (the engine only splices the
  // hand on commit), so exclude them from the hand fan — otherwise a placed card
  // shows in both the lane and the hand. Tacticals share the fan (same card UI) and
  // leave it once selected, surfacing in the "in use" zone on the left instead.
  const stagedPlayerIds = new Set<string>([...attackCards, ...defenseCards].map((c) => c.id))
  const stagedTacticalIds = new Set<string>(tacticalCards.map((c) => c.id))
  const fanCards = p0.hand.filter((c) =>
    c.type === 'player' ? !stagedPlayerIds.has(c.id) : !stagedTacticalIds.has(c.id),
  )
  const unstagedPlayerCount = fanCards.filter((c) => c.type === 'player').length

  const attackFx = laneFx ? laneFx(attackCards, 'attack') : null
  const defenseFx = laneFx ? laneFx(defenseCards, 'defense') : null

  const committed = attackCards.length + defenseCards.length

  // Just-in-time planning coach — nudges a thin attack at the moment of the mistake
  // (a lone star ≈ two defenders). Self-clears when the lineup improves; never blocks.
  const coachHint = isReveal
    ? null
    : planHint({
        attackCount: attackCards.length,
        formation,
        opponentDefenseCount: opponentIntent?.defenseCount ?? 0,
        notLeading: p0.goals <= p1.goals,
        canAddPlayer: unstagedPlayerCount > 0,
      })

  const oppCrest = crestSrc(match.opponent.nation)

  // Opponent tacticals the player can see: persistent powers (p1.powers, e.g. Total Football) +
  // this round's face-up plays (intent.visibleTacticals), deduped by id. A power shows here every
  // round so the player doesn't have to remember it was played.
  const oppActiveTacticals = ((): TacticalCard[] => {
    const seen = new Set<string>()
    const out: TacticalCard[] = []
    for (const tac of [...p1.powers, ...(opponentIntent?.visibleTacticals ?? [])]) {
      if (seen.has(tac.id)) continue
      seen.add(tac.id)
      out.push(tac)
    }
    return out
  })()

  const intentMeta = opponentIntent ? FORMATION_LABELS[opponentIntent.formation] : null

  const renderRevealLane = (cips: CardInPlay[], kind: 'atk' | 'def', id: string, clsName: string, label: string) => (
    <Lane
      id={id}
      kind={kind}
      label={label}
      lw={128}
      count={cips.length}
      cls={clsName}
    >
      {cips.map((cip) =>
        cip.card.type === 'player' ? (
          <PlayerCardComponent
            key={cip.card.id}
            card={cip.card as PlayerCard}
            size={128}
            isCaptain={cip.card.id === p0.captainId}
          />
        ) : (
          <div
            key={cip.card.id}
            style={{ cursor: 'pointer' }}
            onClick={() => { setDetailTac(cip.card as TacticalCard); setDetailInspectOnly(true) }}
            title={t('match.tactic.tapToInspect')}
          >
            <TacticCard card={cip.card as TacticalCard} size={128} />
          </div>
        ),
      )}
    </Lane>
  )

  const renderFaceDownLane = (count: number, kind: 'atk' | 'def', id: string, clsName: string, label: string) => (
    <Lane
      id={id}
      kind={kind}
      label={label}
      lw={128}
      count={count}
      cls={clsName}
    >
      {Array.from({ length: count }, (_, i) => (
        <FaceDownCard key={i} size={128} />
      ))}
    </Lane>
  )

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div ref={boardRef} className={`screen board v4board${match.extraTime ? ' et-mode' : ''}${sweeping ? ' sweeping' : ''}`}>
        <div className="stadium-bg" />

        {/* top bar: LEFT identity | CENTER scoreboard | RIGHT meters+chips */}
        <div className="side-strip top" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12 }}>
          <div className="opp-id" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
            {oppCrest ? (
              <img src={oppCrest} alt={match.opponent.nation} style={{ width: 36, height: 36, objectFit: 'contain' }} />
            ) : null}
            <span className="nm">{match.opponent.name}</span>
            <TierStars tier={match.opponent.tier} />
            {!isReveal && opponentIntent && intentMeta && (
              <div className="opp-intent">
                <b>{intentMeta.label} {t(intentMeta.shapeKey)}</b> · <b>{opponentIntent.cardCount}</b> {opponentIntent.cardCount === 1 ? t('match.intent.cardOne') : t('match.intent.cardMany')} · <b>{opponentIntent.staminaSpent}</b> {t('match.intent.stamina')}
              </div>
            )}
            {!isReveal && mpMode && (
              <div className="opp-intent mp-opp-status">
                <b>
                  {mpOpponentStatus?.lockedIn
                    ? t('mp.match.oppLockedIn')
                    : t('mp.match.oppPlanning')}
                </b>
                {(mpOpponentStatus?.playedTacticals.length ?? 0) > 0 && (
                  <span> · {mpOpponentStatus!.playedTacticals.map((tac) => tac.name).join(', ')}</span>
                )}
              </div>
            )}
            {oppActiveTacticals.length > 0 && (
              <div className="opp-tactics" aria-label={t('match.oppTactics.label')}>
                {oppActiveTacticals.map((tac) => (
                  <span key={tac.id} className="opp-tac" tabIndex={0} data-cat={tac.category}>
                    <span className="opp-tac-ico">{CAT_GLYPH[tac.category]}</span>
                    <span className="opp-tac-tip" role="tooltip">
                      <b>{tac.name}</b>
                      {TACTICAL_DESCRIPTION_KEYS[tac.effect.kind] ? t(TACTICAL_DESCRIPTION_KEYS[tac.effect.kind]) : ''}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Scoreboard
              them={goalsValue('them')}
              you={goalsValue('you')}
              code={match.opponent.nation}
              nation={match.opponent.nation}
              minute={minute}
              phase={phaseLabel}
              mercy={mercyLabel}
              mercyHot={mercyHot}
              et={match.extraTime}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <SoundControls />
            <div className="board-meters">
              <XGMeter
                goals={goalsValue('them')}
                xg={meterValue('them')}
                heat={fatigueHeat(p1.fatigue)}
                label={match.opponent.name}
              />
              <XGMeter
                goals={goalsValue('you')}
                xg={meterValue('you')}
                heat={fatigueHeat(p0.fatigue)}
                label={t('match.meter.you')}
                mine
              />
            </div>
          </div>
        </div>

        {/* ET banner */}
        {match.extraTime && <ExtraTimeBanner />}

        {/* pitch */}
        <div className="pitch-wrap4">
          <div
            className="pitch4"
            data-duel={duel ?? undefined}
          >
            <PitchMarkings />

            <div className="dirhint4 l">
              <span className="who4">{t('match.dir.youAttack')}</span>
            </div>
            <div className="dirhint4 r">
              <span className="who4">{t('match.dir.theyAttack')}</span>
            </div>

            <div className="p4-grid">
              {isReveal && revealBoards ? (
                <>
                  {renderRevealLane(revealBoards.you.defense, 'def', 'defense-lane', 'l-ydef', t('match.lane.yourDefense'))}
                  {renderRevealLane(revealBoards.you.attack, 'atk', 'attack-lane', 'l-yatk', t('match.lane.yourAttack'))}
                  <div className="p4-mid" />
                  {renderRevealLane(revealBoards.them.attack, 'atk', 'them-attack-lane', 'l-tatk', t('match.lane.theirAttack'))}
                  {renderRevealLane(revealBoards.them.defense, 'def', 'them-defense-lane', 'l-tdef', t('match.lane.theirDefense'))}
                </>
              ) : (
                <>
                  <Lane
                    id="defense-lane"
                    kind="def"
                    label={t('match.lane.yourDefense')}
                    lw={128}
                    fx={defenseFx}
                    count={defenseCards.length}
                    onZoneClick={handleDefenseZoneClick}
                    cls="l-ydef"
                  >
                    {defenseCards.map((card) => (
                      <BoardCard
                        key={card.id}
                        card={card}
                        isCaptain={card.id === p0.captainId}
                        onRemove={() => handleRemoveFromDefense(card)}
                        laneMult={defLaneMult > 1 && cardLaneMult(card) === defLaneMult ? defLaneMult : undefined}
                      />
                    ))}
                  </Lane>

                  <Lane
                    id="attack-lane"
                    kind="atk"
                    label={t('match.lane.yourAttack')}
                    lw={128}
                    fx={attackFx}
                    count={attackCards.length}
                    onZoneClick={handleAttackZoneClick}
                    cls="l-yatk"
                  >
                    {attackCards.map((card) => (
                      <BoardCard
                        key={card.id}
                        card={card}
                        isCaptain={card.id === p0.captainId}
                        onRemove={() => handleRemoveFromAttack(card)}
                        laneMult={atkLaneMult > 1 && cardLaneMult(card) === atkLaneMult ? atkLaneMult : undefined}
                      />
                    ))}
                  </Lane>

                  <div className="p4-mid" />

                  {renderFaceDownLane(
                    opponentIntent?.attackCount ?? 0,
                    'atk',
                    'them-attack-lane',
                    'l-tatk',
                    t('match.lane.theirAttack'),
                  )}
                  {renderFaceDownLane(
                    opponentIntent?.defenseCount ?? 0,
                    'def',
                    'them-defense-lane',
                    'l-tdef',
                    t('match.lane.theirDefense'),
                  )}
                </>
              )}
            </div>

            {/* xG floats during duel animation */}
            {showYouXg && roundReport && roundReport.youXg > 0 && (
              <div style={{ position: 'absolute', right: '6%', top: '30%', zIndex: 10 }}>
                <XGFloat amount={roundReport.youXg} label={t('match.xg.yourAttack')} />
              </div>
            )}
            {showThemXg && roundReport && roundReport.themXg > 0 && (
              <div style={{ position: 'absolute', left: '6%', top: '30%', zIndex: 10 }}>
                <XGFloat amount={roundReport.themXg} label={t('match.xg.theirAttack')} />
              </div>
            )}
          </div>
        </div>

        {/* SHOT beat — plays after each side's clash when a shot was taken. A converted shot is the
            GOAL blast; a missed one is a SAVED card (the v11 drama: a full meter is not a sure goal).
            Click (or auto-advance) continues the cinematic to the next beat. */}
        {showGoalYou && roundReport && (
          <Overlay open onClick={() => setRevealStep(3)}>
            {youScored
              ? <Goal isYou score={[roundReport.youGoalsTotal, roundReport.themGoalsTotal - (theyScored ? 1 : 0)]} />
              : <ShotMiss mine p={youShot?.p ?? 0} score={[roundReport.youGoalsTotal, roundReport.themGoalsTotal - (theyScored ? 1 : 0)]} />}
          </Overlay>
        )}
        {showGoalThem && roundReport && (
          <Overlay open onClick={() => setRevealStep(5)}>
            {theyScored
              ? <Goal isYou={false} scorer={match.opponent.name} score={[roundReport.youGoalsTotal, roundReport.themGoalsTotal]} />
              : <ShotMiss mine={false} p={theyShot?.p ?? 0} score={[roundReport.youGoalsTotal, roundReport.themGoalsTotal]} />}
          </Overlay>
        )}

        {/* action dock — cap chips + formation + lock-in button (tacticals live in the hand dock) */}
        <div className="match-dock">

          <CapChip kind="players" current={attackCards.length + defenseCards.length} max={playerCap} />
          <CapChip kind="tactics" current={p0.tacticalsThisHalf + tacticalCards.length} max={TACTICALS_PER_HALF} />
          {!isReveal && (
            <StaminaPips
              remaining={staminaLeft}
              max={staminaMax}
              label={t('match.dock.staminaLeft', { left: staminaLeft, max: staminaMax })}
              tip={t('match.dock.staminaTip')}
            />
          )}
          {showStarCore && <CapChip kind="star" />}

          {p0.powers.length > 0 && (
            <div className="shelf board-powers">
              <span className="label">{t('match.dock.powers')}</span>
              {p0.powers.map((pw) => (
                <button
                  key={pw.id}
                  type="button"
                  className="tchip"
                  data-cat="power"
                  onClick={() => {
                    setDetailTac(pw)
                    setDetailInspectOnly(true)
                  }}
                >
                  {pw.name}
                </button>
              ))}
            </div>
          )}

          <FormationPicker selected={formation} onSelect={setFormation} />

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
            {coachHint && (
              <span
                className="plan-hint"
                role="status"
                tabIndex={0}
                aria-label={t(coachHint.key, coachHint.vars)}
              >
                💡
                <span className="plan-hint-tip">{t(coachHint.key, coachHint.vars)}</span>
              </span>
            )}
            {!isReveal && mpMode && secondsLeft !== null && (
              <span className="mp-plan-timer" role="timer" aria-label={t('mp.match.timeLeft')}>
                ⏱ {secondsLeft}s
              </span>
            )}
            {!isReveal && mpMode && mpWaiting && (
              <span className="mp-waiting" role="status">{t('mp.match.waiting')}</span>
            )}
            {!isReveal && canCommit && (
              <button className="btn btn-gold" data-coach="commit" onClick={handleCommit}>
                {mpMode
                  ? committed > 0 ? t('mp.match.lockIn') : t('mp.match.passRound')
                  : committed > 0 ? t('match.commit.lockReveal') : t('match.commit.passRound')}
              </button>
            )}
          </div>

          {onSurrender && (
            <button
              type="button"
              className="surrender-btn match-dock-surrender"
              onClick={() => setShowSurrender(true)}
            >
              {t(surrenderCopy.button)}
            </button>
          )}
        </div>

        {/* round report panel — shown after duel animation completes */}
        {isReveal && showReport && roundReport && (
          <div className="readout">
            {roundReport.decided &&
              match.winner === 0 &&
              createPortal(
                <div className="confetti-layer" aria-hidden="true">
                  {WIN_CONFETTI.map((c, i) => (
                    <div
                      key={i}
                      className="confetti"
                      style={{
                        left: `${c.left}%`,
                        background: c.background,
                        animationDuration: c.animationDuration,
                        animationDelay: c.animationDelay,
                      }}
                    />
                  ))}
                </div>,
                document.body,
              )}
            {roundReport.decided && (
              <div className={`result-banner ${match.winner === 0 ? 'win' : 'loss'}`}>
                {match.winner === 0 ? t('run.victory') : t('run.defeat')}
              </div>
            )}
            <h4>
              {t('match.report.heading', {
                phase: roundReport.extraTime
                  ? t('match.report.extraTime', { n: (roundReport.round - 10) * 9 })
                  : t('match.report.round', { n: roundReport.round }),
              })}
            </h4>
            <div className="lines">
              <div className="line l-summary">{summaryLine(roundReport, match.opponent.name, t)}</div>
              <div className="line l-side">
                {friendlySide(t('match.report.who.you'), roundReport.you, roundReport.youXg, t)}
              </div>
              <div className="line l-side to-them">
                {friendlySide(match.opponent.name, roundReport.them, roundReport.themXg, t)}
              </div>

              {roundReport.youGoalsThisRound > 0 && (
                <div className="line l-goal">
                  {t('match.report.goalYou', { you: roundReport.youGoalsTotal, them: roundReport.themGoalsTotal })}
                </div>
              )}
              {roundReport.themGoalsThisRound > 0 && (
                <div className="line l-goal">
                  {t('match.report.goalThem', {
                    opp: match.opponent.name,
                    you: roundReport.youGoalsTotal,
                    them: roundReport.themGoalsTotal,
                  })}
                </div>
              )}
              {roundReport.you.scored && (
                <div className="line l-onform">{t('match.report.onFormYou')}</div>
              )}
              {roundReport.them.scored && (
                <div className="line l-onform">{t('match.report.onFormThem', { opp: match.opponent.name })}</div>
              )}
              {roundReport.halftime && (
                <div className="line l-halftime">{t('match.report.halftime')}</div>
              )}

              <details className="readout-details">
                <summary>{t('match.report.showNumbers')}</summary>
                <div className="line l-note">{sideNote(t('match.report.who.you'), roundReport.you, t)}</div>
                <div className="line l-note">{sideNote(t('match.report.who.they'), roundReport.them, t)}</div>
                <div className="line l-xg">
                  {t('match.report.xgYou', {
                    xg: roundReport.youXg.toFixed(2),
                    atk: roundReport.you.atkEff,
                    def: roundReport.them.defEff,
                  })}
                </div>
                <div className="line l-xg to-them">
                  {t('match.report.xgThem', {
                    xg: roundReport.themXg.toFixed(2),
                    atk: roundReport.them.atkEff,
                    def: roundReport.you.defEff,
                  })}
                </div>
              </details>
            </div>
            <button className="btn btn-gold" style={{ width: '100%' }} onClick={handleNextRoundClick}>
              {roundReport.decided
                ? t('match.report.next.result')
                : roundReport.extraTime
                  ? t('match.report.next.et')
                  : t('match.report.next.round')}
            </button>
          </div>
        )}

        {/* hand dock — fan of player + tactical cards; also a drop target to drag staged cards back off the pitch */}
        <div className={`hand-dock${handDropOver ? ' drop-hot' : ''}`} ref={setHandDropRef}>
          <div className="pile-col7 left">
            <DeckPile kind="draw" count={p0.drawPile.length} label={t('match.pile.draw')} dw={34} />
            <DeckPile kind="locked" count={p0.locked.length} label={t('match.pile.bench')} cue={t('match.pile.benchCue')} dw={34} />
          </div>

          {!isReveal && tacticalCards.length > 0 && (
            <div className="tac-used">
              <span className="tac-used-label">{t('match.tactic.inUse')}</span>
              <div className="tac-used-cards">
                {tacticalCards.map((tac) => (
                  <button
                    key={tac.id}
                    type="button"
                    className="tac-used-card"
                    onClick={() => setDetailTac(tac)}
                  >
                    <TacticCard card={tac} size={72} description={TACTICAL_DESCRIPTIONS[tac.effect.kind]} />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="fan2">
            {fanCards.map((card, i) => (
              <DraggableCard
                key={card.id}
                card={card}
                isCaptain={card.id === p0.captainId}
                selected={selectedHandId === card.id}
                onSelect={handleSelectHandCard}
                index={i}
                count={fanCards.length}
                affordable={
                  isReveal
                    ? true
                    : card.type === 'player'
                      ? canAfford(card as PlayerCard)
                      : canStageMoreTacticals && staminaLeft >= (card as TacticalCard).cost
                }
                blockLabel={
                  isReveal
                    ? undefined
                    : card.type === 'player'
                      ? (canAfford(card as PlayerCard)
                          ? undefined
                          : capReached
                            ? t('match.card.pitchFull')
                            : t('match.card.needsEnergy'))
                      : (canStageMoreTacticals && staminaLeft >= (card as TacticalCard).cost)
                        ? undefined
                        : !canStageMoreTacticals
                          ? t('match.card.tacticsUsed')
                          : t('match.card.needsEnergy')
                }
              />
            ))}
          </div>

          <div className="pile-col7 right">
            <div ref={discardRef}>
              <DeckPile kind="discard" count={p0.discard.length} label={t('match.pile.discard')} dw={34} pulse={discardPulse} />
            </div>
            <DeckPile kind="exiled" count={p0.exiled.length} label={t('match.pile.exiled')} dw={34} />
          </div>
        </div>

      </div>

      {/* Tactical detail — opened from the fan, the in-use zone, or the powers shelf (inspect only). */}
      <CardDetailModal
        card={detailTac}
        open={detailTac !== null}
        onClose={() => {
          setDetailTac(null)
          setDetailInspectOnly(false)
        }}
        primaryLabel={detailShowPrimary ? t(detailStaged ? 'match.tactic.stop' : 'match.tactic.play') : undefined}
        onPrimary={detailShowPrimary ? handleTacticalPrimary : undefined}
        note={detailNote}
      />

      {/* Discard fly-off ghosts — card backs sweeping from the hand to the discard pile. */}
      {discardGhosts.map((g) => (
        <div
          key={g.id}
          className="discard-fly"
          style={{
            left: g.x,
            top: g.y,
            animationDelay: `${g.delay}ms`,
            '--dx': `${g.dx}px`,
            '--dy': `${g.dy}px`,
          } as React.CSSProperties}
        />
      ))}

      {/* Surrender confirmation — abandons the run and returns to squad selection. */}
      {onSurrender && (
        <Modal open={showSurrender} onClose={() => setShowSurrender(false)}>
          <div className="surrender-modal">
            <h3>{t(surrenderCopy.title)}</h3>
            <p>{t(surrenderCopy.body)}</p>
            <div className="surrender-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowSurrender(false)}
              >
                {t('match.surrender.keepPlaying')}
              </button>
              <button
                type="button"
                className="btn btn-gold"
                onClick={() => {
                  setShowSurrender(false)
                  onSurrender()
                }}
              >
                {t(surrenderCopy.confirm)}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* First-match coach-marks — only on round 1 of the planning phase, once ever. */}
      {onboarding && !isReveal && !match.extraTime && match.round === 1 && (
        <CoachMarks steps={MATCH_ONBOARDING_STEPS} onDone={onOnboardingDone} />
      )}
    </DndContext>
  )
}
