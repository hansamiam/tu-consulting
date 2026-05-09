/**
 * FundersIndex — top-level browse-by-funder page.
 *
 * Route: /scholarships/funders   (EN)
 *        /scholarships/funders/ru (RU)
 *
 * Lists every provider in the catalog with a non-zero
 * active_scholarships_count, grouped by trust_tier, sorted by
 * funding volume + active count within each section. Becomes a
 * new SEO surface (one URL listing all famous funders TopUni
 * tracks) AND a new browse axis for users who think "what does
 * Chevening offer?" instead of "which UK scholarships exist?".
 *
 * Each card links to the provider hub (/scholarships/by-provider/<slug>)
 * which renders the full per-funder list.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Globe } from "lucide-react";
import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type TrustTier = "high" | "medium" | "low" | "unknown";

interface ProviderRow {
  provider_id: string;
  slug: string;
  canonical_name: string;
  provider_type: string | null;
  host_country: string | null;
  description: string | null;
  trust_tier: TrustTier;
  scholarships_count: number;
  active_scholarships_count: number;
  total_award_volume_usd: number;
  established_year: number | null;
}

interface Props {
  language?: "en" | "ru";
}

const SITE = "https://topuni.org";

const PROVIDER_TYPE_LABEL_EN: Record<string, string> = {
  government: "Government",
  foundation: "Foundation",
  university: "University",
  corporation: "Corporate",
  ngo: "NGO",
  consortium: "Consortium",
  other: "Funder",
};

const PROVIDER_TYPE_LABEL_RU: Record<string, string> = {
  government: "Правительство",
  foundation: "Фонд",
  university: "Университет",
  corporation: "Корпорация",
  ngo: "НКО",
  consortium: "Консорциум",
  other: "Спонсор",
};

const formatCurrency = (n: number) => {
  if (!n) return "";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${n}`;
};

const FundersIndex = ({ language = "en" }: Props) => {
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const ru = language === "ru";
  const TYPES = ru ? PROVIDER_TYPE_LABEL_RU : PROVIDER_TYPE_LABEL_EN;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("providers")
        .select("provider_id, slug, canonical_name, provider_type, host_country, description, trust_tier, scholarships_count, active_scholarships_count, total_award_volume_usd, established_year")
        // Surface funders that have at least one tracked program OR
        // are seeded at trust_tier='high' (so the famous-funder list
        // doesn't disappear when their seed entries have zero scrapes).
        .or("active_scholarships_count.gt.0,trust_tier.eq.high")
        .order("trust_tier", { ascending: true })
        .order("active_scholarships_count", { ascending: false })
        .limit(200);
      if (cancelled) return;
      setProviders((data ?? []) as ProviderRow[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // Group by tier
  const grouped = useMemo(() => {
    const buckets: Record<TrustTier, ProviderRow[]> = { high: [], medium: [], low: [], unknown: [] };
    for (const p of providers) {
      buckets[p.trust_tier].push(p);
    }
    // Within each tier: sort by total volume DESC, then active count DESC
    for (const tier of Object.keys(buckets) as TrustTier[]) {
      buckets[tier].sort((a, b) => {
        if (b.total_award_volume_usd !== a.total_award_volume_usd) return b.total_award_volume_usd - a.total_award_volume_usd;
        return b.active_scholarships_count - a.active_scholarships_count;
      });
    }
    return buckets;
  }, [providers]);

  const totalActive = useMemo(() => providers.reduce((s, p) => s + p.active_scholarships_count, 0), [providers]);
  const totalFunders = providers.length;
  const totalVolume = useMemo(() => providers.reduce((s, p) => s + p.total_award_volume_usd, 0), [providers]);

  // SEO meta + JSON-LD
  useEffect(() => {
    const title = ru
      ? "Все фонды стипендий — TopUni"
      : "All scholarship funders — TopUni";
    const desc = ru
      ? "Полный каталог фондов стипендий, отслеживаемых TopUni — правительства, частные фонды, университеты и международные консорциумы. Только активные программы."
      : "Every scholarship funder TopUni tracks — governments, private foundations, universities, and international consortia. Active programs only, with verified amounts and deadlines.";
    const canonical = `${SITE}/scholarships/funders${ru ? "/ru" : ""}`;
    const prevTitle = document.title;
    document.title = title;

    const setMeta = (selector: string, attrs: Record<string, string>) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) { el = document.createElement("meta"); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); document.head.appendChild(el); }
      else { for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); }
    };
    setMeta('meta[name="description"]', { name: "description", content: desc });
    setMeta('meta[property="og:title"]', { property: "og:title", content: title });
    setMeta('meta[property="og:description"]', { property: "og:description", content: desc });
    setMeta('meta[property="og:url"]', { property: "og:url", content: canonical });
    setMeta('meta[property="og:type"]', { property: "og:type", content: "website" });

    let canonicalEl = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalEl) { canonicalEl = document.createElement("link"); canonicalEl.rel = "canonical"; document.head.appendChild(canonicalEl); }
    canonicalEl.href = canonical;

    return () => { document.title = prevTitle; };
  }, [ru]);

  const TIER_LABEL: Record<TrustTier, { en: string; ru: string }> = {
    high:    { en: "Verified funders", ru: "Проверенные фонды" },
    medium:  { en: "Recognised funders", ru: "Известные фонды" },
    low:     { en: "Other funders",    ru: "Другие фонды" },
    unknown: { en: "Recently discovered", ru: "Недавно обнаруженные" },
  };

  const TIER_BLURB: Record<TrustTier, { en: string; ru: string }> = {
    high:    {
      en: "Government programs, major foundations, and top-university scholarships we've manually verified as authoritative sources.",
      ru: "Правительственные программы, крупные фонды и стипендии ведущих университетов, чьи источники мы вручную подтвердили.",
    },
    medium:  {
      en: "Smaller-scope but well-known funders — regional foundations and single-university programs with strong reputations.",
      ru: "Менее крупные, но известные фонды — региональные программы и стипендии отдельных университетов с хорошей репутацией.",
    },
    low:     {
      en: "Funders we've identified but not yet manually verified.",
      ru: "Фонды, которые мы обнаружили, но ещё не подтвердили вручную.",
    },
    unknown: {
      en: "Funders auto-discovered by our scrape pipeline; awaiting manual review.",
      ru: "Фонды, обнаруженные автоматически; ожидают ручной проверки.",
    },
  };

  return (
    <main className="min-h-screen bg-background">
      <Navigation />

      <section className="border-b border-border bg-gradient-to-b from-card/40 to-background">
        <div className="container max-w-5xl px-6 py-12 lg:py-16">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-4">
            <Link to={ru ? "/discover/ru" : "/discover"} className="hover:text-foreground transition-colors">
              {ru ? "Поиск" : "Discover"}
            </Link>
            <span>/</span>
            <span>{ru ? "Все фонды" : "All funders"}</span>
          </div>

          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
              {ru ? "Все фонды, отслеживаемые TopUni" : "Every funder TopUni tracks"}
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-3xl mb-8">
              {ru
                ? "Браузим по фондам — правительства, крупные фонды, университеты и международные консорциумы. Кликните по фонду, чтобы увидеть все его активные программы."
                : "Browse by funder — governments, major foundations, universities, and international consortia. Click any funder to see every active program they offer."}
            </p>
            <div className="grid grid-cols-3 gap-3 max-w-2xl">
              <div className="rounded-xl border border-border bg-card/40 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {ru ? "Фондов" : "Funders"}
                </p>
                <p className="text-2xl font-bold text-foreground mt-1">{totalFunders}</p>
              </div>
              <div className="rounded-xl border border-border bg-card/40 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {ru ? "Активных программ" : "Active programs"}
                </p>
                <p className="text-2xl font-bold text-foreground mt-1">{totalActive}</p>
              </div>
              <div className="rounded-xl border border-border bg-card/40 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {ru ? "Общий объём" : "Combined funding"}
                </p>
                <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(totalVolume) || "—"}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="container max-w-5xl px-6 py-12 space-y-12">
        {(["high", "medium", "low", "unknown"] as TrustTier[]).map((tier) => {
          const list = grouped[tier];
          if (list.length === 0) return null;
          return (
            <div key={tier}>
              <div className="mb-5">
                <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-1.5">
                  {TIER_LABEL[tier][ru ? "ru" : "en"]} · {list.length}
                </p>
                <p className="text-sm text-muted-foreground max-w-3xl">
                  {TIER_BLURB[tier][ru ? "ru" : "en"]}
                </p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {list.map((p) => (
                  <Link
                    key={p.provider_id}
                    to={`/scholarships/by-provider/${p.slug}`}
                    className="group block rounded-xl border border-border bg-card hover:border-foreground/20 hover:shadow-md transition-all p-4"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-heading font-bold text-foreground tracking-tight leading-snug line-clamp-2 group-hover:text-gold-dark transition-colors text-sm">
                        {p.canonical_name}
                      </h3>
                      {tier === "high" && (
                        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground mb-2">
                      {p.provider_type && (
                        <span className="rounded-full bg-muted px-2 py-0.5">{TYPES[p.provider_type]}</span>
                      )}
                      {p.host_country && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5">
                          <Globe className="w-2.5 h-2.5" />
                          {p.host_country}
                        </span>
                      )}
                      {p.established_year && (
                        <span className="rounded-full bg-muted/60 px-2 py-0.5">{ru ? "Осн." : "Est."} {p.established_year}</span>
                      )}
                    </div>
                    <div className="flex items-baseline justify-between gap-2 text-[11px]">
                      <span className="text-foreground font-medium">
                        {p.active_scholarships_count > 0
                          ? `${p.active_scholarships_count} ${ru ? "активных" : "active"}`
                          : <span className="text-muted-foreground/60">{ru ? "Нет активных" : "No active programs"}</span>}
                      </span>
                      {p.total_award_volume_usd > 0 && (
                        <span className="text-muted-foreground tabular-nums">{formatCurrency(p.total_award_volume_usd)}</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}

        {!loading && providers.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p>{ru ? "Каталог фондов пока пуст." : "No funders in the catalog yet."}</p>
          </div>
        )}

        <div className="flex justify-center pt-4">
          <Button asChild variant="outline" className="gap-2">
            <Link to={ru ? "/discover/ru" : "/discover"}>
              {ru ? "Все стипендии" : "Browse all scholarships"} <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </section>

      <Footer language={language} />
    </main>
  );
};

export default FundersIndex;
