import { publicProfilesRowSchema } from '@wlist/api/generated/database.zod';
import { z } from 'zod';

/**
 * Validated `public.profiles` row — snake_case, aligned with
 * `Database['public']['Tables']['profiles']['Row']`, with a stricter
 * `photo_url` than the raw generated row schema.
 *
 * If a column is added in a migration and `pnpm db:codegen` runs, TypeScript
 * and this schema stay in sync with the DB shape.
 */
export const profileSchema = publicProfilesRowSchema.extend({
  photo_url: z.url().nullable(),
});

export type Profile = z.infer<typeof profileSchema>;

/**
 * Best-effort display name. Telegram allows `username` to be empty (Telegram
 * Premium isn't required, and many users disable it for privacy), so we fall
 * back to `first_name` (always present per Telegram API) and finally to a
 * stable Telegram-id slug.
 *
 * Pure function — kept here next to the entity so every screen renders the
 * same string for the same user. No i18n concerns: the result is identifier-
 * like (`@username` / `Имя` / `user_42`), not a sentence to translate.
 */
export const getDisplayName = (
  profile: Pick<Profile, 'username' | 'first_name' | 'telegram_id'>,
): string => {
  if (profile.username && profile.username.length > 0) {
    return `@${profile.username}`;
  }
  if (profile.first_name && profile.first_name.length > 0) {
    return profile.first_name;
  }
  return `user_${profile.telegram_id}`;
};
