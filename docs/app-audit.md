# Аудит приложения wlist — производительность, запросы, UX, доступность, архитектура

Дата: 2026-07-04. Аудит покрывает `apps/tma`, `packages/core`, `packages/api`.
Каждый пункт: **проблема → где → почему это важно → пошаговый план**.

Приоритеты: 🔴 — критично (заметно пользователю / бьёт по серверу), 🟡 — важно, 🟢 — желательно.

---

## Сводная таблица

| # | Область | Находка | Приоритет |
|---|---------|---------|-----------|
| 1.1 | Запросы | N+1: каждый `WishCard` делает 3 запроса (events, slots, likes) | 🔴 |
| 1.2 | Запросы | Signed URL фото не кэшируется — запрос на каждый маунт картинки | 🔴 |
| 1.3 | Запросы | N+1 профили: `FeedItemAuthorLink` и `CommentItem` — запрос на автора | 🟡 |
| 1.4 | Запросы | `WishDetailPage` грузит весь вишлист владельца ради prev/next | 🟡 |
| 1.5 | Запросы | `ProfilePage` грузит полные списки ради счётчиков | 🟡 |
| 1.6 | Запросы | `follows.listFollowing/listFollowers` без пагинации | 🟢 |
| 2.1 | Кэш/инвалидация | Лайк инвалидирует `wishes.all()` — рефетч всех списков | 🔴 |
| 2.2 | Кэш/инвалидация | Бронь слота инвалидирует `wishes.all()` | 🟡 |
| 2.3 | Кэш/инвалидация | Follow-toggle рефетчит весь infinite-фид (все страницы) | 🟡 |
| 2.4 | Кэш/инвалидация | Infinite-запросы без `maxPages` — рефетч растёт с числом страниц | 🟢 |
| 2.5 | Кэш/инвалидация | «pending»-ключи для disabled-запросов дублируются вручную | 🟢 |
| 3.1 | Optimistic UI | Кнопка лайка disabled во время мутации — ломает «мгновенность» | 🟡 |
| 3.2 | Optimistic UI | Лайк не патчит `likes_count` в кэшах списков/фида | 🟡 |
| 4.1 | Рендеры | Нет `React.memo` на карточках; `pages.flat()` без `useMemo` | 🟡 |
| 4.2 | Рендеры | `useMemo` футера комментариев бесполезен (нестабильные deps) | 🟢 |
| 4.3 | Рендеры | Нет виртуализации длинных списков | 🟢 |
| 5.1 | UI/UX | «Load more»-кнопка вместо infinite scroll | 🟡 |
| 5.2 | UI/UX | Поиск: результаты «моргают» скелетоном на каждый ввод | 🟡 |
| 5.3 | UI/UX | Картинки без `loading="lazy"` / `decoding="async"` / плавного появления | 🟡 |
| 5.4 | UI/UX | Язык интерфейса жёстко `en`, не берётся из Telegram | 🔴 |
| 5.5 | UI/UX | Нет pull-to-refresh / индикатора свежести фида | 🟢 |
| 5.6 | UI/UX | Комментарии: однострочный `<input>`, нет счётчика лимита | 🟢 |
| 6.1 | Доступность | BottomSheet/Lightbox: нет focus trap, возврата фокуса, кнопки закрытия | 🔴 |
| 6.2 | Доступность | `user-scalable=no` блокирует зум (WCAG 1.4.4) | 🟡 |
| 6.3 | Доступность | Тосты без `aria-live`; скелетоны без статуса загрузки | 🟡 |
| 6.4 | Доступность | Мелкие тач-цели и `aria-label` на не-интерактивных `<span>` | 🟢 |
| 7.1 | Архитектура | Нет ErrorBoundary — любая ошибка рендера кладёт всё приложение | 🔴 |
| 7.2 | Архитектура | `api` прокидывается аргументом в каждый хук | 🟡 |
| 7.3 | Архитектура | `wishes.update` всегда гоняет delete/insert по visibility-спискам | 🟢 |
| 7.4 | Архитектура | Удаление фото из Storage на клиенте — риск «сирот» | 🟢 |
| 8.1 | Сборка | Нет анализа бандла и `manualChunks` для vendor-кода | 🟢 |

---

## 1. Запросы к серверу

### 1.1 🔴 N+1: каждый `WishCard` порождает до 3 запросов

