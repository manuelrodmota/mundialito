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

/** A translatable hint: an i18n key plus any interpolation vars. */
export interface PlanHint {
  key: string
  vars?: Record<string, number>
}

/**
 * Just-in-time planning coach: returns a short nudge when the staged lineup is
 * weak in attack, or `null` when nothing's wrong. Teaches the lane-count lesson
 * (a lone star ≈ two commons — quality only beats quantity at 3+ in a lane) at
 * the moment of the decision, the round report can't.
 *
 * Returns an i18n key (+ vars) rather than text so the caller localizes it.
 * Suppressed when the player is leading (fielding few/no attackers to protect a
 * lead is deliberate) or has no player left to add (the advice would be useless).
 * Auto-clears as soon as the lineup improves — it never blocks committing.
 */
export function planHint(i: PlanHintInput): PlanHint | null {
  if (!i.notLeading || !i.canAddPlayer) return null

  if (i.attackCount === 0) {
    return { key: 'match.hint.noAttack' }
  }
  if (i.attackCount === 1 && i.opponentDefenseCount >= 2) {
    return { key: 'match.hint.loneStriker', vars: { n: i.opponentDefenseCount } }
  }
  if (i.formation === 'offensive' && i.attackCount <= 1) {
    return { key: 'match.hint.offensiveWaste' }
  }
  return null
}
