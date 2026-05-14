-- Stage 03 (plans/03-mvp-slots.md): collaborative slots on wishes + wish_slots.
--
--   * wishes: is_collaborative, max_slots (nullable; COALESCE(max_slots, 50) = slot cap),
--     copy_lines (jsonb JSON array of strings, max 5 items, max 256 chars each).
--   * wish_slots: one row = one booked slot; same user may hold multiple active rows.
--   * RLS: wish_slots hidden from wish owner (SELECT); INSERT/UPDATE for participants only.
--   * book_wish_slots(wish_id, count): atomic multi-slot book (SECURITY INVOKER).

-- =============================================================================
-- Enum + helpers
-- =============================================================================

create type public.wish_slot_status as enum ('active', 'cancelled');

create or replace function public.wishes_copy_lines_is_valid(lines jsonb)
returns boolean
language sql
immutable
parallel safe
as $$
  select case
    when lines is null then true
    when jsonb_typeof(lines) != 'array' then false
    when jsonb_array_length(lines) > 5 then false
    else not exists (
      select 1
      from jsonb_array_elements(lines) as e(elem)
      where jsonb_typeof(e.elem) != 'string'
         or char_length(e.elem #>> '{}') > 256
    )
  end;
$$;

comment on function public.wishes_copy_lines_is_valid(jsonb) is
  'True if copy_lines is null or a JSON array of at most 5 strings, each at most 256 chars.';

-- =============================================================================
-- wishes: collaborative fields
-- =============================================================================

alter table public.wishes
  add column if not exists is_collaborative boolean not null default false;

alter table public.wishes
  add column if not exists max_slots integer;

alter table public.wishes
  add column if not exists copy_lines jsonb;

comment on column public.wishes.is_collaborative is
  'When true, friends may book wish_slots on this wish (plan 03).';

comment on column public.wishes.max_slots is
  'Max active wish_slots rows for this wish; null uses default cap 50 (app + trigger).';

comment on column public.wishes.copy_lines is
  'JSON array of up to 256-char strings (e.g. payment hints); max 5 elements.';

alter table public.wishes
  drop constraint if exists wishes_max_slots_range;

alter table public.wishes
  add constraint wishes_max_slots_range check (
    max_slots is null
    or (max_slots >= 1 and max_slots <= 500)
  );

alter table public.wishes
  drop constraint if exists wishes_copy_lines_check;

alter table public.wishes
  add constraint wishes_copy_lines_check check (public.wishes_copy_lines_is_valid(copy_lines));

-- =============================================================================
-- wish_slots
-- =============================================================================

create table public.wish_slots (
  id uuid primary key default gen_random_uuid(),
  wish_id uuid not null references public.wishes (id) on delete cascade,
  booked_by uuid not null references public.profiles (id),
  status public.wish_slot_status not null default 'active',
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,

  constraint wish_slots_cancelled_at_consistency check (
    (status = 'active' and cancelled_at is null)
    or (status = 'cancelled' and cancelled_at is not null)
  )
);

comment on table public.wish_slots is
  'One row = one slot booking. Owner must not read rows (RLS).';

create index wish_slots_wish_id_idx on public.wish_slots (wish_id);

create index wish_slots_wish_id_active_idx
  on public.wish_slots (wish_id)
  where status = 'active';

create index wish_slots_booked_by_idx on public.wish_slots (booked_by);

-- =============================================================================
-- Triggers: slot cap + cancelled_at
-- =============================================================================

create or replace function public.wish_slots_enforce_slot_cap()
returns trigger
language plpgsql
as $$
declare
  cap integer;
  active_cnt integer;
begin
  if tg_op = 'insert' and new.status = 'active' then
    select coalesce(w.max_slots, 50) into cap
    from public.wishes w
    where w.id = new.wish_id;
    select count(*)::int into active_cnt
    from public.wish_slots
    where wish_id = new.wish_id
      and status = 'active';
    if active_cnt + 1 > cap then
      raise exception 'wish_slots_slot_cap_exceeded'
        using errcode = 'check_violation';
    end if;
  elsif tg_op = 'update' and new.status = 'active' and old.status is distinct from 'active' then
    select coalesce(w.max_slots, 50) into cap
    from public.wishes w
    where w.id = new.wish_id;
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

drop trigger if exists wish_slots_enforce_slot_cap_bi on public.wish_slots;

create trigger wish_slots_enforce_slot_cap_bi
  before insert or update on public.wish_slots
  for each row
  execute function public.wish_slots_enforce_slot_cap();

create or replace function public.wish_slots_set_cancelled_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    new.cancelled_at := coalesce(new.cancelled_at, now());
  elsif new.status = 'active' then
    new.cancelled_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists wish_slots_set_cancelled_at_bu on public.wish_slots;

create trigger wish_slots_set_cancelled_at_bu
  before update on public.wish_slots
  for each row
  execute function public.wish_slots_set_cancelled_at();

-- =============================================================================
-- RPC: book multiple slots in one transaction
-- =============================================================================

create or replace function public.book_wish_slots(p_wish_id uuid, p_count integer)
returns setof public.wish_slots
language plpgsql
security invoker
set search_path = public
as $$
declare
  i integer;
begin
  if p_count < 1 or p_count > 50 then
    raise exception 'book_wish_slots: count must be between 1 and 50'
      using errcode = '22023';
  end if;

  for i in 1..p_count loop
    return query
    insert into public.wish_slots (wish_id, booked_by, status)
    values (p_wish_id, auth.uid(), 'active'::public.wish_slot_status)
    returning *;
  end loop;

  return;
end;
$$;

comment on function public.book_wish_slots(uuid, integer) is
  'Books p_count active wish_slots for the current user on p_wish_id; all-or-nothing.';

revoke all on function public.book_wish_slots(uuid, integer) from public;
grant execute on function public.book_wish_slots(uuid, integer) to authenticated;

-- =============================================================================
-- RLS: wish_slots
-- =============================================================================

alter table public.wish_slots enable row level security;
alter table public.wish_slots force row level security;

create policy wish_slots_select_non_owner on public.wish_slots
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.wishes w
      where w.id = wish_slots.wish_id
        and w.owner_id is distinct from auth.uid()
    )
  );

create policy wish_slots_insert_participant on public.wish_slots
  for insert
  to authenticated
  with check (
    booked_by = auth.uid()
    and exists (
      select 1
      from public.wishes w
      where w.id = wish_slots.wish_id
        and w.is_collaborative = true
        and w.is_archived = false
        and w.owner_id is distinct from auth.uid()
    )
  );

create policy wish_slots_update_self on public.wish_slots
  for update
  to authenticated
  using (booked_by = auth.uid())
  with check (booked_by = auth.uid());

create policy wish_slots_service_role_all on public.wish_slots
  for all
  to service_role
  using (true)
  with check (true);
