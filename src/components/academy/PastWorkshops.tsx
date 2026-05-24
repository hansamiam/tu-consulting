/**
 * PastWorkshops — member-facing recordings archive on /academy.
 *
 * Queries published rows from public.academy_workshops where a
 * recording_url exists and the scheduled_for is in the past. Renders
 * a section between CurrentCohort and AcademyResourceList so members
 * can catch the workshops they missed.
 *
 * RLS: as of migration 20260524170000_academy_workshops_member_read
 * any authenticated user can SELECT published rows. We additionally
 * filter to rows with a recording_url so this section only ever shows
 * watchable content. If there are zero rows, the section hides
 * entirely — AcademyResourceList already covers the "coming soon"
 * empty state for the page; we keep /academy lean.
 *
 * Admins seed rows via /admin/academy (AcademyFounderHub).
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PlayCircle, ExternalLink } from "lucide-react";

// Cast through any until npm run gen:types regenerates database.types.ts
// after the schema is applied to prod. Matches the pattern used in
// CurrentCohort.tsx for the same reason.
// TODO: remove after gen:types post db push
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface WorkshopRow {
  id: string;
  title: string;
  summary: string | null;
  scheduled_for: string | null;
  recording_url: string;
  kind: "workshop" | "office_hours" | "guide";
}

interface Props {
  language?: "en" | "ru";
}

const t = (en: string, ru: string, isRu: boolean) => (isRu ? ru : en);

const KIND_LABEL = {
  en: {
    workshop: "Workshop",
    office_hours: "Office hours",
    guide: "Guide",
  },
  ru: {
    workshop: "Воркшоп",
    office_hours: "Office hours",
    guide: "Гайд",
  },
} as const;

function formatDate(iso: string | null, isRu: boolean): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(isRu ? "ru-RU" : "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

const PastWorkshops = ({ language = "en" }: Props) => {
  const isRu = language === "ru";
  const [rows, setRows] = useState<WorkshopRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await db
        .from("academy_workshops")
        .select("id, title, summary, scheduled_for, recording_url, kind")
        .eq("is_published", true)
        .not("recording_url", "is", null)
        .lt("scheduled_for", new Date().toISOString())
        .order("scheduled_for", { ascending: false })
        .limit(20);
      if (cancelled) return;
      if (!error && data) {
        setRows(data as WorkshopRow[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className="max-w-3xl mx-auto px-4 pt-6 pb-14">
        <div className="animate-pulse bg-card border border-border rounded-2xl p-8 h-32" />
      </section>
    );
  }

  // Empty → hide. The resources section below handles "system is wired,
  // content lands soon" messaging; we don't need a second copy here.
  if (rows.length === 0) return null;

  return (
    <section className="max-w-3xl mx-auto px-4 pt-6 pb-14">
      <div className="mb-8 text-center">
        <p className="text-[10.5px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-3">
          {t("Workshop recordings", "Записи воркшопов", isRu)}
        </p>
        <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
          {t("Catch what you missed.", "Посмотрите то, что пропустили.", isRu)}
        </h2>
      </div>

      <ul className="divide-y divide-border border-y border-border">
        {rows.map((r) => (
          <li
            key={r.id}
            className="py-5 grid grid-cols-[auto_1fr_auto] gap-x-4 sm:gap-x-6 items-start"
          >
            <div className="pt-1 text-muted-foreground/70">
              <PlayCircle className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-1">
                {KIND_LABEL[isRu ? "ru" : "en"][r.kind] ?? r.kind}
                {r.scheduled_for && (
                  <span className="ml-2 text-muted-foreground/70 normal-case tracking-normal font-normal">
                    {formatDate(r.scheduled_for, isRu)}
                  </span>
                )}
              </p>
              <h3 className="font-heading font-semibold text-foreground text-[15.5px] sm:text-[16px] tracking-[-0.005em] leading-snug">
                {r.title}
              </h3>
              {r.summary && (
                <p className="text-[13.5px] text-muted-foreground mt-1.5 leading-relaxed max-w-[58ch]">
                  {r.summary}
                </p>
              )}
            </div>
            <div className="shrink-0">
              <a
                href={r.recording_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold-dark hover:text-gold transition-colors whitespace-nowrap mt-1"
              >
                {t("Watch", "Смотреть", isRu)}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default PastWorkshops;
