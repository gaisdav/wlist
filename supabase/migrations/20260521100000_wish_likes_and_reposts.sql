-- Stage 05 (plans/05-social.md): wish likes + repost lineage.
--
--   * public.wish_likes (user_id, wish_id) — one like per user per wish; FK cascade on wish/user delete.
--   * public.wishes.reposted_from_id — nullable FK to source wish (ON DELETE SET NULL); immutable after insert.
--   * RLS: likes mirror wish visibility; cannot like own wish; insert/delete own row only.
--   * wishes INSERT: reposted_from_id allowed only when source wish exists, is not archived, and is not owned by inserter.
--
-- After applying: run `pnpm db:codegen` against the linked project and commit generated types.

-- =============================================================================
-- wish_likes
-- =============================================================================

create table public.wish_likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  wish_id uuid not null references public.wishes (id) on delete cascade,
  created_at timestamptz not null default now(),

  primary key (user_id, wish_id)
);

comment on table public.wish_likes is
  'One row per user liking a wish (stage 05).';

create index wish_likes_wish_id_idx on public.wish_likes (wish_id);

alter table public.wish_likes enable row level security;
alter table public.wish_likes force row level security;

-- SELECT: same visibility as the parent wish (non-archived public; archived visible to owner).
create policy wish_likes_select on public.wish_likes
  for select
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1
      from public.wishes w
      where w.id = wish_likes.wish_id
        and (
          not w.is_archived
          or w.owner_id = auth.uid()
        )
    )
  );

-- INSERT: only own user_id; target wish visible; cannot like own wish.
create policy wish_likes_insert_self on public.wish_likes
  for insert
  with check (
    auth.role() = 'authenticated'
    and user_id = auth.uid()
    and exists (
      select 1
      from public.wishes w
      where w.id = wish_id
        and (
          not w.is_archived
          or w.owner_id = auth.uid()
        )
        and w.owner_id <> auth.uid()
    )
  );

create policy wish_likes_delete_self on public.wish_likes
  for delete
  using (auth.role() = 'authenticated' and user_id = auth.uid());

-- =============================================================================
-- wishes.reposted_from_id
-- =============================================================================

alter table public.wishes
  add column if not exists reposted_from_id uuid references public.wishes (id) on delete set null;

comment on column public.wishes.reposted_from_id is
  'If set, this wish was created via repost flow from the referenced wish (stage 05). Immutable after insert.';

create index wishes_reposted_from_id_idx
  on public.wishes (reposted_from_id)
  where reposted_from_id is not null;

create or replace function public.wishes_reposted_from_immutable()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and new.reposted_from_id is distinct from old.reposted_from_id then
    raise exception 'wishes.reposted_from_id is immutable';
  end if;
  return new;
end;
$$;

create trigger wishes_reposted_from_immutable_trg
  before update on public.wishes
  for each row execute function public.wishes_reposted_from_immutable();

-- Tighten INSERT: repost source must be someone else's non-archived wish.
drop policy if exists wishes_insert_self on public.wishes;

create policy wishes_insert_self on public.wishes
  for insert
  with check (
    auth.role() = 'authenticated'
    and owner_id = auth.uid()
    and (
      reposted_from_id is null
      or exists (
        select 1
        from public.wishes src
        where src.id = reposted_from_id
          and not src.is_archived
          and src.owner_id <> auth.uid()
      )
    )
  );
