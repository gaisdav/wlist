/**
 * Wish cover photo limits (Stage 02). Enforced on the client before signed upload;
 * Edge mints URL only — Storage project limits may apply separately.
 *
 * Keep in sync with user-facing copy in `packages/core/src/i18n/locales/en/common.json`.
 */

/** Maximum upload size after any client-side downscale (bytes). */
export const WISH_PHOTO_MAX_UPLOAD_BYTES = 3 * 1024 * 1024; // 3 MiB

/** Longest edge for raster images after resize (GIF is not resized in the client). */
export const WISH_PHOTO_MAX_EDGE_PX = 2048;
