import { zodResolver } from '@hookform/resolvers/zod';
import {
  copyLinesToFormTuple,
  defaultWishDraftFormValues,
  wishDraftSchema,
  type WishDraftFormInput,
  type WishDraftPayload,
} from '@wlist/core/entities/wish';
import { useCreateWish, useUpdateWish, useWish } from '@wlist/core/hooks/wishes';
import {
  isWishCurrencyCode,
  persistLastWishCurrency,
  readLastWishCurrency,
  SUPPORTED_WISH_CURRENCIES,
  WISH_COPY_LINES_MAX,
  WISH_PHOTO_MAX_UPLOAD_BYTES,
  WISH_SLOTS_DEFAULT_CAP,
} from '@wlist/core/lib';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'wouter';

import { Button } from '../../components/primitives/button';
import { PageLoadingPlaceholder, Skeleton } from '../../components/primitives/skeleton';
import { useQueryErrorToast } from '../../hooks/useQueryErrorToast';
import { useApiClient } from '../../providers/ApiClientProvider';
import { useTelegramBackButton } from '../../telegram/useTelegramBackButton';

import {
  PrepareWishPhotoError,
  prepareWishPhotoUpload,
  wishPhotoMimeForApi,
} from './prepareWishPhotoUpload';

interface WishFormPageProps {
  mode: 'create' | 'edit';
}

const visibleCopyLineSlots = (tuple: WishDraftFormInput['copyLines']): number => {
  let highest = 0;
  for (let i = 0; i < WISH_COPY_LINES_MAX; i++) {
    const s = tuple[i];
    if (s != null && s.trim() !== '') highest = i + 1;
  }
  return highest;
};

