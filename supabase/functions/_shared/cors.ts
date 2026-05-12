/**
 * CORS headers shared by every Edge Function.
 *
 * The Mini App calls these functions from the browser, which means the
 * browser issues a `OPTIONS` preflight first. Without these headers the
 * preflight fails with a generic "blocked by CORS policy" error and the
 * actual request never leaves the page.
 *
 * `*` for origin is fine because:
 *   - Functions are stateless (no cookies → no CSRF surface).
 *   - Auth is per-request via `Authorization: Bearer <jwt>` and the body's
 *     `initData` HMAC, both of which the browser does NOT auto-send to
 *     foreign origins.
 *
 * Production hardening (post-MVP): pin to `https://wlist-tma.vercel.app`
 * (or `https://wlist.pro` once the domain is live).
 *
 * `Access-Control-Allow-Headers` MUST cover every non-CORS-safelisted
 * header any client might send. Anything missing → spec-compliant browsers
 * (notably WKWebView in Telegram iOS) reject the preflight, fetch throws
 * "Load failed" / "Failed to fetch" with no useful detail. Adding a new
 * client header? Append it here too.
 */
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-wlist-client',
  'Access-Control-Max-Age': '86400',
};

export const jsonResponse = (
  body: unknown,
  init: { status?: number; headers?: HeadersInit } = {},
): Response =>
  new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders, ...init.headers },
  });

export const handlePreflight = (req: Request): Response | null =>
  req.method === 'OPTIONS' ? new Response(null, { status: 204, headers: corsHeaders }) : null;
