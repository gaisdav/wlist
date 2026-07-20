# Telegram SDK: предложения по использованию новых возможностей

> Черновик для обсуждения. Привязки к конкретным экранам проекта.
> SDK: `@telegram-apps/sdk-react@^3`. Все обёртки живут в `apps/tma/src/telegram/`
> и следуют паттерну `.isAvailable()`-гарда + dev-фоллбэка (как `confirm.ts`,
> `haptics.ts`, `useTelegramBackButton.ts`).

## Что уже используется (контекст)

| Возможность | Где |
| --- | --- |
| MainButton | `useTelegramMainButton` → wish-form, event-form |
| BackButton | `useTelegramBackButton` → wish-detail, user-wishlist, формы |
| Haptics (impact / notify / select) | `haptics.ts`, `hapticMutation.ts` |
| Native confirm popup | `confirm.ts` → удаление wish |
| Swipe behavior (disable vertical) | `TelegramProvider` |
| Theme params + CSS vars, miniApp mount | `TelegramProvider` |
| initData (HMAC валидация на сервере) | `useAuthBootstrap` |

Ниже — 6 возможностей, которых пока нет.

---

## 1. `shareURL` — нативный шеринг

### Что это
`shareURL(url, text?)` открывает нативный пикер Telegram «кому отправить» с
готовым сообщением (ссылка + текст). Это не копирование в буфер — юзер сразу
выбирает чат/контакт и отправляет. Для соц-вишлиста это **центральная вирусная
механика**: чем легче поделиться списком/подарком, тем больше входящих юзеров.

Ссылку формируем как Mini-App deep-link через `VITE_PUBLIC_APP_URL`
(уже есть в `env.d.ts`, помечен в `.env.example` как «Used for share / deep-links»)
или через `t.me/<bot>?startapp=<param>` с разбором `start_param` на входе.

### Где использовать

| Экран | Что шарим | Текст |
| --- | --- | --- |
| **wish-detail** (`WishDetailPage.tsx`) | конкретный подарок | «Хочу вот это 🎁 {title}» |
| **user-wishlist** (`UserWishlistPage.tsx`) | весь вишлист (свой/чужой) | «Мой вишлист» / «Вишлист {name}» |
| **profile** (`ProfilePage.tsx`) | свой профиль-хаб | «Я в wlist, заходи» |
| **event-detail** (`EventDetailPage.tsx`) | событие (ДР и т.п.) | «Скидываемся на подарок к {event}» |

Сейчас в `wish-detail` есть только «Copy line» в буфер и repost внутри приложения —
кнопки «поделиться наружу» нет вообще. Это первый кандидат.

### Пример обёртки

```ts
// apps/tma/src/telegram/share.ts
import { shareURL } from '@telegram-apps/sdk-react';

const APP_URL = import.meta.env.VITE_PUBLIC_APP_URL;

interface ShareOptions {
  /** Deep-link path внутри Mini App, например `/wish/abc` или `/u/42`. */
  path: string;
  /** Сопроводительный текст. */
  text: string;
}

/**
 * Нативный шеринг через Telegram. Вне Telegram (dev/браузер) падает в
 * Web Share API, затем в копирование ссылки. Мирроринг паттерна confirm.ts.
 */
export const share = async ({ path, text }: ShareOptions): Promise<void> => {
  const url = new URL(path, APP_URL).toString();

  if (shareURL.isAvailable()) {
    shareURL(url, text);
    return;
  }
  if (navigator.share) {
    await navigator.share({ url, text });
    return;
  }
  await navigator.clipboard.writeText(`${text} ${url}`);
};
```

```tsx
// в WishDetailPage — кнопка рядом с repost
<Button
  variant="outline"
  size="sm"
  onClick={() => {
    haptics.impact('light');
    void share({ path: `/wish/${w.id}`, text: t('share.wish', { title: w.title }) });
  }}
>
  {t('actions.share')}
</Button>
```

