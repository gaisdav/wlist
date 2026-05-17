import type { Database } from '../generated/database.types.js';

export type WishCommentRow = Database['public']['Tables']['wish_comments']['Row'];

export type WishCommentCreateInput = Pick<
  WishCommentRow,
  'wish_id' | 'body' | 'parent_id' | 'visible_to_owner_thread'
>;

export type WishCommentUpdateInput = Pick<WishCommentRow, 'id' | 'body'>;
