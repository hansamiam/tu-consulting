/**
 * ScholarshipsByFilter — SEO-targeted landing pages.
 *
 * One component renders three flavours of filter pages:
 *   /scholarships/by-country/:country   (e.g. "United Kingdom" → top UK scholarships)
 *   /scholarships/by-field/:field       (e.g. "Computer Science" → CS-relevant)
 *   /scholarships/theme/:theme          (e.g. "full-funding", "closing-soon")
 *
 * Each route is a real SEO target — unique <title>, <meta description>,
 * canonical URL, and JSON-LD ItemList structured data. The page funnels
 * into the AI brief generator above the fold (the highest-converting
 * action) and shows the matching scholarships below.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Search } from "lucide-react";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ScholarshipCard, ScholarshipCardSkeleton, type ScholarshipCardData, type ScholarshipCardStats } from "@/components/ScholarshipCard";
import { ShareScholarshipModal } from "@/components/ShareScholarshipModal";
import { EmptyState } from "@/components/EmptyState";
import { HubFactsBlock } from "@/components/discover/HubFactsBlock";
import { cleanScholarshipName, cleanProvider } from "@/lib/scholarshipFields";

interface ScholarshipRow extends ScholarshipCardData {
  official_url: string | null;
  data_source: string | null;
  citizenship_requirements: string | null;
  // Drives the demographic + meta themes (for-women, women-in-stem,
  // first-generation, refugees, need-based, lgbtq, etc.) and the
  // no-essay / rolling-deadline filters.
  target_demographics: string[] | null;
  essay_required: boolean | null;
  deadline_type: string | null;
}

type StatsById = Record<string, ScholarshipCardStats>;

type Mode = "country" | "field" | "theme" | "country-field";

interface PageMeta {
  h1: string;
  intro: string;
  title: string;       // <title>
  description: string; // <meta description>
  canonical: string;
}

const SITE = "https://topuni.org";

/* ─── URL slug helpers ─────────────────────────────────────────────── */
const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// We slugify country names and try to reverse-map back. For the
// reverse map we pre-list known country names + a few common
// alternatives.
const COUNTRY_SLUGS: Record<string, string> = {
  "united-states":          "United States",
  "united-kingdom":         "United Kingdom",
  "uk":                     "United Kingdom",
  "us":                     "United States",
  "usa":                    "United States",
  "canada":                 "Canada",
  "australia":              "Australia",
  "germany":                "Germany",
  "france":                 "France",
  "netherlands":            "Netherlands",
  "switzerland":            "Switzerland",
  "ireland":                "Ireland",
  "sweden":                 "Sweden",
  "norway":                 "Norway",
  "denmark":                "Denmark",
  "italy":                  "Italy",
  "spain":                  "Spain",
  "belgium":                "Belgium",
  "singapore":              "Singapore",
  "south-korea":            "South Korea",
  "japan":                  "Japan",
  "hong-kong":              "Hong Kong",
  "china":                  "China",
  "new-zealand":            "New Zealand",
  "uae":                    "United Arab Emirates",
  "united-arab-emirates":   "United Arab Emirates",
  "czech-republic":         "Czech Republic",
  "hungary":                "Hungary",
  "poland":                 "Poland",
  "estonia":                "Estonia",
  "turkey":                 "Turkey",
  "malaysia":               "Malaysia",
  "global":                 "Global",
};

const FIELD_SLUGS: Record<string, string> = {
  "computer-science":          "Computer Science",
  "engineering":               "Engineering",
  "business":                  "Business",
  "economics":                 "Economics",
  "medicine":                  "Medicine",
  "public-health":             "Public Health",
  "law":                       "Law",
  "social-sciences":           "Social Sciences",
  "arts-and-humanities":       "Arts and Humanities",
  "stem":                      "STEM",
};

