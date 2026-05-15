-- feed_events.subject_id → wishes.id (PostgREST embed + cascade on wish delete).

alter table public.feed_events
  drop constraint if exists feed_events_subject_id_fkey;

alter table public.feed_events
  add constraint feed_events_subject_id_fkey
  foreign key (subject_id)
  references public.wishes (id)
  on delete cascade;

comment on constraint feed_events_subject_id_fkey on public.feed_events is
  'Feed row is tied to the wish; deleting the wish removes its feed events.';
