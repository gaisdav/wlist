// Public API of the `profile` domain entity.
// One folder per entity (see docs/architecture.md §3) — co-locates schema,
// helpers, and tests next to each other.
export { profileSchema, getDisplayName, type Profile } from './profile.js';