// Demographic + meta themes for programmatic SEO. Each entry below
// becomes one indexable URL at /scholarships/theme/:slug. Predicates
// run against the same hydrated rows that fund the per-country and
// per-field hubs, so the catalog scales these pages automatically as
// new programs are added. Theme intros are purposely informational
// (not marketing) so AI-overview crawlers ingest them as factual
// summaries.
const THEMES: Record<string, { titlePart: string; predicate: (r: ScholarshipRow) => boolean; introHint: string }> = {
  "full-funding": {
    titlePart: "Fully-funded",
    predicate: (r) => r.coverage_type === "full_ride",
    introHint: "Programs that cover tuition AND living expenses — the full ride.",
  },
  "closing-soon": {
    titlePart: "Closing soon",
    predicate: (r) => {
      if (!r.application_deadline) return false;
      const d = Math.ceil((new Date(r.application_deadline).getTime() - Date.now()) / 86400_000);
      return d > 0 && d <= 60;
    },
    introHint: "Deadlines in the next 60 days — apply this season.",
  },
  "high-value": {
    titlePart: "Highest-value",
    predicate: (r) => (r.estimated_total_value_usd ?? 0) >= 80_000,
    introHint: "Programs with $80K+ total value over the full study period.",
  },
  "for-women": {
    titlePart: "For women",
    predicate: (r) => !!r.target_demographics?.some((d) => d === "women" || d === "underrepresented-stem"),
    introHint: "Scholarships specifically funding women's education abroad — including women-in-STEM programs.",
  },
  "women-in-stem": {
    titlePart: "Women in STEM",
    predicate: (r) => !!r.target_demographics?.includes("underrepresented-stem"),
    introHint: "Programs for women pursuing science, technology, engineering, or mathematics degrees.",
  },
  "first-generation": {
    titlePart: "First-generation",
    predicate: (r) => !!r.target_demographics?.includes("first-generation"),
    introHint: "Scholarships for the first in your family to attend college or university.",
  },
  "for-refugees": {
    titlePart: "For refugees & displaced students",
    predicate: (r) => !!r.target_demographics?.some((d) => d === "refugee" || d === "displaced"),
    introHint: "Programs for refugees, asylum seekers, and displaced students rebuilding their education abroad.",
  },
  "need-based": {
    titlePart: "Need-based",
    predicate: (r) => !!r.target_demographics?.includes("low-income"),
    introHint: "Scholarships that prioritise demonstrated financial need over merit alone.",
  },
  "underrepresented": {
    titlePart: "For underrepresented students",
    predicate: (r) => !!r.target_demographics?.some((d) => d === "underrepresented-minority" || d === "indigenous"),
    introHint: "Programs targeting historically underrepresented groups in higher education.",
  },
  "lgbtq": {
    titlePart: "For LGBTQ+ students",
    predicate: (r) => !!r.target_demographics?.includes("lgbtq"),
    introHint: "Scholarships explicitly inclusive of and dedicated to LGBTQ+ students.",
  },
  "no-essay": {
    titlePart: "No essay required",
    predicate: (r) => r.essay_required === false,
    introHint: "Programs that don't ask for a personal statement or supplemental essay — lower friction to apply.",
  },
  "rolling-deadline": {
    titlePart: "Rolling deadline",
    predicate: (r) => (r.deadline_type ?? "").toLowerCase() === "rolling",
    introHint: "Scholarships that accept applications year-round on a rolling basis.",
  },
};

interface Props {
  mode: Mode;
}

