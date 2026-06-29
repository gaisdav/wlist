# Этап 00. Foundation — фундамент проекта

## Цель

Подготовить инфраструктуру и каркас проекта так, чтобы дальнейшая разработка велась быстро, типобезопасно и с готовой архитектурой под мульти-платформенность (TMA → Web → RN).

## Зависимости

Нет.

## Идентичность проекта

- **Целевой домен:** `wlist.pro` — пока **не куплен**. На старте используем временный домен Vercel (например, `<project>-<hash>.vercel.app`), его значение хранится в `.env` (`VITE_PUBLIC_APP_URL`). При покупке `wlist.pro` — просто меняем `.env` и BotFather Web App URL, никакого кода переписывать не нужно.
- **Имя бота:** `@wlist_pro_bot`.
- **Название проекта / npm-scope:** TBD (определит пользователь; ориентир — `wlist` / `@wlist/*`).

## Скоуп

### 1. Монорепо

- Инициализация моно-репозитория на **pnpm workspaces**.
- Базовая структура каталогов:
  ```
  apps/
    tma/                  # Telegram Mini App (React + Vite)
  packages/
    core/                 # Платформо-агностичная бизнес-логика, типы, hooks, tokens
    api/                  # Supabase-клиент, генерируемые типы из БД, query-функции
    config/               # Общие конфиги (eslint, tsconfig, prettier)
  supabase/
    migrations/           # SQL-миграции
    functions/            # Edge Functions (валидация Telegram initData и т.д.)
  ```
- На уровне корня — общие `tsconfig.base.json`, `.eslintrc`, `.prettierrc`.

### 2. Tooling

- TypeScript (strict).
- ESLint + Prettier.
- Lint-staged + Husky на pre-commit.
- Скрипты `dev`, `build`, `lint`, `typecheck`, `test` на уровне репо.

### 3. Supabase

- Создать проект в Supabase (dev-окружение, позже — prod).
- Подключить локальный `supabase` CLI для миграций (гибридный режим: миграции пишем локально, применяем на remote dev-проект).
- Настроить **две генерации** из схемы БД в `packages/api/src/generated/`:
  - `pnpm db:types` → `database.types.ts` (TS-типы row, через `supabase gen types`)
  - `pnpm db:zod`   → `database.zod.ts` (Zod-схемы row, через `supazod`)
- Базовые настройки Auth: отключить email/password (он не нужен в MVP), оставить только anonymous + custom JWT для Telegram.

### 4. Telegram Mini App каркас

- Создать `apps/tma` (Vite + React + TS).
- Подключить `@telegram-apps/sdk-react` (или аналог).
- Базовый layout: поддержка тем, `BackButton`, `MainButton`.
- Подключить **TanStack Query**, **React Hook Form** и **Zod** (без использования — просто в зависимостях).
- Подключить **`i18next` + `react-i18next`**: инициализация в `apps/tma/src/i18n.ts`, словари в `packages/core/src/i18n/locales/en/`, type-safe `t()` через декларацию модуля. EN-only на старте.
- Подключить **Vitest** (без тестов — просто в зависимостях и базовый `vitest.config.ts` на уровне репо). Используем по факту появления первой security-critical логики или нетривиального pure-сервиса (см. `docs/architecture.md` §16).
- Точка входа, стартовый «Hello World» экран (все строки уже через `t()`).

### 5. Дизайн-токены и стилизация

- Завести `packages/core/tokens` — plain TS-объекты с дизайн-токенами:
  - `colors` (включая семантические: `background`, `foreground`, `primary`, `muted` и т.д.)
  - `spacing`, `radii`, `typography` (font-size, line-height, font-weight)
  - Без привязки к платформе (никаких CSS-классов внутри — только числа и строки).
- Подключить **Tailwind CSS** в `apps/tma`. `tailwind.config.ts` импортирует токены из `@wishlist/core/tokens` через `theme.extend`.
- **Telegram-темы** (light/dark) прокидываются через CSS-переменные `--tg-theme-*`. Семантические токены Tailwind (`bg-background`, `text-foreground`, `border-border`) маппятся на эти переменные — паттерн как у shadcn/ui.
- Подключить **`tailwind-variants`** (или `cva`) + `clsx` для типизированных вариантов компонентов (`<Button variant="primary" size="md" />`). Это контракт API компонентов и защита от длинных `className`.
- **Гибридный стилевой подход**: Tailwind как основной инструмент (95% случаев), точечные **CSS Modules** для компонентов с реально сложной графикой — mesh-градиенты, layered glassmorphism, кастомные `@keyframes`. CSS Modules лежат рядом с компонентом (`Card.module.css`).
- UI-библиотеку не используем — компоненты пишем сами.

### 6. Telegram-бот (минимальный)

