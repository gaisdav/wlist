# Этап 07. События и категории

## Цель

Дать пользователям возможность группировать желания по событиям (День рождения, Новый год…).

## Зависимости

- Этап 04 (желания — создание и редактирование желаний).
- (Связь с подписчиками и лентой перенесена на этап 10 в рамках напоминаний).

## Скоуп

### 1. Модель данных

Таблица `public.events`:

- `id` (`uuid`, PK)
- `owner_id` (`uuid`, FK → `profiles.id`, on delete cascade)
- `title` (`text`) — например, «Мой День рождения»
- `event_date` (`date`, nullable) — дата события
- `is_recurring_yearly` (`boolean`, default true) — повторяется ли событие ежегодно. Позволяет рассчитывать дату следующего события без привязки к конкретному году (актуально для дней рождения и ежегодных праздников)
- `is_archived` (`boolean`, default false)
- `created_at`, `updated_at`

Таблица связи `public.event_wishes`:

- `event_id` (`uuid`, FK → `events.id`, on delete cascade)
- `wish_id` (`uuid`, FK → `wishes.id`, on delete cascade)
- PK: `(event_id, wish_id)`

> [!NOTE]
> **Логика удаления:** 
> - При удалении события записи в связующей таблице `event_wishes` удаляются автоматически (`on delete cascade` для `event_id`). Сами желания при этом остаются нетронутыми (связь просто разрывается).
> - Желание может относиться к нескольким событиям одновременно.

### 2. RLS

- `events`:
  - **SELECT:** все авторизованные (с учётом приватности из этапа 08).
  - **INSERT/UPDATE/DELETE:** только владелец (`owner_id = auth.uid()`).
- `event_wishes`: владелец события == владелец желания.

### 3. UI

- На профиле — секция «События» (список карточек).
- Экран события — список привязанных к нему желаний (тематический вишлист).
- Создание/редактирование события: title, дата, is_recurring_yearly.
- При создании/редактировании желания — мультиселект «привязать к событиям».
- **Компонент Badge** (`apps/tma/src/components/primitives/badge`) для отображения тегов событий на карточках желаний и на детальной странице желания.

## Вне скоупа и будущие доработки

- **Уведомления и напоминания о событиях** (полностью перенесены на **Этап 10**). Создание события не отправляет записи в ленту `feed_events` на этом этапе.
- **Блок «Скоро праздники у друзей»** на главной/в ленте (перенесен на будущие этапы в рамках интеграции событий с лентой).
- **Календарь-вью (Calendar View)** с отображением месяцев и сеткой дат (вынесен во внеочередные доработки, на данном этапе достаточно простого списка карточек событий).
- Telegram-уведомления (этап 10).
- Синхронизация с системными календарями (backlog в этапе 13).
- Авто-предложение события «День рождения» по дате из Telegram-профиля (Telegram её не отдаёт API → backlog).

## Ключевые решения

- **Recurring события — по дате, без времени.** Праздник = весь день.
- **Привязка желаний к событиям многие-ко-многим** — одно желание может быть и на ДР, и на НГ.
- **Простое разорвание связей при удалении** — удаление события не влияет на существование самих желаний.

## Чек-лист задач

- [x] Миграции: создание таблиц `events`, `event_wishes`
- [x] Настройка каскадного удаления (`on delete cascade`) для связей
- [x] Настройка политик RLS для `events` and `event_wishes`
- [x] API + hooks для работы с событиями (получение, создание, редактирование, удаление)
- [x] UI: Создать универсальный компонент `Badge` (с поддержкой разных размеров и цветов) в `apps/tma/src/components/primitives`
- [x] UI: секция «События» на профиле пользователя (`UserEventsSection`)
- [x] UI: создание/редактирование события (`EventFormPage`)
- [x] UI: экран детального просмотра события (список желаний — `EventDetailPage`)
- [x] UI: добавление мультиселекта событий в форму создания/редактирования желания
- [x] UI: Использовать `Badge` для вывода привязанных к желанию событий в `WishCard.tsx` и `WishDetailPage.tsx`

## Пошаговый план реализации

### Шаг 1. База данных (SQL-миграция)
1. Создать новую SQL-миграцию:
   ```bash
   supabase migration new create_events_and_event_wishes
   ```
2. В файле миграции спроектировать:
   - Таблицу `public.events`: `id` (PK, uuid), `owner_id` (FK → profiles.id, ON DELETE CASCADE), `title` (text, not null), `event_date` (date, nullable), `is_recurring_yearly` (boolean, default true), `is_archived` (boolean, default false), `created_at`, `updated_at`.
   - Таблицу `public.event_wishes`: `event_id` (FK → events.id, ON DELETE CASCADE), `wish_id` (FK → wishes.id, ON DELETE CASCADE), PK `(event_id, wish_id)`.
   - Включить RLS для обеих таблиц и настроить политики безопасности:
     - `events`: SELECT — всем авторизованным, INSERT/UPDATE/DELETE — только владельцу (`owner_id = auth.uid()`).
     - `event_wishes`: SELECT — всем авторизованным, INSERT/DELETE — только владельцу события (`auth.uid() = (select owner_id from events where id = event_id)`).
3. Применить миграцию локально:
   ```bash
   pnpm db:reset
   ```

