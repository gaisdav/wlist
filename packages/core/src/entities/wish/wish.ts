import { publicWishesRowSchema } from '@wlist/api/generated/database.zod';
import { z } from 'zod';

import { isWishCurrencyCode } from '../../lib/wishConstraints.js';
import { WISH_COPY_LINE_MAX_CHARS, WISH_COPY_LINES_MAX } from '../../lib/wishSlotsConstants.js';

/**
 * Validated wish row: same keys as `public.wishes` (snake_case), stricter
 * `link` / `currency` than the raw generated row schema.
 *
 * Prefer this over hand-maintained mirrors of `database.types.ts`.
 *
 * Callers must pass rows through `withParsedCopyLines` before `parse` so
 * `copy_lines` is a `string[] | null` (not raw Json).
 */
export const wishSchema = publicWishesRowSchema
  .omit({ link: true, currency: true, copy_lines: true })
  .extend({
    link: z.url().nullable(),
    currency: z.string().nullable(),
    copy_lines: z
      .array(z.string().max(WISH_COPY_LINE_MAX_CHARS))
      .max(WISH_COPY_LINES_MAX)
      .nullable(),
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
