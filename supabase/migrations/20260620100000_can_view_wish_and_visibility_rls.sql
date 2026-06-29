-- Stage 08 (plans/08-privacy.md) PR 1 — can_view_wish() + visibility-aware SELECT RLS.
--
-- Single source of truth for "can viewer see this wish": owner / archived guard /
-- public / followers / lists. Every wish-dependent SELECT policy routes through it,
-- preserving the two existing security invariants:
--   * wish_slots  — hidden from the wish owner.
--   * wish_comments — closed threads hidden from the wish owner.
-- Visibility is an ADDITIONAL gate ANDed onto those, never a replacement.
--
-- The function is SECURITY DEFINER so it bypasses RLS on the tables it reads
-- (wishes / follows / wish_visibility_lists / user_list_members) — that avoids
-- recursion when a dependent table's policy calls it. It only ever returns a
-- boolean, never leaks rows.

-- =============================================================================
-- can_view_wish
-- =============================================================================

create or replace function public.can_view_wish(p_viewer uuid, p_wish_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.wishes w
    where w.id = p_wish_id
      and (
        -- 1. Owner always sees their own wish (including archived).
        w.owner_id = p_viewer
        or (
          -- 2. Non-owner never sees archived wishes.
          not w.is_archived
          and (
            -- 3. public
            w.visibility = 'public'
            -- 4. followers: viewer follows the owner
            or (
              w.visibility = 'followers'
              and exists (
                select 1 from public.follows f
                where f.follower_id = p_viewer
                  and f.followee_id = w.owner_id
              )
            )
            -- 5. lists: viewer is a member of any list the wish is shared with
            or (
              w.visibility = 'lists'
              and exists (
                select 1
                from public.wish_visibility_lists wvl
                join public.user_list_members ulm on ulm.list_id = wvl.list_id
                where wvl.wish_id = w.id
                  and ulm.member_id = p_viewer
              )
            )
          )
        )
      )
  );
$$;

comment on function public.can_view_wish(uuid, uuid) is
  'Stage 08: true if p_viewer may see wish p_wish_id (owner / public / followers / lists). SECURITY DEFINER to avoid RLS recursion. Single source of truth for every wish-dependent SELECT policy.';

-- =============================================================================
-- wishes — visibility now lives entirely in can_view_wish
-- =============================================================================

drop policy if exists wishes_select on public.wishes;

create policy wishes_select on public.wishes
  for select
  using (
    auth.role() = 'authenticated'
    and public.can_view_wish(auth.uid(), id)
  );

-- =============================================================================
-- wish_slots — keep "hidden from owner", AND-in visibility
-- =============================================================================

drop policy if exists wish_slots_select_non_owner on public.wish_slots;

create policy wish_slots_select_non_owner on public.wish_slots
  for select
  to authenticated
  using (
    public.can_view_wish(auth.uid(), wish_id)
    and exists (
      select 1
      from public.wishes w
      where w.id = wish_slots.wish_id
        and w.owner_id is distinct from auth.uid()
    )
  );

-- =============================================================================
-- wish_comments — keep owner/closed-thread rule, AND-in visibility
-- =============================================================================

drop policy if exists wish_comments_select on public.wish_comments;

create policy wish_comments_select on public.wish_comments
  for select
  using (
    auth.role() = 'authenticated'
    and public.can_view_wish(auth.uid(), wish_id)
    and exists (
      select 1 from public.wishes w
      where w.id = wish_comments.wish_id
        and (not w.is_archived or w.owner_id = auth.uid())
        and (
          w.owner_id != auth.uid()
          or wish_comments.visible_to_owner_thread = true
        )
    )
  );

-- =============================================================================
-- wish_likes — visibility of the parent wish
-- =============================================================================

drop policy if exists wish_likes_select on public.wish_likes;

create policy wish_likes_select on public.wish_likes
  for select
  using (
    auth.role() = 'authenticated'
    and public.can_view_wish(auth.uid(), wish_id)
  );

-- =============================================================================
-- event_wishes — an event tag must not reveal a hidden wish
-- =============================================================================

drop policy if exists event_wishes_select on public.event_wishes;

create policy event_wishes_select on public.event_wishes
  for select
  using (
    auth.role() = 'authenticated'
    and public.can_view_wish(auth.uid(), wish_id)
  );

-- =============================================================================
-- feed_events — follower must not see a feed row for a now-hidden wish
-- =============================================================================
-- feed_events are wish-only rows (subject_id = wishes.id, see 20260616120000),
-- so the subject is always a wish. Keep the "own or followed actor" rule and
-- additionally require visibility of the subject wish.

drop policy if exists feed_events_select on public.feed_events;

create policy feed_events_select on public.feed_events
  for select
  using (
    auth.role() = 'authenticated'
    and public.can_view_wish(auth.uid(), subject_id)
    and (
      actor_id = auth.uid()
      or exists (
        select 1
        from public.follows f
        where f.follower_id = auth.uid()
          and f.followee_id = feed_events.actor_id
      )
    )
  );

-- =============================================================================
-- storage.objects (wish-photos) — narrow read by wish visibility
-- =============================================================================
-- Object key is "<wish_id>/<file>" (see 20260513120000). Match the wish by the
-- text form of its id (same pattern as the insert/update/delete policies — no
-- uuid cast, so a malformed key just matches nothing instead of erroring), then
-- gate by can_view_wish.

drop policy if exists wish_photos_storage_select on storage.objects;

create policy wish_photos_storage_select on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'wish-photos'
    and exists (
      select 1
      from public.wishes w
      where w.id::text = split_part(name, '/', 1)
        and public.can_view_wish(auth.uid(), w.id)
    )
  );
