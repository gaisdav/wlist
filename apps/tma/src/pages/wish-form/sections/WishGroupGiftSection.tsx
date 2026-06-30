import { WISH_SLOTS_DEFAULT_CAP } from '@wlist/core/lib';
import { useTranslation } from 'react-i18next';

import { SwitchField } from '../../../components/primitives/switch';

import type { WishSectionBaseProps } from './types';

interface WishGroupGiftSectionProps extends WishSectionBaseProps {
  mode: 'create' | 'edit';
}

/**
 * Group-gift toggle + (when on) the optional max-participants cap. In edit mode
 * the whole block is locked — group-gift settings can't change after creation —
 * with an explanatory hint; in create mode the cap defaults if left empty.
 *
 * Controls are disabled only by `locked`; the enclosing `<fieldset>` already
 * disables them while a save is in flight, so `isSaving` isn't threaded here.
 */
export const WishGroupGiftSection = ({
  form,
  mode,
}: WishGroupGiftSectionProps): React.JSX.Element => {
  const { t } = useTranslation('common');
  const { register, formState, watch, setValue } = form;
  const isCollaborative = watch('isCollaborative');
  const locked = mode === 'edit';

  return (
    <div className={`flex flex-col gap-2${locked ? ' opacity-80' : ''}`}>
      <SwitchField
        label={t('wishes.form.collaborative_label')}
        hint={
          locked ? t('wishes.form.collaborative_locked_hint') : t('wishes.form.group_gift_hint')
        }
        checked={isCollaborative}
        onChange={(checked) =>
          setValue('isCollaborative', checked, { shouldDirty: true, shouldValidate: true })
        }
        disabled={locked}
      />

      {isCollaborative ? (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">
            {t('wishes.form.max_slots_label')}
          </span>
          <input
            inputMode="numeric"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-70"
            disabled={locked}
            {...register('maxSlotsStr')}
          />
          {!locked ? (
            <span className="text-xs text-muted">
              {t('wishes.form.max_slots_hint', { cap: WISH_SLOTS_DEFAULT_CAP })}
            </span>
          ) : null}
          {formState.errors.maxSlotsStr && !locked ? (
            <span className="text-xs text-destructive">
              {formState.errors.maxSlotsStr.message === 'invalid_max_slots'
                ? t('wishes.form.errors.invalid_max_slots')
                : formState.errors.maxSlotsStr.message}
            </span>
          ) : null}
        </label>
      ) : null}
    </div>
  );
};
