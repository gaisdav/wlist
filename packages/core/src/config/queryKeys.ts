// Single source of truth for TanStack Query keys. Never inline `['wishes', id]`
// in a component — always reach for queryKeys.x.y(...).
export const queryKeys = {
  all: ['wlist'] as const,
  currentUser: () => [...queryKeys.all, 'currentUser'] as const,

  profiles: {
    byId: (id: string) => [...queryKeys.all, 'profiles', 'byId', id] as const,
    /** Paginated user list — empty `q` is the "recent users" feed, non-empty filters it. */
    list: (q: string) => [...queryKeys.all, 'profiles', 'list', q] as const,
  },

  lists: {
    all: () => [...queryKeys.all, 'lists'] as const,
    mine: () => [...queryKeys.lists.all(), 'mine'] as const,
    members: (listId: string) => [...queryKeys.lists.all(), 'members', listId] as const,
    /** List ids a wish is shared with (edit-form prefill). */
    forWish: (wishId: string) => [...queryKeys.lists.all(), 'forWish', wishId] as const,
  },

  follows: {
    counts: (userId: string) => [...queryKeys.all, 'follows', 'counts', userId] as const,
    isFollowing: (followeeId: string) =>
      [...queryKeys.all, 'follows', 'isFollowing', followeeId] as const,
    followingList: (userId: string) => [...queryKeys.all, 'follows', 'following', userId] as const,
    followersList: (userId: string) => [...queryKeys.all, 'follows', 'followers', userId] as const,
    /** Batched "do I follow these ids" map (sorted, comma-joined for stability). */
    status: (ids: string[]) =>
      [...queryKeys.all, 'follows', 'status', [...ids].sort().join(',')] as const,
    /** Prefix matching every `status(ids)` cache — for invalidate/patch on toggle. */
    statusAll: () => [...queryKeys.all, 'follows', 'status'] as const,
  },

  feed: {
    all: () => [...queryKeys.all, 'feed'] as const,
    infinite: () => [...queryKeys.feed.all(), 'infinite'] as const,
  },

  wishLikes: {
    state: (wishId: string) => [...queryKeys.all, 'wishLikes', wishId] as const,
  },

  wishes: {
    all: () => [...queryKeys.all, 'wishes'] as const,
    byOwner: (ownerId: string) => [...queryKeys.wishes.all(), 'byOwner', ownerId] as const,
    /** Stable key for a set of wish ids (sorted, comma-separated). */
    byIds: (ids: string[]) =>
      [...queryKeys.wishes.all(), 'byIds', [...ids].sort().join(',')] as const,
    one: (wishId: string) => [...queryKeys.wishes.all(), 'one', wishId] as const,
  },

  /** Batched events/likes/slots fetch for a page of wish ids — seeds the per-item caches below. */
  wishesAncillary: {
    batch: (wishIds: string[]) =>
      [...queryKeys.all, 'wishesAncillary', [...wishIds].sort().join(',')] as const,
  },

  slots: {
    byWish: (wishId: string) => [...queryKeys.all, 'slots', 'byWish', wishId] as const,
    myBookings: () => [...queryKeys.all, 'slots', 'myBookings'] as const,
  },

  comments: {
    byWish: (wishId: string) => [...queryKeys.all, 'comments', 'byWish', wishId] as const,
  },

  events: {
    all: () => [...queryKeys.all, 'events'] as const,
    byOwner: (ownerId: string) => [...queryKeys.events.all(), 'byOwner', ownerId] as const,
    one: (eventId: string) => [...queryKeys.events.all(), 'one', eventId] as const,
    wishes: (eventId: string) => [...queryKeys.events.all(), 'wishes', eventId] as const,
    forWish: (wishId: string) => [...queryKeys.events.all(), 'forWish', wishId] as const,
  },
} as const;
