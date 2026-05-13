import { z } from 'zod';

/**
 * Contract for the `wish-photo-upload` Edge Function.
 *
 * Returns a short-lived signed upload URL for the private `wish-photos`
 * bucket. Caller must present a valid Supabase session JWT; the function
 * verifies the user owns `wishId` before minting the URL. After upload,
 * persist `storagePath` on `wishes.photo_storage_path` (MVP: one image per wish).
 *
 * Deno mirror: `supabase/functions/wish-photo-upload/_lib/contract.ts`.
 */

export const wishPhotoUploadMimeSchema = z.enum([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export type WishPhotoUploadMime = z.infer<typeof wishPhotoUploadMimeSchema>;

export const wishPhotoUploadRequestSchema = z.object({
  wishId: z.string().uuid(),
  mime: wishPhotoUploadMimeSchema,
});

export type WishPhotoUploadRequest = z.infer<typeof wishPhotoUploadRequestSchema>;

export const wishPhotoUploadResponseSchema = z.object({
  /** URL to `PUT` the raw bytes to (see supabase-js `uploadToSignedUrl`). */
  uploadUrl: z.string().url(),
  /** Path inside bucket `wish-photos` (format `<wishId>/<uuid>.<ext>`). */
  storagePath: z.string().min(1),
  /** Opaque token required by `uploadToSignedUrl` alongside `storagePath`. */
  token: z.string().min(1),
});

export type WishPhotoUploadResponse = z.infer<typeof wishPhotoUploadResponseSchema>;

export const wishPhotoUploadErrorSchema = z.object({
  error: z.enum(['unauthorized', 'forbidden', 'bad_request', 'internal_error']),
  message: z.string().optional(),
});

export type WishPhotoUploadError = z.infer<typeof wishPhotoUploadErrorSchema>;
