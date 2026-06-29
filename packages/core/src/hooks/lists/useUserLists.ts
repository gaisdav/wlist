import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { ApiClient, ProfileRow, UserListRow } from '@wlist/api';

import { queryKeys } from '../../config/index.js';

/** The signed-in user's contact lists (for the visibility selector & "My lists"). */
export const useUserLists = (api: ApiClient): UseQueryResult<UserListRow[]> =>
  useQuery({
    queryKey: queryKeys.lists.mine(),
    queryFn: () => api.lists.listMine(),
  });

/** Members of a single list. */
export const useListMembers = (
  api: ApiClient,
  listId: string | undefined,
): UseQueryResult<ProfileRow[]> =>
  useQuery({
    queryKey: listId
      ? queryKeys.lists.members(listId)
      : [...queryKeys.lists.all(), 'members', 'pending'],
    queryFn: () => api.lists.listMembers(listId as string),
    enabled: Boolean(listId),
  });
