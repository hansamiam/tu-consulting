/**
 * ScholarshipDetail — public, SEO-targeted page per scholarship.
 *
 * /scholarships/:id loads full row data, renders an editorial detail
 * layout (eligibility, deadlines, awards, strategy notes), surfaces
 * "students who tracked this also tracked..." via pgvector, and
 * offers two CTAs: save to pipeline, or build a personalised strategy
 * brief that knows about THIS scholarship specifically.
 *
 * Each page is its own indexable URL with unique og/title/description
 * so search and social previews resolve specifically. With ~190
 * scholarships in the catalog this multiplies our SEO surface
 * meaningfully.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Award,
  Bookmark,
  BookmarkCheck,
  Calendar,
  Wallet,
  GraduationCap,
  Globe,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Users,
  ShieldAlert,
  Share2,
  Search,
  ShieldCheck,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { EDGE_FUNCTIONS_URL } from "@/lib/env";
import { useApplicationTracker } from "@/hooks/useApplicationTracker";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ShareScholarshipModal } from "@/components/ShareScholarshipModal";
import { EmptyState } from "@/components/EmptyState";
import { ScholarshipCard, type ScholarshipCardData } from "@/components/ScholarshipCard";
import { useTrackView, useScholarshipTracking } from "@/hooks/useScholarshipTracking";
import { EditorialCard } from "@/components/brief/primitives/EditorialCard";
import { PullQuote } from "@/components/brief/primitives/PullQuote";
import { EditorialProse } from "@/components/brief/primitives/EditorialProse";
import { LeadParagraph } from "@/components/brief/primitives/LeadParagraph";
import { ScholarshipDeepDive } from "@/components/scholarship/ScholarshipDeepDive";
import { ScholarshipOutcomesBlock } from "@/components/scholarship/ScholarshipOutcomesBlock";
import { getStoredProfile } from "@/components/discover/DiscoverProfileGate";
import { isAggregatorUrl } from "@/lib/aggregatorUrls";
import {
  cleanScholarshipName,
  cleanProvider,
  compactAward,
  displayField,
  humanizeDegreeLabel,
} from "@/lib/scholarshipFields";
import { shortCountry } from "@/lib/countryAccent";

interface Scholarship {
  scholarship_id: string;
  scholarship_name: string;
  provider_name: string | null;
  host_country: string | null;
  official_url: string | null;
  coverage_type: string;
  award_amount_text: string | null;
  estimated_total_value_usd: number | null;
  duration_text: string | null;
  renewable: boolean | null;
  target_degree_level: string[] | null;
  target_fields: string[] | null;
  partner_universities: string[] | null;
  eligible_countries: string[] | null;
  citizenship_requirements: string | null;
  age_limit: string | null;
  language_requirements: string | null;
  min_gpa: number | null;
  gpa_scale: number | null;
  min_ielts: number | null;
  min_toefl: number | null;
  min_sat: number | null;
  application_deadline: string | null;
  deadline_type: string | null;
  required_documents: string[] | null;
  essay_required: boolean | null;
  recommendation_letters_required: number | null;
  interview_required: boolean | null;
  application_fee_text: string | null;
  selectivity_level: string | null;
  effort_level: string | null;
  effort_reason: string | null;
  ideal_candidate_profile: string | null;
  weak_candidate_warning: string | null;
  common_rejection_reasons: string | null;
  strategy_notes: string | null;
  why_this_fits: string | null;
  how_to_win: string | null;
  what_to_prepare_first: string | null;
  next_step: string | null;
  risk_note: string | null;
  eligibility_requirements: string | null;
  last_verified_date: string | null;
  last_verified_at: string | null;
  verification_status: string | null;
  source_url: string | null;
  data_source: string | null;
  url_check_status: string | null;
  url_consecutive_fails: number | null;
  /* Canonical provider FK — added 20260509010000. NULL on legacy rows
   * whose provider_name didn't resolve to a known funder slug. */
  provider_id?: string | null;
}

type SimilarScholarship = ScholarshipCardData;

interface ScholarshipStats {
  save_count_total: number | null;
  save_count_7d: number | null;
  view_count_7d: number | null;
  trending_score: number | null;
}

interface ScholarshipDetailProps { language?: "en" | "ru"; }