**Где:**
- `apps/tma/src/components/wishes/WishCard.tsx:28` — `useWishEvents(api, wish.id)` (события, привязанные к вишу);
- `apps/tma/src/components/wishes/WishReservationBadge.tsx:24` — `useWishReservation` → `useSlotsByWish` (слоты);
- `apps/tma/src/components/wishes/WishSocialStrip.tsx:22` — `useWishLikeState` (состояние лайка).

**Почему важно:** фид/вишлист из 20 карточек = до 60 параллельных запросов к Supabase (PostgREST) при каждом заходе + столько же после каждой инвалидации `wishes.all()` (см. 2.1). Это главный источник сетевой нагрузки и медленной отрисовки списков.

**План:**
1. Добавить батч-методы в `@wlist/api`:
   - `events.listForWishes(wishIds: string[]) → Record<wishId, EventRow[]>` — один запрос `wish_events` (join-таблица) `.in('wish_id', ids)` с embed `events(*)`;
   - `slots.listByWishes(wishIds: string[]) → Record<wishId, WishSlotRow[]>` — `.in('wish_id', ids)`;
   - `wishLikes.getStates(wishIds: string[]) → Record<wishId, {count, likedByMe}>` — один запрос по `wish_likes` c группировкой (RPC или два запроса: counts + «мои» лайки `.in(...)`).
2. В `core/hooks` завести хуки уровня списка: `useWishListAncillary(api, wishIds)` — одна query на страницу списка, ключи `queryKeys.events.forWishes(ids)` и т.п. (паттерн уже есть: `follows.status(ids)` с сортированным `join(',')`).
3. После получения батча **сидировать** пер-виш ключи через `qc.setQueryData(queryKeys.events.forWish(id), ...)`, чтобы `WishDetailPage` открывался без повторного запроса.
4. В `WishCard`/`WishReservationBadge`/`WishSocialStrip` заменить пер-виш хуки на данные из батча (пропсом или через пер-виш ключ, засидированный батчем — тогда компоненты не меняются, меняется только источник).
5. Прогнать `pnpm validate`; проверить в devtools сети, что список из 20 карточек делает ≤4 запросов (wishes + 3 батча) вместо ~60.
6. (Опционально, этап 2) перенести всё в один PostgREST-select с embed: `wishes.select('*, wish_slots(*), wish_events(events(*)))'` — ещё меньше запросов, но связывает shape API; батч-вариант проще и уже даёт 15× выигрыш.

### 1.2 🔴 Signed URL фото не кэшируется

**Где:** `apps/tma/src/components/wishes/useWishPhotoSignedUrl.ts` — `useState` + `useEffect`, промис на каждый маунт.

**Почему важно:** каждый ремаунт карточки (навигация туда-обратно, рефетч списка) заново ходит в Storage API за signed URL для каждой картинки. Плюс картинка «мигает» (src сбрасывается в `null`). TanStack Query здесь вообще не используется — кэш, дедупликация и ретраи теряются.

**План:**
1. Добавить ключ в `packages/core/src/config/queryKeys.ts`: `storage: { wishPhotoUrl: (path) => [...] }`.
2. Переписать `useWishPhotoSignedUrl` на `useQuery` с `enabled: Boolean(storagePath)`, `staleTime` ≈ 80% TTL ссылки (если TTL 1 час — `staleTime: 45 * 60_000`, `gcTime` не меньше), `retry: 1`.
3. Убедиться, что TTL signed URL задан в одном месте (`StorageApiClient`) и `staleTime` вычисляется от него, а не хардкодится вторым числом.
4. (Опционально) батч: `sb.storage.from('wish-photos').createSignedUrls(paths, ttl)` для списков — один запрос на страницу; сидировать пер-path ключи.
5. Проверить: повторный заход в фид не порождает запросов к Storage до истечения `staleTime`.

### 1.3 🟡 N+1 профили авторов

**Где:**
- `apps/tma/src/pages/feed/FeedItemAuthorLink.tsx:13` — `useProfileById` на каждый ряд фида;
- `apps/tma/src/components/comments/CommentsBottomSheet.tsx:54` — `useProfileById` на каждый комментарий.

**Почему важно:** дедупликация по ключу спасает от повторов одного автора, но фид с 20 разными авторами = 20 запросов; тред на 30 комментариев = до 30 запросов.