export const WishFormPage = ({ mode }: WishFormPageProps): React.JSX.Element => {
  const { t } = useTranslation('common');
  const { wishId } = useParams<{ wishId?: string }>();
  const api = useApiClient();
  const [, setLocation] = useLocation();
  const photoMaxMb = String(Math.round(WISH_PHOTO_MAX_UPLOAD_BYTES / (1024 * 1024)));
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copyLinesVisible, setCopyLinesVisible] = useState(0);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const existing = useWish(api, mode === 'edit' ? wishId : undefined);
  const createMut = useCreateWish(api);
  const updateMut = useUpdateWish(api);

  useQueryErrorToast(mode === 'edit' && Boolean(wishId) && existing.isError, t('states.error'));

  const form = useForm<WishDraftFormInput, unknown, WishDraftPayload>({
    resolver: zodResolver(wishDraftSchema),
    defaultValues: defaultWishDraftFormValues(),
  });

  const { register, handleSubmit, formState, reset, watch, setValue, getValues } = form;

  const priceStr = watch('priceStr');
  const isCollaborative = watch('isCollaborative');
  const hasPrice = priceStr.trim() !== '';

  useEffect(() => {
    if (!existing.data) return;
    const d = existing.data;
    const tuple = copyLinesToFormTuple(d.copy_lines);
    reset({
      title: d.title,
      description: d.description ?? '',
      priceStr: d.price != null ? String(d.price) : '',
      currency:
        d.price != null
          ? d.currency != null && isWishCurrencyCode(d.currency)
            ? d.currency
            : readLastWishCurrency()
          : '',
      linkStr: d.link ?? '',
      isCollaborative: d.is_collaborative,
      maxSlotsStr: d.max_slots != null ? String(d.max_slots) : '',
      copyLines: tuple,
    });
    setCopyLinesVisible(visibleCopyLineSlots(tuple));
  }, [existing.data, reset]);

  const goBack = (): void => {
    window.history.back();
  };
  useTelegramBackButton(goBack, true);

  const uploadPhotoIfNeeded = async (
    id: string,
    file: File,
    previousStoragePath: string | null,
  ): Promise<void> => {
    const mime = wishPhotoMimeForApi(file);
    if (!mime) throw new Error('unsupported_image_type');
    const signed = await api.storage.requestWishPhotoUpload({ wishId: id, mime });
    await api.storage.completeWishPhotoUpload({
      uploadUrl: signed.uploadUrl,
      body: file,
      contentType: mime,
    });
    await updateMut.mutateAsync({ id, photo_storage_path: signed.storagePath });
    if (previousStoragePath && previousStoragePath !== signed.storagePath) {
      try {
        await api.storage.deleteWishPhoto(previousStoragePath);
      } catch {
        // Old object may already be gone; avoid failing the save flow.
      }
    }
  };

  const onValid = async (payload: WishDraftPayload): Promise<void> => {
    setIsSaving(true);
    try {
      const body = {
        title: payload.title,
        description: payload.description,
        price: payload.price,
        currency: payload.currency,
        link: payload.link,
        is_collaborative: payload.is_collaborative,
        max_slots: payload.max_slots,
        copy_lines: payload.copy_lines,
      };

      if (mode === 'create') {
        const row = await createMut.mutateAsync(body);
        if (photo) await uploadPhotoIfNeeded(row.id, photo, null);
        setLocation(`/wish/${row.id}`, { replace: true });
        return;
      }

      if (!wishId) return;
      const previousPhotoPath = existing.data?.photo_storage_path ?? null;
      await updateMut.mutateAsync({ id: wishId, ...body });
      if (photo) await uploadPhotoIfNeeded(wishId, photo, previousPhotoPath);
      setLocation(`/wish/${wishId}`, { replace: true });
    } finally {
      setIsSaving(false);
    }
  };

  if (mode === 'edit' && (existing.isLoading || !wishId)) {
    return (
      <PageLoadingPlaceholder>
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </PageLoadingPlaceholder>
    );
  }

  if (mode === 'edit' && (existing.isError || !existing.data)) {
    return <p className="p-4 text-sm text-muted">{t('states.error')}</p>;
  }

  return (
    <form className="flex flex-col gap-4 p-4" onSubmit={handleSubmit(onValid)}>
      <h1 className="text-xl font-semibold text-foreground">
        {mode === 'create' ? t('wishes.form.create_title') : t('wishes.form.edit_title')}
      </h1>

      <fieldset
        disabled={isSaving}
        className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0 disabled:opacity-60"
      >
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">
            {t('wishes.form.title_label')}
          </span>
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
          <span className="text-sm font-medium text-foreground">
            {t('wishes.form.price_label')}
          </span>
          <input
            inputMode="decimal"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
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
          {formState.errors.priceStr ? (
            <span className="text-xs text-destructive">
              {t('wishes.form.errors.invalid_price')}
            </span>
          ) : null}
        </label>

        {hasPrice ? (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">
              {t('wishes.form.currency_label')}
            </span>
            <select
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
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
            {formState.errors.currency ? (
              <span className="text-xs text-destructive">
                {formState.errors.currency.message === 'currency_without_price'
                  ? t('wishes.form.errors.currency_without_price')
                  : t('wishes.form.errors.invalid_currency')}
              </span>
            ) : null}
          </label>
        ) : null}

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

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">
            {t('wishes.form.copy_lines_label')}
          </span>
          {([0, 1, 2, 3, 4] as const).slice(0, copyLinesVisible).map((i) => (
            <input
              key={i}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder={t('wishes.form.copy_line_placeholder', { n: i + 1 })}
              {...register(`copyLines.${i}`)}
            />
          ))}
          {copyLinesVisible < WISH_COPY_LINES_MAX ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              disabled={isSaving}
              onClick={() => setCopyLinesVisible((n) => Math.min(WISH_COPY_LINES_MAX, n + 1))}
            >
              {t('wishes.form.add_copy_line')}
            </Button>
          ) : null}
        </div>

        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0"
            {...register('isCollaborative')}
          />
          <span className="text-sm font-medium text-foreground">
            {t('wishes.form.collaborative_label')}
          </span>
        </label>

        {isCollaborative ? (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">
              {t('wishes.form.max_slots_label')}
            </span>
            <input
              inputMode="numeric"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              {...register('maxSlotsStr')}
            />
            <span className="text-xs text-muted">
              {t('wishes.form.max_slots_hint', { cap: WISH_SLOTS_DEFAULT_CAP })}
            </span>
            {formState.errors.maxSlotsStr ? (
              <span className="text-xs text-destructive">
                {formState.errors.maxSlotsStr.message === 'invalid_max_slots'
                  ? t('wishes.form.errors.invalid_max_slots')
                  : formState.errors.maxSlotsStr.message}
              </span>
            ) : null}
          </label>
        ) : null}

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">
            {t('wishes.form.photo_label')}
          </span>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={isSaving}
            className="sr-only"
            aria-label={t('wishes.form.photo_label')}
            onChange={(e) => {
              const input = e.target;
              const f = input.files?.[0];
              input.value = '';
              void (async () => {
                if (!f) {
                  setPhoto(null);
                  setPhotoError(null);
                  return;
                }
                setPhotoError(null);
                try {
                  const prepared = await prepareWishPhotoUpload(f);
                  setPhoto(prepared);
                } catch (err) {
                  setPhoto(null);
                  if (err instanceof PrepareWishPhotoError) {
                    if (err.code === 'too_large') {
                      setPhotoError(t('wishes.form.errors.photo_too_large', { maxMb: photoMaxMb }));
                    } else if (err.code === 'decode_failed') {
                      setPhotoError(t('wishes.form.errors.photo_decode_failed'));
                    } else {
                      setPhotoError(t('wishes.form.errors.photo_unsupported_type'));
                    }
                  } else {
                    setPhotoError(t('states.error'));
                  }
                }
              })();
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSaving}
              onClick={() => photoInputRef.current?.click()}
            >
              {photo ? t('wishes.form.photo_change') : t('wishes.form.photo_choose')}
            </Button>
            {photo ? (
              <>
                <span
                  className="min-w-0 max-w-full flex-1 truncate text-sm text-foreground"
                  title={photo.name}
                >
                  {t('wishes.form.photo_selected', { fileName: photo.name })}
                </span>
                <Button
                  type="button"
                  variant="link"
                  className="shrink-0"
                  disabled={isSaving}
                  onClick={() => {
                    setPhoto(null);
                    setPhotoError(null);
                  }}
                >
                  {t('wishes.form.photo_clear')}
                </Button>
              </>
            ) : null}
          </div>
          <span className="text-xs text-muted">
            {t('wishes.form.photo_hint', { maxMb: photoMaxMb })}
          </span>
          {photoError ? <span className="text-xs text-destructive">{photoError}</span> : null}
        </div>

        <Button type="submit" isLoading={isSaving}>
          {mode === 'create' ? t('wishes.form.submit_create') : t('wishes.form.submit_edit')}
        </Button>
      </fieldset>
    </form>
  );
};