const ScholarshipDetail = ({ language = "en" }: ScholarshipDetailProps) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const ru = language === "ru";
  const t = (en: string, rText: string) => (ru ? rText : en);
  const { user } = useAuth();
  const tracker = useApplicationTracker();
  const [s, setS] = useState<Scholarship | null>(null);
  const [similar, setSimilar] = useState<SimilarScholarship[]>([]);
  const [stats, setStats] = useState<ScholarshipStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  // More-from-funder rail — populated when this row is linked to a
  // canonical provider (provider_id NULL on legacy rows). Rail hides
  // when zero peers are returned.
  const [siblings, setSiblings] = useState<SimilarScholarship[]>([]);
  const [providerMeta, setProviderMeta] = useState<{ slug: string; canonical_name: string; trust_tier: "high"|"medium"|"low"|"unknown" } | null>(null);
  // Multi-source evidence chain — added 20260509050000. Each row is
  // one source URL (with authority + type). Rendered as a compact
  // "Confirmed by N sources" footer block.
  const [evidence, setEvidence] = useState<{ source_url: string; source_domain: string; source_type: string; authority: number; last_confirmed_at: string }[]>([]);
  const track = useScholarshipTracking();

  // Fire a 'viewed' event when the scholarship loads. The hook dedups
  // within a 60-second window so re-renders don't inflate counts.
  useTrackView(s?.scholarship_id, "detail");

  /* Fetch the scholarship */
  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("scholarships")
        .select("*")
        .eq("scholarship_id", id)
        .maybeSingle<Scholarship>();
      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setS(data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  /* Fetch aggregate stats for this scholarship (save count, recent
     views, trending). Drives the small social-proof line in the hero
     once the totals cross thresholds. The table is small (~200 rows),
     a single keyed select is cheap. Soft-fails. */
  useEffect(() => {
    if (!s?.scholarship_id) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("scholarship_stats")
          .select("save_count_total, save_count_7d, view_count_7d, trending_score")
          .eq("scholarship_id", s.scholarship_id)
          .maybeSingle<ScholarshipStats>();
        if (!cancelled) setStats(data ?? null);
      } catch { /* stats are nice-to-have, never block the page */ }
    })();
    return () => { cancelled = true; };
  }, [s?.scholarship_id]);

  /* Find similar scholarships using pgvector — same retrieval path
     Discover uses, just keyed off this row's content. */
  useEffect(() => {
    if (!s) return;
    let cancelled = false;
    (async () => {
      const queryText =
        `${s.scholarship_name}. ${s.provider_name ?? ""}. ${s.host_country ?? ""}. ` +
        `Coverage: ${s.coverage_type} ${s.award_amount_text ?? ""}. ` +
        `Fields: ${(s.target_fields ?? []).join(", ")}. Levels: ${(s.target_degree_level ?? []).join(", ")}.`;
      try {
        const { data } = await supabase.functions.invoke<{ matches: { scholarship_id: string; similarity: number }[] }>(
          "match-scholarships",
          { body: { query: queryText, limit: 8 } },
        );
        if (cancelled || !data?.matches) return;
        const ids = data.matches.map((m) => m.scholarship_id).filter((sid) => sid !== s.scholarship_id);
        if (ids.length === 0) return;
        // Apply the same visibility gate the catalog read-path uses —
        // pre-fix the similar-scholarships rail could surface 'broken'
        // (re-fetch failed) or 'closed_archived' rows because the .in()
        // filter wasn't joined with verification_status / lifecycle_status
        // predicates. The sibling-from-funder rail below already does this;
        // we missed it here.
        const { data: rows } = await supabase
          .from("scholarships")
          .select("scholarship_id, scholarship_name, provider_name, host_country, coverage_type, award_amount_text, estimated_total_value_usd, application_deadline, target_degree_level, target_fields, is_featured, why_this_fits, official_url")
          .in("scholarship_id", ids.slice(0, 8))
          .or("verification_status.is.null,verification_status.in.(verified,stale,pending)")
          .or("lifecycle_status.in.(active,reopens_annually),lifecycle_status.is.null")
          .limit(4);
        if (!cancelled) setSimilar(((rows as SimilarScholarship[]) ?? []));
      } catch (e) {
        // Silent failure — similar list is enrichment, not critical
        console.warn("similar scholarships failed", e);
      }
    })();
    return () => { cancelled = true; };
    // We intentionally key off the scholarship_id string rather than
    // the whole `s` object — re-running the similar-scholarship fetch
    // on every render where `s` is a new object reference (but the
    // id is unchanged) would burn rate limit. ESLint can't reason
    // through the optional chain, hence the suppress.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s?.scholarship_id]);

  /* Multi-source evidence — pulls every source that has confirmed
     this scholarship from public.scholarship_evidence (added
     20260509050000). Powers the "Confirmed by N sources" footer
     block. Soft-fails. */
  useEffect(() => {
    if (!s?.scholarship_id) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("scholarship_evidence")
          .select("source_url, source_domain, source_type, authority, last_confirmed_at")
          .eq("scholarship_id", s.scholarship_id)
          .order("authority", { ascending: false })
          .order("last_confirmed_at", { ascending: false });
        if (!cancelled && data) setEvidence(data as typeof evidence);
      } catch (e) {
        // Soft-fail; the block hides when the array is empty.
      }
    })();
    return () => { cancelled = true; };
  }, [s?.scholarship_id]);

  /* Provider metadata + sibling-from-funder rail. Pulls from the
     providers table (added 20260509010000) when this row is linked
     via provider_id, then fetches up to 4 active sibling scholarships
     from the same funder. Both queries soft-fail; legacy rows without
     provider_id silently skip and the rail hides. */
  useEffect(() => {
    if (!s?.provider_id) {
      setProviderMeta(null);
      setSiblings([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data: provider } = await supabase
          .from("providers")
          .select("slug, canonical_name, trust_tier")
          .eq("provider_id", s.provider_id)
          .maybeSingle<{ slug: string; canonical_name: string; trust_tier: "high"|"medium"|"low"|"unknown" }>();
        if (cancelled) return;
        if (provider) setProviderMeta(provider);

        const { data: siblingRows } = await supabase
          .from("scholarships")
          .select("scholarship_id, scholarship_name, provider_name, host_country, coverage_type, award_amount_text, estimated_total_value_usd, application_deadline, target_degree_level, target_fields, is_featured, why_this_fits, official_url")
          .eq("provider_id", s.provider_id)
          .neq("scholarship_id", s.scholarship_id)
          .or("verification_status.is.null,verification_status.in.(verified,stale,pending)")
          .or("lifecycle_status.in.(active,reopens_annually),lifecycle_status.is.null")
          .order("estimated_total_value_usd", { ascending: false, nullsFirst: false })
          .limit(4);
        if (!cancelled) setSiblings((siblingRows as SimilarScholarship[]) ?? []);
      } catch (e) {
        console.warn("provider sibling fetch failed", e);
      }
    })();
    return () => { cancelled = true; };
     
  }, [s?.provider_id, s?.scholarship_id]);

  /* SEO meta — unique per scholarship */
  useEffect(() => {
    if (!s) return;
    const cleanName = cleanScholarshipName(s.scholarship_name);
    const cleanProv = cleanProvider(s.provider_name);
    const cleanCountry = s.host_country ? shortCountry(s.host_country) : null;
    const title = ru
      ? `${cleanName} — требования, дедлайн, как подать | TopUni`
      : `${cleanName} — eligibility, deadline, application | TopUni`;
    const country = cleanCountry
      ? (ru ? ` Принимающая страна: ${cleanCountry}.` : ` Hosted in ${cleanCountry}.`)
      : "";
    const coverage =
      s.coverage_type === "full_ride" ? (ru ? "Полное покрытие — обучение и проживание." : "Full ride covering tuition + living.")
      : s.coverage_type === "tuition_only" ? (ru ? "Покрывает обучение." : "Covers tuition.")
      : (ru ? "Стипендия." : "Stipend.");
    const deadline = s.application_deadline
      ? (ru ? ` Дедлайн: ${s.application_deadline}.` : ` Deadline: ${s.application_deadline}.`)
      : "";
    const desc = ru
      ? `${cleanName}.${country} ${coverage}${deadline} Постройте персональную стратегию с TopUni AI бесплатно.`
      : `${cleanName}.${country} ${coverage}${deadline} Build a personalised strategy with TopUni AI free.`;
    const pathSuffix = ru ? "/ru" : "";
    const pageUrlAbs = `https://topuni.org/scholarships/${s.scholarship_id}${pathSuffix}`;
    document.title = title;
    setMeta("description", desc);
    setMeta("og:title", title, true);
    setMeta("og:description", desc, true);
    setMeta("og:type", "article", true);
    setMeta("og:url", pageUrlAbs, true);
    setMeta("og:locale", ru ? "ru_RU" : "en_US", true);
    // Per-scholarship OG image — generated dynamically by the og-scholarship
    // edge function. Every WhatsApp / X / LinkedIn / iMessage share now
    // unfurls into a beautiful gold-accented preview card with the
    // scholarship name, funding, country, and deadline urgency.
    const ogImageUrl = `${EDGE_FUNCTIONS_URL}/og-scholarship?id=${s.scholarship_id}`;
    setMeta("og:image", ogImageUrl, true);
    setMeta("og:image:width", "1200", true);
    setMeta("og:image:height", "630", true);
    setMeta("og:image:alt", `${cleanName} — TopUni`, true);
    setMeta("twitter:image", ogImageUrl);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", desc);
    setLink("canonical", pageUrlAbs);
    // hreflang alternates — tell Google these two URLs are translations of
    // each other, not duplicate content. Lowercase tags per RFC 5646.
    setLink("alternate", `https://topuni.org/scholarships/${s.scholarship_id}`, "en");
    setLink("alternate", `https://topuni.org/scholarships/${s.scholarship_id}/ru`, "ru");
    setLink("alternate", `https://topuni.org/scholarships/${s.scholarship_id}`, "x-default");

    // ── JSON-LD payload(s) ─────────────────────────────────────────────
    // Four structured-data graphs (each its own @id-able node):
    //   1. EducationalOccupationalCredential — the scholarship itself,
    //      enriched with image, audience, educationalLevel.
    //   2. MonetaryGrant — Google's recommended schema for funding rich
    //      results. Pulls in funder + amount + eligibleRegion +
    //      applicationDeadline so the SERP card can render those.
    //   3. BreadcrumbList — Home > Scholarships > {Country} > {Name}
    //      (skips country segment when host_country is unset). Lets
    //      Google show the breadcrumb path under the title in results.
    //   4. FAQPage — from the same fields visible on the page; supports
    //      "People also ask" rich snippets.
    // Pure SEO leverage on data we already have — no new content to
    // write, just signals Google's parser already understands.
    const pageUrl = `https://topuni.org/scholarships/${s.scholarship_id}`;
    const ogImage = ogImageUrl;

    const funder = cleanProv
      ? { "@type": "Organization", name: cleanProv }
      : undefined;

    const credential: Record<string, unknown> = {
      "@type": "EducationalOccupationalCredential",
      "@id": `${pageUrl}#credential`,
      name: cleanName,
      description: s.eligibility_requirements?.slice(0, 400) ?? desc,
      url: pageUrl,
      image: ogImage,
      credentialCategory: "scholarship",
      offers: s.award_amount_text
        ? { "@type": "Offer", description: s.award_amount_text }
        : undefined,
      validThrough: s.application_deadline ?? undefined,
      provider: funder,
      educationalLevel: Array.isArray(s.target_degree_level) && s.target_degree_level.length > 0
        ? s.target_degree_level.join(", ")
        : undefined,
      audience: Array.isArray(s.target_demographics) && s.target_demographics.length > 0
        ? { "@type": "EducationalAudience", educationalRole: s.target_demographics.join(", ") }
        : undefined,
      dateModified: s.last_verified_date ?? undefined,
    };

    const graph: object[] = [credential];

    // MonetaryGrant — only emit when we have an actual dollar figure or
    // award text; an empty grant node is worse than no node.
    if (s.estimated_total_value_usd || s.award_amount_text) {
      const grant: Record<string, unknown> = {
        "@type": "MonetaryGrant",
        "@id": `${pageUrl}#grant`,
        name: cleanName,
        description: s.award_amount_text ?? undefined,
        url: pageUrl,
        funder,
        about: { "@id": `${pageUrl}#credential` },
      };
      if (typeof s.estimated_total_value_usd === "number" && s.estimated_total_value_usd > 0) {
        grant.amount = {
          "@type": "MonetaryAmount",
          value: s.estimated_total_value_usd,
          currency: "USD",
        };
      }
      if (s.application_deadline) {
        grant.applicationDeadline = s.application_deadline;
      }
      // eligibleRegion: prefer the structured eligible_countries array
      // when present; fall back to host_country so the grant always has
      // some geographic context for the SERP.
      const regions = Array.isArray(s.eligible_countries) && s.eligible_countries.length > 0
        ? s.eligible_countries
        : (s.host_country ? [s.host_country] : []);
      if (regions.length > 0) {
        grant.eligibleRegion = regions.map((c) => ({ "@type": "Country", name: c }));
      }
      graph.push(grant);
    }

    // BreadcrumbList — Home > Scholarships > {Country} > {Name}.
    // Country segment only when we have one; the catalog hub still
    // reads as Scholarships > Name without it.
    const crumbs: { "@type": "ListItem"; position: number; name: string; item: string }[] = [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://topuni.org/" },
      { "@type": "ListItem", position: 2, name: "Scholarships", item: "https://topuni.org/discover" },
    ];
    if (cleanCountry) {
      crumbs.push({
        "@type": "ListItem",
        position: crumbs.length + 1,
        name: cleanCountry,
        item: `https://topuni.org/scholarships/${encodeURIComponent(cleanCountry.toLowerCase())}`,
      });
    }
    crumbs.push({
      "@type": "ListItem",
      position: crumbs.length + 1,
      name: cleanName,
      item: pageUrl,
    });
    graph.push({
      "@type": "BreadcrumbList",
      "@id": `${pageUrl}#breadcrumbs`,
      itemListElement: crumbs,
    });

    const faqEntities = buildFaqEntities(s, cleanName);
    if (faqEntities.length > 0) {
      graph.push({
        "@type": "FAQPage",
        "@id": `${pageUrl}#faq`,
        mainEntity: faqEntities,
      });
    }
    injectJsonLd({
      "@context": "https://schema.org",
      "@graph": graph,
    });
  }, [s]);

  const isShortlisted = !!s && tracker.shortlist.has(s.scholarship_id);
  const status = s ? tracker.statusMap[s.scholarship_id] : undefined;
  const days = s?.application_deadline ? Math.ceil((new Date(s.application_deadline).getTime() - Date.now()) / 86400_000) : null;

  /* Open TopUni AI with this scholarship pre-elevated into the brief flow.
     Two sessionStorage payloads, drained independently by the wizard /
     dashboard side: `topuni-focus-scholarship` keeps the brief generator
     pinned to THIS scholarship; `topuni-hub-context` pre-fills the wizard
     with the host country so the user lands on step 2 with it already
     selected. Skip the country prefill for global / multi-country
     scholarships where pinning a single country would mislead.
     Source label flows into telemetry so we can compare hero-CTA vs
     bottom-CTA conversion. */
  const goBuildStrategy = (source: "hero" | "footer") => {
    if (!s) return;
    try {
      sessionStorage.setItem(
        "topuni-focus-scholarship",
        JSON.stringify({
          scholarshipId: s.scholarship_id,
          scholarshipName: s.scholarship_name,
          ts: Date.now(),
        }),
      );
      const hostCountry = (s.host_country || "").trim();
      const isPinnableCountry =
        hostCountry.length > 0 &&
        !/global|multiple|european union|various/i.test(hostCountry);
      if (isPinnableCountry) {
        sessionStorage.setItem(
          "topuni-hub-context",
          JSON.stringify({
            kind: "scholarship",
            country: hostCountry,
            label: s.scholarship_name,
            ts: Date.now(),
          }),
        );
      }
    } catch { /* sessionStorage may be unavailable; CTA still works */ }
    track(s.scholarship_id, "clicked", source === "hero" ? "detail-hero-build-strategy" : "detail-build-strategy");
    navigate("/topuni-ai");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation language={language} />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
        <Footer language={language} />
      </div>
    );
  }

  if (notFound || !s) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation language={language} />
        <div className="max-w-xl mx-auto px-6 pt-12">
          <EmptyState
            icon={<Search />}
            title={t("Scholarship not found", "Стипендия не найдена")}
            description={t(
              "This scholarship doesn't exist or has been removed. Browse the full database in Discover.",
              "Этой стипендии нет или её удалили. Откройте полную базу в Discover.",
            )}
            cta={{ label: t("Open Discover", "Открыть Discover"), to: ru ? "/discover/ru" : "/discover" }}
            secondaryCta={{ label: t("Submit a scholarship", "Предложить стипендию"), to: ru ? "/submit/ru" : "/submit" }}
          />
        </div>
        <Footer language={language} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation language={language} />

      {/* HERO — editorial masthead matching the strategy-report magazine.
          The previous dark-navy block was the eyesore the user called
          out; replaced with a quiet cream/background hero where the
          serif name carries the page, tag chips sit beneath, and the
          action rail anchors below without competing. */}
      <section className="bg-background border-b border-border">
        <div className="max-w-[860px] mx-auto px-5 sm:px-8 pt-8 pb-12 sm:pb-16">
          <Link
            to={ru ? "/discover/ru" : "/discover"}
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground transition-colors mb-8 font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t("Back to Discover", "Назад в Discover")}
          </Link>
          <div className="flex items-center gap-3 mb-5">
            <span className="h-px w-8 bg-gold-dark/60" aria-hidden />
            <span className="font-heading text-[11px] uppercase tracking-[0.28em] text-gold-dark font-semibold">
              {s.host_country
                ? `${t("Scholarship", "Стипендия")} · ${shortCountry(s.host_country)}`
                : t("Scholarship", "Стипендия")}
            </span>
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold text-foreground tracking-[-0.025em] leading-[1.02] mb-4">
            {cleanScholarshipName(s.scholarship_name)}
          </h1>
          {(() => {
            const p = cleanProvider(s.provider_name);
            if (!p) return null;
            return providerMeta?.slug ? (
              <Link
                to={`/scholarships/by-provider/${providerMeta.slug}`}
                className="font-heading italic text-muted-foreground text-base sm:text-lg underline-offset-4 hover:text-foreground hover:underline mb-7 inline-block"
              >
                {p}
              </Link>
            ) : (
              <p className="font-heading italic text-muted-foreground text-base sm:text-lg mb-7">{p}</p>
            );
          })()}
          <div className="flex flex-wrap gap-2 mb-7">
            {s.coverage_type && (
              <span className="font-heading text-[11px] uppercase tracking-[0.18em] px-2.5 py-1 rounded-sm bg-gold/15 text-gold-dark font-semibold">
                {s.coverage_type === "full_ride" ? t("Full ride", "Полное")
                  : s.coverage_type === "tuition_only" ? t("Tuition only", "Только обучение")
                  : t("Stipend", "Стипендия")}
              </span>
            )}
            {(s.target_degree_level ?? []).slice(0, 3).map((d) => (
              <span key={d} className="font-heading text-[11px] uppercase tracking-[0.18em] px-2.5 py-1 rounded-sm bg-muted/60 text-foreground/75 font-semibold">
                {humanizeDegreeLabel(d)}
              </span>
            ))}
            {(() => {
              const fld = displayField(s.target_fields);
              return fld ? (
                <span key="field" className="font-heading text-[11px] uppercase tracking-[0.18em] px-2.5 py-1 rounded-sm bg-muted/60 text-foreground/75 font-semibold">
                  {fld}
                </span>
              ) : null;
            })()}
            {s.application_deadline && days !== null && (
              <span className={`font-heading text-[11px] uppercase tracking-[0.18em] px-2.5 py-1 rounded-sm font-semibold ${
                days <= 7 ? "bg-rose-500/15 text-rose-600 dark:text-rose-400" :
                days <= 30 ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" :
                "bg-muted/60 text-foreground/75"
              }`}>
                {days <= 0
                  ? t("Closed", "Закрыто")
                  : days === 1
                    ? t("1 day", "1 дн.")
                    : days <= 30
                      ? `${days} ${t("days left", "дн. осталось")}`
                      : `${Math.round(days / 30)} ${t("months", "мес.")}`}
              </span>
            )}
          </div>

          {/* Social proof — only shows once the row has crossed real
              critical mass on the platform. Kept quiet (single line, no
              icons) so it reinforces trust without screaming "marketing
              widget." Threshold mirrors ScholarshipCard's logic. */}
          {(() => {
            const totalSaves = stats?.save_count_total ?? 0;
            const recentSaves = stats?.save_count_7d ?? 0;
            const recentViews = stats?.view_count_7d ?? 0;
            if (totalSaves < 5 && recentViews < 25) return null;
            const parts: string[] = [];
            if (totalSaves >= 5) parts.push(`${totalSaves.toLocaleString()} ${t("students tracking this", "студентов отслеживают")}`);
            if (recentSaves >= 3) parts.push(`+${recentSaves} ${t("this week", "за неделю")}`);
            else if (recentViews >= 25) parts.push(`${recentViews.toLocaleString()} ${t("viewed in the past 7 days", "просмотров за 7 дней")}`);
            return (
              <p className="text-[12px] text-muted-foreground mb-5 tracking-wide">
                {parts.join(" · ")}
              </p>
            );
          })()}

          {/* Hero CTAs — primary action is "Build my strategy" because most
              traffic to this page is anonymous organic search, and the
              competitor-site Apply link was leaking that audience straight
              out of our funnel. The official link stays prominent (outline
              variant, with tracking) for visitors who just want to verify
              the scholarship is real.
              Round-41: applies the same isAggregatorUrl gate Discover uses
              — if official_url points at scholars4dev / opportunitiesforyouth
              / etc, we don't pretend it's the official site. The link
              still renders as "Open listing" so visitors can find their
              way to the actual provider, but with honest framing. */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="gold"
              size="lg"
              className="gap-2"
              onClick={() => goBuildStrategy("hero")}
            >
              <Award className="w-4 h-4" />
              {t("Build my strategy around this", "Построить стратегию вокруг этой стипендии")}
            </Button>
            {s.official_url && (() => {
              const aggregator = isAggregatorUrl(s.official_url);
              return (
                <Button
                  variant="outline"
                  size="lg"
                  asChild
                  className={`gap-2 ${aggregator ? "text-amber-700 border-amber-400/50 hover:bg-amber-500/10" : ""}`}
                >
                  <a
                    href={s.official_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => track(s.scholarship_id, "clicked", aggregator ? "detail-apply-aggregator" : "detail-apply-official")}
                  >
                    {aggregator
                      ? t("Open listing (third-party)", "Открыть на стороннем сайте")
                      : t("Apply on official site", "Подать на официальном сайте")}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              );
            })()}
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                tracker.toggleShortlist(s.scholarship_id);
                toast.success(isShortlisted
                  ? t("Removed from your pipeline", "Убрано из воронки")
                  : t("Saved to your pipeline", "Сохранено в воронку"));
              }}
              className="gap-2"
            >
              {isShortlisted ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              {isShortlisted ? t("Saved", "Сохранено") : t("Save to pipeline", "В воронку")}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => { setShareOpen(true); track(s.scholarship_id, "shared", "detail"); }}
              className="gap-2"
              aria-label={t("Share this scholarship", "Поделиться")}
            >
              <Share2 className="w-4 h-4" /> {t("Share", "Поделиться")}
            </Button>
          </div>
        </div>
      </section>

      <ShareScholarshipModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        scholarshipName={cleanScholarshipName(s.scholarship_name)}
        providerName={cleanProvider(s.provider_name)}
        scholarshipId={s.scholarship_id}
      />

      {/* Deadline urgency banner — surfaces above the fold when the deadline
          is within 14 days, or already passed, so visitors don't scroll past
          the chip and miss it. Hidden when there's plenty of time or no
          deadline on file. */}
      <DeadlineUrgencyBanner
        deadline={s.application_deadline}
        deadlineType={s.deadline_type}
        days={days}
      />

      {/* URL health warning */}
      {s.official_url && (s.url_consecutive_fails ?? 0) >= 3 && (
        <div className="max-w-4xl mx-auto px-5 sm:px-8 pt-6">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-500 leading-relaxed flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              {t(
                `Our weekly link-checker has failed to reach the official URL ${s.url_consecutive_fails}+ times. Verify the link still works before applying.`,
                `Еженедельная проверка не смогла открыть официальную ссылку ${s.url_consecutive_fails}+ раз. Проверьте ссылку перед подачей.`,
              )}
            </span>
          </div>
        </div>
      )}

      {/* TopUni member outcomes — auto-hides until a real cohort has
          actually applied (threshold=3). Once outcomes flow this becomes
          the trust signal aggregator sites can never produce. */}
      <div className="max-w-4xl mx-auto px-5 sm:px-8 pt-8">
        <ScholarshipOutcomesBlock scholarshipId={s.scholarship_id} />
      </div>

      {/* DETAIL GRID — editorial magazine layout.
          Sections are NOT rendered as undifferentiated card-shaped blocks
          anymore; each content type gets a visual treatment that matches
          its role (lead → drop-cap, warnings → toned cards, strategy
          notes → pull-quote, etc.). Sits within the same 860px measure
          as the hero so the reading column stays consistent. */}
      <section className="max-w-[860px] mx-auto px-5 sm:px-8 py-10 sm:py-14 space-y-12 sm:space-y-14">
        {/* Key facts row */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Fact icon={<Wallet />} label={t("Award", "Финансирование")} value={s.award_amount_text || compactAward(s) || (s.estimated_total_value_usd ? `~$${Math.round(s.estimated_total_value_usd / 1000)}K total` : "—")} />
          <Fact icon={<Calendar />} label={t("Deadline", "Дедлайн")} value={s.application_deadline ?? (s.deadline_type ?? t("varies", "разные"))} />
          <Fact icon={<GraduationCap />} label={t("Levels", "Уровни")} value={(s.target_degree_level ?? []).map(humanizeDegreeLabel).join(", ") || t("any", "любой")} />
          <Fact icon={<Globe />} label={t("Citizenship", "Гражданство")} value={s.citizenship_requirements ? truncate(s.citizenship_requirements, 60) : t("any", "любое")} />
        </div>

        {/* Personalized deep dive — calls scholarship-deep-dive edge fn with
            the visitor's locally-stored profile, renders match-score
            breakdown + odds + strategy + 30-day plan above the static
            scholarship info below. Soft-fails to a build-profile prompt
            when no profile is on file, or hides on edge-fn error.

            Sits BEFORE the editorial sections so a visitor with a stored
            profile sees the personalised verdict first — that is the
            value. The static eligibility / how-to-win prose below is the
            same for everyone and acts as the SEO body. */}
        {(() => {
          const stored = getStoredProfile();
          // The DiscoverProfile shape from getStoredProfile uses different
          // keys than our edge fn expects — adapt here.
          const profileForDive = stored ? {
            fullName: stored.fullName,
            nationality: stored.nationality,
            major: stored.fieldOfInterest,
            field: stored.fieldOfInterest,
            gradeLevel: stored.targetDegree,
            targetCountries: [],
            gpa: stored.gpa,
            ielts: stored.ieltsScore,
          } : null;
          return (
            <ScholarshipDeepDive
              scholarshipId={s.scholarship_id}
              profile={profileForDive}
              onBuildProfile={() => navigate("/discover")}
            />
          );
        })()}

        {/* WHY THIS FITS — editorial lead with drop cap. Sets the tone for
            the rest of the page: this is the personalised pitch for THIS
            scholarship and gets the front-of-magazine treatment. */}
        {s.why_this_fits && (
          <div>
            <Kicker label={t("Why this fits", "Почему это подходит")} centered />
            <LeadParagraph text={s.why_this_fits} />
          </div>
        )}

        {/* ELIGIBILITY + IDEAL CANDIDATE — paired sidebar cards. They
            answer the same reader question ("am I in scope?") from two
            angles (hard rules vs ideal profile) so they belong side by
            side on desktop. */}
        {(s.eligibility_requirements || s.ideal_candidate_profile) && (
          <div className="grid md:grid-cols-2 gap-4 sm:gap-5">
            {s.eligibility_requirements && (
              <EditorialCard accent="neutral">
                <CardKicker label={t("Eligibility", "Кто может подавать")} />
                <p className="font-heading text-foreground/85 text-[15.5px] leading-[1.7] whitespace-pre-line">
                  {s.eligibility_requirements}
                </p>
              </EditorialCard>
            )}
            {s.ideal_candidate_profile && (
              <EditorialCard accent="emerald">
                <CardKicker label={t("Ideal candidate", "Идеальный кандидат")} accent="emerald" />
                <p className="font-heading text-foreground/85 text-[15.5px] leading-[1.7] whitespace-pre-line">
                  {s.ideal_candidate_profile}
                </p>
              </EditorialCard>
            )}
          </div>
        )}

        {/* HARD THRESHOLDS — small-caps stat strip. Number-heavy data
            doesn't need prose; the tile grid reads like a stat-line at
            the top of a profile spread. */}
        {(s.min_gpa || s.min_ielts || s.min_toefl || s.min_sat) && (
          <div>
            <Kicker label={t("Hard thresholds", "Жёсткие пороги")} centered />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
              {s.min_gpa && <Fact label={t("GPA min", "GPA мин.")} value={`${s.min_gpa}/${s.gpa_scale ?? 4.0}`} />}
              {s.min_ielts && <Fact label={t("IELTS min", "IELTS мин.")} value={String(s.min_ielts)} />}
              {s.min_toefl && <Fact label={t("TOEFL min", "TOEFL мин.")} value={String(s.min_toefl)} />}
              {s.min_sat && <Fact label={t("SAT min", "SAT мин.")} value={String(s.min_sat)} />}
            </div>
          </div>
        )}

        {/* HOW TO WIN IT — main feature body. Centered kicker + serif
            body in editorial measure. */}
        {s.how_to_win && (
          <div>
            <Kicker label={t("How to win it", "Как выиграть")} centered />
            <EditorialProse text={s.how_to_win} />
          </div>
        )}

        {/* WHY PEOPLE GET REJECTED — rose-toned editorial card. The
            colour band signals "stop and read this" without screaming
            error-banner. */}
        {s.common_rejection_reasons && (
          <EditorialCard accent="rose">
            <CardKicker
              label={t("Why people get rejected", "Почему отказывают")}
              accent="rose"
              icon={<AlertCircle className="w-3.5 h-3.5" />}
            />
            <p className="font-heading text-foreground/85 text-[15.5px] leading-[1.7] whitespace-pre-line">
              {s.common_rejection_reasons}
            </p>
          </EditorialCard>
        )}

        {/* WEAK CANDIDATE WARNING — amber-toned. Distinct accent so it
            doesn't blur into the rose rejection-reasons block above. */}
        {s.weak_candidate_warning && (
          <EditorialCard accent="amber">
            <CardKicker
              label={t("Don't apply if…", "Не подавайте, если…")}
              accent="amber"
              icon={<ShieldAlert className="w-3.5 h-3.5" />}
            />
            <p className="font-heading text-foreground/85 text-[15.5px] leading-[1.7] whitespace-pre-line">
              {s.weak_candidate_warning}
            </p>
          </EditorialCard>
        )}

        {/* START HERE — gold action box. Matches the brief's
            "this month's action" treatment; this is the one concrete
            next step the visitor should take, so it gets the most
            actionable styling on the page. */}
        {s.what_to_prepare_first && (
          <div className="bg-gold/10 border-l-[3px] border-gold-dark px-5 sm:px-7 py-5 sm:py-6 rounded-r-sm">
            <p className="font-heading text-[10.5px] uppercase tracking-[0.28em] text-gold-dark font-semibold mb-2.5">
              {t("Start here", "Начните здесь")}
            </p>
            <p className="font-heading text-foreground text-base sm:text-[17px] leading-[1.6] whitespace-pre-line">
              {s.what_to_prepare_first}
            </p>
          </div>
        )}

        {/* STRATEGY NOTES — pull-quote. The notes are usually punchy
            one-liners (the strategist's hot take) so they read best as
            a magazine pull-quote, not a labelled prose block. */}
        {s.strategy_notes && (
          <PullQuote
            text={s.strategy_notes}
            label={t("Strategist's note", "Заметка стратега")}
          />
        )}

        {/* REQUIRED DOCUMENTS — checklist sidebar. Two-up grid on desktop
            so a long list doesn't stretch the page; checkmark icons
            telegraph "this is a packlist." */}
        {s.required_documents && s.required_documents.length > 0 && (
          <EditorialCard accent="neutral">
            <CardKicker label={t("Required documents", "Обязательные документы")} />
            <ul className="grid sm:grid-cols-2 gap-y-2.5 gap-x-6">
              {s.required_documents.map((d, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[15px] text-foreground/85 leading-[1.5]">
                  <CheckCircle2 className="w-4 h-4 text-gold-dark mt-0.5 shrink-0" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </EditorialCard>
        )}

        {/* PARTNER UNIVERSITIES — chip strip. List-shaped data, no need
            for prose treatment; small bordered chips keep visual
            hierarchy quiet so the focus stays on the CTAs below. */}
        {s.partner_universities && s.partner_universities.length > 0 && (
          <div>
            <Kicker label={t("Partner universities", "Партнёрские университеты")} centered />
            <div className="flex flex-wrap gap-2 max-w-2xl mx-auto justify-center">
              {s.partner_universities.map((u, i) => (
                <span
                  key={i}
                  className="text-[13px] font-medium bg-canvas-soft/60 border border-border/60 px-3 py-1.5 rounded-sm text-foreground/85"
                >
                  {u}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Reinforcement CTA — restated after the body for visitors who
            scrolled past the hero. Editorial framing instead of a generic
            shadcn card so it reads like the closing column of a feature
            spread, not a banner. */}
        <div className="border-t border-b border-border bg-canvas-soft/40 px-6 sm:px-10 py-10 sm:py-12 text-center -mx-5 sm:-mx-8">
          <div className="flex items-center gap-3 justify-center mb-5">
            <span className="h-px w-8 bg-gold-dark/60" aria-hidden />
            <span className="font-heading text-[11px] uppercase tracking-[0.28em] text-gold-dark font-semibold">
              {t("Don't just read — strategise", "Не только читайте — стройте стратегию")}
            </span>
            <span className="h-px w-8 bg-gold-dark/60" aria-hidden />
          </div>
          <h3 className="font-heading text-2xl sm:text-3xl font-bold tracking-[-0.02em] text-foreground mb-4 leading-[1.15] max-w-2xl mx-auto">
            {t(
              `Build a personal strategy that includes the ${cleanScholarshipName(s.scholarship_name)}.`,
              `Постройте персональную стратегию, включающую ${cleanScholarshipName(s.scholarship_name)}.`,
            )}
          </h3>
          <p className="font-heading text-foreground/75 text-[15.5px] leading-[1.65] max-w-xl mx-auto mb-7">
            {t(
              "TopUni AI takes your profile, ranks every scholarship in the database against you, and tells you specifically how to win this one — what to lead with, how to prep.",
              "TopUni AI берёт ваш профиль, ранжирует каждую стипендию в базе под вас и подсказывает, как выиграть именно эту — с чего начать, как готовиться.",
            )}
          </p>
          <Button
            variant="gold"
            size="lg"
            className="gap-2"
            onClick={() => goBuildStrategy("footer")}
          >
            {t("Build my strategy around this", "Построить стратегию вокруг этой стипендии")} <ArrowRight className="w-4 h-4" />
          </Button>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground mt-4 font-semibold">{t("60 seconds · Free", "60 секунд · Бесплатно")}</p>
        </div>

        {/* More from this funder — only renders when this row is linked
            to a canonical provider AND the funder has other active
            programs in the catalog. Compounds engagement: visiting "DAAD
            STEM Fellowship" surfaces the other 6 DAAD programs, none of
            which the user might have known existed. */}
        {siblings.length > 0 && providerMeta && (
          <div className="mb-12">
            <div className="flex items-baseline justify-between gap-3 mb-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-1.5">
                  {t("More from this funder", "Ещё от этого фонда")}
                </p>
                <h3 className="font-heading text-lg font-bold tracking-tight text-foreground">
                  {providerMeta.canonical_name}
                </h3>
              </div>
              <Link
                to={`/scholarships/by-provider/${providerMeta.slug}`}
                className="text-xs text-muted-foreground hover:text-gold-dark transition-colors hidden sm:inline-flex items-center gap-1"
              >
                {t("All scholarships", "Все стипендии")} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {siblings.map((sib, i) => (
                <ScholarshipCard
                  key={sib.scholarship_id}
                  row={sib}
                  index={i}
                  compact
                  onShare={(row) => {
                    const url = `${window.location.origin}/scholarships/${row.scholarship_id}`;
                    navigator.clipboard?.writeText(url).then(() => toast.success("Link copied"));
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Similar scholarships */}
        {similar.length > 0 && (
          <div>
            <div className="flex items-baseline justify-between gap-3 mb-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-1.5">
                  {t("Similar scholarships", "Похожие стипендии")}
                </p>
                <h3 className="font-heading text-lg font-bold tracking-tight text-foreground">
                  {t("Students who tracked this also tracked", "Студенты, которые отслеживали это, также отслеживали")}
                </h3>
              </div>
              <Link to={ru ? "/discover/ru" : "/discover"} className="text-xs text-muted-foreground hover:text-gold-dark transition-colors hidden sm:inline-flex items-center gap-1">
                {t("Browse all", "Смотреть все")} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {similar.map((sim, i) => (
                <ScholarshipCard
                  key={sim.scholarship_id}
                  row={sim}
                  index={i}
                  compact
                  onShare={(row) => {
                    setShareOpen(false);
                    // Hand off to a shared modal — easier than per-card state.
                    // For now: copy the URL to clipboard as a sensible fallback.
                    const url = `${window.location.origin}/scholarships/${row.scholarship_id}`;
                    navigator.clipboard?.writeText(url).then(() => toast.success("Link copied"));
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Source-evidence chain — multi-source provenance. Renders
            when ≥1 evidence rows exist (always, after the 20260509050000
            backfill seeded one row per existing source_url). Higher
            authority sources sort first. Aggregator competitors can't
            match this. */}
        {evidence.length > 0 && (
          <div className="pt-6 border-t border-border mb-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-3">
              {ru
                ? `Подтверждено: ${evidence.length} ${evidence.length === 1 ? "источник" : evidence.length < 5 ? "источника" : "источников"}`
                : `Confirmed by ${evidence.length} ${evidence.length === 1 ? "source" : "sources"}`}
            </p>
            <ul className="space-y-2">
              {evidence.slice(0, 6).map((e) => {
                const tone =
                  e.authority >= 3 ? "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10" :
                  e.authority >= 2 ? "text-blue-700 dark:text-blue-300 bg-blue-500/10" :
                  "text-muted-foreground bg-muted";
                const label =
                  e.source_type === "official_program_page" ? t("Official program page", "Официальная страница программы") :
                  e.source_type === "official_provider_site" ? t("Official funder site", "Официальный сайт фонда") :
                  e.source_type === "gov_doc" ? t("Government source", "Государственный источник") :
                  e.source_type === "university_listing" ? t("University listing", "Страница университета") :
                  e.source_type === "aggregator" ? t("Aggregator", "Агрегатор") :
                  e.source_type === "news" ? t("News article", "Новостная статья") :
                  t("Other", "Другое");
                return (
                  <li key={e.source_url} className="flex items-center gap-2 text-[12px]">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] ${tone}`}>
                      {label}
                    </span>
                    <a href={e.source_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground truncate">
                      {e.source_domain}
                    </a>
                  </li>
                );
              })}
            </ul>
            {evidence.length > 6 && (
              <p className="text-[11px] text-muted-foreground mt-2">+ {evidence.length - 6} {t("more", "ещё")}</p>
            )}
          </div>
        )}

        {/* Trust footer */}
        <div className="pt-6 border-t border-border flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className={`inline-block h-2 w-2 rounded-full ${
              s.data_source === "hand_curated" ? "bg-emerald-500" : "bg-amber-500"
            }`} />
            {t("Source", "Источник")}: {s.data_source === "hand_curated"
              ? t("Curated", "Курировано")
              : t("External research", "Внешний поиск")}
          </span>
          {/* Verified line — prefer the live last_verified_at timestamp
              (set by every verify-cron pass; reflects reality) and
              render as a relative "N days ago" so users feel the
              freshness instead of having to parse a date. Falls back to
              last_verified_date when only that text column is set. */}
          {(() => {
            if (s.last_verified_at) {
              const ms = Date.now() - new Date(s.last_verified_at).getTime();
              const days = Math.max(0, Math.floor(ms / 86400000));
              const label =
                days === 0
                  ? t("today", "сегодня")
                  : days === 1
                    ? t("1 day ago", "1 день назад")
                    : days < 30
                      ? `${days} ${t("days ago", "дней назад")}`
                      : `${Math.round(days / 30)} ${t("months ago", "мес. назад")}`;
              return (
                <span className="inline-flex items-center gap-1">
                  · {t("Verified", "Проверено")} <span className="font-semibold text-foreground/80">{label}</span>
                </span>
              );
            }
            if (s.last_verified_date) {
              return <span>· {t("Verified", "Проверено")} {s.last_verified_date}</span>;
            }
            return null;
          })()}
          <a
            href={`mailto:hello@topuni.com?subject=${encodeURIComponent("Inaccurate scholarship data: " + cleanScholarshipName(s.scholarship_name))}`}
            className="ml-auto underline hover:text-foreground"
          >
            {t("Report inaccuracy", "Сообщить об ошибке")}
          </a>
        </div>
      </section>

      <Footer language={language} />
    </div>
  );
};

export default ScholarshipDetail;

/* ─── Internals ─────────────────────────────────────────────────── */

/* Above-the-fold deadline banner. Three modes:
   - closed:    the deadline has passed → muted "applications closed" notice,
                with a nudge toward similar scholarships further down.
   - critical:  ≤ 7 days → red, urgent.
   - warning:   ≤ 30 days → amber, urgent-ish.
   Returns null otherwise (no banner = no visual noise on healthy listings).
   Rolling-deadline rows render a softer reminder regardless of countdown,
   since the absolute date drifts. */
const DeadlineUrgencyBanner = ({ deadline, deadlineType, days }: {
  deadline: string | null;
  deadlineType: string | null;
  days: number | null;
}) => {
  if (!deadline) return null;
  const isRolling = (deadlineType || "").toLowerCase().includes("rolling");

  if (days !== null && days <= 0) {
    return (
      <div className="max-w-4xl mx-auto px-5 sm:px-8 pt-6">
        <div className="rounded-lg border border-muted-foreground/20 bg-muted/30 px-4 py-3 text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold text-foreground">Applications closed.</span>{" "}
            The {deadline} deadline has passed. The strategy notes below still apply for next cycle —
            scroll for similar scholarships still accepting applications.
          </div>
        </div>
      </div>
    );
  }
  if (days !== null && days <= 7) {
    return (
      <div className="max-w-4xl mx-auto px-5 sm:px-8 pt-6">
        <div className="rounded-lg border border-red-400/40 bg-red-500/[0.06] px-4 py-3.5 text-sm text-red-700 dark:text-red-400 leading-relaxed flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold">
              {days === 1 ? "1 day to deadline." : `${days} days to deadline.`}
            </span>{" "}
            Closes {deadline}. If you weren't already drafting, you are now.
            Open the official site below to confirm submission requirements before you start.
          </div>
        </div>
      </div>
    );
  }
  if (days !== null && days <= 30) {
    return (
      <div className="max-w-4xl mx-auto px-5 sm:px-8 pt-6">
        <div className="rounded-lg border border-amber-400/40 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-800 dark:text-amber-400 leading-relaxed flex items-start gap-2">
          <Calendar className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold">{days} days to deadline</span> — closes {deadline}.
            Block out drafting time this week.
          </div>
        </div>
      </div>
    );
  }
  if (isRolling) {
    return (
      <div className="max-w-4xl mx-auto px-5 sm:px-8 pt-6">
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
          <Calendar className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Rolling deadline — applications reviewed as they arrive. Earlier is generally stronger;
            don't wait for the final advertised date.
          </span>
        </div>
      </div>
    );
  }
  return null;
};

/* Kicker — centered editorial small-caps label with thin gold rule
   bracketing the text. Used as the heading for non-card body sections
   (why-this-fits, how-to-win, hard-thresholds, partner-universities).
   Mirrors the SectionDivider treatment in the strategy report. */
const Kicker = ({ label, centered = false }: { label: string; centered?: boolean }) => (
  <div className={`flex items-center gap-3 mb-5 ${centered ? "justify-center" : ""}`}>
    <span className="h-px w-8 bg-gold-dark/60" aria-hidden />
    <span className="font-heading text-[11px] uppercase tracking-[0.28em] text-gold-dark font-semibold">
      {label}
    </span>
    {centered && <span className="h-px w-8 bg-gold-dark/60" aria-hidden />}
  </div>
);

/* CardKicker — small accented label used inside EditorialCard. Colour
   tracks the card's accent so warning cards (rose/amber) get a matching
   label, neutral cards default to gold. Optional leading icon for
   warn-style cards. */
const CardKicker = ({
  label,
  accent = "gold",
  icon,
}: {
  label: string;
  accent?: "gold" | "rose" | "amber" | "emerald";
  icon?: React.ReactNode;
}) => {
  const tone =
    accent === "rose" ? "text-rose-700 dark:text-rose-400"
    : accent === "amber" ? "text-amber-700 dark:text-amber-400"
    : accent === "emerald" ? "text-emerald-700 dark:text-emerald-400"
    : "text-gold-dark";
  return (
    <p className={`font-heading text-[10.5px] uppercase tracking-[0.28em] font-semibold mb-3 flex items-center gap-1.5 ${tone}`}>
      {icon}
      {label}
    </p>
  );
};

const Section = ({ title, body, children, tone = "neutral" }: {
  title: string; body?: string; children?: React.ReactNode; tone?: "neutral" | "warn";
}) => {
  const titleClass = tone === "warn" ? "text-amber-700 dark:text-amber-500" : "text-foreground";
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="h-px w-6 bg-gold-dark" />
        <h2 className={`text-[11px] uppercase tracking-[0.22em] font-semibold ${titleClass}`}>{title}</h2>
      </div>
      {body && (
        <p className="text-sm sm:text-base text-foreground/90 leading-relaxed whitespace-pre-line">
          {body}
        </p>
      )}
      {children}
    </div>
  );
};

const Fact = ({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) => (
  <div className="bg-muted/40 border border-border rounded-lg px-3 py-2.5">
    <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
      {icon && <span className="w-3 h-3 [&>*]:w-3 [&>*]:h-3">{icon}</span>}
      <span className="text-[10px] uppercase tracking-[0.18em] font-semibold">{label}</span>
    </div>
    <p className="text-sm font-semibold text-foreground tabular-nums">{value}</p>
  </div>
);

const Chip = ({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "warn" | "danger" }) => {
  const cls =
    tone === "danger" ? "border-red-300/40 text-red-200 bg-red-500/10"
    : tone === "warn" ? "border-amber-300/40 text-amber-200 bg-amber-500/10"
    : "border-primary-foreground/25 text-primary-foreground/85";
  return (
    <span className={`text-[11px] uppercase tracking-[0.18em] font-semibold px-2.5 py-1 rounded-full border ${cls}`}>
      {children}
    </span>
  );
};

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
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
function setLink(rel: string, href: string, hreflang?: string) {
  // For hreflang alternates we need a per-language tag, not a single
  // shared tag. Query selector includes [hreflang="..."] so each call
  // upserts its own <link> instead of overwriting siblings.
  const selector = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang])`;
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    if (hreflang) el.setAttribute("hreflang", hreflang);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}
function injectJsonLd(payload: object) {
  document.querySelectorAll('script[data-topuni-ld="true"]').forEach((n) => n.remove());
  const s = document.createElement("script");
  s.type = "application/ld+json";
  s.dataset.topuniLd = "true";
  // JSON.stringify doesn't escape "<" by default — a scholarship
  // name or eligibility text containing "</script>" would close the
  // tag early and inject arbitrary HTML into <head>. Replace the
  // unsafe sequences with unicode escapes so the JSON parser still
  // sees them but the HTML parser doesn't. Belt-and-suspenders since
  // our content is LLM-scraped, but cheap and correct.
  s.text = JSON.stringify(payload)
    .replace(/<\/script>/gi, "<\\/script>")
    .replace(/<!--/g, "<\\u0021--");
  document.head.appendChild(s);
}

/* FAQPage structured-data builder.
   Maps existing scholarship fields to natural-language Q/A pairs so search
   engines can surface this page as a FAQ rich-result. We only emit a
   question when its answer field is non-empty — empty Qs would dilute
   the schema. Answers are plain text (Google ignores HTML in answerText
   anyway). */
function buildFaqEntities(s: Scholarship, cleanedName?: string): object[] {
  const name = cleanedName ?? s.scholarship_name;
  const out: { "@type": "Question"; name: string; acceptedAnswer: { "@type": "Answer"; text: string } }[] = [];
  const push = (q: string, a: string | null | undefined) => {
    const text = (a ?? "").trim();
    if (!text) return;
    out.push({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: text.slice(0, 1500) },
    });
  };
  // Eligibility — most-searched question for any scholarship.
  push(`Who is eligible for the ${name}?`, s.eligibility_requirements);
  // Funding — combine coverage + amount into one rich answer.
  // The migration's CHECK constraint allows full_ride + full_tuition
  // (aliases) and stipend + stipend_only (aliases). Both forms exist
  // on legacy rows. Map every recognised value; only "unknown" or
  // null falls through to the generic line.
  const cov = s.coverage_type;
  const coverageWord =
    cov === "full_ride" || cov === "full_tuition" ? "a full ride covering tuition and living costs"
    : cov === "tuition_only" ? "tuition costs"
    : cov === "stipend" || cov === "stipend_only" ? "a living stipend"
    : cov === "partial" ? "partial funding"
    : "scholarship funding";
  const fundingParts: string[] = [`The ${name} provides ${coverageWord}.`];
  if (s.award_amount_text) fundingParts.push(s.award_amount_text);
  if (s.duration_text) fundingParts.push(`Duration: ${s.duration_text}.`);
  if (s.renewable === true) fundingParts.push("The award is renewable.");
  push(`What does the ${name} cover?`, fundingParts.join(" "));
  // Deadline — Google often surfaces deadlines in featured snippets.
  if (s.application_deadline) {
    const deadlineKind = s.deadline_type ? ` (${s.deadline_type.replace(/_/g, " ")})` : "";
    push(
      `When is the ${name} application deadline?`,
      `The ${name} application deadline is ${s.application_deadline}${deadlineKind}. Verify directly on the official site before submitting.`,
    );
  }
  // Strategy fields — these are AI-enriched, exactly the kind of nuance
  // students search for ("how to win {scholarship}").
  push(`How can I increase my chances of winning the ${name}?`, s.how_to_win);
  push(`Who is the ideal candidate for the ${name}?`, s.ideal_candidate_profile);
  push(`What should I prepare first for the ${name}?`, s.what_to_prepare_first);
  push(`Why do applicants get rejected from the ${name}?`, s.common_rejection_reasons);
  // Required docs — joined as a sentence so the answer reads naturally.
  if (s.required_documents && s.required_documents.length > 0) {
    push(
      `What documents are required for the ${name}?`,
      `Applicants typically need: ${s.required_documents.join("; ")}.`,
    );
  }
  return out;
}
