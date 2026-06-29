# 03. Пакет бизнес-логики: Структура `@brand/core`

Пакет `@brand/core` является "мозгом" всей системы. Он написан на чистом TypeScript и не зависит от среды выполнения (DOM, window, Node.js). Единственной внешней зависимостью рантайма является `react` (исключительно для слоя пользовательских хуков), а также `@tanstack/react-query` и `zod`.

---

## 1. Анатомия директории `core/`

```
packages/core/src/
├── entities/        # Валидация и доменные типы (на базе database.zod)
│   ├── item/
│   │   ├── item.ts         # Zod-схема сущности (расширенная бизнес-правилами)
│   │   ├── item.test.ts    # Unit-тесты сущности
│   │   └── index.ts        # Экспорт публичного API домена
│   └── index.ts            # Общий barrel-экспорт сущностей
├── services/        # Бизнес-операции (чистые функции, не зависят от React)
│   ├── items/
│   │   ├── items.ts        # Алгоритмы, проверки прав, вызовы ApiClient
│   │   ├── items.test.ts   # Unit-тесты бизнес-логики
│   │   └── index.ts
│   └── index.ts
├── hooks/           # Слой адаптеров к React (React Hooks + TanStack Query)
│   ├── items/
│   │   ├── useMyItems.ts   # Хук запроса
│   │   ├── useCreateItem.ts# Хук мутации
│   │   └── index.ts
│   └── index.ts
├── routes/          # Декларативное описание маршрутов
│   └── routes.ts
├── tokens/          # Дизайн-токены (цвета, отступы, шрифты)
│   ├── colors.ts
│   └── index.ts
├── config/          # Конфигурационные фабрики (Query Keys и т.д.)
│   └── queryKeys.ts
└── index.ts         # Единая точка входа пакета
```

### Правила организации файлов:

1.  **Подоменный подход:** Внутри `entities/`, `services/` и `hooks/` файлы сгруппированы в папки сущностей (например, `items/`), даже если там находится всего один файл.
2.  **Тесты рядом:** Юнит-тесты (`*.test.ts`) лежат в той же папке, что и тестируемый код. Никаких внешних папок `__tests__/` на верхнем уровне пакета.
3.  **Barrel-экспорт:** Каждая подоменная папка содержит файл `index.ts`. Импорт из внешних пакетов всегда идет через красивый путь: `@brand/core/entities/item`, а не `@brand/core/entities/item/item`.

---

## 2. Валидация сущностей (Entities Layer)

Слой сущностей описывает доменные модели. Для избежания ручного дублирования полей таблиц, мы импортируем автогенерируемые схемы из `@brand/api/generated/database.zod` и расширяем их с помощью `Zod`:

```typescript
// packages/core/src/entities/item/item.ts
import { z } from 'zod';
import { publicItemsRowSchema } from '@brand/api/generated/database.zod';

// 1. Берем автогенерируемую схему строки таблицы, исключаем/расширяем поля
export const itemSchema = publicItemsRowSchema
  .omit({ link: true, price: true })
  .extend({
    // Делаем поле ссылки валидным URL (в базе это просто текстовое поле varchar)
    link: z.string().url().nullable(),
    // Добавляем проверку на положительное число цены
    price: z.number().positive().nullable(),
  })
  // 2. Добавляем сложные кросс-полевые инварианты
  .superRefine((data, ctx) => {
    if (data.price !== null && data.currency === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['currency'],
        message: 'Валюта обязательна, если указана цена товара',
      });
    }
  });

export type Item = z.infer<typeof itemSchema>;
```

---

## 3. Бизнес-сервисы (Services Layer)

Сервисы содержат чистую бизнес-логику без привязки к React. Они принимают экземпляр `ApiClient` первым аргументом. Это делает их предельно легковесными и тестируемыми:

```typescript
// packages/core/src/services/items/items.ts
import type { ApiClient } from '@brand/api';
import { itemSchema, type Item } from '../../entities/item/item';

export const itemsService = {
  async getDetail(api: ApiClient, itemId: string): Promise<Item> {
    const rawData = await api.items.get(itemId);
    if (!rawData) {
      throw new Error(`Товар с ID ${itemId} не найден`);
    }

    // Валидация на выходе защищает фронтенд от неконсистентных данных из БД
    return itemSchema.parse(rawData);
  },

  async createItem(api: ApiClient, input: unknown): Promise<Item> {
    // Валидация на входе гарантирует корректность отправляемых в API данных
    const validated = itemSchema.omit({ id: true, created_at: true }).parse(input);

    const created = await api.items.create(validated);
    return itemSchema.parse(created);
  },
};
```

---

## 4. Реактивные хуки и Фабрика Query Keys

Хуки (`hooks/`) связывают сервисы с механизмом кэширования `TanStack Query`.

