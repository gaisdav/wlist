-- 0001 baseline
-- First migration of the wlist project. Sets up the schema marker and the
-- minimum extensions every later migration is allowed to assume.
--
-- Real domain tables (profiles, wishes, wish_slots, …) land in plan 01–03.
-- See docs/architecture.md §10 for RLS conventions and §11 for the migration
-- workflow.

comment on schema public is 'wlist app schema — managed by Supabase migrations';

-- gen_random_uuid() lives in pgcrypto (Supabase ships it pre-installed; this
-- statement is idempotent and documents the dependency for clean databases).
create extension if not exists pgcrypto with schema extensions;
