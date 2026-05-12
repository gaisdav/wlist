// Single source of truth for TanStack Query keys. Never inline `['wishes', id]`
// in a component — always reach for queryKeys.x.y(...).
export const queryKeys = {
  all: ['wlist'] as const,
  currentUser: () => [...queryKeys.all, 'currentUser'] as const,

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
