# @wlist/core

Platform-agnostic business logic, hooks, design tokens, declarative routes, and i18n resources.

See [`docs/architecture.md`](../../docs/architecture.md) §3 for the full picture.

## Layout

```
src/
├── entities/   # camelCase Zod schemas (transform from api/generated/database.zod)
├── services/   # Business operations; take ApiClient as an argument
├── hooks/      # React hooks (TanStack Query) — organized by domain
│   ├── auth/
│   ├── wishes/
│   └── slots/
├── routes/     # Declarative route table
├── tokens/     # Design tokens (colors, spacing, radii, typography)
├── i18n/       # Translation resources + types (init lives in apps/tma)
├── lib/        # Platform-agnostic utilities
└── config/     # Constants, queryKeys factory
```

## Hard rules

- No `react-dom`, no `window/document`, no `@telegram-apps/*` imports.
- No imports from `apps/*`.
- Only the `ApiClient` interface from `@wlist/api` — never `SupabaseApiClient`.
- React is allowed only in `hooks/`.

ESLint enforces these rules via `no-restricted-imports`.
