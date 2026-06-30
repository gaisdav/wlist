import { WISH_PHOTO_MAX_UPLOAD_BYTES } from '@wlist/core/lib';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '../../../components/primitives/button';
import { PrepareWishPhotoError, prepareWishPhotoUpload } from '../prepareWishPhotoUpload';

interface WishPhotoSectionProps {
  /** The prepared photo to upload, or null if none chosen. */
  photo: File | null;
  /** Receives the prepared (resized/validated) file, or null when cleared. */
  onPhotoChange: (file: File | null) => void;
  /** Localized error for the last pick attempt, or null. */
  photoError: string | null;
  /** Set/clear the pick error. */
  onPhotoError: (message: string | null) => void;
}

/**
 * Photo picker: validates and resizes the chosen image (via
 * `prepareWishPhotoUpload`) before lifting the prepared `File` up to the page,
 * which performs the actual upload after the wish is saved. The hidden native
 * input is driven by a styled button; errors surface inline.
 */
export const WishPhotoSection = ({
  photo,
  onPhotoChange,
  photoError,
  onPhotoError,
}: WishPhotoSectionProps): React.JSX.Element => {
  const { t } = useTranslation('common');
  const photoMaxMb = String(Math.round(WISH_PHOTO_MAX_UPLOAD_BYTES / (1024 * 1024)));
  const photoInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-foreground">{t('wishes.form.photo_label')}</span>
      <input
        ref={photoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        aria-label={t('wishes.form.photo_label')}
        onChange={(e) => {
          const input = e.target;
          const f = input.files?.[0];
          input.value = '';
          void (async () => {
            if (!f) {
              onPhotoChange(null);
              onPhotoError(null);
              return;
            }
            onPhotoError(null);
            try {
              const prepared = await prepareWishPhotoUpload(f);
              onPhotoChange(prepared);
            } catch (err) {
              onPhotoChange(null);
              if (err instanceof PrepareWishPhotoError) {
                if (err.code === 'too_large') {
                  onPhotoError(t('wishes.form.errors.photo_too_large', { maxMb: photoMaxMb }));
                } else if (err.code === 'decode_failed') {
                  onPhotoError(t('wishes.form.errors.photo_decode_failed'));
                } else {
                  onPhotoError(t('wishes.form.errors.photo_unsupported_type'));
                }
              } else {
                onPhotoError(t('states.error'));
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
              onClick={() => {
                onPhotoChange(null);
                onPhotoError(null);
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
  );
};
