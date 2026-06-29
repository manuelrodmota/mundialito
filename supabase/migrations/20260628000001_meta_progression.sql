-- World Cup Clash — meta progression schema (Phase 2 / WCC-044).
-- Per-user account, card collection, and box locker. Every table is OWNER-SCOPED via RLS
-- (a user can read/write only rows where user_id = auth.uid()). The shared data tables
-- (player_ratings, etc.) stay read-only from the earlier migrations.

-- ── profiles ──────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  username     text not null check (username ~ '^[A-Za-z0-9_]{3,16}$'),
  xp           int  not null default 0,
  level        int  not null default 1,
  welcome_done bool not null default false,
  -- reserved for the optional pity timer (economy spec §3); unused until a later phase
  champions_boxes_since_legendary int not null default 0,
  created_at   timestamptz not null default now()
);

-- Case-insensitive unique usernames.
create unique index if not exists profiles_username_lower_key
  on public.profiles (lower(username));

-- ── user_cards (the collection) ───────────────────────────────────────────────
-- card_id = player_ratings.id (durable card identity, NOT the runtime slug).
-- count > 1 = duplicates (kept for a future crafting/Scraps build).
create table if not exists public.user_cards (
  user_id           uuid   not null references auth.users(id) on delete cascade,
  card_id           bigint not null references public.player_ratings(id),
  count             int    not null default 1 check (count >= 1),
  first_acquired_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

create index if not exists idx_user_cards_user on public.user_cards (user_id);

-- ── user_boxes (the locker) ───────────────────────────────────────────────────
create table if not exists public.user_boxes (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  tier       text not null check (tier in ('group', 'knockout', 'champions', 'trophy')),
  source     text not null check (source in ('welcome', 'level', 'run')),
  opened     bool not null default false,
  created_at timestamptz not null default now(),
  opened_at  timestamptz
);

-- Hot path: the locker lists a user's UNOPENED boxes.
create index if not exists idx_user_boxes_user_unopened
  on public.user_boxes (user_id) where opened = false;

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.profiles   enable row level security;
alter table public.user_cards enable row level security;
alter table public.user_boxes enable row level security;

create policy "own_select" on public.profiles
  for select to authenticated using (user_id = auth.uid());
create policy "own_insert" on public.profiles
  for insert to authenticated with check (user_id = auth.uid());
create policy "own_update" on public.profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own_select" on public.user_cards
  for select to authenticated using (user_id = auth.uid());
create policy "own_insert" on public.user_cards
  for insert to authenticated with check (user_id = auth.uid());
create policy "own_update" on public.user_cards
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own_select" on public.user_boxes
  for select to authenticated using (user_id = auth.uid());
create policy "own_insert" on public.user_boxes
  for insert to authenticated with check (user_id = auth.uid());
create policy "own_update" on public.user_boxes
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── username_available(text) ──────────────────────────────────────────────────
-- Lets the registration screen live-check availability without exposing other
-- users' profile rows (RLS only permits a user to read their own row).
create or replace function public.username_available(p_username text)
returns boolean
language sql security definer set search_path = public stable
as $$
  select not exists (
    select 1 from public.profiles where lower(username) = lower(p_username)
  );
$$;

grant execute on function public.username_available(text) to anon, authenticated;

-- ── register_account(text) ────────────────────────────────────────────────────
-- Atomically create the caller's profile and seed the 4-box welcome bundle
-- (2 Group + 1 Knockout + 1 Champions). Raises on bad/taken username.
create or replace function public.register_account(p_username text)
returns public.profiles
language plpgsql security definer set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_profile public.profiles;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_username !~ '^[A-Za-z0-9_]{3,16}$' then
    raise exception 'invalid username' using errcode = '22023';
  end if;

  insert into public.profiles (user_id, username)
  values (v_uid, p_username)
  returning * into v_profile;

  insert into public.user_boxes (user_id, tier, source) values
    (v_uid, 'group',     'welcome'),
    (v_uid, 'group',     'welcome'),
    (v_uid, 'knockout',  'welcome'),
    (v_uid, 'champions', 'welcome');

  return v_profile;
end;
$$;

grant execute on function public.register_account(text) to authenticated;
