import { publicProfilesRowSchema } from '@wlist/api/generated/database.zod';
import { z } from 'zod';

/**
 * Domain Profile.
 *
 * Source of truth: `public.profiles` row, exposed via the auto-generated
 * `publicProfilesRowSchema` (snake_case). We layer a `.transform()` on top
 * to map to camelCase + tighten a couple of types (URL string, Date) so the
 * rest of the app never sees snake_case.
 *
 * If a column is added to the DB but not threaded through this transform,
 * `pnpm typecheck` fails — that's the contract documented in
 * docs/architecture.md §4.5.
 */
export const profileSchema = publicProfilesRowSchema
  .extend({
    photo_url: z.url().nullable(),
  })
  .transform((row) => ({
    id: row.id,
    telegramId: row.telegram_id,
    username: row.username,
    firstName: row.first_name,
    lastName: row.last_name,
    photoUrl: row.photo_url,
    languageCode: row.language_code,
    isPremium: row.is_premium,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }));

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
  profile: Pick<Profile, 'username' | 'firstName' | 'telegramId'>,
): string => {
  if (profile.username && profile.username.length > 0) {
    return `@${profile.username}`;
  }
  if (profile.firstName && profile.firstName.length > 0) {
    return profile.firstName;
  }
  return `user_${profile.telegramId}`;
};
