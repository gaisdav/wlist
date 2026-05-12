/**
 * Deno-side mirror of the Zod schemas in
 * `packages/api/src/edge-contracts/auth-telegram.ts`.
 *
 * Why duplicated? Supabase's `functions deploy` only bundles the function's
 * own directory — files outside `supabase/functions/<name>/` aren't
 * available at runtime. So a one-screen mirror is the pragmatic price for
 * sharing a contract between Deno (this) and Node (workspace package).
 *
 * **If you change one side, change the other**, and let `pnpm test` enforce
 * it via `_lib/__tests__/contract.test.ts` (added in PR3 once the client
 * actually consumes these schemas).
 */
import { z } from 'zod';

export const authTelegramRequestSchema = z.object({
  initData: z.string().min(1).max(8192),
});

export const authTelegramResponseSchema = z.object({
  tokenHash: z.string().min(1),
  email: z.email(),
  isNewUser: z.boolean(),
});

export const authTelegramErrorSchema = z.object({
  error: z.enum([
    'invalid_init_data',
    'expired_init_data',
    'replayed_init_data',
    'malformed_request',
    'internal_error',
  ]),
  message: z.string().optional(),
});

export type AuthTelegramRequest = z.infer<typeof authTelegramRequestSchema>;
export type AuthTelegramResponse = z.infer<typeof authTelegramResponseSchema>;
export type AuthTelegramErrorCode = z.infer<typeof authTelegramErrorSchema>['error'];
