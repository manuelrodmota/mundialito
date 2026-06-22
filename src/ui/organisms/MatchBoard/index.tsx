import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import type { MatchState, PlayerCard, TacticalCard, Formation, Card, CardInPlay } from '../../../engine/types'
import type { Intent } from '../../../engine/board'
import type { LaneFx } from '../../../engine/effectiveStats'
import type { RevealBoards, RoundReport, SideReport } from '../../quickplay/useQuickplayMatch'
import { Scoreboard } from '../Scoreboard'
import { ExtraTimeBanner } from '../ExtraTime'
import { Lane } from '../Lanes'
import { PitchMarkings } from '../PitchMarkings'
import { DeckPile } from '../../molecules/DeckPile'
import { XGMeter } from '../../molecules/Meters'
import { FormationPicker } from '../FormationPicker'
import { CapChip } from '../../atoms/CapChip'
import { TacticalSlot } from '../TacticalSlot'
import { PlayerCard as PlayerCardComponent } from '../../molecules/PlayerCard'
import { TacticCard } from '../../molecules/TacticCard'
import { crestSrc } from '../../data/nations'
import { XGFloat } from '../Lanes'
import { Modal, Overlay } from '../Modal'
import { Goal } from '../Goal'
import { CoachMarks } from '../CoachMarks'
import { MATCH_ONBOARDING_STEPS } from '../CoachMarks/steps'
import { planHint } from '../../onboarding/planHint'
import { useLang } from '../../i18n'
import type { Translate } from '../../i18n'

/** Deterministic confetti pieces for the match-win celebration (no RNG, so it doesn't re-roll each render). */
const WIN_CONFETTI = Array.from({ length: 60 }, (_, i) => ({
  left: (i * 36.7) % 100,
  background: ['#e8c873', '#7f56d9', '#3fbf6f', '#5aa7e8', '#ef8a7c'][i % 5] as string,
  animationDuration: `${2.4 + (i % 6) * 0.4}s`,
  animationDelay: `${(i % 10) * 0.18}s`,
}))

const ROUND_TO_MINUTE = (round: number, extraTime: boolean): string => {
  if (extraTime) return `90+${(round - 10) * 9}'`
  return `${round * 9}'`
}

