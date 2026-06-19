/**
 * WCC-007/WCC-008 — Effective-stats pipeline + formation multipliers (GDD v10 §7 / §9 / §17).
 *
 * Fold order (GDD §7 line 168):
 *   a. stat × rarityMult per card
 *   b. laneStack (sorted-desc × STACK_WEIGHTS diminishing returns)
 *   c. synergies & Captain's Pride (+ATK/+DEF deltas)
 *   d. formation multipliers (×atkMult / ×defMult)
 *   e. fatigue penalty on DEF (×(1 - F/FATIGUE_DIV))
 *   f. active tacticals / xG modifiers (applied in resolveRound)
 *
 * StatusMods (injured/pressed flat penalties) are applied within atkOf/defOf
 * before laneStack so they reduce the raw contribution of an affected card.
 */

import type { CardInPlay, PlayerCard, Formation, PlayerState } from "./types.ts";
import { RARITY_MULT, STACK_WEIGHTS, FORMATIONS } from "./constants.ts";
import { statusMods } from "./status.ts";
import { applyFatiguePenalty } from "./fatigue.ts";
import { computeSynergies } from "./synergies.ts";

/**
 * Raw ATK contribution of a single card in play, adjusted for rarity and status.
 * GDD §17 `atkOf`.
 */
export function atkOf(card: CardInPlay): number {
  if (card.card.type !== "player") return 0;
  const p = card.card as PlayerCard;
  const mods = statusMods(card);
  return Math.max(0, (p.atk + mods.atkFlat) * mods.atkMult * RARITY_MULT[p.rarity]);
}

/**
 * Raw DEF contribution of a single card in play, adjusted for rarity and status.
 * GDD §17 `defOf`.
 */
export function defOf(card: CardInPlay): number {
  if (card.card.type !== "player") return 0;
  const p = card.card as PlayerCard;
  const mods = statusMods(card);
  return Math.max(0, (p.def + mods.defFlat) * mods.defMult * RARITY_MULT[p.rarity]);
}

/**
 * Combines individual lane contributions with v10 diminishing-returns weights.
 * Contributions are sorted descending and multiplied by STACK_WEIGHTS[i].
 * GDD §7 line 168, §17 lines 491-495.
 */
export function laneStack(contribs: number[]): number {
  const sorted = [...contribs].sort((a, b) => b - a);
  let total = 0;
  for (let i = 0; i < sorted.length; i++) {
    const weight = STACK_WEIGHTS[i] ?? 0;
    total += (sorted[i] ?? 0) * weight;
  }
  return total;
}

/**
 * Applies formation ATK/DEF multipliers.
 * WCC-008: thin helper inlined here per plan step 3 (formation is a 2-line multiply).
 * GDD §9 lines 192-196, §17 lines 500-501.
 */
export function applyFormation(
  atk: number,
  def: number,
  formation: Formation,
): { atk: number; def: number } {
  const fo = FORMATIONS[formation];
  return { atk: atk * fo.atkMult, def: def * fo.defMult };
}

/**
 * GK save bonus — added to DEF when a GK is on the defense board.
 * GDD §7 line 168, §17 line 499 `saveBonus(m, p)`.
 */
function saveBonus(defense: CardInPlay[]): number {
  let bonus = 0;
  for (const c of defense) {
    if (c.card.type === "player") {
      const p = c.card as PlayerCard;
      if (p.position === "GK" && p.saveBonus !== undefined) {
        bonus += p.saveBonus;
      }
    }
  }
  return bonus;
}

/** Results of the full effective-stats computation for one player side. */
export interface EffectiveStats {
  atkEff: number;
  defEff: number;
}

/**
 * Computes effective ATK and DEF for a player after the full v10 fold:
 *   laneStack → synergies → formation → fatigue → GK save bonus.
 * Does NOT apply tactical xG modifiers (those are applied in resolveRound).
 * GDD §17 lines 488-502.
 */
export function computeEffectiveStats(state: PlayerState): EffectiveStats {
  const attackCards = state.board.attack;
  const defenseCards = state.board.defense;
  const allCards = [...attackCards, ...defenseCards];

  const rawAtks = attackCards.map(atkOf);
  const rawDefs = defenseCards.map(defOf);

  let atk = laneStack(rawAtks);
  let def = laneStack(rawDefs) + saveBonus(defenseCards);

  const syn = computeSynergies(allCards, state.captainId);
  atk += syn.atk;
  def += syn.def;

  const formed = applyFormation(atk, def, state.formation);
  atk = formed.atk;
  def = formed.def;

  def = applyFatiguePenalty(def, state.fatigue);

  return { atkEff: atk, defEff: def };
}
