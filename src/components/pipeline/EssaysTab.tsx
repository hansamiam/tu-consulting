/**
 * EssaysTab — single list view of every essay draft across every
 * saved scholarship. Solves the discoverability problem we created
 * by hiding drafts inside individual detail sheets: now there's one
 * place that says "here are all the things you've started writing".
 *
 * Each card → opens the parent's detail sheet for that scholarship,
 * which already routes to the EssayDraftPanel. No duplicate editor
 * surface; this is purely an index.
 */
import { Link } from "react-router-dom";
import { FileText, Search, ArrowRight, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cleanScholarshipName } from "@/lib/scholarshipFields";
import { shortCountry } from "@/lib/countryAccent";
import { daysUntil } from "@/lib/dates";

interface ScholarshipLite {
  scholarship_id: string;
  scholarship_name: string;
  host_country: string | null;
  application_deadline: string | null;
}

interface Props {
  rows: ScholarshipLite[];
  essayMap: Record<string, string>;
  language?: "en" | "ru";
  onOpen: (s: ScholarshipLite) => void;
}

const wordCount = (s: string): number => (s.trim() ? s.trim().split(/\s+/).length : 0);


const previewLine = (s: string, max = 180): string => {
  const trimmed = s.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max).replace(/\s+\S*$/, "") + "…";
};

export const EssaysTab = ({ rows, essayMap, language = "en", onOpen }: Props) => {
  const ru = language === "ru";
  const t = (en: string, r: string) => (ru ? r : en);

  // Build the list — only scholarships in `rows` that ALSO have an
  // essay draft. Sort by deadline urgency (soonest first), with rows
  // missing a deadline last.
  const drafts = rows
    .filter((r) => essayMap[r.scholarship_id]?.trim().length)
    .map((r) => ({ row: r, draft: essayMap[r.scholarship_id], days: daysUntil(r.application_deadline) }))
    .sort((a, b) => {
      if (a.days === null && b.days === null) return 0;
      if (a.days === null) return 1;
      if (b.days === null) return -1;
      return a.days - b.days;
    });

  const totalWords = drafts.reduce((s, d) => s + wordCount(d.draft), 0);

  if (drafts.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="h-16 w-16 rounded-full bg-card border border-border flex items-center justify-center mx-auto mb-5">
          <FileText className="w-7 h-7 text-muted-foreground/60" />
        </div>
        <h2 className="font-heading text-xl font-bold tracking-tight mb-2">
          {t("No essay drafts yet.", "Пока нет черновиков эссе.")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          {t(
            "Open any saved scholarship's detail sheet and start drafting. Stuck on the opening? Tap \"Get 3 starting drafts\" — the AI gives you three angles to pick from.",
            "Откройте любую сохранённую стипендию и начните черновик. Не знаете с чего начать? Нажмите «3 варианта вступления» — AI предложит три угла на выбор.",
          )}
        </p>
        <Button variant="gold" asChild className="gap-2">
          <Link to={ru ? "/discover/ru" : "/discover"}>
            <Search className="w-4 h-4" />
            {t("Find scholarships to draft for", "Найти стипендии")}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Header — count + total words. Tight; the cards do the talking. */}
      <div className="flex items-baseline justify-between gap-4 mb-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-1">
            {t("Essay drafts", "Черновики эссе")}
          </p>
          <h2 className="font-heading text-2xl font-bold tracking-tight leading-none">
            {drafts.length} {drafts.length === 1 ? t("draft", "черновик") : t("drafts", drafts.length < 5 ? "черновика" : "черновиков")}
          </h2>
        </div>
        <p className="text-[12px] text-muted-foreground tabular-nums">
          {totalWords.toLocaleString()} {t("words written", "написано слов")}
        </p>
      </div>

      <ul className="space-y-2.5">
        {drafts.map(({ row, draft, days }) => {
          const wc = wordCount(draft);
          const dlClass =
            days === null ? "text-muted-foreground" :
            days <= 0 ? "text-destructive" :
            days <= 7 ? "text-destructive" :
            days <= 30 ? "text-amber-700 dark:text-amber-500" : "text-muted-foreground";
          const dlText =
            days === null ? (row.application_deadline ? t("Rolling", "Постоянно") : t("Varies", "Варьируется")) :
            days <= 0 ? t("Closed", "Закрыто") :
            days === 1 ? t("1 day", "1 день") :
            days <= 30 ? `${days} ${t("days", "дн.")}` :
            `${Math.ceil(days / 30)} ${t("mo", "мес.")}`;
          return (
            <li key={row.scholarship_id}>
              <button
                onClick={() => onOpen(row)}
                className="group w-full text-left rounded-2xl border border-border bg-card hover:border-gold/40 hover:bg-card/80 transition-all p-4 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-gold-dark font-semibold mb-1">
                      {row.host_country ? shortCountry(row.host_country) : t("Open", "Открыто")}
                    </p>
                    <h3 className="font-heading font-semibold text-foreground text-[15px] leading-snug group-hover:text-gold-dark transition-colors line-clamp-1">
                      {cleanScholarshipName(row.scholarship_name)}
                    </h3>
                  </div>
                  <span className={`text-[11px] tabular-nums font-medium shrink-0 ${dlClass}`}>{dlText}</span>
                </div>
                <p className="text-[13px] text-foreground/75 leading-relaxed line-clamp-2 italic">
                  {previewLine(draft)}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <PenLine className="w-3 h-3" />
                    {wc.toLocaleString()} {t("words", "слов")}
                  </span>
                  <span className="inline-flex items-center gap-1 text-foreground/60 group-hover:text-gold-dark transition-colors">
                    {t("Keep editing", "Продолжить")} <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
