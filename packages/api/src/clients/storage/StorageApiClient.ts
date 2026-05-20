import { wishPhotoUploadResponseSchema } from '../../edge-contracts/wish-photo-upload.js';
import type { SupabaseClientLike } from '../shared.js';

import type { StorageApi, WishPhotoSignedUpload } from './types.js';

export const createStorageApi = (sb: SupabaseClientLike): StorageApi => ({
  async requestWishPhotoUpload({ wishId, mime }): Promise<WishPhotoSignedUpload> {
    let res: Awaited<ReturnType<typeof sb.functions.invoke>>;
    try {
      res = await sb.functions.invoke('wish-photo-upload', { body: { wishId, mime } });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Network error calling wish-photo-upload';
      throw new Error(message, { cause: e });
    }

    if (res.error || res.data == null) {
      const err = res.error;
      const base = err instanceof Error ? err.message : 'wish-photo-upload failed';
      if (err && typeof err === 'object' && 'context' in err) {
        const ctx = (err as { context?: { json?: () => Promise<unknown> } }).context;
        if (ctx?.json) {
          try {
            const body = await ctx.json();
            const parsedErr = body as { message?: string };
            throw new Error(parsedErr.message ?? base);
          } catch (e) {
            if (e instanceof Error && e.message !== base) throw e;
          }
        }
      }
      throw new Error(base);
    }

    const parsed = wishPhotoUploadResponseSchema.safeParse(res.data);
    if (!parsed.success) {
      throw new Error(`wish-photo-upload: invalid response: ${parsed.error.message}`);
    }
    return parsed.data;
  },

  async completeWishPhotoUpload({ uploadUrl, body, contentType }) {
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body,
    });
    if (!res.ok) {
      throw new Error(`wish photo upload failed: HTTP ${res.status}`);
    }
  },

  async createWishPhotoSignedReadUrl(storagePath, expiresInSec = 3600) {
    const { data, error } = await sb.storage
      .from('wish-photos')
      .createSignedUrl(storagePath, expiresInSec);
    if (error) throw error;
    if (!data?.signedUrl) throw new Error('createSignedUrl returned no URL');
    return data.signedUrl;
  },

  async deleteWishPhoto(storagePath) {
    const { error } = await sb.storage.from('wish-photos').remove([storagePath]);
    if (error) throw error;
  },
});
