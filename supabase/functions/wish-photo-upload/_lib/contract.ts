/**
 * Deno-side mirror of `packages/api/src/edge-contracts/wish-photo-upload.ts`.
 * Keep in sync manually — Supabase deploy bundles only this directory.
 */
import { z } from 'zod';

export const wishPhotoUploadMimeSchema = z.enum([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export const wishPhotoUploadRequestSchema = z.object({
  wishId: z.string().uuid(),
  mime: wishPhotoUploadMimeSchema,
});

export const wishPhotoUploadResponseSchema = z.object({
  uploadUrl: z.string().url(),
  storagePath: z.string().min(1),
  token: z.string().min(1),
});

export const wishPhotoUploadErrorSchema = z.object({
  error: z.enum(['unauthorized', 'forbidden', 'bad_request', 'internal_error']),
  message: z.string().optional(),
});

export type WishPhotoUploadErrorCode = z.infer<typeof wishPhotoUploadErrorSchema>['error'];
