import { useFollowersList, useFollowingList, useFollowsCounts } from '@wlist/core/hooks/social';
import { clsx } from 'clsx';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'wouter';

import { useApiClient } from '../../providers/ApiClientProvider';
import { BottomSheet } from '../overlays/BottomSheet';

export interface UserFollowsBottomSheetProps {
  userId: string;
  initialTab: 'following' | 'followers';
  isOpen: boolean;
  onClose: () => void;
}

const getInitials = (p: { first_name?: string | null; username?: string | null }) => {
  if (p.first_name) return p.first_name.slice(0, 2).toUpperCase();
  if (p.username) return p.username.slice(0, 2).toUpperCase();
  return '??';
};

interface UserItemProps {
  p: {
    id: string;
    first_name?: string | null;
    username?: string | null;
    telegram_id?: string | number | null;
    photo_url?: string | null;
  };
  onClick: () => void;
}

const UserItem = ({ p, onClick }: UserItemProps) => {
  const [imgError, setImgError] = useState(false);
  const initials = getInitials(p);

  const mainName = p.first_name || (p.username ? `@${p.username}` : `user_${p.telegram_id}`);
  const subName = p.first_name && p.username ? `@${p.username}` : null;

  return (
    <Link
      to={`/u/${p.id}`}
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl border border-border/50 bg-surface px-3 py-2.5 hover:bg-muted/10 active:scale-[0.98] transition-all"
    >
      {p.photo_url && !imgError ? (
        <img
          src={p.photo_url}
          alt=""
          onError={() => setImgError(true)}
          className="size-10 rounded-full object-cover shrink-0"
        />
      ) : (
        <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm shrink-0">
          {initials}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-foreground truncate">{mainName}</div>
        {subName && <div className="text-xs text-muted truncate">{subName}</div>}
      </div>
    </Link>
  );
};

export function UserFollowsBottomSheet({
  userId,
  initialTab,
  isOpen,
  onClose,
}: UserFollowsBottomSheetProps) {
  const { t } = useTranslation('common');
  const api = useApiClient();
  const [activeTab, setActiveTab] = useState<'following' | 'followers'>(initialTab);

  // Sync activeTab with initialTab when the sheet opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const counts = useFollowsCounts(api, userId);
  const following = useFollowingList(api, activeTab === 'following' && isOpen ? userId : undefined);
  const followers = useFollowersList(api, activeTab === 'followers' && isOpen ? userId : undefined);

  const list = activeTab === 'following' ? following : followers;

  const header = (
    <div className="w-full flex flex-col gap-3">
      <div className="flex border-b border-border/50 w-full">
        <button
          type="button"
          className={clsx(
            'flex-1 py-3 text-center text-sm font-semibold border-b-2 transition-all duration-200 outline-none',
            activeTab === 'following'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-foreground',
          )}
          onClick={() => setActiveTab('following')}
        >
          {t('social.follows.following_title')}
          {counts.data ? ` (${counts.data.following})` : ''}
        </button>
        <button
          type="button"
          className={clsx(
            'flex-1 py-3 text-center text-sm font-semibold border-b-2 transition-all duration-200 outline-none',
            activeTab === 'followers'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-foreground',
          )}
          onClick={() => setActiveTab('followers')}
        >
          {t('social.follows.followers_title')}
          {counts.data ? ` (${counts.data.followers})` : ''}
        </button>
      </div>
    </div>
  );

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} headerSlot={header}>
      <div className="flex flex-col gap-3 py-2">
        {list.isLoading ? (
          <div className="py-8 text-center text-sm text-muted">{t('states.loading')}</div>
        ) : list.isError ? (
          <div className="py-8 text-center text-sm text-destructive">{t('states.error')}</div>
        ) : !list.data?.length ? (
          <div className="py-8 text-center text-sm text-muted">{t('social.follows.empty')}</div>
        ) : (
          <ul className="flex flex-col gap-2">
            {list.data.map((p) => (
              <li key={p.id}>
                <UserItem p={p} onClick={onClose} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </BottomSheet>
  );
}
