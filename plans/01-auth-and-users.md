# Этап 01. Auth и пользователи

## Цель

Реализовать аутентификацию пользователей через Telegram (TMA initData) и создать модель пользователя в БД, чтобы на этом фундаменте строить весь остальной функционал.

## Зависимости

- Этап 00 (Foundation).

## Скоуп

### 1. Аутентификация

- Клиент TMA получает `initData` из Telegram WebApp SDK при запуске.
- `initData` отправляется в Supabase Edge Function `auth-telegram`.
- Edge Function:
  - валидирует подпись `initData` секретом бота (HMAC-SHA256, по [официальному алгоритму](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app));
  - находит/создаёт пользователя в `auth.users` (через Supabase Admin API);
  - upsert-ит запись в публичной таблице `profiles`;
  - возвращает Supabase `access_token` (JWT).
- Клиент сохраняет JWT и использует его для всех запросов к Supabase.
- Re-auth при истечении токена / при перезапуске Mini App.

### 2. Модель `profiles`

Таблица `public.profiles`:
- `id` (`uuid`, PK, == `auth.users.id`)
- `telegram_id` (`bigint`, unique, not null)
- `username` (`text`, nullable)
- `first_name` (`text`)
- `last_name` (`text`, nullable)
- `photo_url` (`text`, nullable)
- `language_code` (`text`, nullable)
- `is_premium` (`boolean`, default false)
- `created_at`, `updated_at`

### 3. RLS-политики (базовые)

- `profiles`: каждый может читать любой профиль (нужно для подписок и просмотра вишлистов в будущем); писать может только владелец (`id = auth.uid()`).
- Подготовить шаблон RLS-политик, которыми будем пользоваться в дальнейших таблицах.

### 4. Клиентский слой

- `packages/core`: hook `useCurrentUser()` (платформо-агностичный — принимает auth-провайдер).
- `packages/api`: `signInWithTelegram(initData)`, `getProfile()`.
- В `apps/tma`: на старте приложения — авто-логин по initData, экран «Загрузка…», потом основной layout.

### 5. Экран профиля (минимальный)

- Отображает имя, фото, username из Telegram.
- Это нужно как baseline и для отладки auth-flow.

## Вне скоупа

- Подписки, роли, списки доступа (этапы 05, 08).
- Email/phone-аутентификация (отложено).
- Деавторизация — в TMA это делается выходом из Mini App; явная кнопка не нужна.

## Ключевые решения

- **Серверная валидация initData обязательна.** Клиентская валидация легко обходится.
- **Профиль обновляется при каждом логине** — Telegram-данные могут меняться (юзернейм, фото).
- **JWT хранится в памяти**, не в localStorage (TMA — короткоживущая сессия, безопаснее).

## Чек-лист задач

- [ ] Создать таблицу `profiles` + миграцию
- [ ] Прописать RLS-политики для `profiles`
- [ ] Реализовать Edge Function `auth-telegram` с валидацией initData
- [ ] Покрыть Edge Function `auth-telegram` unit-тестами (Vitest): валидная подпись → ок; невалидная подпись → 401; истекший `auth_date` → 401; повторный логин не дублирует профиль (security category A, см. `docs/architecture.md` §16)
- [ ] Реализовать `signInWithTelegram` в `packages/api`
- [ ] Реализовать `useCurrentUser` в `packages/core`
- [ ] Подключить auth-flow в `apps/tma` (экран загрузки)
- [ ] Минимальный экран профиля
- [ ] E2E-проверка: запуск Mini App в Telegram → видим свой профиль

## Definition of Done

- Любой пользователь, открывший Mini App в Telegram, автоматически авторизуется.
- В таблице `profiles` появляется его запись.
- В UI отображаются корректные данные из Telegram.
- Невалидный `initData` отвергается сервером с 401.
- RLS не даёт пользователю изменять чужой профиль.

## Открытые вопросы

- Срок жизни Supabase JWT для TMA-сессии.
- Что делать, если у пользователя в Telegram нет username (использовать `first_name`?).
- Нужна ли локально кэшируемая копия профиля (offline стартовый экран)?
