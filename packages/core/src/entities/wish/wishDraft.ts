import { z } from 'zod';

import {
  isWishCurrencyCode,
  WISH_DESCRIPTION_MAX_CHARS,
  WISH_TITLE_MAX_CHARS,
} from '../../lib/wishConstraints.js';
import { WISH_COPY_LINE_MAX_CHARS, WISH_COPY_LINES_MAX } from '../../lib/wishSlotsConstants.js';

const copyLinesTupleSchema = z.tuple([
  z.string().max(WISH_COPY_LINE_MAX_CHARS),
  z.string().max(WISH_COPY_LINE_MAX_CHARS),
  z.string().max(WISH_COPY_LINE_MAX_CHARS),
  z.string().max(WISH_COPY_LINE_MAX_CHARS),
  z.string().max(WISH_COPY_LINE_MAX_CHARS),
]);

/**
 * RHF-friendly input (string price/link) → validated payload for `wishes.create` / `wishes.update`.
 *
 * Form uses `currency: ''` when there is no price; with a valid price, `currency` must be a
 * supported code (UI defaults from `readLastWishCurrency()` / USD).
 */
export const wishDraftSchema = z
  .object({
    title: z.string().trim().min(1).max(WISH_TITLE_MAX_CHARS),
    description: z.string().max(WISH_DESCRIPTION_MAX_CHARS),
    priceStr: z.string(),
    currency: z.string(),
    linkStr: z.string().max(2048),
    isCollaborative: z.boolean(),
    maxSlotsStr: z.string(),
    copyLines: copyLinesTupleSchema,
  })
  .superRefine((data, ctx) => {
    const priceTrim = data.priceStr.trim();
    const hasPrice = priceTrim !== '';
    if (hasPrice) {
      const n = Number(priceTrim.replace(',', '.'));
      if (!Number.isFinite(n) || n < 0) {
        ctx.addIssue({ code: 'custom', path: ['priceStr'], message: 'invalid_price' });
      } else if (!data.currency || !isWishCurrencyCode(data.currency)) {
        ctx.addIssue({ code: 'custom', path: ['currency'], message: 'invalid_currency' });
      }
    } else if (data.currency !== '') {
      ctx.addIssue({ code: 'custom', path: ['currency'], message: 'currency_without_price' });
    }
    const l = data.linkStr.trim();
    if (l !== '') {
      const ok = z.url().safeParse(l);
      if (!ok.success) ctx.addIssue({ code: 'custom', path: ['linkStr'], message: 'invalid_link' });
    }

    if (data.isCollaborative) {
      const ms = data.maxSlotsStr.trim();
      if (ms !== '') {
        const n = Number(ms);
        if (!Number.isInteger(n) || n < 1 || n > 500) {
          ctx.addIssue({ code: 'custom', path: ['maxSlotsStr'], message: 'invalid_max_slots' });
        }
      }
    }
  })
  .transform(({ title, description, priceStr, currency, linkStr, isCollaborative, maxSlotsStr, copyLines }) => {
    const priceTrim = priceStr.trim();
    const price = priceTrim === '' ? null : Number(priceTrim.replace(',', '.'));
    const linkTrim = linkStr.trim();
    const maxTrim = maxSlotsStr.trim();
    const maxSlots =
      isCollaborative && maxTrim !== '' ? Number(maxTrim) : null;
    const trimmedLines = copyLines.map((s) => s.trim()).filter((s) => s !== '');
    const copy_lines =
      isCollaborative && trimmedLines.length > 0 ? trimmedLines.slice(0, WISH_COPY_LINES_MAX) : null;
    return {
      title,
      description: description.trim() === '' ? null : description.trim(),
      price,
      currency: price == null ? null : currency,
      link: linkTrim === '' ? null : linkTrim,
      is_collaborative: isCollaborative,
      max_slots: isCollaborative ? maxSlots : null,
      copy_lines,
    };
  });

export type WishDraftFormInput = z.input<typeof wishDraftSchema>;

export type WishDraftPayload = z.output<typeof wishDraftSchema>;

export const defaultWishDraftFormValues = (): WishDraftFormInput => ({
  title: '',
  description: '',
  priceStr: '',
  currency: '',
  linkStr: '',
  isCollaborative: false,
  maxSlotsStr: '',
  copyLines: ['', '', '', '', ''],
});

/** Pad DB `copy_lines` to five inputs for the form. */
export const copyLinesToFormTuple = (lines: string[] | null | undefined): WishDraftFormInput['copyLines'] => {
  const base = lines?.slice(0, WISH_COPY_LINES_MAX) ?? [];
  const out: string[] = [...base];
  while (out.length < WISH_COPY_LINES_MAX) out.push('');
  return out as WishDraftFormInput['copyLines'];
};

export { wishSlotCap as wishSlotCapForWish } from '../../lib/wishSlotsConstants.js';
