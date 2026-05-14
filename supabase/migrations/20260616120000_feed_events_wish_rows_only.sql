-- Feed rows = new wishes only (every INSERT on public.wishes, including reposts).
-- Drops feed_event_kind + feed_events.kind; removes wish_slots → feed triggers;
-- append_feed_event(actor_id, subject_id, payload).

-- =============================================================================
-- wish_slots → feed (removed)
-- =============================================================================

drop trigger if exists wish_slots_feed_after_insert_trg on public.wish_slots;

drop function if exists public.tg_feed_after_wish_slot_change();

-- =============================================================================
-- wishes → feed: detach, replace writer + column + enum, reattach
-- =============================================================================

drop trigger if exists wishes_feed_after_insert_trg on public.wishes;

drop function if exists public.tg_feed_after_wish_insert();

drop function if exists public.append_feed_event(uuid, public.feed_event_kind, uuid, jsonb);

alter table public.feed_events drop column if exists kind;

drop type if exists public.feed_event_kind;

create or replace function public.append_feed_event(
  p_actor_id uuid,
  p_subject_id uuid,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.feed_events (actor_id, subject_id, payload)
  values (p_actor_id, p_subject_id, coalesce(p_payload, '{}'::jsonb));
end;
$$;

revoke all on function public.append_feed_event(uuid, uuid, jsonb) from public;

create or replace function public.tg_feed_after_wish_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.append_feed_event(
    new.owner_id,
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

create trigger wishes_feed_after_insert_trg
  after insert on public.wishes
  for each row execute function public.tg_feed_after_wish_insert();

comment on table public.feed_events is
  'Append-only feed: new wishes only (subject_id = wish id). One row per wishes INSERT (including reposts).';
