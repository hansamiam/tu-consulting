/**
 * RecommendersPanel — track who's writing your letters of recommendation.
 *
 * The most common reason a strong candidate misses a deadline isn't
 * ineligibility, it's a recommender who agreed but never submitted.
 * This panel makes the asked → agreed → submitted state explicit so
 * the student can see which letters are still outstanding without
 * mentally tracking it across email threads.
 *
 * Round 21: closed the follow-up loop. Each non-submitted recommender
 * now shows "asked N days ago" + a one-click "Send polite reminder"
 * mailto button. The composed email auto-fills with the scholarship
 * name + deadline + student's name. This is the moat play —
 * aggregator competitors can't ship this because they have no
 * application-execution layer.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Mail, Check, MessageCircle, Send } from "lucide-react";
import type { Recommender, RecommenderStatus } from "@/hooks/useApplicationTracker";

interface Props {
  value: Recommender[];
  onChange: (next: Recommender[]) => void;
  language?: "en" | "ru";
  /** For composing the polite-reminder email body. Optional — the
   * mailto button degrades to a generic prompt if these aren't passed. */
  scholarshipName?: string;
  applicationDeadline?: string | null;
  studentName?: string | null;
}

const newId = () => Math.random().toString(36).slice(2, 10);

const daysSince = (iso?: string | null): number | null => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86400_000);
};

/**
 * Compose a polite reminder email body. Tone: first-person student,
 * grateful, low-pressure. Includes the deadline so the recommender can
 * see the actual urgency rather than guessing. We use \n line breaks
 * because mailto: viewers normalize them; %0D%0A pairs render as double
 * gaps in some clients.
 */
const composeReminder = (opts: {
  recommenderName: string;
  scholarshipName?: string;
  applicationDeadline?: string | null;
  studentName?: string | null;
  status: RecommenderStatus;
  language: "en" | "ru";
}): { subject: string; body: string } => {
  const { recommenderName, scholarshipName, applicationDeadline, studentName, status, language } = opts;
  const ru = language === "ru";
  const firstName = recommenderName.split(/\s+/)[0] || recommenderName;

  const deadline = applicationDeadline
    ? new Date(applicationDeadline).toLocaleDateString(ru ? "ru-RU" : "en-US", {
        year: "numeric", month: "long", day: "numeric",
      })
    : null;

  if (ru) {
    const subject = scholarshipName
      ? `Письмо для ${scholarshipName} — короткое напоминание`
      : "Рекомендательное письмо — короткое напоминание";
    const lines: string[] = [];
    lines.push(`Здравствуйте, ${firstName},`);
    lines.push("");
    if (status === "asked") {
      lines.push(scholarshipName
        ? `Хотел/а уточнить, удобно ли вам написать рекомендацию для моей заявки на ${scholarshipName}.`
        : "Хотел/а уточнить, удобно ли вам написать для меня рекомендательное письмо.");
    } else {
      lines.push(scholarshipName
        ? `Спасибо большое, что согласились написать рекомендацию для моей заявки на ${scholarshipName}.`
        : "Спасибо большое, что согласились написать для меня рекомендательное письмо.");
      lines.push("Это очень много значит. Просто хотел/а напомнить о приближающемся сроке.");
    }
    if (deadline) {
      lines.push("");
      lines.push(`Дедлайн: ${deadline}.`);
    }
    lines.push("");
    lines.push("Если нужны какие-то материалы (резюме, перечень достижений, draft эссе) — пришлю в течение часа.");
    lines.push("");
    lines.push(`С благодарностью,${studentName ? "\n" + studentName : ""}`);
    return { subject, body: lines.join("\n") };
  }

  const subject = scholarshipName
    ? `Recommendation letter for ${scholarshipName} — quick check-in`
    : "Recommendation letter — quick check-in";
  const lines: string[] = [];
  lines.push(`Hi ${firstName},`);
  lines.push("");
  if (status === "asked") {
    lines.push(scholarshipName
      ? `I wanted to follow up on the recommendation letter for my ${scholarshipName} application — would you have time to write one?`
      : "I wanted to follow up on the recommendation letter I asked you about — would you have time to write one?");
  } else {
    lines.push(scholarshipName
      ? `Thank you again for agreeing to write a recommendation letter for my ${scholarshipName} application — I really appreciate it.`
      : "Thank you again for agreeing to write me a recommendation letter — I really appreciate it.");
    lines.push("Just a gentle nudge as the deadline approaches.");
  }
  if (deadline) {
    lines.push("");
    lines.push(`The deadline is ${deadline}.`);
  }
  lines.push("");
  lines.push("If it would help, I'm happy to share my CV, a list of accomplishments, or any draft essays — just let me know.");
  lines.push("");
  lines.push(`Thank you so much,${studentName ? "\n" + studentName : ""}`);
  return { subject, body: lines.join("\n") };
};

