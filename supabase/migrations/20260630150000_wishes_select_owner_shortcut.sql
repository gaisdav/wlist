-- Fix: `INSERT INTO wishes ... RETURNING *` fails with 42501 for the wish's
-- own owner.
--
-- Root cause: migration 20260620100000 routed `wishes_select` through
-- `public.can_view_wish(auth.uid(), id)`. That function is STABLE SECURITY
-- DEFINER and resolves visibility by running `SELECT ... FROM public.wishes
-- WHERE id = p_wish_id` *inside itself*. During a PostgREST
-- `INSERT ... RETURNING` (the client sends `Prefer: return=representation`),
-- the SELECT-stage of the policy is evaluated against the freshly inserted
-- row, but the STABLE function's own nested SELECT does not see that
-- not-yet-visible row in its snapshot — so `can_view_wish` returns false and
-- the read of the just-inserted row is rejected with 42501.
--
-- This only hit `wishes` (not `events` / `user_lists`) because only
-- `wishes_select` delegates to a table-reading function; the others gate the
-- returned row inline.
--
-- Fix: short-circuit the owner inline, on the returned row itself, before
-- falling back to the visibility function. `can_view_wish` already lets the
-- owner through first, so this changes no visibility semantics — it only makes
-- the owner check evaluate against the row in hand, which works inside
-- `INSERT ... RETURNING`.

drop policy if exists wishes_select on public.wishes;

create policy wishes_select on public.wishes
  for select
  using (
    auth.role() = 'authenticated'
    and (
      -- Owner always sees their own row, evaluated inline so it holds for the
      -- freshly inserted row in `INSERT ... RETURNING` (no nested table read).
      owner_id = auth.uid()
      -- Everyone else: visibility gate (owner / archived / public / followers /
      -- lists). For non-owners this never reads the in-flight row.
      or public.can_view_wish(auth.uid(), id)
    )
  );
