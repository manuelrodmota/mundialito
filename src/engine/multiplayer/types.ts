/**
 * Multiplayer (1v1, two humans) shared types — pure, framework-agnostic, Deno-safe.
 *
 * The authoritative match lives server-side (a Supabase Edge Function running this same
 * engine). It is event-sourced: persist the seed + both decks + the ordered move log, and
 * rebuild the live MatchState (and its correctly-advanced RNG) by replaying. See replay.ts.
 *
 * A `Commit` is one player's planned turn expressed by CARD IDs (never card objects), so the
 * server resolves them against that player's authoritative hand — the opponent's hand/deck is
 * never sent to the other client.
 */

import type { Formation, NewMatchInput } from "../index.ts";

/** One player's planned turn for a round, referenced by card id. */
export interface Commit {
  formation: Formation;
  /** Player-card ids fielded in the attack lane (face-down until reveal). */
  attackIds: string[];
  /** Player-card ids fielded in the defense lane (face-down until reveal). */
  defenseIds: string[];
  /** Tactical-card ids played this round (face-up the moment they're committed). */
  tacticalIds: string[];
}

/** The two committed turns that produced one resolved round. */
export interface ResolvedMove {
  commit0: Commit;
  commit1: Commit;
}

/** Everything needed to (re)build a match deterministically from scratch. */
export interface MatchInputs {
  seed: number;
  /** Player 0 = room creator. */
  in0: NewMatchInput;
  /** Player 1 = joiner. */
  in1: NewMatchInput;
}

/** An empty commit — used when a player never locks in before the planning deadline. */
export const EMPTY_COMMIT: Commit = {
  formation: "balanced",
  attackIds: [],
  defenseIds: [],
  tacticalIds: [],
};
