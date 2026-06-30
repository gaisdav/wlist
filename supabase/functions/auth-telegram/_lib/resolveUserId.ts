/**
 * Resolve the canonical `auth.users.id` for a Telegram user during login.
 *
 * Identity is keyed on `telegram_id`, never on the synthetic GoTrue email.
 * The resolution order is, by design, the only one that stays correct as the
 * user table grows:
 *
 *   1. Create the auth user. If it's new, its id comes straight back — done.
 *   2. If it already exists, read the id from our own `profiles` table by
 *      `telegram_id` (UNIQUE, PK == auth.users.id). One indexed SELECT.
 *
 * The port interface below is the minimal slice of the admin client this
 * needs, so the logic is unit-testable without supabase-js or Deno.
 */

export interface ResolveUserIdPort {
  createUser(params: {
    email: string;
    telegramId: number;
  }): Promise<
    { ok: true; id: string } | { ok: true; alreadyExists: true } | { ok: false; error: unknown }
  >;
  /** Returns the profile id for a telegram_id, or null if no profile row. */
  findProfileIdByTelegramId(
    telegramId: number,
  ): Promise<{ ok: true; id: string | null } | { ok: false; error: unknown }>;
}

export type ResolveUserIdResult =
  | { ok: true; userId: string; isNewUser: boolean }
  | { ok: false; reason: 'create_failed' | 'profile_lookup_failed' | 'not_found' };

export async function resolveUserId(
  port: ResolveUserIdPort,
  email: string,
  telegramId: number,
): Promise<ResolveUserIdResult> {
  const created = await port.createUser({ email, telegramId });

  if (!created.ok) {
    return { ok: false, reason: 'create_failed' };
  }

  if ('id' in created) {
    return { ok: true, userId: created.id, isNewUser: true };
  }

  // Existing user: resolve from our own profiles table.
  const profile = await port.findProfileIdByTelegramId(telegramId);
  if (!profile.ok) {
    return { ok: false, reason: 'profile_lookup_failed' };
  }
  if (!profile.id) {
    return { ok: false, reason: 'not_found' };
  }
  return { ok: true, userId: profile.id, isNewUser: false };
}
