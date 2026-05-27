/**
 * HubFactsBlock — dynamic editorial-style content block for the SEO
 * landing pages (/scholarships/by-country/:country, /by-field/:field,
 * /theme/:theme). Computes real, page-specific facts from the
 * underlying scholarship rows: top providers, coverage breakdown, top
 * fields/countries, citizenship patterns, deadline distribution.
 *
 * The whole point is content depth that Google rewards. A one-line
 * generic intro on every country page won't rank against aggregator
 * sites. A unique-per-page paragraph that actually says "Programs
 * include DAAD, Heinrich Böll Foundation, and Konrad-Adenauer
 * Stiftung; 28 are stipend-only, 15 cover tuition, 7 are full rides;
 * most reopen September-November; next deadline March 1" will.
 *
 * Pure presentational — the parent owns the row data; this block just
 * renders facts derived from it.
 */
import { cleanProvider } from "@/lib/scholarshipFields";
import { shortCountry } from "@/lib/countryAccent";

interface Row {
  scholarship_id: string;
  scholarship_name: string;
  provider_name: string | null;
  host_country: string | null;
  coverage_type: string;
  application_deadline: string | null;
  target_fields: string[] | null;
  target_degree_level: string[] | null;
  citizenship_requirements: string | null;
}

interface Props {
  mode: "country" | "field" | "theme" | "country-field";
  label: string;
  /** Used for country-field mode — the secondary label (the field
   *  when mode treats country as primary). */
  secondaryLabel?: string;
  rows: Row[];
}

// "full ride" entry stripped 2026-05-27 ("completely get rid of every
// single one"). Hub fact prose falls through to "fully funded" via the
// editorial template instead of naming the coverage bucket.
const COVERAGE_LABEL: Record<string, string> = {
  full_ride: "fully funded",
  tuition_only: "tuition only",
  stipend: "stipend",
  partial: "partial funding",
  travel: "travel grant",
  other: "other",
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Top N values from a string-array column (target_fields / degrees). */
function topFromArrayCol(rows: Row[], col: "target_fields" | "target_degree_level", limit: number): string[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const arr = r[col];
    if (!Array.isArray(arr)) continue;
    for (const v of arr) {
      if (!v) continue;
      const key = v.trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k);
}

/** Top N distinct providers by appearance count. */
function topProviders(rows: Row[], limit: number): string[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const cleaned = cleanProvider(r.provider_name);
    if (!cleaned) continue;
    counts.set(cleaned, (counts.get(cleaned) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k);
}

/** Top N host countries (used on field/theme pages). */
function topCountries(rows: Row[], limit: number): string[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (!r.host_country) continue;
    const c = shortCountry(r.host_country);
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k);
}

/** Coverage breakdown — how many of each funding shape. */
function coverageBreakdown(rows: Row[]): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const key = r.coverage_type || "other";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k, count]) => ({ label: COVERAGE_LABEL[k] ?? k, count }));
}

/** Distribution of deadlines by month — surfaces the "season" pattern. */
function deadlineMonths(rows: Row[]): { topMonths: string[]; nextDeadline: { name: string; date: string } | null } {
  const now = Date.now();
  const monthCounts = new Map<number, number>();
  let nextDeadline: { name: string; date: string; t: number } | null = null;
  for (const r of rows) {
    if (!r.application_deadline) continue;
    const t = new Date(r.application_deadline).getTime();
    if (Number.isNaN(t)) continue;
    if (t > now) {
      const m = new Date(t).getMonth();
      monthCounts.set(m, (monthCounts.get(m) ?? 0) + 1);
      if (!nextDeadline || t < nextDeadline.t) {
        nextDeadline = { name: r.scholarship_name, date: r.application_deadline, t };
      }
    }
  }
  const topMonths = [...monthCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([m]) => MONTH_NAMES[m]);
  return {
    topMonths,
    nextDeadline: nextDeadline ? { name: nextDeadline.name, date: nextDeadline.date } : null,
  };
}

/** True if most rows are open to international applicants (rough heuristic). */
function isMostlyOpen(rows: Row[]): boolean {
  const known = rows.filter((r) => r.citizenship_requirements && r.citizenship_requirements.length > 4);
  if (known.length < 5) return true; // not enough signal
  const restrictive = known.filter((r) => /must be|only|nationals|citizens of/i.test(r.citizenship_requirements!));
  return restrictive.length < known.length / 2;
}

const formatList = (items: string[]): string => {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
};

