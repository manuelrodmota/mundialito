/**
 * `mp` — the authoritative multiplayer (1v1) server.
 *
 * One action-routed Edge Function. It is the ONLY writer of game state: it runs the shared,
 * deterministic engine (event-sourced replay from the stored move log), validates every move
 * server-side, resolves rounds, and writes RLS-scoped projections (public_state to mp_rooms,
 * private_view to mp_player_state) that Realtime pushes to clients. The opponent's deck/hand
 * lives only in mp_engine_state (no client read policy) and is never sent to the other player.
 *
 * Actions: create | join | play-tactical | commit | resolve-if-expired | rematch | abandon.
 */

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.108.2";
import type { Card } from "../../../src/engine/index.ts";
import {
  buildMatch,
  replayMoves,
  resolvePending,
  validateCommit,
  pendingToCommit,
  publicPlanState,
  publicRevealState,
  privateView,
  placeholderOpponent,
  captainNation,
  EMPTY_PENDING,
  type Commit,
  type MatchInputs,
  type ResolvedMove,
  type PendingCommit,
  type PlayerMeta,
} from "../../../src/engine/multiplayer/index.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const PLAN_SECONDS = 60;
const REVEAL_BUDGET_SECONDS = 12;
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I/L

/** SECRET authoritative state stored in mp_engine_state.engine_state. */
interface StoredEngine {
  seed: number;
  in0: { deck: Card[]; captainId: string };
  in1: { deck: Card[]; captainId: string } | null;
  moves: ResolvedMove[];
  meta: [PlayerMeta, PlayerMeta | null];
}

interface RoomRow {
  id: string;
  code: string;
  status: string;
  player0_uid: string;
  player1_uid: string | null;
  plan_deadline: string | null;
}

function admin(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function callerUid(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data } = await client.auth.getUser();
  return data.user?.id ?? null;
}

function newCode(): string {
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return s;
}

function inputsOf(se: StoredEngine): MatchInputs {
  if (!se.in1) throw new Error("match not started (no second player)");
  return { seed: se.seed, in0: se.in0, in1: se.in1 };
}

function metaPair(se: StoredEngine): [PlayerMeta, PlayerMeta] {
  return [se.meta[0], se.meta[1] ?? { displayName: "Opponent", captainNation: "" }];
}

function indexOf(room: RoomRow, uid: string): 0 | 1 | null {
  if (room.player0_uid === uid) return 0;
  if (room.player1_uid === uid) return 1;
  return null;
}

async function loadRoom(db: SupabaseClient, roomId: string): Promise<RoomRow | null> {
  const { data } = await db.from("mp_rooms").select("*").eq("id", roomId).maybeSingle();
  return (data as RoomRow) ?? null;
}

async function loadEngine(db: SupabaseClient, roomId: string): Promise<StoredEngine> {
  const { data, error } = await db
    .from("mp_engine_state")
    .select("engine_state")
    .eq("room_id", roomId)
    .single();
  if (error) throw new Error(`engine state missing: ${error.message}`);
  return data.engine_state as StoredEngine;
}

async function loadPendings(
  db: SupabaseClient,
  roomId: string,
): Promise<[PendingCommit, PendingCommit]> {
  const { data } = await db
    .from("mp_player_state")
    .select("player_index, pending_commit")
    .eq("room_id", roomId);
  const pendings: [PendingCommit, PendingCommit] = [{ ...EMPTY_PENDING }, { ...EMPTY_PENDING }];
  for (const row of data ?? []) {
    const idx = row.player_index as 0 | 1;
    pendings[idx] = (row.pending_commit as PendingCommit) ?? { ...EMPTY_PENDING };
  }
  return pendings;
}

