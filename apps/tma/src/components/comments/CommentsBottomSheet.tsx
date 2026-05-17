import type { ApiClient, WishCommentRow } from '@wlist/api';
import { useCurrentUser } from '@wlist/core/hooks/auth';
import { useWishComments, useCreateWishComment } from '@wlist/core/hooks/comments';
import { useProfileById } from '@wlist/core/hooks/social';
import { Send } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useApiClient } from '../../providers/ApiClientProvider';
import { BottomSheet } from '../overlays/BottomSheet';
import { Button } from '../primitives/button';

export interface CommentsBottomSheetProps {
  wishId: string;
  isOwner: boolean;
  isOpen: boolean;
  onClose: () => void;
}

interface CommentItemProps {
  comment: WishCommentRow;
  isOwner: boolean;
  onReply: (id: string) => void;
  currentUser: { id: string } | null | undefined;
  api: ApiClient;
}

const CommentItem = ({ comment, isOwner, onReply, currentUser, api }: CommentItemProps) => {
  const { t } = useTranslation('common');
  const { data: profile } = useProfileById(api, comment.author_id);
  const authorName =
    comment.author_id === currentUser?.id
      ? t('comments.you')
      : profile?.username || profile?.first_name || 'User';

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start gap-2 text-sm">
        <div className="font-medium text-foreground">{authorName}</div>
        <div className="flex-1 rounded-lg rounded-tl-none bg-surface p-2 break-words text-foreground">
          {comment.body}
        </div>
      </div>
      <div className="ml-8 flex items-center gap-3 text-xs text-muted">
        <span>{new Date(comment.created_at).toLocaleDateString()}</span>
        {!comment.parent_id && (
          <button
            type="button"
            onClick={() => onReply(comment.id)}
            className="hover:text-foreground"
          >
            {t('comments.reply')}
          </button>
        )}
        {comment.visible_to_owner_thread && !comment.parent_id && !isOwner && (
          <span className="bg-primary/10 text-primary px-1.5 rounded-sm">
            {t('comments.visible_to_author')}
          </span>
        )}
      </div>
    </div>
  );
};

export function CommentsBottomSheet({
  wishId,
  isOwner,
  isOpen,
  onClose,
}: CommentsBottomSheetProps) {
  const { t } = useTranslation('common');
  const api = useApiClient();
  const { data: comments, isLoading } = useWishComments(api, isOpen ? wishId : '');
  const { data: user } = useCurrentUser(api);
  const createComment = useCreateWishComment(api);

  const [body, setBody] = useState('');
  const [showToOwner, setShowToOwner] = useState(false);
  const [replyToId, setReplyToId] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!body.trim()) return;

    if (!isOwner && !replyToId && showToOwner) {
      const confirmed = window.confirm(t('comments.confirm_show_owner'));
      if (!confirmed) return;
    }

    await createComment.mutateAsync({
      wish_id: wishId,
      body: body.trim(),
      parent_id: replyToId,
      visible_to_owner_thread: isOwner ? true : showToOwner,
    });

    setBody('');
    setReplyToId(null);
  };

  const footer = useMemo(
    () => (
      <div className="flex flex-col gap-2 px-2 pt-2">
        {!isOwner && !replyToId && (
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={showToOwner}
              onChange={(e) => setShowToOwner(e.target.checked)}
              className="rounded border-border accent-primary"
            />
            {t('comments.show_to_owner')}
          </label>
        )}
        {replyToId && (
          <div className="flex items-center justify-between text-xs text-muted">
            <span>{t('comments.replying')}</span>
            <button
              type="button"
              onClick={() => setReplyToId(null)}
              className="underline hover:text-foreground"
            >
              {t('actions.cancel')}
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <textarea
            className="max-h-32 min-h-[40px] flex-1 resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            placeholder={t('comments.placeholder')}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={1}
          />
          <Button
            size="iconRound"
            onClick={handleSubmit}
            disabled={!body.trim() || createComment.isPending}
          >
            <Send className="size-4 shrink-0" />
          </Button>
        </div>
      </div>
    ),
    [isOwner, replyToId, showToOwner, body, createComment, handleSubmit, t],
  );

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} footerSlot={footer}>
      <div className="flex flex-col gap-4 p-4">
        {isLoading && <div className="text-center text-sm text-muted">{t('states.loading')}</div>}

        {comments
          ?.filter((c) => !c.parent_id)
          .map((root) => (
            <div key={root.id} className="flex flex-col gap-2">
              <CommentItem
                comment={root}
                isOwner={isOwner}
                onReply={setReplyToId}
                currentUser={user}
                api={api}
              />

              {/* Replies */}
              {comments
                .filter((c) => c.parent_id === root.id)
                .map((reply) => (
                  <div key={reply.id} className="ml-8 mt-1">
                    <CommentItem
                      comment={reply}
                      isOwner={isOwner}
                      onReply={setReplyToId}
                      currentUser={user}
                      api={api}
                    />
                  </div>
                ))}
            </div>
          ))}

        {!isLoading && comments?.length === 0 && (
          <div className="py-8 text-center text-sm text-muted">{t('comments.empty')}</div>
        )}
      </div>
    </BottomSheet>
  );
}
