/**
 * Pure helpers that turn the server's perspective-neutral projections into a MatchState (and the
 * RevealBoards / RoundReport props) for the existing MatchBoard — always with the LOCAL player at
 * players[0] ("you"). Extracted from the hook so the perspective mapping is unit-testable.
 */

import type {
  CardInPlay,
  MatchState,
  OpponentTeam,
  PlayerState,
} from "../../engine/types";
import type { RevealBoards, RoundReport, SideReport } from "../quickplay/useQuickplayMatch";
import type { PublicState, PrivateView, RoundResult, SideRound } from "../../engine/multiplayer";

export function placeholderTeam(name: string, nation: string): OpponentTeam {
  return {
    id: "mp",
    name,
    nation,
    year: 0,
    tier: "C",
    strength: 0,
    squad: [],
    preferredFormation: "balanced",
    isChampion: false,
  };
}

/** Synthetic "you" PlayerState from the private view + the public scoreline/meters. */
export function synthSelf(pv: PrivateView, pub: PublicState, idx: 0 | 1): PlayerState {
  return {
    goals: pub.goals[idx],
    xg: pub.meters[idx],
    fatigue: pub.fatigues[idx],
    scoredFirstAt: null,
    maxStamina: pv.maxStamina,
    stamina: pv.stamina,
    drawPile: pv.drawPile,
    hand: pv.hand,
    discard: pv.discard,
    locked: pv.locked,
    exiled: pv.exiled,
    tacticalsThisHalf: pv.tacticalsThisHalf,
    tacticSpent: 0,
    tacticBonus: 0,
    board: { attack: [], defense: [] },
    formation: pv.formation,
    powers: pv.powers,
    captainId: pv.captainId,
    momentum: 0,
    handOfGodUsed: false,
  };
}

/** Synthetic "them" PlayerState from public info only — never the opponent's hidden cards. */
export function synthOpponent(pub: PublicState, idx: 0 | 1): PlayerState {
  return {
    goals: pub.goals[idx],
    xg: pub.meters[idx],
    fatigue: pub.fatigues[idx],
    scoredFirstAt: null,
    maxStamina: 0,
    stamina: 0,
    drawPile: [],
    hand: [],
    discard: [],
    locked: [],
    exiled: [],
    tacticalsThisHalf: 0,
    tacticSpent: 0,
    tacticBonus: 0,
    board: { attack: [], defense: [] },
    formation: "balanced",
    powers: pub.powers[idx],
    captainId: "",
    momentum: 0,
    handOfGodUsed: false,
  };
}

function sideReport(s: SideRound): SideReport {
  return {
    atkEff: s.atkEff,
    defEff: s.defEff,
    formation: s.formation,
    atkMult: s.atkMult,
    defMult: s.defMult,
    fatigue: s.fatigue,
    fatigueDefMult: s.fatigueDefMult,
    rarityBonus: s.rarityBonus,
    synAtk: s.synAtk,
    synDef: s.synDef,
    scored: s.goalsThisRound > 0,
    xg: s.xg,
    shot: s.shot,
    pressureBefore: s.pressureBefore,
    pressureAfter: s.pressureAfter,
  };
}

/** Map the neutral RoundResult to "you"/"them" for this player. */
export function mapReveal(
  result: RoundResult,
  selfIdx: 0 | 1,
): { revealBoards: RevealBoards; roundReport: RoundReport } {
  const oppIdx = (selfIdx === 0 ? 1 : 0) as 0 | 1;
  const you = result.sides[selfIdx];
  const them = result.sides[oppIdx];
  const revealUp = (cips: CardInPlay[]): CardInPlay[] => cips.map((c) => ({ ...c, faceDown: false }));
  return {
    revealBoards: {
      you: { attack: revealUp(you.board.attack), defense: revealUp(you.board.defense) },
      them: { attack: revealUp(them.board.attack), defense: revealUp(them.board.defense) },
    },
    roundReport: {
      round: result.round,
      extraTime: result.extraTime,
      halftime: result.halftime,
      youXg: you.xg,
      themXg: them.xg,
      youGoalsThisRound: you.goalsThisRound,
      themGoalsThisRound: them.goalsThisRound,
      youGoalsTotal: you.goalsTotal,
      themGoalsTotal: them.goalsTotal,
      decided: result.decided,
      you: sideReport(you),
      them: sideReport(them),
    },
  };
}

/** Assemble the synthetic MatchState MatchBoard renders (self always at players[0]). */
export function synthMatch(
  pub: PublicState,
  pv: PrivateView | null,
  selfIdx: 0 | 1,
  isReveal: boolean,
): MatchState {
  const oppIdx = (selfIdx === 0 ? 1 : 0) as 0 | 1;
  const self = pv ? synthSelf(pv, pub, selfIdx) : synthOpponent(pub, selfIdx);
  const them = synthOpponent(pub, oppIdx);
  const round = isReveal && pub.reveal ? pub.reveal.round : pv?.round ?? pub.round;
  const extraTime = isReveal && pub.reveal ? pub.reveal.extraTime : pv?.extraTime ?? pub.extraTime;
  return {
    round,
    extraTime,
    etRound: 0,
    players: [self, them],
    opponent: placeholderTeam(pub.meta[oppIdx].displayName, pub.meta[oppIdx].captainNation),
    phase: isReveal ? "reveal" : "plan",
    winner: pub.winner === null ? null : pub.winner === selfIdx ? 0 : 1,
  };
}
