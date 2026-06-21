import type { Formation } from '../../engine/types'

export interface PlanHintInput {
  /** Players the human has staged in the attack lane this round. */
  attackCount: number
  /** Formation the human has selected for the round. */
  formation: Formation
  /** Opponent defenders this round (visible Intent — counts only, identities hidden). */
  opponentDefenseCount: number
  /** True when the human is NOT ahead (level or behind). */
  notLeading: boolean
  /** True when there's still an unplayed player in hand to add. */
  canAddPlayer: boolean
}

/**
 * Just-in-time planning coach: returns a short nudge when the staged lineup is
 * weak in attack, or `null` when nothing's wrong. Teaches the lane-count lesson
 * (a lone star ≈ two commons — quality only beats quantity at 3+ in a lane) at
 * the moment of the decision, the round report can't.
 *
 * Suppressed when the player is leading (fielding few/no attackers to protect a
 * lead is deliberate) or has no player left to add (the advice would be useless).
 * Auto-clears as soon as the lineup improves — it never blocks committing.
 */
export function planHint(i: PlanHintInput): string | null {
  if (!i.notLeading || !i.canAddPlayer) return null

  if (i.attackCount === 0) {
    return "No one up front — you can't create chances. Put a player in ATTACK."
  }
  if (i.attackCount === 1 && i.opponentDefenseCount >= 2) {
    return `One striker vs their ${i.opponentDefenseCount} at the back rarely breaks through — a lone star ≈ two defenders. Add another up front.`
  }
  if (i.formation === 'offensive' && i.attackCount <= 1) {
    return 'Offensive shape wastes its boost with one attacker — add more up front or switch to Balanced.'
  }
  return null
}
