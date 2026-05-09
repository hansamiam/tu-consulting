/**
 * ProviderHub — SEO-targeted landing page for a single funder.
 *
 * Route: /scholarships/by-provider/:slug
 *
 * Renders rich provider metadata at the top (canonical name, type,
 * host country, founding year, description, official website, total
 * funding volume, scholarship count, trust badge) followed by every
 * scholarship linked to the provider via scholarships.provider_id.
 *
 * Why a dedicated page: aggregator competitors win SEO with one URL
 * per famous funder ("DAAD scholarships", "Schwarzman Scholars",
 * "Chevening"). We had country/field/theme hub pages but no provider
 * surface. The 20260509010000 + 020000 migrations give us the data;
 * this page surfaces it.
 *
 * Density: every (provider) URL gets unique substantive content
 * (the description column from the seed migration) plus a per-provider
 * facts strip (count, total volume, types of awards) so the page is
 * never thin.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Sparkles, Globe, ExternalLink, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  ScholarshipCard,
  ScholarshipCardSkeleton,
  type ScholarshipCardData,
} from "@/components/ScholarshipCard";
import { ShareScholarshipModal } from "@/components/ShareScholarshipModal";
import { EmptyState } from "@/components/EmptyState";

const SITE = "https://topuni.org";

interface ProviderRow {
  provider_id: string;
  slug: string;
  canonical_name: string;
  provider_type: string | null;
  host_country: string | null;
  official_website: string | null;
  description: string | null;
  trust_tier: "high" | "medium" | "low" | "unknown";
  scholarships_count: number;
  active_scholarships_count: number;
  total_award_volume_usd: number;
  avg_completeness_score: number | null;
  next_deadline: string | null;
  established_year: number | null;
}

interface ScholarshipRow extends ScholarshipCardData {
  official_url: string | null;
  data_source: string | null;
}

const TRUST_LABELS_EN: Record<ProviderRow["trust_tier"], { label: string; tone: "good" | "neutral" }> = {
  high: { label: "Verified funder", tone: "good" },
  medium: { label: "Recognised funder", tone: "good" },
  low: { label: "Limited verification", tone: "neutral" },
  unknown: { label: "Not yet verified", tone: "neutral" },
};
const TRUST_LABELS_RU: Record<ProviderRow["trust_tier"], { label: string; tone: "good" | "neutral" }> = {
  high: { label: "Проверенный фонд", tone: "good" },
  medium: { label: "Известный фонд", tone: "good" },
  low: { label: "Ограниченная проверка", tone: "neutral" },
  unknown: { label: "Ещё не проверен", tone: "neutral" },
};

const PROVIDER_TYPE_LABEL_EN: Record<string, string> = {
  government: "Government program",
  foundation: "Private foundation",
  university: "University-funded",
  corporation: "Corporate sponsor",
  ngo: "NGO / non-profit",
  consortium: "International consortium",
  other: "Funder",
};
const PROVIDER_TYPE_LABEL_RU: Record<string, string> = {
  government: "Правительственная программа",
  foundation: "Частный фонд",
  university: "Университетская стипендия",
  corporation: "Корпоративный спонсор",
  ngo: "НКО / некоммерческая организация",
  consortium: "Международный консорциум",
  other: "Спонсор",
};

const formatCurrency = (n: number) => {
  if (!n) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n}`;
};

interface Props {
  language?: "en" | "ru";
}

const ProviderHub = ({ language = "en" }: Props) => {
  const { slug } = useParams<{ slug: string }>();
  const ru = language === "ru";
  const t = (en: string, ruText: string) => (ru ? ruText : en);
  const TRUST_LABELS = ru ? TRUST_LABELS_RU : TRUST_LABELS_EN;
  const PROVIDER_TYPE_LABEL = ru ? PROVIDER_TYPE_LABEL_RU : PROVIDER_TYPE_LABEL_EN;
  const navigate = useNavigate();
  const [provider, setProvider] = useState<ProviderRow | null>(null);
  const [rows, setRows] = useState<ScholarshipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareTarget, setShareTarget] = useState<ScholarshipCardData | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    (async () => {
      const { data: providerData, error: providerErr } = await supabase
        .from("providers")
        .select(
          "provider_id, slug, canonical_name, provider_type, host_country, official_website, description, " +
          "trust_tier, scholarships_count, active_scholarships_count, total_award_volume_usd, " +
          "avg_completeness_score, next_deadline, established_year",
        )
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled) return;
      if (providerErr || !providerData) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setProvider(providerData as ProviderRow);

      const { data: scholarships } = await supabase
        .from("scholarships")
        .select(
          "scholarship_id, scholarship_name, provider_name, host_country, coverage_type, " +
          "award_amount_text, estimated_total_value_usd, application_deadline, target_degree_level, " +
          "target_fields, eligible_countries, citizenship_requirements, min_gpa, gpa_scale, min_ielts, " +
          "min_toefl, verification_status, last_verified_at, official_url, data_source, why_this_fits, " +
          "lifecycle_status",
        )
        .eq("provider_id", providerData.provider_id)
        .or("verification_status.is.null,verification_status.in.(verified,stale,pending)")
        .or("lifecycle_status.in.(active,reopens_annually),lifecycle_status.is.null")
        .order("estimated_total_value_usd", { ascending: false, nullsFirst: false })
        .limit(60);

      if (cancelled) return;
      setRows((scholarships ?? []) as unknown as ScholarshipRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const meta = useMemo(() => {
    if (!provider) return null;
    const title = ru
      ? `Стипендии ${provider.canonical_name} — TopUni`
      : `${provider.canonical_name} scholarships — TopUni`;
    const desc = ru
      ? (provider.description
          ? `${provider.description} Все активные стипендии ${provider.canonical_name}, отслеживаемые TopUni — подтверждённые суммы, дедлайны, требования.`
          : `Все активные стипендии ${provider.canonical_name}, отслеживаемые TopUni. Подтверждённые суммы, дедлайны, требования для международных студентов.`)
      : (provider.description
          ? `${provider.description} Browse every active ${provider.canonical_name} scholarship currently tracked by TopUni — verified amounts, deadlines, and eligibility.`
          : `Every active ${provider.canonical_name} scholarship currently tracked by TopUni. Verified amounts, deadlines, and eligibility for international students.`);
    const canonical = `${SITE}/scholarships/by-provider${ru ? "/ru" : ""}/${provider.slug}`;
    return { title, desc, canonical };
  }, [provider, ru]);

  // Hoist <title> + canonical + meta description + Article JSON-LD into <head>.
  useEffect(() => {
    if (!meta || !provider) return;
    const prevTitle = document.title;
    document.title = meta.title;

    const setMeta = (selector: string, attrs: Record<string, string>) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement("meta");
        for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
        document.head.appendChild(el);
      } else {
        for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      }
      return el;
    };

    const ds = [
      setMeta('meta[name="description"]', { name: "description", content: meta.desc }),
      setMeta('meta[property="og:title"]', { property: "og:title", content: meta.title }),
      setMeta('meta[property="og:description"]', { property: "og:description", content: meta.desc }),
      setMeta('meta[property="og:url"]', { property: "og:url", content: meta.canonical }),
      setMeta('meta[property="og:type"]', { property: "og:type", content: "website" }),
      setMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" }),
      setMeta('meta[name="twitter:title"]', { name: "twitter:title", content: meta.title }),
      setMeta('meta[name="twitter:description"]', { name: "twitter:description", content: meta.desc }),
    ];

    let canonicalEl = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement("link");
      canonicalEl.rel = "canonical";
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.href = meta.canonical;

    const ldId = "provider-hub-jsonld";
    const ldData = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: provider.canonical_name,
      url: provider.official_website ?? meta.canonical,
      description: provider.description ?? undefined,
      foundingDate: provider.established_year ? String(provider.established_year) : undefined,
      address: provider.host_country ? { "@type": "PostalAddress", addressCountry: provider.host_country } : undefined,
      sameAs: [meta.canonical],
    };
    let ldEl = document.getElementById(ldId) as HTMLScriptElement | null;
    if (!ldEl) {
      ldEl = document.createElement("script");
      ldEl.id = ldId;
      ldEl.type = "application/ld+json";
      document.head.appendChild(ldEl);
    }
    ldEl.text = JSON.stringify(ldData);

    return () => {
      document.title = prevTitle;
    };
  }, [meta, provider]);

  if (notFound) {
    return (
      <main className="min-h-screen bg-background">
        <Navigation />
        <div className="container max-w-2xl px-6 py-24">
          <EmptyState
            title={t("Provider not found", "Фонд не найден")}
            description={t(
              "We don't have a record for this funder yet. Browse all scholarships or pick a country instead.",
              "У нас пока нет записи об этом фонде. Посмотрите все стипендии или выберите страну.",
            )}
            action={
              <Button onClick={() => navigate(ru ? "/discover/ru" : "/discover")} className="gap-2">
                {t("Browse Discover", "К поиску")} <ArrowRight className="w-4 h-4" />
              </Button>
            }
          />
        </div>
        <Footer language={language} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <Navigation />

      {/* ─── Hero ───────────────────────────────────────────────────── */}
      <section className="border-b border-border bg-gradient-to-b from-card/40 to-background">
        <div className="container max-w-5xl px-6 py-12 lg:py-16">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-4">
            <Link to={ru ? "/discover/ru" : "/discover"} className="hover:text-foreground transition-colors">{t("Discover", "Поиск")}</Link>
            <span>/</span>
            <Link to={ru ? "/scholarships/funders/ru" : "/scholarships/funders"} className="hover:text-foreground transition-colors">{t("Funders", "Фонды")}</Link>
            <span>/</span>
            <span>{provider?.canonical_name ? t("Profile", "Профиль") : t("Funder", "Фонд")}</span>
          </div>

          {provider ? (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
                {provider.canonical_name}
              </h1>

              <div className="flex flex-wrap items-center gap-3 mb-6">
                {provider.trust_tier !== "unknown" && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${
                      TRUST_LABELS[provider.trust_tier].tone === "good"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" /> {TRUST_LABELS[provider.trust_tier].label}
                  </span>
                )}
                {provider.provider_type && (
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold bg-muted text-foreground">
                    {PROVIDER_TYPE_LABEL[provider.provider_type] ?? "Funder"}
                  </span>
                )}
                {provider.host_country && (
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold bg-muted text-foreground">
                    <Globe className="w-3.5 h-3.5" /> {provider.host_country}
                  </span>
                )}
                {provider.established_year && (
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold bg-muted text-muted-foreground">
                    {t("Est.", "Осн.")} {provider.established_year}
                  </span>
                )}
              </div>

              {provider.description && (
                <p className="text-base md:text-lg text-muted-foreground max-w-3xl mb-8">
                  {provider.description}
                </p>
              )}

              {/* Stats strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl">
                <div className="rounded-xl border border-border bg-card/40 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t("Active", "Активных")}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{provider.active_scholarships_count ?? 0}</p>
                </div>
                <div className="rounded-xl border border-border bg-card/40 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t("Total tracked", "Всего отслежено")}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{provider.scholarships_count ?? 0}</p>
                </div>
                <div className="rounded-xl border border-border bg-card/40 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t("Combined funding", "Общий объём")}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(provider.total_award_volume_usd)}</p>
                </div>
                <div className="rounded-xl border border-border bg-card/40 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t("Next deadline", "Ближайший дедлайн")}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {provider.next_deadline ? new Date(provider.next_deadline).toLocaleDateString(ru ? "ru-RU" : undefined, { month: "short", day: "numeric" }) : "—"}
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button onClick={() => navigate(ru ? "/topuni-ai/ru" : "/topuni-ai")} className="gap-2 bg-primary text-primary-foreground">
                  <Sparkles className="w-4 h-4" /> {t("Build my strategy", "Построить стратегию")}
                </Button>
                {provider.official_website && (
                  <Button asChild variant="outline" className="gap-2">
                    <a href={provider.official_website} target="_blank" rel="noopener noreferrer">
                      {t("Official site", "Официальный сайт")} <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="space-y-3">
              <div className="h-10 w-2/3 bg-muted/40 rounded animate-pulse" />
              <div className="h-4 w-full bg-muted/30 rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-muted/30 rounded animate-pulse" />
            </div>
          )}
        </div>
      </section>

      {/* ─── Scholarships list ──────────────────────────────────────── */}
      <section className="container max-w-5xl px-6 py-12">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-foreground">
            {provider
              ? (ru
                  ? `Активные стипендии ${provider.canonical_name}`
                  : `Active ${provider.canonical_name} scholarships`)
              : t("Scholarships", "Стипендии")}
          </h2>
          <Link to={ru ? "/discover/ru" : "/discover"} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t("See all →", "Все →")}
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <ScholarshipCardSkeleton key={i} />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title={t("No active scholarships right now", "Активных стипендий пока нет")}
            description={t(
              "This funder has no open programs in our catalog at the moment. Check back soon — we re-verify daily.",
              "У этого фонда сейчас нет открытых программ в нашем каталоге. Загляните позже — мы перепроверяем каждый день.",
            )}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {rows.map((row, idx) => (
              <ScholarshipCard
                key={row.scholarship_id}
                row={row}
                language={language}
                index={idx}
                onShare={(r) => setShareTarget(r)}
              />
            ))}
          </div>
        )}
      </section>

      {shareTarget && (
        <ShareScholarshipModal
          row={shareTarget}
          open={!!shareTarget}
          onOpenChange={(open) => !open && setShareTarget(null)}
        />
      )}

      <Footer language={language} />
    </main>
  );
};

export default ProviderHub;
