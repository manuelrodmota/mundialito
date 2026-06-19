/**
 * WCC-010 — Fatigue system (GDD v10 §8 / §17).
 *
 * Fatigue (0–30) degrades the defending team's effective DEF each round.
 * Defending increases fatigue; attacking rests it. Both halftime and ET
 * entry clear fatigue to 0.
 */

import type { PlayerState, CardInPlay } from "./types.ts";
import { FATIGUE_MAX, FATIGUE_DIV, FATIGUE_GAIN, FATIGUE_LOSS } from "./constants.ts";
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
 * Defense-heavy rounds increase fatigue; attack-heavy rest it; balanced is neutral.
 * Result is clamped to keep total fatigue within [0, FATIGUE_MAX]. GDD §8 lines 179-180.
 */
export function fatigueDelta(
  attack: CardInPlay[],
  defense: CardInPlay[],
  currentFatigue: number,
): number {
  const shape = roundShape(attack, defense);
  let delta = 0;

  switch (shape) {
    case "defense":
      delta = FATIGUE_GAIN;
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
 * Updates a player's fatigue for the current round based on board allocation.
 * GDD §17 line 522.
 */
export function updateFatigue(state: PlayerState): void {
  const delta = fatigueDelta(
    state.board.attack,
    state.board.defense,
    state.fatigue,
  );
  state.fatigue = clamp(state.fatigue + delta, 0, FATIGUE_MAX);
}

/**
 * Resets fatigue to 0. Called at halftime, ET entry, and by Water Break tactical.
 * GDD §8 line 182.
 */
export function resetFatigue(state: PlayerState): void {
  state.fatigue = 0;
}
