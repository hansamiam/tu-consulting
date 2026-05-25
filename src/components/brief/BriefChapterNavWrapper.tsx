// Sticky chapter TOC for the BriefMinimal magazine view. Reads the
// streamed BriefSections and renders one anchor per section that has
// landed, labels matched to SECTION_KICKERS in types.ts.
//
// We don't reuse BriefChapterNav (which parses markdown h2s) because
// our sections come as structured JSON — the chapter list is derivable
// directly from the keys present on `sections`.
//
// Scrolling: each section in BriefMinimal renders as an <article>
// inside #printable-report, in SECTION_ORDER. Clicking a TOC item
// scrolls to the Nth article that matches the section's index in the
// payload. Active-section highlight uses IntersectionObserver on the
// same article elements.
import { useEffect, useMemo, useState } from "react";
import { type BriefSections, SECTION_KICKERS, SECTION_ORDER, type SectionId } from "./types";

interface Props {
  sections: BriefSections;
  lang: "en" | "ru";
}

const RU_KICKERS: Record<SectionId, string> = {
  archetype: "00 · Твой архетип",
  whereYouStand: "01 · Где ты стоишь",
  whereYouCanLand: "02 · Куда можешь попасть",
  whatToWrite: "03 · О чём писать",
  whatsBlockingYou: "04 · Что тебя блокирует",
  whatToDoThisMonth: "05 · Что делать в этом месяце",
};

export const BriefChapterNavWrapper = ({ sections, lang }: Props) => {
  // Chapters = the section ids that have actually streamed in,
  // ordered by canonical SECTION_ORDER.
  const chapters = useMemo(
    () =>
      SECTION_ORDER.filter((id) => sections[id] != null).map((id) => ({
        id,
        label: lang === "ru" ? RU_KICKERS[id] : SECTION_KICKERS[id],
      })),
    [sections, lang],
  );

  const [activeIdx, setActiveIdx] = useState<number>(0);

  // Active-section tracking. The BriefMinimal renderer emits one
  // <article> per section inside #printable-report, in the same order
  // as SECTION_ORDER. Observe each article and highlight the topmost
  // one currently intersecting the viewport.
  useEffect(() => {
    if (chapters.length === 0) return;
    const root = document.getElementById("printable-report");
    if (!root) return;
    const articles = Array.from(root.querySelectorAll("article"));
    if (articles.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          const idx = articles.indexOf(visible[0].target as HTMLElement);
          if (idx >= 0) setActiveIdx(idx);
        }
      },
      { rootMargin: "-80px 0px -65% 0px", threshold: 0 },
    );

    articles.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [chapters.length]);

  if (chapters.length < 2) return null;

  const scrollTo = (i: number) => {
    const root = document.getElementById("printable-report");
    if (!root) return;
    const articles = root.querySelectorAll("article");
    const target = articles[i] as HTMLElement | undefined;
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const heading = lang === "ru" ? "В этом отчёте" : "In this report";

  return (
    <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground mb-3 pl-3">
        {heading}
      </p>
      <ol className="space-y-1 border-l border-border">
        {chapters.map((c, i) => {
          const isActive = activeIdx === i;
          return (
            <li key={c.id}>
              <button
                onClick={() => scrollTo(i)}
                className={`w-full text-left flex items-baseline gap-2.5 pl-3 pr-2 py-1.5 -ml-px border-l-2 transition-all ${
                  isActive
                    ? "border-gold text-foreground font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <span className="text-[12px] leading-snug">{c.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
