# @wlist/api

Supabase client wiring, generated DB types & Zod schemas, Edge Function contracts.

See [`docs/architecture.md`](../../docs/architecture.md) §4 for the full picture.

## Layout

```
src/
├── client/
│   ├── ApiClient.ts         # Interface — what core depends on
│   └── SupabaseApiClient.ts # Impl over supabase-js (added in plan 01)
├── generated/
│   ├── database.types.ts    # supabase gen types (snake_case TS row types)
│   └── database.zod.ts      # supazod (snake_case Zod row schemas)
├── modules/                 # Low-level domain ops over supabase-js
└── edge-contracts/          # Zod request/response shapes for Edge Functions
```

## Hard rules

- No `react`, no `react-dom`, no `@telegram-apps/*` imports.
- Never edit `generated/*` by hand — regenerate via `pnpm db:types` + `pnpm db:zod`.
- The `service-role` key is used only inside Edge Functions, never in the bundled clients.

ESLint enforces import boundaries via `no-restricted-imports`.
