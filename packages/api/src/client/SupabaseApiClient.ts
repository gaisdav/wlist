// Concrete ApiClient implementation backed by supabase-js.
//
// Domain methods (auth, wishes, slots, …) are added incrementally — see the
// commented stubs in ApiClient.ts and plans 01–03.
//
// This class is the ONLY place in the codebase that calls `createClient(...)`
// outside of Edge Functions. Edge Functions get a separate client with the
// service-role key and never share state with the browser one.
import {
  createClient,
  type Session,
  type SupabaseClient,
  type Subscription,
} from '@supabase/supabase-js';

import {
  authTelegramErrorSchema,
  authTelegramResponseSchema,
} from '../edge-contracts/auth-telegram.js';
import { wishPhotoUploadResponseSchema } from '../edge-contracts/wish-photo-upload.js';
import { type Database } from '../generated/database.types.js';

import {
  type ApiClient,
  type AuthApi,
  type AuthSession,
  type FeedApi,
  type FollowsApi,
  type ProfileRow,
  type ProfilesApi,
  type SignInWithTelegramResult,
  type StorageApi,
  type WishCreateInput,
  type WishPhotoSignedUpload,
  type WishRow,
  type WishesApi,
  type WishUpdateInput,
  type SlotsApi,
  type WishSlotRow,
  type WishSlotBookingRow,
  type WishLikesApi,
} from './ApiClient.js';
import { SignInError } from './SignInError.js';
import type { FeedEventRow, FeedItemRow } from './socialTypes.js';

export type SupabaseClientLike = SupabaseClient<Database>;

export interface SupabaseApiClientOptions {
  /** `https://<ref>.supabase.co` (from `VITE_SUPABASE_URL`). */
  url: string;
  /** Publishable / anon key safe to bundle into the browser. */
  anonKey: string;
}

const sessionToAuth = (s: Session | null): AuthSession | null =>
  s ? { userId: s.user.id, expiresAt: s.expires_at ?? null } : null;

export class SupabaseApiClient implements ApiClient {
  /** Raw supabase-js client. Domain modules in plans 01–03 use it via this property. */
  readonly supabase: SupabaseClientLike;

  readonly auth: AuthApi;
  readonly profiles: ProfilesApi;
  readonly follows: FollowsApi;
  readonly feed: FeedApi;
  readonly wishLikes: WishLikesApi;
  readonly storage: StorageApi;
  readonly wishes: WishesApi;
  readonly slots: SlotsApi;

