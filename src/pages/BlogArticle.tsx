import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { blogArticles } from "@/data/blogArticles";

interface Props {
  language: "en" | "ru";
}

const SITE = "https://topuni.org";

// Unified article shape — both DB rows and static blogArticles fall
// into this so the render path doesn't need two code paths.
interface ArticleView {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  image: string;
  content: string[];
  publishedAt: string | null;
}

const BlogArticle = ({ language }: Props) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isRu = language === "ru";
  const blogPath = isRu ? "/blog/ru" : "/blog";
  const [article, setArticle] = useState<ArticleView | null>(null);
  const [loaded, setLoaded] = useState(false);

  // DB first (admin-published journal_entries), static second (legacy
  // hardcoded blogArticles list). The legacy URLs need to keep
  // resolving — when /why-tu was reframed it redirected to
  // /blog/admissions-consultant-checklist, which is a static entry.
  useEffect(() => {
    if (!id) { setLoaded(true); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("journal_entries" as never)
        .select("slug, title, excerpt, category, read_time, hero_image_url, content, published_at")
        .eq("slug", id)
        .eq("language", isRu ? "ru" : "en")
        .eq("is_published", true)
        .maybeSingle();

      if (cancelled) return;

      if (data) {
        const row = data as unknown as {
          slug: string; title: string; excerpt: string | null;
          category: string | null; read_time: string | null;
          hero_image_url: string | null; content: string[];
          published_at: string | null;
        };
        setArticle({
          slug: row.slug,
          title: row.title,
          excerpt: row.excerpt ?? "",
          category: row.category ?? "",
          readTime: row.read_time ?? "",
          image: row.hero_image_url ?? "",
          content: row.content ?? [],
          publishedAt: row.published_at,
        });
        setLoaded(true);
        return;
      }

      const fallback = blogArticles.find((a) => a.id === id);
      if (fallback) {
        setArticle({
          slug: fallback.id,
          title: isRu ? fallback.titleRu : fallback.title,
          excerpt: isRu ? fallback.excerptRu : fallback.excerpt,
          category: isRu ? fallback.categoryRu : fallback.category,
          readTime: isRu ? fallback.readTimeRu : fallback.readTime,
          image: fallback.image,
          content: isRu ? fallback.contentRu : fallback.content,
          publishedAt: null,
        });
      }
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [id, isRu]);

  // ─── SEO meta + JSON-LD ───────────────────────────────────────────
  useEffect(() => {
    if (!article) return;
    const url = `${SITE}/blog/${article.slug}${isRu ? "/ru" : ""}`;

    document.title = `${article.title} — TopUni`;
    setMeta("description", article.excerpt);
    setMeta("og:title", `${article.title} — TopUni`, true);
    setMeta("og:description", article.excerpt, true);
    setMeta("og:type", "article", true);
    setMeta("og:url", url, true);
    if (article.image) setMeta("og:image", article.image, true);
    if (article.image) setMeta("og:image:alt", article.title, true);
    if (article.category) setMeta("article:section", article.category, true);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", article.title);
    setMeta("twitter:description", article.excerpt);
    if (article.image) setMeta("twitter:image", article.image);
    setLink("canonical", url);

    injectJsonLd({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.title,
      description: article.excerpt,
      ...(article.image ? { image: article.image } : {}),
      url,
      // DB rows carry a real publish date; static articles fall back
      // to a stable date so the schema validates either way.
      datePublished: article.publishedAt ?? "2026-01-01",
      dateModified: new Date().toISOString().slice(0, 10),
      ...(article.category ? { articleSection: article.category } : {}),
      author: { "@type": "Organization", name: "TopUni", url: SITE },
      publisher: {
        "@type": "Organization",
        name: "TopUni",
        url: SITE,
        logo: { "@type": "ImageObject", url: `${SITE}/icon.png` },
      },
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      inLanguage: isRu ? "ru" : "en",
    });
  }, [article, isRu]);

  if (!loaded) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation language={language} />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation language={language} />
        <div className="max-w-2xl mx-auto px-6 py-32 text-center">
          <h1 className="font-heading text-3xl font-bold mb-4">
            {isRu ? "Статья не найдена" : "Article not found"}
          </h1>
          <Button onClick={() => navigate(blogPath)}>{isRu ? "Назад к блогу" : "Back to journal"}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation language={language} />

      <main className="max-w-3xl mx-auto px-6 lg:px-8 pt-12 lg:pt-16 pb-24">
        <button
          onClick={() => navigate(blogPath)}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-12 font-mono uppercase tracking-wider"
        >
          <ArrowLeft className="h-3 w-3" /> {isRu ? "Журнал" : "Journal"}
        </button>

        <article>
          <header className="mb-10 pb-10 border-b border-border">
            {(article.category || article.readTime) && (
              <div className="flex items-center gap-3 mb-6 text-xs">
                {article.category && (
                  <>
                    <span className="font-mono uppercase tracking-wider text-accent">{article.category}</span>
                    {article.readTime && <span className="text-muted-foreground/50">·</span>}
                  </>
                )}
                {article.readTime && <span className="text-muted-foreground">{article.readTime}</span>}
              </div>
            )}
            <h1 className="font-heading text-4xl lg:text-6xl font-bold leading-[1.05] tracking-tight">
              {article.title}
            </h1>
          </header>

          <div className="space-y-7 text-[17px] lg:text-lg leading-[1.7] text-foreground/85">
            {article.content.map((paragraph, i) => {
              const parts = paragraph.split(/\*\*(.*?)\*\*/g);
              return (
                <p key={i}>
                  {parts.map((part, j) =>
                    j % 2 === 1 ? (
                      <strong key={j} className="block font-heading text-foreground font-bold text-xl lg:text-2xl tracking-tight mt-10 mb-3">
                        {part}
                      </strong>
                    ) : (
                      <span key={j}>
                        {part.split("\n").map((line, k, arr) => (
                          <span key={k}>
                            {line}
                            {k < arr.length - 1 && <br />}
                          </span>
                        ))}
                      </span>
                    )
                  )}
                </p>
              );
            })}
          </div>

          <footer className="mt-16 pt-10 border-t border-border">
            <div className="bg-muted/30 border border-border rounded-lg p-7 lg:p-9">
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-accent mb-3">
                {isRu ? "Что дальше" : "Next"}
              </p>
              <h2 className="font-heading text-2xl font-bold tracking-tight mb-3">
                {isRu ? "Применить это к своему профилю." : "Apply this to your own profile."}
              </h2>
              <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                {isRu
                  ? "Получи ранжированный шорт-лист университетов и стипендий за пару минут."
                  : "Get a ranked university and scholarship shortlist tailored to you in minutes."}
              </p>
              <div className="flex flex-wrap gap-2.5">
                <Button variant="gold" onClick={() => navigate(isRu ? "/discover/ru" : "/discover")} className="gap-2">
                  {isRu ? "Открыть Discover" : "Open Discover"} <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" onClick={() => navigate(blogPath)}>
                  {isRu ? "Все статьи" : "More essays"}
                </Button>
              </div>
            </div>
          </footer>
        </article>
      </main>

      <Footer language={language} />
    </div>
  );
};

/* ─── DOM helpers for SEO meta — same shape as ScholarshipDetail ── */
function setMeta(name: string, content: string, isProperty = false) {
  const sel = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(sel);
  if (!el) {
    el = document.createElement("meta");
    if (isProperty) el.setAttribute("property", name);
    else el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}
function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}
function injectJsonLd(payload: object) {
  const id = "topuni-article-jsonld";
  document.head.querySelector(`script#${id}`)?.remove();
  const el = document.createElement("script");
  el.id = id;
  el.type = "application/ld+json";
  el.text = JSON.stringify(payload)
    .replace(/<\/script>/gi, "<\\/script>")
    .replace(/<!--/g, "<\\u0021--");
  document.head.appendChild(el);
}

export default BlogArticle;
