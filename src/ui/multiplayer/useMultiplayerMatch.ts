/**
 * Multiplayer orchestrator — the MP counterpart to useQuickplayMatch.
 *
 * The authoritative match runs server-side (the `mp` Edge Function). This hook never runs the
 * engine: it invokes server actions and subscribes to the room's Realtime projections, then
 * SYNTHESIZES a MatchState for the existing MatchBoard — always placing the local player at
 * players[0] ("you") and the opponent at players[1] ("them"), so MatchBoard needs no perspective
 * changes. The perspective-neutral RoundResult is mapped into the RevealBoards / RoundReport
 * shapes MatchBoard already consumes.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Card, Formation, MatchState, TacticalCard } from "../../engine/types";
import type { RevealBoards, RoundReport } from "../quickplay/useQuickplayMatch";
import type { MatchBoardCommitOptions } from "../organisms/MatchBoard";
import type { PublicState, Commit } from "../../engine/multiplayer";
import * as mp from "../../data/remote/mpClient";
import type { RoomRow, PlayerStateRow } from "../../data/remote/mpClient";
import { synthMatch, mapReveal } from "./synthMatch";

export type MpPhase =
  | "idle"
  | "connecting"
  | "lobby"
  | "planning"
  | "reveal"
  | "result"
  | "abandoned";

export interface MpViewState {
  match: MatchState | null;
  phase: MpPhase;
  error: string | null;
  roomCode: string | null;
  selfIndex: 0 | 1 | null;
  opponentConnected: boolean;
  opponentLockedIn: boolean;
  youLockedIn: boolean;
  planDeadline: number | null;
  /** Rematch handshake (result screen): you've asked / the opponent has asked for a rematch. */
  youWantRematch: boolean;
  opponentWantsRematch: boolean;
  /** Opponent's played tacticals (face-up) — the only lineup info shown during a-ciegas planning. */
  opponentPlayedTacticals: TacticalCard[];
  revealBoards: RevealBoards | null;
  roundReport: RoundReport | null;
  canCommit: boolean;
  /** MatchBoard's phase prop. */
  boardPhase: "playing" | "reveal";
}

const IDLE: MpViewState = {
  match: null,
  phase: "idle",
  error: null,
  roomCode: null,
  selfIndex: null,
  opponentConnected: false,
  opponentLockedIn: false,
  youLockedIn: false,
  planDeadline: null,
  youWantRematch: false,
  opponentWantsRematch: false,
  opponentPlayedTacticals: [],
  revealBoards: null,
  roundReport: null,
  canCommit: false,
  boardPhase: "playing",
};

export interface UseMultiplayerMatchReturn {
  viewState: MpViewState;
  createRoom: (deck: Card[], captainId: string, displayName: string) => Promise<void>;
  joinRoom: (code: string, deck: Card[], captainId: string, displayName: string) => Promise<void>;
  commitTurn: (opts: MatchBoardCommitOptions) => Promise<void>;
  playTactical: (tacticalId: string) => Promise<void>;
  /** Dismiss the reveal and advance to the next planning window (or the result). */
  continueAfterReveal: () => void;
  rematch: () => Promise<void>;
  leave: () => void;
}

