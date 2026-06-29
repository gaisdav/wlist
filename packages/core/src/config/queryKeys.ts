// Single source of truth for TanStack Query keys. Never inline `['wishes', id]`
// in a component — always reach for queryKeys.x.y(...).
export const queryKeys = {
  all: ['wlist'] as const,
  currentUser: () => [...queryKeys.all, 'currentUser'] as const,

  profiles: {
    byId: (id: string) => [...queryKeys.all, 'profiles', 'byId', id] as const,
    search: (q: string) => [...queryKeys.all, 'profiles', 'search', q] as const,
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
