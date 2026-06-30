/**
 * Delivery projections — split the authoritative MatchState into what each client may see.
 *
 * - publicState: visible to BOTH players. Always carries the scoreline + xG meters + round/phase.
 *   During `plan` it is "a-ciegas": it exposes only each side's PLAYED TACTICALS (face-up by
 *   design) and lock-in status — never the hidden lineup, formation, or card counts. At `reveal`
 *   it carries the full perspective-neutral RoundResult (both boards revealed).
 * - privateView(idx): visible ONLY to player idx (RLS-scoped). Their hand, stamina, captain, etc.
 *   The opponent's hand/deck is never projected anywhere a client can read it.
 */

import type {
  Card,
  Formation,
  MatchState,
  PlayerCard,
  PlayerState,
  TacticalCard,
} from "../index.ts";
import type { Commit } from "./types.ts";
import type { RoundResult } from "./resolve.ts";

export type RoomStatus = "lobby" | "playing" | "finished" | "abandoned";

/** Static, non-secret label for a side (shown to the opponent). */
export interface PlayerMeta {
  displayName: string;
  captainNation: string;
}

/** Per-player commit-in-progress held server-side during a planning window. */
export interface PendingCommit {
  formation: Formation;
  attackIds: string[];
  defenseIds: string[];
  tacticalIds: string[];
  lockedIn: boolean;
}

export const EMPTY_PENDING: PendingCommit = {
  formation: "balanced",
  attackIds: [],
  defenseIds: [],
  tacticalIds: [],
  lockedIn: false,
};

/** Builds the full engine Commit from a pending commit (drops the lock flag). */
export function pendingToCommit(p: PendingCommit): Commit {
  return {
    formation: p.formation,
    attackIds: p.attackIds,
    defenseIds: p.defenseIds,
    tacticalIds: p.tacticalIds,
  };
}

/** The a-ciegas planning surface — no lineup/intent, just played tacticals + lock status. */
export interface PublicPlan {
  lockedIn: [boolean, boolean];
  playedTacticals: [TacticalCard[], TacticalCard[]];
  /** Epoch ms after which either client may force resolution. */
  planDeadline: number | null;
}

export interface PublicState {
  status: RoomStatus;
  round: number;
  extraTime: boolean;
  phase: "plan" | "reveal";
  winner: 0 | 1 | null;
  goals: [number, number];
  /** xG pressure meter [0,1] per side — always visible (GDD §13). */
  meters: [number, number];
  /** Fatigue per side — drives the "heat" glow; visible for both (GDD §13). */
  fatigues: [number, number];
  /** Active match-long Power tacticals per side (played face-up, so public). */
  powers: [TacticalCard[], TacticalCard[]];
  meta: [PlayerMeta, PlayerMeta];
  /**
   * Epoch ms after which the current planning window may be force-resolved. Mirrors
   * plan.planDeadline but is ALSO carried on the reveal state so the client can show/run the
   * countdown for the upcoming round (the reveal carries no `plan`). Null when the match has ended.
   */
  planDeadline: number | null;
  /**
   * Rematch votes after a finished match — [creator, joiner]. The server starts a fresh match
   * only once BOTH are true; until then the result screen shows a "waiting for opponent" handshake.
   */
  rematch?: [boolean, boolean];
  /** Present while phase === 'plan'. */
  plan?: PublicPlan;
  /** Present while phase === 'reveal'. */
  reveal?: RoundResult;
}

/** Everything player `idx` needs to render their own side and plan their turn (their own cards). */
export interface PrivateView {
  index: 0 | 1;
  /** The round this hand is for (post-reveal, this is already the NEXT round). */
  round: number;
  extraTime: boolean;
  hand: Card[];
  drawPile: Card[];
  discard: Card[];
  exiled: Card[];
  locked: Card[];
  powers: TacticalCard[];
  stamina: number;
  maxStamina: number;
  tacticalsThisHalf: number;
  captainId: string;
  formation: Formation;
}

