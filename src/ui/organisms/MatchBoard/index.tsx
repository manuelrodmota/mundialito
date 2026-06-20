import { useState, useCallback } from 'react'
import { DndContext } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import type { MatchState, PlayerCard, TacticalCard, Formation, Card } from '../../../engine/types'
import type { Intent } from '../../../engine/board'
import type { LaneFx } from '../../../engine/effectiveStats'
import { Scoreboard } from '../Scoreboard'
import { ExtraTimeBanner } from '../ExtraTime'
import { Lane } from '../Lanes'
import { PitchMarkings } from '../PitchMarkings'
import { DeckPile } from '../../molecules/DeckPile'
import { XGMeter } from '../../molecules/Meters'
import { FormationPicker } from '../FormationPicker'
import { CapChip } from '../../atoms/CapChip'
import { TacticalSlot } from '../TacticalSlot'
import { IntentStrip } from '../IntentStrip'
import { PlayerCard as PlayerCardComponent } from '../../molecules/PlayerCard'
import { TacticCard } from '../../molecules/TacticCard'
import { crestSrc } from '../../data/nations'

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
        <PlayerCardComponent card={card as PlayerCard} size={112} isCaptain={isCaptain} />
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
      <TacticCard card={card as TacticalCard} size={112} />
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
  /** Called when the player is ready to commit their turn and resolve. */
  onCommit: (opts: MatchBoardCommitOptions) => void
  onPlayTactical?: (tac: TacticalCard) => void
  onCardClick?: (card: Card) => void
  canCommit?: boolean
  opponentIntent?: Intent | null
  /**
   * Engine `laneFx` helper, injected by the orchestration tier so the board can show the two v10
   * balance levers without importing engine runtime. Omit to hide the lane-group indicators.
   */
  laneFx?: (cards: PlayerCard[], lane: 'attack' | 'defense') => LaneFx | null
}

/**
 * Presentational match board — full pitch layout mirroring Board9.jsx.
 * Owns the single dnd-kit DndContext; imports the engine via `import type` only.
 */
