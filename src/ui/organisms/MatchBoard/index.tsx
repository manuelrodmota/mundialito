import { useState, useCallback, useEffect } from 'react'
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

const ROUND_TO_MINUTE = (round: number, extraTime: boolean): string => {
  if (extraTime) return `90+${(round - 10) * 9}'`
  return `${round * 9}'`
}

const ROUND_TO_PHASE = (round: number, extraTime: boolean): string => {
  if (extraTime) return 'EXTRA TIME'
  if (round <= 5) return '1ST HALF'
  return '2ND HALF'
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

const FORMATION_LABELS: Record<Formation, { label: string; shape: string }> = {
  balanced: { label: '4-4-2', shape: 'BALANCED' },
  offensive: { label: '3-4-3', shape: 'OFFENSIVE' },
  defensive: { label: '5-4-1', shape: 'DEFENSIVE' },
}

/** One-line setup summary for a side in the round report (formation, star quality, chemistry, fatigue). */
function sideNote(who: string, s: SideReport): string {
  const fm = FORMATION_LABELS[s.formation]
  const parts: string[] = [`${fm.label} ${fm.shape} · ATK ×${s.atkMult} DEF ×${s.defMult}`]
  if (s.rarityBonus > 0) parts.push(`star quality +${s.rarityBonus}`)
  if (s.synAtk > 0 || s.synDef > 0) parts.push(`chemistry +${s.synAtk}/${s.synDef}`)
  if (s.fatigue > 0) parts.push(`fatigue ${s.fatigue} → DEF ×${s.fatigueDefMult.toFixed(2)}`)
  return `${who} — ${parts.join(' · ')}`
}

function DraggableCard({
  card,
  isCaptain,
  selected,
  onSelect,
}: {
  card: Card
  isCaptain: boolean
  selected: boolean
  onSelect: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: card.id })
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, position: 'relative' as const, zIndex: 99 }
    : undefined

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onSelect(card.id)
    },
    [card.id, onSelect],
  )

  if (card.type === 'player') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={`hcard${selected ? ' selected' : ''}`}
        onClick={handleClick}
      >
        <PlayerCardComponent card={card as PlayerCard} size={118} isCaptain={isCaptain} />
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`hcard${selected ? ' selected' : ''}`}
      onClick={handleClick}
    >
      <TacticCard card={card as TacticalCard} size={118} />
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
}

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
}: MatchBoardProps) {
  const p0 = match.players[0]!
  const p1 = match.players[1]!

  const isReveal = phase === 'reveal'

  const [attackCards, setAttackCards] = useState<PlayerCard[]>([])
  const [defenseCards, setDefenseCards] = useState<PlayerCard[]>([])
  const [formation, setFormation] = useState<Formation>(p0.formation)
  const [selectedHandId, setSelectedHandId] = useState<string | null>(null)

  // Reveal animation step: 0 plan/idle · 1 your-attack clash · 2 their-attack clash · 3 report.
  const [revealStep, setRevealStep] = useState(0)
  const duel: 'A' | 'B' | null = revealStep === 1 ? 'A' : revealStep === 2 ? 'B' : null
  const showYouXg = revealStep >= 1
  const showThemXg = revealStep >= 2
  const showReport = revealStep >= 3

  // Drive the clash sequence with timeouts only (no synchronous setState in the effect body);
  // the cleanup resets the step to 0 when we leave reveal, so the next reveal starts clean.
  useEffect(() => {
    if (!isReveal) return
    const timers = [
      setTimeout(() => setRevealStep(1), 700),
      setTimeout(() => setRevealStep(2), 1400),
      setTimeout(() => setRevealStep(3), 2200),
    ]
    return () => {
      timers.forEach(clearTimeout)
      setRevealStep(0)
    }
  }, [isReveal, revealBoards])

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
  const phaseLabel = ROUND_TO_PHASE(match.round, match.extraTime)

  const mercyDiff = Math.abs(p0.goals - p1.goals)
  const mercyLabel = mercyDiff > 0 ? `–${3 - mercyDiff} to mercy` : undefined
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
                label="YOU"
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
              <span className="who4">You attack</span>
            </div>
            <div className="dirhint4 r">
              <span className="who4">They attack</span>
            </div>

            {!isReveal && opponentIntent && intentMeta && (
              <div className="intent">
                Opponent: <b>{intentMeta.label} {intentMeta.shape}</b> · <b>{opponentIntent.cardCount}</b> card{opponentIntent.cardCount === 1 ? '' : 's'} · <b>{opponentIntent.staminaSpent}</b> stamina
              </div>
            )}

            <div className="p4-grid">
              {isReveal && revealBoards ? (
                <>
                  {renderRevealLane(revealBoards.you.defense, 'def', 'defense-lane', 'l-ydef', 'Your defense')}
                  {renderRevealLane(revealBoards.you.attack, 'atk', 'attack-lane', 'l-yatk', 'Your attack')}
                  <div className="p4-mid" />
                  {renderRevealLane(revealBoards.them.attack, 'atk', 'them-attack-lane', 'l-tatk', 'Their attack')}
                  {renderRevealLane(revealBoards.them.defense, 'def', 'them-defense-lane', 'l-tdef', 'Their defense')}
                </>
              ) : (
                <>
                  <Lane
                    id="defense-lane"
                    kind="def"
                    label="Your defense"
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
                    label="Your attack"
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
                    'Their attack',
                  )}
                  {renderFaceDownLane(
                    opponentIntent?.defenseCount ?? 0,
                    'def',
                    'them-defense-lane',
                    'l-tdef',
                    'Their defense',
                  )}
                </>
              )}
            </div>

            {/* xG floats during duel animation */}
            {showYouXg && roundReport && roundReport.youXg > 0 && (
              <div style={{ position: 'absolute', right: '6%', top: '30%', zIndex: 10 }}>
                <XGFloat amount={roundReport.youXg} label="xG · your attack" />
              </div>
            )}
            {showThemXg && roundReport && roundReport.themXg > 0 && (
              <div style={{ position: 'absolute', left: '6%', top: '30%', zIndex: 10 }}>
                <XGFloat amount={roundReport.themXg} label="xG · their attack" />
              </div>
            )}
          </div>
        </div>

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

          <div style={{ marginLeft: 'auto' }}>
            {!isReveal && canCommit && (
              <button className="btn btn-gold" onClick={handleCommit}>
                {committed > 0 ? 'Lock in & reveal' : 'Pass round'}
              </button>
            )}
          </div>
        </div>

        {/* round report panel — shown after duel animation completes */}
        {isReveal && showReport && roundReport && (
          <div className="readout">
            <h4>
              {roundReport.extraTime
                ? `Extra time +${(roundReport.round - 10) * 9}'`
                : `Round ${roundReport.round}`}{' '}
              — full report
            </h4>
            <div className="lines">
              <div className="line l-note">{sideNote('You', roundReport.you)}</div>
              <div className="line l-note">{sideNote('They', roundReport.them)}</div>
              <div className="line l-xg">
                You +{roundReport.youXg.toFixed(2)} xG — ATK {roundReport.you.atkEff} vs DEF {roundReport.them.defEff}
              </div>
              <div className="line l-xg to-them">
                They +{roundReport.themXg.toFixed(2)} xG — ATK {roundReport.them.atkEff} vs DEF {roundReport.you.defEff}
              </div>
              {roundReport.youGoalsThisRound > 0 && (
                <div className="line l-goal">
                  GOAL — you make it {roundReport.youGoalsTotal}–{roundReport.themGoalsTotal}
                </div>
              )}
              {roundReport.themGoalsThisRound > 0 && (
                <div className="line l-goal">
                  GOAL — they make it {roundReport.youGoalsTotal}–{roundReport.themGoalsTotal}
                </div>
              )}
              {roundReport.you.scored && (
                <div className="line l-onform">You are ON FORM — +0.10 xG next round</div>
              )}
              {roundReport.them.scored && (
                <div className="line l-onform">They are ON FORM — +0.10 xG next round</div>
              )}
              {roundReport.halftime && (
                <div className="line l-halftime">HALFTIME — benched stars return, fatigue clears for both sides</div>
              )}
            </div>
            <button className="btn btn-gold" style={{ width: '100%' }} onClick={onNextRound}>
              {roundReport.decided ? 'See result →' : roundReport.extraTime ? 'Next ET round →' : 'Next round →'}
            </button>
          </div>
        )}

        {/* hand dock — fan of draggable+clickable player cards */}
        <div className="hand-dock" style={{ '--hw': '118px' } as React.CSSProperties}>
          <div className="pile-col7 left">
            <DeckPile kind="draw" count={p0.drawPile.length} label="Draw" />
            <DeckPile kind="locked" count={p0.locked.length} label="Bench" cue="returns at HT" />
          </div>

          <div className="fan2">
            {handCards.map((card) => (
              <DraggableCard
                key={card.id}
                card={card}
                isCaptain={card.id === p0.captainId}
                selected={selectedHandId === card.id}
                onSelect={handleSelectHandCard}
              />
            ))}
          </div>

          <div className="pile-col7 right">
            <DeckPile kind="discard" count={p0.discard.length} label="Discard" />
            <DeckPile kind="exiled" count={p0.exiled.length} label="Exiled" />
          </div>
        </div>

        {/* player bottom strip */}
        <div className="side-strip bottom">
          <div className="crest">YOU</div>
          <span className="fchip" data-f={formation}>
            {FORMATION_LABELS[formation].label} {FORMATION_LABELS[formation].shape}
          </span>
        </div>
      </div>
    </DndContext>
  )
}
