import type { WishPhotoUploadMime } from '@wlist/api/edge-contracts';
import { WISH_PHOTO_MAX_EDGE_PX, WISH_PHOTO_MAX_UPLOAD_BYTES } from '@wlist/core/lib';

export type PrepareWishPhotoErrorCode = 'unsupported_type' | 'too_large' | 'decode_failed';

export class PrepareWishPhotoError extends Error {
  constructor(
    message: string,
    public readonly code: PrepareWishPhotoErrorCode,
  ) {
    super(message);
    this.name = 'PrepareWishPhotoError';
  }
}

const RASTER_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

function mimeForUpload(file: File): WishPhotoUploadMime | null {
  const t = file.type;
  if (t === 'image/jpeg' || t === 'image/jpg') return 'image/jpeg';
  if (t === 'image/png') return 'image/png';
  if (t === 'image/webp') return 'image/webp';
  if (t === 'image/gif') return 'image/gif';
  return null;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: 'image/webp' | 'image/jpeg',
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), type, quality);
  });
}

async function rasterFitsWithoutResize(file: File): Promise<boolean> {
  try {
    const bmp = await createImageBitmap(file);
    const ok =
      bmp.width <= WISH_PHOTO_MAX_EDGE_PX &&
      bmp.height <= WISH_PHOTO_MAX_EDGE_PX &&
      file.size <= WISH_PHOTO_MAX_UPLOAD_BYTES;
    bmp.close();
    return ok;
  } catch {
    return false;
  }
}

/**
 * Downscale + re-encode raster image to fit under {@link WISH_PHOTO_MAX_UPLOAD_BYTES}.
 * Prefers WebP, then JPEG.
 */
async function compressRaster(file: File): Promise<File> {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    throw new PrepareWishPhotoError('decode_failed', 'decode_failed');
  }

  try {
    const maxEdge0 = Math.max(bmp.width, bmp.height);
    const scale0 = maxEdge0 > WISH_PHOTO_MAX_EDGE_PX ? WISH_PHOTO_MAX_EDGE_PX / maxEdge0 : 1;
    let w = Math.max(1, Math.round(bmp.width * scale0));
    let h = Math.max(1, Math.round(bmp.height * scale0));

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new PrepareWishPhotoError('decode_failed', 'decode_failed');
    }

    const tryOnce = async (): Promise<File | null> => {
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(bmp, 0, 0, w, h);
      for (const type of ['image/webp', 'image/jpeg'] as const) {
        for (let q = 0.92; q >= 0.42; q -= 0.07) {
          const blob = await canvasToBlob(canvas, type, q);
          if (blob && blob.size <= WISH_PHOTO_MAX_UPLOAD_BYTES) {
            const ext = type === 'image/webp' ? 'webp' : 'jpg';
            return new File([blob], `wish-photo.${ext}`, { type });
          }
        }
      }
      return null;
    };

    for (let i = 0; i < 14; i++) {
      const out = await tryOnce();
      if (out) return out;
      w = Math.max(1, Math.round(w * 0.88));
      h = Math.max(1, Math.round(h * 0.88));
    }

    throw new PrepareWishPhotoError('too_large', 'too_large');
  } finally {
    bmp.close();
  }
}

/**
 * Validates type/size and returns a file safe to PUT (may be re-encoded/smaller).
 * GIF: no re-encode (keeps animation); must already be under the byte limit.
 */
export async function prepareWishPhotoUpload(file: File): Promise<File> {
  const declared = file.type;
  if (declared === 'image/gif') {
    if (file.size > WISH_PHOTO_MAX_UPLOAD_BYTES) {
      throw new PrepareWishPhotoError('too_large', 'too_large');
    }
    return file;
  }

  if (!RASTER_TYPES.has(declared)) {
    throw new PrepareWishPhotoError('unsupported_type', 'unsupported_type');
  }

  if (await rasterFitsWithoutResize(file)) {
    return file;
  }

  return compressRaster(file);
}

export function wishPhotoMimeForApi(file: File): WishPhotoUploadMime | null {
  return mimeForUpload(file);
}