**План:**
1. Фид: расширить select в `FeedApiClient.list` embed-ом профиля актора: `select('*, wishes!left(*), profiles!feed_events_actor_id_fkey(*)')` (проверить имя FK; при необходимости добавить FK в миграции).
2. В `useInfiniteFeed` после парсинга страницы сидировать `queryKeys.profiles.byId(actor_id)` через `qc.setQueryData` — `FeedItemAuthorLink` останется как есть и попадёт в кэш.
3. Комментарии: аналогично embed `profiles(*)` в `CommentsApiClient.listByWish` + сидирование, либо прокинуть профиль пропсом в `CommentItem`.
4. Проверить RLS на `profiles` (публичное чтение уже должно быть — фид его использует).

### 1.4 🟡 `WishDetailPage` грузит весь список владельца ради prev/next

**Где:** `apps/tma/src/pages/wish-detail/WishDetailPage.tsx:45,110-117` — `useUserWishes(api, wish.data?.owner_id)` только чтобы найти соседние id.

**Почему важно:** открытие любого чужого виша тянет весь вишлист владельца (все колонки, без лимита). На больших списках это самый тяжёлый запрос страницы.

**План:**
1. Быстрый вариант: сузить select — добавить в `WishesApi` метод `listIdsByOwner(ownerId): Promise<{id: string}[]>` (`select('id')`, тот же порядок) и использовать его для prev/next; ключ `queryKeys.wishes.byOwnerIds(ownerId)`.
2. Либо RPC/два запроса `lt/gt created_at ... limit 1` — по одному id в каждую сторону.
3. Учесть, что если пользователь пришёл из фида, prev/next по чужому вишлисту может быть неожиданным — при желании прокинуть контекст источника (query-param `from=feed`) и прятать стрелки.

### 1.5 🟡 `ProfilePage` грузит полные списки ради счётчиков

**Где:** `apps/tma/src/pages/profile/ProfilePage.tsx:104-107` — `useMyWishes`, `useUserLists`, `useMySlotBookings` используются только как `data?.length`.

**Почему важно:** три полных выборки (все вишы, все списки, все брони со всеми колонками) ради трёх чисел на хабе.

**План:**
1. Добавить в API count-методы: `wishes.countByOwner(ownerId)`, `lists.countMine()`, `slots.countMyBookings()` — `select('*', { count: 'exact', head: true })` (паттерн уже есть в `FollowsApiClient.getCounts`).
2. Ключи: `queryKeys.wishes.countByOwner(id)` и т.д.; `staleTime` можно оставить дефолтный.
3. Плюс: `useMyWishes` на хабе всё равно полезен как prefetch перед переходом в «Мои желания» — тогда осознанно оставить, но заменить на `queryClient.prefetchQuery` (не блокирует и не рисует скелетоны счётчиков), а счётчики читать из count-запросов.

### 1.6 🟢 Списки подписок без пагинации

**Где:** `packages/api/src/clients/follows/FollowsApiClient.ts` — `listFollowing`/`listFollowers` возвращают всех.

**План:** добавить `limit/offset` (как в `profiles.listUsers`), в `UserFollowsBottomSheet` перейти на `useInfiniteQuery` + «показать ещё». Делать при росте аудитории; сейчас достаточно зафиксировать в API сигнатуру с параметрами.

---

## 2. Кэш и инвалидация

### 2.1 🔴 Лайк инвалидирует `wishes.all()`

**Где:** `packages/core/src/hooks/social/useToggleWishLike.ts:37` — `invalidateQueries({ queryKey: queryKeys.wishes.all() })` в `onSettled`.

**Почему важно:** один тап по сердечку рефетчит **все** активные wish-списки (`byOwner`, `byIds`, `one` всех вишей) — а каждый обновлённый список заново размонтирует/монтирует карточки и повторяет N+1 из п. 1.1. Оптимистичный паттерн сделан правильно, но инвалидация сводит его выгоду на нет.

**План:**
1. Убрать `invalidateQueries({ queryKey: queryKeys.wishes.all() })` из `onSettled`.
2. Единственное, что зависит от лайка в wish-строках — `likes_count`. Вместо инвалидации патчить его в `onMutate` (и откатывать в `onError`) через `qc.setQueriesData({ queryKey: queryKeys.wishes.all() }, updater)`, где updater находит виш по id в массивах/одиночных значениях, плюс отдельный updater для `queryKeys.feed.infinite()` (страницы `FeedItem[]` с вложенным `wish`).
3. Оставить точечные инвалидации: `wishLikes.state(wishId)` и `wishes.one(wishId)` (серверная правда по счётчику придёт оттуда).
4. Тест: с открытым фидом тапнуть лайк — в сети только `setLiked` + 2 точечных рефетча; счётчик на карточке обновился мгновенно и не откатился.