const ScholarshipsByFilter = ({ mode }: Props) => {
  const params = useParams<{ country?: string; field?: string; theme?: string }>();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ScholarshipRow[]>([]);
  const [statsById, setStatsById] = useState<StatsById>({});
  const [loading, setLoading] = useState(true);
  const [shareTarget, setShareTarget] = useState<ScholarshipRow | null>(null);

  /* Resolve the raw URL slug(s) → human-readable canonical(s).
     country-field mode reads BOTH slugs so the long-tail SEO URLs
     ("/scholarships/in/germany/computer-science") map cleanly. */
  const slug = (params.country || params.field || params.theme || "").toLowerCase();
  const fieldSlug = (params.field || "").toLowerCase();
  const resolved = useMemo<{ label: string; secondaryLabel?: string; valid: boolean; meta: PageMeta; theme?: keyof typeof THEMES }>(() => {
    if (mode === "country") {
      const label = COUNTRY_SLUGS[slug];
      if (!label) return { label: slug, valid: false, meta: blankMeta() };
      return {
        label,
        valid: true,
        meta: {
          h1: `Scholarships in ${label}`,
          title: `Scholarships in ${label} for international students — TopUni`,
          intro: `Verified scholarship programs hosted in ${label}. Match scores, eligibility, deadlines, and award amounts — all in one place.`,
          description: `Find scholarships in ${label} with full eligibility details, deadlines, and award amounts. Then build a personalised admissions strategy with TopUni AI.`,
          canonical: `${SITE}/scholarships/by-country/${slug}`,
        },
      };
    }
    if (mode === "field") {
      const label = FIELD_SLUGS[slug];
      if (!label) return { label: slug, valid: false, meta: blankMeta() };
      return {
        label,
        valid: true,
        meta: {
          h1: `${label} scholarships`,
          title: `${label} scholarships for international students — TopUni`,
          intro: `Programs that specifically fund ${label} studies abroad. Eligibility, award sizes, and deadlines from official sources.`,
          description: `Discover scholarships for ${label} students from around the world. Eligibility, award sizes, deadlines, plus a free AI strategy planner.`,
          canonical: `${SITE}/scholarships/by-field/${slug}`,
        },
      };
    }
    if (mode === "country-field") {
      const country = COUNTRY_SLUGS[slug];
      const field = FIELD_SLUGS[fieldSlug];
      if (!country || !field) return { label: slug, valid: false, meta: blankMeta() };
      return {
        label: country,
        secondaryLabel: field,
        valid: true,
        meta: {
          h1: `${field} scholarships in ${country}`,
          title: `${field} scholarships in ${country} for international students — TopUni`,
          intro: `${field}-specific scholarship programs hosted in ${country}. Verified, ranked against your profile, with deadlines and eligibility rules.`,
          description: `Find ${field.toLowerCase()} scholarships in ${country} for international students. Eligibility, award amounts, deadlines, plus a free AI strategy planner.`,
          canonical: `${SITE}/scholarships/in/${slug}/${fieldSlug}`,
        },
      };
    }
    // theme
    const theme = THEMES[slug as keyof typeof THEMES];
    if (!theme) return { label: slug, valid: false, meta: blankMeta() };
    return {
      label: theme.titlePart,
      valid: true,
      theme: slug as keyof typeof THEMES,
      meta: {
        h1: `${theme.titlePart} scholarships`,
        title: `${theme.titlePart} scholarships for international students — TopUni`,
        intro: theme.introHint,
        description: `${theme.titlePart} scholarships for international students. ${theme.introHint} Build a personalised plan free.`,
        canonical: `${SITE}/scholarships/theme/${slug}`,
      },
    };
  }, [mode, slug, fieldSlug]);

  /* Set page meta — title, description, canonical, full OG / Twitter */
  useEffect(() => {
    if (!resolved.valid) return;
    document.title = resolved.meta.title;
    setMeta("description", resolved.meta.description);
    setLink("canonical", resolved.meta.canonical);
    // Open Graph + Twitter — every share of these hub URLs (DMs, slack
    // channels, parents forwarding to advisors) now unfurls into a
    // proper preview card instead of bare URL text. Falls back to the
    // global TopUni og-brief image since per-filter dynamic OG would
    // be a separate lift.
    const ogImage = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/og-brief`;
    setMeta("og:title", resolved.meta.title, true);
    setMeta("og:description", resolved.meta.description, true);
    setMeta("og:type", "website", true);
    setMeta("og:url", resolved.meta.canonical, true);
    setMeta("og:site_name", "TopUni", true);
    setMeta("og:image", ogImage, true);
    setMeta("og:image:width", "1200", true);
    setMeta("og:image:height", "630", true);
    setMeta("og:image:alt", resolved.meta.h1, true);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", resolved.meta.title);
    setMeta("twitter:description", resolved.meta.description);
    setMeta("twitter:image", ogImage);
    return () => {
      // No teardown — leaving the title/meta on tab close is fine.
    };
  }, [resolved]);

  /* Fetch rows for this filter */
  useEffect(() => {
    if (!resolved.valid) {
      setRows([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      let q = supabase
        .from("scholarships")
        .select(
          "scholarship_id, scholarship_name, provider_name, host_country, " +
          "coverage_type, award_amount_text, estimated_total_value_usd, " +
          "application_deadline, target_degree_level, target_fields, " +
          "why_this_fits, official_url, data_source, is_featured, " +
          // Eligibility fields — drive the personal-match badge on every card
          "eligible_countries, min_gpa, gpa_scale, min_ielts, min_toefl, " +
          // Citizenship feeds the HubFactsBlock open-to-international heuristic
          "citizenship_requirements, " +
          // Drives the demographic / no-essay / rolling-deadline themes
          "target_demographics, essay_required, deadline_type",
        )
        // Public SEO surface — match the same trust filters Discover +
        // ScholarshipDetail apply. Without these gates the by-country /
        // by-field hub pages would surface broken-URL or closed-archived
        // rows to crawlers, hurting both SEO trust and applicant UX.
        .or("verification_status.is.null,verification_status.in.(verified,stale,pending)")
        .or("lifecycle_status.in.(active,reopens_annually),lifecycle_status.is.null")
        // Featured first, then by funding value — keeps the spotlights at the top
        .order("is_featured", { ascending: false })
        .order("estimated_total_value_usd", { ascending: false, nullsFirst: false })
        .limit(60);
      if (mode === "country") {
        q = q.eq("host_country", resolved.label);
      } else if (mode === "field") {
        // target_fields is a text[] — use overlaps for case-insensitive match by slug roots
        q = q.contains("target_fields", [resolved.label]);
      } else if (mode === "country-field" && resolved.secondaryLabel) {
        // Both filters — narrow to the (country × field) intersection.
        q = q.eq("host_country", resolved.label).contains("target_fields", [resolved.secondaryLabel]);
      }
      const { data } = await q;
      if (cancelled) return;
      let result = (data as ScholarshipRow[]) ?? [];
      if (mode === "theme" && resolved.theme) {
        result = result.filter(THEMES[resolved.theme].predicate);
      }
      // For field mode, contains() is exact; if zero hits, retry with a name LIKE search
      if (mode === "field" && result.length === 0) {
        const { data: fb } = await supabase
          .from("scholarships")
          .select(
            "scholarship_id, scholarship_name, provider_name, host_country, " +
            "coverage_type, award_amount_text, estimated_total_value_usd, " +
            "application_deadline, target_degree_level, target_fields, " +
            "why_this_fits, official_url, data_source, is_featured, " +
            "eligible_countries, min_gpa, gpa_scale, min_ielts, min_toefl",
          )
          // Same trust gates as the primary query — fallback path
          // shouldn't surface broken / archived rows either.
          .or("verification_status.is.null,verification_status.in.(verified,stale,pending)")
          .or("lifecycle_status.in.(active,reopens_annually),lifecycle_status.is.null")
          .ilike("eligibility_requirements", `%${resolved.label}%`)
          .limit(40);
        result = (fb as ScholarshipRow[]) ?? [];
      }
      setRows(result);
      // Hydrate stats for the visible rows so cards can render social-proof
      // badges. Single round-trip; the stats table is small (~200 rows).
      if (result.length > 0) {
        const ids = result.map((r) => r.scholarship_id);
        const { data: stats } = await supabase
          .from("scholarship_stats")
          .select("scholarship_id, save_count_total, save_count_7d, view_count_7d, trending_score")
          .in("scholarship_id", ids);
        if (!cancelled && stats) {
          const byId: StatsById = {};
          for (const s of stats) byId[s.scholarship_id] = s as ScholarshipCardStats & { scholarship_id: string };
          setStatsById(byId);
        }
      }
      // JSON-LD: ItemList + FAQPage in a single graph. The ItemList URLs
      // point to our INTERNAL /scholarships/:id detail pages — not the
      // external official_url — so Google indexes the hub→detail link
      // graph instead of treating these pages as outbound link farms.
      // Each detail page already emits its own structured data.
      // The FAQPage entries are seeded from the resolved hub label so
      // the page can rank for "are there scholarships in {country}",
      // "which {field} scholarships are best for international students",
      // etc — natural-language queries that map cleanly to this hub.
      if (result.length > 0) {
        const itemList = {
          "@type": "ItemList",
          name: resolved.meta.h1,
          description: resolved.meta.description,
          itemListElement: result.slice(0, 25).map((r, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: cleanScholarshipName(r.scholarship_name),
            url: `${SITE}/scholarships/${r.scholarship_id}`,
          })),
        };
        const faqEntities = buildHubFaqEntities(mode, resolved.label, result);
        const graph: object[] = [itemList];
        if (faqEntities.length > 0) {
          graph.push({
            "@type": "FAQPage",
            mainEntity: faqEntities,
          });
        }
        injectJsonLd({
          "@context": "https://schema.org",
          "@graph": graph,
        });
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [mode, resolved]);

  if (!resolved.valid) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-xl mx-auto px-6 pt-20 pb-32 text-center">
          <h1 className="font-heading text-2xl font-bold text-foreground mb-3">Filter not recognised</h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            We don't have a curated page for "{slug}" yet. Browse the full database in Discover.
          </p>
          <Button variant="gold" asChild>
            <Link to="/discover">Open Discover <ArrowRight className="ml-2 w-4 h-4" /></Link>
          </Button>
        </div>
        <Footer language="en" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* HERO ─────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-primary via-primary to-primary/95 py-14 sm:py-20">
        <div className="max-w-4xl mx-auto px-5 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-[11px] uppercase tracking-[0.22em] text-gold font-semibold mb-3">
              {mode === "country" ? "Country guide"
                : mode === "field" ? "Field guide"
                : mode === "country-field" ? "Country × Field"
                : "Theme"}
            </p>
            <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-primary-foreground tracking-tight leading-tight mb-4">
              {resolved.meta.h1}
            </h1>
            <p className="text-primary-foreground/80 text-base sm:text-lg leading-relaxed max-w-2xl">
              {resolved.meta.intro}
            </p>
            <div className="flex flex-wrap gap-2 mt-6">
              <Button
                variant="gold"
                size="lg"
                className="gap-2"
                onClick={() => {
                  stashHubContext(mode, resolved.label, slug);
                  navigate("/topuni-ai");
                }}
              >
                <Sparkles className="w-4 h-4" />
                {mode === "country" ? `Build my ${resolved.label} strategy`
                  : mode === "field" ? `Build my ${resolved.label} strategy`
                  : mode === "country-field" ? `Build my ${resolved.secondaryLabel} in ${resolved.label} strategy`
                  : "Build my personalised strategy"}
              </Button>
              <Button
                variant="outline"
                size="lg"
                asChild
                className="bg-transparent text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10"
              >
                <Link to="/discover">Browse the full database</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* RESULTS ─────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
        {/* HubFactsBlock — dynamic editorial-style block that summarises
            the actual data in plain English. Each (country / field /
            theme) page renders unique substantive content (top
            providers, coverage breakdown, top fields, deadline season,
            next deadline by name) that Google rewards over the generic
            templated intros aggregator competitors run. */}
        {!loading && rows.length > 0 && (
          <HubFactsBlock
            mode={mode}
            label={resolved.label}
            secondaryLabel={resolved.secondaryLabel}
            rows={rows.map(r => ({
              scholarship_id: r.scholarship_id,
              scholarship_name: r.scholarship_name,
              provider_name: r.provider_name,
              host_country: r.host_country,
              coverage_type: r.coverage_type,
              application_deadline: r.application_deadline,
              target_fields: r.target_fields,
              target_degree_level: r.target_degree_level,
              citizenship_requirements: r.citizenship_requirements ?? null,
            }))}
          />
        )}

        {/* Summary stats card — numeric aggregates that complement the
            facts block above. Mirrors the FAQPage schema announced to
            Google. Hidden on empty result set. */}
        {!loading && rows.length > 0 && <HubStatsCard rows={rows} />}

        <div className="flex items-baseline justify-between gap-3 mb-6">
          <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {loading ? "Loading…" : `${rows.length} ${rows.length === 1 ? "scholarship" : "scholarships"} matched`}
          </h2>
          <Link to="/discover" className="text-xs text-muted-foreground hover:text-gold-dark transition-colors hidden sm:inline-flex items-center gap-1">
            See all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <ScholarshipCardSkeleton key={i} index={i} />)}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Search />}
            title="No scholarships matched this filter yet"
            description="Our database is growing every day. Build a personalised strategy and our AI will surface the closest matches across the full database."
            cta={{ label: "Build my strategy", to: "/topuni-ai" }}
            secondaryCta={{ label: "Browse all", to: "/discover" }}
          />
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {rows.map((r, i) => (
              <ScholarshipCard
                key={r.scholarship_id}
                row={r}
                index={i}
                stats={statsById[r.scholarship_id]}
                onShare={(row) => setShareTarget(row as ScholarshipRow)}
              />
            ))}
          </div>
        )}

        {shareTarget && (
          <ShareScholarshipModal
            open={!!shareTarget}
            onOpenChange={(o) => !o && setShareTarget(null)}
            scholarshipName={cleanScholarshipName(shareTarget.scholarship_name)}
            providerName={cleanProvider(shareTarget.provider_name)}
            scholarshipId={shareTarget.scholarship_id}
          />
        )}

        {/* CLOSING CTA — contextualised to the filter (country / field /
            theme) so the value prop reads page-specific, not generic. */}
        {rows.length > 0 && (
          <div className="mt-14 pt-12 border-t border-border">
            <div className="bg-card border border-border rounded-2xl p-7 sm:p-9 text-center">
              <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-3">
                Don't browse — match
              </p>
              <h3 className="font-heading text-2xl font-bold tracking-tight text-foreground mb-3 leading-tight">
                {mode === "country"
                  ? <>These are the {resolved.label} listings.<br />Your strategy is personal.</>
                  : mode === "field"
                  ? <>These are public {resolved.label} programs.<br />Your strategy is personal.</>
                  : <>These are public listings.<br />Your strategy is personal.</>}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto mb-6">
                TopUni AI takes your GPA, scores, {mode === "country" ? `${resolved.label} as a target country, and field` : mode === "field" ? `${resolved.label} as your field, and target countries` : "target countries, and field"},
                then ranks every scholarship in the database against your profile and writes you a 90-day action plan.
              </p>
              <Button
                variant="gold"
                size="lg"
                className="gap-2"
                onClick={() => {
                  stashHubContext(mode, resolved.label, slug);
                  navigate("/topuni-ai");
                }}
              >
                Build my strategy free <ArrowRight className="w-4 h-4" />
              </Button>
              <p className="text-[11px] text-muted-foreground/70 mt-4">60 seconds. No credit card.</p>
            </div>

            {/* Hub-to-hub cross-links — strengthen the internal link graph
                so search crawlers see related hubs and visitors can pivot
                between countries/fields without bouncing back to /discover. */}
            <HubCrossLinks mode={mode} currentSlug={slug} />
          </div>
        )}
      </section>

      <Footer language="en" />
    </div>
  );
};

export default ScholarshipsByFilter;

/* Stash a hub-context payload for the brief wizard to drain. Mirrors
   the focus-scholarship handoff from ScholarshipDetail — sessionStorage
   key, 5-minute stale guard read on the consumer side. The wizard
   pre-selects the matching field on mount and shows a "Pre-filled
   from {hub}" indicator. */
function stashHubContext(mode: Mode, label: string, slug: string) {
  try {
    const payload: Record<string, unknown> = { kind: mode, label, ts: Date.now() };
    if (mode === "country") payload.country = label;
    else if (mode === "field") payload.field = label;
    else if (mode === "theme") payload.theme = slug;
    sessionStorage.setItem("topuni-hub-context", JSON.stringify(payload));
  } catch { /* sessionStorage unavailable; CTA still works */ }
}

/* Cross-links between hub pages.
   - Country hub → links to other countries + a few field hubs + themes
   - Field hub   → links to popular countries + other fields + themes
   - Theme hub   → links to top countries + top fields
   Ranking: prioritise high-priority destinations from the sitemap (US,
   UK, Canada, Australia, Germany; CS, Engineering, Business). The
   current page is excluded.

   Why this matters: the filter pages are sitemap-listed but currently
   have NO internal cross-links — Google and visitors both leave through
   /discover or the brief CTA. Adding a cross-link block strengthens the
   hub graph for both crawlers and users. */
const PRIMARY_COUNTRY_LINKS: { slug: string; label: string }[] = [
  { slug: "united-states",  label: "United States" },
  { slug: "united-kingdom", label: "United Kingdom" },
  { slug: "canada",         label: "Canada" },
  { slug: "australia",      label: "Australia" },
  { slug: "germany",        label: "Germany" },
  { slug: "netherlands",    label: "Netherlands" },
  { slug: "ireland",        label: "Ireland" },
  { slug: "singapore",      label: "Singapore" },
];
const PRIMARY_FIELD_LINKS: { slug: string; label: string }[] = [
  { slug: "computer-science",     label: "Computer Science" },
  { slug: "engineering",          label: "Engineering" },
  { slug: "business",             label: "Business" },
  { slug: "economics",            label: "Economics" },
  { slug: "medicine",             label: "Medicine" },
  { slug: "social-sciences",      label: "Social Sciences" },
];
const PRIMARY_THEME_LINKS: { slug: string; label: string }[] = [
  { slug: "full-funding",  label: "Fully-funded" },
  { slug: "closing-soon",  label: "Closing soon" },
  { slug: "high-value",    label: "Highest-value" },
];
const HubCrossLinks = ({ mode, currentSlug }: { mode: Mode; currentSlug: string }) => {
  const countries = PRIMARY_COUNTRY_LINKS.filter((l) => !(mode === "country" && l.slug === currentSlug));
  const fields    = PRIMARY_FIELD_LINKS.filter((l) => !(mode === "field"    && l.slug === currentSlug));
  const themes    = PRIMARY_THEME_LINKS.filter((l) => !(mode === "theme"    && l.slug === currentSlug));

  return (
    <div className="mt-12 pt-10 border-t border-border space-y-7">
      <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-semibold text-center">
        Browse other hubs
      </p>
      <CrossLinkRow heading="By country" basePath="/scholarships/by-country" items={countries.slice(0, 8)} />
      <CrossLinkRow heading="By field"   basePath="/scholarships/by-field"   items={fields.slice(0, 6)} />
      <CrossLinkRow heading="By theme"   basePath="/scholarships/theme"      items={themes.slice(0, 3)} />
    </div>
  );
};
const CrossLinkRow = ({ heading, basePath, items }: {
  heading: string;
  basePath: string;
  items: { slug: string; label: string }[];
}) => {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-3">{heading}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <Link
            key={it.slug}
            to={`${basePath}/${it.slug}`}
            className="text-xs text-foreground/85 hover:text-gold-dark border border-border hover:border-gold/40 bg-card px-3 py-1.5 rounded-full transition-colors"
          >
            {it.label}
          </Link>
        ))}
      </div>
    </div>
  );
};

/* Summary-stats card. Computes four numbers from the visible rows:
   total funding (USD, summed), full-ride count, count closing in 60d,
   and the largest single award. All numbers are computed locally — the
   card is honest if data is sparse (renders "—" rather than fabricating). */
const HubStatsCard = ({ rows }: { rows: ScholarshipRow[] }) => {
  const fullRides = rows.filter((r) => r.coverage_type === "full_ride").length;
  const closingSoon = rows.filter((r) => {
    if (!r.application_deadline) return false;
    const d = Math.ceil((new Date(r.application_deadline).getTime() - Date.now()) / 86400_000);
    return d > 0 && d <= 60;
  }).length;
  const totalUsd = rows.reduce((sum, r) => sum + (r.estimated_total_value_usd ?? 0), 0);
  const maxUsd = rows.reduce((m, r) => Math.max(m, r.estimated_total_value_usd ?? 0), 0);
  const fmtMoney = (v: number) =>
    !v ? "—" : v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `$${Math.round(v / 1000)}K` : `$${v}`;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border/60 border border-border/60 rounded-xl overflow-hidden mb-8">
      <Stat label="Total funding" value={fmtMoney(totalUsd)} hint="Estimated, summed across listed programs" />
      <Stat label="Full rides" value={String(fullRides)} hint="Tuition + living covered" />
      <Stat label="Closing in 60 days" value={String(closingSoon)} hint="Apply this season" />
      <Stat label="Largest single award" value={fmtMoney(maxUsd)} hint="Top program by total value" />
    </div>
  );
};
const Stat = ({ label, value, hint }: { label: string; value: string; hint: string }) => (
  <div className="bg-card p-4 sm:p-5">
    <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground mb-1.5">{label}</p>
    <p className="font-heading text-xl sm:text-2xl font-bold text-foreground tabular-nums leading-none mb-1.5">{value}</p>
    <p className="text-[11px] text-muted-foreground/80 leading-snug">{hint}</p>
  </div>
);

/* ─── DOM helpers for SEO meta ─────────────────────────────────────── */
function blankMeta(): PageMeta {
  return { h1: "", intro: "", title: "TopUni", description: "", canonical: SITE };
}
function setMeta(name: string, content: string, isProperty = false) {
  const sel = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  let el = document.querySelector(sel);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(isProperty ? "property" : "name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}
function setLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}
function injectJsonLd(payload: object) {
  // Replace any prior LD on this page
  document.querySelectorAll('script[data-topuni-ld="true"]').forEach((n) => n.remove());
  const s = document.createElement("script");
  s.type = "application/ld+json";
  s.dataset.topuniLd = "true";
  s.text = JSON.stringify(payload);
  document.head.appendChild(s);
}

/* Hub-level FAQ schema. The questions are templated against the page's
   filter label (country / field / theme) and the answers are seeded from
   the actual rows on the page so Google sees grounded, page-specific
   answers — not boilerplate. We emit only Qs whose answers we can compute
   from the data; an empty answer would dilute the schema. */
function buildHubFaqEntities(
  mode: Mode,
  label: string,
  rows: ScholarshipRow[],
): { "@type": "Question"; name: string; acceptedAnswer: { "@type": "Answer"; text: string } }[] {
  if (rows.length === 0) return [];
  const fullRides = rows.filter((r) => r.coverage_type === "full_ride").length;
  const closingSoon = rows.filter((r) => {
    if (!r.application_deadline) return false;
    const d = Math.ceil((new Date(r.application_deadline).getTime() - Date.now()) / 86400_000);
    return d > 0 && d <= 60;
  }).length;
  const totalUsd = rows.reduce((sum, r) => sum + (r.estimated_total_value_usd ?? 0), 0);
  const topFunding = [...rows]
    .filter((r) => r.estimated_total_value_usd && r.estimated_total_value_usd > 0)
    .sort((a, b) => (b.estimated_total_value_usd ?? 0) - (a.estimated_total_value_usd ?? 0))
    .slice(0, 3)
    .map((r) => cleanScholarshipName(r.scholarship_name));

  const fmtMoney = (v: number) =>
    v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `$${Math.round(v / 1000)}K` : `$${v}`;

  const out: { "@type": "Question"; name: string; acceptedAnswer: { "@type": "Answer"; text: string } }[] = [];
  const push = (q: string, a: string) => {
    if (!a || a.length < 10) return;
    out.push({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a.slice(0, 1500) },
    });
  };

  const subject =
    mode === "country" ? `scholarships in ${label}`
    : mode === "field" ? `scholarships for ${label}`
    : `${label.toLowerCase()} scholarships`;

  push(
    `Are there ${subject} for international students?`,
    `Yes — TopUni currently tracks ${rows.length} verified ${subject} for international applicants. ${
      fullRides > 0 ? `Of those, ${fullRides} are full rides covering tuition and living costs. ` : ""
    }${
      topFunding.length > 0 ? `Notable programs include ${topFunding.join(", ")}.` : ""
    }`.trim(),
  );

  if (closingSoon > 0) {
    push(
      `Which ${subject} are closing soon?`,
      `${closingSoon} of the ${subject} on this page have deadlines in the next 60 days. Check each scholarship page for the exact closing date and start drafting applications now.`,
    );
  }

  if (totalUsd > 0) {
    push(
      `How much funding is available across ${subject}?`,
      `The combined estimated funding across the ${rows.length} ${subject} listed here is approximately ${fmtMoney(totalUsd)}. Individual award sizes vary — see each scholarship page for specifics.`,
    );
  }

  push(
    `How do I find the right ${subject} for my profile?`,
    `Build a free TopUni AI strategy at topuni.org/topuni-ai — it ranks every scholarship in our database against your GPA, test scores, target countries, and field, and writes a personalized strategy tailored to your strongest matches.`,
  );

  return out;
}
