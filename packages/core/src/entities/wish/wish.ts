import { publicWishesRowSchema } from '@wlist/api/generated/database.zod';
import { z } from 'zod';

import { isWishCurrencyCode } from '../../lib/wishConstraints.js';

/**
 * Validated wish row: same keys as `public.wishes` (snake_case), stricter
 * `link` / `currency` than the raw generated row schema.
 *
 * Prefer this over hand-maintained mirrors of `database.types.ts`.
 */
export const wishSchema = publicWishesRowSchema
  .omit({ link: true, currency: true })
  .extend({
    link: z.url().nullable(),
    currency: z.string().nullable(),
  })
  .superRefine((row, ctx) => {
    if (row.price == null) {
      if (row.currency != null) {
        ctx.addIssue({
          code: 'custom',
          path: ['currency'],
          message: 'currency_without_price',
        });
      }
    } else if (row.currency == null || !isWishCurrencyCode(row.currency)) {
      ctx.addIssue({
        code: 'custom',
        path: ['currency'],
        message: 'invalid wish currency',
      });
    }
  });

export type Wish = z.infer<typeof wishSchema>;
