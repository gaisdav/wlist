import {
  WISH_COPY_LINE_MAX_CHARS,
  WISH_COPY_LINES_MAX,
} from './wishSlotsConstants.js';

/**
 * Normalizes `wishes.copy_lines` from DB jsonb into `string[] | null` for Zod parsing.
 * Returns `null` if invalid shape (treat as no lines rather than failing the whole wish).
 */
export const parseCopyLinesFromDb = (value: unknown): string[] | null => {
  if (value == null) return null;
  if (!Array.isArray(value)) return null;
  if (value.length > WISH_COPY_LINES_MAX) return null;
  const out: string[] = [];
  for (const x of value) {
    if (typeof x !== 'string') return null;
    const s = x;
    if (s.length > WISH_COPY_LINE_MAX_CHARS) return null;
    out.push(s);
  }
  return out;
};

/** Spread row with DB-shaped `copy_lines` replaced for `wishSchema.parse`. */
export const withParsedCopyLines = <T extends { copy_lines?: unknown }>(
  row: T,
): Omit<T, 'copy_lines'> & { copy_lines: string[] | null } => ({
  ...row,
  copy_lines: parseCopyLinesFromDb(row.copy_lines),
});
