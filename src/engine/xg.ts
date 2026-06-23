/**
 * WCC-006 — xG fill + probabilistic finishing (GDD v11 §7 / §14 / §17).
 *
 * Two stages now:
 *   1. FILL — `xgAdd` turns effective ATK vs DEF into the per-round xG a side adds to its meter
 *      (the "Pressure"). Unchanged from v10.
 *   2. FINISH — when the meter reaches PRESSURE_FULL (or a tactical forces a shot), `takeShot`
 *      rolls a conversion probability P. Convert → GOAL and the meter empties; miss → the meter
 *      drops by MISS_DROP_FRAC so the side keeps the pressure up and tries again next round.
 *
 * This replaces the v10 deterministic "cross GOAL_THRESHOLD → guaranteed goal", which produced a
 * predictable "I score / you score" metronome.
 */

import type { PlayerState, ShotResult } from "./types.ts";
import type { Rng } from "./rng.ts";
import {
  XG_FLOOR,
  XG_SLOPE,
  XG_CAP,
  PRESSURE_FULL,
  BASE_CONVERSION,
  CONVERSION_CAP,
  CONVERSION_FLOOR,
  MISS_DROP_FRAC,
  PITY_STEP,
  PITY_CAP,
  MOMENTUM_CONVERSION,
} from "./constants.ts";
import { clamp } from "./util.ts";

/**
 * Per-round xG (fill) delta: clamp(XG_FLOOR + max(0, atkEff − defEff) / XG_SLOPE, 0, XG_CAP).
 * GDD §7, §17 line 161 / pseudocode `xgAddFor`.
 */
export function xgAdd(atkEff: number, defEff: number, floor = XG_FLOOR): number {
  return clamp(floor + Math.max(0, atkEff - defEff) / XG_SLOPE, 0, XG_CAP);
}

/** Adds this round's fill to the pressure meter, clamped to [0, PRESSURE_FULL]. */
export function addPressure(state: PlayerState, fillXg: number): void {
  state.xg = clamp(state.xg + fillXg, 0, PRESSURE_FULL);
}

/** Options that modify a shot — tactical-forced shots (Penalty / Hand of God). */
export interface ShotOpts {
  round: number;
  rng: Rng;
  /** Force a shot even if the meter isn't full (Penalty / Hand of God). */
  forceShot?: boolean;
  /** A conversion floor the shot can't drop below (a Penalty/Hand-of-God's own quality). */
  convFloor?: number;
}

/**
 * Computes the conversion probability the NEXT shot would use, without rolling or mutating state.
 * Pure — used by the UI to telegraph the odds before lock-in, and internally by `takeShot`.
 */
export function previewConversion(
  state: PlayerState,
  opts: { forceShot?: boolean; convFloor?: number } = {},
): number {
  const full = state.xg >= PRESSURE_FULL;
  if (!full && !opts.forceShot) return 0;

  // Natural base only applies once the meter is full; a forced shot below full takes its quality
  // entirely from the tactical's convFloor.
  let p = full ? BASE_CONVERSION : 0;
  p += Math.min((state.missStreak ?? 0) * PITY_STEP, PITY_CAP);
  p += (Math.min(state.momentum, 3) / 3) * MOMENTUM_CONVERSION;
  if (opts.convFloor !== undefined) p = Math.max(p, opts.convFloor);
  return clamp(p, full || opts.convFloor !== undefined ? CONVERSION_FLOOR : 0, CONVERSION_CAP);
}

/**
 * Resolves a shot for the player. If the meter is full (or a shot is forced) it rolls P:
 *   - GOAL → goals += 1, meter empties to 0, miss-streak resets.
 *   - MISS → meter drops by MISS_DROP_FRAC, miss-streak increments (raising the next pity bonus).
 * Returns the shot outcome (also stored on state.lastShot by the caller). GDD §14.
 */
export function takeShot(state: PlayerState, opts: ShotOpts): ShotResult {
  const ready = state.xg >= PRESSURE_FULL || opts.forceShot === true;
  if (!ready) {
    const none: ShotResult = { took: false, scored: false, p: 0 };
    return none;
  }

  const p = previewConversion(state, { forceShot: opts.forceShot, convFloor: opts.convFloor });
  const scored = opts.rng.next() < p;

  if (scored) {
    state.goals += 1;
    if (state.scoredFirstAt === null) state.scoredFirstAt = opts.round;
    state.xg = 0;
    state.missStreak = 0;
  } else {
    state.xg = state.xg * (1 - MISS_DROP_FRAC);
    state.missStreak = (state.missStreak ?? 0) + 1;
  }

  return { took: true, scored, p };
}
