import type { TacticalCard } from '../../../engine/types'
import { TacticCard } from '../../molecules/TacticCard'
import { TACTICAL_DESCRIPTIONS } from '../CardDetailModal'
import { CapChip } from '../../atoms/CapChip'
import { TACTICALS_PER_HALF } from '../../quickplay/useQuickplayMatch'

const TACTICAL_CALLOUTS: Record<string, string> = {
  var: '📺 VAR REVIEW',
  offsideTrap: '🚩 OFFSIDE TRAP',
  referee: '🟡 REFEREE\'S WHISTLE',
  injury: '🚑 INJURY',
  waterBreak: '💧 WATER BREAK',
  substitution: '🔄 SUBSTITUTION',
  tikiTaka: '⚽ TIKI-TAKA',
  catenaccio: '🧱 CATENACCIO',
  counterAttack: '⚡ COUNTER-ATTACK',
  highPress: '🔥 HIGH PRESS',
  longBall: '📏 LONG BALL',
  nutmeg: '✨ NUTMEG',
  penalty: '⚽ PENALTY!',
  teamTalk: '📣 TEAM TALK',
  timeWasting: '⏱ TIME WASTING',
  handOfGod: '🤲 HAND OF GOD',
  fortress: '🏰 FORTRESS',
  talisman: '⭐ TALISMAN',
  totalFootball: '🌍 TOTAL FOOTBALL',
}

interface TacticalSlotProps {
  /** Currently active tactical being played this round. null = nothing played. */
  activeTactical: TacticalCard | null
  tacticalsThisHalf: number
  /** Whether the human player can play another tactical this half. */
  canPlayTactical: boolean
  /** Available tacticals in hand to play. */
  availableTacticals: TacticalCard[]
  onPlayTactical: (tac: TacticalCard) => void
}

/** Renders the active tactical face-up with a callout, plus the per-half cap counter.
 *  Tactical play is disabled when the half cap is reached.
 */
export function TacticalSlot({
  activeTactical,
  tacticalsThisHalf,
  canPlayTactical,
  availableTacticals,
  onPlayTactical,
}: TacticalSlotProps) {
  const callout = activeTactical
    ? (TACTICAL_CALLOUTS[activeTactical.effect.kind] ?? activeTactical.name.toUpperCase())
    : null

  return (
    <div className="tactical-slot">
      <div className="tac-counter">
        <CapChip kind="tactics" current={tacticalsThisHalf} max={TACTICALS_PER_HALF} />
      </div>

      {activeTactical && (
        <div className="tac-active">
          <div className="tac-callout" role="status" aria-live="polite">
            {callout}
          </div>
          <TacticCard
            card={activeTactical}
            size={120}
            description={TACTICAL_DESCRIPTIONS[activeTactical.effect.kind]}
          />
        </div>
      )}

      {canPlayTactical && availableTacticals.length > 0 && (
        <div className="tac-hand">
          {availableTacticals.map((tac) => (
            <button
              key={tac.id}
              type="button"
              className="tac-play-btn"
              onClick={() => onPlayTactical(tac)}
            >
              <TacticCard card={tac} size={80} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
