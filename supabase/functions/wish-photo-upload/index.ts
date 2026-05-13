/**
 * Mints a short-lived signed upload URL for the private `wish-photos` bucket.
 *
 * Caller must send `Authorization: Bearer <user_jwt>`. The function:
 *   1. Resolves the user via the anon client + forwarded Authorization header.
 *   2. Verifies the user owns `wishId` (RLS-aware read on `wishes`).
 *   3. Uses the service-role client to call `createSignedUploadUrl` (bypasses
 *      storage RLS safely — path is server-chosen, ownership already proven).
 *
 * Client flow after success (one image per wish in MVP):
 *   `uploadToSignedUrl` then persist `storagePath` on `wishes.photo_storage_path`.
 *
 * See plans/02-mvp-wishlist-crud.md (Storage + Edge Function).
 */
import { createClient } from '@supabase/supabase-js';

import { handlePreflight, jsonResponse } from '../_shared/cors.ts';

import {
  type WishPhotoUploadErrorCode,
  wishPhotoUploadRequestSchema,
  wishPhotoUploadResponseSchema,
} from './_lib/contract.ts';

declare const Deno: { env: { get(key: string): string | undefined } };

const SUPABASE_URL = mustEnv('SUPABASE_URL');
const SUPABASE_ANON_KEY = mustEnv('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = mustEnv('SUPABASE_SERVICE_ROLE_KEY');

function mustEnv(key: string): string {
  const v = Deno.env.get(key);
  if (!v) throw new Error(`wish-photo-upload: missing ${key}`);
  return v;
}

const extForMime = (mime: string): string => {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return 'bin';
  }
};

const fail = (code: WishPhotoUploadErrorCode, status: number, message?: string): Response =>
  jsonResponse({ error: code, ...(message ? { message } : {}) }, { status });

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (req.method !== 'POST') {
    return fail('bad_request', 405, 'POST only');
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return fail('unauthorized', 401, 'Missing Authorization bearer token');
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail('bad_request', 400, 'Body must be JSON');
  }

  const parsed = wishPhotoUploadRequestSchema.safeParse(body);
  if (!parsed.success) {
    return fail('bad_request', 400);
  }
  const { wishId, mime } = parsed.data;

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();
  if (userErr || !user) {
    return fail('unauthorized', 401, userErr?.message ?? 'Invalid session');
  }

  const { data: wish, error: wishErr } = await userClient
    .from('wishes')
    .select('owner_id')
    .eq('id', wishId)
    .maybeSingle();

  if (wishErr || !wish) {
    return fail('forbidden', 403, 'Wish not found or not visible');
  }
  if (wish.owner_id !== user.id) {
    return fail('forbidden', 403, 'Not the wish owner');
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const objectPath = `${wishId}/${crypto.randomUUID()}.${extForMime(mime)}`;
  const { data: signed, error: signErr } = await admin.storage
    .from('wish-photos')
    .createSignedUploadUrl(objectPath, { upsert: false });

  if (signErr || !signed) {
    console.error('wish-photo-upload: createSignedUploadUrl failed', signErr);
    return fail('internal_error', 500);
  }

  const payload = {
    uploadUrl: signed.signedUrl,
    storagePath: signed.path,
    token: signed.token,
  };
  const ok = wishPhotoUploadResponseSchema.safeParse(payload);
  if (!ok.success) {
    console.error('wish-photo-upload: response shape drift', ok.error);
    return fail('internal_error', 500);
  }

  return jsonResponse(ok.data, { status: 200 });
});
