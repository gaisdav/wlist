// Business operations. Each service is a flat function that takes the
// ApiClient as the first argument and returns typed domain entities.
// See docs/architecture.md §3 — every service has its own folder (impl +
// tests + helpers); this file just re-exports each domain barrel.
export * from './auth/index.js';
