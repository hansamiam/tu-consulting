/* Founder allowlist — used to gate Academy v0 (and any other in-progress
 * surfaces) so the founder can dogfood behind the public waitlist wall.
 *
 * Mirrored on the server via the SQL function `public.is_topuni_founder()`
 * referenced by the academy_workshops RLS policy. Keep this list in sync
 * with the DB function until Academy ships publicly. */
const FOUNDER_EMAILS = new Set<string>([
  "samuel.shn.han@gmail.com",
]);

export const isFounder = (email: string | null | undefined): boolean => {
  if (!email) return false;
  return FOUNDER_EMAILS.has(email.toLowerCase());
};
