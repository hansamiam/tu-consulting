// Single source of truth for the TopUni digital-products catalog.
// Mirrors the LF version in src/lib/productCatalog.ts.
//
// Status field is "draft" or "published". Draft products show a
// Coming Soon wall to public visitors; admins (per isAdminUser /
// isAdminBypass) see the full content.
//
// Env override: VITE_PUBLISHED_PRODUCTS="slug1,slug2" flips slugs
// to published at runtime without a code edit.

export type ProductStatus = "draft" | "published";

export interface ProductCatalogEntry {
  slug: string;
  route: string;
  title: string;
  blurb: string;
  format: string;
  pricing: string;
  pill?: string;
  /** Optional Stripe SKU for paid products (not yet wired on TU). */
  sku?: string;
  status: ProductStatus;
}

export const PRODUCT_CATALOG: ProductCatalogEntry[] = [
  // Free
  {
    slug: "underrated-scholarships",
    route: "/underrated-scholarships",
    title: "30 scholarships you haven't heard of",
    blurb: "30 high-value international scholarships beginner applicants miss. S/A/B/C tier triage, 60-day picks, region strategy.",
    format: "24-page field guide",
    pricing: "free",
    status: "draft",
  },
  {
    slug: "pick-your-ten",
    route: "/pick-your-ten",
    title: "Pick Your 10 Programs in 7 Days",
    blurb: "From research paralysis to a locked, calibrated list of 10 programs. One day of structured prompts per day for a week.",
    format: "7-day email course",
    pricing: "free",
    status: "draft",
  },
  {
    slug: "personal-statement-workbook",
    route: "/personal-statement-workbook",
    title: "The Personal Statement Workbook",
    blurb: "Not a kit of \"winning essays\" to copy. The 5-move architecture of statements that land + 15 prompts that pull your version of each move + 10 phrases that auto-bin you.",
    format: "14-page workbook",
    pricing: "free",
    status: "draft",
  },
  // Paid
  {
    slug: "recommendation-letter-asks",
    route: "/recommendation-letter-asks",
    title: "Recommendation Letter Asks",
    blurb: "5 relationship archetypes × full ask + follow-up + thank-you email templates + the recommender packet that turns a generic letter into a specific one.",
    format: "22-page field guide",
    pricing: "$19",
    pill: "Field Guide N°2",
    sku: "recommendation_letter_asks",
    status: "draft",
  },
  {
    slug: "application-checklist",
    route: "/application-checklist",
    title: "The Application Submission Checklist",
    blurb: "The 72 hours before you hit submit. 17 procedural checks + 5 office-reject reasons + waitlist + interview prep templates.",
    format: "18-page field guide",
    pricing: "$19",
    pill: "Field Guide N°3",
    sku: "application_checklist",
    status: "draft",
  },
];

const publishedFromEnv: Set<string> = new Set(
  ((import.meta.env.VITE_PUBLISHED_PRODUCTS as string | undefined) ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

export const productStatus = (slug: string): ProductStatus => {
  if (publishedFromEnv.has(slug)) return "published";
  return PRODUCT_CATALOG.find((p) => p.slug === slug)?.status ?? "draft";
};

export const isPublished = (slug: string): boolean => productStatus(slug) === "published";

export const productBySlug = (slug: string): ProductCatalogEntry | undefined =>
  PRODUCT_CATALOG.find((p) => p.slug === slug);