export function useMultiplayerMatch(): UseMultiplayerMatchReturn {
  const [viewState, setViewState] = useState<MpViewState>(IDLE);

  const roomIdRef = useRef<string | null>(null);
  const selfIndexRef = useRef<0 | 1 | null>(null);
  const subRef = useRef<mp.RoomSubscription | null>(null);
  const publicRef = useRef<PublicState | null>(null);
  const privateRef = useRef<PlayerStateRow["private_view"] | null>(null);
  const uiPhaseRef = useRef<MpPhase>("idle");
  // Round of the most recent reveal we've presented. The server's public_state stays at "reveal"
  // until the next round is committed, so after the player dismisses a reveal a resync re-reads
  // that same reveal — we must NOT regress them back into it. Only a reveal for a LATER round
  // (a genuinely new resolution) re-enters the reveal. Reset on a new match (rematch / fresh room).
  const lastRevealRoundRef = useRef<number>(-1);

  const patch = useCallback((p: Partial<MpViewState>) => {
    setViewState((prev) => ({ ...prev, ...p }));
  }, []);

  /** Recompute the synthetic MatchState + derived props from the latest server state. */
  const syncView = useCallback(() => {
    const pub = publicRef.current;
    const pv = privateRef.current;
    const selfIdx = selfIndexRef.current;
    const uiPhase = uiPhaseRef.current;
    if (!pub || selfIdx === null) return;
    const oppIdx = (selfIdx === 0 ? 1 : 0) as 0 | 1;

    const isReveal = uiPhase === "reveal" && !!pub.reveal;
    const match: MatchState = synthMatch(pub, pv, selfIdx, isReveal);

    const mapped = isReveal ? mapReveal(pub.reveal!, selfIdx) : null;
    const oppPending = pub.plan?.playedTacticals[oppIdx] ?? [];
    const votes = pub.rematch ?? [false, false];

    patch({
      match,
      phase: uiPhase,
      boardPhase: isReveal ? "reveal" : "playing",
      selfIndex: selfIdx,
      opponentConnected: pub.status === "playing" || pub.status === "finished",
      opponentLockedIn: pub.plan?.lockedIn[oppIdx] ?? false,
      youLockedIn: pub.plan?.lockedIn[selfIdx] ?? false,
      // The reveal carries no `plan`, so fall back to the top-level deadline (next round's window).
      planDeadline: pub.plan?.planDeadline ?? pub.planDeadline ?? null,
      youWantRematch: votes[selfIdx],
      opponentWantsRematch: votes[oppIdx],
      opponentPlayedTacticals: oppPending,
      revealBoards: mapped?.revealBoards ?? null,
      roundReport: mapped?.roundReport ?? null,
      canCommit: uiPhase === "planning" && match.winner === null && !(pub.plan?.lockedIn[selfIdx] ?? false),
    });
  }, [patch]);

  const setUiPhase = useCallback(
    (p: MpPhase) => {
      uiPhaseRef.current = p;
      syncView();
    },
    [syncView],
  );

  const applyPublic = useCallback(
    (ps: PublicState | null) => {
      if (!ps) return;
      publicRef.current = ps;
      if (ps.status === "abandoned") {
        setUiPhase("abandoned");
        return;
      }
      // On the result screen, the only update we act on is a completed rematch — the server resets
      // to a fresh round-1 plan window. Otherwise (e.g. a rematch VOTE landing on the still-finished
      // reveal state) we stay put and just refresh the handshake flags, rather than being yanked
      // back into the reveal cinematic.
      if (uiPhaseRef.current === "result") {
        if (ps.status === "playing" && ps.winner === null && ps.phase === "plan") {
          lastRevealRoundRef.current = -1; // rematch: fresh match, round numbering restarts
          setUiPhase("planning");
        } else {
          syncView();
        }
        return;
      }
      if (ps.phase === "reveal") {
        const revealRound = ps.reveal?.round ?? lastRevealRoundRef.current;
        if (uiPhaseRef.current === "reveal") {
          // Already presenting a reveal — refresh data, keep it on screen for continueAfterReveal().
          syncView();
        } else if (revealRound > lastRevealRoundRef.current) {
          // A genuinely new round just resolved — present its reveal.
          lastRevealRoundRef.current = revealRound;
          setUiPhase("reveal");
        } else {
          // A resync re-reading a reveal we've already advanced past — do NOT regress into it.
          syncView();
        }
      } else if (uiPhaseRef.current !== "reveal") {
        // First plan window after join, or an opponent action during planning.
        if (uiPhaseRef.current === "lobby" || uiPhaseRef.current === "connecting") {
          setUiPhase("planning");
        } else {
          syncView();
        }
      } else {
        // Keep the reveal on screen; just stash the latest for continueAfterReveal().
        syncView();
      }
    },
    [setUiPhase, syncView],
  );

  const subscribe = useCallback(
    (roomId: string) => {
      subRef.current?.unsubscribe();
      subRef.current = mp.subscribeRoom(roomId, {
        onPublic: (row: RoomRow) => {
          if (row.status === "abandoned") {
            setUiPhase("abandoned");
            return;
          }
          applyPublic(row.public_state);
        },
        onPrivate: (row: PlayerStateRow) => {
          privateRef.current = row.private_view;
          syncView();
        },
      });
    },
    [applyPublic, setUiPhase, syncView],
  );

  /** Hydrate once after connecting (Realtime only delivers future changes). */
  const hydrate = useCallback(
    async (roomId: string) => {
      const { room, player } = await mp.fetchRoomState(roomId);
      if (player) privateRef.current = player.private_view;
      if (room) applyPublic(room.public_state);
    },
    [applyPublic],
  );

  const createRoom = useCallback(
    async (deck: Card[], captainId: string, displayName: string) => {
      try {
        patch({ phase: "connecting", error: null });
        uiPhaseRef.current = "connecting";
        const uid = await mp.ensureMpSession();
        const { roomId, code } = await mp.createRoom(deck, captainId, displayName);
        roomIdRef.current = roomId;
        selfIndexRef.current = 0;
        void uid;
        subscribe(roomId);
        uiPhaseRef.current = "lobby";
        patch({ phase: "lobby", roomCode: code, selfIndex: 0 });
        await hydrate(roomId);
      } catch (err) {
        patch({ phase: "idle", error: err instanceof Error ? err.message : String(err) });
      }
    },
    [hydrate, patch, subscribe],
  );

  const joinRoom = useCallback(
    async (code: string, deck: Card[], captainId: string, displayName: string) => {
      try {
        patch({ phase: "connecting", error: null });
        uiPhaseRef.current = "connecting";
        await mp.ensureMpSession();
        const { roomId } = await mp.joinRoom(code, deck, captainId, displayName);
        roomIdRef.current = roomId;
        selfIndexRef.current = 1;
        patch({ selfIndex: 1, roomCode: code.toUpperCase() });
        subscribe(roomId);
        await hydrate(roomId);
      } catch (err) {
        patch({ phase: "idle", error: err instanceof Error ? err.message : String(err) });
      }
    },
    [hydrate, patch, subscribe],
  );

  const commitTurn = useCallback(async (opts: MatchBoardCommitOptions) => {
    const roomId = roomIdRef.current;
    if (!roomId) return;
    const commit: Commit = {
      formation: opts.formation as Formation,
      attackIds: opts.attackCards.map((c) => c.id),
      defenseIds: opts.defenseCards.map((c) => c.id),
      tacticalIds: (opts.tacticals ?? []).map((c) => c.id),
    };
    patch({ youLockedIn: true, canCommit: false });
    try {
      await mp.commitTurn(roomId, commit);
    } catch (err) {
      patch({ youLockedIn: false, error: err instanceof Error ? err.message : String(err) });
    }
  }, [patch]);

  const playTactical = useCallback(async (tacticalId: string) => {
    const roomId = roomIdRef.current;
    if (!roomId) return;
    try {
      await mp.playTactical(roomId, tacticalId);
    } catch (err) {
      patch({ error: err instanceof Error ? err.message : String(err) });
    }
  }, [patch]);

  const continueAfterReveal = useCallback(() => {
    const pub = publicRef.current;
    if (pub?.winner !== null && pub?.winner !== undefined) {
      setUiPhase("result");
      return;
    }
    setUiPhase("planning");
  }, [setUiPhase]);

  const rematch = useCallback(async () => {
    const roomId = roomIdRef.current;
    if (!roomId) return;
    // Optimistic: flip our handshake flag immediately so the button shows "waiting for opponent"
    // without a round-trip. The server confirms (and starts the match once both have voted).
    patch({ youWantRematch: true });
    try {
      await mp.rematch(roomId);
    } catch (err) {
      patch({ youWantRematch: false, error: err instanceof Error ? err.message : String(err) });
    }
  }, [patch]);

  const leave = useCallback(() => {
    const roomId = roomIdRef.current;
    if (roomId) void mp.abandon(roomId).catch(() => {});
    subRef.current?.unsubscribe();
    subRef.current = null;
    roomIdRef.current = null;
    selfIndexRef.current = null;
    publicRef.current = null;
    privateRef.current = null;
    uiPhaseRef.current = "idle";
    lastRevealRoundRef.current = -1;
    setViewState(IDLE);
  }, []);

  // Deadline backstop: once the planning window expires, ask the server to force-resolve. Both
  // clients also auto-commit their staged lineup at the deadline (MatchBoard), so this is mainly
  // the safety net for a disconnected/frozen opponent — fired a few seconds AFTER the deadline so
  // those auto-commits land first. The server no-ops if it's already resolved or not yet expired.
  const planDeadline = viewState.planDeadline;
  const selfIndex = viewState.selfIndex;
  const inLiveMatch = viewState.phase === "planning" || viewState.phase === "reveal";
  useEffect(() => {
    if (!inLiveMatch || planDeadline === null) return;
    const roomId = roomIdRef.current;
    if (!roomId) return;
    // Stagger by seat so the two clients don't both force-resolve the same round at the same
    // instant (the server has no per-round lock): seat 0 fires first; seat 1 only if seat 0's
    // resolution hasn't landed. Whichever fires first advances the deadline; the other no-ops.
    const graceMs = 4000 + (selfIndex === 1 ? 3000 : 0);
    const fireIn = planDeadline - Date.now() + graceMs;
    const trigger = () => {
      if (roomIdRef.current !== roomId) return;
      void mp.resolveIfExpired(roomId).catch(() => {});
    };
    const id = setTimeout(trigger, Math.max(0, fireIn));
    return () => clearTimeout(id);
  }, [inLiveMatch, planDeadline, selfIndex]);

  // Realtime resync: Postgres-Changes delivery is best-effort, so a dropped reveal/round-change
  // broadcast (network hiccup, brief reconnect) would otherwise strand a client on a stale frame
  // forever — the hook hydrates only once on connect. Re-fetch the authoritative room/player state
  // on a low-frequency timer while in a live match so a stuck client self-heals within seconds.
  useEffect(() => {
    if (!inLiveMatch) return;
    const roomId = roomIdRef.current;
    if (!roomId) return;
    const RESYNC_MS = 7000;
    const id = setInterval(() => {
      if (roomIdRef.current === roomId) void hydrate(roomId).catch(() => {});
    }, RESYNC_MS);
    return () => clearInterval(id);
  }, [inLiveMatch, hydrate]);

  // Clean up the realtime subscription on unmount.
  useEffect(() => {
    return () => {
      subRef.current?.unsubscribe();
      subRef.current = null;
    };
  }, []);

  return {
    viewState,
    createRoom,
    joinRoom,
    commitTurn,
    playTactical,
    continueAfterReveal,
    rematch,
    leave,
  };
}
