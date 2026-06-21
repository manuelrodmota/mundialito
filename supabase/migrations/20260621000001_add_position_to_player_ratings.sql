-- Add an explicit position to the card pool.
--
-- The card-pool ratings (world_cup_overall_ratings.csv) carry no position, and the
-- 2026 squad rows have empty player_id/team_id, so the player_id FK to squad_members
-- cannot be relied on for position. The import instead matches each rating to its
-- squad row by normalized name+season+team and persists that row's position_code
-- here directly, so PlayerCard mapping gets a real position (incl. GK) without a join.
-- Nullable: ~18% of ratings have no squad match and fall back to a ratings heuristic.
alter table public.player_ratings
  add column if not exists position_code text;

create index if not exists idx_player_ratings_position
  on public.player_ratings (position_code);