export const HubFactsBlock = ({ mode, label, secondaryLabel, rows }: Props) => {
  if (rows.length === 0) return null;

  const providers = topProviders(rows, 3);
  const coverage = coverageBreakdown(rows);
  const fields = topFromArrayCol(rows, "target_fields", 4);
  const countries = topCountries(rows, 4);
  const degrees = topFromArrayCol(rows, "target_degree_level", 3);
  const { topMonths, nextDeadline } = deadlineMonths(rows);
  const mostlyOpen = isMostlyOpen(rows);

  const total = rows.length;

  // Build the lead sentence — varies by mode so each page reads natural.
  const lead = (() => {
    if (mode === "country") {
      const provider = providers.length > 0 ? ` Programs include ${formatList(providers)}.` : "";
      const fieldFragment = fields.length > 0 ? ` Funding is concentrated in ${formatList(fields.slice(0, 3))}.` : "";
      return `${total} verified scholarship ${total === 1 ? "program" : "programs"} hosted in ${label} are currently active in our catalog.${provider}${fieldFragment}`;
    }
    if (mode === "field") {
      const country = countries.length > 0 ? ` Top host countries: ${formatList(countries)}.` : "";
      const provider = providers.length > 0 ? ` Notable funders include ${formatList(providers)}.` : "";
      return `${total} verified ${label} scholarship ${total === 1 ? "program" : "programs"} are currently in our catalog.${country}${provider}`;
    }
    if (mode === "country-field") {
      const provider = providers.length > 0 ? ` Programs include ${formatList(providers)}.` : "";
      return `${total} verified ${secondaryLabel ?? "field-specific"} scholarship ${total === 1 ? "program" : "programs"} hosted in ${label} are currently in our catalog.${provider}`;
    }
    // theme
    const country = countries.length > 0 ? ` Top host countries: ${formatList(countries)}.` : "";
    return `${total} ${label} ${total === 1 ? "program" : "programs"} currently active.${country}`;
  })();

  return (
    <div className="rounded-2xl border border-border bg-card/50 p-5 sm:p-7 mb-8">
      <p className="text-[10px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-3">
        At a glance
      </p>
      <p className="text-[15px] sm:text-base text-foreground/85 leading-relaxed mb-5">
        {lead}
      </p>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-[13px]">
        {coverage.length > 0 && (
          <Row label="Funding shape">
            {coverage.map((c, i) => (
              <span key={c.label}>
                <strong className="text-foreground tabular-nums">{c.count}</strong> {c.label}
                {i < coverage.length - 1 ? " · " : ""}
              </span>
            ))}
          </Row>
        )}
        {mode !== "field" && mode !== "country-field" && fields.length > 0 && (
          <Row label="Top fields">
            {formatList(fields)}
          </Row>
        )}
        {mode !== "country" && mode !== "country-field" && countries.length > 0 && (
          <Row label="Top countries">
            {formatList(countries)}
          </Row>
        )}
        {degrees.length > 0 && (
          <Row label="Levels">
            {formatList(degrees.map(humanizeDegree))}
          </Row>
        )}
        {mostlyOpen && (
          <Row label="Open to">
            Most are open to international applicants — citizenship-restricted programs are flagged on each card.
          </Row>
        )}
        {topMonths.length > 0 && (
          <Row label="Deadline season">
            Most deadlines fall in {formatList(topMonths)}{nextDeadline ? `; next on ${formatLongDate(nextDeadline.date)} (${cleanShortName(nextDeadline.name)})` : ""}.
          </Row>
        )}
      </dl>
    </div>
  );
};

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-0.5">
    <dt className="text-[10px] uppercase tracking-[0.16em] font-semibold text-muted-foreground">{label}</dt>
    <dd className="text-foreground/85 leading-relaxed">{children}</dd>
  </div>
);

function humanizeDegree(s: string): string {
  const k = s.toLowerCase();
  if (k.includes("bachelor") || k.includes("undergrad")) return "Bachelor's";
  if (k.includes("master")) return "Master's";
  if (k.includes("phd") || k.includes("doctor")) return "PhD";
  if (k.includes("foundation")) return "Foundation year";
  if (k.includes("post-doc") || k.includes("postdoc")) return "Postdoc";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

function cleanShortName(s: string): string {
  const trimmed = s.replace(/[‑–—]/g, "-").replace(/\s+/g, " ").trim();
  return trimmed.length <= 50 ? trimmed : trimmed.slice(0, 47).replace(/\s+\S*$/, "") + "…";
}
