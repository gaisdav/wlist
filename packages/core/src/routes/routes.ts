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
  userWishlist: route('/u/:userId', z.object({ userId: z.string().uuid() })),
  wish: route('/wish/:wishId', z.object({ wishId: z.string().uuid() })),
  wishCreate: route('/wish/new', z.object({})),
  wishEdit: route('/wish/:wishId/edit', z.object({ wishId: z.string().uuid() })),
  myBookings: route('/me/bookings', z.object({})),
  profile: route('/me/profile', z.object({})),
} as const;

export type RouteName = keyof typeof routes;
