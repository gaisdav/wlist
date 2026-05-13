// Domain entities (camelCase Zod schemas) live here.
// Each entity transforms a snake_case row schema from `@wlist/api/generated/database.zod`.
// See docs/architecture.md §3 — every entity has its own folder (schema +
// tests + helpers); this file just re-exports each domain barrel.
export * from './profile/index.js';
export * from './wish/index.js';
