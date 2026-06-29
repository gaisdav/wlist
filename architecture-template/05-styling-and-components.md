# 05. Стилизация, Дизайн-токены и Компоненты UI

Дизайн-система построена на принципах **многоплатформенности и динамического рендеринга тем**. Токены хранятся в едином пакете `@brand/core/tokens`, настраиваются через Tailwind CSS и адаптируются под окружение (включая динамическую темную/светлую тему Telegram Mini App).

---

## 1. Дизайн-токены как единый источник правды

Все визуальные константы приложения описываются на уровне `@brand/core` в виде чистых JS-объектов. Это позволяет переиспользовать их как в CSS/Tailwind (Web, TMA), так и в `StyleSheet` (React Native).

```typescript
// packages/core/src/tokens/colors.ts
export const colors = {
  // 1. Сырая палитра цветов (Raw Palette)
  brand: {
    50: '#f5f3ff',
    500: '#8b5cf6',
    900: '#4c1d95',
  },
  neutral: {
    50: '#f9fafb',
    900: '#111827',
  },

  // 2. Семантические алиасы (Semantic Aliases)
  // Маппятся на CSS-переменные для динамического переключения тем
  semantic: {
    background: 'var(--brand-theme-bg)',
    foreground: 'var(--brand-theme-text)',
    muted: 'var(--brand-theme-hint)',
    primary: 'var(--brand-theme-button)',
    primaryForeground: 'var(--brand-theme-button-text)',
    border: 'var(--brand-theme-separator)',
  },
} as const;

// Рядом объявляются spacing.ts (отступы), radii.ts (скругления), typography.ts (шрифты)
```

---

## 2. Интеграция с Tailwind CSS

Tailwind CSS импортирует токены напрямую из ядра и расширяет свою стандартную тему:

```typescript
// apps/tma/tailwind.config.ts
import { colors } from '@brand/core/tokens';

export default {
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/core/src/**/*.{ts,tsx}', // Важно указать путь к общим компонентам в core!
  ],
  theme: {
    extend: {
      colors: {
        ...colors.brand,
        ...colors.semantic, // Семантические цвета теперь доступны как bg-background, text-foreground, т.д.
      },
    },
  },
};
```

---

## 3. Динамические темы Telegram (Dynamic Theme Variables)

Telegram передает текущие цвета интерфейса пользователя через глобальные CSS-переменные `--tg-theme-*`. Чтобы наше приложение выглядело нативно в любой пользовательской теме Telegram, мы маппим семантические токены на переменные Telegram в глобальном CSS-файле:

```css
/* apps/tma/src/index.css */
:root {
  /* В контексте TMA связываем наши брендовые переменные с Telegram-цветами */
  --brand-theme-bg: var(--tg-theme-bg-color, #ffffff);
  --brand-theme-text: var(--tg-theme-text-color, #111827);
  --brand-theme-hint: var(--tg-theme-hint-color, #9ca3af);
  --brand-theme-button: var(--tg-theme-button-color, #8b5cf6);
  --brand-theme-button-text: var(--tg-theme-button-text-color, #ffffff);
  --brand-theme-separator: var(--tg-theme-section-separator-color, #e5e7eb);
}

/* Fallback для тестирования в обычном браузере вне Telegram */
@media (prefers-color-scheme: dark) {
  :root:not(.theme-light) {
    --brand-theme-bg: #111827;
    --brand-theme-text: #f9fafb;
    --brand-theme-hint: #9ca3af;
    --brand-theme-button: #8b5cf6;
    --brand-theme-button-text: #ffffff;
    --brand-theme-separator: #374151;
  }
}
```

При переключении темы пользователем в Telegram, системные CSS-переменные `--tg-theme-*` изменяются налету. Фронтенд автоматически перерисовывается с новыми цветами **без перезагрузки приложения и без сброса React-стейта**.

---

## 4. Строгая типизация компонентов через `tailwind-variants`

Для создания гибких повторно используемых интерфейсных компонентов используется библиотека `tailwind-variants` (или `cva`), позволяющая объявлять типы для визуальных вариантов (например, размеров кнопок, цветов, заливок):

