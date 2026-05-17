-- 07-events: events, event_wishes, default events trigger

-- 1. public.events
create table public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) >= 1 and char_length(title) <= 255),
  event_date date,
  is_recurring_yearly boolean not null default true,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.events is
  'User events/holidays (e.g. Birthday, New Year) to group wishes under.';
comment on column public.events.owner_id is
  'FK to public.profiles. The user who created the event.';
comment on column public.events.title is
  'Event title (e.g., "Мой День рождения").';
comment on column public.events.event_date is
  'Date of the event. Nullable (e.g., if the user has not set their birthday yet).';
comment on column public.events.is_recurring_yearly is
  'If true, the event occurs every year on the same day and month (ignoring the year).';

create index events_owner_id_idx on public.events(owner_id);
create index events_event_date_idx on public.events(event_date);

create trigger set_events_updated_at
  before update on public.events
  for each row execute function public.tg_set_updated_at();

-- 2. public.event_wishes (join table)
create table public.event_wishes (
  event_id uuid not null references public.events(id) on delete cascade,
  wish_id uuid not null references public.wishes(id) on delete cascade,
  primary key (event_id, wish_id)
);

comment on table public.event_wishes is
  'Many-to-many join table connecting events and wishes.';

create index event_wishes_event_id_idx on public.event_wishes(event_id);
create index event_wishes_wish_id_idx on public.event_wishes(wish_id);

-- 3. RLS - public.events
alter table public.events enable row level security;
alter table public.events force row level security;

create policy events_select on public.events
  for select
  using (auth.role() = 'authenticated');

create policy events_insert on public.events
  for insert
  with check (
    auth.role() = 'authenticated'
    and owner_id = auth.uid()
  );

create policy events_update on public.events
  for update
  using (
    auth.role() = 'authenticated'
    and owner_id = auth.uid()
  )
  with check (
    auth.role() = 'authenticated'
    and owner_id = auth.uid()
  );

create policy events_delete on public.events
  for delete
  using (
    auth.role() = 'authenticated'
    and owner_id = auth.uid()
  );

create policy events_service_role on public.events
  for all
  to service_role
  using (true)
  with check (true);

-- 4. RLS - public.event_wishes
alter table public.event_wishes enable row level security;
alter table public.event_wishes force row level security;

create policy event_wishes_select on public.event_wishes
  for select
  using (auth.role() = 'authenticated');

create policy event_wishes_insert on public.event_wishes
  for insert
  with check (
    auth.role() = 'authenticated'
    and exists (
      select 1 from public.events e
      where e.id = event_wishes.event_id and e.owner_id = auth.uid()
    )
    and exists (
      select 1 from public.wishes w
      where w.id = event_wishes.wish_id and w.owner_id = auth.uid()
    )
  );

create policy event_wishes_delete on public.event_wishes
  for delete
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from public.events e
      where e.id = event_wishes.event_id and e.owner_id = auth.uid()
    )
  );

create policy event_wishes_service_role on public.event_wishes
  for all
  to service_role
  using (true)
  with check (true);