### 2.2 🟡 Бронирование слота инвалидирует `wishes.all()`

**Где:** `packages/core/src/hooks/slots/useSlots.ts:37,53` (`useBookSlots`, `useCancelSlot`).

**Почему важно:** та же лавина рефетчей, что и в 2.1, хотя от брони меняются только слоты конкретного виша.

**План:**
1. Заменить `wishes.all()` на точечные ключи: `slots.byWish(wishId)`, `wishes.one(wishId)`, `slots.myBookings()` — они уже есть в списке.
2. Если карточкам списка нужен статус брони (бейдж) — он читается из `slots.byWish` (или батча из 1.1), т.е. инвалидировать wish-списки незачем; после 1.1 инвалидировать батч-ключ слотов.

### 2.3 🟡 Follow-toggle рефетчит весь infinite-фид

**Где:** `packages/core/src/hooks/social/useFollowMutations.ts:24` — `invalidateQueries({ queryKey: queryKeys.feed.infinite() })` на каждый (un)follow.

**Почему важно:** infinite query при инвалидации рефетчит **все** загруженные страницы последовательно. Подписка на 5 людей подряд на экране поиска = 5 полных рефетчей фида в фоне.

**План:**
1. Состав фида действительно зависит от подписок, но обновлять его нужно не мгновенно, а к моменту показа: `invalidateQueries({ queryKey: queryKeys.feed.infinite(), refetchType: 'none' })` — пометить stale без рефетча; при заходе на `/feed` он рефетчится сам (query станет активной и stale).
2. Проверить сценарий: подписка прямо на странице фида — там рефетч уместен; можно оставить `refetchType: 'active'` только если текущий роут `/feed` (или просто принять один активный рефетч).

### 2.4 🟢 Infinite-запросы без `maxPages`

**Где:** `useInfiniteFeed.ts`, `useUsersList.ts`.

**План:** добавить `maxPages: 5` (100 элементов) в оба `useInfiniteQuery` — ограничивает память и стоимость рефетчей; TanStack сам подгрузит выпавшие страницы при скролле. Проверить UX прыжков скролла перед включением.

### 2.5 🟢 Ручные «pending»-ключи

**Где:** `useWishEvents.ts:12-14`, `useWishLikeState.ts:8-10`, `useProfileById.ts:8-10`, `useSlotsByWish` — паттерн `wishId ? key(id) : [...key(''), 'pending']`.

**Почему важно:** все disabled-инстансы одного хука делят один и тот же ключ `key('')+'pending'` — это не баг (query disabled), но хрупко: случайный `enabled: true` или `setQueryData` по префиксу заденет мусорный ключ.

**План:** завести в `queryKeys.ts` хелпер `disabledKey = (base: readonly unknown[]) => [...base, '__disabled__'] as const` и использовать его во всех пяти хуках; либо принять соглашение `key(id ?? '__none__')`. Чисто механическая замена + typecheck.

---

## 3. Optimistic UI

### 3.1 🟡 Кнопка лайка блокируется на время мутации

**Где:** `apps/tma/src/components/wishes/WishSocialStrip.tsx:44` — `disabled={likeState.isLoading || toggleLike.isPending}`.

**Почему важно:** смысл оптимистичного тоггла — мгновенная реакция и возможность передумать. Сейчас после тапа кнопка серая до ответа сервера; на медленной сети «мгновенный» лайк ощущается подвисшим. Плюс `disabled` пока грузится `likeState` — сердечко в фиде неактивно первые сотни мс.

**План:**
1. Убрать `toggleLike.isPending` из `disabled` — быстрые повторные тапы безопасны: `onMutate` в `useToggleWishLike` уже проверяет `previous.likedByMe !== liked`, а `cancelQueries` глушит гонки. Дополнительно можно в обработчике брать целевое состояние из кэша, а не из замыкания.
2. `likeState.isLoading`: вместо блокировки использовать `initialData` из уже известного `wish.likes_count` (`likedByMe` до ответа неизвестен — можно оставить disabled только до первого ответа, но убрать визуальное «серение», т.к. Button при disabled глушит и вид, и haptic).
3. Проверить в Telegram на throttled-сети: тап → сердечко и счётчик мгновенно, повторный тап работает.

