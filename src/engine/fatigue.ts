/**
 * WCC-010 — Fatigue system (GDD v10 §8 / §17).
 *
 * Fatigue (0–30) degrades the defending team's effective DEF each round.
 * Defending increases fatigue (faster late, and much faster in a defensive formation);
 * attacking rests it. Halftime recovers only part of it; ET entry clears it.
 */

import type { PlayerState, CardInPlay, Formation } from "./types.ts";
import {
  FATIGUE_MAX,
  FATIGUE_DIV,
  FATIGUE_GAIN_FOR,
  FATIGUE_LOSS,
  FORMATIONS,
  HALFTIME_FATIGUE_RECOVERY,
} from "./constants.ts";
import { clamp } from "./util.ts";

/**
 * Applies the fatigue penalty to a DEF value.
 * Formula: `defEff * (1 - fatigue / FATIGUE_DIV)`. GDD §8 line 181, §17 line 502.
 * F=0 → ×1.0; F=15 → ×0.75; F=30 → ×0.5.
 */
export function applyFatiguePenalty(defEff: number, fatigue: number): number {
  return defEff * (1 - fatigue / FATIGUE_DIV);
}

/**
 * Determines whether a committed board is defense-heavy, attack-heavy, or balanced.
 * The heuristic counts weighted card contributions per lane.
 */
function roundShape(
  attack: CardInPlay[],
  defense: CardInPlay[],
): "defense" | "attack" | "balanced" {
  const atkWeight = attack.length;
  const defWeight = defense.length;

  if (defWeight > atkWeight) return "defense";
  if (atkWeight > defWeight) return "attack";
  return "balanced";
}

/**
 * Computes the fatigue delta for a round given the committed board.
 * Defense-heavy rounds increase fatigue (more late in the match via FATIGUE_GAIN_FOR, and scaled by
 * the formation's fatigueMult); attack-heavy rest it; balanced is neutral.
 * Result is clamped to keep total fatigue within [0, FATIGUE_MAX]. GDD §8 lines 179-180.
 */
export function fatigueDelta(
  attack: CardInPlay[],
  defense: CardInPlay[],
  currentFatigue: number,
  round = 1,
  formation: Formation = "balanced",
): number {
  const shape = roundShape(attack, defense);
  let delta = 0;

  switch (shape) {
    case "defense":
      delta = Math.round(FATIGUE_GAIN_FOR(round) * FORMATIONS[formation].fatigueMult);
      break;
    case "attack":
      delta = -FATIGUE_LOSS;
      break;
    case "balanced":
      delta = 0;
      break;
  }

  const newFatigue = clamp(currentFatigue + delta, 0, FATIGUE_MAX);
  return newFatigue - currentFatigue;
}

/**
 * Updates a player's fatigue for the current round based on board allocation, the round number
 * (later rounds tire faster), and the player's formation. GDD §17 line 522.
 */
export function updateFatigue(state: PlayerState, round = 1): void {
  const delta = fatigueDelta(
    state.board.attack,
    state.board.defense,
    state.fatigue,
    round,
    state.formation,
  );
  state.fatigue = clamp(state.fatigue + delta, 0, FATIGUE_MAX);
}

/**
 * Recovers part of a player's fatigue at halftime — HALFTIME_FATIGUE_RECOVERY of it is shaken off,
 * the rest carries into the second half. Replaces the old full wipe so a first-half grind still
 * weighs on the legs after the break. GDD §8 line 182.
 */
export function recoverFatigueAtHalftime(state: PlayerState): void {
  state.fatigue = Math.round(state.fatigue * (1 - HALFTIME_FATIGUE_RECOVERY));
}

/**
 * Resets fatigue to 0. Called at ET entry and by the Water Break / Fresh Legs tactical.
 * GDD §8 line 182.
 */
export function resetFatigue(state: PlayerState): void {
  state.fatigue = 0;
}
