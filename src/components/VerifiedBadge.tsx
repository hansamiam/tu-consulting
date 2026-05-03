import { CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";

/**
 * <VerifiedBadge /> — small, reusable freshness indicator that appears on
 * every user-facing scholarship surface. Reads from the `last_verified_at`
 * timestamp + `verification_status` enum added in migration 20260504000000.
 *
 * Visual rules (intentionally muted — this is a trust signal, not a CTA):
 *   · verified + ≤ 30 days  → small green check + "Verified"
 *   · verified + 30-180 days → muted gold + "Verified <date>"
 *   · stale + > 180 days     → amber + "Last verified <date>"
 *   · pending                → no badge (we never show LLM-extracted-but-
 *                              un-vetted rows in user-facing surfaces;
 *                              brief retrieval already filters these out)
 *   · broken                 → muted red + "URL unreachable" (won't be
 *                              shown in normal flows but defensive)
 *   · null / unset           → no badge
 *
 * Per docs/DATA_PIPELINE_AUDIT.md: this is the user-side half of the
 * "LLMs may summarize, never invent" contract — every scholarship fact
 * the user sees is paired with when we last checked it.
 */

interface Props {
  status?: string | null;            // verification_status enum
  verifiedAt?: string | null;        // last_verified_at ISO
  /** Compact mode hides the date and only shows the badge label. */
  compact?: boolean;
  /** Render with smaller font + tighter spacing (for inline-card usage). */
  size?: "xs" | "sm";
  className?: string;
}

const fmtDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return ""; }
};

const daysSince = (iso: string): number | null => {
  try {
    return Math.floor((Date.now() - new Date(iso).getTime()) / 86400_000);
  } catch { return null; }
};

export const VerifiedBadge = ({ status, verifiedAt, compact, size = "sm", className }: Props) => {
  // No signal at all → render nothing rather than a confusing placeholder.
  if (!status && !verifiedAt) return null;
  if (status === "pending") return null;

  const days = verifiedAt ? daysSince(verifiedAt) : null;
  const fontCls = size === "xs" ? "text-[10px]" : "text-[11px]";
  const wrapper = `inline-flex items-center gap-1 ${fontCls} font-semibold leading-none whitespace-nowrap ${className ?? ""}`;

  if (status === "broken") {
    return (
      <span className={`${wrapper} text-destructive`} title="The official URL for this scholarship is currently unreachable.">
        <AlertCircle className="w-2.5 h-2.5" />
        URL unreachable
      </span>
    );
  }

  if (status === "verified" && days !== null && days <= 30) {
    return (
      <span className={`${wrapper} text-success`} title={`Verified ${fmtDate(verifiedAt!)}. We re-check sources continuously — this one is current.`}>
        <CheckCircle2 className="w-2.5 h-2.5" />
        Verified
        {!compact && verifiedAt ? ` ${fmtDate(verifiedAt)}` : null}
      </span>
    );
  }

  if (status === "verified" && verifiedAt) {
    return (
      <span className={`${wrapper} text-gold-dark`} title={`Verified ${fmtDate(verifiedAt)}. Last re-check is over a month ago — verify on the official source before applying.`}>
        <CheckCircle2 className="w-2.5 h-2.5" />
        Verified
        {!compact ? ` ${fmtDate(verifiedAt)}` : null}
      </span>
    );
  }

  if (status === "stale" || (status === "verified" && days !== null && days > 180)) {
    return (
      <span className={`${wrapper} text-amber-700 dark:text-amber-400`} title={`Last verified ${verifiedAt ? fmtDate(verifiedAt) : "over a year ago"}. Verify the deadline + funding amount on the official source before applying.`}>
        <HelpCircle className="w-2.5 h-2.5" />
        Last verified
        {!compact && verifiedAt ? ` ${fmtDate(verifiedAt)}` : null}
      </span>
    );
  }

  // Defensive: unknown status with a verified-at date. Treat as muted info.
  if (verifiedAt) {
    return (
      <span className={`${wrapper} text-muted-foreground`} title={`Last data check: ${fmtDate(verifiedAt)}.`}>
        <HelpCircle className="w-2.5 h-2.5" />
        Last checked {compact ? "" : fmtDate(verifiedAt)}
      </span>
    );
  }

  return null;
};