Для обеспечения типобезопасной инвалидации кэша используется централизованная фабрика Query Keys (`core/config/queryKeys.ts`):

```typescript
// packages/core/src/config/queryKeys.ts
export const queryKeys = {
  all: ['brand'] as const,
  items: {
    all: () => [...queryKeys.all, 'items'] as const,
    byOwner: (ownerId: string) => [...queryKeys.items.all(), 'byOwner', ownerId] as const,
    one: (itemId: string) => [...queryKeys.items.all(), 'one', itemId] as const,
  },
};
```

### Пример реализации хуков запроса и мутации:

```typescript
// packages/core/src/hooks/items/useCreateItem.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@brand/api'; // Берется из React Context
import { itemsService } from '../../services/items/items';
import { queryKeys } from '../../config/queryKeys';

export function useCreateItem() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: unknown) => itemsService.createItem(api, input),
    onSuccess: (newItem) => {
      // Автоматическая инвалидация списка товаров владельца после создания
      queryClient.invalidateQueries({
        queryKey: queryKeys.items.byOwner(newItem.owner_id),
      });
    },
  });
}
```

---

## 5. Декларативный роутинг в `core`

Для того чтобы избежать опечаток при навигации и размывания структуры переходов по разным приложениям, все доступные экраны описываются декларативно на уровне `core`:

```typescript
// packages/core/src/routes/routes.ts
import { z } from 'zod';

export const routes = {
  home: route('/', z.object({})),
  itemsList: route('/items', z.object({})),
  itemDetail: route('/items/:itemId', z.object({ itemId: z.string().uuid() })),
} as const;

function route<S extends z.ZodObject<z.ZodRawShape>>(pattern: string, paramsSchema: S) {
  return {
    pattern,
    paramsSchema,
    build: (params: z.infer<S>) => {
      let path = pattern;
      for (const [key, value] of Object.entries(params)) {
        path = path.replace(`:${key}`, String(value));
      }
      return path;
    },
    parse: (path: string) => {
      // Легковесный парсер параметров из строки пути по паттерну
      const matchedParams = matchPath(pattern, path);
      return paramsSchema.parse(matchedParams);
    },
  };
}

// Вспомогательная функция сопоставления URL (упрощенный аналог matchPath)
function matchPath(pattern: string, path: string) {
  const patternParts = pattern.split('/');
  const pathParts = path.split('/');
  const params: Record<string, string> = {};

  if (patternParts.length !== pathParts.length) return {};

  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return {};
    }
  }
  return params;
}
```

### Как навигация используется в приложениях (TMA, Web):

```typescript
import { routes } from '@brand/core/routes';

// Безопасное построение пути. TS упадет, если itemId не передан или не является строкой.
const targetPath = routes.itemDetail.build({ itemId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' });
// Результат: '/items/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

// Парсинг и валидация на целевой странице
const params = routes.itemDetail.parse(window.location.pathname);
console.log(params.itemId); // Строго типизированный UUID
```

---

## 6. Вспомогательные библиотеки клиента (Forms, Routing, i18n)

Для реализации интерфейса на стороне приложений (`apps/*`) рекомендуется использовать следующие легковесные библиотеки, которые бесшовно связываются с бизнес-логикой `@brand/core`:

### 1. Роутинг с помощью `wouter`

Декларативные паттерны путей из `core/routes` подключаются непосредственно к компонентам роутера `wouter` на фронтенде:

```typescript
import { Router, Route, Switch } from 'wouter';
import { routes } from '@brand/core/routes';
import { ItemDetailPage } from './pages/ItemDetailPage';

export function AppRouter() {
  return (
    <Router>
      <Switch>
        <Route path={routes.itemDetail.pattern} component={ItemDetailPage} />
      </Switch>
    </Router>
  );
}
```

### 2. Формы с помощью `react-hook-form` + `zod`

Валидация форм в UI-слое напрямую переиспользует строгие Zod-схемы сущностей из `core/entities` с помощью стандартного резолвера:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { itemSchema, type Item } from '@brand/core/entities/item';

export function ItemForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Item>({
    resolver: zodResolver(itemSchema),
  });

  // При отправке данные гарантированно соответствуют бизнес-правилам домена
}
```

### 3. Локализация с помощью `i18next` + `react-i18next`

Словари локализации и конфигурация перевода хранятся на уровне `@brand/core/i18n`, обеспечивая единую локализацию ошибок валидации, системных уведомлений и текстов на всех платформах:

```typescript
import { useTranslation } from 'react-i18next';

export function LocaleSelector() {
  const { t, i18n } = useTranslation();
  return (
    <div>
      <p>{t('auth.login_welcome')}</p>
      <button onClick={() => i18n.changeLanguage('ru')}>RU</button>
    </div>
  );
}
```
