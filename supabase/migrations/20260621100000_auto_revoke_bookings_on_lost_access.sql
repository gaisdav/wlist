-- Stage 08 (plans/08-privacy.md) PR 2 — auto-revoke bookings on lost access.
--
-- When a viewer loses access to a wish they hold an active booking on, that
-- booking is auto-cancelled. v1 covers two access-loss events:
--   * removed from a list  (DELETE on user_list_members) -> 'lists' wishes
--   * unfollow             (DELETE on follows)            -> 'followers' wishes
--
-- Design: both triggers run AFTER DELETE, so the row is already gone and
-- can_view_wish() reflects the post-deletion state. We don't try to reason about
-- *why* access changed — we just re-check can_view_wish for the affected user's
-- active slots on the candidate wishes and cancel the ones they can no longer
-- see. This is robust to overlap (e.g. still a member of another shared list, or
-- the wish is also 'public'): such slots keep can_view_wish = true and survive.
--
-- Cancelling = setting status='cancelled'; the existing
-- wish_slots_set_cancelled_at_bu trigger fills cancelled_at, and the cap trigger
-- only fires on insert / active-transition, so it is not tripped here.

-- =============================================================================
-- Removed from a list -> cancel now-invisible 'lists' bookings
-- =============================================================================

create or replace function public.revoke_bookings_on_list_removal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.wish_slots s
  set status = 'cancelled'
  where s.booked_by = old.member_id
    and s.status = 'active'
    and s.wish_id in (
      -- only wishes shared with the list the member was just removed from
      select wvl.wish_id
      from public.wish_visibility_lists wvl
      where wvl.list_id = old.list_id
    )
    and not public.can_view_wish(old.member_id, s.wish_id);
  return old;
end;
$$;

comment on function public.revoke_bookings_on_list_removal() is
  'Stage 08: cancel a member''s active bookings on wishes they can no longer see after being removed from a list.';

drop trigger if exists user_list_members_revoke_bookings_ad on public.user_list_members;

create trigger user_list_members_revoke_bookings_ad
  after delete on public.user_list_members
  for each row
  execute function public.revoke_bookings_on_list_removal();

-- =============================================================================
-- Unfollow -> cancel now-invisible 'followers' bookings
-- =============================================================================

create or replace function public.revoke_bookings_on_unfollow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.wish_slots s
  set status = 'cancelled'
  where s.booked_by = old.follower_id
    and s.status = 'active'
    and s.wish_id in (
      -- only wishes owned by the user who was just unfollowed
      select w.id
      from public.wishes w
      where w.owner_id = old.followee_id
    )
    and not public.can_view_wish(old.follower_id, s.wish_id);
  return old;
end;
$$;

comment on function public.revoke_bookings_on_unfollow() is
  'Stage 08: cancel a follower''s active bookings on the unfollowed user''s wishes they can no longer see.';

drop trigger if exists follows_revoke_bookings_ad on public.follows;

create trigger follows_revoke_bookings_ad
  after delete on public.follows
  for each row
  execute function public.revoke_bookings_on_unfollow();