- Создать бота через `@BotFather`.
- Подключить Web App URL — указать на dev-домен Mini App.
- На этом этапе бот используется **только как launcher** — никакой backend-логики у бота нет.

### 7. Хостинг и CI/CD

- Захостить `apps/tma` на **Vercel**.
- Настроить HTTPS-домен (требование Telegram).
- GitHub Actions: на каждый PR — `lint`, `typecheck`, `build`, `supabase db lint`.
- Auto-deploy preview-окружения для PR (нативно через Vercel + GitHub).

## Вне скоупа

- Любой пользовательский функционал (всё это в этапах 01–04).
- RLS-политики (минимальные появятся в 01).
- Production-окружение Supabase (создадим перед релизом MVP в 04).

## Ключевые решения

- **Tooling монорепо** (pnpm workspaces / Turborepo / Nx) — обсуждаем в архитектурном шаге.
- **Бизнес-логика в `packages/core`** — никаких импортов из React DOM, никакой привязки к платформе.
- **Supabase-доступ инкапсулирован в `packages/api`** — приложения никогда не используют `supabase-js` напрямую.
- **Валидация Telegram initData выполняется на сервере** (Supabase Edge Function), а не в клиенте — иначе можно подделать пользователя.
- **Источник правды для типов сущностей — схема БД.** Из миграций → `database.types.ts` + `database.zod.ts` (через `supabase gen types` и `supazod`). Доменные `core/entities/*` — `.transform()` поверх Zod-схем БД. Расхождения с БД невозможны по построению.
- **Дизайн-токены — единый источник правды для всех платформ.** Цвета, отступы, радиусы, типографика лежат в `packages/core/tokens` как plain TS-объекты. Tailwind-конфиг TMA потребляет их через `theme.extend`; будущие RN/web-приложения возьмут те же токены из `core`. Это даёт визуальную консистентность между платформами без иллюзии «общего стилевого кода» (стилевые движки на web и RN всё равно разные).
- **Стилизация — Tailwind CSS + точечные CSS Modules.** Tailwind как основной инструмент (скорость, design constraints, tree-shaking, простой путь к NativeWind в RN). CSS Modules — только для редких компонентов со сложной графикой, которую неудобно выражать утилитами. UI-библиотеку не используем — компоненты пишем сами.
- **Решение по стилизации в RN откладываем до этапа 12** (NativeWind с шарингом `tailwind.config` vs `StyleSheet` поверх токенов). К этому моменту накопится реальный опыт с TMA.

## Чек-лист задач

- [x] Инициализировать моно-репо на pnpm workspaces
- [x] Настроить TS / ESLint / Prettier / Husky
- [x] Создать `apps/tma` (Vite + React)
- [x] Создать пакеты `core`, `api`, `config` (структура `core` — layer-based)
- [x] Завести `packages/core/tokens` (colors, spacing, radii, typography) как plain TS
- [x] Подключить Tailwind CSS, прокинуть токены из `core/tokens` в `tailwind.config`
- [x] Настроить семантические токены под Telegram-темы (`--tg-theme-*` → `bg-background`, `text-foreground` и т.д.)
- [x] Подключить `tailwind-variants` (или `cva`) + `clsx`
- [x] Подключить TanStack Query, React Hook Form, Zod в зависимостях
- [x] Подключить i18next + react-i18next; завести `packages/core/src/i18n/locales/en/` и type-safe `t()`
- [x] Подключить Vitest и базовый `vitest.config.ts` (без тестов — будут по фактической нужде)
- [x] Создать Supabase-проект (dev), подключить CLI (гибридный режим)
- [x] Настроить `pnpm db:types` (supabase gen types → `database.types.ts`)
- [x] Настроить `pnpm db:zod` (supazod → `database.zod.ts`)
- [x] CI-проверка свежести обоих файлов при наличии миграций в PR (`.github/workflows/supabase.yml`)
- [x] Создать Telegram-бота через BotFather
- [x] Подключить Mini App URL к боту
- [x] Захостить TMA на Vercel (HTTPS-домен)
- [x] Настроить GitHub Actions (lint/typecheck/build/unit — `.github/workflows/ci.yml`)
- [x] Настроить preview-деплои на PR (через Vercel)

## Definition of Done

- В Telegram-боте по нажатию `Start` открывается Mini App с приветственным экраном.
- Локально работают `pnpm dev`, `pnpm typecheck`, `pnpm lint`.
- На любой PR в GitHub запускается CI и собирается preview.
- Сгенерированные типы Supabase подтягиваются в коде.

## Открытые вопросы

- Имя бота и название проекта / npm-scope (определит пользователь).
- Использовать ли task-runner поверх pnpm (Turborepo) для кэша/параллелизации билдов, или ограничиться `pnpm -r`.