### 3.2 🟡 Оптимистичный лайк не патчит списки

**Где:** `useToggleWishLike.ts` патчит только `wishLikes.state(wishId)`; `WishSocialStrip.tsx:27` для владельца и как fallback показывает `wish.likes_count` из строки списка.

**Почему важно:** счётчик на карточке (из `wish.likes_count`) обновляется только после полного рефетча списков (который мы убираем в 2.1) — появится рассинхрон между бейджем и state-запросом.

**План:** это вторая половина плана 2.1 (шаг 2): один updater, который патчит `likes_count` виша во всех кэшах (`wishes.*`, `feed.infinite`). Реализовать как чистую функцию `patchWishInCaches(qc, wishId, updater)` в `core/hooks` — пригодится и для комментариев (`comments_count`).

---

## 4. Лишние рендеры

### 4.1 🟡 Нет мемоизации карточек и производных массивов

**Где:**
- `React.memo` не используется нигде в `apps/tma` (проверено grep-ом);
- `apps/tma/src/pages/feed/FeedPage.tsx:31` — `feed.data?.pages.flat()` на каждый рендер без `useMemo`.

**Почему важно:** каждая карточка тянет 3 подписки на query (п. 1.1) и нетривиальный JSX. Любое обновление родителя (тик `isFetchingNextPage`, ввод в поиске, пришедший профиль) перерендеривает все карточки списка.

**План:**
1. Обернуть `WishCard`, `WishSocialStrip`, `WishReservationBadge`, `UserRow` (search) в `React.memo` — пропсы у них уже почти стабильны (объект `wish` стабилен между рендерами, пока query не обновилась).
2. В `SearchUsersPage` колбэки `onFollow/onUnfollow` создаются инлайн на каждый ряд — при `memo` перевести на передачу `userId` + стабильные `useCallback`-хендлеры (или один хендлер с data-атрибутом).
3. `FeedPage`: обернуть `flat` в `useMemo` по `feed.data` (в `SearchUsersPage` уже так).
4. Не увлекаться: мемоизировать только списочные компоненты; страницы-одиночки не трогать.
5. Проверить React DevTools Profiler-ом: ввод символа в поиске не перерендеривает существующие ряды.

### 4.2 🟢 Бесполезный `useMemo` футера комментариев

**Где:** `apps/tma/src/components/comments/CommentsBottomSheet.tsx:266-324` — `useMemo` с зависимостью `handleSubmit`, которая пересоздаётся каждый рендер.

**План:** вынести футер в отдельный компонент `CommentComposer` с собственным state (`body`, `showToOwner`) — тогда набор текста не будет рендерить весь список комментариев (сейчас каждый символ перерендеривает тред), а `useMemo` удалить. Заодно уйдёт `setTimeout(..., 50)` для фокуса — фокусить в `useEffect` по смене `replyToId/editingComment`.

### 4.3 🟢 Нет виртуализации длинных списков

**Где:** `FeedPage`, `MyWishlistPage`, `UserWishlistPage` рендерят все элементы.

**План:** после 1.1/4.1 давление снизится; если списки будут в сотнях элементов — добавить `@tanstack/react-virtual` (совместим с infinite query) для фида. До тех пор — не надо, это усложнение.

---

## 5. UI/UX

### 5.1 🟡 «Load more» вместо infinite scroll

**Где:** `FeedPage.tsx:111-122`, `SearchUsersPage.tsx:168-179`.

**Почему важно:** в мобильном фиде ручная кнопка — лишний тап и разрыв потока; это два главных скроллируемых экрана.

**План:**
1. Сделать компонент `InfiniteScrollSentinel` (`apps/tma/src/components/primitives`): `div` с `IntersectionObserver` (`rootMargin: '400px'`), вызывающий `fetchNextPage`, когда виден и `!isFetchingNextPage && hasNextPage`.
2. Поставить сентинел под списком в обеих страницах; кнопку оставить как fallback внутри сентинела (доступность: до неё можно дотабаться, и она же — ретрай при ошибке подгрузки).
3. Показать маленький спиннер/скелетон-карточку при `isFetchingNextPage`.

### 5.2 🟡 Поиск «моргает» при вводе

**Где:** `SearchUsersPage.tsx:104` — `users.isLoading` при смене `query` (ключ меняется → новая query → скелетон вместо прежних результатов).

