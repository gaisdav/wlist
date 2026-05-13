-- 0003 wishes + wish_photos + wish-photos storage bucket
--
-- Stage 02 (plans/02-mvp-wishlist-crud.md): wishlist CRUD foundation.
--
--   * public.wishes — owner, title, description (max 1000 chars), price,
--     currency (10 allowed ISO-like codes), optional link, cover photo FK,
--     soft-archive flag.
--   * public.wish_photos — storage path + display order (1 = first upload).
--   * storage bucket wish-photos (private) + RLS on storage.objects.
--
-- RLS summary (MVP — no privacy yet; tightened in plan 08):
--   wishes: any authenticated user reads non-archived rows + own archived;
--           insert/update/delete only when owner_id = auth.uid().
--   wish_photos: same visibility via parent wish; writes only wish owner.
--
-- See docs/architecture.md (RLS conventions).

-- =============================================================================
-- wishes
-- =============================================================================

create table public.wishes (
  id              uuid            primary key default gen_random_uuid(),
  owner_id        uuid            not null references public.profiles (id) on delete cascade,
  title           text            not null,
  description     text,
  price           numeric(12, 2),
  currency        text            not null default 'USD',
  link            text,
  cover_photo_id  uuid,
  is_archived     boolean         not null default false,
  created_at      timestamptz     not null default now(),
  updated_at      timestamptz     not null default now(),

  constraint wishes_title_len check (char_length(title) >= 1 and char_length(title) <= 200),
  constraint wishes_description_len check (description is null or char_length(description) <= 1000),
  constraint wishes_currency_allowed check (
    currency in ('USD', 'EUR', 'RUB', 'KZT', 'GBP', 'CHF', 'PLN', 'UAH', 'TRY', 'JPY')
  ),
  constraint wishes_link_url check (
    link is null or link ~ '^https?://[^[:space:]]{1,2048}$'
  ),
  constraint wishes_price_nonneg check (price is null or price >= 0)
);

comment on table public.wishes is
  'User wishlist item. MVP: any authenticated user can read non-archived wishes; only owner can mutate.';
comment on column public.wishes.cover_photo_id is
  'FK to wish_photos after that row exists; ON DELETE SET NULL when the photo row is removed.';
comment on column public.wishes.is_archived is
  'Soft-hide completed wishes without losing history (plan 02).';

create index wishes_owner_created_idx
  on public.wishes (owner_id, created_at desc);

create index wishes_public_feed_idx
  on public.wishes (created_at desc)
  where is_archived = false;

create trigger wishes_set_updated_at
  before update on public.wishes
  for each row execute function public.tg_set_updated_at();

-- =============================================================================
-- wish_photos (created before FK from wishes.cover_photo_id → avoid cycle)
-- =============================================================================

create table public.wish_photos (
  id             uuid            primary key default gen_random_uuid(),
  wish_id        uuid            not null references public.wishes (id) on delete cascade,
  storage_path   text            not null,
  position       int             not null,
  created_at     timestamptz     not null default now(),

  constraint wish_photos_position_positive check (position >= 1),
  constraint wish_photos_storage_path_nonempty check (char_length(trim(storage_path)) > 0)
);

comment on table public.wish_photos is
  'Gallery image for a wish. position = upload order (1 first). storage_path is key inside bucket wish-photos.';
comment on column public.wish_photos.storage_path is
  'Object path inside bucket wish-photos, format: <wish_id>/<filename>.';

create unique index wish_photos_wish_id_position_key
  on public.wish_photos (wish_id, position);

create index wish_photos_wish_id_idx
  on public.wish_photos (wish_id);

-- FK: cover row must belong to the same wish (composite uniqueness enforced in app + trigger optional; use CHECK via trigger is heavy — document in app layer). DB: simple FK to wish_photos only.
alter table public.wishes
  add constraint wishes_cover_photo_id_fkey
  foreign key (cover_photo_id) references public.wish_photos (id) on delete set null;

-- =============================================================================
-- RLS: wishes
-- =============================================================================

alter table public.wishes enable row level security;
alter table public.wishes force row level security;

-- Read: any authenticated user sees non-archived; owners also see their archived rows.
create policy wishes_select on public.wishes
  for select
  using (
    auth.role() = 'authenticated'
    and (
      not is_archived
      or owner_id = auth.uid()
    )
  );

create policy wishes_insert_self on public.wishes
  for insert
  with check (
    auth.role() = 'authenticated'
    and owner_id = auth.uid()
  );

create policy wishes_update_owner on public.wishes
  for update
  using (auth.role() = 'authenticated' and owner_id = auth.uid())
  with check (auth.role() = 'authenticated' and owner_id = auth.uid());

create policy wishes_delete_owner on public.wishes
  for delete
  using (auth.role() = 'authenticated' and owner_id = auth.uid());

create policy wishes_service_role_all on public.wishes
  for all
  to service_role
  using (true)
  with check (true);

-- =============================================================================
-- RLS: wish_photos
-- =============================================================================

alter table public.wish_photos enable row level security;
alter table public.wish_photos force row level security;

-- Visibility mirrors parent wish (non-archived public, archived visible to owner).
create policy wish_photos_select on public.wish_photos
  for select
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1
      from public.wishes w
      where w.id = wish_photos.wish_id
        and (
          not w.is_archived
          or w.owner_id = auth.uid()
        )
    )
  );

create policy wish_photos_insert_owner on public.wish_photos
  for insert
  with check (
    auth.role() = 'authenticated'
    and exists (
      select 1 from public.wishes w
      where w.id = wish_id and w.owner_id = auth.uid()
    )
  );

create policy wish_photos_update_owner on public.wish_photos
  for update
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from public.wishes w
      where w.id = wish_id and w.owner_id = auth.uid()
    )
  )
  with check (
    auth.role() = 'authenticated'
    and exists (
      select 1 from public.wishes w
      where w.id = wish_id and w.owner_id = auth.uid()
    )
  );

create policy wish_photos_delete_owner on public.wish_photos
  for delete
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from public.wishes w
      where w.id = wish_id and w.owner_id = auth.uid()
    )
  );

create policy wish_photos_service_role_all on public.wish_photos
  for all
  to service_role
  using (true)
  with check (true);

-- =============================================================================
-- Storage: private bucket + policies (path: <wish_id>/<file>)
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('wish-photos', 'wish-photos', false)
on conflict (id) do update set public = excluded.public;

-- Authenticated users can read any object in this bucket (MVP; plan 08 narrows by wish visibility).
create policy wish_photos_storage_select on storage.objects
  for select
  to authenticated
  using (bucket_id = 'wish-photos');

-- Upload only into a folder named after a wish the user owns.
create policy wish_photos_storage_insert on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'wish-photos'
    and exists (
      select 1
      from public.wishes w
      where w.owner_id = auth.uid()
        and w.id::text = split_part(name, '/', 1)
    )
  );

create policy wish_photos_storage_update on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'wish-photos'
    and exists (
      select 1
      from public.wishes w
      where w.owner_id = auth.uid()
        and w.id::text = split_part(name, '/', 1)
    )
  )
  with check (
    bucket_id = 'wish-photos'
    and exists (
      select 1
      from public.wishes w
      where w.owner_id = auth.uid()
        and w.id::text = split_part(name, '/', 1)
    )
  );

create policy wish_photos_storage_delete on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'wish-photos'
    and exists (
      select 1
      from public.wishes w
      where w.owner_id = auth.uid()
        and w.id::text = split_part(name, '/', 1)
    )
  );
