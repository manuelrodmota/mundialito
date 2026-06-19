-- World Cup Clash data schema
-- Tables mirror the 3 CSVs at supabase/seed/ with lightweight normalization.

-- ── teams ─────────────────────────────────────────────────────────────────────
create table if not exists public.teams (
  team_id   text primary key,
  team_name text not null,
  team_code text not null
);

-- ── tournaments ───────────────────────────────────────────────────────────────
create table if not exists public.tournaments (
  tournament_id   text primary key,
  tournament_name text not null,
  year            int  not null,
  is_womens       bool not null default false
);

-- ── players ───────────────────────────────────────────────────────────────────
create table if not exists public.players (
  player_id   text primary key,
  family_name text not null,
  given_name  text not null
);

-- ── player_ratings (card pool: men's 1950–2026) ───────────────────────────────
create table if not exists public.player_ratings (
  id             bigint generated always as identity primary key,
  player         text   not null,
  season         int    not null,
  team           text   not null,
  overall        int    not null,
  attack         int    not null,
  defense        int    not null,
  base_overall   int    not null,
  podium_finish  text,
  era_boost      numeric(6,4),
  rating_source  text,
  player_id      text references public.players(player_id)
);

create index if not exists idx_player_ratings_season
  on public.player_ratings (season);

create index if not exists idx_player_ratings_team
  on public.player_ratings (team);

create index if not exists idx_player_ratings_season_team
  on public.player_ratings (season, team);

-- ── squad_members ─────────────────────────────────────────────────────────────
create table if not exists public.squad_members (
  id              bigint generated always as identity primary key,
  tournament_id   text not null references public.tournaments(tournament_id),
  team_id         text not null references public.teams(team_id),
  player_id       text not null references public.players(player_id),
  shirt_number    int,
  position_code   text not null,
  position_name   text not null
);

create index if not exists idx_squad_members_tournament_team
  on public.squad_members (tournament_id, team_id);

create index if not exists idx_squad_members_player
  on public.squad_members (player_id);

-- ── campaign_teams (arcade opponents: 1930–2022) ─────────────────────────────
create table if not exists public.campaign_teams (
  id              bigint generated always as identity primary key,
  year            int  not null,
  host_country    text not null,
  team            text not null,
  finish          text not null,
  difficulty      int  not null check (difficulty between 1 and 5),
  description_en  text,
  description_es  text,
  description_pt  text
);

create index if not exists idx_campaign_teams_difficulty
  on public.campaign_teams (difficulty);

create index if not exists idx_campaign_teams_year
  on public.campaign_teams (year);