### Заметки
- Нужны ключи i18n: `actions.share`, `share.wish`, `share.list`, `share.profile`.
- На входе в приложение надо разобрать `start_param` / deep-link path и сделать
  редирект на нужный роут (сейчас этого, похоже, нет — стоит проверить отдельно).
- Хорошо ложится на `SecondaryButton` (см. п.2) как системную кнопку «Поделиться».

---

## 2. `SecondaryButton` — вторая системная кнопка

### Что это
Системная кнопка внизу экрана **рядом с MainButton**. Позиционируется
относительно Main (`left` / `right` / `top` / `bottom`), имеет свой текст, цвет,
лоадер и обработчик клика. Даёт нативную пару действий без самодельных нижних
панелей.

### Где использовать

| Экран | MainButton | SecondaryButton |
| --- | --- | --- |
| **wish-detail** (свой подарок) | «Редактировать» | «Поделиться» (п.1) |
| **wish-detail** (чужой подарок) | «Забронировать» | «Поделиться» / «Репостнуть» |
| **wish-form / event-form** | «Сохранить» | «Отмена» / «Удалить» (в режиме edit) |
| **wish-detail sibling-nav** | — | можно заменить самодельную нижнюю панель ‹ › на системные кнопки |

В `wish-detail` сейчас действия (edit / archive / delete / repost / reserve) —
это inline-кнопки в потоке статьи. Самые важные (reserve для гостя, share)
просятся в системный низ через Main + Secondary.

### Пример

Логично сделать парный хук `useTelegramSecondaryButton` по образцу
`useTelegramMainButton` (тот же ref-паттерн для onClick, тот же `isAvailable()`-гард,
hide-on-unmount). Сигнатура почти один-в-один, плюс поле `position`.

```ts
// apps/tma/src/telegram/useTelegramSecondaryButton.ts
import {
  mountSecondaryButton,
  onSecondaryButtonClick,
  setSecondaryButtonParams,
} from '@telegram-apps/sdk-react';

interface SecondaryButtonOptions {
  text: string;
  onClick: () => void;
  position?: 'left' | 'right' | 'top' | 'bottom';
  isVisible?: boolean;
  isEnabled?: boolean;
  isLoaderVisible?: boolean;
}
// ...тело идентично useTelegramMainButton, только Secondary-* API + position.
```

```tsx
// wish-detail, гостевой просмотр
useTelegramMainButton({ text: t('wishes.detail.reserve'), onClick: onReserve });
useTelegramSecondaryButton({
  text: t('actions.share'),
  position: 'left',
  onClick: () => void share({ path: `/wish/${w.id}`, text: ... }),
});
```

### Заметки
- Inline-кнопки оставляем как фоллбэк вне Telegram (как уже сделано с Main).
- Не злоупотреблять: максимум одно вторичное действие, иначе шумно.

---

## 3. `setupClosingConfirmation` — подтверждение закрытия

### Что это
Включает нативный диалог «Точно закрыть?» при свайпе-вниз/закрытии Mini App.
Предохраняет от потери введённых данных. Это **stateful-флаг**: включаем, когда
есть несохранённые изменения, выключаем после save/reset.

### Где использовать

| Экран | Условие включения |
| --- | --- |
| **wish-form** (`WishFormPage.tsx`) | `formState.isDirty` (react-hook-form уже подключён) |
| **event-form** (`EventFormPage.tsx`) | `formState.isDirty` |

Обе формы на react-hook-form, так что `isDirty` доступен из коробки —
включение/выключение тривиально завязать на него.

### Пример обёртки (хук)

```ts
// apps/tma/src/telegram/useClosingConfirmation.ts
import { mountClosingBehavior, enableClosingConfirmation, disableClosingConfirmation }
  from '@telegram-apps/sdk-react';
import { useEffect } from 'react';

/** Просит подтверждение закрытия, пока `active` (например форма dirty). */
export const useClosingConfirmation = (active: boolean): void => {
  useEffect(() => {
    if (mountClosingBehavior.isAvailable()) mountClosingBehavior();
    if (!enableClosingConfirmation.isAvailable()) return;

    if (active) enableClosingConfirmation();
    else if (disableClosingConfirmation.isAvailable()) disableClosingConfirmation();

    return () => {
      if (disableClosingConfirmation.isAvailable()) disableClosingConfirmation();
    };
  }, [active]);
};
```

