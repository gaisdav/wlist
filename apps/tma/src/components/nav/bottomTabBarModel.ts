/** Paths where the Instagram-style bottom tab bar is visible (root tab screens only). */
export const bottomTabPaths = ['/feed', '/me', '/me/bookings', '/search'] as const;

export type BottomTabPath = (typeof bottomTabPaths)[number];

export function shouldShowBottomTabBar(pathname: string): boolean {
  return (bottomTabPaths as readonly string[]).includes(pathname);
}
