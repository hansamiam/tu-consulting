// WorkshopQuestionForm — fulfils the FAQ promise: "a direct line to
// submit questions for upcoming sessions." Posts to
// workshop-question-submit, which logs to workshop_questions and
// confirms via email.
//
// Hidden until the user is a paying member — we read tier off the
// AuthContext rather than re-fetching subscriptions here.

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";

interface Props { language?: "en" | "ru"; }

export const WorkshopQuestionForm = ({ language = "en" }: Props) => {
  const ru = language === "ru";
  const t = (en: string, r: string) => (ru ? r : en);
  const { subscriptionTier } = useAuth() as { subscriptionTier?: string };
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Same allowlist used elsewhere — pro + founding are paid tiers.
  const isMember = subscriptionTier === "pro" || subscriptionTier === "founding";
  if (!isMember) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (question.trim().length < 5) {
      toast.error(t("Please give us a bit more detail.", "Расскажите немного подробнее."));
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("workshop-question-submit", {
        body: { question: question.trim() },
      });
      if (error) throw new Error(error.message);
      toast.success(t("Question received. We'll cover it in an upcoming session.", "Вопрос получили. Разберём на ближайшей сессии."));
      setQuestion("");
    } catch (err) {
      toast.error((err as Error).message || t("Could not send. Try again.", "Не удалось отправить. Попробуйте снова."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-lg border border-border/70 bg-card p-5">
      <p className="text-[11px] uppercase tracking-[0.18em] text-gold-dark font-semibold mb-2">
        {t("Workshops", "Воркшопы")}
      </p>
      <h2 className="font-heading text-lg sm:text-xl font-bold mb-3 text-foreground">
        {t("Submit a question for the next workshop", "Задайте вопрос на ближайший воркшоп")}
      </h2>
      <p className="text-xs text-muted-foreground mb-3">
        {t(
          "We cover the highest-voted member questions live every two weeks.",
          "Самые популярные вопросы участников разбираем вживую каждые две недели.",
        )}
      </p>
      <form onSubmit={submit} className="space-y-3">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={2000}
          rows={4}
          placeholder={t(
            "e.g. How do I frame a thin EC list when my school has no clubs?",
            "напр. Как подать тонкий список ВКД, если в школе нет кружков?",
          )}
          className="w-full rounded-md border border-border/70 bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold-dark/50"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{question.length}/2000</span>
          <button
            type="submit"
            disabled={submitting || question.trim().length < 5}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-brand-navy text-white font-semibold text-xs hover:bg-brand-navy/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {t("Send to team", "Отправить команде")}
          </button>
        </div>
      </form>
    </section>
  );
};
