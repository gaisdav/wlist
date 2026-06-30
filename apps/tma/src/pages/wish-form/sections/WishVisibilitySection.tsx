import type { Wish } from '@wlist/core/entities/wish';
import { useTranslation } from 'react-i18next';

import { badgeVariants } from '../../../components/primitives/badge';
import { Button } from '../../../components/primitives/button';
import { SegmentedControl } from '../../../components/primitives/segmented-control';
import { haptics } from '../../../telegram/haptics';

type WishVisibility = Wish['visibility'];

const VISIBILITY_OPTIONS: readonly WishVisibility[] = ['public', 'followers', 'lists'];

interface WishVisibilitySectionProps {
  visibility: WishVisibility;
  onVisibilityChange: (next: WishVisibility) => void;
  /** Lists the viewer owns; minimal shape needed to render the picker. */
  lists: readonly { id: string; name: string }[] | undefined;
  selectedListIds: string[];
  onToggleList: (listId: string) => void;
  /** Navigate to the lists manager (empty-state CTA). */
  onManageLists: () => void;
}

/**
 * Visibility picker as a segmented control — one of three mutually-exclusive
 * audiences (public / followers / chosen lists), with a light haptic tick on
 * change. When "lists" is active, reveals the owner's lists to multi-select via
 * toggle chips — or a compact empty-state with a CTA to create one. An empty
 * selection under "lists" shows an inline hint (submit is also guarded upstream).
 */
export const WishVisibilitySection = ({
  visibility,
  onVisibilityChange,
  lists,
  selectedListIds,
  onToggleList,
  onManageLists,
}: WishVisibilitySectionProps): React.JSX.Element => {
  const { t } = useTranslation('common');

  return (
    <div className="flex flex-col gap-2">
      <SegmentedControl
        value={visibility}
        onChange={(next) => {
          haptics.select();
          onVisibilityChange(next);
        }}
        aria-label={t('wishes.form.visibility_label')}
        options={VISIBILITY_OPTIONS.map((opt) => ({
          value: opt,
          label: t(`wishes.form.visibility_${opt}`),
        }))}
      />

      {visibility === 'lists' ? (
        lists && lists.length > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              {lists.map((list) => {
                const isSelected = selectedListIds.includes(list.id);
                return (
                  <button
                    key={list.id}
                    type="button"
                    aria-pressed={isSelected}
                    className={badgeVariants({
                      variant: isSelected ? 'brand' : 'neutral',
                      size: 'md',
                      className: 'cursor-pointer hover:opacity-90 transition-all',
                    })}
                    onClick={() => onToggleList(list.id)}
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
          <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-border bg-surface px-3 py-3">
            <span className="text-sm text-muted">{t('wishes.form.visibility_lists_empty')}</span>
            <Button type="button" variant="secondary" size="sm" onClick={onManageLists}>
              {t('wishes.form.visibility_lists_manage')}
            </Button>
          </div>
        )
      ) : null}
    </div>
  );
};
