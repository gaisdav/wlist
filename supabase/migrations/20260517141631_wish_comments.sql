-- 06-wish-comments: wish_comments and wishes.comments_count

-- 1. wishes.comments_count
alter table public.wishes
  add column comments_count integer not null default 0;

-- 2. public.wish_comments
create table public.wish_comments (
  id uuid primary key default gen_random_uuid(),
  wish_id uuid not null references public.wishes(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.wish_comments(id) on delete cascade,
  body text not null check (char_length(body) >= 1 and char_length(body) <= 2000),
  is_deleted boolean not null default false,
  visible_to_owner_thread boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- parent_id must not be self
  constraint wish_comments_parent_id_check check (id != parent_id)
);

create index wish_comments_wish_id_idx on public.wish_comments(wish_id);
create index wish_comments_parent_id_idx on public.wish_comments(parent_id);
create index wish_comments_author_id_idx on public.wish_comments(author_id);

create trigger set_wish_comments_updated_at
  before update on public.wish_comments
  for each row execute function public.tg_set_updated_at();

-- 3. Trigger for visible_to_owner_thread
create or replace function public.tg_wish_comments_visibility()
returns trigger as $$
declare
  v_wish_owner uuid;
  v_parent_visibility boolean;
  v_parent_wish_id uuid;
begin
  if tg_op = 'INSERT' then
    if new.parent_id is null then
      -- Root comment
      select owner_id into v_wish_owner from public.wishes where id = new.wish_id;
      if new.author_id = v_wish_owner then
        new.visible_to_owner_thread := true;
      end if;
    else
      -- Reply comment
      select visible_to_owner_thread, wish_id into v_parent_visibility, v_parent_wish_id
      from public.wish_comments
      where id = new.parent_id;
      
      if v_parent_wish_id != new.wish_id then
        raise exception 'Reply must belong to the same wish as its parent';
      end if;
      
      new.visible_to_owner_thread := coalesce(v_parent_visibility, false);
    end if;
  elsif tg_op = 'UPDATE' then
    -- Protect against modifying immutable fields
    if new.visible_to_owner_thread is distinct from old.visible_to_owner_thread then
      raise exception 'Cannot change visible_to_owner_thread after creation';
    end if;
    if new.parent_id is distinct from old.parent_id then
      raise exception 'Cannot change parent_id after creation';
    end if;
    if new.wish_id is distinct from old.wish_id then
      raise exception 'Cannot change wish_id after creation';
    end if;
    if new.author_id is distinct from old.author_id then
      raise exception 'Cannot change author_id after creation';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger wish_comments_visibility_trigger
  before insert or update on public.wish_comments
  for each row execute function public.tg_wish_comments_visibility();

-- 4. Trigger for wishes.comments_count
create or replace function public.tg_wish_comments_count()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    if not new.is_deleted then
      update public.wishes set comments_count = comments_count + 1 where id = new.wish_id;
    end if;
  elsif tg_op = 'UPDATE' then
    if new.is_deleted and not old.is_deleted then
      update public.wishes set comments_count = comments_count - 1 where id = new.wish_id;
    elsif not new.is_deleted and old.is_deleted then
      update public.wishes set comments_count = comments_count + 1 where id = new.wish_id;
    end if;
  elsif tg_op = 'DELETE' then
    if not old.is_deleted then
      update public.wishes set comments_count = comments_count - 1 where id = old.wish_id;
    end if;
  end if;
  return null;
end;
$$ language plpgsql;

create trigger wish_comments_count_trigger
  after insert or update or delete on public.wish_comments
  for each row execute function public.tg_wish_comments_count();

-- 5. Enable RLS
alter table public.wish_comments enable row level security;
alter table public.wish_comments force row level security;