const ROUND_TO_PHASE = (round: number, extraTime: boolean, t: Translate): string => {
  if (extraTime) return t('match.phase.extraTime')
  if (round <= 5) return t('match.phase.firstHalf')
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
}: {
  card: Card
  isCaptain: boolean
  selected: boolean
  onSelect: (id: string) => void
  index: number
  count: number
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: card.id })
  const dragging = transform != null
  const offset = index - (count - 1) / 2
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
      onSelect(card.id)
    },
    [card.id, onSelect],
  )

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`hcard${selected ? ' selected' : ''}${dragging ? ' dragging' : ''}`}
      onClick={handleClick}
    >
      <div className="hcard-arc">
        {card.type === 'player' ? (
          <PlayerCardComponent card={card as PlayerCard} size={HAND_CARD_SIZE} isCaptain={isCaptain} />
        ) : (
          <TacticCard card={card as TacticalCard} size={HAND_CARD_SIZE} />
        )}
      </div>
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
  onPlayTactical?: (tac: TacticalCard) => void
  onCardClick?: (card: Card) => void
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
  onPlayTactical,
  onCardClick,
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
}: MatchBoardProps) {
  const { t } = useLang()
  const surrenderCopy = SURRENDER_COPY[surrenderKind]
  const p0 = match.players[0]!
  const p1 = match.players[1]!

  const isReveal = phase === 'reveal'

  const [attackCards, setAttackCards] = useState<PlayerCard[]>([])
  const [defenseCards, setDefenseCards] = useState<PlayerCard[]>([])
  const [formation, setFormation] = useState<Formation>(p0.formation)
  const [selectedHandId, setSelectedHandId] = useState<string | null>(null)
  const [showSurrender, setShowSurrender] = useState(false)

  // Reveal cinematic, fully sequenced so each beat finishes before the next starts:
  //   1 your-attack clash → 2 YOUR goal (if scored, gated) → 3 their-attack clash
  //   → 4 THEIR goal (if scored, gated) → 5 round report.
  // Goal steps hold the GOAL blast (auto-advance after GOAL_HOLD, or click-to-dismiss),
  // so the opponent's attack only plays after your goal and the report only after theirs.
  const [revealStep, setRevealStep] = useState(0)
  const youScored = (roundReport?.youGoalsThisRound ?? 0) > 0
  const theyScored = (roundReport?.themGoalsThisRound ?? 0) > 0
  const duel: 'A' | 'B' | null = revealStep === 1 ? 'A' : revealStep === 3 ? 'B' : null
  const showYouXg = revealStep >= 1
  const showThemXg = revealStep >= 3
  const showGoalYou = revealStep === 2
  const showGoalThem = revealStep === 4
  const showReport = revealStep >= 5
  const CLASH_MS = 1100
  const GOAL_HOLD = 1900

  // Each step schedules the next; cleanup clears the pending timer. Goal steps (2,4) can be
  // advanced early by clicking the overlay (setRevealStep below).
  useEffect(() => {
    if (!isReveal) return
    let t: ReturnType<typeof setTimeout> | undefined
    if (revealStep === 0) t = setTimeout(() => setRevealStep(1), 40)
    else if (revealStep === 1) t = setTimeout(() => setRevealStep(youScored ? 2 : 3), CLASH_MS)
    else if (revealStep === 2) t = setTimeout(() => setRevealStep(3), GOAL_HOLD)
    else if (revealStep === 3) t = setTimeout(() => setRevealStep(theyScored ? 4 : 5), CLASH_MS)
    else if (revealStep === 4) t = setTimeout(() => setRevealStep(5), GOAL_HOLD)
    return () => { if (t) clearTimeout(t) }
  }, [isReveal, revealStep, youScored, theyScored])

  // Reset to plan when leaving reveal, so the next round starts the cinematic clean.
  // Deferred via a timer so the reset is not a synchronous setState in the effect body.
  useEffect(() => {
    if (isReveal) return
    const t = setTimeout(() => setRevealStep(0), 0)
    return () => clearTimeout(t)
  }, [isReveal])

  // Require an 8px drag before dnd activates, so a plain click selects a card (click-to-place)
  // instead of being swallowed as a micro-drag.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const cardId = active.id as string
    const card = p0.hand.find((c) => c.id === cardId)
    if (!card || card.type !== 'player') return

    const playerCard = card as PlayerCard
    const alreadyPlaced =
      attackCards.some((c) => c.id === cardId) ||
      defenseCards.some((c) => c.id === cardId)

    if (alreadyPlaced) return

    if (over.id === 'attack-lane') {
      setAttackCards((prev) => [...prev, playerCard])
    } else if (over.id === 'defense-lane') {
      setDefenseCards((prev) => [...prev, playerCard])
    }
  }, [p0.hand, attackCards, defenseCards])

  const handleSelectHandCard = useCallback((id: string) => {
    setSelectedHandId((prev) => (prev === id ? null : id))
  }, [])

  const handleAttackZoneClick = useCallback(() => {
    if (!selectedHandId) return
    const card = p0.hand.find((c) => c.id === selectedHandId)
    if (!card || card.type !== 'player') return
    const alreadyPlaced =
      attackCards.some((c) => c.id === selectedHandId) ||
      defenseCards.some((c) => c.id === selectedHandId)
    if (alreadyPlaced) return
    setAttackCards((prev) => [...prev, card as PlayerCard])
    setSelectedHandId(null)
  }, [selectedHandId, p0.hand, attackCards, defenseCards])

  const handleDefenseZoneClick = useCallback(() => {
    if (!selectedHandId) return
    const card = p0.hand.find((c) => c.id === selectedHandId)
    if (!card || card.type !== 'player') return
    const alreadyPlaced =
      attackCards.some((c) => c.id === selectedHandId) ||
      defenseCards.some((c) => c.id === selectedHandId)
    if (alreadyPlaced) return
    setDefenseCards((prev) => [...prev, card as PlayerCard])
    setSelectedHandId(null)
  }, [selectedHandId, p0.hand, attackCards, defenseCards])

  const handleRemoveFromAttack = useCallback((card: PlayerCard) => {
    setAttackCards((prev) => prev.filter((c) => c.id !== card.id))
  }, [])

  const handleRemoveFromDefense = useCallback((card: PlayerCard) => {
    setDefenseCards((prev) => prev.filter((c) => c.id !== card.id))
  }, [])

  const handleCommit = useCallback(() => {
    onCommit({ formation, attackCards, defenseCards })
    onReveal()
    // Clear the local staging — the reveal renders the snapshot, and the next round draws fresh.
    setAttackCards([])
    setDefenseCards([])
    setSelectedHandId(null)
  }, [onCommit, onReveal, formation, attackCards, defenseCards])

  const availableTacticals = p0.hand.filter((c) => c.type === 'tactical') as TacticalCard[]
  const canPlayTactical = p0.tacticalsThisHalf < 2
  const activeTactical = p0.board.attack
    .find((cip) => !cip.faceDown && cip.card.type === 'tactical')?.card as TacticalCard | undefined

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
  // shows in both the lane and the hand.
  const stagedIds = new Set<string>([...attackCards, ...defenseCards].map((c) => c.id))
  const handCards = (p0.hand.filter((c) => c.type === 'player') as PlayerCard[]).filter(
    (c) => !stagedIds.has(c.id),
  )

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
        canAddPlayer: handCards.length > 0,
      })

  const oppCrest = crestSrc(match.opponent.nation)

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
          <TacticCard key={cip.card.id} card={cip.card as TacticalCard} size={128} />
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
      <div className={`screen board v4board${match.extraTime ? ' et-mode' : ''}`}>
        <div className="stadium-bg" />

        {/* top bar: LEFT identity | CENTER scoreboard | RIGHT meters+chips */}
        <div className="side-strip top" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12 }}>
          <div className="opp-id" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
            {oppCrest ? (
              <img src={oppCrest} alt={match.opponent.nation} style={{ width: 36, height: 36, objectFit: 'contain' }} />
            ) : null}
            <span className="nm">{match.opponent.name}</span>
            <TierStars tier={match.opponent.tier} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Scoreboard
              them={p1.goals}
              you={p0.goals}
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
            <div className="board-meters">
              <XGMeter
                goals={p1.goals}
                xg={p1.xg % 1}
                heat={fatigueHeat(p1.fatigue)}
                label={match.opponent.name}
              />
              <XGMeter
                goals={p0.goals}
                xg={p0.xg % 1}
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

            {!isReveal && opponentIntent && intentMeta && (
              <div className="intent">
                {t('match.intent.label')} <b>{intentMeta.label} {t(intentMeta.shapeKey)}</b> · <b>{opponentIntent.cardCount}</b> {opponentIntent.cardCount === 1 ? t('match.intent.cardOne') : t('match.intent.cardMany')} · <b>{opponentIntent.staminaSpent}</b> {t('match.intent.stamina')}
              </div>
            )}

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
                      <div key={card.id} onClick={() => handleRemoveFromDefense(card)} style={{ cursor: 'pointer' }}>
                        <PlayerCardComponent
                          card={card}
                          size={128}
                          isCaptain={card.id === p0.captainId}
                          onClick={() => onCardClick?.(card)}
                        />
                      </div>
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
                      <div key={card.id} onClick={() => handleRemoveFromAttack(card)} style={{ cursor: 'pointer' }}>
                        <PlayerCardComponent
                          card={card}
                          size={128}
                          isCaptain={card.id === p0.captainId}
                          onClick={() => onCardClick?.(card)}
                        />
                      </div>
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

        {/* GOAL blast — your goal plays after your clash; theirs after their clash.
            Click (or auto-advance) continues the cinematic to the next beat. */}
        {showGoalYou && roundReport && (
          <Overlay open onClick={() => setRevealStep(3)}>
            <Goal isYou score={[roundReport.youGoalsTotal, roundReport.themGoalsTotal - (theyScored ? 1 : 0)]} />
          </Overlay>
        )}
        {showGoalThem && roundReport && (
          <Overlay open onClick={() => setRevealStep(5)}>
            <Goal isYou={false} scorer={match.opponent.name} score={[roundReport.youGoalsTotal, roundReport.themGoalsTotal]} />
          </Overlay>
        )}

        {/* action dock — cap chips + formation + tactical slot + lock-in button */}
        <div className="match-dock">

          <CapChip kind="players" current={attackCards.length + defenseCards.length} max={5} />
          {showStarCore && <CapChip kind="star" />}

          <FormationPicker selected={formation} onSelect={setFormation} />

          <TacticalSlot
            activeTactical={activeTactical ?? null}
            tacticalsThisHalf={p0.tacticalsThisHalf}
            canPlayTactical={canPlayTactical}
            availableTacticals={availableTacticals}
            onPlayTactical={(tac) => onPlayTactical?.(tac)}
          />

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
            {!isReveal && canCommit && (
              <button className="btn btn-gold" data-coach="commit" onClick={handleCommit}>
                {committed > 0 ? t('match.commit.lockReveal') : t('match.commit.passRound')}
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
            <button className="btn btn-gold" style={{ width: '100%' }} onClick={onNextRound}>
              {roundReport.decided
                ? t('match.report.next.result')
                : roundReport.extraTime
                  ? t('match.report.next.et')
                  : t('match.report.next.round')}
            </button>
          </div>
        )}

        {/* hand dock — fan of draggable+clickable player cards */}
        <div className="hand-dock">
          <div className="pile-col7 left">
            <DeckPile kind="draw" count={p0.drawPile.length} label={t('match.pile.draw')} dw={34} />
            <DeckPile kind="locked" count={p0.locked.length} label={t('match.pile.bench')} cue={t('match.pile.benchCue')} dw={34} />
          </div>

          <div className="fan2">
            {handCards.map((card, i) => (
              <DraggableCard
                key={card.id}
                card={card}
                isCaptain={card.id === p0.captainId}
                selected={selectedHandId === card.id}
                onSelect={handleSelectHandCard}
                index={i}
                count={handCards.length}
              />
            ))}
          </div>

          <div className="pile-col7 right">
            <DeckPile kind="discard" count={p0.discard.length} label={t('match.pile.discard')} dw={34} />
            <DeckPile kind="exiled" count={p0.exiled.length} label={t('match.pile.exiled')} dw={34} />
          </div>
        </div>

      </div>

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
