/* Shared date helpers — keep the math in one place so deadline-bug
 * fixes (round 46) don't have to be replicated across five files.
 *
 * `daysUntil` was previously copy-pasted in Pipeline, Discover,
 * EssaysTab, CancellationSaveDialog and useActivityFeed. The
 * subtle Math.ceil + same-day-deadline edge cases bit us before
 * — centralising prevents the next variant from drifting. */

/** Days from "now" to the supplied ISO date.
 *
 *  Returns:
 *    · null  → unparseable / null input
 *    · 0     → deadline within the last ~24h or exactly now (effectively closed)
 *    · >0    → future (1 = within next 24h, 2 = within 48h, …)
 *    · <0    → already passed by at least one full day
 *
 *  Uses Math.ceil so a deadline 12h in the future reads as 1 (not 0)
 *  — the natural "is there any time left" framing the UI uses. */
export const daysUntil = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86_400_000);
};
