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
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { ArrowRight, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";

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

const SharedBriefPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [brief, setBrief] = useState<SharedBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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

      // Set page meta for SEO + social previews
      const firstName = data.profile_first_name || "A student";
      const major = data.profile_major ? ` ${data.profile_major}` : "";
      const target =
        data.profile_target_countries && data.profile_target_countries.length > 0
          ? ` for ${data.profile_target_countries.slice(0, 2).join(" & ")}`
          : "";
      document.title = `${firstName}'s${major} admissions strategy${target} — TopUni`;
      const desc = `An AI-generated university admissions strategy from TopUni Consulting${major}${target}. See the brief, then build your own.`;
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement("meta");
        metaDesc.setAttribute("name", "description");
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute("content", desc);
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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero / masthead — signals "this is a real brief from TopUni AI" */}
      <section className="bg-gradient-to-br from-primary via-primary to-primary/95 py-14 sm:py-20">
        <div className="max-w-3xl mx-auto px-5 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-[11px] uppercase tracking-[0.22em] text-gold font-semibold mb-3">
              {isRu ? "Стратегический брифинг" : "Strategic Brief"}
            </p>
            <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-primary-foreground tracking-tight leading-tight">
              {firstName
                ? `${firstName}'s admissions strategy`
                : isRu
                  ? "Стратегия поступления"
                  : "An admissions strategy"}
            </h1>
            <div className="mt-5 flex flex-wrap gap-2">
              {targetCountries.slice(0, 5).map((c) => (
                <span
                  key={c}
                  className="text-[11px] uppercase tracking-[0.18em] font-semibold text-primary-foreground/85 border border-primary-foreground/25 px-2.5 py-1 rounded-full"
                >
                  {c}
                </span>
              ))}
              {major && (
                <span className="text-[11px] uppercase tracking-[0.18em] font-semibold text-gold border border-gold/40 px-2.5 py-1 rounded-full">
                  {major}
                </span>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Brief content */}
      <article className="max-w-3xl mx-auto px-5 sm:px-8 py-14 sm:py-20">
        <div
          className="prose prose-sm sm:prose-base max-w-none
                     [&_h2]:text-foreground [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:tracking-tight
                     [&_h3]:text-foreground [&_h3]:font-heading [&_h3]:text-lg [&_h3]:mt-8 [&_h3]:mb-3
                     [&_p]:text-foreground/90 [&_p]:leading-relaxed
                     [&_li]:text-foreground/90 [&_li]:leading-relaxed
                     [&_strong]:text-foreground"
        >
          <ReactMarkdown>{brief.content}</ReactMarkdown>
        </div>

        {/* Branding + CTA */}
        <div className="not-prose mt-16 pt-8 border-t border-border">
          <div className="bg-card border border-border rounded-2xl p-7 sm:p-9 text-center">
            <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-3">
              {isRu ? "Сделано с TopUni AI" : "Made with TopUni AI"}
            </p>
            <h3 className="font-heading text-2xl font-bold tracking-tight text-foreground mb-3 leading-tight">
              {isRu ? "Хочешь свой такой?" : "Want one of your own?"}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto mb-6">
              {isRu
                ? "Заполни короткую анкету, и TopUni AI соберёт стратегию: позиционирование, шорт-лист университетов, стипендии и план на 90 дней."
                : "Fill out a short profile and TopUni AI will draft your own strategy — positioning, university shortlist, scholarship pathway, and 90-day action plan."}
            </p>
            <Button variant="gold" size="lg" asChild>
              <Link to={isRu ? "/topuni-ai/ru" : "/topuni-ai"} className="gap-2">
                {isRu ? "Создать мой брифинг" : "Build my strategic brief"}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <p className="text-[11px] text-muted-foreground/70 mt-4">
              {isRu ? "Бесплатно. 60 секунд." : "Free. 60 seconds."}
            </p>
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
