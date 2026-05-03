import { useEffect, useMemo, useState } from "react";

/* Auto-extracts h2 sections from a brief markdown blob and renders a sticky
   chapter nav. The brief's outer prose container is a normal flow, so we
   inject id="chapter-N" anchors into headings via a useEffect that scans the
   rendered DOM. Active chapter is computed from scroll position with an
   IntersectionObserver — same UX pattern Stripe and Linear use for docs. */

type Chapter = { id: string; title: string; n: string };

const numberize = (n: number, total: number): string => {
  const pad = total >= 10 ? 2 : 1;
  return n.toString().padStart(pad, "0");
};

export const BriefChapterNav = ({
  briefContent, isRu, scrollRootSelector = "#printable-report",
}: {
  briefContent: string;
  isRu: boolean;
  scrollRootSelector?: string;
}) => {
  const t = (en: string, ru: string) => (isRu ? ru : en);

  // Parse h2 titles directly from the markdown source — gives us a stable list
  // even before the DOM finishes rendering (streaming edge case).
  const chapters = useMemo<Chapter[]>(() => {
    const matches: { title: string }[] = [];
    const re = /^##\s+(.+?)\s*$/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(briefContent)) !== null) {
      const title = m[1].replace(/[#*_`]/g, "").trim();
      if (title.length > 0 && title.length < 80) matches.push({ title });
    }
    return matches.map((c, i) => ({
      title: c.title,
      n: numberize(i + 1, matches.length),
      id: `chapter-${i + 1}`,
    }));
  }, [briefContent]);

  const [activeId, setActiveId] = useState<string | null>(null);

  // Observe the wrapper divs that ReportRenderer emits with id="chapter-N".
  // Re-runs when chapter count changes (streaming) so late-arriving sections
  // also get tracked.
  useEffect(() => {
    if (chapters.length === 0) return;
    const targets = chapters
      .map(c => document.getElementById(c.id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      entries => {
        // Pick the topmost intersecting wrapper — gives a stable indicator
        // even when 2 sections cross the viewport simultaneously.
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -65% 0px", threshold: 0 },
    );

    targets.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [chapters.length, scrollRootSelector]);

  if (chapters.length < 2) return null;

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <aside className="hidden xl:block print:hidden">
      <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground mb-3 pl-3">
          {t("In this brief", "В этом брифе")}
        </p>
        <ol className="space-y-1 border-l border-border">
          {chapters.map(c => {
            const isActive = activeId === c.id;
            return (
              <li key={c.id}>
                <button
                  onClick={() => scrollTo(c.id)}
                  className={`w-full text-left flex items-baseline gap-2.5 pl-3 pr-2 py-1.5 -ml-px border-l-2 transition-all ${
                    isActive
                      ? "border-gold text-foreground font-semibold"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  <span className={`text-[10px] tabular-nums tracking-tight font-mono leading-tight pt-0.5 ${
                    isActive ? "text-gold-dark" : "text-muted-foreground/50"
                  }`}>
                    {c.n}
                  </span>
                  <span className="text-[12px] leading-snug">{c.title}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </aside>
  );
};
