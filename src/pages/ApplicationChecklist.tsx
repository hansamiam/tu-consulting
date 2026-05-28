import { Link } from "react-router-dom";
import { ArrowLeft, FileDown, Lock, Quote, CheckSquare, AlertTriangle, MessageSquare, Scissors } from "lucide-react";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import ComingSoonWall from "@/components/ComingSoonWall";
import DraftAdminBanner from "@/components/DraftAdminBanner";
import { useProductGate } from "@/hooks/useProductGate";
import {
  NIGHT_BEFORE_CHECK,
  PRE_SUBMISSION_CHECK,
  OFFICE_REJECT_REASONS,
  WAITLIST_LETTER,
  INTERVIEW_PREP,
} from "@/data/applicationChecklist";

/**
 * TopUni Field Guide N°3 — The Application Submission Checklist ($19).
 * Procedural rigour for the 72 hours before you hit submit. ~5% of
 * applications get binned at the office level (before any committee
 * reads them) for stupid procedural reasons; this product is the
 * procedure to avoid that.
 *
 * Concrete + checklist-based, on purpose. Buyers know exactly what
 * they're getting before they pay.
 */
const SLUG = "application-checklist" as const;

const ApplicationChecklist = () => {
  const { canView, isAdmin, published } = useProductGate(SLUG);

  if (!canView) return <ComingSoonWall slug={SLUG} />;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation language="en" variant="overlay" />
      {!published && isAdmin && <DraftAdminBanner slug={SLUG} />}
      <main className="flex-1 pt-28 pb-16 px-6 print:pt-4 print:pb-4">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/resources"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 print:hidden"
          >
            <ArrowLeft className="w-4 h-4" /> All resources
          </Link>

          {/* Cover */}
          <header className="mb-10 print:mb-6 print:break-after-page">
            <div className="flex items-center gap-3 mb-4">
              <span className="h-px w-10 bg-gold-dark/40" aria-hidden />
              <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-gold-dark">
                TopUni · Field Guide N°3
              </p>
              <span className="h-px flex-1 bg-gold-dark/40" aria-hidden />
            </div>
            <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground mb-4 print:text-4xl leading-[1.05] tracking-tight">
              The Application Submission Checklist.
            </h1>
            <p className="font-heading italic text-lg text-muted-foreground leading-relaxed max-w-xl print:text-base">
              The 72 hours before you hit submit — the procedural
              rigour that keeps your application out of the reject pile
              before a committee even sees it.
            </p>

            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
              <div className="border-t border-foreground pt-2">
                <p className="text-[10px] tracking-widest uppercase text-muted-foreground">Pages</p>
                <p className="font-heading font-bold text-foreground text-lg">18</p>
              </div>
              <div className="border-t border-foreground pt-2">
                <p className="text-[10px] tracking-widest uppercase text-muted-foreground">Checks</p>
                <p className="font-heading font-bold text-foreground text-lg">17</p>
              </div>
              <div className="border-t border-foreground pt-2">
                <p className="text-[10px] tracking-widest uppercase text-muted-foreground">Templates</p>
                <p className="font-heading font-bold text-foreground text-lg">2 emails</p>
              </div>
              <div className="border-t border-foreground pt-2">
                <p className="text-[10px] tracking-widest uppercase text-muted-foreground">Price</p>
                <p className="font-heading font-bold text-foreground text-lg">$19</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 print:hidden">
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold opacity-90 cursor-not-allowed"
                title="Storefront coming soon — preview unlocked"
              >
                <Lock className="w-3.5 h-3.5" /> Buy for $19
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gold-dark hover:underline"
              >
                <FileDown className="w-4 h-4" /> Print or save as PDF
              </button>
              <span className="text-xs text-muted-foreground">
                Preview unlocked while the storefront is being built.
              </span>
            </div>

            <p className="hidden print:block mt-12 text-[10px] text-muted-foreground border-t pt-3 tracking-wide">
              © TopUni · topuni.org · Field Guide N°3 · 2026 edition
            </p>
          </header>

          {/* Opener */}
          <section className="mb-12 print:mb-8 break-inside-avoid print:break-before-page">
            <div className="flex items-center gap-2 mb-4">
              <Quote className="w-4 h-4 text-gold-dark" />
              <p className="text-[10px] font-bold tracking-widest uppercase text-gold-dark">
                Why this guide exists
              </p>
            </div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4 print:text-xl">
              The application that died in the office, not on the table.
            </h2>
            <div className="prose prose-sm sm:prose-base max-w-none text-foreground/90 leading-relaxed print:text-sm print:leading-snug">
              <p>
                A friend applied to seven PhD programs in 2024. Brilliant
                profile. Strong essays. Three recommenders, all of whom
                wrote substantive letters. Came back: <strong>zero</strong>
                interview offers.
              </p>
              <p>
                He thought it was the field. The committee had spoken.
                Time to reconsider grad school.
              </p>
              <p>
                Two months later, one of the program coordinators emailed
                him back: <em>"We never received your transcripts. Your
                application was marked incomplete and not reviewed."</em>
                He'd uploaded photo scans instead of using the credential
                evaluation service the program required. Seven applications,
                same mistake. Zero committees ever saw his work.
              </p>
              <p>
                He's applying again this cycle. This guide is what I
                debugged with him after that email. Almost everything in
                here is procedural — name-matching, file formats, deadlines
                in your timezone, the difference between "submitted" and
                "saved as draft." The kind of thing that doesn't make it
                into application strategy guides because it feels obvious.
                It isn't obvious; ~5% of applications die for one of these
                reasons every cycle. Don't be in that 5%. <em>Now you know.</em>
              </p>
            </div>
          </section>

          {/* Office reject reasons — sits BEFORE the checklist because
              once you see how applications die procedurally, the
              checklist makes intuitive sense. */}
          <section className="mb-12 print:mb-8 print:break-before-page">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <p className="text-[10px] font-bold tracking-widest uppercase text-destructive">
                How applications die procedurally
              </p>
            </div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-3 print:text-xl">
              Five reasons committees never see your application.
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6 print:text-sm print:mb-4 print:leading-snug">
              These are NOT strategic problems (weak essay, low GPA, wrong
              fit). These are procedural — your application gets binned
              by the admissions OFFICE, not the committee. The committee
              never reads it. You don't get a notification.
            </p>
            <ol className="space-y-4 print:space-y-3">
              {OFFICE_REJECT_REASONS.map((r, i) => (
                <li
                  key={r.reason}
                  className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 print:p-3 print:rounded-lg break-inside-avoid"
                >
                  <p className="font-heading font-bold text-foreground text-base print:text-sm mb-2 print:mb-1">
                    {i + 1}. {r.reason}
                  </p>
                  <p className="text-sm text-foreground leading-snug mb-2 print:text-xs print:mb-1.5">
                    <strong className="text-destructive">How it happens:</strong> {r.mechanism}
                  </p>
                  <p className="text-sm text-foreground leading-snug print:text-xs">
                    <strong className="text-primary">Fix:</strong> {r.fix}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          {/* Pre-submission preparation checklist */}
          <section className="mb-12 print:mb-8 print:break-before-page">
            <div className="flex items-center gap-2 mb-3">
              <CheckSquare className="w-4 h-4 text-gold-dark" />
              <p className="text-[10px] font-bold tracking-widest uppercase text-gold-dark">
                Weeks before — the long-lead checklist
              </p>
            </div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-3 print:text-xl">
              Done 1–4 weeks before deadline.
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6 print:text-sm print:mb-4 print:leading-snug">
              These take TIME to do right — recommender packets,
              transcripts, test-score sends, statement drafting cycles.
              If it's less than 4 weeks to deadline and you haven't
              started these, you're behind. Catch up first.
            </p>
            <ol className="space-y-3 print:space-y-2">
              {PRE_SUBMISSION_CHECK.map((c, i) => (
                <li
                  key={c.item}
                  className="rounded-xl border border-border bg-card p-4 print:p-3 print:rounded-lg break-inside-avoid"
                >
                  <p className="font-heading font-bold text-foreground text-sm print:text-xs mb-1.5">
                    {String(i + 1).padStart(2, "0")}. {c.item}
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug mb-1.5 print:text-[11px]">
                    <strong className="text-foreground">Why:</strong> {c.why}
                  </p>
                  {c.how && (
                    <p className="text-xs text-foreground leading-snug print:text-[11px]">
                      <strong className="text-primary">How:</strong> {c.how}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </section>

          {/* Night-before 12-item checklist */}
          <section className="mb-12 print:mb-8 print:break-before-page">
            <div className="flex items-center gap-2 mb-3">
              <CheckSquare className="w-4 h-4 text-gold-dark" />
              <p className="text-[10px] font-bold tracking-widest uppercase text-gold-dark">
                Night before — verify all twelve
              </p>
            </div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-3 print:text-xl">
              The twelve verifications.
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6 print:text-sm print:mb-4 print:leading-snug">
              The 24 hours before deadline. Each one is a procedural
              check that prevents a specific failure mode. Work through
              them in order — they're sequenced so the later checks
              depend on the earlier ones being done.
            </p>
            <ol className="space-y-3 print:space-y-2">
              {NIGHT_BEFORE_CHECK.map((c, i) => (
                <li
                  key={c.item}
                  className="rounded-xl border border-border bg-card p-4 print:p-3 print:rounded-lg break-inside-avoid"
                >
                  <div className="flex items-baseline gap-2 mb-1.5">
                    <span className="font-heading text-2xl font-bold text-gold-dark/40 tabular-nums shrink-0 print:text-lg">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="font-heading font-bold text-foreground text-sm print:text-xs leading-tight">
                      {c.item}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug mb-1.5 print:text-[11px]">
                    <strong className="text-foreground">Why:</strong> {c.why}
                  </p>
                  {c.how && (
                    <p className="text-xs text-foreground leading-snug print:text-[11px]">
                      <strong className="text-primary">How:</strong> {c.how}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </section>

          {/* Waitlist letter template */}
          <section className="mb-12 print:mb-8 print:break-before-page">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-gold-dark" />
              <p className="text-[10px] font-bold tracking-widest uppercase text-gold-dark">
                If you're waitlisted
              </p>
            </div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-3 print:text-xl">
              The continued-interest letter.
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-5 print:text-sm print:mb-3 print:leading-snug">
              Programs put strong applicants on the waitlist when they
              need to balance the cohort or wait for declines from R1
              admits. A well-crafted letter of continued interest can
              move you to admit. Send it within 2 weeks of receiving
              the waitlist letter.
            </p>
            <div className="rounded-xl border border-gold-dark/30 bg-gold/5 p-4 print:p-3 print:rounded-lg">
              <p className="text-[11px] font-bold tracking-widest uppercase text-gold-dark mb-2 print:text-[10px] print:mb-1">
                Template
              </p>
              <p className="text-xs text-muted-foreground tracking-wide mb-1 print:text-[11px]">
                <strong className="text-foreground font-semibold">Subject:</strong> {WAITLIST_LETTER.subject}
              </p>
              <pre className="text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed mt-2 print:text-[11px] print:leading-snug">
{WAITLIST_LETTER.body}
              </pre>
            </div>
          </section>

          {/* Interview prep checklist */}
          <section className="mb-12 print:mb-8 print:break-before-page">
            <div className="flex items-center gap-2 mb-3">
              <CheckSquare className="w-4 h-4 text-gold-dark" />
              <p className="text-[10px] font-bold tracking-widest uppercase text-gold-dark">
                If you get an interview
              </p>
            </div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-3 print:text-xl">
              The five-item interview prep.
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-5 print:text-sm print:mb-3 print:leading-snug">
              Interview slots are scarce + signalled. Most are 30 min.
              Spend ~10 hours of prep per interview — these five items
              cover the ground that matters most.
            </p>
            <ol className="space-y-3 print:space-y-2">
              {INTERVIEW_PREP.map((c, i) => (
                <li
                  key={c.item}
                  className="rounded-xl border border-border bg-card p-4 print:p-3 print:rounded-lg break-inside-avoid"
                >
                  <p className="font-heading font-bold text-foreground text-sm print:text-xs mb-1.5">
                    {String(i + 1).padStart(2, "0")}. {c.item}
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug mb-1.5 print:text-[11px]">
                    <strong className="text-foreground">Why:</strong> {c.why}
                  </p>
                  {c.how && (
                    <p className="text-xs text-foreground leading-snug print:text-[11px]">
                      <strong className="text-primary">How:</strong> {c.how}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </section>

          {/* Tear-out pocket card */}
          <section className="mt-14 print:mt-0 print:break-before-page">
            <div className="flex items-center gap-3 mb-3">
              <span className="font-heading text-4xl font-bold text-gold-dark/40 print:text-3xl">06</span>
              <h2 className="font-heading text-2xl font-bold text-foreground print:text-xl">Tear-out: the night-before card.</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-5 print:text-sm print:mb-3 print:leading-snug">
              The 12 checks distilled into a one-page printable. Cut,
              fold, paste onto your monitor for submission week.
            </p>
            <div className="border-2 border-dashed border-foreground/60 rounded-2xl p-5 max-w-md mx-auto print:p-4 print:rounded-xl">
              <div className="flex items-center gap-2 mb-3 print:mb-2">
                <Scissors className="w-3 h-3 text-foreground rotate-90" />
                <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground">
                  Night-before card · TopUni
                </p>
              </div>
              <ol className="space-y-1.5 text-xs print:space-y-1 print:text-[11px]">
                {NIGHT_BEFORE_CHECK.map((c, i) => (
                  <li key={c.item} className="flex items-start gap-2 leading-tight">
                    <span className="font-heading font-bold text-foreground tabular-nums w-5 shrink-0">☐</span>
                    <span className="text-foreground flex-1">{c.item}</span>
                  </li>
                ))}
              </ol>
              <p className="text-[9px] text-muted-foreground border-t border-border/40 pt-2 mt-3 text-center print:pt-1.5 print:mt-2">
                topuni.org · Field Guide N°3 · application submission
              </p>
            </div>
          </section>

          {/* Back cover */}
          <div className="mt-12 print:mt-8 text-center text-xs text-muted-foreground space-y-1 print:break-before-page print:text-left">
            <div className="hidden print:block border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">
                © TopUni · topuni.org · Field Guide N°3
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                Want the TopUni AI strategy report to pre-fill which
                programs need WES vs. direct transcript vs. self-upload?
                The strategy report includes a program-by-program
                requirements matrix. Free to start.
              </p>
              <p className="text-xs text-muted-foreground mt-3 italic">
                Field Guide N°3 — Application Submission Checklist. 2026 edition.
              </p>
            </div>
          </div>

          <div className="mt-12 rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center print:hidden">
            <h3 className="font-heading text-lg font-bold text-foreground mb-2">
              Need help calibrating each program's requirements?
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              The TopUni AI strategy report takes your target programs
              and lists their specific submission requirements — which
              ones need WES, which take self-upload, which want letters
              5 days before deadline. Free to start.
            </p>
            <Link
              to="/topuni-ai"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:brightness-110 transition"
            >
              Build my strategy report
            </Link>
          </div>
        </div>
      </main>
      <Footer language="en" variant="dark" />
    </div>
  );
};

export default ApplicationChecklist;
