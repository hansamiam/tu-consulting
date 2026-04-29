import { useNavigate } from "react-router-dom";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowRight, ChevronLeft, ChevronRight, Mail, PenLine,
  BookOpen, Compass, Quote,
} from "lucide-react";
import { blogArticles } from "@/data/blogArticles";
import { countryGuides } from "@/data/countryGuides";

/* Issue / volume label — bumped manually as the journal grows. */
const ISSUE_META = {
  volume: "Vol. 01",
  issue: "Spring 2026",
  edition: "Inaugural Issue",
};

const Reveal = ({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-60px" }}
    transition={{ delay, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

const Journal = () => {
  const navigate = useNavigate();
  const featured = blogArticles[0];
  const rest = blogArticles.slice(1);
  const railRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const scrollRail = (dir: "left" | "right") => {
    railRef.current?.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation language="en" />

      {/* ── MASTHEAD ─────────────────────────────────────────── */}
      <header className="border-b border-border bg-gradient-to-b from-canvas-soft to-background">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 pt-14 lg:pt-20 pb-12 lg:pb-16">
          {/* Issue meta */}
          <Reveal>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3 text-[11px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
                <span>{ISSUE_META.volume}</span>
                <span className="opacity-40">·</span>
                <span>{ISSUE_META.issue}</span>
                <span className="opacity-40">·</span>
                <span className="text-gold-dark">{ISSUE_META.edition}</span>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="h-1 w-1 rounded-full bg-success" />
                <span className="font-mono uppercase tracking-wider">Published quarterly</span>
              </div>
            </div>
          </Reveal>

          {/* Title */}
          <Reveal delay={0.05}>
            <div className="border-y border-foreground py-7 lg:py-9">
              <h1 className="font-heading text-[clamp(3rem,9vw,7rem)] font-bold leading-[0.95] tracking-[-0.04em] text-center">
                <span className="text-primary">TopUni </span><span className="italic font-light text-gold-dark">Journal</span>
              </h1>
            </div>
          </Reveal>

          {/* Tagline */}
          <Reveal delay={0.15}>
            <p className="text-center text-sm sm:text-base text-muted-foreground mt-7 max-w-xl mx-auto leading-relaxed">
              Essays, field notes, and country playbooks for ambitious students applying to top universities abroad.
            </p>
          </Reveal>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 lg:px-10 py-14 lg:py-20 space-y-20 lg:space-y-24">

        {/* ── FEATURED ESSAY ───────────────────────────────────── */}
        {featured && (
          <Reveal>
            <section>
              <div className="flex items-center gap-3 mb-6">
                <span className="h-px w-8 bg-gold" />
                <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-gold-dark">Featured essay</p>
              </div>

              <article
                onClick={() => navigate(`/blog/${featured.id}`)}
                className="group cursor-pointer grid md:grid-cols-12 gap-6 md:gap-10 items-stretch"
              >
                <div className="md:col-span-7 aspect-[4/3] md:aspect-[16/11] overflow-hidden rounded-2xl bg-muted">
                  <img
                    src={featured.image}
                    alt={featured.title}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-[900ms]"
                    loading="lazy"
                  />
                </div>
                <div className="md:col-span-5 flex flex-col justify-center">
                  <div className="flex items-center gap-2.5 mb-4 text-[11px]">
                    <span className="font-mono uppercase tracking-[0.18em] text-gold-dark">{featured.category}</span>
                    <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                    <span className="text-muted-foreground">{featured.readTime}</span>
                  </div>
                  <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold tracking-[-0.02em] leading-[1.05] mb-5 group-hover:text-gold-dark transition-colors">
                    {featured.title}
                  </h2>
                  <p className="text-base text-muted-foreground leading-[1.65] mb-6 line-clamp-4">
                    {featured.excerpt}
                  </p>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground group-hover:gap-3 transition-all">
                    Read essay <ArrowRight className="h-4 w-4 text-gold-dark" />
                  </span>
                </div>
              </article>
            </section>
          </Reveal>
        )}

        {/* ── EDITORS' NOTE ────────────────────────────────────── */}
        <Reveal>
          <section className="grid md:grid-cols-12 gap-6 md:gap-10 items-start">
            <div className="md:col-span-3">
              <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-gold-dark mb-2">From the editors</p>
            </div>
            <div className="md:col-span-9">
              <Quote className="h-7 w-7 text-gold-dark mb-4" />
              <p className="font-heading text-xl md:text-2xl text-foreground leading-[1.4] tracking-tight">
                <em className="font-light">
                  We started TopUni Journal because the existing playbook for studying abroad doesn't account for
                  students like ours — applying from emerging markets, against systems built for someone else.
                  Every essay here is honest about what it cost, what worked, and what didn't.
                </em>
              </p>
              <p className="text-sm text-muted-foreground mt-5">— The TopUni Editors</p>
            </div>
          </section>
        </Reveal>

        {/* ── LATEST ESSAYS GRID ───────────────────────────────── */}
        {rest.length > 0 && (
          <Reveal>
            <section>
              <div className="flex items-end justify-between mb-8 pb-5 border-b border-border">
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-gold-dark mb-2">Latest essays</p>
                  <h2 className="font-heading text-2xl md:text-3xl font-bold tracking-[-0.02em] text-foreground">
                    The current issue
                  </h2>
                </div>
                <span className="text-sm text-muted-foreground tabular-nums hidden sm:inline">{String(rest.length).padStart(2, "0")} pieces</span>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7 md:gap-8">
                {rest.map((article, i) => (
                  <motion.article
                    key={article.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-30px" }}
                    transition={{ delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    onClick={() => navigate(`/blog/${article.id}`)}
                    className="group cursor-pointer"
                  >
                    <div className="aspect-[4/3] overflow-hidden rounded-xl bg-muted mb-5">
                      <img
                        src={article.image}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-[900ms]"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex items-center gap-2 mb-3 text-[11px]">
                      <span className="font-mono uppercase tracking-[0.18em] text-gold-dark">{article.category}</span>
                      <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                      <span className="text-muted-foreground">{article.readTime}</span>
                    </div>
                    <h3 className="font-heading text-xl md:text-[22px] font-bold tracking-[-0.015em] leading-[1.2] mb-3 group-hover:text-gold-dark transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-[1.65] line-clamp-3">{article.excerpt}</p>
                  </motion.article>
                ))}
              </div>
            </section>
          </Reveal>
        )}

        {/* ── COUNTRY PLAYBOOKS RAIL ───────────────────────────── */}
        <Reveal>
          <section className="bg-canvas-soft border border-border rounded-3xl p-8 md:p-10">
            <div className="flex items-end justify-between mb-7">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                  <Compass className="h-5 w-5 text-gold-dark" />
                </div>
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-gold-dark mb-1">Country playbooks</p>
                  <h2 className="font-heading text-2xl font-bold tracking-[-0.02em] text-foreground leading-tight">Field reports from the application trenches</h2>
                  <p className="text-sm text-muted-foreground mt-1.5">Visa rules, costs, and admissions cycles for {countryGuides.length} countries — verified, not invented.</p>
                </div>
              </div>
              <div className="hidden sm:flex gap-1.5 shrink-0">
                <button
                  onClick={() => scrollRail("left")}
                  aria-label="Scroll left"
                  className="h-9 w-9 rounded-full border border-border bg-background hover:border-gold/40 hover:text-gold-dark flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => scrollRail("right")}
                  aria-label="Scroll right"
                  className="h-9 w-9 rounded-full border border-border bg-background hover:border-gold/40 hover:text-gold-dark flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div
              ref={railRef}
              className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 -mx-1 px-1"
              style={{ scrollbarWidth: "none" }}
            >
              <style>{`.scrollbar-hide::-webkit-scrollbar{display:none}`}</style>
              {countryGuides.map((g, i) => (
                <motion.button
                  key={g.slug}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.5 }}
                  onClick={() => navigate(`/blog/guide/${g.slug}`)}
                  className="snap-start shrink-0 w-48 bg-card border border-border rounded-xl p-5 text-left hover:border-gold/40 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl">{g.flag}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-gold-dark group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <h3 className="font-heading font-bold text-base tracking-tight text-foreground group-hover:text-gold-dark transition-colors leading-tight">
                    {g.country}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2">{g.tagline}</p>
                </motion.button>
              ))}
            </div>
          </section>
        </Reveal>

        {/* ── WRITE FOR THE JOURNAL ────────────────────────────── */}
        <Reveal>
          <section className="grid md:grid-cols-12 gap-6 md:gap-10 items-center bg-primary rounded-3xl px-8 md:px-12 py-12 md:py-16 relative overflow-hidden">
            <div className="absolute -top-1/3 left-1/4 w-2/3 h-full rounded-full blur-[120px] opacity-20" style={{ background: "radial-gradient(circle, hsl(42 70% 50%) 0%, transparent 60%)" }} />
            <div className="md:col-span-7 relative">
              <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-gold mb-3">Open submissions</p>
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-primary-foreground tracking-[-0.02em] leading-[1.1] mb-4">
                Write for the Journal.
              </h2>
              <p className="text-primary-foreground/65 leading-[1.65] max-w-xl mb-6">
                If you've applied, gotten in, or learned the hard way — we want your essay. Honest dispatches from
                students in the trenches help every reader after you. We pay for accepted pieces and edit
                generously.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="gold" size="lg" asChild className="gap-2">
                  <a href="mailto:editors@topuni.com?subject=Journal%20submission%20pitch">
                    <PenLine className="h-4 w-4" /> Pitch an essay
                  </a>
                </Button>
                <Button variant="outline" size="lg" className="bg-primary-foreground/[0.04] border-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/[0.1]" asChild>
                  <a href="mailto:editors@topuni.com?subject=Journal%20submission%20guidelines">
                    <BookOpen className="h-4 w-4 mr-2" /> Read guidelines
                  </a>
                </Button>
              </div>
            </div>
            <div className="md:col-span-5 relative">
              <div className="bg-primary-foreground/[0.04] border border-primary-foreground/10 backdrop-blur rounded-2xl p-6">
                <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-gold mb-4">What we publish</p>
                <ul className="space-y-3 text-sm text-primary-foreground/80">
                  <li className="flex items-start gap-2.5"><span className="text-gold mt-0.5">→</span><span>First-person application stories with concrete numbers and timelines.</span></li>
                  <li className="flex items-start gap-2.5"><span className="text-gold mt-0.5">→</span><span>Country deep-dives that go past brochure copy.</span></li>
                  <li className="flex items-start gap-2.5"><span className="text-gold mt-0.5">→</span><span>Scholarship post-mortems — what worked, what didn't.</span></li>
                  <li className="flex items-start gap-2.5"><span className="text-gold mt-0.5">→</span><span>Honest reviews of programs, summer schools, fellowships.</span></li>
                </ul>
              </div>
            </div>
          </section>
        </Reveal>

        {/* ── SUBSCRIBE ────────────────────────────────────────── */}
        <Reveal>
          <section className="border-y border-border py-14 md:py-16 text-center">
            <Mail className="h-7 w-7 text-gold-dark mx-auto mb-4" />
            <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-[-0.02em] text-foreground mb-3">
              The next issue, in your inbox.
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto leading-[1.65] mb-7">
              Quarterly. One email. The full table of contents plus an editor's note. Unsubscribe anytime.
            </p>
            {submitted ? (
              <p className="text-sm font-medium text-success">✓ You're on the list. Watch your inbox.</p>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="h-12 text-base bg-card"
                />
                <Button type="submit" variant="gold" className="h-12 px-6 gap-2">
                  Subscribe <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            )}
          </section>
        </Reveal>

      </main>

      <Footer language="en" />
    </div>
  );
};

export default Journal;
