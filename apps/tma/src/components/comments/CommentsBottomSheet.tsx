import type { ApiClient, WishCommentRow } from '@wlist/api';
import { useCurrentUser } from '@wlist/core/hooks/auth';
import {
  useWishComments,
  useCreateWishComment,
  useUpdateWishComment,
  useDeleteWishComment,
} from '@wlist/core/hooks/comments';
import { useProfileById } from '@wlist/core/hooks/social';
import { formatRelativeTime } from '@wlist/core/lib';
import { Send } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
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
  const { t, i18n } = useTranslation('common');
  const { data: profile } = useProfileById(api, comment.author_id);

  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);

  const updateComment = useUpdateWishComment(api);
  const deleteComment = useDeleteWishComment(api);

  useEffect(() => {
    setEditBody(comment.body);
  }, [comment.body]);

  const authorName =
    comment.author_id === currentUser?.id
      ? t('comments.you')
      : profile?.username || profile?.first_name || 'User';

  const handleSave = async () => {
    if (!editBody.trim()) return;
    try {
      await updateComment.mutateAsync({
        id: comment.id,
        body: editBody.trim(),
      });
      setIsEditing(false);
    } catch (e) {
      console.error('Failed to update comment', e);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('comments.delete_confirm'))) return;
    try {
      await deleteComment.mutateAsync({
        id: comment.id,
        wishId: comment.wish_id,
      });
    } catch (e) {
      console.error('Failed to delete comment', e);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start gap-2 text-sm">
        <div className="font-medium text-foreground">{authorName}</div>
        {isEditing ? (
          <div className="flex-1 flex flex-col gap-1.5">
            <input
              type="text"
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground focus:border-primary focus:outline-none"
              autoFocus
            />
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={handleSave}
                disabled={updateComment.isPending || !editBody.trim()}
                className="text-primary hover:underline font-medium"
              >
                {t('actions.save')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setEditBody(comment.body);
                }}
                className="text-muted hover:underline"
              >
                {t('actions.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 rounded-lg rounded-tl-none bg-surface p-2 break-words text-foreground">
            {comment.body}
          </div>
        )}
      </div>
      {!isEditing && (
        <div className="ml-8 flex items-center gap-3 text-xs text-muted">
          <span>
            {formatRelativeTime(comment.created_at, {
              locale: i18n.language,
              fallbackFormat: 'dayMonthYear',
            })}
          </span>
          {!comment.parent_id && (
            <button
              type="button"
              onClick={() => onReply(comment.id)}
              className="hover:text-foreground"
            >
              {t('comments.reply')}
            </button>
          )}
          {comment.author_id === currentUser?.id && (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditBody(comment.body);
                  setIsEditing(true);
                }}
                className="hover:text-foreground"
              >
                {t('actions.edit')}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="text-destructive/80 hover:text-destructive"
                disabled={deleteComment.isPending}
              >
                {t('actions.delete')}
              </button>
            </>
          )}
          {comment.visible_to_owner_thread && !comment.parent_id && !isOwner && (
            <span className="bg-primary/10 text-primary px-1.5 rounded-sm">
              {t('comments.visible_to_author')}
            </span>
          )}
        </div>
      )}
      {isEditing && (
        <div className="ml-8 flex items-center gap-3 text-xs text-muted">
          <span>
            {formatRelativeTime(comment.created_at, {
              locale: i18n.language,
              fallbackFormat: 'dayMonthYear',
            })}
          </span>
        </div>
      )}
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
          <input
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            placeholder={t('comments.placeholder')}
            value={body}
            onChange={(e) => setBody(e.target.value)}
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
      <div className="flex flex-col gap-4 p-2">
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
