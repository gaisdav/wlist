import type { Database } from '../../generated/database.types.js';
import type { ProfileRow } from '../profiles/types.js';

type UserListsRow = Database['public']['Tables']['user_lists']['Row'];

export type UserListRow = UserListsRow;

/** A contact list (e.g. "Family") used by `wishes.visibility = 'lists'`. */
export interface ListsApi {
  listMine(): Promise<UserListRow[]>;
  create(name: string): Promise<UserListRow>;
  rename(input: { id: string; name: string }): Promise<UserListRow>;
  delete(id: string): Promise<void>;
  listMembers(listId: string): Promise<ProfileRow[]>;
  addMember(input: { listId: string; memberId: string }): Promise<void>;
  removeMember(input: { listId: string; memberId: string }): Promise<void>;
}
