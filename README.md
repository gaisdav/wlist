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

## Deploy (Vercel)

The TMA is deployed to Vercel. Configuration lives in [`vercel.json`](./vercel.json) — it points Vercel at `apps/tma/dist` and runs `pnpm --filter @wlist/tma build`.

### One-time setup

1. <https://vercel.com/new> → **Import** the GitHub repo.
2. Vercel will detect `vercel.json` and **not** prompt for build settings — leave them as-is.
3. Set environment variables in **Project Settings → Environment Variables** (same names as in `apps/tma/.env`):
   - `VITE_PUBLIC_APP_URL` → the Vercel URL Vercel will give you (e.g. `https://wlist.vercel.app`)
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. After the first deploy, copy the Vercel URL into [@BotFather](https://t.me/BotFather) → your bot → **Bot Settings → Configure Mini App → Edit URL**.
5. Once `wlist.pro` is owned, add it as a Vercel custom domain and update `VITE_PUBLIC_APP_URL` + the BotFather Mini App URL.

### CI

GitHub Actions ([`.github/workflows/ci.yml`](./.github/workflows/ci.yml)) runs on every push and PR:

- `format:check`, `lint`, `typecheck`, `test`, `build`

A `supabase db lint` job (with a local Postgres) and a `db:codegen` drift-check job land in plan 01 when the first real migration is added.

## Where to read first

1. [`docs/architecture.md`](./docs/architecture.md) — full architecture (16 sections).
2. [`plans/README.md`](./plans/README.md) — development stages & accepted decisions.
3. [`.cursor/rules/`](./.cursor/rules/) — agent guidelines (also useful for humans).

## License

TBD (private project for now).
