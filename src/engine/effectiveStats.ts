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
import {
  RARITY_MULT,
  STACK_WEIGHTS,
  FORMATIONS,
  COST_BY_RARITY,
  STAR_SYNERGY_DISCOUNT,
} from "./constants.ts";
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

/** Per-card decoration of a lane so the UI can surface the two v10 levers. §6 / §7 / §17 */
export interface LaneDecor {
  /** Diminishing-returns multiplier this card earns by its contribution rank. */
  weight: number;
  /** Contribution rank within the lane (0 = biggest contributor). */
  rank: number;
  /** Full per-round stamina cost, before the star-core discount. */
  base: number;
  /** Discounted per-round stamina actually paid (anchor = base; support = floor(base/2), min 1). */
  payCost: number;
  /** "anchor" (costliest card in a premium-bearing lane), "support", or null when no core is active. */
  coreRole: "anchor" | "support" | null;
  /** Raw stat contribution (stat × rarity multiplier) — the same value `laneStack` sorts. */
  contrib: number;
  /** Effective contribution after diminishing returns (contrib × weight). */
  effContrib: number;
}

/** Lane-group summary of the two v10 levers, ready for the match UI. §6 / §7 */
export interface LaneFx {
  /** Percent of raw stats lost to diminishing returns — the "−N% stacked" figure. */
  lossPct: number;
  /** Stamina saved this round by the star-core discount — the "−N⚡ star core" figure. */
  saved: number;
  /** True when a premium card anchors the lane. */
  starcore: boolean;
}

/**
 * Read-only, derived per-card decoration of a face-up lane — lets the UI SHOW the two v10
 * balance levers without re-deriving (or drifting from) the resolution math. Uses the same
 * descending-contribution sort as {@link laneStack} and the same anchor / half-price rule as
 * `laneStamina`. Pure: it never mutates state and is never called by resolution. GDD §6 / §7 / §17.
 *
 * Operates on raw player cards (pre-commit staging, no statuses) — for the staging UI the
 * contribution is `stat × rarityMult`, exactly the value `laneStack` consumes.
 */
export function laneDecor(cards: PlayerCard[], lane: "attack" | "defense"): LaneDecor[] {
  if (cards.length === 0) return [];

  const statOf = (c: PlayerCard) =>
    (lane === "defense" ? c.def : c.atk) * RARITY_MULT[c.rarity];
  const contrib = cards.map(statOf);

  // Rank indices by contribution, high→low, stable on ties — matches laneStack's sort.
  const order = cards.map((_, i) => i).sort((a, b) => (contrib[b] - contrib[a]) || (a - b));
  const weightAt: number[] = [];
  order.forEach((idx, rank) => {
    weightAt[idx] = rank < STACK_WEIGHTS.length ? STACK_WEIGHTS[rank] : 0;
  });

  const hasPremium = cards.some((c) => c.rarity !== "common");
  const coreActive = hasPremium && cards.length >= 2;
  let anchor = 0;
  for (let i = 1; i < cards.length; i++) {
    if (COST_BY_RARITY[cards[i].rarity] > COST_BY_RARITY[cards[anchor].rarity]) anchor = i;
  }

  return cards.map((c, i) => {
    const base = COST_BY_RARITY[c.rarity];
    const support = coreActive && i !== anchor;
    const weight = weightAt[i] ?? 0;
    return {
      weight,
      rank: order.indexOf(i),
      base,
      payCost: support ? Math.max(1, Math.floor(base * STAR_SYNERGY_DISCOUNT)) : base,
      coreRole: coreActive ? (i === anchor ? "anchor" : "support") : null,
      contrib: contrib[i],
      effContrib: contrib[i] * weight,
    };
  });
}

/**
 * Lane-group summary of {@link laneDecor} for the match UI: the diminishing-returns loss %,
 * the star-core stamina saved this round, and whether a premium anchors the lane. Returns null
 * for lanes with fewer than 2 cards (nothing to stack or discount). GDD §6 / §7.
 */
export function laneFx(cards: PlayerCard[], lane: "attack" | "defense"): LaneFx | null {
  if (cards.length < 2) return null;
  const decor = laneDecor(cards, lane);
  const raw = decor.reduce((s, d) => s + d.contrib, 0);
  const eff = decor.reduce((s, d) => s + d.effContrib, 0);
  const saved = decor.reduce((s, d) => s + (d.base - d.payCost), 0);
  return {
    lossPct: raw > 0 ? Math.round((1 - eff / raw) * 100) : 0,
    saved,
    starcore: decor.some((d) => d.coreRole === "anchor"),
  };
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
