// React hooks layer, organized by domain (see docs/architecture.md §3).
// Each domain has its own folder; re-exports are added as hooks land in plans 01–04.
export * from './auth/index.js';
export * from './social/index.js';
export * from './slots/index.js';
export * from './wishes/index.js';
