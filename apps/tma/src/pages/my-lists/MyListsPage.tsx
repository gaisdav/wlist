import { useCurrentUser } from '@wlist/core/hooks/auth';
import {
  useAddListMember,
  useCreateList,
  useDeleteList,
  useListMembers,
  useRemoveListMember,
  useUserLists,
} from '@wlist/core/hooks/lists';
import { useFollowersList, useFollowingList } from '@wlist/core/hooks/social';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '../../components/primitives/button';
import { PageLoadingPlaceholder, Skeleton } from '../../components/primitives/skeleton';
import { useQueryErrorToast } from '../../hooks/useQueryErrorToast';
import { useApiClient } from '../../providers/ApiClientProvider';
import { useTelegramBackButton } from '../../telegram/useTelegramBackButton';

const displayName = (p: { username: string | null; first_name: string }): string =>
  p.username ? `@${p.username}` : p.first_name;

/** Members panel for one list: shows current members + candidates from follows. */
const ListMembers = ({
  listId,
  viewerId,
}: {
  listId: string;
  viewerId: string;
}): React.JSX.Element => {
  const { t } = useTranslation('common');
  const api = useApiClient();
  const members = useListMembers(api, listId);
  const following = useFollowingList(api, viewerId);
  const followers = useFollowersList(api, viewerId);
  const addMut = useAddListMember(api);
  const removeMut = useRemoveListMember(api);

  const memberIds = new Set((members.data ?? []).map((m) => m.id));

  // Candidates = following ∪ followers, de-duped, excluding current members and self.
  const candidateMap = new Map<
    string,
    { id: string; username: string | null; first_name: string }
  >();
  for (const p of [...(following.data ?? []), ...(followers.data ?? [])]) {
    if (p.id !== viewerId && !memberIds.has(p.id)) candidateMap.set(p.id, p);
  }
  const candidates = [...candidateMap.values()];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          {t('lists.members_title')}
        </span>
        {members.isLoading ? (
          <Skeleton className="h-6 rounded" />
        ) : members.data && members.data.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {members.data.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2">
                <span className="truncate text-sm text-foreground">{displayName(m)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  intent="danger"
                  size="sm"
                  isLoading={removeMut.isPending}
                  onClick={() => removeMut.mutate({ listId, memberId: m.id })}
                >
                  {t('lists.remove_member')}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-sm text-muted">{t('lists.members_empty')}</span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          {t('lists.add_members')}
        </span>
        {candidates.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {candidates.map((p) => (
              <Button
                key={p.id}
                type="button"
                variant="outline"
                size="sm"
                disabled={addMut.isPending}
                onClick={() => addMut.mutate({ listId, memberId: p.id })}
              >
                + {displayName(p)}
              </Button>
            ))}
          </div>
        ) : (
          <span className="text-sm text-muted">{t('lists.no_candidates')}</span>
        )}
      </div>
    </div>
  );
};

export const MyListsPage = (): React.JSX.Element => {
  const { t } = useTranslation('common');
  const api = useApiClient();
  const profile = useCurrentUser(api);
  const viewerId = profile.data?.id;
  const lists = useUserLists(api);
  const createMut = useCreateList(api);
  const deleteMut = useDeleteList(api);

  const [newName, setNewName] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useTelegramBackButton(() => window.history.back(), true);
  useQueryErrorToast(lists.isError && !lists.isLoading, t('states.error'));

  const onCreate = (): void => {
    const name = newName.trim();
    if (!name) return;
    createMut.mutate(name, { onSuccess: () => setNewName('') });
  };

  const onDelete = (id: string): void => {
    if (!window.confirm(t('lists.delete_confirm'))) return;
    deleteMut.mutate(id);
    setExpandedId((cur) => (cur === id ? null : cur));
  };

  if (lists.isLoading || profile.isLoading) {
    return (
      <PageLoadingPlaceholder>
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </PageLoadingPlaceholder>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="flex flex-col gap-1 border-b border-border pb-3">
        <h1 className="text-xl font-semibold text-foreground">{t('lists.title')}</h1>
        <p className="text-sm text-muted">{t('lists.subtitle')}</p>
      </header>

      <div className="flex items-end gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium text-foreground">{t('lists.name_label')}</span>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('lists.create_placeholder')}
            maxLength={100}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <Button
          type="button"
          size="md"
          isLoading={createMut.isPending}
          disabled={newName.trim() === ''}
          onClick={onCreate}
        >
          {t('lists.create')}
        </Button>
      </div>

      {!lists.data?.length ? (
        <p className="text-sm text-muted">{t('lists.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {lists.data.map((list) => {
            const isExpanded = expandedId === list.id;
            return (
              <li key={list.id} className="rounded-lg border border-border bg-surface">
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left text-sm font-medium text-foreground"
                    aria-expanded={isExpanded}
                    onClick={() => setExpandedId((cur) => (cur === list.id ? null : list.id))}
                  >
                    {list.name}
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    intent="danger"
                    size="iconRound"
                    aria-label={t('lists.delete')}
                    isLoading={deleteMut.isPending && deleteMut.variables === list.id}
                    onClick={() => onDelete(list.id)}
                  >
                    <Trash2 className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                  </Button>
                </div>
                {isExpanded && viewerId ? (
                  <div className="border-t border-border px-3 py-3">
                    <ListMembers listId={list.id} viewerId={viewerId} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
