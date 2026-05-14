-- Stage 05 (plans/05-social.md): follows, feed_events, denormalized social counters.
--
--   * follows(follower_id, followee_id) + RLS
--   * feed_event_kind enum + feed_events + RLS (read: self + followees' actors)
--   * wishes.likes_count / wishes.reposts_count + maintenance triggers
--   * SECURITY DEFINER writers for feed_events (bypass RLS) from wish / wish_slots triggers
--   * Relax wishes_reposted_from_immutable: allow FK ON DELETE SET NULL to clear reposted_from_id
--
-- After apply: pnpm db:codegen

-- =============================================================================
-- Allow clearing reposted_from_id (FK ON DELETE SET NULL on parent wish)
-- =============================================================================

create or replace function public.wishes_reposted_from_immutable()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and new.reposted_from_id is distinct from old.reposted_from_id then
    if old.reposted_from_id is not null and new.reposted_from_id is null then
      return new;
    end if;
    raise exception 'wishes.reposted_from_id is immutable';
  end if;
  return new;
end;
$$;

-- =============================================================================
-- Denormalized counters on wishes
-- =============================================================================

alter table public.wishes
  add column if not exists likes_count integer not null default 0;

alter table public.wishes
  add column if not exists reposts_count integer not null default 0;

comment on column public.wishes.likes_count is
  'Denormalized like count (stage 05); maintained by triggers on wish_likes.';

comment on column public.wishes.reposts_count is
  'Denormalized count of non-archived wishes with reposted_from_id = this wish (stage 05).';

alter table public.wishes
  drop constraint if exists wishes_likes_count_nonneg;

alter table public.wishes
  add constraint wishes_likes_count_nonneg check (likes_count >= 0);

alter table public.wishes
  drop constraint if exists wishes_reposts_count_nonneg;

alter table public.wishes
  add constraint wishes_reposts_count_nonneg check (reposts_count >= 0);

update public.wishes w
set likes_count = coalesce(
  (select count(*)::int from public.wish_likes l where l.wish_id = w.id),
  0
);

update public.wishes w
set reposts_count = coalesce(
  (
    select count(*)::int
    from public.wishes c
    where c.reposted_from_id = w.id
      and not c.is_archived
  ),
  0
);

-- =============================================================================
-- wish_likes → likes_count
-- =============================================================================

create or replace function public.wish_likes_bump_wish_likes_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.wishes set likes_count = likes_count + 1 where id = new.wish_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.wishes
    set likes_count = greatest(0, likes_count - 1)
    where id = old.wish_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists wish_likes_bump_count_trg on public.wish_likes;

create trigger wish_likes_bump_count_trg
  after insert or delete on public.wish_likes
  for each row execute function public.wish_likes_bump_wish_likes_count();

-- =============================================================================
-- Repost copies → source reposts_count
-- =============================================================================

create or replace function public.wishes_sync_reposts_count()
returns trigger
language plpgsql
as $$
declare
  src uuid;
begin
  if tg_op = 'INSERT' then
    if new.reposted_from_id is not null and not new.is_archived then
      update public.wishes
      set reposts_count = reposts_count + 1
      where id = new.reposted_from_id;
    end if;
    return new;
  elsif tg_op = 'UPDATE' then
    -- Archive / unarchive repost copy (lineage unchanged)
    if old.reposted_from_id is not null
       and old.reposted_from_id is not distinct from new.reposted_from_id
       and old.is_archived is distinct from new.is_archived then
      if new.is_archived then
        update public.wishes
        set reposts_count = greatest(0, reposts_count - 1)
        where id = old.reposted_from_id;
      else
        update public.wishes
        set reposts_count = reposts_count + 1
        where id = old.reposted_from_id;
      end if;
    end if;
    -- FK cleared reposted_from_id (e.g. source wish deleted)
    if old.reposted_from_id is not null
       and new.reposted_from_id is null
       and not coalesce(old.is_archived, false) then
      update public.wishes
      set reposts_count = greatest(0, reposts_count - 1)
      where id = old.reposted_from_id;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.reposted_from_id is not null and not old.is_archived then
      update public.wishes
      set reposts_count = greatest(0, reposts_count - 1)
      where id = old.reposted_from_id;
    end if;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists wishes_sync_reposts_count_trg on public.wishes;

create trigger wishes_sync_reposts_count_trg
  after insert or update of is_archived, reposted_from_id or delete on public.wishes
  for each row execute function public.wishes_sync_reposts_count();

-- =============================================================================
-- follows
-- =============================================================================

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),

  primary key (follower_id, followee_id),

  constraint follows_no_self check (follower_id <> followee_id)
);

