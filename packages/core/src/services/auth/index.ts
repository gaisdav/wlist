// Public API of the `auth` business service.
// One folder per service (see docs/architecture.md §3) — co-locates the
// service implementation with its unit tests and any related helpers.
export { loginWithTelegram, ProfileMissingAfterSignIn } from './auth.js';
