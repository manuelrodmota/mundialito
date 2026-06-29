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
  SNAP_THRESHOLD,
  SNAP_SCALE,
  SNAP_CAP,
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

/** Options that modify a shot — tactical-forced shots (Penalty / Hand of God) + v12 edge cases. */
export interface ShotOpts {
  round: number;
  rng: Rng;
  /** Force a shot even if the meter isn't full (Penalty / Hand of God). */
  forceShot?: boolean;
  /** A conversion floor the shot can't drop below (a Penalty/Hand-of-God's own quality). */
  convFloor?: number;
  /** v12 Park the Bus: opponent's open-play conversion penalty (ignored for forced shots). */
  busPenalty?: number;
  /** v12 Snap Shot: this round's xG fill — a near-maxed round can fire early on a partial meter. */
  xgRound?: number;
  /** v12 Snap Shot toggle (sim A/B). Default enabled. */
  snapEnabled?: boolean;
}

/**
 * Computes the conversion probability the NEXT shot would use, without rolling or mutating state.
 * Pure — used by the UI to telegraph the odds before lock-in, and internally by `takeShot`.
 * `snap` treats a partial-meter Snap Shot as a normal open-play shot; `busPenalty` is the v12 Park
 * the Bus cut (open-play only — never a forced shot).
 */
export function previewConversion(
  state: PlayerState,
  opts: { forceShot?: boolean; convFloor?: number; snap?: boolean; busPenalty?: number } = {},
): number {
  const full = state.xg >= PRESSURE_FULL;
  const openPlay = full || opts.snap === true;
  if (!openPlay && !opts.forceShot) return 0;

  // Natural base applies to any open-play shot (full meter or a Snap Shot); a forced shot below full
  // takes its quality entirely from the tactical's convFloor.
  let p = openPlay ? BASE_CONVERSION : 0;
  p += Math.min((state.missStreak ?? 0) * PITY_STEP, PITY_CAP);
  p += (Math.min(state.momentum, 3) / 3) * MOMENTUM_CONVERSION;
  // Park the Bus only blunts open-play shots; forced shots (set via convFloor below) ignore it.
  if (openPlay && opts.busPenalty) p -= opts.busPenalty;
  if (opts.convFloor !== undefined) p = Math.max(p, opts.convFloor);
  return clamp(p, openPlay || opts.convFloor !== undefined ? CONVERSION_FLOOR : 0, CONVERSION_CAP);
}

/**
 * Resolves a shot for the player. A shot happens when the meter is full, a tactical forces one, or
 * (v12) a Snap Shot fires on a near-maxed attacking round with a partial meter. It rolls P:
 *   - GOAL → goals += 1, meter empties to 0, miss-streak resets.
 *   - MISS (full meter) → meter drops by MISS_DROP_FRAC, miss-streak increments (raises pity).
 *   - Snap Shot (goal OR miss) → meter resets to 0, miss-streak untouched (a spent tempo gamble).
 * Returns the shot outcome (also stored on state.lastShot by the caller). GDD §7 / §14.
 */
export function takeShot(state: PlayerState, opts: ShotOpts): ShotResult {
  const forced = opts.forceShot === true;
  const full = state.xg >= PRESSURE_FULL;

  // v12 Snap Shot: with no full meter and no forced shot, a dominant attacking round (xgRound near
  // the cap) has a slim chance of an early shot on the partial meter.
  let snap = false;
  if (!full && !forced) {
    const snapEnabled = opts.snapEnabled !== false;
    const snapChance = snapEnabled
      ? clamp(((opts.xgRound ?? 0) - SNAP_THRESHOLD) * SNAP_SCALE, 0, SNAP_CAP)
      : 0;
    if (snapChance > 0 && opts.rng.next() < snapChance) snap = true;
    else return { took: false, scored: false, p: 0 };
  }

  // Forced shots ignore Park the Bus (you can't park the bus against a penalty).
  const busPenalty = forced ? 0 : opts.busPenalty ?? 0;
  const p = previewConversion(state, {
    forceShot: forced,
    convFloor: opts.convFloor,
    snap,
    busPenalty,
  });
  const scored = opts.rng.next() < p;

  if (scored) {
    state.goals += 1;
    if (state.scoredFirstAt === null) state.scoredFirstAt = opts.round;
    state.xg = 0;
    state.missStreak = 0;
  } else if (snap) {
    // A Snap Shot spends the build-up: the meter resets whether it goes in or not (pity untouched).
    state.xg = 0;
  } else {
    state.xg = state.xg * (1 - MISS_DROP_FRAC);
    state.missStreak = (state.missStreak ?? 0) + 1;
  }

  return { took: true, scored, p, snap, busApplied: busPenalty > 0 };
}
