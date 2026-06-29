Create a Supabase database migration for schema changes in this pnpm monorepo.

Steps:

1. Confirm with the user what schema change is needed (which table/column/policy/function is being added/modified/removed).
2. Generate a migration from the local schema diff:
   - `pnpm db:diff <descriptive_name>` (wraps `supabase db diff -f <name>`) to capture the change into a new file in `supabase/migrations/`.
   - Alternatively, hand-write a new timestamped SQL file in `supabase/migrations/` for changes the differ cannot capture (e.g. RLS policies, triggers, seed-dependent logic).
3. Review the generated SQL:
   - Verify it is reversible/safe and does not drop data unintentionally.
   - Ensure RLS policies are present for any new table (this project is Supabase-backed; new tables without RLS are a security gap).
4. Apply locally and verify:
   - `pnpm db:reset` to rebuild the local database from scratch with all migrations (preferred for verifying a clean apply), or `pnpm db:push` to push pending migrations to the linked project when intentionally targeting remote.
5. Regenerate types and Zod schemas so application code stays in sync:
   - `pnpm db:codegen` (runs `db:types` → generates `packages/api/src/generated/database.types.ts`, then `db:zod` → `packages/api/src/generated/database.zod.ts`).
6. Verify nothing broke:
   - `pnpm typecheck`
   - `pnpm test`

Rules:

- Migrations live in `supabase/migrations/` and are applied via the Supabase CLI — do not hand-edit already-applied migration files; add a new migration instead.
- Always regenerate types with `pnpm db:codegen` after any schema change, otherwise `packages/api` types drift from the database.
- New tables must ship with appropriate RLS policies in the same migration.
- After codegen, always run `pnpm typecheck` to confirm generated types are consistent with consuming code.
