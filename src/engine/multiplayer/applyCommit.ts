/**
 * Applies a player's Commit (card ids) to their authoritative PlayerState.
 *
 * This mirrors the single-player UI commit path (useQuickplayMatch.commitTurn) exactly, but
 * is pure and operates on any PlayerState by id — so the server can apply BOTH players' turns
 * before resolving the round. Tacticals are gated against the committed lineup and powers are
 * routed to the persistent powers shelf, identical to the SP flow.
 */

import type { CardInPlay, PlayerState, TacticalCard } from "../index.ts";
import { tacticalGatePassed, validLineup, TACTICALS_PER_HALF } from "../index.ts";
import type { Commit } from "./types.ts";

export interface ApplyResult {
  committedPlayers: number;
  committedTacticals: number;
  /** Ids in the commit that could not be resolved from the hand (or failed a tactical gate). */
  skipped: number;
}

/**
 * Mutates `state`: sets formation, clears the board, and fields the committed cards.
 * Player cards go face-down to their lane; tacticals are played face-up (powers → powers shelf).
 * Ids absent from the hand are skipped (counted in the result), mirroring the SP commit.
 */
export function applyCommit(state: PlayerState, commit: Commit): ApplyResult {
  state.formation = commit.formation;
  state.board.attack = [];
  state.board.defense = [];

  let committedPlayers = 0;
  let committedTacticals = 0;
  let skipped = 0;

  const field = (id: string, lane: "attack" | "defense"): void => {
    const handIdx = state.hand.findIndex((c) => c.id === id);
    if (handIdx === -1) {
      skipped += 1;
      return;
    }
    const [removed] = state.hand.splice(handIdx, 1);
    if (!removed || removed.type !== "player") {
      skipped += 1;
      return;
    }
    const cip: CardInPlay = { card: removed, lane, statuses: [], faceDown: true };
    state.board[lane].push(cip);
    committedPlayers += 1;
  };

  for (const id of commit.attackIds) field(id, "attack");
  for (const id of commit.defenseIds) field(id, "defense");

  for (const id of commit.tacticalIds) {
    const handIdx = state.hand.findIndex((c) => c.id === id && c.type === "tactical");
    if (handIdx === -1) {
      skipped += 1;
      continue;
    }
    const tac = state.hand[handIdx] as TacticalCard;
    // Gate against the now-complete lineup (e.g. Long Ball needs a FWD up front), as in SP.
    if (!tacticalGatePassed(state, tac.effect)) {
      skipped += 1;
      continue;
    }
    state.hand.splice(handIdx, 1);
    if (tac.category === "power") {
      state.powers.push(tac);
    } else {
      state.board.attack.push({ card: tac, lane: "attack", statuses: [], faceDown: false });
    }
    state.tacticalsThisHalf += 1;
    committedTacticals += 1;
  }

  return { committedPlayers, committedTacticals, skipped };
}

/**
 * Validates a Commit against a freshly-replayed clone of the player's plan-phase state.
 * Returns `{ ok: false, reason }` for illegal moves so the server can reject them — the core
 * anti-cheat guard. Never mutates the passed-in state (it clones first).
 */
export function validateCommit(
  state: PlayerState,
  commit: Commit,
  round: number,
): { ok: true } | { ok: false; reason: string } {
  const tacticalsLeft = TACTICALS_PER_HALF - state.tacticalsThisHalf;
  if (commit.tacticalIds.length > tacticalsLeft) {
    return { ok: false, reason: `too many tacticals this half (${tacticalsLeft} left)` };
  }

  const clone = structuredClone(state);
  const result = applyCommit(clone, commit);
  if (result.skipped > 0) {
    return { ok: false, reason: "commit references cards not in hand (or a failed tactical gate)" };
  }
  if (!validLineup(clone, round)) {
    return { ok: false, reason: "lineup exceeds the card cap or stamina budget" };
  }
  return { ok: true };
}
