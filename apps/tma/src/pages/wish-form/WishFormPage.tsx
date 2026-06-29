import { zodResolver } from '@hookform/resolvers/zod';
import {
  copyLinesToFormTuple,
  defaultWishDraftFormValues,
  wishDraftSchema,
  type Wish,
  type WishDraftFormInput,
  type WishDraftPayload,
} from '@wlist/core/entities/wish';
import { useCurrentUser } from '@wlist/core/hooks/auth';
import { useUserEvents, useWishEvents, useSetWishEvents } from '@wlist/core/hooks/events';
import { useUserLists, useWishVisibilityLists } from '@wlist/core/hooks/lists';
import { useCreateWish, useUpdateWish, useWish } from '@wlist/core/hooks/wishes';
import {
  isWishCurrencyCode,
  persistLastWishCurrency,
  readLastWishCurrency,
  SUPPORTED_WISH_CURRENCIES,
  WISH_COPY_LINE_MAX_CHARS,
  WISH_COPY_LINES_MAX,
  WISH_PHOTO_MAX_UPLOAD_BYTES,
  WISH_SLOTS_DEFAULT_CAP,
} from '@wlist/core/lib';
import { Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'wouter';
import { z } from 'zod';

import { badgeVariants } from '../../components/primitives/badge';
import { Button } from '../../components/primitives/button';
import { PageLoadingPlaceholder, Skeleton } from '../../components/primitives/skeleton';
import { useQueryErrorToast } from '../../hooks/useQueryErrorToast';
import { showErrorToast } from '../../lib/errorToast';
import { useApiClient } from '../../providers/ApiClientProvider';
import { useTelegramBackButton } from '../../telegram/useTelegramBackButton';
import { useTelegramMainButton } from '../../telegram/useTelegramMainButton';

import {
  PrepareWishPhotoError,
  prepareWishPhotoUpload,
  wishPhotoMimeForApi,
} from './prepareWishPhotoUpload';

interface WishFormPageProps {
  mode: 'create' | 'edit';
}

type WishVisibility = Wish['visibility'];

const VISIBILITY_OPTIONS: readonly WishVisibility[] = ['public', 'followers', 'lists'];

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

  const [repostFromId, setRepostFromId] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'create') {
      setRepostFromId(null);
      return;
    }
    const raw = new URL(window.location.href).searchParams.get('repostFrom');
    const parsed = z.string().uuid().safeParse(raw);
    setRepostFromId(parsed.success ? parsed.data : null);
  }, [mode]);

  const repostSource = useWish(api, mode === 'create' ? (repostFromId ?? undefined) : undefined);

  const existing = useWish(api, mode === 'edit' ? wishId : undefined);
  const createMut = useCreateWish(api);
  const updateMut = useUpdateWish(api);

  const profile = useCurrentUser(api);
  const userEvents = useUserEvents(api, profile.data?.id);
  const wishEvents = useWishEvents(api, mode === 'edit' ? wishId : undefined);
  const setWishEventsMut = useSetWishEvents(api);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);

  const userLists = useUserLists(api);
  const wishLists = useWishVisibilityLists(api, mode === 'edit' ? wishId : undefined);
  const repostLists = useWishVisibilityLists(
    api,
    mode === 'create' ? (repostFromId ?? undefined) : undefined,
  );
  const [visibility, setVisibility] = useState<WishVisibility>('public');
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);

  useEffect(() => {
    if (mode === 'edit' && wishEvents.data) {
      setSelectedEventIds(wishEvents.data.map((e) => e.id));
    }
  }, [mode, wishEvents.data]);

  // Prefill visibility from the wish being edited / reposted.
  useEffect(() => {
    const src = mode === 'edit' ? existing.data : repostSource.data;
    if (src) setVisibility(src.visibility);
  }, [mode, existing.data, repostSource.data]);

  // Prefill chosen lists (only relevant for visibility = 'lists').
  useEffect(() => {
    const ids = mode === 'edit' ? wishLists.data : repostLists.data;
    if (ids) setSelectedListIds(ids);
  }, [mode, wishLists.data, repostLists.data]);

  useQueryErrorToast(mode === 'edit' && Boolean(wishId) && existing.isError, t('states.error'));
  useQueryErrorToast(
    mode === 'create' && Boolean(repostFromId) && repostSource.isError,
    t('states.error'),
  );

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

  useEffect(() => {
    if (mode !== 'create' || !repostFromId || !repostSource.data) return;
    const d = repostSource.data;
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
  }, [mode, repostFromId, repostSource.data, reset]);

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
    // 'lists' visibility requires at least one list, else the wish is invisible
    // to everyone but the owner. Inline hint + toast so the blocked submit isn't
    // a silent no-op.
    if (visibility === 'lists' && selectedListIds.length === 0) {
      showErrorToast(t('wishes.form.visibility_lists_pick'));
      return;
    }
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

      const visibilityFields = {
        visibility,
        ...(visibility === 'lists' ? { list_ids: selectedListIds } : {}),
      };

      if (mode === 'create') {
        const row = await createMut.mutateAsync({
          ...body,
          ...visibilityFields,
          ...(repostFromId ? { reposted_from_id: repostFromId } : {}),
        });
        if (photo) await uploadPhotoIfNeeded(row.id, photo, null);
        if (selectedEventIds.length > 0) {
          await setWishEventsMut.mutateAsync({ wishId: row.id, eventIds: selectedEventIds });
        }
        setLocation(`/wish/${row.id}`, { replace: true });
        return;
      }

      if (!wishId) return;
      const previousPhotoPath = existing.data?.photo_storage_path ?? null;
      await updateMut.mutateAsync({
        id: wishId,
        title: body.title,
        description: body.description,
        price: body.price,
        currency: body.currency,
        link: body.link,
        copy_lines: body.copy_lines,
        ...visibilityFields,
      });
      if (photo) await uploadPhotoIfNeeded(wishId, photo, previousPhotoPath);
      await setWishEventsMut.mutateAsync({ wishId, eventIds: selectedEventIds });
      setLocation(`/wish/${wishId}`, { replace: true });
    } finally {
      setIsSaving(false);
    }
  };

  // Mirror the in-page submit on Telegram's native MainButton — the platform's
  // primary CTA. The in-page button stays as the browser/dev fallback. The hook
  // stashes onClick in a ref, so an inline handler is fine here.
  useTelegramMainButton({
    text: mode === 'create' ? t('wishes.form.submit_create') : t('wishes.form.submit_edit'),
    onClick: () => void handleSubmit(onValid)(),
    isLoaderVisible: isSaving,
    isEnabled: !isSaving,
  });

  if (mode === 'create' && repostFromId && repostSource.isLoading) {
    return (
      <PageLoadingPlaceholder>
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </PageLoadingPlaceholder>
    );
  }

  if (mode === 'create' && repostFromId && !repostSource.isLoading && !repostSource.data) {
    return <p className="p-4 text-sm text-muted">{t('social.repost_source_unavailable')}</p>;
  }

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
      {mode === 'create' && repostFromId ? (
        <p className="text-sm text-muted">{t('social.repost_prefill')}</p>
      ) : null}

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
          {([0, 1, 2, 3, 4] as const).slice(0, copyLinesVisible).map((i) => (
            <textarea
              key={i}
              rows={3}
              maxLength={WISH_COPY_LINE_MAX_CHARS}
              className="resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm"
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
              <Plus className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
              {t('wishes.form.add_copy_line')}
            </Button>
          ) : null}
        </div>

        <div className={`flex flex-col gap-2${mode === 'edit' ? ' opacity-80' : ''}`}>
          <label
            className={`flex items-start gap-2${mode === 'edit' ? ' cursor-default' : ' cursor-pointer'}`}
          >
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 shrink-0 disabled:cursor-not-allowed"
              disabled={mode === 'edit' || isSaving}
              {...register('isCollaborative')}
            />
            <span className="text-sm font-medium text-foreground">
              {t('wishes.form.collaborative_label')}
            </span>
          </label>
          {mode === 'edit' ? (
            <p className="text-xs text-muted">{t('wishes.form.collaborative_locked_hint')}</p>
          ) : null}

          {isCollaborative ? (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-foreground">
                {t('wishes.form.max_slots_label')}
              </span>
              <input
                inputMode="numeric"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-70"
                disabled={mode === 'edit' || isSaving}
                {...register('maxSlotsStr')}
              />
              {mode === 'create' ? (
                <span className="text-xs text-muted">
                  {t('wishes.form.max_slots_hint', { cap: WISH_SLOTS_DEFAULT_CAP })}
                </span>
              ) : null}
              {formState.errors.maxSlotsStr && mode === 'create' ? (
                <span className="text-xs text-destructive">
                  {formState.errors.maxSlotsStr.message === 'invalid_max_slots'
                    ? t('wishes.form.errors.invalid_max_slots')
                    : formState.errors.maxSlotsStr.message}
                </span>
              ) : null}
            </label>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">
            {t('wishes.form.visibility_label')}
          </span>
          <div className="flex flex-wrap gap-2">
            {VISIBILITY_OPTIONS.map((opt) => {
              const isSelected = visibility === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={isSaving}
                  aria-pressed={isSelected}
                  className={badgeVariants({
                    variant: isSelected ? 'brand' : 'neutral',
                    size: 'md',
                    className: 'cursor-pointer hover:opacity-90 transition-all',
                  })}
                  onClick={() => setVisibility(opt)}
                >
                  {t(`wishes.form.visibility_${opt}`)}
                </button>
              );
            })}
          </div>

          {visibility === 'lists' ? (
            userLists.data && userLists.data.length > 0 ? (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  {userLists.data.map((list) => {
                    const isSelected = selectedListIds.includes(list.id);
                    return (
                      <button
                        key={list.id}
                        type="button"
                        disabled={isSaving}
                        aria-pressed={isSelected}
                        className={badgeVariants({
                          variant: isSelected ? 'brand' : 'neutral',
                          size: 'md',
                          className: 'cursor-pointer hover:opacity-90 transition-all',
                        })}
                        onClick={() =>
                          setSelectedListIds((prev) =>
                            isSelected ? prev.filter((id) => id !== list.id) : [...prev, list.id],
                          )
                        }
                      >
                        {list.name}
                      </button>
                    );
                  })}
                </div>
                {selectedListIds.length === 0 ? (
                  <span className="text-xs text-destructive">
                    {t('wishes.form.visibility_lists_pick')}
                  </span>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted">
                  {t('wishes.form.visibility_lists_empty')}
                </span>
                <Button
                  type="button"
                  variant="link"
                  className="self-start"
                  onClick={() => setLocation('/me/lists')}
                >
                  {t('wishes.form.visibility_lists_manage')}
                </Button>
              </div>
            )
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">
            {t('events.wish_select.label')}
          </span>
          <div className="flex flex-wrap gap-2">
            {userEvents.data?.map((event) => {
              const isSelected = selectedEventIds.includes(event.id);
              return (
                <button
                  key={event.id}
                  type="button"
                  className={badgeVariants({
                    variant: isSelected ? 'brand' : 'neutral',
                    size: 'md',
                    className: 'cursor-pointer hover:opacity-90 transition-all',
                  })}
                  onClick={() => {
                    setSelectedEventIds((prev) =>
                      isSelected ? prev.filter((id) => id !== event.id) : [...prev, event.id],
                    );
                  }}
                >
                  {event.title}
                </button>
              );
            })}
            <button
              type="button"
              className={badgeVariants({
                variant: 'brandOutline',
                size: 'md',
                className:
                  'border-dashed cursor-pointer hover:bg-primary/5 transition-all flex items-center gap-1',
              })}
              onClick={() => setLocation('/event/new')}
            >
              <span>+</span>
              <span>{t('events.list.add_event')}</span>
            </button>
          </div>
        </div>

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
