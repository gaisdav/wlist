-- MVP: at most one image per wish — path on `wishes`; drop `wish_photos` gallery.
--
-- Supersedes multi-photo model from 20260513120000 (position, cover_photo_id).
-- Backfills `photo_storage_path` from the lowest `position` row per wish, then drops table.

-- =============================================================================
-- Column for single Storage object key (must exist before backfill UPDATE)
-- =============================================================================

alter table public.wishes add column if not exists photo_storage_path text;

-- =============================================================================
-- Backfill from legacy gallery (upload order = position ascending)
-- =============================================================================

update public.wishes w
set photo_storage_path = wp.storage_path
from (
  select distinct on (wish_id)
    wish_id,
    storage_path
  from public.wish_photos
  order by wish_id, position asc, created_at asc
) as wp
where w.id = wp.wish_id
  and w.photo_storage_path is null;

-- =============================================================================
-- Drop gallery table + cover FK
-- =============================================================================

alter table public.wishes drop constraint if exists wishes_cover_photo_id_fkey;

alter table public.wishes drop column if exists cover_photo_id;

drop table if exists public.wish_photos cascade;

-- =============================================================================
-- Constraints + comment
-- =============================================================================

comment on column public.wishes.photo_storage_path is
  'Object path inside bucket wish-photos (<wish_id>/<file>); null = no image.';

alter table public.wishes drop constraint if exists wishes_photo_storage_path_nonempty;

alter table public.wishes
  add constraint wishes_photo_storage_path_nonempty
  check (photo_storage_path is null or char_length(trim(photo_storage_path)) > 0);
