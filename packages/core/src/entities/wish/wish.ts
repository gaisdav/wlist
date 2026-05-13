import { publicWishesRowSchema } from '@wlist/api/generated/database.zod';
import { z } from 'zod';

import { isWishCurrencyCode } from '../../lib/wishConstraints.js';

/**
 * Validated wish row: same keys as `public.wishes` (snake_case), stricter
 * `link` / `currency` than the raw generated row schema.
 *
 * Prefer this over hand-maintained mirrors of `database.types.ts`.
 */
export const wishSchema = publicWishesRowSchema.extend({
  link: z.union([z.string().url(), z.null()]),
  currency: z.string().refine(isWishCurrencyCode, 'invalid wish currency'),
});

export type Wish = z.infer<typeof wishSchema>;