function meters(m: MatchState): [number, number] {
  return [Math.min(1, m.players[0]!.xg), Math.min(1, m.players[1]!.xg)];
}

function goals(m: MatchState): [number, number] {
  return [m.players[0]!.goals, m.players[1]!.goals];
}

function fatigues(m: MatchState): [number, number] {
  return [m.players[0]!.fatigue, m.players[1]!.fatigue];
}

function powersPair(m: MatchState): [TacticalCard[], TacticalCard[]] {
  return [m.players[0]!.powers, m.players[1]!.powers];
}

/** Resolve a list of tactical ids against a hand into the face-up tactical cards. */
function tacticalsFromHand(state: PlayerState, ids: string[]): TacticalCard[] {
  const out: TacticalCard[] = [];
  for (const id of ids) {
    const c = state.hand.find((h) => h.id === id && h.type === "tactical");
    if (c) out.push(c as TacticalCard);
  }
  return out;
}

/** Public state during the planning window (a-ciegas). */
export function publicPlanState(
  m: MatchState,
  meta: [PlayerMeta, PlayerMeta],
  pending: [PendingCommit, PendingCommit],
  planDeadline: number | null,
): PublicState {
  return {
    status: "playing",
    round: m.round,
    extraTime: m.extraTime,
    phase: "plan",
    winner: m.winner,
    goals: goals(m),
    meters: meters(m),
    fatigues: fatigues(m),
    powers: powersPair(m),
    meta,
    planDeadline,
    plan: {
      lockedIn: [pending[0].lockedIn, pending[1].lockedIn],
      playedTacticals: [
        tacticalsFromHand(m.players[0]!, pending[0].tacticalIds),
        tacticalsFromHand(m.players[1]!, pending[1].tacticalIds),
      ],
      planDeadline,
    },
  };
}

/**
 * Public state at reveal — carries the full neutral round result (both boards revealed).
 * `m` is the POST-resolve match (for the up-to-date fatigue/powers shown on the board).
 */
export function publicRevealState(
  m: MatchState,
  meta: [PlayerMeta, PlayerMeta],
  result: RoundResult,
  nextPlanDeadline: number | null,
): PublicState {
  return {
    status: result.winner !== null ? "finished" : "playing",
    round: result.round,
    extraTime: result.extraTime,
    phase: "reveal",
    winner: result.winner,
    goals: [result.sides[0].goalsTotal, result.sides[1].goalsTotal],
    meters: [result.sides[0].pressureAfter, result.sides[1].pressureAfter],
    fatigues: fatigues(m),
    powers: powersPair(m),
    meta,
    // The reveal carries no `plan`, so the upcoming round's deadline rides here for the countdown.
    planDeadline: nextPlanDeadline,
    reveal: result,
  };
}

/** Private, RLS-scoped view for one player — only that player's own cards. */
export function privateView(m: MatchState, idx: 0 | 1): PrivateView {
  const p = m.players[idx]!;
  return {
    index: idx,
    round: m.round,
    extraTime: m.extraTime,
    hand: p.hand,
    drawPile: p.drawPile,
    discard: p.discard,
    exiled: p.exiled,
    locked: p.locked,
    powers: p.powers,
    stamina: p.stamina,
    maxStamina: p.maxStamina,
    tacticalsThisHalf: p.tacticalsThisHalf,
    captainId: p.captainId,
    formation: p.formation,
  };
}

/** Minimal placeholder OpponentTeam for newMatch (the engine never reads it during resolution). */
export function placeholderOpponent(squad: PlayerCard[] = []): MatchState["opponent"] {
  return {
    id: "mp-opponent",
    name: "Opponent",
    nation: squad[0]?.nation ?? "",
    year: 0,
    tier: "C",
    strength: 0,
    squad,
    preferredFormation: "balanced",
    isChampion: false,
  };
}

/** Captain nation for the meta label, looked up from a deck. */
export function captainNation(deck: Card[], captainId: string): string {
  const cap = deck.find((c) => c.id === captainId && c.type === "player");
  return (cap as PlayerCard | undefined)?.nation ?? "";
}
