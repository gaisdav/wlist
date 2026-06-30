export interface ProfileRow {
  id: string;
  telegram_id: number;
  username: string | null;
  first_name: string;
  last_name: string | null;
  photo_url: string | null;
  language_code: string | null;
  is_premium: boolean;
  created_at: string;
  updated_at: string;
}

export interface ListUsersParams {
  /** Filter by username / first_name (ilike). Ignored when shorter than 2 chars. */
  query?: string;
  limit: number;
  offset: number;
}

export interface ProfilesApi {
  getCurrent(): Promise<ProfileRow | null>;
  getById(id: string): Promise<ProfileRow | null>;
  /**
   * One page of profiles, newest first. With a query, filters by
   * username/first_name; without one, returns the most recently joined users.
   */
  listUsers(params: ListUsersParams): Promise<ProfileRow[]>;
}
