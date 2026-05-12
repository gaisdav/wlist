/**
 * Validate a Telegram Mini App `initData` payload per the official spec:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * Two checks:
 *
 *   1. `auth_date` is no older than `maxAgeSeconds` (default 24h, the same
 *      window Telegram itself enforces).
 *   2. The `hash` parameter equals
 *      HMAC_SHA256(secret_key, dataCheckString)
 *      where
 *        secret_key       = HMAC_SHA256("WebAppData", botToken)
 *        dataCheckString  = sorted_keys.map(k => `${k}=${value}`).join('\n')
 *
 * The function is **pure** and uses only Web Crypto (`globalThis.crypto`),
 * so it runs identically in Deno (Edge Function) and Node 22+ (Vitest tests).
 *
 * It deliberately does NOT parse `initData.user` — that's a separate
 * concern, see `extractTelegramUser.ts`. This split keeps the security check
 * narrow and easy to audit.
 */

export type VerifyInitDataResult =
  | { ok: true; params: ReadonlyMap<string, string>; authDateSeconds: number }
  | { ok: false; reason: 'invalid_signature' | 'expired' | 'malformed' };

export interface VerifyInitDataOptions {
  /** Maximum acceptable age of `auth_date`, seconds. Default 24h. */
  maxAgeSeconds?: number;
  /** Injectable clock for tests. Returns Unix seconds. Default Date.now/1000. */
  now?: () => number;
}

const DEFAULT_MAX_AGE_SECONDS = 24 * 60 * 60;

export const verifyInitData = async (
  initData: string,
  botToken: string,
  options: VerifyInitDataOptions = {},
): Promise<VerifyInitDataResult> => {
  const maxAgeSeconds = options.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS;
  const now = options.now ?? (() => Math.floor(Date.now() / 1000));

  // --- parse ---------------------------------------------------------------
  let parsed: URLSearchParams;
  try {
    parsed = new URLSearchParams(initData);
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  const providedHash = parsed.get('hash');
  const authDateRaw = parsed.get('auth_date');
  if (!providedHash || !authDateRaw) {
    return { ok: false, reason: 'malformed' };
  }

  const authDateSeconds = Number.parseInt(authDateRaw, 10);
  if (!Number.isFinite(authDateSeconds) || authDateSeconds <= 0) {
    return { ok: false, reason: 'malformed' };
  }

  // --- TTL -----------------------------------------------------------------
  if (now() - authDateSeconds > maxAgeSeconds) {
    return { ok: false, reason: 'expired' };
  }

  // --- signature -----------------------------------------------------------
  // Build the data-check string. Spec: every parameter EXCEPT `hash`,
  // sorted lexicographically by key, joined by `\n`, no trailing newline.
  const checkPairs: string[] = [];
  for (const [key, value] of parsed.entries()) {
    if (key === 'hash') continue;
    checkPairs.push(`${key}=${value}`);
  }
  checkPairs.sort();
  const dataCheckString = checkPairs.join('\n');

  const secretKey = await hmacSha256(stringToBytes('WebAppData'), stringToBytes(botToken));
  const expectedHash = await hmacSha256(secretKey, stringToBytes(dataCheckString));
  const expectedHashHex = bytesToHex(expectedHash);

  if (!constantTimeEqual(expectedHashHex, providedHash.toLowerCase())) {
    return { ok: false, reason: 'invalid_signature' };
  }

  return { ok: true, params: new Map(parsed.entries()), authDateSeconds };
};

// =============================================================================
// crypto helpers — Web Crypto only, runs in Deno + Node 22 unchanged
// =============================================================================

const stringToBytes = (s: string): Uint8Array => new TextEncoder().encode(s);

const hmacSha256 = async (key: Uint8Array, data: Uint8Array): Promise<Uint8Array> => {
  // Web Crypto types differ slightly between lib.dom (browser) and Node 22:
  // both runtimes accept Uint8Array at runtime, the dual cast keeps the call
  // site type-safe under Vitest (Node) and Deno alike.
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key as unknown as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, data as unknown as ArrayBuffer);
  return new Uint8Array(sig);
};

const bytesToHex = (bytes: Uint8Array): string => {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += (bytes[i] ?? 0).toString(16).padStart(2, '0');
  }
  return out;
};

/**
 * Constant-time string compare. Both inputs MUST be the same character set
 * and roughly the same length. We don't early-exit on length mismatch alone
 * because the byte-by-byte loop already runs in O(min(a, b)).
 */
const constantTimeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
};
