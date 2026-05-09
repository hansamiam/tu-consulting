import { motion } from "framer-motion";
import { Award, Banknote, Clock, BookOpen } from "lucide-react";

type LiveMatchLite = {
  scholarship_id: string;
  scholarship_name: string;
  estimated_total_value_usd: number | null;
  application_deadline: string | null;
};

const fmtMoney = (v: number) =>
  v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `$${Math.round(v / 1000)}K` : `$${v}`;

/* Hero stats strip rendered above the brief body. Four KPIs parsed from
   liveMatches + brief text — the user's "wow" moment when the brief lands.
   Numbers animate in to reinforce that this is computed live, not boilerplate. */
export const BriefHeroStats = ({
  liveMatches, briefContent, isRu,
}: {
  liveMatches: LiveMatchLite[];
  briefContent: string;
  isRu: boolean;
}) => {
  const t = (en: string, ru: string) => (isRu ? ru : en);

  // Funding potential: sum of estimated_total_value_usd across all live matches
  const fundingUsd = liveMatches.reduce((sum, m) => sum + (m.estimated_total_value_usd || 0), 0);
  const fundingText = fundingUsd > 0 ? fmtMoney(fundingUsd) : "—";

  // Earliest non-rolling, non-closed deadline
  const now = Date.now();
  const upcoming = liveMatches
    .map(m => m.application_deadline ? Math.ceil((new Date(m.application_deadline).getTime() - now) / 86400000) : null)
    .filter((d): d is number => d !== null && d > 0);
  const closestDays = upcoming.length > 0 ? Math.min(...upcoming) : null;
  const closestText = closestDays === null
    ? t("Rolling", "Без срока")
    : closestDays <= 30
      ? `${closestDays}${t(" days", " дн.")}`
      : closestDays <= 365
        ? `${Math.round(closestDays / 7)}${t(" wks", " нед.")}`
        : `${Math.round(closestDays / 30)}${t(" mo", " мес.")}`;
  const closestUrgent = closestDays !== null && closestDays <= 30;

  // Approximate brief reading time — 220 words/min is the standard cite for
  // skimmable copy. We round up so very short briefs still show ≥ 1 min.
  const wordCount = briefContent.trim().split(/\s+/).filter(Boolean).length;
  const readMin = Math.max(1, Math.round(wordCount / 220));

  const stats: { label: string; value: string; sub?: string; icon: typeof Award; tone: "gold" | "neutral" | "urgent" }[] = [
    {
      label: t("Scholarships matched", "Найдено стипендий"),
      value: liveMatches.length.toString(),
      sub: t("from our verified DB", "из проверенной базы"),
      icon: Award,
      tone: "gold",
    },
    {
      label: t("Funding potential", "Потенциал финансирования"),
      value: fundingText,
      sub: t("if you secure all matches", "при получении всех совпадений"),
      icon: Banknote,
      tone: "gold",
    },
    {
      label: t("Closest deadline", "Ближайший дедлайн"),
      value: closestText,
      sub: closestUrgent ? t("Apply this month", "Подать в этом месяце") : t("plenty of runway", "есть время"),
      icon: Clock,
      tone: closestUrgent ? "urgent" : "neutral",
    },
    {
      label: t("Report depth", "Объём отчёта"),
      value: `${readMin} ${t("min", "мин")}`,
      sub: `${wordCount.toLocaleString(isRu ? "ru" : "en")} ${t("words", "слов")}`,
      icon: BookOpen,
      tone: "neutral",
    },
  ];

  return (
    <div className="not-prose mb-8 grid grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-4">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          className={`relative overflow-hidden rounded-xl border p-4 sm:p-5 ${
            s.tone === "gold" ? "border-gold/30 bg-gradient-to-br from-gold/[0.08] via-card to-card"
            : s.tone === "urgent" ? "border-destructive/30 bg-gradient-to-br from-destructive/[0.06] via-card to-card"
            : "border-border bg-card"
          }`}
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground leading-tight">
              {s.label}
            </p>
            <s.icon className={`w-3.5 h-3.5 shrink-0 ${
              s.tone === "gold" ? "text-gold-dark" :
              s.tone === "urgent" ? "text-destructive" :
              "text-muted-foreground/60"
            }`} />
          </div>
          <p className={`font-heading font-bold tracking-[-0.02em] tabular-nums leading-none ${
            s.tone === "urgent" ? "text-destructive" : "text-foreground"
          } text-2xl sm:text-3xl mb-1.5`}>
            {s.value}
          </p>
          {s.sub && (
            <p className="text-[11px] text-muted-foreground/80 leading-snug">{s.sub}</p>
          )}
        </motion.div>
      ))}
    </div>
  );
};
