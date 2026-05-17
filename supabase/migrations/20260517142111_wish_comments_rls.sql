-- 06-wish-comments-rls: RLS policies for wish_comments

-- SELECT: 
-- - Guest sees all comments for non-archived wishes.
-- - Wish owner sees only comments where visible_to_owner_thread = true.
create policy wish_comments_select on public.wish_comments
  for select
  using (
    auth.role() = 'authenticated'
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

-- INSERT:
-- - User must be authenticated and inserting as themselves.
-- - Wish must be accessible (not archived, unless they are the owner).
-- - If it's a reply (parent_id is not null), the parent must be visible to them.
create policy wish_comments_insert on public.wish_comments
  for insert
  with check (
    auth.role() = 'authenticated'
    and author_id = auth.uid()
    and exists (
      select 1 from public.wishes w
      where w.id = wish_comments.wish_id
        and (not w.is_archived or w.owner_id = auth.uid())
        and (
          wish_comments.parent_id is null
          or exists (
             select 1 from public.wish_comments parent
             where parent.id = wish_comments.parent_id
               and (
                 w.owner_id != auth.uid() 
                 or parent.visible_to_owner_thread = true
               )
          )
        )
    )
  );

-- UPDATE:
-- - Only the author can update their own comments.
create policy wish_comments_update on public.wish_comments
  for update
  using (
    auth.role() = 'authenticated' 
    and author_id = auth.uid()
  )
  with check (
    auth.role() = 'authenticated' 
    and author_id = auth.uid()
  );

-- DELETE:
-- - Only the author can delete their own comments.
-- Note: the application mostly uses soft-delete (is_deleted = true via UPDATE),
-- but we allow hard delete for the author as well just in case.
create policy wish_comments_delete on public.wish_comments
  for delete
  using (
    auth.role() = 'authenticated' 
    and author_id = auth.uid()
  );

-- Service role bypass
create policy wish_comments_service_role on public.wish_comments
  for all
  to service_role
  using (true)
  with check (true);