### Шаг 2. Генерация типов и Zod-схем
1. Запустить кодогенерацию для обновления TypeScript-типов базы данных и соответствующих Zod-схем:
   ```bash
   pnpm db:codegen
   ```
   Убедиться, что в `packages/api/src/generated/database.types.ts` and `packages/api/src/generated/database.zod.ts` появились схемы для `events` и `event_wishes`.

### Шаг 3. API-клиент (`packages/api`)
1. Добавить сигнатуры методов в интерфейс `ApiClient` в файле `packages/api/src/clients/ApiClient.ts` и определить их в `packages/api/src/clients/events/types.ts`:
   - `events.listByOwner(ownerId: string): Promise<EventRow[]>`
   - `events.get(id: string): Promise<EventRow | null>`
   - `events.create(input: { title: string; event_date?: string | null; is_recurring_yearly?: boolean }): Promise<EventRow>`
   - `events.update(input: { id: string; title?: string; event_date?: string | null; is_recurring_yearly?: boolean; is_archived?: boolean }): Promise<EventRow>`
   - `events.delete(id: string): Promise<void>`
   - `events.listWishes(eventId: string): Promise<WishRow[]>`
   - `events.linkWish(eventId: string, wishId: string): Promise<void>`
   - `events.unlinkWish(eventId: string, wishId: string): Promise<void>`
   - `events.setWishEvents(wishId: string, eventIds: string[]): Promise<void>` (для мультиселекта на форме создания/редактирования желания)
   - `events.listForWish(wishId: string): Promise<EventRow[]>`
2. Реализовать эти методы в доменной папке `packages/api/src/clients/events/` (создав файл `EventsApiClient.ts` с экспортом `createEventsApi`), после чего подключить его в `SupabaseApiClient.ts` и `ApiClient.ts`.

### Шаг 4. Бизнес-логика в `@wlist/core`
1. **Слой Entities:**
   - В `packages/core/src/entities/event/` создать `event.ts`, где расширить Zod-схему на основе сгенерированной `database.zod.ts`.
2. **Слой Services:**
   - В `packages/core/src/services/events/` реализовать `eventsService.ts` с вызовами API-клиента.
3. **Query Keys:**
   - Добавить ключи для инвалидации кэша TanStack Query в `packages/core/src/config/queryKeys.ts` (`queryKeys.events.byOwner(ownerId)`, `queryKeys.events.one(eventId)`, `queryKeys.events.forWish(wishId)`).

### Шаг 5. React Hooks (`packages/core/src/hooks`)
1. Создать React-хуки в `packages/core/src/hooks/events/`:
   - `useUserEvents(ownerId)` — получение списка событий пользователя.
   - `useEvent(eventId)` — получение детальной информации о событии.
   - `useEventWishes(eventId)` — получение списка желаний, привязанных к событию.
   - `useCreateEvent()`, `useUpdateEvent()`, `useDeleteEvent()` — мутации для управления событиями.
   - `useWishEvents(wishId)` — получение событий, к которым привязано желание.
   - `useSetWishEvents()` — мутация для привязки желания к списку событий.
2. Сделать реэкспорт хуков через `packages/core/src/index.ts`.

### Шаг 6. Роутинг и переводы (i18n)
1. В `packages/core/src/routes/routes.ts` зарегистрировать новые маршруты wouter:
   - `myEvents` (или отображать прямо на вкладке профиля)
   - `eventDetail: /event/:eventId`
   - `eventCreate: /event/new`
   - `eventEdit: /event/:eventId/edit`
2. В `packages/core/src/i18n/` добавить строки переводов для событий (названия полей, валидационные сообщения, кнопки создания/редактирования).

### Шаг 7. Разработка UI в `apps/tma`
1. **Создание компонента Badge (`apps/tma/src/components/primitives/badge/Badge.tsx`):**
   - Реализовать с помощью `tailwind-variants` гибкий UI-компонент тегов (различные стили/цвета: нейтральный, бренд, контурный и т.д., а также **поддержка разных размеров**, например, `sm` и `md`).
2. **Профиль пользователя (`MyWishlistPage` / `UserWishlistPage`):**
   - Вывести горизонтальный или сеточный блок «События» под заголовком страницы.
   - Каждое событие отображается красивой карточкой (название, дата, если это ежегодное событие — рассчитывать дни до него).
3. **Форма события (`EventFormPage`):**
   - Универсальная страница создания/редактирования события (поля: название, дата, чекбокс "повторять ежегодно").
4. **Детальная страница события (`EventDetailPage`):**
   - Заголовок с названием события и датой.
   - Список желаний, привязанных к событию.
   - Кнопка «Редактировать» (если это событие текущего пользователя).
5. **Форма желания (`WishFormPage`):**
   - Интегрировать секцию мультиселекта (или чекбоксов) «Добавить в события» в форму создания/редактирования желания.
   - При сохранении желания вызывать `events.setWishEvents(wishId, selectedEventIds)`.
6. **Вывод тегов событий на карточках желаний (`WishCard.tsx`):**
   - Использовать компактный размер `Badge` (`size="sm"`) для вывода тегов привязанных событий.
7. **Вывод тегов событий на детальной странице желания (`WishDetailPage.tsx`):**
   - Отображать бейджи привязанных событий стандартного или компактного размера с помощью компонента `Badge`.

## Definition of Done

- Пользователь может создать кастомное событие, привязать к нему желания, открыть его как отдельный список.
- При удалении события связь с желаниями корректно удаляется, а сами желания остаются нетронутыми.
- Любое событие можно отредактировать или удалить.
