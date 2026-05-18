-- Stage 08 (plans/08-privacy.md): Step 1 - Database Schema & Migrations
--
--   * wish_visibility enum
--   * user_lists table + indexes + RLS
--   * user_list_members table + indexes + RLS
--   * Alter wishes table: add visibility column
--   * Alter events table: add visibility column
--   * wish_visibility_lists table + indexes + RLS
--   * event_visibility_lists table + indexes + RLS
--   * Data migration: set visibility = 'public' for existing rows

-- =============================================================================
-- Enums
-- =============================================================================

create type public.wish_visibility as enum (
  'public',
  'followers',
  'lists',
  'private'
);

-- =============================================================================
-- user_lists
-- =============================================================================

create table public.user_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) >= 1 and char_length(name) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_lists is
  'User-created contact lists/groups (e.g., Family, Friends) for managing privacy (stage 08).';
comment on column public.user_lists.owner_id is
  'FK to public.profiles. The user who owns this list.';
comment on column public.user_lists.name is
  'List name as displayed in the UI.';

create index user_lists_owner_id_idx on public.user_lists(owner_id);

create trigger set_user_lists_updated_at
  before update on public.user_lists
  for each row execute function public.tg_set_updated_at();

alter table public.user_lists enable row level security;
alter table public.user_lists force row level security;

create policy user_lists_select on public.user_lists
  for select
  using (auth.role() = 'authenticated' and owner_id = auth.uid());

create policy user_lists_insert on public.user_lists
  for insert
  with check (auth.role() = 'authenticated' and owner_id = auth.uid());

create policy user_lists_update on public.user_lists
  for update
  using (auth.role() = 'authenticated' and owner_id = auth.uid())
  with check (auth.role() = 'authenticated' and owner_id = auth.uid());

create policy user_lists_delete on public.user_lists
  for delete
  using (auth.role() = 'authenticated' and owner_id = auth.uid());

create policy user_lists_service_role on public.user_lists
  for all
  to service_role
  using (true)
  with check (true);

-- =============================================================================
-- user_list_members
-- =============================================================================

create table public.user_list_members (
  list_id uuid not null references public.user_lists(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (list_id, member_id)
);

comment on table public.user_list_members is
  'Members belonging to a specific user list (stage 08).';
comment on column public.user_list_members.list_id is
  'FK to public.user_lists.';
comment on column public.user_list_members.member_id is
  'FK to public.profiles. The profile added to this list.';

create index user_list_members_list_id_idx on public.user_list_members(list_id);
create index user_list_members_member_id_idx on public.user_list_members(member_id);

alter table public.user_list_members enable row level security;
alter table public.user_list_members force row level security;

create policy user_list_members_select on public.user_list_members
  for select
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from public.user_lists l
      where l.id = user_list_members.list_id and l.owner_id = auth.uid()
    )
  );

create policy user_list_members_insert on public.user_list_members
  for insert
  with check (
    auth.role() = 'authenticated'
    and exists (
      select 1 from public.user_lists l
      where l.id = user_list_members.list_id and l.owner_id = auth.uid()
    )
  );

create policy user_list_members_delete on public.user_list_members
  for delete
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from public.user_lists l
      where l.id = user_list_members.list_id and l.owner_id = auth.uid()
    )
  );

create policy user_list_members_service_role on public.user_list_members
  for all
  to service_role
  using (true)
  with check (true);

-- =============================================================================
-- Alter wishes & events
-- =============================================================================

alter table public.wishes
  add column if not exists visibility public.wish_visibility not null default 'public';

comment on column public.wishes.visibility is
  'Privacy visibility of the wish (stage 08).';

alter table public.events
  add column if not exists visibility public.wish_visibility not null default 'public';

comment on column public.events.visibility is
  'Privacy visibility of the event (stage 08).';

-- =============================================================================
-- wish_visibility_lists
-- =============================================================================

create table public.wish_visibility_lists (
  wish_id uuid not null references public.wishes(id) on delete cascade,
  list_id uuid not null references public.user_lists(id) on delete cascade,
  primary key (wish_id, list_id)
);

comment on table public.wish_visibility_lists is
  'Join table connecting wishes to user lists when wish.visibility = ''lists'' (stage 08).';

create index wish_visibility_lists_wish_id_idx on public.wish_visibility_lists(wish_id);
create index wish_visibility_lists_list_id_idx on public.wish_visibility_lists(list_id);

alter table public.wish_visibility_lists enable row level security;
alter table public.wish_visibility_lists force row level security;

create policy wish_visibility_lists_select on public.wish_visibility_lists
  for select
  using (auth.role() = 'authenticated');

create policy wish_visibility_lists_insert on public.wish_visibility_lists
  for insert
  with check (
    auth.role() = 'authenticated'
    and exists (
      select 1 from public.wishes w
      where w.id = wish_visibility_lists.wish_id and w.owner_id = auth.uid()
    )
  );

create policy wish_visibility_lists_delete on public.wish_visibility_lists
  for delete
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from public.wishes w
      where w.id = wish_visibility_lists.wish_id and w.owner_id = auth.uid()
    )
  );

create policy wish_visibility_lists_service_role on public.wish_visibility_lists
  for all
  to service_role
  using (true)
  with check (true);

-- =============================================================================
-- event_visibility_lists
-- =============================================================================

create table public.event_visibility_lists (
  event_id uuid not null references public.events(id) on delete cascade,
  list_id uuid not null references public.user_lists(id) on delete cascade,
  primary key (event_id, list_id)
);

comment on table public.event_visibility_lists is
  'Join table connecting events to user lists when event.visibility = ''lists'' (stage 08).';

create index event_visibility_lists_event_id_idx on public.event_visibility_lists(event_id);
create index event_visibility_lists_list_id_idx on public.event_visibility_lists(list_id);

alter table public.event_visibility_lists enable row level security;
alter table public.event_visibility_lists force row level security;

create policy event_visibility_lists_select on public.event_visibility_lists
  for select
  using (auth.role() = 'authenticated');

create policy event_visibility_lists_insert on public.event_visibility_lists
  for insert
  with check (
    auth.role() = 'authenticated'
    and exists (
      select 1 from public.events e
      where e.id = event_visibility_lists.event_id and e.owner_id = auth.uid()
    )
  );

create policy event_visibility_lists_delete on public.event_visibility_lists
  for delete
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from public.events e
      where e.id = event_visibility_lists.event_id and e.owner_id = auth.uid()
    )
  );

create policy event_visibility_lists_service_role on public.event_visibility_lists
  for all
  to service_role
  using (true)
  with check (true);

-- =============================================================================
-- Data migration
-- =============================================================================

update public.wishes set visibility = 'public' where visibility is null;
update public.events set visibility = 'public' where visibility is null;
