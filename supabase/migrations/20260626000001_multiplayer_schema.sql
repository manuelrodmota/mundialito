-- Multiplayer (1v1, two humans by room code) — server-authoritative.
--
-- The authoritative match runs in Edge Functions (service_role, bypasses RLS) and is
-- event-sourced: mp_engine_state holds the seed + both decks + the resolved move log (SECRET —
-- no client SELECT policy, so neither player can read the opponent's deck/hand). Clients only
-- READ their RLS-scoped projections and INVOKE the functions; they never write game state.
--
-- Delivery to clients is via Realtime Postgres Changes on mp_rooms (public_state, visible to
-- both players) and mp_player_state (private_view, visible only to its owner). Identity is a
-- Supabase anonymous session, so auth.uid() scopes the row-level policies.

create table public.mp_rooms (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  status        text not null default 'lobby'
                  check (status in ('lobby', 'playing', 'finished', 'abandoned')),
  player0_uid   uuid not null,                      -- room creator's anonymous auth uid
  player1_uid   uuid,                               -- joiner's uid (null until someone joins)
  public_state  jsonb,                              -- PublicState projection (a-ciegas during plan)
  plan_deadline timestamptz,                        -- planning timer; past it, either side may force resolve
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index mp_rooms_code_idx on public.mp_rooms (code);

-- One row per player. private_view is RLS-scoped to its owner; pending_commit is the
-- commit-in-progress (lineup ids + played tacticals + lock flag) for the current planning window.
create table public.mp_player_state (
  id             uuid primary key default gen_random_uuid(),
  room_id        uuid not null references public.mp_rooms (id) on delete cascade,
  player_index   smallint not null check (player_index in (0, 1)),
  uid            uuid not null,
  private_view   jsonb,
  pending_commit jsonb,
  updated_at     timestamptz not null default now(),
  unique (room_id, player_index)
);

create index mp_player_state_room_idx on public.mp_player_state (room_id);
create index mp_player_state_uid_idx  on public.mp_player_state (uid);

-- Authoritative, SECRET match state: { seed, in0:{deck,captainId}, in1:{deck,captainId}, opp,
-- moves:[ResolvedMove], meta:[PlayerMeta,PlayerMeta] }. Service-role only — RLS enabled with NO
-- policy denies every client read, so decks/hands never leave the server.
create table public.mp_engine_state (
  room_id      uuid primary key references public.mp_rooms (id) on delete cascade,
  engine_state jsonb not null,
  updated_at   timestamptz not null default now()
);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.mp_rooms        enable row level security;
alter table public.mp_player_state enable row level security;
alter table public.mp_engine_state enable row level security;

-- A room is readable by its two participants. (Writes go through Edge Functions / service_role.)
create policy "participants_read" on public.mp_rooms
  for select to authenticated
  using (auth.uid() = player0_uid or auth.uid() = player1_uid);

-- A private view is readable ONLY by its owner — never the opponent's.
create policy "owner_read" on public.mp_player_state
  for select to authenticated
  using (auth.uid() = uid);

-- mp_engine_state: no policy → no client can select any row (deny-by-default under RLS).

-- ── Realtime ────────────────────────────────────────────────────────────────
-- Push public_state + each owner's private_view to subscribed clients (RLS-filtered).
alter publication supabase_realtime add table public.mp_rooms;
alter publication supabase_realtime add table public.mp_player_state;
