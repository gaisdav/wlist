-- Migration to resolve RLS infinite recursion (Postgres error 42P17) on wish_comments insertion.

-- 1. Helper function to check if a comment's parent is visible to the user.
-- Marked as SECURITY DEFINER to bypass RLS and prevent infinite recursion.
create or replace function public.check_wish_comment_parent_visible(
  p_parent_id uuid,
  p_user_id uuid,
  p_wish_owner_id uuid
)
returns boolean as $$
declare
  v_visible_to_owner_thread boolean;
begin
  if p_parent_id is null then
    return true;
  end if;

  select visible_to_owner_thread into v_visible_to_owner_thread
  from public.wish_comments
  where id = p_parent_id;

  if v_visible_to_owner_thread is null then
    return false;
  end if;

  -- If the user is the wish owner, the parent comment must be visible to them.
  -- Otherwise, if they are a guest, they can reply (as the parent must have been visible to them).
  if p_user_id = p_wish_owner_id and not v_visible_to_owner_thread then
    return false;
  end if;

  return true;
end;
$$ language plpgsql security definer stable;

-- 2. Drop the existing recursive insert policy.
drop policy if exists wish_comments_insert on public.wish_comments;

-- 3. Recreate the insert policy utilizing the RLS-safe helper function.
create policy wish_comments_insert on public.wish_comments
  for insert
  with check (
    auth.role() = 'authenticated'
    and author_id = auth.uid()
    and exists (
      select 1 from public.wishes w
      where w.id = wish_comments.wish_id
        and (not w.is_archived or w.owner_id = auth.uid())
        and public.check_wish_comment_parent_visible(
          wish_comments.parent_id,
          auth.uid(),
          w.owner_id
        )
    )
  );