**План:**
1. В `useUsersList` добавить `placeholderData: keepPreviousData` (из `@tanstack/react-query`).
2. В UI приглушать устаревший список (`opacity-60` при `users.isPlaceholderData`) вместо скелетона; скелетон — только на самый первый заход.
3. Проверить, что пустое состояние «ничего не найдено» не мигает между запросами.

### 5.3 🟡 Картинки: нет lazy-loading и плавного появления

**Где:** `apps/tma/src/components/wishes/WishPhoto.tsx:19` — голый `<img>`; аватары в `ProfileAvatar`, `CommentItem`.

**План:**
1. Добавить `loading="lazy"` и `decoding="async"` в `WishPhoto` и аватары списков.
2. В `WishPhoto` добавить fade-in: state `loaded`, `onLoad`, `clsx('transition-opacity motion-reduce:transition-none', loaded ? 'opacity-100' : 'opacity-0')` — вместе с кэшем из 1.2 уберёт «вспышки» при скролле.
3. Для hero-фото на детали (`WishDetailHero`) lazy **не** ставить (LCP-элемент), можно `fetchpriority="high"`.
4. (Опционально) генерировать превью-размер при аплоаде (Edge Function уже есть) и в списках грузить thumbnail, а не оригинал.

### 5.4 🔴 Язык интерфейса жёстко `en`

**Где:** `apps/tma/src/i18n.ts` — `lng: 'en'`; `packages/core/src/i18n/resources.ts` — только `en`. При этом весь код дисциплинированно ходит через `t(...)` и `formatRelativeTime(..., { locale: i18n.language })` — инфраструктура готова, но не используется.

**Почему важно:** аудитория Telegram Mini App в значительной части не англоязычная; `language_code` пользователя доступен бесплатно из `initData`.

**План:**
1. Добавить `packages/core/src/i18n/locales/ru/common.json` (перевод существующего `en/common.json`) и зарегистрировать в `resources.ts` (по комментарию в файле — других правок не нужно).
2. В `apps/tma/src/i18n.ts` убрать жёсткий `lng`, читать язык из Telegram SDK (`retrieveLaunchParams().tgWebAppData.user.language_code` или `initDataState.user.languageCode`), маппить на поддерживаемые (`ru → ru`, иначе `en`), передавать в `init({ lng })`.
3. Синхронизировать `document.documentElement.lang` с выбранным языком (см. 6.4) — сейчас `index.html` фиксирует `lang="en"`.
4. Проверить плюрализацию счётчиков (лайки/слоты) — у i18next есть `_one/_few/_many` для ru; пройтись по ключам со счётчиками.

### 5.5 🟢 Свежесть фида

**Где:** `QueryProvider.tsx` — `refetchOnWindowFocus: false`, `staleTime: 30s`; фид рефетчится только по маунту/инвалидации.

**План:** TMA часто «просыпается» из фона. Подписаться на `visibilitychange`/Telegram `activated`-событие и дергать `qc.invalidateQueries({ queryKey: queryKeys.feed.all(), refetchType: 'active' })`, если приложение было скрыто дольше N минут. Альтернатива — pull-to-refresh (в Telegram WebView нативного нет, нужен жест — делать только если будет запрос от пользователей).

### 5.6 🟢 Композер комментариев

**Где:** `CommentsBottomSheet.tsx:294-301` — однострочный `<input maxLength={2000}>`.

**План:** заменить на авторастущий `<textarea rows={1}>` (уже есть `Textarea`-примитив), показать счётчик после ~1800 символов, отправка по Enter (с Shift+Enter — перенос) на десктопном Telegram. Вынести в `CommentComposer` из 4.2.

---

## 6. Доступность

### 6.1 🔴 BottomSheet и PhotoLightbox: нет управления фокусом

**Где:** `apps/tma/src/components/overlays/BottomSheet/BottomSheet.tsx` (используется для комментариев, подписок, выбора списков), `PhotoLightbox.tsx`. Есть `role="dialog" aria-modal="true"` и Escape — но фокус не переносится в диалог, не «ловится» внутри, не возвращается на триггер; закрыть можно только Escape/тапом по фону/свайпом — кнопки закрытия нет; фон не скрыт от скринридера и остаётся кликабельным для Tab.

**Почему важно:** `aria-modal` без реального фокус-менеджмента — «пустое» обещание: клавиатурный пользователь и пользователь скринридера остаются в фоновом контенте; свайп-жест недоступен без тача.