/** The one authoritative state transition: resolve the round from both pending commits. */
async function resolveAndWrite(
  db: SupabaseClient,
  room: RoomRow,
  se: StoredEngine,
  pendings: [PendingCommit, PendingCommit],
): Promise<void> {
  const inputs = inputsOf(se);
  const opp = placeholderOpponent();
  const c0: Commit = pendingToCommit(pendings[0]);
  const c1: Commit = pendingToCommit(pendings[1]);

  const out = resolvePending(inputs, opp, se.moves, c0, c1);
  const meta = metaPair(se);
  const ended = out.result.winner !== null;

  await db
    .from("mp_engine_state")
    .update({ engine_state: { ...se, moves: out.moves }, updated_at: new Date().toISOString() })
    .eq("room_id", room.id);

  const deadline = ended
    ? null
    : new Date(Date.now() + (REVEAL_BUDGET_SECONDS + PLAN_SECONDS) * 1000).toISOString();

  await db
    .from("mp_rooms")
    .update({
      status: ended ? "finished" : "playing",
      public_state: publicRevealState(out.match, meta, out.result),
      plan_deadline: deadline,
      updated_at: new Date().toISOString(),
    })
    .eq("id", room.id);

  for (const idx of [0, 1] as const) {
    await db
      .from("mp_player_state")
      .update({
        private_view: privateView(out.match, idx),
        pending_commit: { ...EMPTY_PENDING },
        updated_at: new Date().toISOString(),
      })
      .eq("room_id", room.id)
      .eq("player_index", idx);
  }
}

/** Rebuild the live plan-phase state and rewrite the planning projections. */
async function writePlanState(
  db: SupabaseClient,
  room: RoomRow,
  se: StoredEngine,
  pendings: [PendingCommit, PendingCommit],
  deadline: string | null,
): Promise<void> {
  const { match } = replayMoves(inputsOf(se), placeholderOpponent(), se.moves);
  await db
    .from("mp_rooms")
    .update({
      public_state: publicPlanState(
        match,
        metaPair(se),
        pendings,
        deadline ? new Date(deadline).getTime() : null,
      ),
      updated_at: new Date().toISOString(),
    })
    .eq("id", room.id);
}

// ── Action handlers ───────────────────────────────────────────────────────────

async function handleCreate(db: SupabaseClient, uid: string, body: Record<string, unknown>) {
  const deck = body.deck as Card[];
  const captainId = body.captainId as string;
  const displayName = (body.displayName as string) ?? "Player 1";
  if (!deck?.length || !captainId) return jsonResponse({ error: "deck and captainId required" }, 400);

  const seed = Math.floor(Math.random() * 2 ** 32);
  // Retry on the rare code collision (unique constraint).
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    const { data, error } = await db
      .from("mp_rooms")
      .insert({ code, status: "lobby", player0_uid: uid })
      .select("id")
      .single();
    if (error) {
      if (attempt < 4) continue;
      return jsonResponse({ error: error.message }, 500);
    }
    const se: StoredEngine = {
      seed,
      in0: { deck, captainId },
      in1: null,
      moves: [],
      meta: [{ displayName, captainNation: captainNation(deck, captainId) }, null],
    };
    await db.from("mp_engine_state").insert({ room_id: data.id, engine_state: se });
    return jsonResponse({ roomId: data.id, code });
  }
  return jsonResponse({ error: "could not allocate a room code" }, 500);
}