comment on table public.follows is
  'Directed follow edge: follower follows followee (stage 05).';

create index follows_followee_idx on public.follows (followee_id);
create index follows_follower_idx on public.follows (follower_id);

alter table public.follows enable row level security;
alter table public.follows force row level security;

create policy follows_select on public.follows
  for select
  using (auth.role() = 'authenticated');

create policy follows_insert_self on public.follows
  for insert
  with check (auth.role() = 'authenticated' and follower_id = auth.uid());

create policy follows_delete_self on public.follows
  for delete
  using (auth.role() = 'authenticated' and follower_id = auth.uid());

-- =============================================================================
-- feed_events
-- =============================================================================

create type public.feed_event_kind as enum (
  'wish_created',
  'wish_reposted',
  'wish_collected',
  'slot_booked_public',
  'event_created'
);

create table public.feed_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles (id) on delete cascade,
  kind public.feed_event_kind not null,
  subject_id uuid not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.feed_events is
  'Append-only social feed (stage 05); rows inserted by DB triggers (SECURITY DEFINER).';

create index feed_events_cursor_idx on public.feed_events (created_at desc, id desc);

create index feed_events_actor_idx on public.feed_events (actor_id);

alter table public.feed_events enable row level security;
alter table public.feed_events force row level security;

create policy feed_events_select on public.feed_events
  for select
  using (
    auth.role() = 'authenticated'
    and (
      actor_id = auth.uid()
      or exists (
        select 1
        from public.follows f
        where f.follower_id = auth.uid()
          and f.followee_id = feed_events.actor_id
      )
    )
  );

-- No INSERT/UPDATE/DELETE for authenticated clients — only trigger writers (definer).

-- =============================================================================
-- Append feed row (SECURITY DEFINER; bypasses RLS on feed_events)
-- =============================================================================

create or replace function public.append_feed_event(
  p_actor_id uuid,
  p_kind public.feed_event_kind,
  p_subject_id uuid,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.feed_events (actor_id, kind, subject_id, payload)
  values (p_actor_id, p_kind, p_subject_id, coalesce(p_payload, '{}'::jsonb));
end;
$$;

-- Do not grant EXECUTE to anon/authenticated — only definer triggers call this.
revoke all on function public.append_feed_event(uuid, public.feed_event_kind, uuid, jsonb) from public;

-- =============================================================================
-- Triggers: wishes → feed
-- =============================================================================

create or replace function public.tg_feed_after_wish_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  k public.feed_event_kind;
begin
  if new.reposted_from_id is not null then
    k := 'wish_reposted';
  else
    k := 'wish_created';
  end if;

  perform public.append_feed_event(
    new.owner_id,
    k,
    new.id,
    jsonb_build_object(
      'wish_id', new.id,
      'title', new.title,
      'owner_id', new.owner_id,
      'reposted_from_id', new.reposted_from_id
    )
  );
  return new;
end;
$$;

drop trigger if exists wishes_feed_after_insert_trg on public.wishes;

create trigger wishes_feed_after_insert_trg
  after insert on public.wishes
  for each row execute function public.tg_feed_after_wish_insert();

-- =============================================================================
-- wish_slots → feed (public slot activity + collected)
-- =============================================================================

create or replace function public.tg_feed_after_wish_slot_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cap integer;
  active_cnt integer;
  w_owner uuid;
begin
  if tg_op = 'INSERT' and new.status = 'active' then
    perform public.append_feed_event(
      new.booked_by,
      'slot_booked_public',
      new.wish_id,
      jsonb_build_object('wish_id', new.wish_id, 'slot_id', new.id)
    );

    select coalesce(w.max_slots, 50), w.owner_id
    into cap, w_owner
    from public.wishes w
    where w.id = new.wish_id;

    select count(*)::int
    into active_cnt
    from public.wish_slots
    where wish_id = new.wish_id
      and status = 'active';

    -- Fire once when the new row brings the total to exactly the cap.
    if active_cnt = cap then
      perform public.append_feed_event(
        w_owner,
        'wish_collected',
        new.wish_id,
        jsonb_build_object('wish_id', new.wish_id, 'active_slots', active_cnt, 'cap', cap)
      );
    end if;
    return new;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists wish_slots_feed_after_insert_trg on public.wish_slots;

create trigger wish_slots_feed_after_insert_trg
  after insert on public.wish_slots
  for each row execute function public.tg_feed_after_wish_slot_change();
