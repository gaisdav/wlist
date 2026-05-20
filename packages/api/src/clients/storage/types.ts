import type { WishPhotoUploadMime } from '../../edge-contracts/wish-photo-upload.js';

export interface WishPhotoSignedUpload {
  uploadUrl: string;
  storagePath: string;
  token: string;
}

export interface StorageApi {
  requestWishPhotoUpload(input: {
    wishId: string;
    mime: WishPhotoUploadMime;
  }): Promise<WishPhotoSignedUpload>;
  completeWishPhotoUpload(input: {
    uploadUrl: string;
    body: Blob;
    contentType: string;
  }): Promise<void>;
  createWishPhotoSignedReadUrl(storagePath: string, expiresInSec?: number): Promise<string>;
  deleteWishPhoto(storagePath: string): Promise<void>;
}