```typescript
// apps/tma/src/components/primitives/button/Button.tsx
import { tv, type VariantProps } from 'tailwind-variants';

export const buttonStyles = tv({
  base: 'inline-flex items-center justify-center font-medium rounded-lg transition-all active:scale-[0.98]',
  variants: {
    variant: {
      primary: 'bg-primary text-primaryForeground hover:opacity-95',
      ghost: 'bg-transparent text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800',
      outline: 'bg-transparent border border-border text-foreground hover:bg-neutral-50',
    },
    size: {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-base',
      lg: 'h-12 px-6 text-lg',
    },
    fullWidth: {
      true: 'w-full',
    }
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles>;

export function Button({ className, variant, size, fullWidth, ...props }: ButtonProps) {
  return (
    <button className={buttonStyles({ variant, size, fullWidth, className })} {...props} />
  );
}
```

---

## 5. Использование CSS Modules

Использование стандартных CSS-классов с помощью CSS Modules разрешено **только точечно в исключительных случаях**:

- Сложные кастомные анимации (`@keyframes`).
- Сложные радиальные/конические градиенты.
- Многослойный glassmorphism с эффектами размытия фона, которые сложно читаются в виде длинного списка Tailwind-классов.

Файл стилей размещается непосредственно в папке компонента (например, `Card.module.css`). Объединение локальных классов модуля с утилитарными классами Tailwind производится с помощью утилиты `clsx` или `tailwind-merge`:

```typescript
import classes from './Card.module.css';
import clsx from 'clsx';

export function Card({ className }) {
  return <div className={clsx(classes.glassCard, 'p-4 rounded-xl', className)} />;
}
```

---

## 6. Иерархия UI-слоев в приложениях

Для предотвращения хаоса в структуре интерфейсов приложения разделены на строгие UI-слои:

| Уровень (Папка)          | Описание                                                                                                                                           | Пример                                                         |
| :----------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------- |
| `pages/<page-name>/`     | Локальные компоненты конкретной страницы. Если компонент используется только на одном экране, он **не** должен лежать в общей папке `components/`. | `WishEditPage/DeleteConfirmModal.tsx`                          |
| `components/primitives/` | Базовые UI-атомы без бизнес-логики. Переиспользуются везде.                                                                                        | `Button`, `Skeleton`, `Input`, `Typography`                    |
| `components/overlays/`   | Оболочки отображения контента поверх основного экрана.                                                                                             | `Modal`, `Drawer`, `Toast` (на базе `sonner`), `BottomSheet`   |
| `components/<domain>/`   | Продуктовые компоненты, привязанные к конкретной доменной сущности, используемые более чем на двух страницах.                                      | `WishCard` (для домена wishes), `ProfileAvatar` (для profiles) |

---

## 7. Унифицированные иконки

- Для обеспечения единой стилистики иконок по всей кодовой базе используется исключительно библиотека **`lucide-react`**.
- Иконки импортируются именованными импортами.
- Размеры, цвета и толщина линий настраиваются через стандартные классы Tailwind:

  ```typescript
  import { Heart } from 'lucide-react';

  <Heart className="w-5 h-5 text-red-500 fill-current" strokeWidth={2} />
  ```

---

## 8. Красивые всплывающие уведомления (Toasts на базе Sonner)

Для информирования пользователей о результатах операций (успех, ошибка, предупреждение) используется библиотека **`sonner`**. Это гарантирует плавную анимацию, поддержку жестов смахивания и легкую интеграцию с дизайн-системой.

### Шаг 1: Подключение провайдера `<Toaster />` в корне приложения

Компонент `Toaster` импортируется один раз на самом верхнем уровне приложения (обычно в `App.tsx`):

```typescript
import { Toaster } from 'sonner';

export function App() {
  return (
    <>
      <AppRouter />
      {/* Настройки Toaster под стилистику приложения */}
      <Toaster
        position="top-center"
        richColors
        closeButton
        theme="dark"
      />
    </>
  );
}
```

### Шаг 2: Использование уведомлений в компонентах

Импортируйте функцию `toast` в любой части вашего приложения для отправки сообщений:

```typescript
import { toast } from 'sonner';

export function WishButton() {
  const handleAddToWishlist = () => {
    try {
      // Имитация действия
      toast.success('Желание успешно добавлено в ваш список!');
    } catch (error) {
      toast.error('Не удалось добавить желание. Пожалуйста, попробуйте позже.');
    }
  };

  return <button onClick={handleAddToWishlist}>Добавить в список</button>;
}
```
