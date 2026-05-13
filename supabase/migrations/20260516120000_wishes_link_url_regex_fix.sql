-- PostgreSQL POSIX regex: bounded counts in {m,n} must be 0..255 inclusive.
-- wishes_link_url used {1,2048} on [^[:space:]], which raises:
--   SQLSTATE 2201B — invalid repetition count(s)
-- Split URL shape vs max length: pattern + char_length(link) <= 2048.

alter table public.wishes
  drop constraint if exists wishes_link_url;

alter table public.wishes
  add constraint wishes_link_url check (
    link is null
    or (
      link ~ '^https?://[^[:space:]]+$'
      and char_length(link) <= 2048
    )
  );
