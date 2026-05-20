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

export interface ProfilesApi {
  getCurrent(): Promise<ProfileRow | null>;
  getById(id: string): Promise<ProfileRow | null>;
  searchUsers(query: string): Promise<ProfileRow[]>;
}
