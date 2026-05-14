/** When `wishes.max_slots` is null, server + client use this cap (plan 03). */
export const WISH_SLOTS_DEFAULT_CAP = 50;

/** Max JSON-string length for each `copy_lines` entry. */
export const WISH_COPY_LINE_MAX_CHARS = 256;

/** Max number of strings in `wishes.copy_lines` JSON array. */
export const WISH_COPY_LINES_MAX = 5;

export const wishSlotCap = (maxSlots: number | null): number => maxSlots ?? WISH_SLOTS_DEFAULT_CAP;