export function MatchBoard({
  match,
  onCommit,
  onPlayTactical,
  onCardClick,
  canCommit = false,
  opponentIntent,
  laneFx,
}: MatchBoardProps) {
  const p0 = match.players[0]!
  const p1 = match.players[1]!

  const [attackCards, setAttackCards] = useState<PlayerCard[]>([])
  const [defenseCards, setDefenseCards] = useState<PlayerCard[]>([])
  const [formation, setFormation] = useState<Formation>(p0.formation)
  const [selectedHandId, setSelectedHandId] = useState<string | null>(null)

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
    setAttackCards([])
    setDefenseCards([])
    setSelectedHandId(null)
  }, [onCommit, formation, attackCards, defenseCards])

  const availableTacticals = p0.hand.filter((c) => c.type === 'tactical') as TacticalCard[]
  const canPlayTactical = p0.tacticalsThisHalf < 2
  const activeTactical = p0.board.attack
    .find((cip) => !cip.faceDown && cip.card.type === 'tactical')?.card as TacticalCard | undefined

  const hasPremiumInAttack = attackCards.some((c) => c.rarity !== 'common')
  const hasPremiumInDefense = defenseCards.some((c) => c.rarity !== 'common')
  const showStarCore = hasPremiumInAttack || hasPremiumInDefense

  const minute = ROUND_TO_MINUTE(match.round, match.extraTime)
  const phase = ROUND_TO_PHASE(match.round, match.extraTime)

  const mercyDiff = Math.abs(p0.goals - p1.goals)
  const mercyLabel = mercyDiff > 0 ? `–${3 - mercyDiff} to mercy` : undefined
  const mercyHot = mercyDiff >= 2

  const handCards = p0.hand.filter((c) => c.type === 'player') as PlayerCard[]

  const attackFx = laneFx ? laneFx(attackCards, 'attack') : null
  const defenseFx = laneFx ? laneFx(defenseCards, 'defense') : null

  const committed = attackCards.length + defenseCards.length

  const oppCrest = crestSrc(match.opponent.nation)

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className={`screen board${match.extraTime ? ' et-mode' : ''}`}>
        <div className="stadium-bg" />

        {/* top bar: LEFT identity | CENTER scoreboard | RIGHT meters+chips */}
        <div className="side-strip top" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* LEFT: opponent identity — crest + name + tier stars */}
          <div className="opp-id" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 80, gap: 4 }}>
            {oppCrest ? (
              <img src={oppCrest} alt={match.opponent.nation} style={{ width: 36, height: 36, objectFit: 'contain' }} />
            ) : null}
            <span className="nm">{match.opponent.name}</span>
            <TierStars tier={match.opponent.tier} />
          </div>

          {/* CENTER: scoreboard — score + clock + mercy only (no xg prop) */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <Scoreboard
              them={p1.goals}
              you={p0.goals}
              code={match.opponent.nation}
              nation={match.opponent.nation}
              minute={minute}
              phase={phase}
              mercy={mercyLabel}
              mercyHot={mercyHot}
              et={match.extraTime}
            />
          </div>

          {/* RIGHT: dual xG meters + cap chips */}
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
            <div className="board-chips">
              <CapChip kind="players" current={attackCards.length + defenseCards.length} max={5} />
              <CapChip kind="tactics" current={p0.tacticalsThisHalf} max={2} />
              {showStarCore && <CapChip kind="star" />}
            </div>
          </div>
        </div>

        {/* ET banner */}
        {match.extraTime && <ExtraTimeBanner />}

        {/* pitch */}
        <div className="pitch-wrap4">
          <div className="pitch4">
            <PitchMarkings />

            <div className="dirhint4 l">
              <span className="who4">You attack</span>
            </div>
            <div className="dirhint4 r">
              <span className="who4">They attack</span>
            </div>

            {opponentIntent && (
              <div className="intent">
                <IntentStrip opponentIntent={opponentIntent} />
              </div>
            )}

            <div className="p4-grid">
              <Lane
                id="defense-lane"
                kind="def"
                label="DEFENSE"
                lw={64}
                fx={defenseFx}
                count={defenseCards.length}
                onZoneClick={handleDefenseZoneClick}
              >
                {defenseCards.map((card) => (
                  <div key={card.id} onClick={() => handleRemoveFromDefense(card)} style={{ cursor: 'pointer' }}>
                    <PlayerCardComponent
                      card={card}
                      size={64}
                      compact
                      isCaptain={card.id === p0.captainId}
                      onClick={() => onCardClick?.(card)}
                    />
                  </div>
                ))}
              </Lane>

              <Lane
                id="attack-lane"
                kind="atk"
                label="ATTACK"
                lw={64}
                fx={attackFx}
                count={attackCards.length}
                onZoneClick={handleAttackZoneClick}
              >
                {attackCards.map((card) => (
                  <div key={card.id} onClick={() => handleRemoveFromAttack(card)} style={{ cursor: 'pointer' }}>
                    <PlayerCardComponent
                      card={card}
                      size={64}
                      compact
                      isCaptain={card.id === p0.captainId}
                      onClick={() => onCardClick?.(card)}
                    />
                  </div>
                ))}
              </Lane>

              <div className="p4-mid" />

              {/* opponent lanes — face-down placeholders */}
              <div className="lane4 opp atk-lane">
                <div className="ltag4">Their attack</div>
              </div>
              <div className="lane4 opp def-lane">
                <div className="ltag4">Their defense</div>
              </div>
            </div>
          </div>
        </div>

        {/* action dock */}
        <div className="hand-dock" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '6px 26px', position: 'relative', zIndex: 5, minHeight: 56 }}>
          <TacticalSlot
            activeTactical={activeTactical ?? null}
            tacticalsThisHalf={p0.tacticalsThisHalf}
            canPlayTactical={canPlayTactical}
            availableTacticals={availableTacticals}
            onPlayTactical={(tac) => onPlayTactical?.(tac)}
          />

          <FormationPicker selected={formation} onSelect={setFormation} />

          {canCommit && (
            <button className="btn btn-gold" onClick={handleCommit}>
              {committed > 0 ? 'Lock in & reveal' : 'Pass round'}
            </button>
          )}
        </div>

        {/* hand dock — fan of draggable+clickable player cards */}
        <div className="hand-dock">
          <div className="pile-col7 left">
            <DeckPile kind="draw" count={p0.drawPile.length} label="Draw" />
            <DeckPile kind="locked" count={p0.locked.length} label="Bench" cue="returns at HT" />
          </div>

          <div className="fan2" style={{ '--hw': '112px' } as React.CSSProperties}>
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
          <span className="fchip" data-f={formation}>{formation}</span>
        </div>
      </div>
    </DndContext>
  )
}
