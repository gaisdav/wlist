import { z } from 'zod';

import {
  isWishCurrencyCode,
  WISH_DESCRIPTION_MAX_CHARS,
  WISH_TITLE_MAX_CHARS,
} from '../../lib/wishConstraints.js';

/**
 * RHF-friendly input (string price/link) → validated payload for `wishes.create` / `wishes.update`.
 */
export const wishDraftSchema = z
  .object({
    title: z.string().trim().min(1).max(WISH_TITLE_MAX_CHARS),
    description: z.string().max(WISH_DESCRIPTION_MAX_CHARS),
    priceStr: z.string(),
    currency: z.string().refine(isWishCurrencyCode, 'invalid_currency'),
    linkStr: z.string().max(2048),
  })
  .superRefine((data, ctx) => {
    const p = data.priceStr.trim();
    if (p !== '') {
      const n = Number(p.replace(',', '.'));
      if (!Number.isFinite(n) || n < 0) {
        ctx.addIssue({ code: 'custom', path: ['priceStr'], message: 'invalid_price' });
      }
    }
    const l = data.linkStr.trim();
    if (l !== '') {
      const ok = z.url().safeParse(l);
      if (!ok.success) ctx.addIssue({ code: 'custom', path: ['linkStr'], message: 'invalid_link' });
    }
  })
  .transform(({ title, description, priceStr, currency, linkStr }) => {
    const priceTrim = priceStr.trim();
    const price = priceTrim === '' ? null : Number(priceTrim.replace(',', '.'));
    const linkTrim = linkStr.trim();
    return {
      title,
      description: description.trim() === '' ? null : description.trim(),
      price,
      currency,
      link: linkTrim === '' ? null : linkTrim,
    };
  });

export type WishDraftFormInput = z.input<typeof wishDraftSchema>;

export type WishDraftPayload = z.output<typeof wishDraftSchema>;

export const defaultWishDraftFormValues = (): WishDraftFormInput => ({
  title: '',
  description: '',
  priceStr: '',
  currency: 'USD',
  linkStr: '',
});
