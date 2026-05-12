/**
 * Unit tests for the HMAC verifier. Tier A — security-critical pure logic
 * (docs/architecture.md §16). Run in Vitest under Node 22 (uses the same
 * Web Crypto API as Deno).
 */
import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { verifyInitData } from './verifyInitData';

const BOT_TOKEN = '123456:test-secret-do-not-leak';
const FIXED_NOW_SECONDS = 1_736_000_000; // 2025-01-04T13:13:20Z

/**
 * Build a valid initData string the same way Telegram does, so the verifier
 * has something it'll accept. Mirrors the official spec verbatim — if this
 * helper were wrong, all tests would silently pass an invalid signature
 * instead of a real one.
 */
const buildInitData = (
  user: object,
  options: { authDate?: number; botToken?: string; queryId?: string } = {},
): string => {
  const token = options.botToken ?? BOT_TOKEN;
  const authDate = options.authDate ?? FIXED_NOW_SECONDS - 60; // 1 minute ago
  const fields = new Map<string, string>();
  fields.set('auth_date', String(authDate));
  fields.set('user', JSON.stringify(user));
  fields.set('query_id', options.queryId ?? 'AAH-test-query-id');

  // Build data-check string per Telegram spec
  const checkString = Array.from(fields.entries())
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');

  // secret_key = HMAC_SHA256("WebAppData", botToken)
  const secret = createHmac('sha256', 'WebAppData').update(token).digest();
  // hash = HMAC_SHA256(secret_key, dataCheckString)
  const hash = createHmac('sha256', secret).update(checkString).digest('hex');

  const out = new URLSearchParams();
  for (const [k, v] of fields) out.set(k, v);
  out.set('hash', hash);
  return out.toString();
};

const validUser = {
  id: 1234567,
  first_name: 'Pavel',
  username: 'durov',
};

const fixedClock = () => FIXED_NOW_SECONDS;

describe('verifyInitData', () => {
  it('accepts a valid signature with a recent auth_date', async () => {
    const initData = buildInitData(validUser);

    const result = await verifyInitData(initData, BOT_TOKEN, { now: fixedClock });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.params.get('user')).toBe(JSON.stringify(validUser));
      expect(result.authDateSeconds).toBe(FIXED_NOW_SECONDS - 60);
    }
  });

  it('rejects when the bot token is wrong (invalid signature)', async () => {
    const initData = buildInitData(validUser, { botToken: 'attacker-token' });

    const result = await verifyInitData(initData, BOT_TOKEN, { now: fixedClock });

    expect(result).toEqual({ ok: false, reason: 'invalid_signature' });
  });

  it('rejects when any field has been tampered with after signing', async () => {
    const initData = buildInitData(validUser);
    // Replace the user field with something else, leave the hash alone
    const tampered = initData.replace(
      encodeURIComponent(JSON.stringify(validUser)),
      encodeURIComponent(JSON.stringify({ ...validUser, id: 999 })),
    );

    const result = await verifyInitData(tampered, BOT_TOKEN, { now: fixedClock });

    expect(result).toEqual({ ok: false, reason: 'invalid_signature' });
  });

  it('rejects when auth_date is older than maxAgeSeconds', async () => {
    const oneDayAndOneMinuteAgo = FIXED_NOW_SECONDS - (24 * 60 * 60 + 60);
    const initData = buildInitData(validUser, { authDate: oneDayAndOneMinuteAgo });

    const result = await verifyInitData(initData, BOT_TOKEN, { now: fixedClock });

    expect(result).toEqual({ ok: false, reason: 'expired' });
  });

  it('honors a custom maxAgeSeconds', async () => {
    const tenMinutesAgo = FIXED_NOW_SECONDS - 10 * 60;
    const initData = buildInitData(validUser, { authDate: tenMinutesAgo });

    const tightResult = await verifyInitData(initData, BOT_TOKEN, {
      now: fixedClock,
      maxAgeSeconds: 60, // 1 minute
    });
    expect(tightResult).toEqual({ ok: false, reason: 'expired' });

    const looseResult = await verifyInitData(initData, BOT_TOKEN, {
      now: fixedClock,
      maxAgeSeconds: 60 * 60, // 1 hour
    });
    expect(looseResult.ok).toBe(true);
  });

  it.each([
    ['empty string', ''],
    ['no hash', 'auth_date=1736000000&user=%7B%22id%22%3A1%7D'],
    ['no auth_date', 'hash=abc&user=%7B%22id%22%3A1%7D'],
    ['non-numeric auth_date', 'hash=abc&auth_date=tomorrow&user=%7B%22id%22%3A1%7D'],
    ['negative auth_date', 'hash=abc&auth_date=-1&user=%7B%22id%22%3A1%7D'],
  ])('rejects malformed input: %s', async (_label, initData) => {
    const result = await verifyInitData(initData, BOT_TOKEN, { now: fixedClock });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // Either malformed or invalid_signature is acceptable for the no-hash
      // / non-numeric cases — the point is we don't crash and don't accept.
      expect(['malformed', 'invalid_signature']).toContain(result.reason);
    }
  });

  it('is case-insensitive on the provided hash (Telegram emits lowercase, but be defensive)', async () => {
    const initData = buildInitData(validUser);
    const upperHash = initData.replace(/hash=([a-f0-9]+)/, (_, h) => `hash=${h.toUpperCase()}`);

    const result = await verifyInitData(upperHash, BOT_TOKEN, { now: fixedClock });

    expect(result.ok).toBe(true);
  });
});