async function handleJoin(db: SupabaseClient, uid: string, body: Record<string, unknown>) {
  const code = (body.code as string)?.toUpperCase();
  const deck = body.deck as Card[];
  const captainId = body.captainId as string;
  const displayName = (body.displayName as string) ?? "Player 2";
  if (!code || !deck?.length || !captainId) return jsonResponse({ error: "code, deck, captainId required" }, 400);

  const { data: room } = await db.from("mp_rooms").select("*").eq("code", code).maybeSingle();
  if (!room) return jsonResponse({ error: "room not found" }, 404);
  if (room.status !== "lobby" || room.player1_uid) return jsonResponse({ error: "room is full" }, 409);
  if (room.player0_uid === uid) return jsonResponse({ error: "you created this room" }, 400);

  const se = await loadEngine(db, room.id);
  se.in1 = { deck, captainId };
  se.meta[1] = { displayName, captainNation: captainNation(deck, captainId) };

  const { match } = buildMatch(inputsOf(se), placeholderOpponent());
  const deadline = new Date(Date.now() + PLAN_SECONDS * 1000).toISOString();

  await db.from("mp_engine_state").update({ engine_state: se }).eq("room_id", room.id);
  await db.from("mp_player_state").upsert(
    [0, 1].map((idx) => ({
      room_id: room.id,
      player_index: idx,
      uid: idx === 0 ? room.player0_uid : uid,
      private_view: privateView(match, idx as 0 | 1),
      pending_commit: { ...EMPTY_PENDING },
    })),
    { onConflict: "room_id,player_index" },
  );
  await db
    .from("mp_rooms")
    .update({
      status: "playing",
      player1_uid: uid,
      plan_deadline: deadline,
      public_state: publicPlanState(match, metaPair(se), [
        { ...EMPTY_PENDING },
        { ...EMPTY_PENDING },
      ], new Date(deadline).getTime()),
    })
    .eq("id", room.id);

  return jsonResponse({ roomId: room.id });
}

async function handlePlayTactical(db: SupabaseClient, uid: string, body: Record<string, unknown>) {
  const roomId = body.roomId as string;
  const tacticalId = body.tacticalId as string;
  const room = await loadRoom(db, roomId);
  if (!room) return jsonResponse({ error: "room not found" }, 404);
  const idx = indexOf(room, uid);
  if (idx === null) return jsonResponse({ error: "not a participant" }, 403);

  const se = await loadEngine(db, roomId);
  const pendings = await loadPendings(db, roomId);
  const pending = pendings[idx];
  if (pending.lockedIn) return jsonResponse({ error: "already locked in" }, 409);
  if (pending.tacticalIds.includes(tacticalId)) return jsonResponse({ ok: true });

  // Light check: the tactical must be in this player's current hand (replayed) and within the cap.
  const { match } = replayMoves(inputsOf(se), placeholderOpponent(), se.moves);
  const hand = match.players[idx]!.hand;
  const card = hand.find((c) => c.id === tacticalId && c.type === "tactical");
  if (!card) return jsonResponse({ error: "tactical not in hand" }, 400);

  pending.tacticalIds = [...pending.tacticalIds, tacticalId];
  await db
    .from("mp_player_state")
    .update({ pending_commit: pending, updated_at: new Date().toISOString() })
    .eq("room_id", roomId)
    .eq("player_index", idx);

  await writePlanState(db, room, se, pendings, room.plan_deadline);
  return jsonResponse({ ok: true });
}

async function handleCommit(db: SupabaseClient, uid: string, body: Record<string, unknown>) {
  const roomId = body.roomId as string;
  const commit: Commit = {
    formation: body.formation as Commit["formation"],
    attackIds: (body.attackIds as string[]) ?? [],
    defenseIds: (body.defenseIds as string[]) ?? [],
    tacticalIds: (body.tacticalIds as string[]) ?? [],
  };
  const room = await loadRoom(db, roomId);
  if (!room) return jsonResponse({ error: "room not found" }, 404);
  if (room.status !== "playing") return jsonResponse({ error: "match not in progress" }, 409);
  const idx = indexOf(room, uid);
  if (idx === null) return jsonResponse({ error: "not a participant" }, 403);

  const se = await loadEngine(db, roomId);
  const { match } = replayMoves(inputsOf(se), placeholderOpponent(), se.moves);
  const valid = validateCommit(match.players[idx]!, commit, match.round);
  if (!valid.ok) return jsonResponse({ error: valid.reason }, 400);

  const pendings = await loadPendings(db, roomId);
  pendings[idx] = { ...commit, lockedIn: true };
  await db
    .from("mp_player_state")
    .update({ pending_commit: pendings[idx], updated_at: new Date().toISOString() })
    .eq("room_id", roomId)
    .eq("player_index", idx);

  if (pendings[0].lockedIn && pendings[1].lockedIn) {
    await resolveAndWrite(db, room, se, pendings);
  } else {
    await writePlanState(db, room, se, pendings, room.plan_deadline);
  }
  return jsonResponse({ ok: true });
}

