/**
 * RecommendersPanel — track who's writing your letters of recommendation.
 *
 * The most common reason a strong candidate misses a deadline isn't
 * ineligibility, it's a recommender who agreed but never submitted.
 * This panel makes the asked → agreed → submitted state explicit so
 * the student can see which letters are still outstanding without
 * mentally tracking it across email threads. v1: per-scholarship list,
 * three-state status, optional contact email.
 *
 * No automation here — no email-the-recommender flow, no reminders.
 * Those are deliberate follow-ups; v1 is the data layer + the UI.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Mail, Check, MessageCircle } from "lucide-react";
import type { Recommender, RecommenderStatus } from "@/hooks/useApplicationTracker";

interface Props {
  value: Recommender[];
  onChange: (next: Recommender[]) => void;
  language?: "en" | "ru";
}

const newId = () => Math.random().toString(36).slice(2, 10);

export const RecommendersPanel = ({ value, onChange, language = "en" }: Props) => {
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
          {value.map((r) => (
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
            </li>
          ))}
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
