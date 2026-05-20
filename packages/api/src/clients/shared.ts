import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../generated/database.types.js';

export type SupabaseClientLike = SupabaseClient<Database>;
