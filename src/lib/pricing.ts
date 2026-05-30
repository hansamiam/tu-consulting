// Pricing constants — single source of truth for the membership
// monthly + annual pricing. Edit here when the price changes; the
// Pricing page, checkout client, FAQ, and any other surface should
// read from these constants rather than re-stating the number in
// copy. Future raise to $39.99 monthly / $399 annual is a one-line
// change here.

export const MEMBERSHIP_PRICING = {
  monthly: {
    /** USD per month. */
    amountUsd: 39.99,
    /** Stripe live price ID (test mode swaps in via env if needed). */
    stripePriceId: "price_1TbkojQVirFUxpBg5iPsYmBO",
    interval: "month" as const,
  },
  annual: {
    /** USD per year — billed once. */
    amountUsd: 299.99,
    /** Effective per-month if billed yearly. */
    effectiveMonthlyUsd: 24.99,
    /** Stripe live price ID. */
    stripePriceId: "price_1Tci5AQVirFUxpBgit06oeKa",
    interval: "year" as const,
  },
} as const;

export type BillingInterval = "month" | "year";

/** Pretty-printed monthly delta saving vs paying month-by-month. */
export function annualSavingsVsMonthlyUsd(): number {
  return MEMBERSHIP_PRICING.monthly.amountUsd * 12 - MEMBERSHIP_PRICING.annual.amountUsd;
}

/** "$15.00" — for prices that need cents shown. */
export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/** "$15" — for prices where we don't want cents (eyebrow / hero copy). */
export function formatUsdNoCents(amount: number): string {
  return `$${Math.round(amount)}`;
}
