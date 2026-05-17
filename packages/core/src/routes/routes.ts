// Declarative route table — single source of truth for app navigation across platforms.
// Each platform (TMA, web, RN) implements its own router but reads patterns/params from here.
// See docs/architecture.md §7.
import { z } from 'zod';

type RouteSchema = z.ZodObject<z.ZodRawShape>;

export interface Route<S extends RouteSchema> {
  pattern: string;
  paramsSchema: S;
  build: (params: z.infer<S>) => string;
  parse: (url: string) => z.infer<S>;
}

const route = <S extends RouteSchema>(pattern: string, paramsSchema: S): Route<S> => ({
  pattern,
  paramsSchema,
  // Placeholder implementations — real path building/matching is added together
  // with the TMA router in plan 01/02.
  build: (params) => {
    let result = pattern;
    for (const [key, value] of Object.entries(params)) {
      result = result.replace(`:${key}`, encodeURIComponent(String(value)));
    }
    return result;
  },
  parse: (url) => paramsSchema.parse({ __url: url }),
});

export const routes = {
  home: route('/', z.object({})),
  myWishlist: route('/me', z.object({})),
  feed: route('/feed', z.object({})),
  searchUsers: route('/search', z.object({})),
  userWishlist: route('/u/:userId', z.object({ userId: z.uuid() })),
  userFollowing: route('/u/:userId/following', z.object({ userId: z.uuid() })),
  userFollowers: route('/u/:userId/followers', z.object({ userId: z.uuid() })),
  wish: route('/wish/:wishId', z.object({ wishId: z.uuid() })),
  wishCreate: route('/wish/new', z.object({})),
  wishEdit: route('/wish/:wishId/edit', z.object({ wishId: z.uuid() })),
  myBookings: route('/me/bookings', z.object({})),
  profile: route('/me/profile', z.object({})),
  eventDetail: route('/event/:eventId', z.object({ eventId: z.uuid() })),
  eventCreate: route('/event/new', z.object({})),
  eventEdit: route('/event/:eventId/edit', z.object({ eventId: z.uuid() })),
} as const;

export type RouteName = keyof typeof routes;
