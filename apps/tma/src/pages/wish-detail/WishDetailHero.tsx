import { Loader2 } from 'lucide-react';

import { Button } from '../../components/primitives/button';
import { WISH_NO_PHOTO_EMOJI } from '../../components/wishes';

export function WishDetailHero({
  hasUploadedPhoto,
  photoSrc,
  onOpenLightbox,
  t,
}: {
  hasUploadedPhoto: boolean;
  photoSrc: string | null;
  onOpenLightbox: () => void;
  t: (key: string) => string;
}): React.JSX.Element {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="relative aspect-video w-full bg-muted">
        {hasUploadedPhoto ? (
          photoSrc ? (
            <Button
              type="button"
              variant="media"
              onClick={onOpenLightbox}
              className="relative overflow-hidden"
            >
              <img src={photoSrc} alt="" className="h-full w-full object-cover" />
            </Button>
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              aria-busy="true"
              aria-label={t('states.loading')}
            >
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" strokeWidth={2} />
            </div>
          )
        ) : (
          <div
            className="flex h-full w-full select-none items-center justify-center text-5xl"
            aria-hidden
          >
            {WISH_NO_PHOTO_EMOJI}
          </div>
        )}
      </div>
    </div>
  );
}
