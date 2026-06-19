-- RLS: all data tables are read-only for anon + authenticated.
-- No write policies → INSERT/UPDATE/DELETE denied by default.

alter table public.teams           enable row level security;
alter table public.tournaments     enable row level security;
alter table public.players         enable row level security;
alter table public.player_ratings  enable row level security;
alter table public.squad_members   enable row level security;
alter table public.campaign_teams  enable row level security;

create policy "read_all" on public.teams
  for select to anon, authenticated using (true);

create policy "read_all" on public.tournaments
  for select to anon, authenticated using (true);

create policy "read_all" on public.players
  for select to anon, authenticated using (true);

create policy "read_all" on public.player_ratings
  for select to anon, authenticated using (true);

create policy "read_all" on public.squad_members
  for select to anon, authenticated using (true);

create policy "read_all" on public.campaign_teams
  for select to anon, authenticated using (true);