  constructor({ url, anonKey }: SupabaseApiClientOptions) {
    this.supabase = createClient<Database>(url, anonKey, {
      auth: {
        // The Mini App swaps Telegram initData for a Supabase session via
        // Edge Function (plan 01). We persist the resulting session in
        // localStorage so cold starts inside Telegram skip the round-trip.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
      global: {
        headers: { 'x-wlist-client': 'tma' },
      },
    });

    this.auth = createAuthApi(this.supabase, url, anonKey);
    this.profiles = createProfilesApi(this.supabase);
    this.follows = createFollowsApi(this.supabase);
    this.feed = createFeedApi(this.supabase);
    this.wishLikes = createWishLikesApi(this.supabase);
    this.storage = createStorageApi(this.supabase);
    this.wishes = createWishesApi(this.supabase);
    this.slots = createSlotsApi(this.supabase);
  }
}

// =============================================================================
// auth
// =============================================================================

const createAuthApi = (sb: SupabaseClientLike, supabaseUrl: string, anonKey: string): AuthApi => ({
  async signInWithTelegram(initData) {
    // 1. Hand initData to the Edge Function via direct fetch.
    //
    //    We bypass `sb.functions.invoke` here because:
    //      - this call happens BEFORE the user has a session, so supabase-js's
    //        auto-injected `Authorization: Bearer <session_jwt>` header is
    //        either missing or stale and the Telegram WebView's CORS preflight
    //        chokes on the resulting request shape (observed empirically:
    //        Node + curl work, Telegram in-app browser throws TypeError);
    //      - direct fetch gives us pixel-precise control over headers + a
    //        readable Response on every code path, which makes diagnosing
    //        Edge runtime failures trivial.
    //    Once we have a session, every other DB call goes through supabase-js
    //    as normal.
    const url = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/auth-telegram`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        // Headers MUST be the bare minimum: every entry the browser doesn't
        // CORS-safelist forces a preflight check, and the Edge Function's
        // CORS allow list is finite. Sending any header that isn't in
        // supabase/functions/_shared/cors.ts → preflight rejected →
        // WebKit / WKWebView (Telegram iOS) throws "Load failed", Chrome
        // throws "Failed to fetch". Bit me once already — keep this lean.
        //
        // What's here:
        //   Content-Type: application/json — required so the function can
        //     `await req.json()`. Triggers preflight on its own; nothing
        //     to do about it short of reshaping the function to accept
        //     text/plain (not worth it).
        //   apikey: <publishable> — Supabase gateway's "this is anonymous
        //     traffic from a known project" identifier. Function itself
        //     authenticates via the HMAC inside initData
        //     (verify_jwt=false in supabase/config.toml).
        //
        // Notably absent: `Authorization` (no session yet) and
        // `x-wlist-client` (a diagnostic tag set in supabase-js's global
        // config — pointless for this single call, and not in the allow list).
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
        },
        body: JSON.stringify({ initData }),
      });
    } catch (e) {
      // CORS rejection / DNS / offline — `TypeError: Failed to fetch` (Chrome)
      // or similar. No response object available; fall through with the
      // platform's own message so it shows up in the splash for diagnostics.
      throw new SignInError(
        'network',
        e instanceof Error ? e.message : 'Network error calling auth-telegram',
      );
    }

    // 2. Parse the response body. We always try as JSON because both success
    //    and failure paths from our function are JSON; if the body isn't JSON
    //    that's an outage at the platform layer (Cloudflare HTML 502 page,
    //    Edge runtime cold-start crash) — surface the status + a snippet so
    //    we can see it in the user-facing splash.
    let body: unknown;
    let bodyText = '';
    try {
      bodyText = await response.text();
      body = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      throw new SignInError(
        'internal_error',
        `auth-telegram returned non-JSON (HTTP ${response.status}): ${bodyText.slice(0, 200)}`,
      );
    }

    if (!response.ok) {
      const parsed = authTelegramErrorSchema.safeParse(body);
      if (parsed.success) {
        throw new SignInError(parsed.data.error, parsed.data.message ?? `HTTP ${response.status}`);
      }
      throw new SignInError(
        'internal_error',
        `auth-telegram returned HTTP ${response.status}: ${bodyText.slice(0, 200)}`,
      );
    }

    const okBody = authTelegramResponseSchema.safeParse(body);
    if (!okBody.success) {
      throw new SignInError(
        'internal_error',
        `auth-telegram returned an unexpected payload: ${okBody.error.message}`,
      );
    }
    const { tokenHash, isNewUser } = okBody.data;

    // 3. Swap the magic-link token_hash for a real Supabase session.
    //    Same internal call path as a clicked email link → we get refresh
    //    tokens, autoRefreshToken kicks in for the rest of the session.
    //
    //    `verifyOtp` is overloaded — `VerifyTokenHashParams` (the variant
    //    we want) accepts ONLY `type` + `token_hash`. Passing `email`
    //    alongside is a `VerifyEmailOtpParams` shape, which uses a
    //    different `token` (numeric OTP, not the hash). The Supabase Auth
    //    server enforces this distinction with a 400:
    //    "Only the token_hash and type should be provided".
    //    The `email` field on our edge response stays useful for future
    //    UI (e.g. logging which synthetic identity was used) but is NOT
    //    needed by verifyOtp itself.
    const { data: otpData, error: otpError } = await sb.auth.verifyOtp({
      type: 'magiclink',
      token_hash: tokenHash,
    });
    if (otpError || !otpData?.session) {
      throw new SignInError(
        'verify_otp_failed',
        otpError?.message ?? 'verifyOtp returned no session',
      );
    }

    return {
      session: sessionToAuth(otpData.session) as AuthSession, // never null here
      isNewUser,
    } satisfies SignInWithTelegramResult;
  },

  async getSession() {
    const { data } = await sb.auth.getSession();
    return sessionToAuth(data.session ?? null);
  },

  onAuthStateChange(callback) {
    const { data } = sb.auth.onAuthStateChange((_event, session) => {
      callback(sessionToAuth(session));
    });
    const subscription: Subscription = data.subscription;
    return { unsubscribe: () => subscription.unsubscribe() };
  },

  async signOut() {
    await sb.auth.signOut();
  },
});

// =============================================================================
// profiles
// =============================================================================

const createProfilesApi = (sb: SupabaseClientLike): ProfilesApi => ({
  async getCurrent() {
    const { data: userData, error: userError } = await sb.auth.getUser();
    if (userError || !userData?.user) return null;

    const { data, error } = await sb
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .maybeSingle();
    if (error) throw error;
    return (data as ProfileRow | null) ?? null;
  },

  async getById(id: string) {
    const { data, error } = await sb.from('profiles').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return (data as ProfileRow | null) ?? null;
  },

  async searchUsers(query: string) {
    const q = query.trim();
    if (q.length === 0) return [];

    const pattern = `%${q.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
    const [byUsername, byFirst] = await Promise.all([
      sb.from('profiles').select('*').ilike('username', pattern).limit(20),
      sb.from('profiles').select('*').ilike('first_name', pattern).limit(20),
    ]);
    if (byUsername.error) throw byUsername.error;
    if (byFirst.error) throw byFirst.error;
    const map = new Map<string, ProfileRow>();
    for (const r of [...(byUsername.data ?? []), ...(byFirst.data ?? [])]) {
      map.set(r.id, r as ProfileRow);
    }
    return [...map.values()].slice(0, 20);
  },
});

// =============================================================================
// follows, feed, wish_likes (stage 05)
// =============================================================================

const createFollowsApi = (sb: SupabaseClientLike): FollowsApi => ({
  async follow(followeeId: string) {
    const { data: userData, error: userError } = await sb.auth.getUser();
    if (userError || !userData.user) throw new Error('Not authenticated');
    const { error } = await sb.from('follows').insert({
      follower_id: userData.user.id,
      followee_id: followeeId,
    });
    if (error) throw error;
  },

  async unfollow(followeeId: string) {
    const { data: userData, error: userError } = await sb.auth.getUser();
    if (userError || !userData.user) throw new Error('Not authenticated');
    const { error } = await sb
      .from('follows')
      .delete()
      .eq('follower_id', userData.user.id)
      .eq('followee_id', followeeId);
    if (error) throw error;
  },

  async isFollowing(followeeId: string) {
    const { data: userData, error: userError } = await sb.auth.getUser();
    if (userError || !userData.user) return false;
    const { count, error } = await sb
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userData.user.id)
      .eq('followee_id', followeeId);
    if (error) throw error;
    return (count ?? 0) > 0;
  },

  async getCounts(userId: string) {
    const [followingRes, followersRes] = await Promise.all([
      sb.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
      sb.from('follows').select('*', { count: 'exact', head: true }).eq('followee_id', userId),
    ]);
    if (followingRes.error) throw followingRes.error;
    if (followersRes.error) throw followersRes.error;
    return {
      following: followingRes.count ?? 0,
      followers: followersRes.count ?? 0,
    };
  },

  async listFollowing(userId: string) {
    const { data: rows, error } = await sb
      .from('follows')
      .select('followee_id')
      .eq('follower_id', userId);
    if (error) throw error;
    const ids = (rows ?? []).map((r) => r.followee_id);
    if (ids.length === 0) return [];
    const { data: profs, error: pErr } = await sb.from('profiles').select('*').in('id', ids);
    if (pErr) throw pErr;
    return (profs ?? []) as ProfileRow[];
  },

  async listFollowers(userId: string) {
    const { data: rows, error } = await sb
      .from('follows')
      .select('follower_id')
      .eq('followee_id', userId);
    if (error) throw error;
    const ids = (rows ?? []).map((r) => r.follower_id);
    if (ids.length === 0) return [];
    const { data: profs, error: pErr } = await sb.from('profiles').select('*').in('id', ids);
    if (pErr) throw pErr;
    return (profs ?? []) as ProfileRow[];
  },
});

type FeedEventWishEmbedRow = FeedEventRow & {
  wishes: WishRow | WishRow[] | null;
};

const embedWishFromFeedRow = (row: FeedEventWishEmbedRow): FeedItemRow => {
  const { wishes: embedded, ...event } = row;
  const wish = Array.isArray(embedded) ? (embedded[0] ?? null) : (embedded ?? null);
  return { ...event, wish };
};

const createFeedApi = (sb: SupabaseClientLike): FeedApi => ({
  async list(params: { limit?: number; offset?: number }) {
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 50);
    const offset = Math.max(params.offset ?? 0, 0);
    const { data, error } = await sb
      .from('feed_events')
      .select('*, wishes!left(*)')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return (data ?? []).map(embedWishFromFeedRow);
  },
});

