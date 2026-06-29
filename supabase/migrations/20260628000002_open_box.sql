-- World Cup Clash — box opening persistence (Phase 4 / WCC-053).
-- open_box: atomically mark a box opened and grant its cards to the collection
-- (duplicates increment count). Sets profiles.welcome_done once the welcome bundle is done.

create or replace function public.open_box(p_box_id bigint, p_card_ids bigint[])
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id  bigint;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  -- Claim the box: must be the caller's and not already opened.
  update public.user_boxes
     set opened = true, opened_at = now()
   where id = p_box_id and user_id = v_uid and opened = false;
  if not found then
    raise exception 'box not found or already opened';
  end if;

  -- Grant cards; a repeat copy just increments count.
  foreach v_id in array p_card_ids loop
    insert into public.user_cards (user_id, card_id)
    values (v_uid, v_id)
    on conflict (user_id, card_id)
      do update set count = user_cards.count + 1;
  end loop;

  -- When no unopened welcome boxes remain, the welcome bundle is done.
  if not exists (
    select 1 from public.user_boxes
     where user_id = v_uid and source = 'welcome' and opened = false
  ) then
    update public.profiles set welcome_done = true where user_id = v_uid;
  end if;
end;
$$;

grant execute on function public.open_box(bigint, bigint[]) to authenticated;
