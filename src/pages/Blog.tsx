/* Blog (Journal) — pre-launch teaser surface.
 *
 * The article catalogue + magazine layout is gated behind SHOW_ARTICLES.
 * While SHOW_ARTICLES is false (commission still in flight), this page
 * renders a single premium "intermission" — a brief editorial promise of
 * what's coming, not a half-empty article list with one giant title block.
 *
 * Redesigned 2026-05-10 per user direction "the TopUni Journal header is
 * too big, redesign the whole page". Now: small editorial eyebrow,
 * tightened wordmark, a typeset note describing the angle of the
 * publication, and a quiet sample-line teaser of what the first issues
 * will explore. No bottom navy ramp (which read as marketing chrome on
 * an essentially empty page).
 *
 * Switch SHOW_ARTICLES back to true to re-expose the magazine layout
 * below; the data and routes were never removed.
 */
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { blogArticles } from "@/data/blogArticles";
import { countryGuides } from "@/data/countryGuides";

const SHOW_COUNTRY_GUIDES = false;
const SHOW_ARTICLES = false;

/* Sample lines that feel like an editorial table-of-contents-in-the-
 * making — one specific angle each, written as if the next issue is
 * about to print. No headlines yet, just teasers. */
const TEASER_LINES = [
  "On the Schwarzman essay that almost didn't make the cut",
  "The day-of-acceptance call: what 8 of our scholars did with the next 24 hours",
  "Why your safety school deserves the same essay you wrote for your reach",
  "Reading rejection: how the Rhodes panel actually decides",
  "Three sentences to never write in a personal statement",
];

