-- Remove is_deleted column from wish_comments and simplify count trigger

-- 1. Drop is_deleted column
alter table public.wish_comments
  drop column is_deleted;

-- 2. Simplify wishes comments count trigger function
create or replace function public.tg_wish_comments_count()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update public.wishes set comments_count = comments_count + 1 where id = new.wish_id;
  elsif tg_op = 'DELETE' then
    update public.wishes set comments_count = comments_count - 1 where id = old.wish_id;
  end if;
  return null;
end;
$$ language plpgsql;
