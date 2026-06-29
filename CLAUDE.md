# CLAUDE.md

Guidance for AI agents working in this repo. Full detail lives in
[`docs/architecture.md`](./docs/architecture.md) (16 sections, single source of truth);
this file is the short, must-follow version. When code and docs disagree, the code
wins — fix the doc.

## What this is

`wlist` — social wishlist **Telegram Mini App**. pnpm monorepo, Vite + React + Tailwind
(v4) frontend, Supabase (Postgres + RLS + Edge Functions) backend, **no custom backend
server**. TanStack Query for data, `wouter` for routing, `i18next` for copy, `zod` for
validation, `lucide-react` for icons, `tailwind-variants` for component variants.

## Package boundaries (enforced by ESLint `no-restricted-imports`)

```
apps/tma → @wlist/core, @wlist/api, @wlist/config
@wlist/core → @wlist/api, @wlist/config        (React OK; no react-dom / DOM / Telegram SDK)
@wlist/api  → @wlist/config                    (no React, no DOM, no UI runtime)
@wlist/config → nothing
```

- `@wlist/core` must stay **platform-agnostic**: no `react-dom`, `window`/`document`,
  `@telegram-apps/*`, no imports from `apps/*`, and no importing the concrete
  `SupabaseApiClient` — only the `ApiClient` **interface**.
- `core` reaches data only via the injected `ApiClient` (`useApiClient()` in hooks).
  Never call `supabase-js` from `core`.

## Layering inside `core`

`entities/` (Zod over generated row schemas) → `services/` (pure business ops, take
`ApiClient` as an arg) → `hooks/` (React + TanStack Query, the **only** place `core`
touches React). New use-cases go into `services/` first, not straight into `hooks/`.

## Hard conventions

- **snake_case stays snake_case.** DB rows, generated types, `ApiClient` shapes, and
  `core/entities` all use Postgres field names. Don't transform to camelCase.
- **Entities extend generated Zod**, never hand-copy columns. Import from
  `@wlist/api/generated/database.zod` and `.extend()` / `.superRefine()`.
- **Never edit `packages/api/src/generated/**`by hand** — regenerate with`pnpm db:codegen`.
- **Query keys come from one factory** (`core/config/queryKeys.ts`). Invalidate next to
  the mutation, not scattered in components.
- **No hardcoded UI strings** — everything user-facing goes through `t(...)` (`i18next`).
- **Icons:** `lucide-react` only in `apps/tma`. No inline `<svg>` / `*.svg?react`.
- **Class names:** compose with `clsx` (already a dep) — never string-concat Tailwind classes.
- **Imports:** no default exports (except config/entry files), no import cycles, ordered
  groups with newlines (ESLint `import-x/order`).

## Database & migrations

- Migrations live in `supabase/migrations/`, managed by the Supabase CLI. See the
  `/migration` command and [`docs/architecture.md` §11](./docs/architecture.md).
- After **any** schema change run `pnpm db:codegen` (regenerates `database.types.ts` +
  `database.zod.ts`), then `pnpm typecheck`. A schema change not reflected in `entities/`
  is meant to fail the build.
- **RLS is the security boundary.** Every table with user data gets `enable` + `force`
  row level security and explicit policies in the same migration. Some invariants are
  "hide from author" (e.g. `wish_slots`, comments) — these are security, not features.
- Secrets (`TG_BOT_TOKEN`, service-role key) live in Supabase Function Secrets / CI, never
  in the repo. Telegram `initData` is validated server-side only (HMAC in Edge Function).

## Before you finish

Run `pnpm validate` (lint:fix + format + typecheck + test) or at minimum
`pnpm typecheck && pnpm test`. Don't commit, branch, or push unless asked.

## Env var names (actual, not the doc's `VITE_PUBLIC_*` for Supabase)

`VITE_PUBLIC_APP_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (browser);
`TG_BOT_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY` (server/Edge only).