async function handleResolveIfExpired(db: SupabaseClient, uid: string, body: Record<string, unknown>) {
  const roomId = body.roomId as string;
  const room = await loadRoom(db, roomId);
  if (!room) return jsonResponse({ error: "room not found" }, 404);
  if (indexOf(room, uid) === null) return jsonResponse({ error: "not a participant" }, 403);
  if (room.status !== "playing") return jsonResponse({ ok: true, skipped: "not playing" });
  if (!room.plan_deadline || Date.now() < new Date(room.plan_deadline).getTime()) {
    return jsonResponse({ ok: true, skipped: "not expired" });
  }
  const se = await loadEngine(db, roomId);
  const pendings = await loadPendings(db, roomId);
  // Force-resolve with whatever each side has staged (missing = empty lineup).
  await resolveAndWrite(db, room, se, pendings);
  return jsonResponse({ ok: true, resolved: true });
}

async function handleRematch(db: SupabaseClient, uid: string, body: Record<string, unknown>) {
  const roomId = body.roomId as string;
  const room = await loadRoom(db, roomId);
  if (!room) return jsonResponse({ error: "room not found" }, 404);
  if (indexOf(room, uid) === null) return jsonResponse({ error: "not a participant" }, 403);

  const se = await loadEngine(db, roomId);
  if (!se.in1) return jsonResponse({ error: "match never started" }, 409);
  se.seed = Math.floor(Math.random() * 2 ** 32);
  se.moves = [];

  const { match } = buildMatch(inputsOf(se), placeholderOpponent());
  const deadline = new Date(Date.now() + PLAN_SECONDS * 1000).toISOString();

  await db.from("mp_engine_state").update({ engine_state: se }).eq("room_id", roomId);
  for (const idx of [0, 1] as const) {
    await db
      .from("mp_player_state")
      .update({ private_view: privateView(match, idx), pending_commit: { ...EMPTY_PENDING } })
      .eq("room_id", roomId)
      .eq("player_index", idx);
  }
  await db
    .from("mp_rooms")
    .update({
      status: "playing",
      plan_deadline: deadline,
      public_state: publicPlanState(match, metaPair(se), [
        { ...EMPTY_PENDING },
        { ...EMPTY_PENDING },
      ], new Date(deadline).getTime()),
    })
    .eq("id", roomId);
  return jsonResponse({ ok: true });
}

async function handleAbandon(db: SupabaseClient, uid: string, body: Record<string, unknown>) {
  const roomId = body.roomId as string;
  const room = await loadRoom(db, roomId);
  if (!room) return jsonResponse({ error: "room not found" }, 404);
  if (indexOf(room, uid) === null) return jsonResponse({ error: "not a participant" }, 403);
  await db.from("mp_rooms").update({ status: "abandoned" }).eq("id", roomId);
  return jsonResponse({ ok: true });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const uid = await callerUid(req);
    if (!uid) return jsonResponse({ error: "not authenticated" }, 401);

    const body = (await req.json()) as Record<string, unknown>;
    const action = body.action as string;
    const db = admin();

    switch (action) {
      case "create": return await handleCreate(db, uid, body);
      case "join": return await handleJoin(db, uid, body);
      case "play-tactical": return await handlePlayTactical(db, uid, body);
      case "commit": return await handleCommit(db, uid, body);
      case "resolve-if-expired": return await handleResolveIfExpired(db, uid, body);
      case "rematch": return await handleRematch(db, uid, body);
      case "abandon": return await handleAbandon(db, uid, body);
      default: return jsonResponse({ error: `unknown action: ${action}` }, 400);
    }
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
