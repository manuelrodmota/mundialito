-- World Cup Clash — XP leveling + prestige (economy spec §7).

alter table public.profiles add column if not exists prestige int not null default 0;

-- add_xp: apply XP, rolling levels (cost to leave level L = min(25·L, 300)), granting one
-- box per level (Group; Knockout every 5th; Champions every 10th). Atomic; returns the new
-- level/xp and the boxes earned (id + tier + level) so the UI can show the level-up moment.
create or replace function public.add_xp(p_amount int)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_level  int;
  v_xp     int;
  v_need   int;
  v_tier   text;
  v_box_id bigint;
  v_gained jsonb := '[]'::jsonb;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select level, xp into v_level, v_xp from public.profiles where user_id = v_uid;
  if not found then
    raise exception 'no profile';
  end if;

  if p_amount is not null and p_amount > 0 then
    v_xp := v_xp + p_amount;
    loop
      v_need := least(25 * v_level, 300);
      exit when v_xp < v_need;
      v_xp := v_xp - v_need;
      v_level := v_level + 1;
      v_tier := case
        when v_level % 10 = 0 then 'champions'
        when v_level % 5 = 0 then 'knockout'
        else 'group'
      end;
      insert into public.user_boxes (user_id, tier, source)
      values (v_uid, v_tier, 'level')
      returning id into v_box_id;
      v_gained := v_gained || jsonb_build_object('id', v_box_id, 'tier', v_tier, 'level', v_level);
    end loop;
    update public.profiles set level = v_level, xp = v_xp where user_id = v_uid;
  end if;

  return json_build_object('level', v_level, 'xp', v_xp, 'boxes', v_gained);
end;
$$;

grant execute on function public.add_xp(int) to authenticated;

-- prestige_account: at level 50+, reset level→1 / xp→0 and bump prestige. Keeps all cards/boxes.
create or replace function public.prestige_account()
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
  update public.profiles
     set prestige = prestige + 1, level = 1, xp = 0
   where user_id = v_uid and level >= 50
   returning * into v_profile;
  if not found then
    raise exception 'prestige requires level 50';
  end if;
  return v_profile;
end;
$$;

grant execute on function public.prestige_account() to authenticated;