const createWishLikesApi = (sb: SupabaseClientLike): WishLikesApi => ({
  async getState(wishId: string) {
    const { data: userData, error: userError } = await sb.auth.getUser();
    if (userError || !userData.user) throw new Error('Not authenticated');
    const uid = userData.user.id;
    const [totalRes, mineRes] = await Promise.all([
      sb.from('wish_likes').select('*', { count: 'exact', head: true }).eq('wish_id', wishId),
      sb
        .from('wish_likes')
        .select('*', { count: 'exact', head: true })
        .eq('wish_id', wishId)
        .eq('user_id', uid),
    ]);
    if (totalRes.error) throw totalRes.error;
    if (mineRes.error) throw mineRes.error;
    return { count: totalRes.count ?? 0, likedByMe: (mineRes.count ?? 0) > 0 };
  },

  async setLiked(wishId: string, liked: boolean) {
    const { data: userData, error: userError } = await sb.auth.getUser();
    if (userError || !userData.user) throw new Error('Not authenticated');
    const uid = userData.user.id;
    if (liked) {
      const { error } = await sb
        .from('wish_likes')
        .upsert({ wish_id: wishId, user_id: uid }, { onConflict: 'user_id,wish_id' });
      if (error) throw error;
    } else {
      const { error } = await sb
        .from('wish_likes')
        .delete()
        .eq('wish_id', wishId)
        .eq('user_id', uid);
      if (error) throw error;
    }
  },
});

