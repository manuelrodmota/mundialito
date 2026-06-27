/**
 * Event-sourced replay — the authoritative server's source of truth.
 *
 * The match is persisted as `MatchInputs` (seed + both decks/captains) + an ordered list of
 * `ResolvedMove`s. Replaying from `newMatch` reconstructs both the live MatchState AND the
 * correctly-advanced operational RNG (mulberry32 carries no external state), so each stateless
 * Edge Function invocation rebuilds the exact game with zero RNG serialization.
 */

import type { MatchState, OpponentTeam, Rng } from "../index.ts";
import { newMatch, startRound, makeRng } from "../index.ts";
import { applyCommit } from "./applyCommit.ts";
import { resolveTurn, type RoundResult } from "./resolve.ts";
import type { Commit, MatchInputs, ResolvedMove } from "./types.ts";

export interface MatchHandle {
  match: MatchState;
  /** Operational RNG for startRound/resolveRound, advanced to the live position. */
  rng: Rng;
}

/** Builds a fresh match at the plan phase of round 1 (hands dealt). */
export function buildMatch(inputs: MatchInputs, opp: OpponentTeam): MatchHandle {
  const rng = makeRng(inputs.seed);
  const match = newMatch(inputs.seed, inputs.in0, inputs.in1, opp);
  startRound(match, rng);
  return { match, rng };
}

/**
 * Replays the resolved move log, leaving the match at the plan phase of the next unresolved
 * round (hands dealt) — or ended, if a move log ended the match.
 */
export function replayMoves(
  inputs: MatchInputs,
  opp: OpponentTeam,
  moves: ResolvedMove[],
): MatchHandle {
  const { match, rng } = buildMatch(inputs, opp);
  for (const mv of moves) {
    applyCommit(match.players[0]!, mv.commit0);
    applyCommit(match.players[1]!, mv.commit1);
    resolveTurn(match, rng);
    if (match.winner === null) startRound(match, rng);
  }
  return { match, rng };
}

export interface ResolveOutcome extends MatchHandle {
  result: RoundResult;
  /** The new move log to persist (old log + the just-resolved move). */
  moves: ResolvedMove[];
}

/**
 * Resolves the current round from both pending commits: replays to the current plan phase,
 * applies both commits, resolves, deals the next hand (if the match continues), and returns the
 * round result plus the move log to persist. The single authoritative state transition.
 */
export function resolvePending(
  inputs: MatchInputs,
  opp: OpponentTeam,
  moves: ResolvedMove[],
  commit0: Commit,
  commit1: Commit,
): ResolveOutcome {
  const { match, rng } = replayMoves(inputs, opp, moves);
  applyCommit(match.players[0]!, commit0);
  applyCommit(match.players[1]!, commit1);
  const result = resolveTurn(match, rng);
  if (match.winner === null) startRound(match, rng);
  return { match, rng, result, moves: [...moves, { commit0, commit1 }] };
}