const Blog = () => {
  const navigate = useNavigate();
  const featured = blogArticles[0];
  const rest = blogArticles.slice(1);
  const railRef = useRef<HTMLDivElement>(null);
  const [teaserIdx, setTeaserIdx] = useState(0);

  /* Cycle teaser lines every 4s — soft, no flashing, just keeps the
   * page feeling alive. Stops if reduced-motion is preferred. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = window.setInterval(() => {
      setTeaserIdx((i) => (i + 1) % TEASER_LINES.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, []);

  const scrollRail = (dir: "left" | "right") => {
    railRef.current?.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation language="en" />

      {/* Coming-soon hero — quiet, editorial, "magazine in production"
          feel. No giant gradient wordmark — the smallness IS the
          treatment. */}
      {!SHOW_ARTICLES && !SHOW_COUNTRY_GUIDES && (
        <main className="max-w-2xl mx-auto px-6 lg:px-8 pt-20 pb-24 lg:pt-28 lg:pb-32">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-8"
          >
            {/* Issue indicator — sets the tone: "this is a publication" */}
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-gold-dark" />
              <p className="text-[10px] font-mono uppercase tracking-[0.26em] text-gold-dark">
                Issue 01 · in production
              </p>
            </div>

            {/* Wordmark — restrained, editorial. Not a giant gradient
                splash. */}
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-foreground tracking-[-0.02em] leading-[1.1]">
              The TopUni Journal
            </h1>

            {/* Editorial promise — what the publication is, in one line.
                Voice: confident, specific, written from inside the
                competition. */}
            <p className="text-base sm:text-lg text-foreground/80 leading-relaxed max-w-xl">
              Long-form notes from inside the world's most competitive scholarships —
              written by the team and by alumni who've actually won them.
            </p>

            {/* Cycling teaser — gives the page a rhythm without flashing
                ads. Read like a magazine's coming-soon table of
                contents being typeset live. */}
            <div className="pt-2 border-t border-border/60 max-w-xl">
              <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground mb-3 pt-5">
                In the first issues
              </p>
              <div className="relative h-14 sm:h-12 overflow-hidden">
                {TEASER_LINES.map((line, i) => (
                  <motion.p
                    key={i}
                    className="absolute inset-0 text-sm sm:text-[15px] text-foreground/70 italic leading-relaxed"
                    animate={{
                      opacity: i === teaserIdx ? 1 : 0,
                      y: i === teaserIdx ? 0 : (i < teaserIdx ? -8 : 8),
                    }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  >
                    — {line}
                  </motion.p>
                ))}
              </div>
            </div>

            {/* Quiet outbound — Discover is the thing to do while the
                Journal types itself. No giant CTA pill — just a magazine-
                style end-card line. */}
            <div className="pt-4 max-w-xl">
              <button
                onClick={() => navigate("/discover")}
                className="group inline-flex items-center gap-2 text-sm font-medium text-gold-dark hover:text-foreground transition-colors"
              >
                <span className="border-b border-gold-dark/40 group-hover:border-foreground/40 pb-0.5 transition-colors">
                  Read the scholarship database while we write
                </span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </motion.div>
        </main>
      )}

      {/* Country guides — sliding rail (hidden until fleshed out) */}
      {SHOW_COUNTRY_GUIDES && (
        <main className="max-w-6xl mx-auto px-6 lg:px-10 py-10 lg:py-14 space-y-12 lg:space-y-14">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-xl lg:text-2xl font-bold tracking-tight">
                Country guides
              </h2>
              <div className="flex gap-1.5">
                <button
                  onClick={() => scrollRail("left")}
                  aria-label="Scroll left"
                  className="h-8 w-8 rounded-full border border-border bg-background hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => scrollRail("right")}
                  aria-label="Scroll right"
                  className="h-8 w-8 rounded-full border border-border bg-background hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div
              ref={railRef}
              className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1 scrollbar-hide"
              style={{ scrollbarWidth: "none" }}
            >
              {countryGuides.map((g) => (
                <button
                  key={g.slug}
                  onClick={() => navigate(`/blog/guide/${g.slug}`)}
                  className="snap-start shrink-0 w-44 bg-card border border-border rounded-lg p-4 text-left hover:border-accent/40 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{g.flag}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <h3 className="font-heading font-semibold text-sm tracking-tight group-hover:text-accent transition-colors">
                    {g.country}
                  </h3>
                </button>
              ))}
            </div>
          </section>
        </main>
      )}

      {SHOW_ARTICLES && (
        <main className="max-w-6xl mx-auto px-6 lg:px-10 py-10 lg:py-14 space-y-12 lg:space-y-14">
          {featured && (
            <section>
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-accent mb-3">Featured</p>
              <article
                onClick={() => navigate(`/blog/${featured.id}`)}
                className="group cursor-pointer grid md:grid-cols-12 gap-5 md:gap-8 items-center bg-card border border-border rounded-lg p-4 md:p-5 hover:border-accent/40 transition-colors"
              >
                <div className="md:col-span-5 aspect-[16/10] overflow-hidden rounded-md bg-muted">
                  <img
                    src={featured.image}
                    alt={featured.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                </div>
                <div className="md:col-span-7">
                  <div className="flex items-center gap-2 mb-2 text-[11px]">
                    <span className="font-mono uppercase tracking-wider text-accent">{featured.category}</span>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="text-muted-foreground">{featured.readTime}</span>
                  </div>
                  <h2 className="font-heading text-xl md:text-2xl font-bold tracking-tight leading-snug mb-2 group-hover:text-accent transition-colors">
                    {featured.title}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 md:line-clamp-3">
                    {featured.excerpt}
                  </p>
                </div>
              </article>
            </section>
          )}

          {rest.length > 0 && (
            <section>
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-accent mb-4">More essays</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rest.map((article) => (
                  <article
                    key={article.id}
                    onClick={() => navigate(`/blog/${article.id}`)}
                    className="group cursor-pointer bg-card border border-border rounded-lg overflow-hidden hover:border-accent/40 transition-colors"
                  >
                    <div className="aspect-[16/10] overflow-hidden bg-muted">
                      <img
                        src={article.image}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-1.5 text-[11px]">
                        <span className="font-mono uppercase tracking-wider text-accent">{article.category}</span>
                        <span className="text-muted-foreground/50">·</span>
                        <span className="text-muted-foreground">{article.readTime}</span>
                      </div>
                      <h3 className="font-heading text-base font-bold tracking-tight leading-snug mb-1.5 group-hover:text-accent transition-colors line-clamp-2">
                        {article.title}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{article.excerpt}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </main>
      )}

      <Footer language="en" />
    </div>
  );
};

export default Blog;