**План (в `BottomSheet`, один раз для всех шторок):**
1. При открытии: сохранить `document.activeElement`, перевести фокус на контейнер шторки (`tabIndex={-1}` + `ref.focus()`).
2. Focus trap: обработчик `keydown` на Tab, зацикливающий фокус по focusable-элементам шторки (30 строк без зависимостей, либо взять `focus-trap` — но в репо принят минимум зависимостей).
3. При закрытии: вернуть фокус на сохранённый элемент.
4. Добавить видимую кнопку закрытия (иконка X, `aria-label={t('actions.close')}`) в шапку шторки — это и UX-фикс для десктопного Telegram, где свайпа нет.
5. Пока шторка открыта, ставить `inert` на root приложения (`document.getElementById('root')` — портал рендерится в `body`, так что шторку не заденет; React 19 поддерживает атрибут `inert`).
6. То же самое применить к `PhotoLightbox` (проверить — там сейчас фокус тоже не управляется).
7. Проверка: физическая клавиатура + TalkBack/VoiceOver в Telegram Desktop/iOS: Tab не уходит под шторку, Escape и X закрывают, фокус возвращается.

### 6.2 🟡 Запрет зума

**Где:** `apps/tma/index.html` — `user-scalable=no` в viewport.

**Почему важно:** WCAG 1.4.4 — слабовидящие не могут увеличить текст. В TMA зум иногда отключают из-за двойного тапа, но iOS Safari/WebView всё равно игнорирует запрет, а Android — нет.

**План:** убрать `user-scalable=no` (оставить `viewport-fit=cover`); от случайного зума при двойном тапе защититься CSS `touch-action: manipulation` на интерактивных элементах (можно глобально на `body`). Проверить, что жесты шторки не сломались.

### 6.3 🟡 Тосты и скелетоны немые для скринридера

**Где:** `apps/tma/src/providers/ToastProvider.tsx` — grep не находит `aria-live`/`role`; скелетоны (`Skeleton.tsx`, `PageLoadingPlaceholder.tsx`) — чисто визуальные.

**План:**
1. Контейнеру тостов дать `role="status" aria-live="polite"` (ошибки — `role="alert"`), чтобы `showErrorToast` озвучивался.
2. В `PageLoadingPlaceholder` добавить `role="status"` + визуально скрытый текст `t('states.loading')` (класс `sr-only`); сами `Skeleton` пометить `aria-hidden`.
3. Спискам с подгрузкой (`FeedPage`) — `aria-busy={isFetchingNextPage}` на `<ul>`.

### 6.4 🟢 Мелочи

- `WishSocialStrip.tsx:58,78,106` — `aria-label` на не-интерактивных `<span>` со счётчиками игнорируется скринридерами; правильнее включить число в `aria-label` соседней кнопки (`t('social.like_with_count', { count })`) и оставить видимый `<span aria-hidden>`.
- Кнопки действий комментария (`reply/edit/delete`, `CommentsBottomSheet.tsx:139-165`) — текст `text-xs`, тач-цель < 44px: добавить `py-2 -my-2` (расширить hit area без изменения макета).
- `document.documentElement.lang` синхронизировать с i18n (см. 5.4).
- Прогнать `ui:accessibility-check`/axe по основным экранам после фиксов.

---

## 7. Архитектура

### 7.1 🔴 Нет ErrorBoundary

**Где:** grep по `apps/tma/src` — ни одного boundary; `main.tsx` рендерит дерево без защиты.

**Почему важно:** любая необработанная ошибка рендера (например, `zod`-parse упавший на неожиданной строке из БД в `useInfiniteFeed`) даёт белый экран всего Mini App без возможности восстановиться.

**План:**
1. Добавить `apps/tma/src/components/ErrorBoundary.tsx` (классовый компонент, `getDerivedStateFromError` + `componentDidCatch` с `console.error`); UI фолбэка — существующий `EmptyState` с `tone="error"` и кнопкой «Перезагрузить» (`location.reload()`), все строки через `t(...)`.
2. Обернуть: (а) всё приложение в `main.tsx` (грубый фолбэк), (б) контент роута внутри `AppLayout` — чтобы таб-бар выживал и пользователь мог уйти на другой экран.
3. (Опционально) сбрасывать boundary при смене `location`, чтобы навигация «лечила» упавший экран.

### 7.2 🟡 `api` прокидывается аргументом в каждый хук

