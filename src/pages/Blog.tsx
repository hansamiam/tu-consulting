/* Blog (Journal) — index of published TopUni Journal articles.
 *
 * 2026-05-28: DB-backed. Reads public.journal_entries where
 * is_published=true (admin-authored at /admin/journal). When the table
 * is empty for the current language, falls back to the "Coming soon"
 * card — keeps the surface honest if nothing's been published yet.
 *
 * The static src/data/blogArticles.ts list stays as fallback for the
 * single-article view (BlogArticle.tsx) so legacy URLs don't break,
 * but it doesn't render on this index any more — index is purely the
 * editorial-current set.
 */
import { useEffect, useRef, useState } from "react";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { countryGuides } from "@/data/countryGuides";

const SHOW_COUNTRY_GUIDES = false;

interface JournalEntry {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  read_time: string | null;
  hero_image_url: string | null;
  published_at: string | null;
  sort_order: number;
}

interface BlogProps { language?: "en" | "ru"; }

const Blog = ({ language = "en" }: BlogProps) => {
  const navigate = useNavigate();
  const isRu = language === "ru";
  const railRef = useRef<HTMLDivElement>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("journal_entries" as never)
        .select("id, slug, title, excerpt, category, read_time, hero_image_url, published_at, sort_order")
        .eq("is_published", true)
        .eq("language", isRu ? "ru" : "en")
        .order("sort_order", { ascending: true })
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(60);
      setEntries((data ?? []) as unknown as JournalEntry[]);
      setLoaded(true);
    })();
  }, [isRu]);

  const scrollRail = (dir: "left" | "right") => {
    railRef.current?.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });
  };

  const featured = entries[0];
  const rest = entries.slice(1);
  const hasEntries = loaded && entries.length > 0;
  const slugPath = (slug: string) => `/blog/${slug}${isRu ? "/ru" : ""}`;

  return (
    <div className="min-h-screen bg-background">
      <Navigation language={language} />

      {/* Coming-soon — single line. No promises, no fake TOC. */}
      {loaded && !hasEntries && !SHOW_COUNTRY_GUIDES && (
        <main className="max-w-xl mx-auto px-6 lg:px-8 pt-24 pb-24 lg:pt-32 lg:pb-32">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-5"
          >
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-gold-dark" />
              <p className="text-[10px] font-mono uppercase tracking-[0.26em] text-gold-dark">
                {isRu ? "Журнал TopUni" : "TopUni Journal"}
              </p>
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-foreground tracking-[-0.02em] leading-[1.1]">
              {isRu ? "Скоро." : "Coming soon."}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isRu ? "Следите за обновлениями." : "Stay tuned."}
            </p>
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
                <button onClick={() => scrollRail("left")} aria-label="Scroll left" className="h-8 w-8 rounded-full border border-border bg-background hover:bg-muted flex items-center justify-center transition-colors">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => scrollRail("right")} aria-label="Scroll right" className="h-8 w-8 rounded-full border border-border bg-background hover:bg-muted flex items-center justify-center transition-colors">
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

      {hasEntries && (
        <main className="max-w-6xl mx-auto px-6 lg:px-10 py-10 lg:py-14 space-y-12 lg:space-y-14">
          {featured && (
            <section>
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-accent mb-3">
                {isRu ? "Главное" : "Featured"}
              </p>
              <article
                onClick={() => navigate(slugPath(featured.slug))}
                className="group cursor-pointer grid md:grid-cols-12 gap-5 md:gap-8 items-center bg-card border border-border rounded-lg p-4 md:p-5 hover:border-accent/40 transition-colors"
              >
                {featured.hero_image_url && (
                  <div className="md:col-span-5 aspect-[16/10] overflow-hidden rounded-md bg-muted">
                    <img
                      src={featured.hero_image_url}
                      alt={featured.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className={featured.hero_image_url ? "md:col-span-7" : "md:col-span-12"}>
                  <div className="flex items-center gap-2 mb-2 text-[11px]">
                    {featured.category && (
                      <>
                        <span className="font-mono uppercase tracking-wider text-accent">{featured.category}</span>
                        {featured.read_time && <span className="text-muted-foreground/50">·</span>}
                      </>
                    )}
                    {featured.read_time && <span className="text-muted-foreground">{featured.read_time}</span>}
                  </div>
                  <h2 className="font-heading text-xl md:text-2xl font-bold tracking-tight leading-snug mb-2 group-hover:text-accent transition-colors">
                    {featured.title}
                  </h2>
                  {featured.excerpt && (
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 md:line-clamp-3">
                      {featured.excerpt}
                    </p>
                  )}
                </div>
              </article>
            </section>
          )}

          {rest.length > 0 && (
            <section>
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-accent mb-4">
                {isRu ? "Ещё статьи" : "More essays"}
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rest.map((article) => (
                  <article
                    key={article.id}
                    onClick={() => navigate(slugPath(article.slug))}
                    className="group cursor-pointer bg-card border border-border rounded-lg overflow-hidden hover:border-accent/40 transition-colors"
                  >
                    {article.hero_image_url && (
                      <div className="aspect-[16/10] overflow-hidden bg-muted">
                        <img
                          src={article.hero_image_url}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-1.5 text-[11px]">
                        {article.category && (
                          <>
                            <span className="font-mono uppercase tracking-wider text-accent">{article.category}</span>
                            {article.read_time && <span className="text-muted-foreground/50">·</span>}
                          </>
                        )}
                        {article.read_time && <span className="text-muted-foreground">{article.read_time}</span>}
                      </div>
                      <h3 className="font-heading text-base font-bold tracking-tight leading-snug mb-1.5 group-hover:text-accent transition-colors line-clamp-2">
                        {article.title}
                      </h3>
                      {article.excerpt && (
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{article.excerpt}</p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </main>
      )}

      <Footer language={language} />
    </div>
  );
};

export default Blog;
