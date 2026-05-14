# Этап 02. MVP — Wishlist CRUD

## Цель

Дать пользователю возможность вести свой список желаний и просматривать чужие. Это «нулевая ценность» сервиса, без которой остальные фичи бессмысленны.

## Зависимости

- Этап 01 (Auth и пользователи).

## Скоуп

### 1. Модель данных

Таблица `public.wishes`:

- `id` (`uuid`, PK)
- `owner_id` (`uuid`, FK → `profiles.id`, not null)
- `title` (`text`, not null, 1..200)
- `description` (`text`, nullable, до **1000** символов — лимит в БД и в форме; в списке карточек UI обрезает превью)
- `price` (`numeric`, nullable)
- `currency` (`text`, **nullable**) — must be **null** when `price` is null; with a price, one of the supported codes (UI defaults to **USD** or the last currency picked in this browser, see `@wlist/core/lib` `lastWishCurrencyPreference`).
- `link` (`text`, nullable, валидный URL)
- `photo_storage_path` (`text`, nullable) — один объект в bucket `wish-photos` (`<wish_id>/<file>`); null = без фото
- `is_archived` (`boolean`, default false) — для скрытия выполненных, без удаления
- `created_at`, `updated_at`

### 2. Storage

- Bucket `wish-photos` (private).
- Политика: загружать может только владелец wish; читать — все авторизованные (видимость по подпискам появится в этапе 08).
- Лимит размера загрузки **3 MiB** (`@wlist/core/lib` `wishPhotoLimits`): JPEG/PNG/WebP на клиенте даунскейлятся (длинная сторона до 2048px) и перекодируются под лимит; **GIF** не трогаем (анимация) — только проверка размера. Реализация: `apps/tma/src/pages/wish-form/prepareWishPhotoUpload.ts`.

### 3. RLS

- `wishes`:
  - **SELECT:** в MVP — любой авторизованный пользователь видит любые не-архивные желания (приватность появится в этапе 08).
  - **INSERT:** `owner_id = auth.uid()`.
  - **UPDATE/DELETE:** только владелец.

### 4. UI экранов

1. **Мой вишлист** — список собственных желаний (карточки), кнопка «+ Добавить».
2. **Создание/редактирование желания** — форма (title, description, price, currency, link, фото).
3. **Карточка желания (детальный экран)** — все поля, одно фото (если есть), кнопки «редактировать», «архивировать», «удалить» (для владельца).
4. **Просмотр чужого вишлиста** — список карточек по `owner_id`. Без слотов и комментариев пока что.

### 5. Клиентский слой

- В `packages/api`:
  - `wishes.list(ownerId)`, `wishes.get(id)`, `wishes.create()`, `wishes.update()`, `wishes.archive()`, `wishes.delete()`
  - загрузка фото: signed URL (`storage.requestWishPhotoUpload`) + обновление `wishes.photo_storage_path`; при **замене** фото — удаление прежнего объекта в bucket (`storage.deleteWishPhoto`); снятие фото — очистка поля + удаление объекта из Storage при необходимости
- В `packages/core`:
  - hooks `useMyWishes()`, `useUserWishes(ownerId)`, `useWish(id)`
  - mutations `useCreateWish()`, `useUpdateWish()`, `useArchiveWish()`, `useDeleteWish()`
- В `apps/tma`: экраны и роутинг.

### 6. UX-нюансы

- Поддержка Telegram `MainButton` («Сохранить» в форме создания/редактирования).
- Поддержка `BackButton` для всех вложенных экранов.
- Skeleton-загрузка в списках.
- Optimistic update при создании/редактировании.

## Вне скоупа

- Слоты бронирования (этап 03).
- Комментарии (этап 06).
- События/категории (этап 07).
- Приватность (этап 08).
- Гостевой просмотр (этап 09).

## Ключевые решения

- **Фото грузим напрямую из клиента в Supabase Storage** (signed upload URL от Edge Function), без прокси через свой backend.
- **Цена и валюта — отдельные поля.** Это упростит дальнейшую агрегацию (например, для слотов «X из N собрано»).
- **`is_archived` вместо удаления.** Нельзя терять историю — она нужна для аналитики и для социальных сценариев («Маша уже выполнила это желание»).

## Чек-лист задач

- [x] Миграция `wishes` (одно фото: `photo_storage_path`)
- [x] RLS-политики
- [x] Bucket `wish-photos` + storage policies
- [x] Edge Function для signed upload URL
- [x] API-слой в `packages/api` (`wishes.*` на `ApiClient`)
- [x] Hooks в `packages/core` (queries + mutations)
- [x] Экран «Мой вишлист»
- [x] Экран создания/редактирования желания (форма + загрузка фото)
- [x] Экран карточки желания
- [x] Экран просмотра чужого вишлиста
- [x] Skeleton (списки, деталь, форма)
- [ ] Optimistic updates (можно добавить позже)
- [ ] Telegram `MainButton` как дубль submit (сейчас достаточно кнопки в форме + `BackButton`)

## Definition of Done

- Пользователь может создать/отредактировать/удалить желание со всеми полями и фото.
- Желание корректно отображается в списке и в детальном экране.
- Можно зайти на чужой профиль и посмотреть его желания.
- RLS проверена: чужое желание нельзя изменить даже через прямой запрос к API.

## Открытые вопросы

- ~~Несколько фото~~ — **в MVP одно фото** на желание; путь в `wishes.photo_storage_path`, без отдельной таблицы.
- ~~Валюты~~ — **select из 12 кодов:** `USD`, `EUR`, `RUB`, `KZT`, `GBP`, `CHF`, `PLN`, `UAH`, `TRY`, `JPY`, `CNY`, `RSD` (константа в `@wlist/core`).
- ~~Длинное описание~~ — **max 1000 символов** в БД и в форме создания/редактирования; в карточке списка — **обрезанное превью** (детальный экран — полный текст в пределах лимита).
- Парсить ли OG-данные по `link` на сервере, чтобы автоматически подтягивать заголовок и фото? (Возможно — отдельной фичей в post-MVP.)
