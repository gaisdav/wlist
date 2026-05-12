// `ApiClient` is the inversion-of-dependency boundary: `@wlist/core` only ever
// depends on this interface. The Supabase implementation lives in
// SupabaseApiClient.ts and is wired up in apps/tma/src/main.tsx.
//
// As we add features in plans 01–04 we extend each domain block here.
// See docs/architecture.md §4.

// Empty during scaffolding — populated in plan 01 (auth) and onward.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ApiClient {
  // auth.signInWithTelegram(initData) → plan 01
  // wishes.list / get / create / update / archive → plan 02
  // slots.list / book / cancel / myBookings → plan 03
  // storage.uploadWishImage → plan 02
}
