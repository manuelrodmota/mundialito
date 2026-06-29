-- World Cup Clash — match record stats (games played / won) on the profile.
alter table public.profiles add column if not exists games_played int not null default 0;
alter table public.profiles add column if not exists games_won int not null default 0;

-- record_match: increment the caller's games_played (+ games_won when they won).
create or replace function public.record_match(p_won boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  update public.profiles
     set games_played = games_played + 1,
         games_won = games_won + (case when p_won then 1 else 0 end)
   where user_id = v_uid;
end;
$$;

grant execute on function public.record_match(boolean) to authenticated;
