import type { Database } from '../../generated/database.types.js';

type WishCommentsRow = Database['public']['Tables']['wish_comments']['Row'];
type WishCommentsInsert = Database['public']['Tables']['wish_comments']['Insert'];
type WishCommentsUpdate = Database['public']['Tables']['wish_comments']['Update'];

export type WishCommentRow = WishCommentsRow;

export type WishCommentCreateInput = Omit<WishCommentsInsert, 'author_id'>;

export type WishCommentUpdateInput = {
  id: string;
  body: string;
} & Omit<Partial<WishCommentsUpdate>, 'author_id'>;

export interface CommentsApi {
  listByWish(wishId: string): Promise<WishCommentRow[]>;
  create(input: WishCommentCreateInput): Promise<WishCommentRow>;
  update(input: WishCommentUpdateInput): Promise<WishCommentRow>;
  delete(id: string): Promise<void>;
}
