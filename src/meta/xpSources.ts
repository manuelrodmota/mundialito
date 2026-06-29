/**
 * XP awarded per match outcome (economy spec §7). Pure helpers; the values feed addXp.
 *
 * Quickplay win ≈ 25 · early Arcade win ≈ 35 · Arcade Final win ≈ 115 · full winning run ≈ 570.
 * (Multiplayer is a future mode — its +65 bonus lives here for when it ships.)
 */

import type { RunState } from '../engine/types'

export const PARTICIPATION_XP = 10
export const WIN_XP = 15
export const RUN_WIN_XP = 150
export const MULTIPLAYER_WIN_BONUS = 65

/** Stage-clear bonus, escalating with depth. */
export const STAGE_CLEAR_XP: Record<RunState['stage'], number> = {
  group: 10,
  r16: 25,
  qf: 40,
  sf: 60,
  final: 90,
}

/** Quickplay: participation + win. */
export function quickplayMatchXp(won: boolean): number {
  return PARTICIPATION_XP + (won ? WIN_XP : 0)
}

/** Arcade match: participation + (win + stage-clear) + run-win bonus when the Final is taken. */
export function arcadeMatchXp(won: boolean, stage: RunState['stage'], runWon: boolean): number {
  return PARTICIPATION_XP + (won ? WIN_XP + STAGE_CLEAR_XP[stage] : 0) + (runWon ? RUN_WIN_XP : 0)
}
