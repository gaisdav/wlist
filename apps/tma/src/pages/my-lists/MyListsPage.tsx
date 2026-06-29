import { getDisplayName } from '@wlist/core/entities/profile';
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
import { FolderPlus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '../../components/primitives/button';
import { EmptyState } from '../../components/primitives/empty-state';
import { FormField } from '../../components/primitives/form-field';
import { PageLoadingPlaceholder, Skeleton } from '../../components/primitives/skeleton';
import { TextInput } from '../../components/primitives/text-field';
import { useQueryErrorToast } from '../../hooks/useQueryErrorToast';
import { useApiClient } from '../../providers/ApiClientProvider';
import { confirm } from '../../telegram/confirm';
import { hapticMutationOptions } from '../../telegram/hapticMutation';
import { useTelegramBackButton } from '../../telegram/useTelegramBackButton';
import { useTelegramMainButton } from '../../telegram/useTelegramMainButton';

interface PersonLike {
  id: string;
  username: string | null;
  first_name: string;
  telegram_id: number;
}

/** Initials circle standing in for an avatar — keeps member rows scannable. */
const PersonAvatar = ({ person }: { person: PersonLike }): React.JSX.Element => {
  const initial = (person.first_name || person.username || '?').trim().charAt(0).toUpperCase();
  return (
    <span
      aria-hidden
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
    >
      {initial || '?'}
    </span>
  );
};

/** One person row: avatar + name (+ @username) + a trailing add/remove action. */
const PersonRow = ({
  person,
  action,
}: {
  person: PersonLike;
  action: React.ReactNode;
}): React.JSX.Element => (
  <li className="flex items-center gap-2">
    <PersonAvatar person={person} />
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="truncate text-sm font-medium text-foreground">{getDisplayName(person)}</span>
      {person.username ? (
        <span className="truncate text-xs text-muted">@{person.username}</span>
      ) : null}
    </span>
    {action}
  </li>
);

/** Members panel for one list: shows current members + searchable candidates. */
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

  const [query, setQuery] = useState('');

  // Candidates = following ∪ followers, de-duped, excluding current members and self.
  const candidates = useMemo(() => {
    const memberIds = new Set((members.data ?? []).map((m) => m.id));
    const map = new Map<string, PersonLike>();
    for (const p of [...(following.data ?? []), ...(followers.data ?? [])]) {
      if (p.id !== viewerId && !memberIds.has(p.id)) map.set(p.id, p);
    }
    return [...map.values()];
  }, [members.data, following.data, followers.data, viewerId]);

  // Client-side filter — candidates are a bounded local set (follows), so no
  // server search is needed (and the candidate rule stays intact).
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter(
      (p) => p.first_name.toLowerCase().includes(q) || (p.username ?? '').toLowerCase().includes(q),
    );
  }, [candidates, query]);

  const isLoadingCandidates = members.isLoading || following.isLoading || followers.isLoading;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          {t('lists.members_title')}
        </span>
        {members.isLoading ? (
          <Skeleton className="h-8 rounded" />
        ) : members.data && members.data.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {members.data.map((m) => {
              const pending = removeMut.isPending && removeMut.variables?.memberId === m.id;
              return (
                <PersonRow
                  key={m.id}
                  person={m}
                  action={
                    <Button
                      type="button"
                      variant="ghost"
                      intent="danger"
                      size="sm"
                      isLoading={pending}
                      disabled={pending}
                      onClick={() =>
                        removeMut.mutate({ listId, memberId: m.id }, hapticMutationOptions())
                      }
                    >
                      {t('lists.remove_member')}
                    </Button>
                  }
                />
              );
            })}
          </ul>
        ) : (
          <span className="text-sm text-muted">{t('lists.members_empty')}</span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          {t('lists.add_members')}
        </span>
        <span className="text-xs text-muted">{t('lists.add_members_hint')}</span>
        {isLoadingCandidates ? (
          <Skeleton className="h-8 rounded" />
        ) : candidates.length > 0 ? (
          <>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                strokeWidth={2}
                aria-hidden
              />
              <TextInput
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('lists.members_search_placeholder')}
                aria-label={t('lists.members_search_placeholder')}
                className="pl-9"
              />
            </div>
            {filtered.length > 0 ? (
              <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
                {filtered.map((p) => {
                  const pending = addMut.isPending && addMut.variables?.memberId === p.id;
                  return (
                    <PersonRow
                      key={p.id}
                      person={p}
                      action={
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          isLoading={pending}
                          disabled={pending}
                          onClick={() =>
                            addMut.mutate({ listId, memberId: p.id }, hapticMutationOptions())
                          }
                        >
                          {t('lists.add_member')}
                        </Button>
                      }
                    />
                  );
                })}
              </ul>
            ) : (
              <span className="text-sm text-muted">{t('lists.members_no_matches')}</span>
            )}
          </>
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

  const canCreate = newName.trim() !== '';

  const onCreate = (): void => {
    const name = newName.trim();
    if (!name) return;
    createMut.mutate(name, hapticMutationOptions({ onSuccess: () => setNewName('') }));
  };

  // "New list" rides Telegram's native MainButton — the platform's primary CTA,
  // matching the wish/event forms. The in-page button stays as the browser/dev
  // fallback and is hidden when the native button is active.
  const mainButtonActive = useTelegramMainButton({
    text: t('lists.create'),
    onClick: onCreate,
    isEnabled: canCreate && !createMut.isPending,
    isLoaderVisible: createMut.isPending,
  });

  const onDelete = async (id: string): Promise<void> => {
    const confirmed = await confirm({
      message: t('lists.delete_confirm'),
      confirmLabel: t('actions.delete'),
      destructive: true,
    });
    if (!confirmed) return;
    deleteMut.mutate(id, hapticMutationOptions());
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
        <FormField label={t('lists.name_label')} className="flex-1">
          <TextInput
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('lists.create_placeholder')}
            maxLength={100}
          />
        </FormField>
        {!mainButtonActive ? (
          <Button
            type="button"
            size="md"
            isLoading={createMut.isPending}
            disabled={!canCreate}
            onClick={onCreate}
          >
            {t('lists.create')}
          </Button>
        ) : null}
      </div>

      {!lists.data?.length ? (
        <EmptyState icon={FolderPlus} title={t('lists.empty')} />
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
                    onClick={() => void onDelete(list.id)}
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
