// Multiplayer (1v1) shared pure module — used by both the client and the authoritative server.

export type { Commit, ResolvedMove, MatchInputs } from "./types.ts";
export { EMPTY_COMMIT } from "./types.ts";

export { applyCommit, validateCommit } from "./applyCommit.ts";
export type { ApplyResult } from "./applyCommit.ts";

export { resolveTurn } from "./resolve.ts";
export type { RoundResult, SideRound, RevealedBoard } from "./resolve.ts";

export { buildMatch, replayMoves, resolvePending } from "./replay.ts";
export type { MatchHandle, ResolveOutcome } from "./replay.ts";

export {
  publicPlanState,
  publicRevealState,
  privateView,
  pendingToCommit,
  placeholderOpponent,
  captainNation,
  EMPTY_PENDING,
} from "./views.ts";
export type {
  PublicState,
  PrivateView,
  PublicPlan,
  PlayerMeta,
  PendingCommit,
  RoomStatus,
} from "./views.ts";
