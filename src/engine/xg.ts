/**
 * WCC-006 — xG scoring engine (GDD v10 §7 / §17).
 *
 * The xG formula converts effective ATK vs DEF into a per-round scoring
 * probability that accumulates on a meter; crossing 1.0 scores a goal and
 * the remainder carries forward.
 */

import type { PlayerState } from "./types.ts";
import { XG_FLOOR, XG_SLOPE, XG_CAP, GOAL_THRESHOLD } from "./constants.ts";
import { clamp } from "./util.ts";

/**
 * Per-round xG delta: clamp(XG_FLOOR + max(0, atkEff − defEff) / XG_SLOPE, 0, XG_CAP).
 * GDD §7, §17 line 161 / pseudocode `xgAddFor`.
 */
export function xgAdd(atkEff: number, defEff: number, floor = XG_FLOOR): number {
  return clamp(floor + Math.max(0, atkEff - defEff) / XG_SLOPE, 0, XG_CAP);
}

/**
 * Adds xG to a player's meter, converting each full crossing to a goal.
 * The remainder always carries forward (multi-goal in one add is possible).
 * Sets `scoredFirstAt` only on the first goal of the match.
 * GDD §17 `addXg` semantics.
 */
export function addXg(state: PlayerState, amount: number, round: number): void {
  state.xg += amount;
  while (state.xg >= GOAL_THRESHOLD) {
    state.goals += 1;
    state.xg -= GOAL_THRESHOLD;
    if (state.scoredFirstAt === null) {
      state.scoredFirstAt = round;
    }
  }
}
