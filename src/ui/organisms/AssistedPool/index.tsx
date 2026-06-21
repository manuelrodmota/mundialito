import { useState } from 'react'
import type { PlayerCard, Position } from '../../../engine/types'
import { PlayerCard as PlayerCardComponent } from '../../molecules/PlayerCard'
import { curateByPosition, POSITION_ORDER } from '../../quickplay/curatePool'

const POSITION_LABELS: Record<Position, string> = {
  GK: 'Goalkeeper',
  DEF: 'Defense',
  MID: 'Midfield',
  FWD: 'Attack',
}

interface AssistedPoolProps {
  /** Players already narrowed by the shared Filters (search / country / rating). */
  players: PlayerCard[]
  picks: PlayerCard[]
  slotsUsed: number
  playerBudget: number
  captainId: string | null
  /** Recommended premium-core count per position (derived from engine synergies). */
  recommended: Record<Position, number>
  onAdd: (player: PlayerCard) => void
  onRemove: (player: PlayerCard) => void
  onInfo: (player: PlayerCard) => void
  /** Curated short-list length per position before "show all" (~2 rows, cost-balanced). */
  curatedLimit?: number
}

/**
 * Assisted deck-browsing view: the same premium pool, sectioned by position with a
 * per-position "need" indicator that turns ✓ once the recommended count is met.
 * Each section shows a short curated list (best by value) with a "show all" expander.
 *
 * Renders position sections directly into the surrounding `.pool-scroll`; it owns no
 * scroll container of its own. State (picks, captain, slots) is owned by DeckBuilder
 * and shared verbatim with the free grid, so toggling modes never loses a selection.
 */
export function AssistedPool({
  players,
  picks,
  slotsUsed,
  playerBudget,
  captainId,
  recommended,
  onAdd,
  onRemove,
  onInfo,
  curatedLimit = 10,
}: AssistedPoolProps) {
  const [expanded, setExpanded] = useState<Record<Position, boolean>>({
    GK: false,
    DEF: false,
    MID: false,
    FWD: false,
  })

  function toggleExpanded(position: Position) {
    setExpanded((prev) => ({ ...prev, [position]: !prev[position] }))
  }

  return (
    <>
      {POSITION_ORDER.map((position) => {
        const inPosition = players.filter((p) => p.position === position)
        const have = picks.filter((p) => p.position === position).length
        const need = recommended[position]
        const met = have >= need
        const isExpanded = expanded[position]
        const shown = isExpanded ? inPosition : curateByPosition(inPosition, position, curatedLimit)

        return (
          <section key={position} className="assist-section" data-position={position}>
            <div className="assist-head">
              <span className="assist-pos">{POSITION_LABELS[position]}</span>
              <span className={`assist-need ${met ? 'met' : 'unmet'}`}>
                {met ? '✓' : '⚠'} {have}/{need}
              </span>
              {inPosition.length > curatedLimit && (
                <button
                  type="button"
                  className="assist-showall"
                  onClick={() => toggleExpanded(position)}
                >
                  {isExpanded ? 'Show top' : `Show all ${inPosition.length}`}
                </button>
              )}
            </div>

            {shown.length === 0 ? (
              <div className="assist-empty hint">No {POSITION_LABELS[position].toLowerCase()} match your filters.</div>
            ) : (
              <div className="pool-grid2">
                {shown.map((player) => {
                  const isPicked = picks.some((p) => p.id === player.id)
                  const wouldExceed = !isPicked && slotsUsed + player.slots > playerBudget
                  return (
                    <div key={player.id} className="pool-cell">
                      <PlayerCardComponent
                        card={player}
                        size={150}
                        isCaptain={captainId === player.id}
                        selected={isPicked}
                        unaffordable={wouldExceed}
                        showSlots
                        onClick={() => (isPicked ? onRemove(player) : onAdd(player))}
                      />
                      <button
                        type="button"
                        className="card-info-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          onInfo(player)
                        }}
                      >
                        ℹ
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}
    </>
  )
}
