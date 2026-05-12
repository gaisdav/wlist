# @wlist/config

Shared configs for wlist monorepo:

- `tsconfig/base.json` — base TS config consumed by `@wlist/core`, `@wlist/api`.
- `tsconfig/react.json` — adds JSX + DOM lib for `apps/tma`.
- `tailwind/preset.ts` — added in PR2 (TMA scaffold).

ESLint and Prettier are configured at the repo root, not here, because they are flat configs picked up automatically.