**Где:** все хуки `packages/core/src/hooks/**` принимают `api: ApiClient` первым аргументом; каждый компонент начинает с `const api = useApiClient()` и передаёт его дальше (30+ мест).

**Почему важно:** шум и связность: компоненты знают про API-клиент, хотя им нужен только хук. `CLAUDE.md` уже описывает целевую модель — «`core` reaches data only via the injected `ApiClient` (`useApiClient()` in hooks)».

**План (инкрементально, без большого взрыва):**
1. Перенести `ApiClientContext` + `useApiClient()` в `@wlist/core` (React там разрешён; это интерфейс `ApiClient`, не конкретный клиент — границы пакетов не нарушаются). В `apps/tma` реэкспортировать провайдер.
2. В хуках `core` заменить параметр `api` на внутренний `useApiClient()`; на переходный период оставить перегрузку `api?: ApiClient` (используется тестами) — или сразу обновить тесты, обернув renderHook в провайдер.
3. Чистить call-sites постепенно: `useCurrentUser()` вместо `useCurrentUser(api)`; ESLint сам подсветит неиспользуемый `useApiClient`.
4. `pnpm validate` после каждой пачки.

### 7.3 🟢 `wishes.update` всегда трогает visibility-списки

**Где:** `packages/api/src/clients/wishes/WishesApiClient.ts:118-122` — при `visibility !== 'lists'` каждый update делает `delete` по `wish_visibility_lists`, даже если там пусто; при `'lists'` — delete+insert вместо диффа.

**План:** мелкая оптимизация: перед `syncVisibilityLists(sb, id, [])` для не-`lists` можно пропускать вызов, если предыдущая `visibility` тоже была не-`lists` (значение известно вызывающему коду формы; либо `select` уже сделан — `row` в руках). Осторожно: текущее поведение — защитная зачистка, менять только с тестом на сценарий «lists → public → назад».

### 7.4 🟢 Удаление фото на клиенте

**Где:** `WishesApiClient.ts:157-173` — `delete()` читает путь, удаляет строку, потом удаляет объект Storage; если клиент умер между шагами — объект-сирота.

**План:** перенести очистку в БД: миграция с триггером `AFTER DELETE ON wishes` пишущим путь в таблицу `storage_cleanup_queue` + периодическая Edge Function (или `pg_cron`) удаляющая объекты сервис-ключом. Либо принять сирот как известный компромисс и добавить одноразовый скрипт-чистильщик. Низкий приоритет — объёмы маленькие.

---

## 8. Сборка

### 8.1 🟢 Нет наблюдаемости бандла

**Где:** `apps/tma/vite.config.ts` — дефолтный чанкинг; route-level code splitting уже сделан (7 lazy-страниц в `router.tsx` — хорошо).

**План:**
1. Добавить `rollup-plugin-visualizer` (dev-dep) и скрипт `pnpm --filter tma build --mode analyze`; посмотреть, что весит.
2. Ожидаемо крупные: `@supabase/supabase-js`, `react-dom`, `i18next`. Вынести в `manualChunks: { vendor: ['react', 'react-dom'], supabase: ['@supabase/supabase-js'] }` только если initial-чанк > ~250 KB gzip — иначе не трогать.
3. Убедиться, что `lucide-react` импортируется поимённо (уже так — tree-shaking работает).

---

## Рекомендуемый порядок работ

1. **PR-1 (быстрые победы, низкий риск):** 2.1 + 2.2 + 3.2 (точечная инвалидация + патч кэшей), 1.2 (кэш signed URL), 7.1 (ErrorBoundary), 6.2 (зум), 6.3 (aria-live).
2. **PR-2 (батчинг):** 1.1 + 1.3 (батч-запросы + сидирование кэшей) — самый большой выигрыш по сети.
3. **PR-3 (UX):** 5.1 (infinite scroll), 5.2 (keepPreviousData), 5.3 (lazy images), 3.1 (лайк без disabled).
4. **PR-4 (i18n):** 5.4 (русская локаль + язык из Telegram, `lang` на html).
5. **PR-5 (a11y):** 6.1 (фокус-менеджмент шторок + кнопка закрытия), 6.4.
6. **PR-6 (архитектура, фоновые):** 7.2 (api через контекст), 1.4, 1.5, 2.4, 2.5, 4.1, 4.2, остальное по мере надобности.

После каждого PR: `pnpm validate`, проверка в Telegram (iOS/Android/Desktop) и замер сети на фиде из ≥20 карточек.