// =============================================================================
// storage (Edge Function hand-offs)
// =============================================================================

const createStorageApi = (sb: SupabaseClientLike): StorageApi => ({
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

// =============================================================================
// wishes
// =============================================================================

const createWishesApi = (sb: SupabaseClientLike): WishesApi => ({
  async listByOwner(ownerId) {
    const { data, error } = await sb
      .from('wishes')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as WishRow[];
  },

  async listByIds(ids) {
    const unique = [...new Set(ids.filter(Boolean))];
    if (unique.length === 0) return [];
    const chunkSize = 100;
    const out: WishRow[] = [];
    for (let i = 0; i < unique.length; i += chunkSize) {
      const chunk = unique.slice(i, i + chunkSize);
      const { data, error } = await sb.from('wishes').select('*').in('id', chunk);
      if (error) throw error;
      out.push(...((data ?? []) as WishRow[]));
    }
    return out;
  },

  async get(id) {
    const { data, error } = await sb.from('wishes').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return (data as WishRow | null) ?? null;
  },

  async create(input: WishCreateInput) {
    const { data: userData, error: userError } = await sb.auth.getUser();
    if (userError || !userData.user) throw new Error('Not authenticated');

    const insert: Database['public']['Tables']['wishes']['Insert'] = {
      title: input.title,
      owner_id: userData.user.id,
      description: input.description ?? null,
      price: input.price ?? null,
      currency: input.currency ?? null,
      link: input.link ?? null,
      photo_storage_path: input.photo_storage_path ?? null,
      is_collaborative: input.is_collaborative ?? false,
      max_slots: input.max_slots ?? null,
      copy_lines: input.copy_lines ?? null,
      reposted_from_id: input.reposted_from_id ?? null,
    };

    const { data, error } = await sb.from('wishes').insert(insert).select('*').single();
    if (error) throw error;
    return data as WishRow;
  },

  async update(input: WishUpdateInput) {
    const { id, ...rest } = input;
    const patch: Database['public']['Tables']['wishes']['Update'] = {};
    if (rest.title !== undefined) patch.title = rest.title;
    if (rest.description !== undefined) patch.description = rest.description;
    if (rest.price !== undefined) patch.price = rest.price;
    if (rest.currency !== undefined) patch.currency = rest.currency;
    if (rest.link !== undefined) patch.link = rest.link;
    if (rest.photo_storage_path !== undefined) patch.photo_storage_path = rest.photo_storage_path;
    if (rest.is_collaborative !== undefined) patch.is_collaborative = rest.is_collaborative;
    if (rest.max_slots !== undefined) patch.max_slots = rest.max_slots;
    if (rest.copy_lines !== undefined) patch.copy_lines = rest.copy_lines;
    if (rest.is_archived !== undefined) patch.is_archived = rest.is_archived;

    if (Object.keys(patch).length === 0) {
      const { data: existing, error: getErr } = await sb
        .from('wishes')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (getErr) throw getErr;
      if (!existing) throw new Error('Wish not found');
      return existing as WishRow;
    }

    const { data, error } = await sb.from('wishes').update(patch).eq('id', id).select('*').single();
    if (error) throw error;
    return data as WishRow;
  },

  async archive(id) {
    const { data, error } = await sb
      .from('wishes')
      .update({ is_archived: true })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as WishRow;
  },

  async unarchive(id) {
    const { data, error } = await sb
      .from('wishes')
      .update({ is_archived: false })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as WishRow;
  },

  async delete(id) {
    const { data: row, error: getErr } = await sb
      .from('wishes')
      .select('photo_storage_path')
      .eq('id', id)
      .maybeSingle();
    if (getErr) throw getErr;
    if (!row) return;

    const { error } = await sb.from('wishes').delete().eq('id', id);
    if (error) throw error;

    const path = row.photo_storage_path;
    if (path) {
      await sb.storage.from('wish-photos').remove([path]);
    }
  },
});

// =============================================================================
// wish_slots (plan 03)
// =============================================================================

const createSlotsApi = (sb: SupabaseClientLike): SlotsApi => ({
  async listByWish(wishId) {
    const { data, error } = await sb
      .from('wish_slots')
      .select('*')
      .eq('wish_id', wishId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as WishSlotRow[];
  },

  async book(wishId, count) {
    const { data, error } = await sb.rpc('book_wish_slots', {
      p_wish_id: wishId,
      p_count: count,
    });
    if (error) throw error;
    return (data ?? []) as WishSlotRow[];
  },

  async cancel(slotId) {
    const { error } = await sb.from('wish_slots').update({ status: 'cancelled' }).eq('id', slotId);
    if (error) throw error;
  },

  async listMine() {
    const { data: userData, error: userError } = await sb.auth.getUser();
    if (userError || !userData.user) throw new Error('Not authenticated');
    const { data, error } = await sb
      .from('wish_slots')
      .select('*, wishes(id, title, is_archived)')
      .eq('booked_by', userData.user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as WishSlotBookingRow[];
  },
});
