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

const getInitials = (p?: { first_name?: string | null; username?: string | null } | null) => {
  if (p?.first_name) return p.first_name.slice(0, 2).toUpperCase();
  if (p?.username) return p.username.slice(0, 2).toUpperCase();
  return '??';
};

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
  const [imgError, setImgError] = useState(false);

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

  const initials = getInitials(profile);

  return (
    <div className="flex gap-3 items-start">
      {/* Avatar Column */}
      <div className="shrink-0 pt-0.5">
        {profile?.photo_url && !imgError ? (
          <img
            src={profile.photo_url}
            alt=""
            onError={() => setImgError(true)}
            className="size-8 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0">
            {initials}
          </div>
        )}
      </div>

      {/* Content Column */}
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-semibold text-foreground truncate">{authorName}</span>
          <div className="flex items-center gap-1.5 text-[10px] text-muted shrink-0">
            <span>
              {formatRelativeTime(comment.created_at, {
                locale: i18n.language,
                fallbackFormat: 'dayMonthYear',
              })}
            </span>
            {comment.updated_at !== comment.created_at && (
              <span className="bg-muted/10 px-1 rounded-sm text-[9px] lowercase">
                {t('states.edited')}
              </span>
            )}
          </div>
        </div>

        <div className="text-sm rounded-xl rounded-tl-none bg-surface p-2.5 break-words text-foreground shadow-sm border border-border/10">
          {comment.body}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted/80 mt-0.5">
          {!comment.parent_id && (
            <button
              type="button"
              onClick={() => onReply(comment.id)}
              className="hover:text-foreground font-medium transition-colors"
            >
              {t('comments.reply')}
            </button>
          )}
          {comment.author_id === currentUser?.id && (
            <>
              <button
                type="button"
                onClick={() => onEdit(comment)}
                className="hover:text-foreground font-medium transition-colors"
              >
                {t('actions.edit')}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="text-destructive/80 hover:text-destructive font-medium transition-colors"
                disabled={deleteComment.isPending}
              >
                {t('actions.delete')}
              </button>
            </>
          )}

          {comment.visible_to_owner_thread && !comment.parent_id && !isOwner && (
            <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wide uppercase shrink-0">
              {t('comments.visible_to_author')}
            </span>
          )}
        </div>
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
      <div className="flex flex-col gap-4 p-2 px-1">
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
