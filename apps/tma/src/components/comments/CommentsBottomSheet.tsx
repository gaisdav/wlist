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
import { Send, X } from 'lucide-react';
import { useMemo, useState, useRef } from 'react';
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
  onEdit: (comment: WishCommentRow) => void;
  currentUser: { id: string } | null | undefined;
  api: ApiClient;
}

const CommentItem = ({ comment, isOwner, onReply, onEdit, currentUser, api }: CommentItemProps) => {
  const { t, i18n } = useTranslation('common');
  const { data: profile } = useProfileById(api, comment.author_id);

  const deleteComment = useDeleteWishComment(api);

  const authorName =
    comment.author_id === currentUser?.id
      ? t('comments.you')
      : profile?.username || profile?.first_name || 'User';

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
        <div className="flex-1 rounded-lg rounded-tl-none bg-surface p-2 break-words text-foreground">
          {comment.body}
        </div>
      </div>
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
            <button type="button" onClick={() => onEdit(comment)} className="hover:text-foreground">
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
        {comment.updated_at !== comment.created_at && <span>{t('states.edited')}</span>}
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
  const updateComment = useUpdateWishComment(api);

  const [body, setBody] = useState('');
  const [showToOwner, setShowToOwner] = useState(false);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<WishCommentRow | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleEdit = (comment: WishCommentRow) => {
    setEditingComment(comment);
    setBody(comment.body);
    setReplyToId(null);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleCancelEdit = () => {
    setEditingComment(null);
    setBody('');
  };

  const handleReply = (id: string) => {
    setReplyToId(id);
    setEditingComment(null);
    setBody('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleSubmit = async () => {
    if (!body.trim()) return;

    if (editingComment) {
      try {
        await updateComment.mutateAsync({
          id: editingComment.id,
          body: body.trim(),
        });
        setBody('');
        setEditingComment(null);
      } catch (e) {
        console.error('Failed to update comment', e);
      }
      return;
    }

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
        {!isOwner && !replyToId && !editingComment && (
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
        {editingComment && (
          <div className="flex items-center justify-between text-xs text-muted">
            <span>{t('actions.edit')}</span>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="underline hover:text-foreground"
            >
              {t('actions.cancel')}
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            placeholder={t('comments.placeholder')}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          {editingComment && (
            <Button size="iconRound" variant="ghost" intent="danger" onClick={handleCancelEdit}>
              <X className="size-4 shrink-0" />
            </Button>
          )}
          <Button
            size="iconRound"
            onClick={handleSubmit}
            disabled={!body.trim() || createComment.isPending || updateComment.isPending}
          >
            <Send className="size-4 shrink-0" />
          </Button>
        </div>
      </div>
    ),
    [
      isOwner,
      replyToId,
      editingComment,
      showToOwner,
      body,
      createComment.isPending,
      updateComment.isPending,
      handleSubmit,
      t,
    ],
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
                onReply={handleReply}
                onEdit={handleEdit}
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
                      onReply={handleReply}
                      onEdit={handleEdit}
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
