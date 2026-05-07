import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { blogArticles } from "@/data/blogArticles";

interface Props {
  language: "en" | "ru";
}

const SITE = "https://topuni.org";

const BlogArticle = ({ language }: Props) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const article = blogArticles.find((a) => a.id === id);
  const isRu = language === "ru";
  const blogPath = isRu ? "/blog/ru" : "/blog";

  // ─── SEO meta + JSON-LD ───────────────────────────────────────────
  // Every Journal article needs: <title>, meta description, canonical,
  // OG / Twitter cards, and Article schema. Without these the page is
  // invisible to rich-result surfaces and shares default to the site
  // OG image. Re-runs whenever article / language flips.
  useEffect(() => {
    if (!article) return;
    const title = isRu ? article.titleRu : article.title;
    const excerpt = isRu ? article.excerptRu : article.excerpt;
    const category = isRu ? article.categoryRu : article.category;
    const url = `${SITE}/blog/${article.id}${isRu ? "/ru" : ""}`;

    document.title = `${title} — TopUni`;
    setMeta("description", excerpt);
    setMeta("og:title", `${title} — TopUni`, true);
    setMeta("og:description", excerpt, true);
    setMeta("og:type", "article", true);
    setMeta("og:url", url, true);
    setMeta("og:image", article.image, true);
    setMeta("og:image:alt", title, true);
    setMeta("article:section", category, true);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", excerpt);
    setMeta("twitter:image", article.image);
    setLink("canonical", url);

    injectJsonLd({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description: excerpt,
      image: article.image,
      url,
      // We don't track per-article publish dates today — these are
      // editorial pieces that get periodic refreshes. Fall back to a
      // stable past date so the schema is valid; real datePublished
      // would be a small content-model addition for later.
      datePublished: "2026-01-01",
      dateModified: new Date().toISOString().slice(0, 10),
      articleSection: category,
      author: {
        "@type": "Organization",
        name: "TopUni",
        url: SITE,
      },
      publisher: {
        "@type": "Organization",
        name: "TopUni",
        url: SITE,
        logo: {
          "@type": "ImageObject",
          url: `${SITE}/icon.png`,
        },
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": url,
      },
      inLanguage: isRu ? "ru" : "en",
    });
  }, [article, isRu]);

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

  const title = isRu ? article.titleRu : article.title;
  const category = isRu ? article.categoryRu : article.category;
  const readTime = isRu ? article.readTimeRu : article.readTime;
  const content = isRu ? article.contentRu : article.content;

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
          {/* Editorial header */}
          <header className="mb-10 pb-10 border-b border-border">
            <div className="flex items-center gap-3 mb-6 text-xs">
              <span className="font-mono uppercase tracking-wider text-accent">{category}</span>
              <span className="text-muted-foreground/50">·</span>
              <span className="text-muted-foreground">{readTime}</span>
            </div>
            <h1 className="font-heading text-4xl lg:text-6xl font-bold leading-[1.05] tracking-tight">
              {title}
            </h1>
          </header>

          {/* Body */}
          <div className="space-y-7 text-[17px] lg:text-lg leading-[1.7] text-foreground/85">
            {content.map((paragraph, i) => {
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

          {/* Editorial footer */}
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
  // Replace any prior LD payload tagged with the topuni-article id, so
  // re-renders with new article data don't accumulate <script> tags.
  const id = "topuni-article-jsonld";
  document.head.querySelector(`script#${id}`)?.remove();
  const el = document.createElement("script");
  el.id = id;
  el.type = "application/ld+json";
  // Escape \</script> + <!-- so a stray sequence in article content
  // can't break out of the JSON-LD block. See ScholarshipDetail
  // injectJsonLd for the same defense.
  el.text = JSON.stringify(payload)
    .replace(/<\/script>/gi, "<\\/script>")
    .replace(/<!--/g, "<\\u0021--");
  document.head.appendChild(el);
}

export default BlogArticle;
