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
import { Link } from 'wouter';

import { useApiClient } from '../../providers/ApiClientProvider';
import { confirm } from '../../telegram/confirm';
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
  onClose: () => void;
}

const CommentItem = ({
  comment,
  isOwner,
  onReply,
  onEdit,
  currentUser,
  api,
  onClose,
}: CommentItemProps) => {
  const { t, i18n } = useTranslation('common');
  const { data: profile } = useProfileById(api, comment.author_id);
  const [imgError, setImgError] = useState(false);

  const deleteComment = useDeleteWishComment(api);

  const authorName =
    comment.author_id === currentUser?.id
      ? t('comments.you')
      : profile?.username || profile?.first_name || 'User';

  const handleDelete = async () => {
    const confirmed = await confirm({
      message: t('comments.delete_confirm'),
      confirmLabel: t('actions.delete'),
      destructive: true,
    });
    if (!confirmed) return;
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
    <div className="flex flex-col gap-1 w-full">
      {/* Top line: Author & Time */}
      <div className="flex items-baseline justify-between gap-3 text-xs text-muted pl-10">
        <Link
          to={`/u/${comment.author_id}`}
          onClick={onClose}
          className="text-sm font-semibold text-foreground truncate flex-1 hover:text-primary transition-colors"
        >
          {authorName}
        </Link>
        <div className="flex items-center gap-1.5 text-[10px] shrink-0">
          <span>
            {formatRelativeTime(comment.created_at, {
              locale: i18n.language,
              fallbackFormat: 'short',
            })}
          </span>
          {comment.updated_at !== comment.created_at && (
            <span className="bg-muted/10 px-1 rounded-sm text-[9px] lowercase">
              {t('states.edited')}
            </span>
          )}
        </div>
      </div>

      {/* Middle line: Avatar + Comment Bubble */}
      <div className="flex gap-2 items-start">
        {/* Avatar Column */}
        <Link
          to={`/u/${comment.author_id}`}
          onClick={onClose}
          className="shrink-0 pt-0.5 hover:opacity-80 transition-opacity block"
        >
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
        </Link>

        {/* Comment Bubble */}
        <div className="flex-1 text-sm rounded-xl rounded-tl-none bg-surface p-2.5 break-words text-foreground shadow-sm border border-border/10">
          {comment.body}
        </div>
      </div>

      {/* Bottom line: Actions */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted/80 pl-10 mt-0.5">
        {!comment.parent_id && (
          <button
            type="button"
            onClick={() => onReply(comment.id)}
            className="py-2 -my-2 hover:text-foreground font-medium transition-colors"
          >
            {t('comments.reply')}
          </button>
        )}
        {comment.author_id === currentUser?.id && (
          <>
            <button
              type="button"
              onClick={() => onEdit(comment)}
              className="py-2 -my-2 hover:text-foreground font-medium transition-colors"
            >
              {t('actions.edit')}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="py-2 -my-2 text-destructive/80 hover:text-destructive font-medium transition-colors"
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

  const handleCancel = () => {
    setEditingComment(null);
    setReplyToId(null);
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

  const handleClose = () => {
    setBody('');
    setReplyToId(null);
    setEditingComment(null);
    onClose();
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
      const confirmed = await confirm({
        message: t('comments.confirm_show_owner'),
        confirmLabel: t('comments.show_to_owner'),
      });
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
        {(replyToId || editingComment) && (
          <div className="flex items-center justify-between text-xs text-muted">
            {replyToId ? <span>{t('comments.replying')}</span> : <span>{t('actions.edit')}</span>}
            <button
              type="button"
              onClick={handleCancel}
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
            maxLength={2000}
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
    <BottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      closeLabel={t('actions.close')}
      footerSlot={footer}
    >
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
                onClose={handleClose}
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
                      onClose={handleClose}
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
