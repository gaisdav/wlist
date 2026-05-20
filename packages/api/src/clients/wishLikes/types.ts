export interface WishLikesApi {
  getState(wishId: string): Promise<{ count: number; likedByMe: boolean }>;
  setLiked(wishId: string, liked: boolean): Promise<void>;
}
