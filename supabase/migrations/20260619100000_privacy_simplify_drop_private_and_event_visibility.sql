-- Stage 08 (plans/08-privacy.md) PR 0 — simplify the schema added in Step 1
-- (20260618100000). Decisions (2026-06-29, see plan "Принятые решения"):
--
--   * Drop `private` from `wish_visibility` — a wish only the author can see has no
--     place in a social service (that's what the archive is for).
--   * Events are tags only, no privacy: drop `events.visibility` and the
--     `event_visibility_lists` table. Visibility lives on the wish; an event tag
--     never reveals a hidden wish (event_wishes_select ANDs can_view_wish in PR 1).
--
-- The database has no real data yet, so recreating the enum is safe.

-- =============================================================================
-- 1. Events are tags only — drop visibility FIRST
-- =============================================================================

-- Must run before recreating the enum: events.visibility also depends on
-- wish_visibility, so the old type can't be dropped while this column exists.
-- Dropping the table also drops its RLS policies and indexes.
drop table if exists public.event_visibility_lists;

alter table public.events drop column if exists visibility;

-- =============================================================================
-- 2. Recreate wish_visibility without `private`
-- =============================================================================

-- After step 1, wishes.visibility (default 'public') is the only dependent.
-- Drop the default so the column no longer depends on the old type, swap the
-- type via cast, then restore the default and drop the old type.

alter table public.wishes alter column visibility drop default;

alter type public.wish_visibility rename to wish_visibility_old;

create type public.wish_visibility as enum (
  'public',
  'followers',
  'lists'
);

alter table public.wishes
  alter column visibility type public.wish_visibility
  using visibility::text::public.wish_visibility;

alter table public.wishes
  alter column visibility set default 'public';

drop type public.wish_visibility_old;
