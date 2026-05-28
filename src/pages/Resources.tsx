import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, FileText, GraduationCap, FileSignature, Mail, Lock, Brain } from "lucide-react";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminUser, isAdminBypass, consumeAdminUrlFlag } from "@/lib/adminMode";

/**
 * /resources — admin-only catalog of TopUni's downloadable products.
 *
 * 2026-05-28: pulled from public nav + gated to admins. The cards
 * here are lead magnets distributed via IG / newsletter / outreach —
 * the catalog page surfacing "Coming Soon" tiles to drive-by visitors
 * read as half-built. Individual product URLs (/underrated-scholarships,
 * /topuni-ai → strategy PDF) remain public so shared links keep
 * working; this catalog page is the editor's view of "what's in flight."
 *
 * Non-admin visitors → redirected to /. Admins keep the full catalog
 * (incl. COMING_SOON placeholders) so they can preview before pushing
 * a new card live.
 *
 * Adding a new product: push into FREE_RESOURCES or PAID_RESOURCES.
 */

interface ResourceCard {
  title: string;
  blurb: string;
  href: string;
  format: string;
  price?: string;
  icon: React.ComponentType<{ className?: string }>;
  pill?: string;
}

const FREE_RESOURCES: ResourceCard[] = [
  {
    title: "30 scholarships you haven't heard of",
    blurb: "The Rhodes and Fulbright get the airtime. Meanwhile, 30 high-value programs sit underused — full rides at Tsinghua, KAUST, Hungary, Türkiye, and beyond. Region by region.",
    href: "/underrated-scholarships",
    format: "30-program field guide",
    icon: GraduationCap,
    pill: "New",
  },
  {
    title: "Build your strategy report",
    blurb: "Tell us where you're from, what you study, where you want to go. Get a personalised strategy report — your fit-ranked shortlist, your essay angles, your 30-day next steps. Then Save as PDF.",
    href: "/topuni-ai",
    format: "Personalised PDF",
    icon: Brain,
    pill: "AI",
  },
];

const PAID_RESOURCES: ResourceCard[] = [
  // Empty for now — placeholder cards below signal what's coming
  // without overpromising. Pull these into PAID_RESOURCES as each
  // ships.
];

const COMING_SOON = [
  {
    title: "Personal Statement That Won Yale + Tsinghua",
    blurb: "Real annotated personal statement with every paragraph broken down — what works, why, what to steal.",
    icon: FileSignature,
  },
  {
    title: "Scholarship Essay Bank",
    blurb: "Twenty winning scholarship essays with line-by-line annotations. Why each landed. Templates for your own.",
    icon: FileText,
  },
  {
    title: "Recommendation Letter Asks",
    blurb: "Scripts + templates for asking professors and supervisors — the exact email that gets a yes, what to send with it.",
    icon: Mail,
  },
];

const Card = ({ r, paid }: { r: ResourceCard; paid?: boolean }) => (
  <Link
    to={r.href}
    className="group relative flex flex-col rounded-2xl border border-border bg-card p-5 transition-all hover:border-gold-dark/40 hover:shadow-md"
  >
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center shrink-0">
        <r.icon className="w-5 h-5 text-gold-dark" />
      </div>
      {r.pill && (
        <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-full ${
          paid ? "bg-amber-100 text-amber-900" : "bg-gold/15 text-gold-dark"
        }`}>
          {r.pill}
        </span>
      )}
    </div>
    <h3 className="font-heading text-lg font-bold text-foreground mb-1.5 leading-tight tracking-tight">
      {r.title}
    </h3>
    <p className="text-sm text-muted-foreground leading-snug mb-4 flex-1">
      {r.blurb}
    </p>
    <div className="flex items-center justify-between border-t border-border/60 pt-3 mt-auto">
      <span className="text-[11px] text-muted-foreground tracking-wide">
        {r.format}
      </span>
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-gold-dark group-hover:gap-1.5 transition-all">
        {r.price ? (
          <>
            <Lock className="w-3 h-3" />
            {r.price}
          </>
        ) : (
          <>
            Free
            <ArrowRight className="w-3.5 h-3.5" />
          </>
        )}
      </span>
    </div>
  </Link>
);

const Resources = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const admin = isAdminUser(user) || isAdminBypass();

  useEffect(() => {
    if (loading) return;
    consumeAdminUrlFlag();
    if (!admin) navigate("/", { replace: true });
  }, [loading, admin, navigate]);

  // Hold render until auth resolves, then either bail (non-admin
  // navigates away) or show the catalog. Render-nothing during the
  // gap is cleaner than a flash of the public catalog.
  if (loading || !admin) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation language="en" variant="overlay" />
      <main className="flex-1 pt-28 pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back home
          </Link>

          <header className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <span className="h-px w-10 bg-gold-dark/40" aria-hidden />
              <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-gold-dark">
                TopUni · Resources
              </p>
              <span className="h-px flex-1 bg-gold-dark/40" aria-hidden />
            </div>
            <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground mb-3 leading-[1.05] tracking-tight">
              Field guides for international applicants.
            </h1>
            <p className="font-heading italic text-lg text-muted-foreground leading-relaxed max-w-xl">
              The scholarships, the essays, the asks — assembled by people
              who've actually built the funnel.
            </p>
          </header>

          <section className="mb-14">
            <div className="flex items-baseline justify-between mb-5">
              <h2 className="font-heading text-2xl font-bold text-foreground">
                Free
              </h2>
              <p className="text-xs text-muted-foreground">
                Print or save as PDF · no signup needed
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {FREE_RESOURCES.map((r) => (
                <Card key={r.href} r={r} />
              ))}
            </div>
          </section>

          {(PAID_RESOURCES.length > 0 || COMING_SOON.length > 0) && (
            <section className="mb-14">
              <div className="flex items-baseline justify-between mb-5">
                <h2 className="font-heading text-2xl font-bold text-foreground">
                  Field Guides
                </h2>
                <p className="text-xs text-muted-foreground">
                  Premium playbooks · pay once, keep forever
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {PAID_RESOURCES.map((r) => (
                  <Card key={r.href} r={r} paid />
                ))}
                {COMING_SOON.map((s) => (
                  <div
                    key={s.title}
                    className="relative flex flex-col rounded-2xl border border-dashed border-border/60 bg-muted/20 p-5"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                        <s.icon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-full bg-muted text-muted-foreground">
                        Soon
                      </span>
                    </div>
                    <h3 className="font-heading text-lg font-bold text-muted-foreground mb-1.5 leading-tight">
                      {s.title}
                    </h3>
                    <p className="text-sm text-muted-foreground/80 leading-snug mb-4 flex-1">
                      {s.blurb}
                    </p>
                    <div className="border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                      In production
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 sm:p-8 text-center">
            <h3 className="font-heading text-xl font-bold text-foreground mb-2">
              Want a personalised shortlist?
            </h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto leading-relaxed">
              TopUni AI takes your profile and surfaces the 5–8 scholarships
              you should actually apply to this cycle. Ranked by fit and
              deadline, not by which ones have the prettiest website.
            </p>
            <Link
              to="/topuni-ai"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:brightness-110 transition"
            >
              Build my strategy report
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>
      <Footer language="en" variant="dark" />
    </div>
  );
};

export default Resources;
