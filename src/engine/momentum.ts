/**
 * WCC-016 — Momentum / On-Form (GDD v10 §14 / §11 / §15 / §16).
 *
 * Scoring a goal, or maintaining 3 consecutive rounds of high-pressure play,
 * grants an On Form status (+MOMENTUM_XG xG) for the next round only.
 * The bonus is consumed once applied (single-shot per trigger).
 */

import type { PlayerState } from "./types.ts";
import { MOMENTUM_XG } from "./constants.ts";

/**
 * Tracks high-pressure activity for the round by counting attack-heavy cards.
 * Returns true when the player committed more to attack than defense.
 */
function isHighPressureRound(state: PlayerState): boolean {
  return state.board.attack.length > state.board.defense.length;
}

/**
 * Grants the On Form bonus (+0.10 xG) to all attacking cards for the next round.
 * GDD §14 line 286, §11, §15 line 320.
 */
function grantOnForm(state: PlayerState): void {
  const firstAttacker = state.board.attack[0];
  if (firstAttacker) {
    firstAttacker.statuses.push({ kind: "onform", amount: MOMENTUM_XG, duration: 1 });
  }
  state.momentum = 0;
}

/**
 * Updates momentum state after a round.
 * If the player scored this round (goals increased), triggers On Form immediately.
 * If the player had a high-pressure round, increments the streak counter.
 * At 3 consecutive high-pressure rounds, triggers On Form and resets the streak.
 * GDD §14 line 286, §16 AC.
 */
export function updateMomentum(state: PlayerState, scoredThisRound: boolean): void {
  if (scoredThisRound) {
    grantOnForm(state);
    return;
  }

  if (isHighPressureRound(state)) {
    state.momentum += 1;
    if (state.momentum >= 3) {
      grantOnForm(state);
    }
  } else {
    state.momentum = 0;
  }
}

/** Resets the momentum streak counter. Called at halftime. */
export function resetMomentum(state: PlayerState): void {
  state.momentum = 0;
}
