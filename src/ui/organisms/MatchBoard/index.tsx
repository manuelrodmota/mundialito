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
import { DeckPile } from '../../molecules/DeckPile'
import { XGMeter } from '../../molecules/Meters'
import { FormationPicker } from '../FormationPicker'
import { CapChip } from '../../atoms/CapChip'
import { TacticalSlot } from '../TacticalSlot'
import { IntentStrip } from '../IntentStrip'
import { PlayerCard as PlayerCardComponent } from '../../molecules/PlayerCard'
import { TacticCard } from '../../molecules/TacticCard'
import { Button } from '../../atoms/Button'

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

function DraggableCard({
  card,
  isCaptain,
}: {
  card: Card
  isCaptain: boolean
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: card.id })
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, position: 'relative' as const, zIndex: 99 }
    : undefined

  if (card.type === 'player') {
    return (
      <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
        <PlayerCardComponent card={card as PlayerCard} size={80} isCaptain={isCaptain} />
      </div>
    )
  }

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <TacticCard card={card as TacticalCard} size={80} />
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
 * Presentational match board — renders MatchState + owns the single dnd-kit DndContext.
 * Receives all data as props; imports the engine via `import type` only.
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

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="match-board">
        {match.extraTime && <ExtraTimeBanner />}

        <Scoreboard
          them={p1.goals}
          you={p0.goals}
          code={match.opponent.nation}
          minute={minute}
          phase={phase}
          mercy={mercyLabel}
          mercyHot={mercyHot}
          et={match.extraTime}
          xg={{
            code: match.opponent.nation,
            themXg: p1.xg % 1,
            themHeat: fatigueHeat(p1.fatigue),
            youXg: p0.xg % 1,
            youClose: (p0.xg % 1) > 0.7,
          }}
        />

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

        {opponentIntent && (
          <IntentStrip opponentIntent={opponentIntent} />
        )}

        <TacticalSlot
          activeTactical={activeTactical ?? null}
          tacticalsThisHalf={p0.tacticalsThisHalf}
          canPlayTactical={canPlayTactical}
          availableTacticals={availableTacticals}
          onPlayTactical={(tac) => onPlayTactical?.(tac)}
        />

        <FormationPicker selected={formation} onSelect={setFormation} />

        <div className="board-lanes">
          <Lane id="attack-lane" kind="atk" label="ATTACK" lw={80} fx={attackFx} count={attackCards.length}>
            {attackCards.map((card) => (
              <div key={card.id} onClick={() => handleRemoveFromAttack(card)} style={{ cursor: 'pointer' }}>
                <PlayerCardComponent
                  card={card}
                  size={80}
                  isCaptain={card.id === p0.captainId}
                  onClick={() => onCardClick?.(card)}
                />
              </div>
            ))}
          </Lane>
          <Lane id="defense-lane" kind="def" label="DEFENSE" lw={80} fx={defenseFx} count={defenseCards.length}>
            {defenseCards.map((card) => (
              <div key={card.id} onClick={() => handleRemoveFromDefense(card)} style={{ cursor: 'pointer' }}>
                <PlayerCardComponent
                  card={card}
                  size={80}
                  isCaptain={card.id === p0.captainId}
                  onClick={() => onCardClick?.(card)}
                />
              </div>
            ))}
          </Lane>
        </div>

        <div className="board-hand">
          {handCards.map((card) => (
            <DraggableCard key={card.id} card={card} isCaptain={card.id === p0.captainId} />
          ))}
        </div>

        <div className="board-piles">
          <DeckPile kind="draw" count={p0.drawPile.length} label="Draw" />
          <DeckPile kind="discard" count={p0.discard.length} label="Discard" />
          <DeckPile kind="locked" count={p0.locked.length} label="Bench" cue="returns at HT" />
          <DeckPile kind="exiled" count={p0.exiled.length} label="Exiled" />
        </div>

        {canCommit && (
          <Button variant="primary" onClick={handleCommit}>
            Commit Turn
          </Button>
        )}
      </div>
    </DndContext>
  )
}
