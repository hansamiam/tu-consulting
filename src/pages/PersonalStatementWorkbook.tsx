import { Link } from "react-router-dom";
import { ArrowLeft, FileDown, Quote, AlertTriangle, CheckSquare, Ban, PenLine } from "lucide-react";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import ComingSoonWall from "@/components/ComingSoonWall";
import DraftAdminBanner from "@/components/DraftAdminBanner";
import { useProductGate } from "@/hooks/useProductGate";
import { SECTIONS, SELF_EDIT_CHECKLIST, AVOID_LIST } from "@/data/personalStatementWorkbook";

const SLUG = "personal-statement-workbook" as const;

/**
 * Free Field Guide — Personal Statement Workbook. Structural teardown
 * of what makes a strong grad-school personal statement, plus prompts
 * the applicant works through to write their own. Not a "winning
 * essays" plagiarism kit; this is the architecture + the prompts that
 * pull the candidate's own material.
 */
const PersonalStatementWorkbook = () => {
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

          <header className="mb-10 print:mb-6 print:break-after-page">
            <div className="flex items-center gap-3 mb-4">
              <span className="h-px w-10 bg-gold-dark/40" aria-hidden />
              <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-gold-dark">
                TopUni · Free Field Guide
              </p>
              <span className="h-px flex-1 bg-gold-dark/40" aria-hidden />
            </div>
            <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground mb-4 print:text-4xl leading-[1.05] tracking-tight">
              The Personal Statement Workbook.
            </h1>
            <p className="font-heading italic text-lg text-muted-foreground leading-relaxed max-w-xl print:text-base">
              Not a kit of "winning essays" to copy. The architecture of
              statements that land — and the prompts that pull YOUR version
              of each section.
            </p>

            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
              <div className="border-t border-foreground pt-2">
                <p className="text-[10px] tracking-widest uppercase text-muted-foreground">Pages</p>
                <p className="font-heading font-bold text-foreground text-lg">14</p>
              </div>
              <div className="border-t border-foreground pt-2">
                <p className="text-[10px] tracking-widest uppercase text-muted-foreground">Sections</p>
                <p className="font-heading font-bold text-foreground text-lg">5</p>
              </div>
              <div className="border-t border-foreground pt-2">
                <p className="text-[10px] tracking-widest uppercase text-muted-foreground">Prompts</p>
                <p className="font-heading font-bold text-foreground text-lg">15</p>
              </div>
              <div className="border-t border-foreground pt-2">
                <p className="text-[10px] tracking-widest uppercase text-muted-foreground">Price</p>
                <p className="font-heading font-bold text-foreground text-lg">Free</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-gold-dark hover:underline print:hidden"
            >
              <FileDown className="w-4 h-4" /> Print or save as PDF
            </button>

            <p className="hidden print:block mt-12 text-[10px] text-muted-foreground border-t pt-3 tracking-wide">
              © TopUni · topuni.org · 2026 edition
            </p>
          </header>

          {/* Opener */}
          <section className="mb-12 print:mb-8 break-inside-avoid print:break-before-page">
            <div className="flex items-center gap-2 mb-4">
              <Quote className="w-4 h-4 text-gold-dark" />
              <p className="text-[10px] font-bold tracking-widest uppercase text-gold-dark">
                Why this workbook exists
              </p>
            </div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4 print:text-xl">
              You don't need someone else's winning essay. You need the moves.
            </h2>
            <div className="prose prose-sm sm:prose-base max-w-none text-foreground/90 leading-relaxed print:text-sm print:leading-snug">
              <p>
                The single most-copied genre in grad-school applications is
                the "winning personal statement essay bank." Applicants buy
                them, read them, get demoralised, and end up writing a
                pastiche of three other people's voices.
              </p>
              <p>
                The reason that approach fails is that personal statements
                aren't templates. They're <em>moves</em> — the open earns the
                next paragraph, the trajectory shows the arc not the list,
                the synthesis says what the writer thinks the question is.
                Five sections. Each section makes a different move.
              </p>
              <p>
                This workbook lays out the moves, names the failure mode of
                each, and gives you three short prompts per section. Spend
                10 minutes on each prompt and you'll have the raw material
                for a first draft no one else could write — because the
                material's yours.
              </p>
            </div>
          </section>

          {/* 5 sections */}
          <div className="space-y-12 print:space-y-8">
            {SECTIONS.map((s, i) => (
              <section
                key={s.label}
                className="break-inside-avoid print:break-before-page"
              >
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="font-heading text-4xl font-bold text-gold-dark/30 print:text-3xl">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h2 className="font-heading text-2xl font-bold text-foreground print:text-xl leading-tight">
                    {s.label}
                  </h2>
                </div>
                <p className="text-muted-foreground leading-relaxed mb-4 print:text-sm print:leading-snug">
                  {s.role}
                </p>

                {/* Opener example */}
                <div className="rounded-xl border border-gold-dark/30 bg-gold/5 p-4 mb-4 print:p-3 print:rounded-lg">
                  <p className="text-[11px] font-bold tracking-widest uppercase text-gold-dark mb-1.5 print:text-[10px]">
                    Opener archetype
                  </p>
                  <p className="text-sm text-foreground leading-snug italic print:text-xs">
                    {s.openerExample}
                  </p>
                </div>

                {/* Failure mode */}
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 mb-4 print:p-3 print:rounded-lg">
                  <div className="flex items-center gap-2 mb-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                    <p className="text-[11px] font-bold tracking-widest uppercase text-destructive">
                      Failure mode
                    </p>
                  </div>
                  <p className="text-sm text-foreground leading-snug print:text-xs">
                    {s.failureMode}
                  </p>
                </div>

                {/* Prompts */}
                <div className="rounded-xl border border-border bg-card p-4 mb-4 print:p-3 print:rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <PenLine className="w-3.5 h-3.5 text-gold-dark" />
                    <p className="text-[11px] font-bold tracking-widest uppercase text-gold-dark">
                      Your prompts (10 min each)
                    </p>
                  </div>
                  <ol className="space-y-2">
                    {s.prompts.map((p, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-foreground leading-snug print:text-xs">
                        <span className="font-heading font-bold text-gold-dark tabular-nums w-5 shrink-0">{j + 1}.</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Watch-outs */}
                <div className="rounded-xl border border-amber-500/30 bg-amber-50 p-4 print:p-3 print:rounded-lg break-inside-avoid">
                  <p className="text-[11px] font-bold tracking-widest uppercase text-amber-900 mb-1.5 print:text-[10px]">
                    Watch-outs
                  </p>
                  <ul className="space-y-1">
                    {s.watchOuts.map((w, j) => (
                      <li key={j} className="text-sm text-foreground leading-snug print:text-xs">
                        — {w}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            ))}
          </div>

          {/* Self-edit checklist */}
          <section className="mt-14 print:mt-0 print:break-before-page">
            <div className="flex items-center gap-3 mb-3">
              <CheckSquare className="w-4 h-4 text-gold-dark" />
              <p className="text-[10px] font-bold tracking-widest uppercase text-gold-dark">
                Before you submit
              </p>
            </div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-3 print:text-xl">
              Six self-edits that catch 90% of avoidable problems.
            </h2>
            <ol className="space-y-3 print:space-y-2">
              {SELF_EDIT_CHECKLIST.map((c, i) => (
                <li key={i} className="rounded-xl border border-border p-4 print:p-3 print:rounded-lg break-inside-avoid">
                  <p className="font-heading font-bold text-foreground text-sm print:text-xs mb-1">
                    {i + 1}. {c.check}
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug print:text-[11px]">
                    <strong className="text-foreground">Why:</strong> {c.why}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          {/* Avoid list */}
          <section className="mt-14 print:mt-0 print:break-before-page">
            <div className="flex items-center gap-3 mb-3">
              <Ban className="w-4 h-4 text-destructive" />
              <p className="text-[10px] font-bold tracking-widest uppercase text-destructive">
                Sentences that auto-bin you
              </p>
            </div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-3 print:text-xl">
              Ten phrases never to use in a grad-school personal statement.
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-5 print:text-sm print:mb-3 print:leading-snug">
              These appear in so many statements that admissions readers
              see them as a tell: this writer didn't think about what they
              were saying.
            </p>
            <ul className="space-y-2 print:space-y-1.5">
              {AVOID_LIST.map((line, i) => (
                <li key={i} className="text-sm text-foreground leading-snug print:text-xs">
                  <span className="font-mono text-destructive mr-2">✗</span>
                  {line}
                </li>
              ))}
            </ul>
          </section>

          <div className="mt-12 rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center print:hidden">
            <h3 className="font-heading text-lg font-bold text-foreground mb-2">
              Ready to draft yours?
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              The TopUni strategy report takes your profile + target programs
              and gives you per-program essay-angle suggestions. Free to start.
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

export default PersonalStatementWorkbook;
