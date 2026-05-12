# `auth-telegram` Edge Function

Exchanges a Telegram Mini App `initData` payload for a Supabase magic-link `token_hash`. The browser then calls `supabase.auth.verifyOtp(...)` with that hash to obtain a real Supabase session (with native refresh).

See [`docs/architecture.md` §5](../../../docs/architecture.md#5-поток-аутентификации) for the auth flow diagram.

## Request

```http
POST /functions/v1/auth-telegram
Content-Type: application/json

{
  "initData": "query_id=AAH...&user=%7B%22id%22%3A1234%7D&auth_date=1736000000&hash=abc..."
}
```

Schema: [`packages/api/src/edge-contracts/auth-telegram.ts`](../../../packages/api/src/edge-contracts/auth-telegram.ts) (mirror in [`_lib/contract.ts`](./_lib/contract.ts)).

## Response

`200 OK`:

```json
{
  "tokenHash": "1f8a...",
  "email": "tg-1234@wlist-tg.local",
  "isNewUser": true
}
```

Errors (all `4xx`/`5xx`):

| `error` code         | HTTP | When                                         |
| -------------------- | ---- | -------------------------------------------- |
| `malformed_request`  | 400  | Body isn't valid JSON / doesn't match schema |
| `invalid_init_data`  | 401  | HMAC mismatch or `user` field unparsable     |
| `expired_init_data`  | 401  | `auth_date` older than 24h                   |
| `replayed_init_data` | 401  | Same `initData` already consumed             |
| `internal_error`     | 500  | DB / Auth Admin call failed                  |

## Required env (Supabase Function Secrets)

| Name                        | Source                                                |
| --------------------------- | ----------------------------------------------------- |
| `SUPABASE_URL`              | injected automatically by Supabase                    |
| `SUPABASE_SERVICE_ROLE_KEY` | injected automatically by Supabase                    |
| `TG_BOT_TOKEN`              | `supabase secrets set TG_BOT_TOKEN=<from @BotFather>` |

## Deploy

```bash
# One-time: set the bot token secret
supabase secrets set TG_BOT_TOKEN=<your token>

# Deploy the function
supabase functions deploy auth-telegram --project-ref <ref>

# Tail logs from a remote invocation
supabase functions logs auth-telegram --project-ref <ref>
```

## Local invocation (smoke test)

```bash
# Boot all functions locally
supabase functions serve auth-telegram --env-file ./.env.functions.local

# In another shell — invoke with a known-bad initData (expect 401)
curl -i -X POST http://localhost:54321/functions/v1/auth-telegram \
  -H 'Content-Type: application/json' \
  -d '{"initData":"hash=deadbeef&auth_date=1&user=%7B%22id%22%3A1%2C%22first_name%22%3A%22A%22%7D"}'
```

A real positive smoke is best done from the Mini App in Telegram — generating a valid `initData` outside the Telegram client requires the bot token (which the Edge Function holds for verification).

## Anti-replay

Every successful verification inserts `sha256(initData)` into `public.auth_telegram_used_init_data`. A second attempt with the same `initData` hits a `unique_violation` and is rejected with `replayed_init_data`. Telegram's own 24h TTL on `auth_date` keeps the table small; a periodic prune job (added when needed, plan 11+) deletes rows older than 24h.

## Why a synthetic email?

Supabase Auth was built around email/phone identifiers. Telegram doesn't expose either — only a numeric ID. We use `tg-<telegram_id>@wlist-tg.local` as a stable, non-routable identifier. The user never sees this email; it's purely an internal key. If Supabase adds a first-class custom-identity flow, we can migrate by writing a new Edge Function and keeping the same `auth.users` row.
