# @wlist/tma

Telegram Mini App — Vite + React 19 + Tailwind v4 + TanStack Query + i18next + `@telegram-apps/sdk-react`.

## Run locally

```bash
# 1. Copy env template (first time only)
cp apps/tma/.env.example apps/tma/.env

# 2. Start the dev server
pnpm dev
# or directly: pnpm --filter @wlist/tma dev
```

By default Vite serves on `http://0.0.0.0:5173`. Use [ngrok](https://ngrok.com/) /
[localtunnel](https://github.com/localtunnel/localtunnel) to expose it over HTTPS for
@BotFather's Web App URL.

## Stack

| Concern              | Tool                                                             |
| -------------------- | ---------------------------------------------------------------- |
| Bundler / dev server | Vite 8                                                           |
| Framework            | React 19                                                         |
| Telegram integration | `@telegram-apps/sdk-react` v3 (initData, theme, BackButton)      |
| Server state         | TanStack Query 5                                                 |
| Forms                | React Hook Form 7 + Zod 4 (added in plan 02)                     |
| Styling              | Tailwind v4 (CSS-first `@theme`) + `tailwind-variants` + `clsx`  |
| i18n                 | i18next 26 + react-i18next, EN only (plan 04 may add RU)         |
| Routing              | History API + custom router (added in plan 02), routes from core |

## Architecture

This app is a **thin shell** over `@wlist/core` and `@wlist/api`.
See [`docs/architecture.md`](../../docs/architecture.md) §1 (high-level) and §3 (`packages/core`).

## Env

See [`.env.example`](./.env.example). PR2 only needs `VITE_PUBLIC_APP_URL`;
Supabase variables are added in PR3.
