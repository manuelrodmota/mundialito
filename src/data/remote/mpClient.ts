/**
 * Multiplayer transport — the client's only door to the authoritative server.
 *
 * Responsibilities:
 *  - ensure a Supabase session (the real signed-in user; anon only as a local-dev fallback) so
 *    RLS can scope the room rows to this account;
 *  - invoke the `mp` Edge Function (create / join / commit / …) — the server validates and
 *    resolves; the client never runs the engine or writes game state;
 *  - subscribe to Realtime Postgres Changes on the room's public row + this player's private
 *    row, and hydrate the current state once on connect.
 *
 * The mp_* tables aren't in the generated Database types yet (added by a later migration), so we
 * talk to them through a loosely-typed client and annotate results with the shared view types.
 */

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "./client.ts";
import type { PublicState, PrivateView, Commit } from "../../engine/multiplayer";
import type { Card } from "../../engine/types";

export interface RoomRow {
  id: string;
  code: string;
  status: PublicState["status"];
  player0_uid: string;
  player1_uid: string | null;
  public_state: PublicState | null;
  plan_deadline: string | null;
}

export interface PlayerStateRow {
  player_index: 0 | 1;
  private_view: PrivateView | null;
  pending_commit: unknown;
}

/** Untyped view of the client for the mp_* tables (not yet in generated Database types). */
function db(): SupabaseClient {
  return getSupabaseClient() as unknown as SupabaseClient;
}

/**
 * Returns the current user id for multiplayer. Prefers the existing authenticated session (real
 * Google sign-in — Multiplayer is gated on being logged in, so in production this is always set).
 * Falls back to an anonymous session only when there's no session yet (local/stub dev), which
 * requires `enable_anonymous_sign_ins` on that Supabase project. Idempotent.
 */
export async function ensureMpSession(): Promise<string> {
  const client = getSupabaseClient();
  const { data: existing } = await client.auth.getSession();
  if (existing.session) return existing.session.user.id;
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.user) throw new Error(`mp sign-in failed: ${error?.message ?? "no user"}`);
  return data.user.id;
}

type MpAction =
  | "create"
  | "join"
  | "play-tactical"
  | "commit"
  | "resolve-if-expired"
  | "rematch"
  | "abandon";

async function invokeMp<T>(action: MpAction, payload: Record<string, unknown>): Promise<T> {
  await ensureMpSession();
  const { data, error } = await getSupabaseClient().functions.invoke("mp", {
    body: { action, ...payload },
  });
  if (error) throw new Error(`mp/${action} failed: ${error.message}`);
  if (data && typeof data === "object" && "error" in data) {
    throw new Error(`mp/${action}: ${(data as { error: string }).error}`);
  }
  return data as T;
}

export function createRoom(
  deck: Card[],
  captainId: string,
  displayName: string,
): Promise<{ roomId: string; code: string }> {
  return invokeMp("create", { deck, captainId, displayName });
}

export function joinRoom(
  code: string,
  deck: Card[],
  captainId: string,
  displayName: string,
): Promise<{ roomId: string }> {
  return invokeMp("join", { code: code.toUpperCase(), deck, captainId, displayName });
}

export function playTactical(roomId: string, tacticalId: string): Promise<{ ok: true }> {
  return invokeMp("play-tactical", { roomId, tacticalId });
}

export function commitTurn(roomId: string, commit: Commit): Promise<{ ok: true }> {
  return invokeMp("commit", { roomId, ...commit });
}

export function resolveIfExpired(roomId: string): Promise<{ ok: true }> {
  return invokeMp("resolve-if-expired", { roomId });
}

export function rematch(roomId: string): Promise<{ ok: true }> {
  return invokeMp("rematch", { roomId });
}

export function abandon(roomId: string): Promise<{ ok: true }> {
  return invokeMp("abandon", { roomId });
}

/** One-shot fetch of the room's public row + this player's private row (hydration on connect). */
export async function fetchRoomState(roomId: string): Promise<{
  room: RoomRow | null;
  player: PlayerStateRow | null;
}> {
  const c = db();
  const [{ data: room }, { data: player }] = await Promise.all([
    c.from("mp_rooms").select("*").eq("id", roomId).maybeSingle(),
    c.from("mp_player_state").select("player_index, private_view, pending_commit").eq("room_id", roomId).maybeSingle(),
  ]);
  return { room: (room as RoomRow) ?? null, player: (player as PlayerStateRow) ?? null };
}

export interface RoomSubscription {
  unsubscribe: () => void;
}

/**
 * Subscribes to live updates for a room. `onPublic` fires on every mp_rooms change (visible to
 * both players); `onPrivate` fires on this player's mp_player_state row (RLS-scoped to them).
 */
export function subscribeRoom(
  roomId: string,
  handlers: { onPublic: (row: RoomRow) => void; onPrivate: (row: PlayerStateRow) => void },
): RoomSubscription {
  const channel: RealtimeChannel = db()
    .channel(`mp-room-${roomId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "mp_rooms", filter: `id=eq.${roomId}` },
      (payload) => handlers.onPublic(payload.new as RoomRow),
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "mp_player_state", filter: `room_id=eq.${roomId}` },
      (payload) => handlers.onPrivate(payload.new as PlayerStateRow),
    )
    .subscribe();

  return {
    unsubscribe: () => {
      void db().removeChannel(channel);
    },
  };
}