```tsx
// в WishFormPage / EventFormPage
useClosingConfirmation(formState.isDirty);
```

### Заметки
- Не дублирует BackButton — это именно про свайп-закрытие самого приложения.
- Тщательно гасить на unmount, чтобы флаг не «протёк» на следующий экран.

---

## 4. `viewport.expand()` / `isExpanded` — полная высота

### Что это
Telegram открывает Mini App в «полу-высоте» (≈ половина экрана), пока юзер сам
не потянет вверх. `viewport.expand()` разворачивает на максимум сразу.
`isExpanded` / `viewport.height` дают актуальные размеры (полезно для
fixed-панелей и `safe-area`).

### Где использовать
**Глобально, один раз** — в `TelegramProvider.tsx`, в том же `setup()`, где уже
монтируются `miniApp` / `themeParams` / `swipeBehavior`. Это самый дешёвый и
заметный UX-выигрыш: приложение всегда открывается на весь экран.

### Пример

```ts
// TelegramProvider.tsx, внутри setup() — рядом с swipeBehavior
import { viewport } from '@telegram-apps/sdk-react';

if (viewport.mount.isAvailable()) {
  await viewport.mount();          // в v3 mount асинхронный
  if (viewport.expand.isAvailable()) viewport.expand();
  if (viewport.bindCssVars.isAvailable()) viewport.bindCssVars();
}
```

После `bindCssVars()` появляются CSS-переменные
(`--tg-viewport-height`, `--tg-viewport-stable-height`), которыми можно заменить
часть ручных `100vh` / `min-h-screen` в `AppLayout.tsx` и в fixed-навигации
(нижняя панель ‹ › в `wish-detail`, `BottomTabBar`).

### Заметки
- `viewport.expand()` идемпотентен и no-op вне Telegram — безопасно.
- Свайп-вниз после expand закрывает приложение (vertical swipe уже отключён в
  провайдере, так что конфликта нет).
- Стоит проверить, нет ли уже неявного expand — судя по `TelegramProvider`, нет.

---

## 5. `requestWriteAccess()` — перенесено в план Stage 10

Эта возможность относится к уведомлениям и завязана на серверную часть
(бот + outbox + рассылка). Поэтому она вынесена в план **Stage 10
(Telegram bot & notifications)** — в PR A, как второй (фронтовый) путь открыть
канал доставки и заполнить `tg_private_chat_id` без принудительного `/start`.

См. [`plans/10-telegram-bot.md`](../plans/10-telegram-bot.md) (PR A) и PR #30.

---

## Итоговый приоритет

| # | Фича | Польза | Объём работ | Зависимости |
| --- | --- | --- | --- | --- |
| 1 | `shareURL` | 🔥 виральность | S | deep-link разбор `start_param` на входе |
| 4 | `viewport.expand()` | 🔥 UX, виден всем | XS | нет, правка в провайдере |
| 3 | `setupClosingConfirmation` | защита ввода | S | `isDirty` уже есть |
| 2 | `SecondaryButton` | нативная пара действий | S | лучше вместе с п.1 |
| 5 | `requestWriteAccess` | 🔥 retention | **L** | → вынесено в [Stage 10](../plans/10-telegram-bot.md) / PR #30 |

**Рекомендованный первый заход:** 4 → 1 → 3 → 2 (всё чисто фронтовое, быстрые
победы). `requestWriteAccess` (5) живёт в плане уведомлений (Stage 10, PR A) —
вместе с бэкендом бота.

## Открытые вопросы к продукту
1. Есть ли разбор deep-link / `start_param` на входе в приложение? (нужен для п.1)
2. Известен ли username бота для `t.me/<bot>?startapp=…`, или шарим через
   `VITE_PUBLIC_APP_URL`?