export const RecommendersPanel = ({
  value, onChange, language = "en",
  scholarshipName, applicationDeadline, studentName,
}: Props) => {
  const ru = language === "ru";
  const t = (en: string, r: string) => (ru ? r : en);
  const [draftName, setDraftName] = useState("");
  const [draftEmail, setDraftEmail] = useState("");

  const add = () => {
    const name = draftName.trim();
    if (!name) return;
    const email = draftEmail.trim() || undefined;
    const next: Recommender = {
      id: newId(),
      name,
      email,
      status: "asked",
      asked_at: new Date().toISOString(),
    };
    onChange([...value, next]);
    setDraftName("");
    setDraftEmail("");
  };

  const remove = (id: string) => {
    onChange(value.filter((r) => r.id !== id));
  };

  const setStatus = (id: string, status: RecommenderStatus) => {
    onChange(value.map((r) => {
      if (r.id !== id) return r;
      const patch: Partial<Recommender> = { status };
      if (status === "submitted" && !r.submitted_at) patch.submitted_at = new Date().toISOString();
      if (status !== "submitted") patch.submitted_at = null;
      return { ...r, ...patch };
    }));
  };

  // Stats line — quietly summarises progress without screaming the bad
  // news. "1 of 3 submitted" reads as actionable; "2 outstanding" as
  // judgmental. Pick the framing that nudges, not shames.
  const submittedCount = value.filter((r) => r.status === "submitted").length;
  const totalCount = value.length;

  const sendReminder = (r: Recommender) => {
    if (!r.email) return;
    const { subject, body } = composeReminder({
      recommenderName: r.name,
      scholarshipName,
      applicationDeadline,
      studentName,
      status: r.status,
      language,
    });
    const href = `mailto:${encodeURIComponent(r.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
          {t("Recommenders", "Рекомендатели")}
        </p>
        {totalCount > 0 && (
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {submittedCount}/{totalCount} {t("submitted", "подано")}
          </p>
        )}
      </div>

      {/* Existing recommenders list */}
      {value.length > 0 && (
        <ul className="space-y-2 mb-3">
          {value.map((r) => {
            const ageDays = r.status === "submitted" ? null : daysSince(r.asked_at);
            // "Stale" threshold per status: asked > 7 days, agreed > 14
            // days. These are the windows past which polite follow-up is
            // expected academic etiquette — an "asked" recommender who's
            // gone silent for a week needs a nudge; an "agreed" one
            // approaching the deadline window needs reminding.
            const isStale = ageDays !== null && (
              (r.status === "asked" && ageDays >= 7) ||
              (r.status === "agreed" && ageDays >= 14)
            );
            return (
              <li key={r.id} className="rounded-lg border border-border bg-card/40 p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground text-[14px] leading-tight truncate">
                      {r.name}
                    </p>
                    {r.email && (
                      <p className="text-[11px] text-muted-foreground truncate inline-flex items-center gap-1 mt-0.5">
                        <Mail className="h-2.5 w-2.5" />
                        {r.email}
                      </p>
                    )}
                    {ageDays !== null && r.status !== "submitted" && (
                      <p className={`text-[11px] mt-0.5 ${isStale ? "text-amber-700 dark:text-amber-400 font-medium" : "text-muted-foreground/80"}`}>
                        {r.status === "asked"
                          ? t(`Asked ${ageDays === 0 ? "today" : `${ageDays}d ago`}`, `Спросили ${ageDays === 0 ? "сегодня" : `${ageDays} дн. назад`}`)
                          : t(`Agreed ${ageDays === 0 ? "today" : `${ageDays}d ago`}`, `Согласились ${ageDays === 0 ? "сегодня" : `${ageDays} дн. назад`}`)}
                        {isStale && t(" · time to follow up", " · пора напомнить")}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => remove(r.id)}
                    className="text-muted-foreground/60 hover:text-destructive p-1 rounded transition-colors shrink-0"
                    aria-label={t("Remove recommender", "Удалить")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Three-state status pill row */}
                <div className="flex flex-wrap items-center gap-1.5 -mb-0.5">
                  <StatusPill
                    active={r.status === "asked"}
                    onClick={() => setStatus(r.id, "asked")}
                    icon={<MessageCircle className="h-3 w-3" />}
                    label={t("Asked", "Попросил")}
                  />
                  <StatusPill
                    active={r.status === "agreed"}
                    onClick={() => setStatus(r.id, "agreed")}
                    icon={<Check className="h-3 w-3" />}
                    label={t("Agreed", "Согласился")}
                  />
                  <StatusPill
                    active={r.status === "submitted"}
                    onClick={() => setStatus(r.id, "submitted")}
                    icon={<Check className="h-3 w-3" />}
                    label={t("Submitted", "Подал")}
                    accent
                  />
                </div>

                {/* Polite-reminder action — only renders when we have an
                    email to send to AND the letter isn't yet submitted.
                    One-click: opens the user's mail client with the
                    drafted subject/body pre-filled. */}
                {r.email && r.status !== "submitted" && (
                  <button
                    type="button"
                    onClick={() => sendReminder(r)}
                    className={`mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-md transition-colors ${
                      isStale
                        ? "bg-amber-500/15 text-amber-800 dark:text-amber-400 hover:bg-amber-500/25 ring-1 ring-amber-500/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]"
                    }`}
                  >
                    <Send className="h-3 w-3" />
                    {t("Send polite reminder", "Отправить вежливое напоминание")}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Add-new form — single line, low ceremony */}
      <div className="rounded-lg border border-dashed border-border/60 bg-background p-3">
        <Label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
          {t("Add a recommender", "Добавить рекомендателя")}
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr,1fr,auto] gap-2 mt-2">
          <Input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder={t("Name (Prof. …, Dr. …)", "Имя (Проф. …, Др. …)")}
            className="h-8 text-[13px]"
          />
          <Input
            value={draftEmail}
            onChange={(e) => setDraftEmail(e.target.value)}
            placeholder={t("Email (optional)", "Email (необязательно)")}
            type="email"
            className="h-8 text-[13px]"
            onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={add}
            disabled={!draftName.trim()}
            className="gap-1.5 h-8"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("Add", "Добавить")}
          </Button>
        </div>
        {value.length === 0 && (
          <p className="text-[11px] text-muted-foreground/80 leading-snug mt-2">
            {t(
              "Most strong applications miss deadlines because a recommender who agreed never submitted. Track them here and you'll know which letters are still outstanding.",
              "Большинство сильных заявок проваливаются по дедлайну не из-за студента — а потому что рекомендатель согласился, но не подал. Отслеживайте здесь, чтобы видеть какие письма остаются открытыми.",
            )}
          </p>
        )}
      </div>
    </div>
  );
};

const StatusPill = ({ active, onClick, icon, label, accent = false }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string; accent?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition-colors ${
      active
        ? accent
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/30"
          : "bg-foreground/[0.08] text-foreground"
        : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]"
    }`}
  >
    {icon}
    {label}
  </button>
);
