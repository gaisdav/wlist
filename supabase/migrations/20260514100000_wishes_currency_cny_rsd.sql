-- Extend allowed wish currencies (CNY, RSD) — keep in sync with
-- `packages/core/src/lib/wishConstraints.ts` and `plans/02-mvp-wishlist-crud.md`.

alter table public.wishes drop constraint wishes_currency_allowed;

alter table public.wishes add constraint wishes_currency_allowed check (
  currency in (
    'USD',
    'EUR',
    'RUB',
    'KZT',
    'GBP',
    'CHF',
    'PLN',
    'UAH',
    'TRY',
    'JPY',
    'CNY',
    'RSD'
  )
);
