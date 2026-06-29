import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateEvent, useEvent, useUpdateEvent } from '@wlist/core/hooks/events';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'wouter';
import { z } from 'zod';

import { Button } from '../../components/primitives/button';
import { PageLoadingPlaceholder, Skeleton } from '../../components/primitives/skeleton';
import { SwitchField } from '../../components/primitives/switch';
import { useQueryErrorToast } from '../../hooks/useQueryErrorToast';
import { useApiClient } from '../../providers/ApiClientProvider';
import { useTelegramBackButton } from '../../telegram/useTelegramBackButton';
import { useTelegramMainButton } from '../../telegram/useTelegramMainButton';

const eventFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  event_date: z.string().optional().or(z.literal('')),
  is_recurring_yearly: z.boolean(),
});

type EventFormInput = z.infer<typeof eventFormSchema>;

interface EventFormPageProps {
  mode: 'create' | 'edit';
}

export const EventFormPage = ({ mode }: EventFormPageProps): React.JSX.Element => {
  const { t } = useTranslation('common');
  const { eventId } = useParams<{ eventId?: string }>();
  const api = useApiClient();
  const [, setLocation] = useLocation();
  const [isSaving, setIsSaving] = useState(false);

  const event = useEvent(api, mode === 'edit' ? eventId : undefined);
  const createMut = useCreateEvent(api);
  const updateMut = useUpdateEvent(api);

  useQueryErrorToast(mode === 'edit' && Boolean(eventId) && event.isError, t('states.error'));

  const { register, handleSubmit, formState, reset, watch, setValue } = useForm<EventFormInput>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: '',
      event_date: '',
      is_recurring_yearly: true,
    },
  });

  const isRecurring = watch('is_recurring_yearly');
  // A one-off event in the past makes no sense; a yearly one ignores the year.
  const minDate = isRecurring ? undefined : new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!event.data) return;
    const d = event.data;
    reset({
      title: d.title,
      event_date: d.event_date ?? '',
      is_recurring_yearly: d.is_recurring_yearly,
    });
  }, [event.data, reset]);

  const goBack = (): void => {
    window.history.back();
  };
  useTelegramBackButton(goBack, true);

  const onValid = async (data: EventFormInput): Promise<void> => {
    setIsSaving(true);
    try {
      if (mode === 'create') {
        const row = await createMut.mutateAsync({
          title: data.title,
          event_date: data.event_date || null,
          is_recurring_yearly: data.is_recurring_yearly,
        });
        setLocation(`/event/${row.id}`, { replace: true });
        return;
      }

      if (!eventId) return;
      await updateMut.mutateAsync({
        id: eventId,
        title: data.title,
        event_date: data.event_date || null,
        is_recurring_yearly: data.is_recurring_yearly,
      });
      setLocation(`/event/${eventId}`, { replace: true });
    } finally {
      setIsSaving(false);
    }
  };

  // Native MainButton mirrors the in-page submit; the in-page button is the fallback.
  useTelegramMainButton({
    text: mode === 'create' ? t('events.form.submit_create') : t('events.form.submit_edit'),
    onClick: () => void handleSubmit(onValid)(),
    isLoaderVisible: isSaving,
    isEnabled: !isSaving,
  });

  if (mode === 'edit' && (event.isLoading || !eventId)) {
    return (
      <PageLoadingPlaceholder>
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </PageLoadingPlaceholder>
    );
  }

  if (mode === 'edit' && (event.isError || !event.data)) {
    return <p className="p-4 text-sm text-muted">{t('states.error')}</p>;
  }

  return (
    <form className="flex flex-col gap-4 p-4" onSubmit={handleSubmit(onValid)}>
      <h1 className="text-xl font-semibold text-foreground">
        {mode === 'create' ? t('events.form.create_title') : t('events.form.edit_title')}
      </h1>

      <fieldset
        disabled={isSaving}
        className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0 disabled:opacity-60"
      >
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">
            {t('events.form.title_label')}
          </span>
          <input
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            placeholder={t('events.form.title_placeholder')}
            {...register('title')}
          />
          {formState.errors.title ? (
            <span className="text-xs text-destructive">
              {t('events.form.errors.title_required')}
            </span>
          ) : null}
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">{t('events.form.date_label')}</span>
          <input
            type="date"
            min={minDate}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            {...register('event_date')}
          />
        </label>

        <SwitchField
          label={t('events.form.recurring_label')}
          checked={isRecurring}
          onChange={(checked) =>
            setValue('is_recurring_yearly', checked, { shouldDirty: true, shouldValidate: true })
          }
          disabled={isSaving}
        />

        <Button type="submit" isLoading={isSaving} className="mt-2">
          {mode === 'create' ? t('events.form.submit_create') : t('events.form.submit_edit')}
        </Button>
      </fieldset>
    </form>
  );
};
