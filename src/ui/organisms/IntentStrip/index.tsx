import type { Intent } from '../../../engine/board'

interface IntentStripProps {
  /** The opponent's intent (never reveals identities — only formation/count/stamina/tactic). */
  opponentIntent: Intent | null
}

/** Renders the opponent's intent strip without leaking card identities.
 *  Shows only: formation, card count, stamina spent, and visible tacticals.
 *  GDD §13 — intent is the only information the opponent reveals.
 */
export function IntentStrip({ opponentIntent }: IntentStripProps) {
  if (!opponentIntent) return null

  const { formation, cardCount, staminaSpent, visibleTacticals } = opponentIntent

  const formationLabel = formation.charAt(0).toUpperCase() + formation.slice(1)
  const hasTactical = visibleTacticals.length > 0

  return (
    <div className="intent-strip" role="status" aria-label="Opponent intent">
      <span className="intent-formation">{formationLabel}</span>
      <span className="intent-sep">·</span>
      <span className="intent-cards">{cardCount} card{cardCount !== 1 ? 's' : ''}</span>
      <span className="intent-sep">·</span>
      <span className="intent-stamina">{staminaSpent} stamina</span>
      {hasTactical && (
        <>
          <span className="intent-sep">·</span>
          <span className="intent-tactic">played a Tactical</span>
        </>
      )}
    </div>
  )
}
