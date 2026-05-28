import { Link } from "react-router-dom";
import { ArrowLeft, FileDown, Lock, Quote, Mail, Package, Scissors, AlertTriangle } from "lucide-react";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import PreviewBanner from "@/components/PreviewBanner";
import {
  ARCHETYPES,
  RECOMMENDER_PACKET,
  UNIVERSAL_ASK,
} from "@/data/recommendationLetterAsks";

/**
 * TopUni Field Guide N°2 — Recommendation Letter Asks ($19).
 * Structured around 5 relationship archetypes, each with a full
 * ask + follow-up + thank-you email template + red flags. Premium
 * tier from inception — matches the LF Field Guide series in
 * voice, structure, and depth.
 *
 * Storefront wiring + Stripe Checkout for the Buy button stay
 * parked per the catalog plan; the page is publicly previewable.
 */
const RecommendationLetterAsks = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation language="en" variant="overlay" />
      <PreviewBanner />
      <main className="flex-1 pt-28 pb-16 px-6 print:pt-4 print:pb-4">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/resources"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 print:hidden"
          >
            <ArrowLeft className="w-4 h-4" /> All resources
          </Link>

          {/* Cover masthead */}
          <header className="mb-10 print:mb-6 print:break-after-page">
            <div className="flex items-center gap-3 mb-4">
              <span className="h-px w-10 bg-gold-dark/40" aria-hidden />
              <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-gold-dark">
                TopUni · Field Guide N°2
              </p>
              <span className="h-px flex-1 bg-gold-dark/40" aria-hidden />
            </div>
            <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground mb-4 print:text-4xl leading-[1.05] tracking-tight">
              Recommendation Letter Asks.
            </h1>
            <p className="font-heading italic text-lg text-muted-foreground leading-relaxed max-w-xl print:text-base">
              Five relationship archetypes, the email that lands the yes,
              and the packet that turns a generic letter into a specific one.
            </p>

            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
              <div className="border-t border-foreground pt-2">
                <p className="text-[10px] tracking-widest uppercase text-muted-foreground">Pages</p>
                <p className="font-heading font-bold text-foreground text-lg">22</p>
              </div>
              <div className="border-t border-foreground pt-2">
                <p className="text-[10px] tracking-widest uppercase text-muted-foreground">Templates</p>
                <p className="font-heading font-bold text-foreground text-lg">15 emails</p>
              </div>
              <div className="border-t border-foreground pt-2">
                <p className="text-[10px] tracking-widest uppercase text-muted-foreground">Archetypes</p>
                <p className="font-heading font-bold text-foreground text-lg">5</p>
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
              © TopUni · topuni.org · Field Guide N°2 · 2026 edition
            </p>
          </header>

          {/* Field-note opener */}
          <section className="mb-12 print:mb-8 break-inside-avoid print:break-before-page">
            <div className="flex items-center gap-2 mb-4">
              <Quote className="w-4 h-4 text-gold-dark" />
              <p className="text-[10px] font-bold tracking-widest uppercase text-gold-dark">
                Why this guide exists
              </p>
            </div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4 print:text-xl">
              The letter I almost didn't ask for.
            </h2>
            <div className="prose prose-sm sm:prose-base max-w-none text-foreground/90 leading-relaxed print:text-sm print:leading-snug">
              <p>
                The single highest-leverage email I sent during my application
                cycle was to a professor I was 60% sure would say no. I drafted
                it for two days, opened with «Dear Professor», hovered over
                Send, closed the laptop, came back, hit Send. She wrote back
                in 40 minutes: <em>"Yes — send me what you have."</em>
              </p>
              <p>
                The letter she wrote turned out to be the strongest in my
                packet. Not because she was the most famous — she wasn't. It
                was the strongest because the ask I sent her gave her exactly
                what she needed to write a specific, evidence-rich letter
                instead of a generic one.
              </p>
              <p>
                Every grad-school applicant lives this twice. The ask, and the
                follow-up. And the asks I see most students send are versions
                of the same generic template — "Dear Professor, I am applying
                to grad school, would you write me a letter, the deadline is
                X." The professor reads that and writes back the equivalent.
              </p>
              <p>
                This field guide is the asks I wish I'd had in front of me
                that week. Five archetypes — the close professor, the distant
                one, the employer, the mentor, the peer. For each: who they
                are, what they're best at, the red flags that say find
                someone else, and the full ask + follow-up + thank-you email
                templates you can paste-and-adapt. Plus the recommender
                packet — the five things you send AFTER they say yes that
                turn an OK letter into a great one.
              </p>
              <p>
                <em>Now you know.</em>
              </p>
            </div>
          </section>

          {/* Recommender packet — sits before the archetypes because
              once you understand what to send, the asks make more sense. */}
          <section className="mb-12 print:mb-8 print:break-before-page">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-gold-dark" />
              <p className="text-[10px] font-bold tracking-widest uppercase text-gold-dark">
                What to send after they say yes
              </p>
            </div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-3 print:text-xl">
              The recommender packet.
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-5 print:text-sm print:mb-3 print:leading-snug">
              The single biggest predictor of letter quality is what you send
              the recommender AFTER they agree. Generic asks get generic
              letters; specific packets get specific letters. Here's the
              minimum-viable packet — five documents, one email.
            </p>
            <ol className="space-y-4 print:space-y-3">
              {RECOMMENDER_PACKET.map((p, i) => (
                <li
                  key={p.item}
                  className="rounded-xl border border-border bg-card p-4 print:p-3 print:rounded-lg break-inside-avoid"
                >
                  <div className="flex items-baseline gap-2 mb-2 print:mb-1">
                    <span className="font-heading text-2xl font-bold text-gold-dark/40 tabular-nums shrink-0 print:text-lg">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="font-heading text-base font-bold text-foreground print:text-sm leading-tight">
                      {p.item}
                    </h3>
                  </div>
                  <p className="text-sm text-foreground leading-snug mb-2 print:text-xs print:mb-1.5">
                    <strong className="text-gold-dark">What:</strong> {p.what}
                  </p>
                  <p className="text-sm text-muted-foreground leading-snug print:text-xs">
                    <strong className="text-foreground">Why:</strong> {p.why}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          {/* The 5 archetypes */}
          {ARCHETYPES.map((a, idx) => (
            <section
              key={a.label}
              className="mb-14 print:mb-0 print:break-before-page"
            >
              <div className="flex items-center gap-2 mb-3">
                <Mail className="w-4 h-4 text-gold-dark" />
                <p className="text-[10px] font-bold tracking-widest uppercase text-gold-dark">
                  Archetype {String(idx + 1).padStart(2, "0")}
                </p>
              </div>
              <h2 className="font-heading text-2xl font-bold text-foreground mb-3 print:text-xl leading-tight">
                {a.label}
              </h2>

              <div className="rounded-xl border border-border bg-card p-4 print:p-3 print:rounded-lg mb-5 print:mb-3">
                <p className="text-sm text-foreground leading-relaxed mb-3 print:text-xs print:mb-2">
                  <strong className="text-gold-dark">Profile:</strong> {a.profile}
                </p>
                <p className="text-sm text-foreground leading-relaxed print:text-xs">
                  {a.bestAt}
                </p>
              </div>

              {/* Red flags */}
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 print:p-3 print:rounded-lg mb-5 print:mb-3 break-inside-avoid">
                <div className="flex items-center gap-2 mb-2 print:mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                  <p className="text-[11px] font-bold tracking-widest uppercase text-destructive">
                    Red flags — find someone else
                  </p>
                </div>
                <ul className="space-y-1.5 print:space-y-1">
                  {a.redFlags.map((f, i) => (
                    <li
                      key={i}
                      className="text-sm text-foreground leading-snug print:text-xs print:leading-snug"
                    >
                      — {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Three email templates */}
              <div className="space-y-4 print:space-y-3">
                {[
                  { label: "The ask", t: a.ask },
                  { label: "The follow-up (after 5 business days)", t: a.followup },
                  { label: "The thank-you (after submission)", t: a.thanks },
                ].map((block) => (
                  <div
                    key={block.label}
                    className="rounded-xl border border-border bg-muted/20 p-4 print:p-3 print:rounded-lg break-inside-avoid"
                  >
                    <p className="text-[11px] font-bold tracking-widest uppercase text-gold-dark mb-2 print:text-[10px] print:mb-1">
                      {block.label}
                    </p>
                    <p className="text-xs text-muted-foreground tracking-wide mb-1 print:text-[11px]">
                      <strong className="text-foreground font-semibold">Subject:</strong> {block.t.subject}
                    </p>
                    <pre className="text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed mt-2 print:text-[11px] print:leading-snug">
{block.t.body}
                    </pre>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {/* Universal ask — tear-out card */}
          <section className="mt-14 print:mt-0 print:break-before-page">
            <div className="flex items-center gap-3 mb-3">
              <span className="font-heading text-4xl font-bold text-gold-dark/40 print:text-3xl">06</span>
              <h2 className="font-heading text-2xl font-bold text-foreground print:text-xl">Tear-out: the universal 6-line ask.</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-5 print:text-sm print:mb-3 print:leading-snug">
              When you have 5 minutes and need to ask someone right now —
              the minimum-viable ask. Adapt the one concrete reason; the
              rest stays.
            </p>
            <div className="border-2 border-dashed border-foreground/60 rounded-2xl p-5 max-w-lg mx-auto print:p-4 print:rounded-xl">
              <div className="flex items-center gap-2 mb-3 print:mb-2">
                <Scissors className="w-3 h-3 text-foreground rotate-90" />
                <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground">
                  Universal ask · TopUni
                </p>
              </div>
              <pre className="text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed print:text-[11px] print:leading-snug">
{UNIVERSAL_ASK}
              </pre>
              <p className="text-[9px] text-muted-foreground border-t border-border/40 pt-2 mt-3 text-center print:pt-1.5 print:mt-2">
                topuni.org · Field Guide N°2 · rec letter asks
              </p>
            </div>
          </section>

          {/* Back cover */}
          <div className="mt-12 print:mt-8 text-center text-xs text-muted-foreground space-y-1 print:break-before-page print:text-left">
            <div className="hidden print:block border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">
                © TopUni · topuni.org · Field Guide N°2
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                Want help calibrating which recommender fits which program?
                The TopUni AI strategy report includes a recommender-fit
                section — which of your potential letter-writers should
                write for which school. Free to start.
              </p>
              <p className="text-xs text-muted-foreground mt-3 italic">
                Field Guide N°2 — Recommendation Letter Asks. 2026 edition.
              </p>
            </div>
          </div>

          <div className="mt-12 rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center print:hidden">
            <h3 className="font-heading text-lg font-bold text-foreground mb-2">
              Not sure which recommender to ask?
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              The TopUni AI strategy report takes your profile + target
              programs and recommends which of your potential letter-writers
              fits each school's signal. Free to start.
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

export default RecommendationLetterAsks;
