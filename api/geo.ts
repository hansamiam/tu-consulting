/* Vercel Edge function: returns the visitor's country code from the
 * `x-vercel-ip-country` header Vercel injects on every incoming request.
 *
 * Used by useInferredCountry() on the client to power a "presumed
 * nationality" Discover personalization for visitors who haven't
 * filled out the profile wizard yet. Edge runtime + tiny response
 * keeps invocation cost effectively zero — and the client caches
 * the answer in localStorage for 7 days so a returning visitor
 * doesn't re-trigger the function.
 *
 * Returns 2-letter ISO 3166-1 alpha-2 (e.g. "KZ"). The client maps
 * to a country name via the regional-indicator decoding in
 * src/lib/iso-country.ts so we don't ship a 200-row name table here.
 */
export const config = { runtime: "edge" };

export default function handler(req: Request): Response {
  const iso = req.headers.get("x-vercel-ip-country");
  const country = iso && /^[A-Z]{2}$/.test(iso) ? iso : null;
  return new Response(JSON.stringify({ country }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      // Short edge cache — the answer is per-visitor so we can't share
      // it across users, but a single visitor's repeated calls during
      // a session don't need to re-hit the function.
      "cache-control": "private, max-age=300",
    },
  });
}
