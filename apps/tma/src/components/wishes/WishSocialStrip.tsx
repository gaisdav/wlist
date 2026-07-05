import { type Wish } from '@wlist/core/entities/wish';
import { useToggleWishLike, useWishLikeState } from '@wlist/core/hooks/social';
import { Heart, MessageCircle, Repeat2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';

import { useApiClient } from '../../providers/ApiClientProvider';
import { haptics } from '../../telegram/haptics';
import { CommentsBottomSheet } from '../comments';
import { Button } from '../primitives/button';

interface WishSocialStripProps {
  wish: Wish;
  isOwner: boolean;
}

export const WishSocialStrip = ({ wish, isOwner }: WishSocialStripProps): React.JSX.Element => {
  const { t } = useTranslation('common');
  const api = useApiClient();
  const [, setLocation] = useLocation();
  const likeState = useWishLikeState(api, isOwner ? undefined : wish.id);
  const toggleLike = useToggleWishLike(api);

  const [isCommentsOpen, setIsCommentsOpen] = useState(false);

  const likesDisplay = isOwner ? wish.likes_count : (likeState.data?.count ?? wish.likes_count);
  const likedByMe = !isOwner && Boolean(likeState.data?.likedByMe);

  return (
    <>
      <div className="flex flex-wrap items-center gap-4 border-t border-border px-3 py-2 text-sm text-muted">
        <div className="flex items-center gap-1">
          {isOwner ? (
            <Heart className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden />
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="iconRound"
              className="text-foreground"
              aria-label={likedByMe ? t('social.unlike') : t('social.like')}
              aria-pressed={likedByMe}
              disabled={likeState.isLoading}
              onClick={() => {
                haptics.impact('light');
                void toggleLike.mutateAsync({ wishId: wish.id, liked: !likedByMe });
              }}
            >
              <Heart
                className={`h-4 w-4 shrink-0 ${likedByMe ? 'fill-primary text-primary' : ''}`}
                strokeWidth={2}
                aria-hidden
              />
            </Button>
          )}
          {likesDisplay > 0 ? (
            <span aria-label={t('social.likes_count')}>{likesDisplay}</span>
          ) : null}
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="iconRound"
            className="text-foreground"
            aria-label={t('comments.title')}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsCommentsOpen(true);
            }}
          >
            <MessageCircle className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
          </Button>
          {wish.comments_count > 0 ? (
            <span aria-label={t('comments.title')}>{wish.comments_count}</span>
          ) : null}
        </div>

        <div className="flex items-center gap-1">
          {isOwner ? (
            <Repeat2
              className="h-4 w-4 shrink-0 text-muted-foreground"
              strokeWidth={2}
              aria-hidden
            />
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="iconRound"
              className="text-foreground"
              aria-label={t('social.repost')}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setLocation(`/wish/new?repostFrom=${wish.id}`);
              }}
            >
              <Repeat2 className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
            </Button>
          )}
          {wish.reposts_count > 0 ? (
            <span aria-label={t('social.reposts_count')}>{wish.reposts_count}</span>
          ) : null}
        </div>
      </div>

      <CommentsBottomSheet
        isOpen={isCommentsOpen}
        onClose={() => setIsCommentsOpen(false)}
        wishId={wish.id}
        isOwner={isOwner}
      />
    </>
  );
};
