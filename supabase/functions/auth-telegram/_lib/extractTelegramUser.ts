/**
 * Telegram user payload as it arrives inside `initData.user` (URL-encoded JSON).
 *
 * Not every field is always present — Telegram has gradually been adding new
 * ones (`is_premium`, `language_code`, `allows_write_to_pm` …). We accept a
 * superset and only require the bare minimum (`id`, `first_name`).
 */
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export type ExtractTelegramUserResult =
  | { ok: true; user: TelegramUser }
  | { ok: false; reason: 'missing_user_field' | 'malformed_user_json' | 'invalid_user_shape' };

/**
 * Pull and parse the `user` field out of an already-validated initData
 * payload. Caller MUST verify the HMAC first (see `verifyInitData.ts`); this
 * function only deals with shape, never with trust.
 *
 * Pure — keeps tests deterministic and runs in Node + Deno.
 */
export const extractTelegramUser = (
  params: ReadonlyMap<string, string>,
): ExtractTelegramUserResult => {
  const raw = params.get('user');
  if (!raw) {
    return { ok: false, reason: 'missing_user_field' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'malformed_user_json' };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, reason: 'invalid_user_shape' };
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.id !== 'number' || !Number.isFinite(obj.id) || obj.id <= 0) {
    return { ok: false, reason: 'invalid_user_shape' };
  }
  if (typeof obj.first_name !== 'string' || obj.first_name.length === 0) {
    return { ok: false, reason: 'invalid_user_shape' };
  }

  const user: TelegramUser = {
    id: obj.id,
    first_name: obj.first_name,
  };

  if (typeof obj.last_name === 'string' && obj.last_name.length > 0) {
    user.last_name = obj.last_name;
  }
  if (typeof obj.username === 'string' && obj.username.length > 0) {
    user.username = obj.username;
  }
  if (typeof obj.language_code === 'string') {
    user.language_code = obj.language_code;
  }
  if (typeof obj.is_premium === 'boolean') {
    user.is_premium = obj.is_premium;
  }
  if (typeof obj.photo_url === 'string' && obj.photo_url.length > 0) {
    user.photo_url = obj.photo_url;
  }

  return { ok: true, user };
};

/**
 * SHA-256 hex of the raw initData query string. Used as primary key in the
 * anti-replay table — same input → same hash → DB conflict on the second
 * attempt.
 *
 * Hex (not base64) so it's grep-friendly during incident response and small
 * enough to index without surprises. 32 bytes → 64 hex chars.
 */
export const sha256Hex = async (input: string): Promise<string> => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  const bytes = new Uint8Array(buf);
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += (bytes[i] ?? 0).toString(16).padStart(2, '0');
  }
  return out;
};
