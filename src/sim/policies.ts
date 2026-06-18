// Deterministic policies for the headless sim.
// baselinePolicy ports §18 / engine8.js::aiPlan for player side (p0).

import type { Rng } from "../engine/rng.ts";
import type { MatchState, TacticalCard, PlayerCard, TacticalKind, Formation } from "../engine/types.ts";
import {
  setFormation,
  place,
  placementCost,
  playTactic,
  canPlayTactic,
  gateMet,
  cardCapFor,
} from "../engine/engine.ts";

/** Decision-making interface for one side of a match. */
export interface Policy {
  /** Called once per round during the plan phase; must drive state mutations via engine API. */
  plan(state: MatchState, side: 0 | 1, rng: Rng): void;
}

function laneCount(state: MatchState, side: 0 | 1): number {
  const P = state.players[side];
  return P.board.attack.length + P.board.defense.length;
}

/**
 * Baseline policy — mirrors engine8.js::aiPlan logic for the player side (p0).
 * Side-agnostic: works for either side when the engine's AI is not running.
 *
 * For side 1 (AI), the engine's built-in aiPlan already runs inside startRound;
 * this policy is only needed when driving p0 in the sim.
 */
export const baselinePolicy: Policy = {
  plan(state: MatchState, side: 0 | 1, rng: Rng): void {
    if (side !== 0) return;
    const T = state.T;
    const P = state.players[0];
    const Y = state.players[1];
    const find = (k: TacticalKind) =>
      P.hand.find((c) => c.type === "tactical" && c.effect.kind === k) as
        | TacticalCard
        | undefined;
    const aff = (c: { cost: number }) => P.stamina >= c.cost;
    const tryTactic = (c: TacticalCard) => {
      if (!canPlayTactic(state, 0, c).ok) return;
      playTactic(state, c, rng);
    };

    // 0. Formation — mirror aiPlan heuristic
    const lead = P.goals - Y.goals;
    let form: Formation = "balanced";
    if (lead < 0 || P.fatigue >= 16 || Y.goals >= T.mercyLead - 1) form = "offensive";
    else if (lead > 0 && P.fatigue < 10 && Y.xg < 0.65) form = "defensive";
    setFormation(state, form);

    // 1. Water break
    const wb = find("waterBreak");
    if (wb && P.fatigue >= 14) tryTactic(wb);

    // 2. Substitution
    const sub = find("substitution");
    if (
      sub &&
      aff(sub) &&
      (P.hand.filter((c) => c.type === "player").length <= 2 || P.fatigue >= 20)
    )
      tryTactic(sub);

    // 3. Early powers (rounds 1–4)
    if (state.round <= 4) {
      (["fortress", "talisman", "totalFootball"] as TacticalKind[]).forEach((k) => {
        const c = find(k);
        if (c && aff(c) && P.stamina >= c.cost + 2) tryTactic(c);
      });
    }

    // 4. Place players — attack budget then defense
    const mode = form === "offensive" ? 0.7 : form === "defensive" ? 0.4 : 0.55;
    const hasInstants = P.hand.some((c) => c.type === "tactical" && c.category === "instant");
    const reserve = state.round >= 3 && hasInstants ? 2 : 0;
    const cap = cardCapFor(T, state.round, state.extraTime);
    const atCap = () => laneCount(state, 0) >= cap;

    const atkBudget = Math.round((P.stamina - reserve) * mode);
    let spentA = 0;
    P.hand
      .filter((c) => c.type === "player" && (c as PlayerCard).position !== "GK")
      .sort((a, b) => (b as PlayerCard).atk - (a as PlayerCard).atk)
      .forEach((c) => {
        const pc = c as PlayerCard;
        const cost = placementCost(state, 0, pc, "attack");
        if (!atCap() && P.hand.includes(c) && spentA + cost <= atkBudget && P.stamina >= cost) {
          if (place(state, pc, "attack")) spentA += cost;
        }
      });
    P.hand
      .filter((c) => c.type === "player")
      .sort((a, b) => (b as PlayerCard).def - (a as PlayerCard).def)
      .forEach((c) => {
        const pc = c as PlayerCard;
        const cost = placementCost(state, 0, pc, "defense");
        if (!atCap() && P.hand.includes(c) && P.stamina >= cost && P.stamina - cost >= reserve)
          place(state, pc, "defense");
      });

    // 5. Gated swings
    const pen = find("penalty");
    if (
      pen &&
      aff(pen) &&
      gateMet(P, "penalty") &&
      (P.xg >= 0.35 || lead < 0 || state.round >= 7)
    )
      tryTactic(pen);

    const hog = find("handOfGod");
    if (
      hog &&
      aff(hog) &&
      !P.hogUsed &&
      gateMet(P, "handOfGod") &&
      (Y.goals >= T.mercyLead - 1 || (lead < 0 && state.round >= 6))
    )
      tryTactic(hog);

    const lb = find("longBall");
    if (lb && aff(lb) && gateMet(P, "longBall") && lead < 0) tryTactic(lb);

    const nutT = find("nutmeg");
    if (
      nutT &&
      aff(nutT) &&
      gateMet(P, "nutmeg") &&
      P.board.attack.some((c) => c.position === "FWD" && c.atk >= 85)
    )
      tryTactic(nutT);

    const tt = find("tikiTaka");
    if (tt && aff(tt) && gateMet(P, "tikiTaka") && P.board.attack.length >= 2) tryTactic(tt);

    const cat = find("catenaccio");
    if (
      cat &&
      aff(cat) &&
      gateMet(P, "catenaccio") &&
      (Y.xg >= 0.55 || (lead > 0 && mode <= 0.45))
    )
      tryTactic(cat);

    const ca = find("counterAttack");
    if (ca && aff(ca) && gateMet(P, "counterAttack") && mode <= 0.45) tryTactic(ca);

    const off = find("offsideTrap");
    if (off && aff(off) && gateMet(P, "offsideTrap") && state.round >= 2 && mode <= 0.55)
      tryTactic(off);

    const hp = find("highPress");
    if (
      hp &&
      aff(hp) &&
      gateMet(P, "highPress") &&
      state.round >= 2 &&
      Y.fatigue < T.fatigueMax - 4
    )
      tryTactic(hp);

    if (state.round >= 3) {
      const rf = find("referee");
      if (rf && aff(rf)) tryTactic(rf);
    }
    if (state.round >= 4) {
      const inj = find("injury");
      if (inj && aff(inj)) tryTactic(inj);
    }

    const tw = find("timeWasting");
    if (tw && aff(tw) && lead > 0 && state.round >= 6) tryTactic(tw);
  },
};
