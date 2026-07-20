export interface WishLikesApi {
  getState(wishId: string): Promise<{ count: number; likedByMe: boolean }>;
  setLiked(wishId: string, liked: boolean): Promise<void>;
  /** Batched `getState`: one round trip for a page of wish ids, keyed by `wish_id`. */
  getStates(wishIds: string[]): Promise<Record<string, { count: number; likedByMe: boolean }>>;
}
