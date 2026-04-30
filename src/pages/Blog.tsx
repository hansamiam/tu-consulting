import { useNavigate } from "react-router-dom";
import { useRef } from "react";
import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { blogArticles } from "@/data/blogArticles";
import { countryGuides } from "@/data/countryGuides";

const Reveal = ({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
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

  const scrollRail = (dir: "left" | "right") => {
    railRef.current?.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-canvas-soft relative overflow-hidden">
      {/* Subtle warm ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[50vh] rounded-full blur-[160px] opacity-[0.06] pointer-events-none"
           style={{ background: "radial-gradient(circle, hsl(42 70% 50%) 0%, transparent 70%)" }} />

      <div className="relative">
        <Navigation language="en" />

        {/* ── MASTHEAD ──────────────────────────────────────── */}
        <header className="max-w-5xl mx-auto px-6 lg:px-10 pt-20 lg:pt-28 pb-16">
          <Reveal>
            <p className="text-[11px] font-mono uppercase tracking-[0.28em] text-gold-dark mb-12 text-center">
              <span className="inline-flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-gold-dark" />
                Vol. 01 · Spring 2026
                <span className="h-1 w-1 rounded-full bg-gold-dark" />
              </span>
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="border-y border-foreground/15 py-9 lg:py-12">
              <h1 className="font-heading text-[clamp(3rem,10vw,6rem)] font-bold leading-[0.95] tracking-[-0.04em] text-center">
                <span className="text-primary">TopUni </span>
                <span className="italic font-light text-gold-dark">Journal</span>
              </h1>
            </div>
          </Reveal>

          <Reveal delay={0.18}>
            <p className="text-center text-base sm:text-lg text-muted-foreground mt-8 max-w-md mx-auto leading-[1.6] font-light">
              Essays and field notes for ambitious students applying abroad.
            </p>
          </Reveal>
        </header>

        <main className="max-w-5xl mx-auto px-6 lg:px-10 pb-24 space-y-24">

          {/* ── FEATURED ESSAY ────────────────────────────────── */}
          {featured && (
            <Reveal>
              <article
                onClick={() => navigate(`/blog/${featured.id}`)}
                className="group cursor-pointer grid md:grid-cols-12 gap-7 md:gap-12 items-center"
              >
                <div className="md:col-span-7 aspect-[4/3] md:aspect-[16/11] overflow-hidden rounded-2xl bg-muted">
                  <img
                    src={featured.image}
                    alt={featured.title}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-[900ms]"
                    loading="lazy"
                  />
                </div>
                <div className="md:col-span-5">
                  <div className="flex items-center gap-2.5 mb-4 text-[11px]">
                    <span className="font-mono uppercase tracking-[0.18em] text-gold-dark">{featured.category}</span>
                    <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                    <span className="text-muted-foreground">{featured.readTime}</span>
                  </div>
                  <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-[-0.025em] leading-[1.1] mb-4 group-hover:text-gold-dark transition-colors">
                    {featured.title}
                  </h2>
                  <p className="text-base text-muted-foreground leading-[1.65] mb-5 line-clamp-3">
                    {featured.excerpt}
                  </p>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground group-hover:gap-3 transition-all">
                    Read essay <ArrowRight className="h-4 w-4 text-gold-dark" />
                  </span>
                </div>
              </article>
            </Reveal>
          )}

          {/* ── GRID ──────────────────────────────────────────── */}
          {rest.length > 0 && (
            <Reveal>
              <section>
                <div className="flex items-baseline justify-between mb-8">
                  <h2 className="font-heading text-xl font-bold tracking-tight text-foreground">More essays</h2>
                  <span className="text-xs text-muted-foreground tabular-nums font-mono">{String(rest.length).padStart(2, "0")} pieces</span>
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
                      <h3 className="font-heading text-xl font-bold tracking-[-0.015em] leading-[1.2] mb-2.5 group-hover:text-gold-dark transition-colors line-clamp-2">
                        {article.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-[1.65] line-clamp-3">{article.excerpt}</p>
                    </motion.article>
                  ))}
                </div>
              </section>
            </Reveal>
          )}

          {/* ── COUNTRY PLAYBOOKS — small, contained ─────────── */}
          <Reveal>
            <section className="border-t border-border pt-14">
              <div className="flex items-end justify-between mb-7">
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-gold-dark mb-1.5">Country playbooks</p>
                  <h2 className="font-heading text-xl font-bold tracking-tight text-foreground">By destination</h2>
                </div>
                <div className="hidden sm:flex gap-1.5">
                  <button
                    onClick={() => scrollRail("left")}
                    aria-label="Scroll left"
                    className="h-8 w-8 rounded-full border border-border bg-card hover:border-gold/40 hover:text-gold-dark flex items-center justify-center transition-colors"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => scrollRail("right")}
                    aria-label="Scroll right"
                    className="h-8 w-8 rounded-full border border-border bg-card hover:border-gold/40 hover:text-gold-dark flex items-center justify-center transition-colors"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div
                ref={railRef}
                className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 -mx-1 px-1"
                style={{ scrollbarWidth: "none" }}
              >
                <style>{`.scrollbar-hide::-webkit-scrollbar{display:none}`}</style>
                {countryGuides.map((g) => (
                  <button
                    key={g.slug}
                    onClick={() => navigate(`/blog/guide/${g.slug}`)}
                    className="snap-start shrink-0 w-44 bg-card border border-border rounded-xl p-4 text-left hover:border-gold/40 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">{g.flag}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-gold-dark group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <h3 className="font-heading font-semibold text-sm tracking-tight text-foreground group-hover:text-gold-dark transition-colors">
                      {g.country}
                    </h3>
                  </button>
                ))}
              </div>
            </section>
          </Reveal>

        </main>

        <Footer language="en" />
      </div>
    </div>
  );
};

export default Journal;
