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
import { isWishCurrencyCode, readLastWishCurrency, WISH_COPY_LINES_MAX } from '@wlist/core/lib';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'wouter';
import { z } from 'zod';

import { BottomSheet } from '../../components/overlays';
import { Button } from '../../components/primitives/button';
import { Collapsible } from '../../components/primitives/collapsible';
import { FormSection } from '../../components/primitives/form-section';
import { PageLoadingPlaceholder, Skeleton } from '../../components/primitives/skeleton';
import { useQueryErrorToast } from '../../hooks/useQueryErrorToast';
import { showErrorToast } from '../../lib/errorToast';
import { useApiClient } from '../../providers/ApiClientProvider';
import { haptics } from '../../telegram/haptics';
import { useClosingConfirmation } from '../../telegram/useClosingConfirmation';
import { useTelegramBackButton } from '../../telegram/useTelegramBackButton';
import { useTelegramMainButton } from '../../telegram/useTelegramMainButton';
import { useTelegramSecondaryButton } from '../../telegram/useTelegramSecondaryButton';

import { wishPhotoMimeForApi } from './prepareWishPhotoUpload';
import {
  WishCopyLinesSection,
  WishCoreSection,
  WishEventsSection,
  WishGroupGiftSection,
  WishPhotoSection,
  WishVisibilitySection,
} from './sections';

interface WishFormPageProps {
  mode: 'create' | 'edit';
}

type WishVisibility = Wish['visibility'];

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
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copyLinesVisible, setCopyLinesVisible] = useState(0);
  const [isCopyInfoOpen, setIsCopyInfoOpen] = useState(false);

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

  const { handleSubmit, reset } = form;

  // Open the "Add details" disclosure by default when the wish being edited or
  // reposted already uses an advanced field, so existing data isn't hidden a tap
  // away. Collapsible captures `defaultOpen` once at mount; the loading guards
  // gate the form on existing/wishEvents (edit) and repostSource (create), so by
  // mount every input here is resolved and this value is final.
  const detailsSource = mode === 'edit' ? existing.data : repostSource.data;
  const detailsDefaultOpen =
    (detailsSource?.copy_lines?.length ?? 0) > 0 ||
    detailsSource?.is_collaborative === true ||
    (mode === 'edit' && (wishEvents.data?.length ?? 0) > 0);

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

  // Confirm closing the app while there are unsaved edits.
  useClosingConfirmation(form.formState.isDirty && !isSaving);

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
        haptics.notify('success');
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
      haptics.notify('success');
      setLocation(`/wish/${wishId}`, { replace: true });
    } catch (err) {
      // Outcome cue on failure; the mutation hooks surface the error UI/toast.
      haptics.notify('error');
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  // Mirror the in-page submit on Telegram's native MainButton — the platform's
  // primary CTA. The in-page button stays as the browser/dev fallback. The hook
  // stashes onClick in a ref, so an inline handler is fine here.
  const mainButtonActive = useTelegramMainButton({
    text: mode === 'create' ? t('wishes.form.submit_create') : t('wishes.form.submit_edit'),
    onClick: () => void handleSubmit(onValid)(),
    isLoaderVisible: isSaving,
    isEnabled: !isSaving,
  });

  // Cancel as the SecondaryButton beside Save, only while the MainButton drives
  // the CTA (inside Telegram). In-page forms fall back to BackButton / navigation.
  useTelegramSecondaryButton({
    text: t('actions.cancel'),
    position: 'left',
    onClick: goBack,
    isVisible: mainButtonActive,
    isEnabled: !isSaving,
  });

  // Wait on the repost source's chosen lists too, so a reposted 'lists' wish
  // doesn't render (and can't be saved) before its list prefill is seeded.
  if (mode === 'create' && repostFromId && (repostSource.isLoading || repostLists.isLoading)) {
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

  // Gate on every prefill source — existing wish, its linked events, and its
  // chosen lists — so the form never renders before its state is seeded. This
  // makes "prefill before render" a hard invariant: it keeps `detailsDefaultOpen`
  // correct at the Collapsible's mount-time read, and (more importantly) prevents
  // a too-early save from wiping events / chosen lists with empty arrays.
  if (
    mode === 'edit' &&
    (existing.isLoading || wishEvents.isLoading || wishLists.isLoading || !wishId)
  ) {
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
        className="m-0 flex min-w-0 flex-col gap-6 border-0 p-0 disabled:opacity-60"
      >
        {/* Level 1 — the essentials: photo, title, description, link, price. */}
        <FormSection title={t('wishes.form.core_section')}>
          <WishPhotoSection
            photo={photo}
            onPhotoChange={setPhoto}
            photoError={photoError}
            onPhotoError={setPhotoError}
          />
          <WishCoreSection form={form} />
        </FormSection>

        {/* Level 2 — who can see it: visibility + (when "lists") list picker. */}
        <FormSection title={t('wishes.form.visibility_section')} divided>
          <WishVisibilitySection
            visibility={visibility}
            onVisibilityChange={setVisibility}
            lists={userLists.data}
            selectedListIds={selectedListIds}
            onToggleList={(listId) =>
              setSelectedListIds((prev) =>
                prev.includes(listId) ? prev.filter((id) => id !== listId) : [...prev, listId],
              )
            }
            onManageLists={() => setLocation('/me/lists')}
          />
        </FormSection>

        {/* Level 3 — advanced/optional, tucked under one tap. Opens by default
            when any of its fields already has content (e.g. editing a wish). */}
        <div className="border-t border-border pt-2">
          <Collapsible summary={t('wishes.form.details_toggle')} defaultOpen={detailsDefaultOpen}>
            <WishCopyLinesSection
              form={form}
              visibleCount={copyLinesVisible}
              onAddLine={() => setCopyLinesVisible((n) => Math.min(WISH_COPY_LINES_MAX, n + 1))}
              onOpenInfo={() => setIsCopyInfoOpen(true)}
            />

            <WishEventsSection
              events={userEvents.data}
              selectedEventIds={selectedEventIds}
              onToggleEvent={(eventId) =>
                setSelectedEventIds((prev) =>
                  prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId],
                )
              }
              onCreateEvent={() => setLocation('/event/new')}
            />

            <WishGroupGiftSection form={form} mode={mode} />
          </Collapsible>
        </div>

        {!mainButtonActive ? (
          <Button type="submit" isLoading={isSaving}>
            {mode === 'create' ? t('wishes.form.submit_create') : t('wishes.form.submit_edit')}
          </Button>
        ) : null}
      </fieldset>

      <BottomSheet
        isOpen={isCopyInfoOpen}
        onClose={() => setIsCopyInfoOpen(false)}
        title={t('wishes.form.copy_lines_info_title')}
      >
        <div className="flex flex-col gap-4 px-4 pb-4">
          <p className="text-sm text-muted">{t('wishes.form.copy_lines_info_body')}</p>
          <Button type="button" variant="secondary" onClick={() => setIsCopyInfoOpen(false)}>
            {t('wishes.form.copy_lines_info_dismiss')}
          </Button>
        </div>
      </BottomSheet>
    </form>
  );
};
