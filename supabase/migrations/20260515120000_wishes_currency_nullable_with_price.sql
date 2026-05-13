-- Currency is null when price is null; when price is set, currency must be a supported code.
-- Aligns with `packages/core/src/entities/wish/wishDraft.ts` and `wishSchema`.

alter table public.wishes alter column currency drop default;

alter table public.wishes drop constraint if exists wishes_currency_allowed;

alter table public.wishes alter column currency drop not null;

update public.wishes
set currency = null
where price is null;

update public.wishes
set currency = 'USD'
where price is not null and currency is null;

alter table public.wishes add constraint wishes_price_currency_pair check (
  (price is null and currency is null)
  or (
    price is not null
    and currency is not null
    and currency in (
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
  )
);
