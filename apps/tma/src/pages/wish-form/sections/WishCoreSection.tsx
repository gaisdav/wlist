import {
  persistLastWishCurrency,
  readLastWishCurrency,
  SUPPORTED_WISH_CURRENCIES,
} from '@wlist/core/lib';
import { useTranslation } from 'react-i18next';

import type { WishForm } from './types';

interface WishCoreSectionProps {
  form: WishForm;
}

/**
 * Core wish fields (level 1, "the essentials"): title, description, link, and
 * price + currency on one row. The currency select stays mounted but disabled
 * until a price is entered — no layout shift, the field is predictably in place.
 * Setting a price auto-seeds the last-used currency; clearing it clears the
 * currency. The enclosing `<fieldset>` handles disabling while saving, so no
 * `isSaving` is needed here.
 */
export const WishCoreSection = ({ form }: WishCoreSectionProps): React.JSX.Element => {
  const { t } = useTranslation('common');
  const { register, formState, watch, setValue, getValues } = form;
  const hasPrice = watch('priceStr').trim() !== '';

  return (
    <>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-foreground">{t('wishes.form.title_label')}</span>
        <input
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          {...register('title')}
        />
        {formState.errors.title ? (
          <span className="text-xs text-destructive">{formState.errors.title.message}</span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-foreground">
          {t('wishes.form.description_label')}
        </span>
        <textarea
          rows={4}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          {...register('description')}
        />
        {formState.errors.description ? (
          <span className="text-xs text-destructive">{formState.errors.description.message}</span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-foreground">{t('wishes.form.link_label')}</span>
        <input
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          {...register('linkStr')}
        />
        {formState.errors.linkStr ? (
          <span className="text-xs text-destructive">{t('wishes.form.errors.invalid_link')}</span>
        ) : null}
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-foreground">{t('wishes.form.price_label')}</span>
        <div className="flex gap-2">
          <label className="flex flex-1 flex-col gap-1">
            <span className="sr-only">{t('wishes.form.price_label')}</span>
            <input
              inputMode="decimal"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              {...register('priceStr', {
                onChange: (e) => {
                  const v = String((e.target as HTMLInputElement).value ?? '');
                  const nextHas = v.trim() !== '';
                  if (!nextHas) {
                    setValue('currency', '', { shouldValidate: true, shouldDirty: true });
                    return;
                  }
                  const cur = getValues('currency');
                  if (!cur) {
                    setValue('currency', readLastWishCurrency(), {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                  }
                },
              })}
            />
          </label>
          <label className="flex w-32 shrink-0 flex-col gap-1">
            <span className="sr-only">{t('wishes.form.currency_label')}</span>
            <select
              disabled={!hasPrice}
              aria-label={t('wishes.form.currency_label')}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              {...register('currency', {
                onChange: (e) => {
                  const v = (e.target as HTMLSelectElement).value;
                  if (v) persistLastWishCurrency(v);
                },
              })}
            >
              <option value="">{t('wishes.form.currency_placeholder')}</option>
              {SUPPORTED_WISH_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {formState.errors.priceStr ? (
          <span className="text-xs text-destructive">{t('wishes.form.errors.invalid_price')}</span>
        ) : null}
        {formState.errors.currency ? (
          <span className="text-xs text-destructive">
            {formState.errors.currency.message === 'currency_without_price'
              ? t('wishes.form.errors.currency_without_price')
              : t('wishes.form.errors.invalid_currency')}
          </span>
        ) : null}
      </div>
    </>
  );
};
