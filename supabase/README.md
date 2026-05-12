# Supabase

Database migrations, generated artifacts, and Edge Functions for **wlist**.

See [`docs/architecture.md`](../docs/architecture.md) §9–§11 for the full picture and [`.cursor/rules/05-supabase-rls.mdc`](../.cursor/rules/05-supabase-rls.mdc) for hard rules around migrations and RLS.

## Layout

```
supabase/
├── config.toml          # Supabase CLI project config (committed)
├── migrations/          # SQL migrations — one logical change per file
├── functions/           # Edge Functions (Deno) — added in plan 01+
└── seed.sql             # Optional dev seed (not committed yet)
```

Generated artifacts live outside this folder, in [`packages/api/src/generated/`](../packages/api/src/generated/):

- `database.types.ts` — `supabase gen types`
- `database.zod.ts` — `supazod`

## One-time setup (per machine)

```bash
# 1. Install the CLI
brew install supabase/tap/supabase

# 2. Copy env templates and fill in your project secrets
cp .env.example .env
cp apps/tma/.env.example apps/tma/.env
#    SUPABASE_PROJECT_REF   = <project-ref> from Settings → General
#    SUPABASE_ACCESS_TOKEN  = create at https://supabase.com/dashboard/account/tokens

# 3. Link the local CLI to your remote dev project
set -a && source .env && set +a
pnpm db:link
```

## Daily workflow

### Adding a migration

```bash
supabase migration new <snake_case_name>   # creates a timestamped file
# edit the new SQL file in supabase/migrations/
pnpm db:push                                # applies migration to remote dev
pnpm db:codegen                             # regenerates database.types.ts + database.zod.ts
```

`pnpm db:codegen` runs both `db:types` and `db:zod`. Always commit the generated files alongside the migration that produced them — CI verifies they're in sync (added in PR4).

### Resetting local dev DB

```bash
pnpm db:start          # boots a local Supabase stack via docker
pnpm db:reset          # wipes + re-applies all migrations
pnpm db:stop
```

Local stack is optional — for most MVP work the linked dev project is enough.

### Editing Edge Functions

Functions land in `supabase/functions/<name>/index.ts`. Deployment workflow is added in plan 01 (`auth-telegram` is the first function).

## Hard rules (also enforced by `.cursor/rules/05-supabase-rls.mdc`)

- **No manual SQL files.** Always go through `supabase migration new`.
- **No down-migrations.** Roll forward with a new migration.
- **Every user-data table** gets `enable row level security` **and** `force row level security`.
- **`service_role` key** lives only inside Edge Functions / `.env`, never in `apps/*`.
