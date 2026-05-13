import { publicWishesRowSchema } from '@wlist/api/generated/database.zod';
import { z } from 'zod';

import { isWishCurrencyCode, type WishCurrencyCode } from '../../lib/wishConstraints.js';

/**
 * Domain wish — camelCase, parsed from `public.wishes` via `publicWishesRowSchema`.
 */
export const wishSchema = publicWishesRowSchema
  .extend({
    link: z.union([z.string().url(), z.null()]),
    currency: z.string().refine(isWishCurrencyCode, 'invalid wish currency'),
  })
  .transform((row) => ({
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description,
    price: row.price,
    currency: row.currency as WishCurrencyCode,
    link: row.link,
    photoStoragePath: row.photo_storage_path,
    isArchived: row.is_archived,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }));

export type Wish = z.infer<typeof wishSchema>;
