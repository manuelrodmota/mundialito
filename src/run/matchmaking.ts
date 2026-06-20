import type { RunState, OpponentTeam, Tier } from "../engine/types.ts";
import type { Rng } from "../engine/rng.ts";
import { opponents } from "../data/opponents.ts";

/**
 * Tier ordering from weakest to strongest (D < C < B < A < S).
 * Used to compute "tier and above" gates.
 */
const TIER_ORDER: Tier[] = ["D", "C", "B", "A", "S"];

/** Returns the set of tiers eligible for a given bracket stage. */
export function allowedTiersForStage(stage: RunState["stage"]): Tier[] {
  switch (stage) {
    case "group":
      return ["D", "C"];
    case "r16":
      return ["C", "B", "A", "S"];
    case "qf":
      return ["B", "A", "S"];
    case "sf":
      return ["A", "S"];
    case "final":
      return ["S"];
  }
}

/**
 * Weighted draw probability per tier for group-stage opponents.
 * Lower tiers appear more frequently in early rounds.
 */
const GROUP_TIER_WEIGHT: Partial<Record<Tier, number>> = {
  D: 3,
  C: 1,
};

/**
 * Returns a weight for a candidate opponent, used in weighted random selection.
 * Group stages favour lower tiers; all other stages are uniform.
 */
function weightFor(stage: RunState["stage"], team: OpponentTeam): number {
  if (stage === "group") {
    return GROUP_TIER_WEIGHT[team.tier] ?? 1;
  }
  return 1;
}

/**
 * Draws a stage-appropriate opponent from the static pool.
 *
 * Filters by allowed tiers for the stage, excludes already-defeated opponents,
 * and selects via weighted random using the seeded Rng. The Final always
 * returns a champion (isChampion=true / tier="S").
 *
 * Throws if no eligible opponent exists (e.g. all champions already defeated).
 */
export function drawOpponent(
  stage: RunState["stage"],
  defeated: string[],
  rng: Rng,
): OpponentTeam {
  const allowed = new Set(allowedTiersForStage(stage));
  const defeatedSet = new Set(defeated);

  const candidates = opponents.filter(
    (t) => allowed.has(t.tier) && !defeatedSet.has(t.id),
  );

  if (stage === "final") {
    const champCandidates = candidates.filter((t) => t.isChampion);
    if (champCandidates.length === 0) {
      throw new Error(
        "No eligible champion opponent for the Final — all Tier-S teams already defeated.",
      );
    }
    return pickWeighted(champCandidates, stage, rng);
  }

  if (candidates.length === 0) {
    throw new Error(
      `No eligible opponents for stage "${stage}" — all allowed-tier teams already defeated.`,
    );
  }

  return pickWeighted(candidates, stage, rng);
}

/** Selects one team from candidates using weighted random via the seeded Rng. */
function pickWeighted(
  candidates: OpponentTeam[],
  stage: RunState["stage"],
  rng: Rng,
): OpponentTeam {
  const weights = candidates.map((t) => weightFor(stage, t));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  let roll = rng.next() * totalWeight;

  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i]!;
    if (roll <= 0) {
      return candidates[i]!;
    }
  }

  return candidates[candidates.length - 1]!;
}

/** Re-exports the tier ordering for downstream use (e.g. tests). */
export { TIER_ORDER };
