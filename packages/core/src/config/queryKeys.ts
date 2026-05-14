// Single source of truth for TanStack Query keys. Never inline `['wishes', id]`
// in a component — always reach for queryKeys.x.y(...).
export const queryKeys = {
  all: ['wlist'] as const,
  currentUser: () => [...queryKeys.all, 'currentUser'] as const,

  profiles: {
    byId: (id: string) => [...queryKeys.all, 'profiles', 'byId', id] as const,
    search: (q: string) => [...queryKeys.all, 'profiles', 'search', q] as const,
  },

  follows: {
    counts: (userId: string) => [...queryKeys.all, 'follows', 'counts', userId] as const,
    isFollowing: (followeeId: string) => [...queryKeys.all, 'follows', 'isFollowing', followeeId] as const,
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
    one: (wishId: string) => [...queryKeys.wishes.all(), 'one', wishId] as const,
  },

  slots: {
    byWish: (wishId: string) => [...queryKeys.all, 'slots', 'byWish', wishId] as const,
    myBookings: () => [...queryKeys.all, 'slots', 'myBookings'] as const,
  },
} as const;
