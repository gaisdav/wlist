import { type ApiClient } from '@wlist/api';

/**
 * Placeholder ApiClient used until SupabaseApiClient lands in PR3 / plan 01.
 * Lets the DI tree compile and lets us prove the wiring with the Hello World
 * screen. Replace from main.tsx once the real client exists.
 */
export const stubApiClient: ApiClient = {};
