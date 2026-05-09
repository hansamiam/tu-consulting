import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ArrowRight, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRef } from "react";
import { motion } from "framer-motion";
import { blogArticles } from "@/data/blogArticles";
import { countryGuides } from "@/data/countryGuides";

// Compact magazine layout. Navy gradient hero matches Academy / Team for
// brand consistency. Sliding country-guide tiles, tight vertical rhythm.
const Blog = () => {
  const navigate = useNavigate();
  const featured = blogArticles[0];
  const rest = blogArticles.slice(1);
  const railRef = useRef<HTMLDivElement>(null);

  const scrollRail = (dir: "left" | "right") => {
    railRef.current?.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation language="en" />

      {/* HERO — navy gradient, brand-consistent with Academy + Team */}
      <section className="relative bg-gradient-to-br from-primary via-primary to-primary/90 py-16 sm:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--gold)/0.1),_transparent_60%)]" />
        <div className="relative max-w-6xl mx-auto px-6 lg:px-10 text-center">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 bg-gold/15 border border-gold/40 px-3 py-1 rounded-full text-gold text-xs font-semibold mb-5">
            <BookOpen className="h-3.5 w-3.5" /> Reading
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] text-primary-foreground">
            TopUni <span className="text-gold">Journal</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-primary-foreground/70 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mt-4">
            Essays, country guides, and admissions intel from the team that's been through it.
          </motion.p>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-6 lg:px-10 py-10 lg:py-14 space-y-12 lg:space-y-14">

        {/* Country guides — sliding rail */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-xl lg:text-2xl font-bold tracking-tight text-foreground">
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
                className="snap-start shrink-0 w-44 bg-card border border-border rounded-lg p-4 text-left hover:border-gold/40 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
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

        {/* Featured + essays — compact */}
        {featured && (
          <section>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-gold-dark mb-3">Featured</p>
            <article
              onClick={() => navigate(`/blog/${featured.id}`)}
              className="group cursor-pointer grid md:grid-cols-12 gap-5 md:gap-8 items-center bg-card border border-border rounded-lg p-4 md:p-5 hover:border-gold/40 transition-colors"
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
                  <span className="font-mono uppercase tracking-wider text-gold-dark">{featured.category}</span>
                  <span className="text-muted-foreground/50">·</span>
                  <span className="text-muted-foreground">{featured.readTime}</span>
                </div>
                <h2 className="font-heading text-xl md:text-2xl font-bold tracking-tight leading-snug mb-2 group-hover:text-gold-dark transition-colors">
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
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-gold-dark mb-4">More essays</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rest.map((article) => (
                <article
                  key={article.id}
                  onClick={() => navigate(`/blog/${article.id}`)}
                  className="group cursor-pointer bg-card border border-border rounded-lg overflow-hidden hover:border-gold/40 transition-colors"
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
                      <span className="font-mono uppercase tracking-wider text-gold-dark">{article.category}</span>
                      <span className="text-muted-foreground/50">·</span>
                      <span className="text-muted-foreground">{article.readTime}</span>
                    </div>
                    <h3 className="font-heading text-base font-bold tracking-tight leading-snug mb-1.5 group-hover:text-gold-dark transition-colors line-clamp-2">
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

      {/* Bottom bookend — gradient ramp into the navy footer */}
      <div
        className="h-32 sm:h-40"
        style={{
          backgroundImage: `linear-gradient(180deg,
            transparent 0%,
            hsl(var(--primary) / 0.06) 40%,
            hsl(var(--primary) / 0.30) 75%,
            hsl(var(--primary)) 100%)`,
        }}
        aria-hidden="true"
      />

      <Footer language="en" />
    </div>
  );
};

export default Blog;
