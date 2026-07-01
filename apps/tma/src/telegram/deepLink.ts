/**
 * Deep-link encoding shared by share-link building and start-param parsing.
 *
 * Telegram's `startapp` parameter only allows `[A-Za-z0-9_-]`, so we can't put a
 * raw route like `/wish/abc` into it. Instead we encode a small, fixed set of
 * shareable targets as `<kind>__<id>` and map them back to in-app routes on
 * launch. Ids here are uuids / numeric ids, both of which are URL-safe already.
 */

const SEP = '__';

/** A target that can be shared and reopened via a deep link. */
export type DeepLinkTarget =
  | { kind: 'wish'; id: string }
  | { kind: 'user'; id: string }
  | { kind: 'event'; id: string };

/** The in-app (`wouter`) route a target resolves to. */
export const targetToRoute = (target: DeepLinkTarget): string => {
  switch (target.kind) {
    case 'wish':
      return `/wish/${target.id}`;
    case 'user':
      return `/u/${target.id}`;
    case 'event':
      return `/event/${target.id}`;
  }
};

/** Encodes a target into a Telegram-safe `startapp` payload. */
export const encodeStartParam = (target: DeepLinkTarget): string =>
  `${target.kind}${SEP}${target.id}`;

/**
 * Decodes a `startapp` payload back into an in-app route, or null when the
 * payload is empty / malformed / references an unknown kind. Callers treat
 * null as "no deep link" and fall through to the default route.
 */
export const startParamToRoute = (param: string | undefined): string | null => {
  if (!param) return null;
  const idx = param.indexOf(SEP);
  if (idx <= 0) return null;

  const kind = param.slice(0, idx);
  const id = param.slice(idx + SEP.length);
  if (!id) return null;

  switch (kind) {
    case 'wish':
    case 'user':
    case 'event':
      return targetToRoute({ kind, id });
    default:
      return null;
  }
};
