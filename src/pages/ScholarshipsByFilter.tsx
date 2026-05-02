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
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Globe, Sparkles, Loader2, ExternalLink, Calendar, Wallet } from "lucide-react";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface ScholarshipRow {
  scholarship_id: string;
  scholarship_name: string;
  provider_name: string | null;
  host_country: string | null;
  coverage_type: string;
  award_amount_text: string | null;
  estimated_total_value_usd: number | null;
  application_deadline: string | null;
  target_degree_level: string[] | null;
  target_fields: string[] | null;
  why_this_fits: string | null;
  official_url: string | null;
  data_source: string | null;
}

type Mode = "country" | "field" | "theme";

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
};

interface Props {
  mode: Mode;
}

const ScholarshipsByFilter = ({ mode }: Props) => {
  const params = useParams<{ country?: string; field?: string; theme?: string }>();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ScholarshipRow[]>([]);
  const [loading, setLoading] = useState(true);

  /* Resolve the raw URL slug → human-readable canonical */
  const slug = (params.country || params.field || params.theme || "").toLowerCase();
  const resolved = useMemo<{ label: string; valid: boolean; meta: PageMeta; theme?: keyof typeof THEMES }>(() => {
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
  }, [mode, slug]);

  /* Set page meta — title, description, canonical, JSON-LD */
  useEffect(() => {
    if (!resolved.valid) return;
    document.title = resolved.meta.title;
    setMeta("description", resolved.meta.description);
    setLink("canonical", resolved.meta.canonical);
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
          "why_this_fits, official_url, data_source",
        )
        .order("estimated_total_value_usd", { ascending: false, nullsFirst: false })
        .limit(60);
      if (mode === "country") {
        q = q.eq("host_country", resolved.label);
      } else if (mode === "field") {
        // target_fields is a text[] — use overlaps for case-insensitive match by slug roots
        q = q.contains("target_fields", [resolved.label]);
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
            "why_this_fits, official_url, data_source",
          )
          .ilike("eligibility_requirements", `%${resolved.label}%`)
          .limit(40);
        result = (fb as ScholarshipRow[]) ?? [];
      }
      setRows(result);
      // JSON-LD ItemList structured data — feeds Google's rich results
      if (result.length > 0) {
        injectJsonLd({
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: resolved.meta.h1,
          description: resolved.meta.description,
          itemListElement: result.slice(0, 25).map((r, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: r.scholarship_name,
            url: r.official_url || resolved.meta.canonical,
          })),
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
              {mode === "country" ? "Country guide" : mode === "field" ? "Field guide" : "Theme"}
            </p>
            <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-primary-foreground tracking-tight leading-tight mb-4">
              {resolved.meta.h1}
            </h1>
            <p className="text-primary-foreground/80 text-base sm:text-lg leading-relaxed max-w-2xl">
              {resolved.meta.intro}
            </p>
            <div className="flex flex-wrap gap-2 mt-6">
              <Button variant="gold" size="lg" asChild className="gap-2">
                <Link to="/topuni-ai">
                  <Sparkles className="w-4 h-4" />
                  Build my personalised strategy
                </Link>
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
        <div className="flex items-baseline justify-between gap-3 mb-6">
          <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {loading ? "Loading…" : `${rows.length} ${rows.length === 1 ? "scholarship" : "scholarships"} matched`}
          </h2>
          <Link to="/discover" className="text-xs text-muted-foreground hover:text-gold-dark transition-colors hidden sm:inline-flex items-center gap-1">
            See all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground leading-relaxed mb-5 max-w-sm mx-auto">
              We don't have curated scholarships matching this filter yet. Build a personalised strategy and our AI
              will pull the closest matches across the full database.
            </p>
            <Button variant="gold" asChild>
              <Link to="/topuni-ai">Build my strategy <ArrowRight className="ml-2 w-4 h-4" /></Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <ScholarshipRowCard key={r.scholarship_id} row={r} />
            ))}
          </div>
        )}

        {/* CLOSING CTA */}
        {rows.length > 0 && (
          <div className="mt-14 pt-12 border-t border-border">
            <div className="bg-card border border-border rounded-2xl p-7 sm:p-9 text-center">
              <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-3">
                Don't browse — match
              </p>
              <h3 className="font-heading text-2xl font-bold tracking-tight text-foreground mb-3 leading-tight">
                These are public listings.<br />Your strategy is personal.
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto mb-6">
                TopUni AI takes your GPA, scores, target countries, and field, then ranks every scholarship in the
                database against your profile and writes you a 90-day action plan.
              </p>
              <Button variant="gold" size="lg" asChild className="gap-2">
                <Link to="/topuni-ai">
                  Build my strategy free <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <p className="text-[11px] text-muted-foreground/70 mt-4">60 seconds. No credit card.</p>
            </div>
          </div>
        )}
      </section>

      <Footer language="en" />
    </div>
  );
};

export default ScholarshipsByFilter;

/* ─── A row card — minimal, scannable, click-through to detail ─── */
const ScholarshipRowCard = ({ row: r }: { row: ScholarshipRow }) => {
  const navigate = useNavigate();
  const value = r.estimated_total_value_usd;
  const valueText =
    value && value >= 1_000_000 ? `$${(value / 1_000_000).toFixed(1)}M`
    : value && value >= 1000     ? `$${Math.round(value / 1000)}K`
    : null;
  const days = r.application_deadline ? Math.ceil((new Date(r.application_deadline).getTime() - Date.now()) / 86400_000) : null;
  const daysText =
    days === null         ? r.application_deadline ? "Rolling" : "Varies"
    : days <= 0           ? "Closed"
    : days <= 30          ? `${days} days`
    : `${Math.ceil(days / 30)} months`;
  const daysClass =
    days === null ? "text-muted-foreground"
    : days <= 7   ? "text-destructive"
    : days <= 30  ? "text-amber-600 dark:text-amber-500"
    : "text-muted-foreground";

  return (
    <article
      onClick={() => navigate("/discover")}
      className="group relative bg-card border border-border rounded-xl p-4 sm:p-5 hover:border-gold/40 hover:shadow-sm transition-all cursor-pointer"
    >
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
          {r.host_country || "—"}
        </p>
        <span className={`text-[11px] tabular-nums font-semibold ${daysClass}`}>{daysText}</span>
      </div>
      <h3 className="font-heading font-semibold text-base sm:text-lg text-foreground tracking-tight leading-snug mb-1.5 group-hover:text-gold-dark transition-colors">
        {r.scholarship_name}
      </h3>
      {r.provider_name && (
        <p className="text-xs text-muted-foreground mb-2.5">{r.provider_name}</p>
      )}
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Wallet className="w-3 h-3" />
          {r.coverage_type === "full_ride" ? "Full ride" : r.coverage_type === "tuition_only" ? "Tuition" : "Stipend"}
          {valueText && ` · ${valueText}`}
        </span>
        {r.target_degree_level && r.target_degree_level.length > 0 && (
          <span>{r.target_degree_level.slice(0, 2).join(", ")}</span>
        )}
        {r.official_url && (
          <a
            href={r.official_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 ml-auto text-muted-foreground hover:text-foreground transition-colors"
          >
            Official site <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </article>
  );
};

/* ─── DOM helpers for SEO meta ─────────────────────────────────────── */
function blankMeta(): PageMeta {
  return { h1: "", intro: "", title: "TopUni", description: "", canonical: SITE };
}
function setMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
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
