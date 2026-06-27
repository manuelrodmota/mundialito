/**
 * Pure, perspective-neutral round resolution for multiplayer.
 *
 * Ports the report-building from the single-player hook (useQuickplayMatch.reveal) into shared
 * code so the authoritative server can build the round result and the client can render it.
 * Everything here is indexed by player [0,1] (0 = creator, 1 = joiner); each client maps its
 * own index to "you" and the other to "them".
 */

import type {
  CardInPlay,
  Formation,
  MatchState,
  PlayerState,
  ShotResult,
  Rng,
} from "../index.ts";
import {
  resolveRound,
  computeEffectiveStats,
  computeSynergies,
  FORMATIONS,
  FATIGUE_DIV,
  HALFTIME_ROUND,
  laneStack,
  laneMultiplier,
  atkOf,
  defOf,
} from "../index.ts";

/** Revealed (face-up) snapshot of a board for the reveal animation. */
export interface RevealedBoard {
  attack: CardInPlay[];
  defense: CardInPlay[];
}

/** One side's breakdown of a resolved round. */
export interface SideRound {
  goalsThisRound: number;
  goalsTotal: number;
  /** xG (pressure) this side BUILT this round — the chance created. */
  xg: number;
  shot?: ShotResult;
  formation: Formation;
  atkEff: number;
  defEff: number;
  atkMult: number;
  defMult: number;
  fatigue: number;
  fatigueDefMult: number;
  rarityBonus: number;
  synAtk: number;
  synDef: number;
  pressureBefore: number;
  pressureAfter: number;
  board: RevealedBoard;
}

/** Perspective-neutral result of resolving one round. */
export interface RoundResult {
  round: number;
  extraTime: boolean;
  halftime: boolean;
  decided: boolean;
  winner: 0 | 1 | null;
  sides: [SideRound, SideRound];
}

/** Pre-resolve, perspective-neutral half of a SideRound (stats that resolveRound would clear). */
function preSide(p: PlayerState): Pick<
  SideRound,
  | "formation"
  | "atkEff"
  | "defEff"
  | "atkMult"
  | "defMult"
  | "fatigue"
  | "fatigueDefMult"
  | "rarityBonus"
  | "synAtk"
  | "synDef"
  | "board"
> {
  const eff = computeEffectiveStats(p);
  const syn = computeSynergies([...p.board.attack, ...p.board.defense], p.captainId);
  const fm = FORMATIONS[p.formation];
  const atkBase = laneStack(p.board.attack.map((c) => atkOf(c, false)));
  const defBase = laneStack(p.board.defense.map((c) => defOf(c, false)));
  const rarityBonus =
    atkBase * (laneMultiplier(p.board.attack) - 1) + defBase * (laneMultiplier(p.board.defense) - 1);
  const reveal = (cips: CardInPlay[]): CardInPlay[] => cips.map((c) => ({ ...c, faceDown: false }));
  return {
    formation: p.formation,
    atkEff: Math.round(eff.atkEff),
    defEff: Math.round(eff.defEff),
    atkMult: fm.atkMult,
    defMult: fm.defMult,
    fatigue: p.fatigue,
    fatigueDefMult: 1 - p.fatigue / FATIGUE_DIV,
    rarityBonus: Math.round(rarityBonus),
    synAtk: Math.round(syn.atk),
    synDef: Math.round(syn.def),
    board: { attack: reveal(p.board.attack), defense: reveal(p.board.defense) },
  };
}

/**
 * Resolves the current round (both players' commits must already be applied to their boards).
 * Mutates `match` through resolveRound and returns the perspective-neutral RoundResult. Does NOT
 * deal the next hand — the caller runs startRound when `winner === null`.
 */
export function resolveTurn(match: MatchState, rng: Rng): RoundResult {
  const [p0, p1] = match.players;
  const round = match.round;
  const extraTime = match.extraTime;

  const before = [
    { goals: p0.goals, xg: Math.min(1, p0.xg) },
    { goals: p1.goals, xg: Math.min(1, p1.xg) },
  ] as const;

  const pre0 = preSide(p0);
  const pre1 = preSide(p1);

  resolveRound(match, rng);

  const build = (
    p: PlayerState,
    pre: ReturnType<typeof preSide>,
    b: { goals: number; xg: number },
  ): SideRound => ({
    ...pre,
    goalsThisRound: p.goals - b.goals,
    goalsTotal: p.goals,
    xg: p.lastFill ?? 0,
    shot: p.lastShot,
    pressureBefore: b.xg,
    pressureAfter: Math.min(1, p.xg),
  });

  return {
    round,
    extraTime,
    halftime: round === HALFTIME_ROUND,
    decided: match.winner !== null,
    winner: match.winner,
    sides: [build(p0, pre0, before[0]), build(p1, pre1, before[1])],
  };
}
