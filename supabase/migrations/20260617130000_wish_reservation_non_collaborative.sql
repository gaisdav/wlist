-- Standard wishlist reservation (cap 1) + collaborative slots (existing cap).
-- Reuses wish_slots; non-collaborative wishes: effective cap = 1, no is_collaborative gate on INSERT.

-- =============================================================================
-- Effective cap helper
-- =============================================================================

create or replace function public.wish_slots_effective_cap(p_wish_id uuid)
returns integer
language sql
stable
set search_path = public
as $$
  select case
    when w.is_collaborative then coalesce(w.max_slots, 50)
    else 1
  end
  from public.wishes w
  where w.id = p_wish_id;
$$;

comment on function public.wish_slots_effective_cap(uuid) is
  'Slot cap: 1 for ordinary wishes (standard reserve); COALESCE(max_slots, 50) for group gifts.';

-- =============================================================================
-- Trigger: enforce cap (collaborative + non-collaborative)
-- =============================================================================

create or replace function public.wish_slots_enforce_slot_cap()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  cap integer;
  active_cnt integer;
begin
  if tg_op = 'insert' and new.status = 'active' then
    cap := public.wish_slots_effective_cap(new.wish_id);
    select count(*)::int into active_cnt
    from public.wish_slots
    where wish_id = new.wish_id
      and status = 'active';
    if active_cnt + 1 > cap then
      raise exception 'wish_slots_slot_cap_exceeded'
        using errcode = 'check_violation';
    end if;
  elsif tg_op = 'update' and new.status = 'active' and old.status is distinct from 'active' then
    cap := public.wish_slots_effective_cap(new.wish_id);
    select count(*)::int into active_cnt
    from public.wish_slots
    where wish_id = new.wish_id
      and status = 'active'
      and id <> new.id;
    if active_cnt + 1 > cap then
      raise exception 'wish_slots_slot_cap_exceeded'
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

-- =============================================================================
-- RLS: allow INSERT on any non-archived foreign wish (not only collaborative)
-- =============================================================================

drop policy if exists wish_slots_insert_participant on public.wish_slots;

create policy wish_slots_insert_participant on public.wish_slots
  for insert
  to authenticated
  with check (
    booked_by = auth.uid()
    and exists (
      select 1
      from public.wishes w
      where w.id = wish_id
        and w.is_archived = false
        and w.owner_id is distinct from auth.uid()
    )
  );

-- =============================================================================
-- RPC: non-collaborative wishes accept only p_count = 1
-- =============================================================================

create or replace function public.book_wish_slots(p_wish_id uuid, p_count integer)
returns setof public.wish_slots
language plpgsql
security invoker
set search_path = public
as $$
declare
  i integer;
  effective_count integer;
  is_collab boolean;
begin
  if p_count < 1 or p_count > 50 then
    raise exception 'book_wish_slots: count must be between 1 and 50'
      using errcode = '22023';
  end if;

  select w.is_collaborative into is_collab
  from public.wishes w
  where w.id = p_wish_id;

  if not found then
    raise exception 'book_wish_slots: wish not found'
      using errcode = 'no_data_found';
  end if;

  effective_count := case when is_collab then p_count else 1 end;

  if not is_collab and p_count <> 1 then
    raise exception 'book_wish_slots: ordinary wishes accept only a single reservation'
      using errcode = '22023';
  end if;

  for i in 1..effective_count loop
    return query
    insert into public.wish_slots (wish_id, booked_by, status)
    values (p_wish_id, auth.uid(), 'active'::public.wish_slot_status)
    returning *;
  end loop;

  return;
end;
$$;
