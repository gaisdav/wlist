import { WISH_COPY_LINE_MAX_CHARS, WISH_COPY_LINES_MAX } from '@wlist/core/lib';
import { Info, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '../../../components/primitives/button';

import type { WishSectionBaseProps } from './types';

interface WishCopyLinesSectionProps extends WishSectionBaseProps {
  /** How many copy-line slots are currently shown (0..WISH_COPY_LINES_MAX). */
  visibleCount: number;
  /** Reveal one more slot. */
  onAddLine: () => void;
  /** Open the info bottom sheet explaining what copy-lines are for. */
  onOpenInfo: () => void;
}

/**
 * "Text to copy" section: ready-to-paste lines (card number, address, size) the
 * gift-giver can copy in one tap on the wish page. Slots reveal one at a time;
 * the ⓘ button opens an info sheet (owned by the page) explaining the purpose.
 */
export const WishCopyLinesSection = ({
  form,
  isSaving,
  visibleCount,
  onAddLine,
  onOpenInfo,
}: WishCopyLinesSectionProps): React.JSX.Element => {
  const { t } = useTranslation('common');
  const { register } = form;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium text-foreground">
          {t('wishes.form.copy_lines_label')}
        </span>
        <button
          type="button"
          className="text-muted transition-colors hover:text-foreground"
          aria-label={t('wishes.form.copy_lines_info_aria')}
          onClick={onOpenInfo}
        >
          <Info className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
        </button>
      </div>
      {([0, 1, 2, 3, 4] as const).slice(0, visibleCount).map((i) => (
        <textarea
          key={i}
          rows={3}
          maxLength={WISH_COPY_LINE_MAX_CHARS}
          className="resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm"
          placeholder={t('wishes.form.copy_line_placeholder')}
          {...register(`copyLines.${i}`)}
        />
      ))}
      {visibleCount < WISH_COPY_LINES_MAX ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          disabled={isSaving}
          onClick={onAddLine}
        >
          <Plus className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
          {t('wishes.form.add_copy_line')}
        </Button>
      ) : null}
    </div>
  );
};
