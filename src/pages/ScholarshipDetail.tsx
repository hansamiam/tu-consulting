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
  ArrowLeft, ArrowRight, ExternalLink, Sparkles, Bookmark, BookmarkCheck,
  Calendar, Wallet, GraduationCap, Globe, CheckCircle2, AlertCircle,
  Loader2, FileText, Users, ShieldAlert, Share2, Search,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useApplicationTracker } from "@/hooks/useApplicationTracker";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ShareScholarshipModal } from "@/components/ShareScholarshipModal";
import { EmptyState } from "@/components/EmptyState";
import { ScholarshipCard, type ScholarshipCardData } from "@/components/ScholarshipCard";
import { useTrackView, useScholarshipTracking } from "@/hooks/useScholarshipTracking";
import { ScholarshipDeepDive } from "@/components/scholarship/ScholarshipDeepDive";
import { getStoredProfile } from "@/components/discover/DiscoverProfileGate";

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
}

type SimilarScholarship = ScholarshipCardData;

interface ScholarshipStats {
  save_count_total: number | null;
  save_count_7d: number | null;
  view_count_7d: number | null;
  trending_score: number | null;
}

const ScholarshipDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const tracker = useApplicationTracker();
  const [s, setS] = useState<Scholarship | null>(null);
  const [similar, setSimilar] = useState<SimilarScholarship[]>([]);
  const [stats, setStats] = useState<ScholarshipStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
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
        const { data: rows } = await supabase
          .from("scholarships")
          .select("scholarship_id, scholarship_name, provider_name, host_country, coverage_type, award_amount_text, estimated_total_value_usd, application_deadline, target_degree_level, target_fields, is_featured, why_this_fits")
          .in("scholarship_id", ids.slice(0, 4));
        if (!cancelled) setSimilar(((rows as SimilarScholarship[]) ?? []));
      } catch (e) {
        // Silent failure — similar list is enrichment, not critical
        console.warn("similar scholarships failed", e);
      }
    })();
    return () => { cancelled = true; };
  }, [s?.scholarship_id]);

  /* SEO meta — unique per scholarship */
  useEffect(() => {
    if (!s) return;
    const title = `${s.scholarship_name} — eligibility, deadline, application | TopUni`;
    const country = s.host_country ? ` Hosted in ${s.host_country}.` : "";
    const coverage =
      s.coverage_type === "full_ride" ? "Full ride covering tuition + living."
      : s.coverage_type === "tuition_only" ? "Covers tuition."
      : "Stipend.";
    const deadline = s.application_deadline ? ` Deadline: ${s.application_deadline}.` : "";
    const desc = `${s.scholarship_name}.${country} ${coverage}${deadline} Build a personalised strategy with TopUni AI free.`;
    document.title = title;
    setMeta("description", desc);
    setMeta("og:title", title, true);
    setMeta("og:description", desc, true);
    setMeta("og:type", "article", true);
    setMeta("og:url", `https://topuni.org/scholarships/${s.scholarship_id}`, true);
    // Per-scholarship OG image — generated dynamically by the og-scholarship
    // edge function. Every WhatsApp / X / LinkedIn / iMessage share now
    // unfurls into a beautiful gold-accented preview card with the
    // scholarship name, funding, country, and deadline urgency.
    const ogImageUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/og-scholarship?id=${s.scholarship_id}`;
    setMeta("og:image", ogImageUrl, true);
    setMeta("og:image:width", "1200", true);
    setMeta("og:image:height", "630", true);
    setMeta("og:image:alt", `${s.scholarship_name} — TopUni`, true);
    setMeta("twitter:image", ogImageUrl);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", desc);
    setLink("canonical", `https://topuni.org/scholarships/${s.scholarship_id}`);

    // ── JSON-LD payload(s) ─────────────────────────────────────────────
    // Two structured-data graphs: the scholarship credential itself, and
    // a FAQPage built from the same fields visible on the page. The FAQ
    // graph lets Google surface the page as a rich result for natural
    // questions like "who is eligible for {scholarship}" — pure SEO
    // leverage on already-written content.
    const credential = {
      "@type": "EducationalOccupationalCredential",
      name: s.scholarship_name,
      description: s.eligibility_requirements?.slice(0, 400) ?? desc,
      url: `https://topuni.org/scholarships/${s.scholarship_id}`,
      credentialCategory: "scholarship",
      offers: s.award_amount_text
        ? { "@type": "Offer", description: s.award_amount_text }
        : undefined,
      validThrough: s.application_deadline ?? undefined,
      provider: s.provider_name
        ? { "@type": "Organization", name: s.provider_name }
        : undefined,
    };
    const faqEntities = buildFaqEntities(s);
    const graph: object[] = [credential];
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
        <Navigation />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
        <Footer language="en" />
      </div>
    );
  }

  if (notFound || !s) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-xl mx-auto px-6 pt-12">
          <EmptyState
            icon={<Search />}
            title="Scholarship not found"
            description="This scholarship doesn't exist or has been removed. Browse the full database in Discover."
            cta={{ label: "Open Discover", to: "/discover" }}
            secondaryCta={{ label: "Submit a scholarship", to: "/submit" }}
          />
        </div>
        <Footer language="en" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* HERO ─────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-primary via-primary to-primary/95 py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-5 sm:px-8">
          <Link
            to="/discover"
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-primary-foreground/70 hover:text-gold-light transition-colors mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Discover
          </Link>
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold font-semibold mb-3">
            {s.host_country ? `Scholarship · ${s.host_country}` : "Scholarship"}
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-primary-foreground tracking-tight leading-tight mb-3">
            {s.scholarship_name}
          </h1>
          {s.provider_name && (
            <p className="text-primary-foreground/80 text-sm sm:text-base mb-5">{s.provider_name}</p>
          )}
          <div className="flex flex-wrap gap-2 mb-6">
            {s.coverage_type && (
              <Chip>
                {s.coverage_type === "full_ride" ? "Full ride"
                  : s.coverage_type === "tuition_only" ? "Tuition only"
                  : "Stipend"}
              </Chip>
            )}
            {(s.target_degree_level ?? []).slice(0, 3).map((d) => <Chip key={d}>{d}</Chip>)}
            {(s.target_fields ?? []).slice(0, 3).map((f) => <Chip key={f}>{f}</Chip>)}
            {s.application_deadline && days !== null && (
              <Chip tone={days <= 7 ? "danger" : days <= 30 ? "warn" : "neutral"}>
                {days <= 0 ? "Closed" : days === 1 ? "1 day" : days <= 30 ? `${days} days left` : `${Math.round(days / 30)} months`}
              </Chip>
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
            if (totalSaves >= 5) parts.push(`${totalSaves.toLocaleString()} students tracking this`);
            if (recentSaves >= 3) parts.push(`+${recentSaves} this week`);
            else if (recentViews >= 25) parts.push(`${recentViews.toLocaleString()} viewed in the past 7 days`);
            return (
              <p className="text-[12px] text-primary-foreground/60 mb-5 tracking-wide">
                {parts.join(" · ")}
              </p>
            );
          })()}

          {/* Hero CTAs — primary action is "Build my strategy" because most
              traffic to this page is anonymous organic search, and the
              competitor-site Apply link was leaking that audience straight
              out of our funnel. The official link stays prominent (outline
              variant, with tracking) for visitors who just want to verify
              the scholarship is real. */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="gold"
              size="lg"
              className="gap-2"
              onClick={() => goBuildStrategy("hero")}
            >
              <Sparkles className="w-4 h-4" />
              Build my strategy around this
            </Button>
            {s.official_url && (
              <Button
                variant="outline"
                size="lg"
                asChild
                className="gap-2 bg-transparent text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10"
              >
                <a
                  href={s.official_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track(s.scholarship_id, "clicked", "detail-apply-official")}
                >
                  Apply on official site <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            )}
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                tracker.toggleShortlist(s.scholarship_id);
                toast.success(isShortlisted ? "Removed from your pipeline" : "Saved to your pipeline");
              }}
              className="gap-2 bg-transparent text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10"
            >
              {isShortlisted ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              {isShortlisted ? "Saved" : "Save to pipeline"}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => { setShareOpen(true); track(s.scholarship_id, "shared", "detail"); }}
              className="gap-2 bg-transparent text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10"
              aria-label="Share this scholarship"
            >
              <Share2 className="w-4 h-4" /> Share
            </Button>
          </div>
        </div>
      </section>

      <ShareScholarshipModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        scholarshipName={s.scholarship_name}
        providerName={s.provider_name}
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
              Our weekly link-checker has failed to reach the official URL {s.url_consecutive_fails}+ times.
              Verify the link still works before applying.
            </span>
          </div>
        </div>
      )}

      {/* DETAIL GRID ──────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-5 sm:px-8 py-10 sm:py-14 space-y-10">
        {/* Key facts row */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Fact icon={<Wallet />} label="Award" value={s.award_amount_text || (s.estimated_total_value_usd ? `~$${Math.round(s.estimated_total_value_usd / 1000)}K total` : "—")} />
          <Fact icon={<Calendar />} label="Deadline" value={s.application_deadline ?? (s.deadline_type ?? "varies")} />
          <Fact icon={<GraduationCap />} label="Levels" value={(s.target_degree_level ?? []).join(", ") || "any"} />
          <Fact icon={<Globe />} label="Citizenship" value={s.citizenship_requirements ? truncate(s.citizenship_requirements, 60) : "any"} />
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

        {/* Sections */}
        {s.why_this_fits && <Section title="Why this could fit" body={s.why_this_fits} />}
        {s.eligibility_requirements && <Section title="Eligibility" body={s.eligibility_requirements} />}
        {s.ideal_candidate_profile && <Section title="Ideal candidate" body={s.ideal_candidate_profile} />}
        {(s.min_gpa || s.min_ielts || s.min_toefl || s.min_sat) && (
          <Section title="Hard thresholds">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {s.min_gpa && <Fact label="GPA min" value={`${s.min_gpa}/${s.gpa_scale ?? 4.0}`} />}
              {s.min_ielts && <Fact label="IELTS min" value={String(s.min_ielts)} />}
              {s.min_toefl && <Fact label="TOEFL min" value={String(s.min_toefl)} />}
              {s.min_sat && <Fact label="SAT min" value={String(s.min_sat)} />}
            </div>
          </Section>
        )}
        {s.how_to_win && <Section title="How to win it" body={s.how_to_win} />}
        {s.common_rejection_reasons && (
          <Section title="Why people get rejected" body={s.common_rejection_reasons} tone="warn" />
        )}
        {s.weak_candidate_warning && (
          <Section title="Don't apply if…" body={s.weak_candidate_warning} tone="warn" />
        )}
        {s.what_to_prepare_first && <Section title="Start with this" body={s.what_to_prepare_first} />}
        {s.strategy_notes && <Section title="Strategy notes" body={s.strategy_notes} />}
        {s.required_documents && s.required_documents.length > 0 && (
          <Section title="Required documents">
            <ul className="space-y-1.5 text-sm text-foreground/90">
              {s.required_documents.map((d, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-gold-dark mt-1 shrink-0" />
                  {d}
                </li>
              ))}
            </ul>
          </Section>
        )}
        {s.partner_universities && s.partner_universities.length > 0 && (
          <Section title="Partner universities">
            <div className="flex flex-wrap gap-2">
              {s.partner_universities.map((u, i) => (
                <span key={i} className="text-sm bg-muted/40 border border-border px-3 py-1 rounded-full">{u}</span>
              ))}
            </div>
          </Section>
        )}

        {/* Reinforcement CTA — same destination as the hero, restated
            after the eligibility / partners blocks for visitors who
            scrolled past the hero before deciding. Source label distinct
            from the hero's so we can compare conversion. */}
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 text-center">
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-3">
            Don't just read — strategise
          </p>
          <h3 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-3 leading-tight">
            Build a personal strategy that includes the {s.scholarship_name}.
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto mb-6">
            TopUni AI takes your profile, ranks every scholarship in the database against you,
            and tells you specifically how to win this one — what to lead with, how to prep.
          </p>
          <Button
            variant="gold"
            size="lg"
            className="gap-2"
            onClick={() => goBuildStrategy("footer")}
          >
            Build my strategy around this <ArrowRight className="w-4 h-4" />
          </Button>
          <p className="text-[11px] text-muted-foreground/70 mt-4">60 seconds. Free.</p>
        </div>

        {/* Similar scholarships */}
        {similar.length > 0 && (
          <div>
            <div className="flex items-baseline justify-between gap-3 mb-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-1.5">
                  Similar scholarships
                </p>
                <h3 className="font-heading text-lg font-bold tracking-tight text-foreground">
                  Students who tracked this also tracked
                </h3>
              </div>
              <Link to="/discover" className="text-xs text-muted-foreground hover:text-gold-dark transition-colors hidden sm:inline-flex items-center gap-1">
                Browse all <ArrowRight className="w-3 h-3" />
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

        {/* Trust footer */}
        <div className="pt-6 border-t border-border flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className={`inline-block h-2 w-2 rounded-full ${
              s.data_source === "hand_curated" ? "bg-emerald-500" : "bg-amber-500"
            }`} />
            Source: {s.data_source === "hand_curated" ? "Curated" : "External research"}
          </span>
          {s.last_verified_date && <span>· Verified {s.last_verified_date}</span>}
          <a
            href={`mailto:hello@topuni.com?subject=${encodeURIComponent("Inaccurate scholarship data: " + s.scholarship_name)}`}
            className="ml-auto underline hover:text-foreground"
          >
            Report inaccuracy
          </a>
        </div>
      </section>

      <Footer language="en" />
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
  document.querySelectorAll('script[data-topuni-ld="true"]').forEach((n) => n.remove());
  const s = document.createElement("script");
  s.type = "application/ld+json";
  s.dataset.topuniLd = "true";
  s.text = JSON.stringify(payload);
  document.head.appendChild(s);
}

/* FAQPage structured-data builder.
   Maps existing scholarship fields to natural-language Q/A pairs so search
   engines can surface this page as a FAQ rich-result. We only emit a
   question when its answer field is non-empty — empty Qs would dilute
   the schema. Answers are plain text (Google ignores HTML in answerText
   anyway). */
function buildFaqEntities(s: Scholarship): object[] {
  const name = s.scholarship_name;
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
  const coverageWord =
    s.coverage_type === "full_ride" ? "a full ride covering tuition and living costs"
    : s.coverage_type === "tuition_only" ? "tuition costs"
    : s.coverage_type === "stipend_only" ? "a living stipend"
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
