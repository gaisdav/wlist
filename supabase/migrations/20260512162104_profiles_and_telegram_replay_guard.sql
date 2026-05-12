-- 0002 profiles & telegram replay guard
--
-- Adds the two tables required to authenticate Telegram Mini App users:
--
--   * `public.profiles`
--       1:1 with `auth.users`. Holds the Telegram-side identity fields we
--       refresh on every successful login (username, names, photo, …).
--
--   * `public.auth_telegram_used_init_data`
--       Anti-replay guard for the auth-telegram Edge Function. We record the
--       hash of every consumed initData payload and reject duplicates. Cheap
--       to maintain — Telegram-issued initData expires in 24h, so a TTL job
--       can prune anything older than that with no functional impact.
--
-- See docs/architecture.md §5 (auth flow), §10 (RLS conventions) and
-- plans/01-auth-and-users.md.

-- =============================================================================
-- profiles
-- =============================================================================

create table public.profiles (
  id            uuid        primary key references auth.users (id) on delete cascade,
  telegram_id   bigint      not null unique,
  username      text,
  first_name    text        not null,
  last_name     text,
  photo_url     text,
  language_code text,
  is_premium    boolean     not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is
  'Public profile mirrored from Telegram on every successful login. PK matches auth.users.id.';
comment on column public.profiles.telegram_id is
  'Telegram numeric user id. Unique — one Telegram account = one profile.';
comment on column public.profiles.username is
  'Telegram @username. Nullable — not every Telegram user has one. UI falls back to first_name.';

-- updated_at trigger
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.tg_set_updated_at() is
  'Generic BEFORE UPDATE trigger that bumps updated_at. Reused by every table with that column.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.tg_set_updated_at();

-- RLS
alter table public.profiles enable  row level security;
alter table public.profiles force   row level security;

-- Anyone authenticated can read any profile (subscriptions, viewing other
-- users' wishlists in later stages). Tightened in plan 08 (privacy).
create policy profiles_select on public.profiles
  for select
  using (auth.role() = 'authenticated');

-- INSERT happens only inside the auth-telegram Edge Function (service-role).
-- `force row level security` blocks even the service-role from bypassing this,
-- so the Edge Function uses an explicit `with check (id = <new uuid>)` shape;
-- here we deny all client INSERTs.
create policy profiles_insert_self on public.profiles
  for insert
  with check (id = auth.uid());

-- Owner can update their own row only. The Edge Function on relogin uses
-- service-role and bypasses this thanks to the explicit policy below.
create policy profiles_update_self on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Service-role (Edge Function) is allowed to touch any profile so it can
-- refresh Telegram-side fields on every login. `force RLS` requires this to
-- be an explicit policy, not an implicit bypass.
create policy profiles_service_role_all on public.profiles
  for all
  to service_role
  using (true)
  with check (true);

-- No DELETE policy — profiles are removed by `on delete cascade` from auth.users.

-- =============================================================================
-- auth_telegram_used_init_data
-- =============================================================================

create table public.auth_telegram_used_init_data (
  init_data_hash bytea       primary key,
  used_at        timestamptz not null default now()
);

comment on table public.auth_telegram_used_init_data is
  'Anti-replay guard for the auth-telegram Edge Function. Stores SHA-256 of every consumed initData payload.';
comment on column public.auth_telegram_used_init_data.init_data_hash is
  'SHA-256 of the raw initData query-string. 32 bytes — no chance of collision.';

-- Used for TTL cleanup: a periodic job deletes rows older than 24h (the
-- Telegram initData lifetime) so the table stays small.
create index auth_telegram_used_init_data_used_at_idx
  on public.auth_telegram_used_init_data (used_at);

alter table public.auth_telegram_used_init_data enable  row level security;
alter table public.auth_telegram_used_init_data force   row level security;

-- Only the Edge Function (service-role) ever touches this table.
-- No client policies = clients can't read or write anything.
create policy auth_telegram_used_init_data_service_role_all
  on public.auth_telegram_used_init_data
  for all
  to service_role
  using (true)
  with check (true);
