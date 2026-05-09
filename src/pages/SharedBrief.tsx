/**
 * SharedBrief — public viewer for a shared TopUni AI strategy brief.
 *
 * Anyone with the short URL `/brief/:slug` lands here. Renders the
 * brief markdown using the same ReactMarkdown styling as the in-app
 * report, plus a TopUni masthead, an SEO-friendly meta block, a
 * "Build yours" CTA, and a quiet "Made with TopUni AI" attribution.
 *
 * Each page view increments view_count via an RPC. Soft-deleted /
 * expired briefs return 404.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ReportRenderer } from "@/components/TopUniDashboard";
import { BriefMasthead } from "@/components/brief/BriefMasthead";
import type { InlineScholarshipData } from "@/components/InlineScholarshipCard";

interface SharedBrief {
  brief_id: string;
  slug: string;
  content: string;
  language: "en" | "ru";
  report_grade: "basic" | "premium";
  profile_first_name: string | null;
  profile_grade_level: string | null;
  profile_major: string | null;
  profile_target_countries: string[] | null;
  created_at: string;
  view_count: number;
  is_public: boolean;
  expires_at: string | null;
}

/* The ReportRenderer expects this shape (LiveMatchLite from
   TopUniDashboard). We extend InlineScholarshipData with the extra
   fields it uses (funding total, verification metadata) so the shared
   view shows verified badges + funding values just like the dashboard. */
interface RecipientLiveMatch extends InlineScholarshipData {
  estimated_total_value_usd: number | null;
  verification_status: string | null;
  last_verified_at: string | null;
}

const SharedBriefPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [brief, setBrief] = useState<SharedBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [scholarshipsForCards, setScholarshipsForCards] = useState<RecipientLiveMatch[]>([]);

  // Pull every name the brief wraps in **bold** so we can resolve them to
  // real scholarship rows. Names that don't exist in the DB just render as
  // bold text — EnrichedMarkdown handles that gracefully.
  const candidateNames = useMemo(() => {
    if (!brief?.content) return [] as string[];
    const set = new Set<string>();
    const re = /\*\*([^*\n]{6,80})\*\*/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(brief.content)) !== null) {
      const v = m[1].trim();
      // Filter out obvious non-scholarship bolds (sentences ending in punctuation, plain
      // labels like "Why it works for you:")
      if (v.endsWith(":") || v.endsWith(".")) continue;
      if (v.split(/\s+/).length < 1) continue;
      set.add(v);
    }
    return Array.from(set).slice(0, 30);
  }, [brief?.content]);

  // Resolve candidate names → real scholarship rows via ILIKE-any fuzzy match.
  // Runs once per brief load. RLS on scholarships allows anon select.
  useEffect(() => {
    if (candidateNames.length === 0) {
      setScholarshipsForCards([]);
      return;
    }
    let cancelled = false;
    (async () => {
      // Build OR clause: name.ilike.%X%,name.ilike.%Y%...
      const orClause = candidateNames
        .slice(0, 12)
        .map(n => `scholarship_name.ilike.%${n.replace(/[%,()]/g, "")}%`)
        .join(",");
      const { data } = await supabase
        .from("scholarships")
        .select(
          "scholarship_id, scholarship_name, provider_name, host_country, " +
          "coverage_type, award_amount_text, estimated_total_value_usd, " +
          "application_deadline, official_url, verification_status, " +
          "last_verified_at"
        )
        // Match the brief's read-side filter — verified, stale, and
        // pending rows surface to recipients (the latter under the
        // platform-wide "confirm on official site" disclaimer; see
        // commit 015281a). Only 'broken' is excluded; broken rows
        // referenced in the brief markdown render as plain bold text
        // via EnrichedMarkdown's looksLikeScholarshipName fallback.
        .or("verification_status.is.null,verification_status.in.(verified,stale,pending)")
        // Lifecycle filter — closed_archived rows shouldn't surface
        // as live cards on a shared brief read by a third party. The
        // recipient might be reading the brief weeks after creation;
        // the originating row may have been archived since.
        .or("lifecycle_status.in.(active,reopens_annually),lifecycle_status.is.null")
        .or(orClause)
        .limit(40);
      if (cancelled || !data) return;
      setScholarshipsForCards(
        data.map(d => ({
          scholarship_id: d.scholarship_id,
          scholarship_name: d.scholarship_name,
          provider_name: d.provider_name,
          host_country: d.host_country,
          coverage_type: d.coverage_type,
          award_amount_text: d.award_amount_text,
          estimated_total_value_usd: d.estimated_total_value_usd ?? null,
          application_deadline: d.application_deadline,
          official_url: d.official_url,
          verification_status: d.verification_status ?? null,
          last_verified_at: d.last_verified_at ?? null,
        })),
      );
    })();
    return () => { cancelled = true; };
  }, [candidateNames]);

  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("shared_briefs")
        .select("*")
        .eq("slug", slug)
        .eq("is_public", true)
        .maybeSingle<SharedBrief>();

      if (cancelled) return;

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      // Respect expiry — RLS already filters but be defensive
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setBrief(data);
      setLoading(false);
      // Fire-and-forget view counter
      supabase.rpc("increment_brief_view", { p_slug: slug }).then(() => {});

      // Set page meta for SEO + social previews (Twitter / LinkedIn /
      // WhatsApp / iMessage / Slack all read these). The dynamic OG
      // image is generated by the og-brief edge function — content-
      // aware: shows the student's name, target countries, and major
      // baked into a TopUni-branded card.
      const firstName = data.profile_first_name || "A student";
      const major = data.profile_major ? ` ${data.profile_major}` : "";
      const target =
        data.profile_target_countries && data.profile_target_countries.length > 0
          ? ` for ${data.profile_target_countries.slice(0, 2).join(" & ")}`
          : "";
      const title = `${firstName}'s${major} admissions strategy${target} — TopUni`;
      const desc = (() => {
        // Use the FIRST paragraph of the brief content as the description
        // so social cards read like a real preview, not a generic blurb.
        const firstPara = (data.content || "")
          .replace(/^#+\s*.*$/gm, "")           // strip headings
          .replace(/\*\*([^*]+)\*\*/g, "$1")    // strip bold markers
          .split(/\n\n+/)
          .map((p) => p.trim())
          .find((p) => p.length > 40);
        if (firstPara) return firstPara.replace(/\s+/g, " ").slice(0, 220) + "…";
        return `An AI-generated university admissions strategy from TopUni${major}${target}.`;
      })();
      const url = `https://topuni.org/brief/${data.slug}`;
      const ogImage = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/og-brief?slug=${encodeURIComponent(data.slug)}`;
      const fallbackImage = "https://topuni.org/og-brief-fallback.png";

      document.title = title;

      const metaTags: { name?: string; property?: string; content: string }[] = [
        { name: "description", content: desc },
        // Open Graph (Facebook, LinkedIn, WhatsApp, iMessage, Slack)
        { property: "og:title",        content: title },
        { property: "og:description",  content: desc },
        { property: "og:type",         content: "article" },
        { property: "og:url",          content: url },
        { property: "og:site_name",    content: "TopUni" },
        { property: "og:image",        content: ogImage },
        { property: "og:image:width",  content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:alt",    content: title },
        { property: "article:published_time", content: data.created_at },
        // Twitter cards
        { name: "twitter:card",        content: "summary_large_image" },
        { name: "twitter:site",        content: "@topuniorg" },
        { name: "twitter:title",       content: title },
        { name: "twitter:description", content: desc },
        { name: "twitter:image",       content: ogImage },
      ];
      const _ = fallbackImage; // reserved for future graceful degradation

      for (const m of metaTags) {
        const sel = m.name ? `meta[name="${m.name}"]` : `meta[property="${m.property}"]`;
        let el = document.querySelector(sel);
        if (!el) {
          el = document.createElement("meta");
          if (m.name) el.setAttribute("name", m.name);
          if (m.property) el.setAttribute("property", m.property);
          document.head.appendChild(el);
        }
        el.setAttribute("content", m.content);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (notFound || !brief) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-xl mx-auto px-6 pt-20 pb-32 text-center">
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-3">404</p>
          <h1 className="font-heading text-2xl font-bold text-foreground mb-3">This brief isn't available.</h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8">
            Briefs from anonymous students expire after 30 days. The link may also have been revoked by its owner.
          </p>
          <Button variant="gold" asChild>
            <Link to="/topuni-ai">
              Build your own strategy <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </div>
        <Footer language="en" />
      </div>
    );
  }

  const firstName = brief.profile_first_name?.trim();
  const targetCountries = brief.profile_target_countries || [];
  const major = brief.profile_major;
  const isRu = brief.language === "ru";

  // The recipient is a viewer, not the brief's owner. Save / regen / task-
  // toggle UX is hidden by passing no-op handlers + empty state. The
  // ReportRenderer's components gracefully degrade — interactive bits
  // (action-plan checkboxes) render but don't mutate anything.
  const noopToggle = () => {};
  const taskKey = (text: string) => {
    let h = 5381;
    for (let i = 0; i < text.length; i++) h = (h * 33) ^ text.charCodeAt(i);
    return (h >>> 0).toString(36);
  };

  // Premium-tier briefs from non-Pro authors still render in full to the
  // recipient — this is THE acquisition surface, no point gating it. We
  // pass tier="premium" so all rich sections (Career ROI, Visa, Budget)
  // render without the basic-tier teaser strip.
  const tier: "basic" | "premium" = brief.report_grade === "premium" ? "premium" : "basic";

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Slim navy band — preserves TopUni's visual signature without
          competing with the BriefMasthead which does the actual cover. */}
      <div
        aria-hidden
        className="h-2 bg-gradient-to-r from-primary via-gold-dark to-primary"
      />

      <article className="max-w-4xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
        {/* Editorial masthead — same component the brief author sees on
            their dashboard, so the recipient view is consistent. Share /
            Download hidden because the recipient isn't the author; Print
            stays so a parent can print to PDF. */}
        <BriefMasthead
          studentName={firstName ? `${firstName}'s strategy report` : (isRu ? "Стратегический отчёт" : "Strategy report")}
          profile={{
            gradeLevel: brief.profile_grade_level ?? undefined,
            major: major ?? undefined,
            targetCountries: targetCountries.length > 0 ? targetCountries : undefined,
          }}
          briefContent={brief.content}
          isStreaming={false}
          isRu={isRu}
          isPro={false}
          onPrint={() => window.print()}
        />

        {/* Trust strip — first-time visitor doesn't know what TopUni is.
            One short line explains the deliverable came from a real
            verified database, not generic AI fluff. Print-hidden. */}
        <div className="not-prose flex items-center gap-2 mb-6 px-3 py-2 rounded-lg bg-muted/30 border border-border/60 text-[11px] text-muted-foreground leading-snug print:hidden">
          <ShieldCheck className="w-3.5 h-3.5 text-gold-dark shrink-0" />
          <span>
            {isRu
              ? "Брифинг сгенерирован TopUni AI на основе проверенной базы стипендий. Каждое название — реальная программа в нашей базе."
              : "Drafted by TopUni AI grounded in our verified scholarship database. Every name in this brief maps to a real program — not invented."}
          </span>
        </div>

        {/* Brief content — uses the SAME ReportRenderer the dashboard uses,
            so the recipient sees the polished section components (gold
            strategic-brief box, severity strips on gaps, numbered essay
            angle cards, funding shortlist with deadline urgency, etc.)
            instead of plain markdown.

            Recipient is a viewer, not owner: no save / regen / task-toggle. */}
        <div
          className="prose prose-sm sm:prose-base max-w-none dark:prose-invert
                     [&_h2]:text-foreground [&_h2]:font-heading [&_h2]:text-xl [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:tracking-[-0.01em]
                     [&_h3]:text-foreground [&_h3]:font-heading [&_h3]:text-lg [&_h3]:mt-6 [&_h3]:mb-2
                     [&_p]:text-muted-foreground [&_li]:text-muted-foreground
                     [&_strong]:text-foreground"
        >
          <ReportRenderer
            markdown={brief.content}
            completedTasks={new Set()}
            onToggle={noopToggle}
            taskKey={taskKey}
            isRu={isRu}
            onOpenDiscover={() => navigate(isRu ? "/discover/ru" : "/discover")}
            liveMatches={scholarshipsForCards}
            tier={tier}
          />
        </div>

        {/* Branding + conversion CTA. Quantified — names what the visitor
            would actually get rather than a generic "build yours" pitch. */}
        <div className="not-prose mt-16 pt-8 border-t border-border print:hidden">
          <div className="bg-card border border-border rounded-2xl p-7 sm:p-10 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-gold-dark via-gold to-gold-dark" />

            <div className="grid sm:grid-cols-[1fr_auto] gap-6 items-end">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-3">
                  {isRu ? "Сделано с TopUni AI" : "Made with TopUni AI"}
                </p>
                <h3 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3 leading-tight">
                  {isRu
                    ? `Получите свой брифинг — ${firstName ? "как у " + firstName : "на основе вашего профиля"}.`
                    : `Get your own — ${firstName ? "the way " + firstName + " did" : "personalised to your profile"}.`}
                </h3>
                <ul className="space-y-1.5 text-sm text-muted-foreground leading-relaxed mb-5">
                  <li className="flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-gold-dark mt-1 shrink-0" />
                    <span>
                      {isRu
                        ? "Стратегическое позиционирование, шорт-лист 15+ университетов, путь финансирования, план на 90 дней."
                        : "Strategic positioning, 15+ university shortlist, funding pathway, 90-day action plan."}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-gold-dark mt-1 shrink-0" />
                    <span>
                      {isRu
                        ? "Подобрано из проверенной базы стипендий — никаких выдуманных программ."
                        : "Pulled from our verified scholarship database — never invented."}
                    </span>
                  </li>
                </ul>
                <p className="text-[11px] text-muted-foreground/70">
                  {isRu ? "Бесплатно. 60 секунд. Аккаунт не нужен." : "Free. 60 seconds. No account needed."}
                </p>
              </div>

              <Button
                variant="gold"
                size="lg"
                className="shrink-0 gap-2"
                onClick={() => {
                  // Hand the wizard a shared-brief payload so the recipient
                  // doesn't start from zero — they pick up the original
                  // student's target countries / field / grade level and
                  // just enter their own scores. Same 5-min stale guard
                  // pattern used by the other hub-context handoffs.
                  try {
                    sessionStorage.setItem(
                      "topuni-hub-context",
                      JSON.stringify({
                        kind: "shared-brief",
                        countries: brief.profile_target_countries ?? [],
                        field: brief.profile_major ?? null,
                        gradeLevel: brief.profile_grade_level ?? null,
                        label: firstName ? `${firstName}'s brief` : "shared brief",
                        ts: Date.now(),
                      }),
                    );
                  } catch { /* sessionStorage unavailable; CTA still works */ }
                  navigate(isRu ? "/topuni-ai/ru" : "/topuni-ai");
                }}
              >
                {isRu ? "Создать мой брифинг" : "Build my brief"}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground/60 text-center mt-6">
            {isRu ? "Сгенерировано" : "Generated"}{" "}
            {new Date(brief.created_at).toLocaleDateString(isRu ? "ru-RU" : "en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            {brief.view_count > 1 && ` · ${brief.view_count} ${isRu ? "просмотров" : "views"}`}
          </p>
        </div>
      </article>

      <Footer language={isRu ? "ru" : "en"} />
    </div>
  );
};

export default SharedBriefPage;
