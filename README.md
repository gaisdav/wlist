# wlist

Social wishlist Telegram Mini App — coordinate gifts, not money.

## Layout

```
apps/
  tma/                  # Telegram Mini App (Vite + React + Tailwind)
packages/
  core/                 # @wlist/core — business logic, hooks, tokens, routes, i18n
  api/                  # @wlist/api  — Supabase client, generated types/Zod, edge contracts
  config/               # @wlist/config — shared tsconfig
supabase/               # SQL migrations + Edge Functions (CLI managed)
docs/
  architecture.md       # Target architecture (single source of truth)
plans/                  # Stage-by-stage development plan (00–13)
.cursor/rules/          # Persistent guidance for the AI agent
```

## Quick start

Requires:

- Node.js >= 22 (see [`.nvmrc`](./.nvmrc))
- pnpm >= 11 (see `packageManager` in [`package.json`](./package.json))

```bash
pnpm install
cp .env.example .env                           # Supabase CLI / codegen
cp apps/tma/.env.example apps/tma/.env         # browser env

pnpm dev          # Start the Mini App at http://localhost:5173
pnpm typecheck    # Type-check all packages in parallel
pnpm lint         # ESLint across the repo
pnpm test         # Vitest (no tests yet — see docs/architecture.md §16)
pnpm format       # Prettier write
```

For the database / Supabase CLI workflow, see [`supabase/README.md`](./supabase/README.md).

## Where to read first

1. [`docs/architecture.md`](./docs/architecture.md) — full architecture (16 sections).
2. [`plans/README.md`](./plans/README.md) — development stages & accepted decisions.
3. [`.cursor/rules/`](./.cursor/rules/) — agent guidelines (also useful for humans).

## License

TBD (private project for now).
