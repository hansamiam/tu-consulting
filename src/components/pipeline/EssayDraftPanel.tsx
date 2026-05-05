/**
 * EssayDraftPanel — write the scholarship's essay directly inside the
 * pipeline row. Auto-saves to the application_tracker via the same
 * offline-first hook everything else uses, so the draft survives a
 * refresh, follows the user across devices once authed, and never
 * needs an explicit Save click.
 *
 * The "Critique with AI" button hits the existing essay-critique edge
 * function (SSE-streaming markdown). Free users see a preview; Pro
 * members get the full reader-perspective critique. Streamed output
 * renders inline below the textarea so writers can iterate without
 * leaving the panel.
 */
import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Wand2, X, PenLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

interface Opener { angle: string; text: string; }

interface Props {
  scholarshipId: string;
  scholarshipName: string;
  /** Latest persisted draft from the tracker. Source-of-truth value. */
  value: string;
  onChange: (next: string) => void;
  language?: "en" | "ru";
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export const EssayDraftPanel = ({ scholarshipId: _scholarshipId, scholarshipName, value, onChange, language = "en" }: Props) => {
  const ru = language === "ru";
  const t = (en: string, r: string) => (ru ? r : en);

  // Local draft state mirrors the persisted value but lets us debounce
  // the upsert. 800ms after the last keystroke we push the value up to
  // the parent (which routes it through useApplicationTracker → DB).
  const [draft, setDraft] = useState<string>(value);
  const [savedTick, setSavedTick] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // External updates (e.g. cross-device sync) → adopt them, but only
    // if the textarea isn't currently mid-edit (debounce timer pending).
    if (!debounceRef.current && value !== draft) setDraft(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const onTextChange = (next: string) => {
    setDraft(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange(next);
      debounceRef.current = null;
      setSavedTick(true);
      setTimeout(() => setSavedTick(false), 1500);
    }, 800);
  };

  // ─── Essay openers — AI-generated starting paragraphs ──────────────
  const [openers, setOpeners] = useState<Opener[] | null>(null);
  const [loadingOpeners, setLoadingOpeners] = useState(false);

  const requestOpeners = async () => {
    setLoadingOpeners(true);
    try {
      const { data, error } = await supabase.functions.invoke("essay-openers", {
        body: { scholarshipName, language },
      });
      if (error) throw new Error(error.message);
      const list = (data as { openers?: Opener[] })?.openers ?? [];
      if (list.length === 0) throw new Error(t("No openers came back. Try again?", "Не удалось получить варианты. Попробуйте снова."));
      setOpeners(list);
    } catch (e) {
      toast.error((e as Error).message || t("Couldn't generate openers", "Не удалось сгенерировать варианты"));
    } finally {
      setLoadingOpeners(false);
    }
  };

  const useOpener = (opener: Opener) => {
    const next = draft.trim() ? `${opener.text}\n\n${draft}` : opener.text;
    setDraft(next);
    onChange(next);
    setOpeners(null);
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 1500);
  };

  // ─── AI critique (streaming) ───────────────────────────────────────
  const [critique, setCritique] = useState<string>("");
  const [critiquing, setCritiquing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const requestCritique = async () => {
    if (draft.trim().length < 50) {
      toast.error(t("Add at least 50 characters first.", "Сначала добавьте хотя бы 50 символов."));
      return;
    }
    setCritique("");
    setCritiquing(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
      };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

      const res = await fetch(`${SUPABASE_URL}/functions/v1/essay-critique`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          essay: draft,
          essayType: "scholarship",
          targetScholarship: scholarshipName,
          language,
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed (${res.status})`);
      }
      // SSE stream: text/event-stream with "data: <chunk>" lines, then
      // "data: [DONE]" at the end. The edge fn formats chunks as plain
      // markdown text inside each `data:` line.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      while (true) {
        const { value: chunk, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") continue;
          if (!payload) continue;
          try {
            const parsed = JSON.parse(payload);
            const delta = parsed?.choices?.[0]?.delta?.content ?? parsed?.content ?? "";
            if (delta) {
              acc += delta;
              setCritique(acc);
            }
          } catch {
            // Some servers stream raw text not JSON; treat as raw markdown.
            acc += payload;
            setCritique(acc);
          }
        }
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      toast.error((e as Error).message || t("Couldn't get feedback. Try again.", "Не удалось получить отзыв. Попробуйте снова."));
    } finally {
      setCritiquing(false);
      abortRef.current = null;
    }
  };

  const cancelCritique = () => {
    if (abortRef.current) abortRef.current.abort();
    setCritiquing(false);
  };

  const wordCount = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  const charCount = draft.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
          {t("Essay draft", "Эссе")}
        </p>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {savedTick ? (
            <span className="text-emerald-600 dark:text-emerald-400">{t("Saved", "Сохранено")}</span>
          ) : (
            <>{wordCount} {t("words", "слов")} · {charCount} {t("chars", "симв.")}</>
          )}
        </span>
      </div>
      <Textarea
        value={draft}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder={t(
          "Drop your essay draft here. Stuck on the opening? Tap \"Get 3 starting drafts\" and the AI gives you three angles to pick from.",
          "Вставьте черновик эссе. Не знаете с чего начать? Нажмите «3 варианта вступления» — AI предложит три угла на выбор.",
        )}
        rows={10}
        className="resize-y font-sans text-[14px] leading-relaxed"
      />
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {/* Get 3 starting drafts — only surfaced when the textarea is
            empty or near-empty. Once the student is past the blank-page
            wall, this button disappears so the surface stays clean. */}
        {draft.trim().length < 80 && (
          <Button
            variant="outline"
            size="sm"
            onClick={requestOpeners}
            disabled={loadingOpeners}
            className="gap-1.5"
          >
            {loadingOpeners ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PenLine className="w-3.5 h-3.5" />}
            {loadingOpeners ? t("Drafting…", "Готовлю…") : t("Get 3 starting drafts", "3 варианта вступления")}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={requestCritique}
          disabled={critiquing || draft.trim().length < 50}
          className="gap-1.5"
        >
          {critiquing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
          {critiquing ? t("Reading…", "Читаю…") : critique ? t("Re-critique", "Заново") : t("Critique with AI", "AI-критика")}
        </Button>
        {critiquing && (
          <Button variant="ghost" size="sm" onClick={cancelCritique} className="text-muted-foreground gap-1">
            <X className="w-3 h-3" /> {t("Stop", "Стоп")}
          </Button>
        )}
      </div>

      {/* Opener picker — three AI-generated drafts, click one to seed
          the textarea. Auto-clears after pick. */}
      {openers && openers.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground">
              {t("Pick a starting angle", "Выберите угол")}
            </p>
            <button
              onClick={() => setOpeners(null)}
              className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <X className="w-3 h-3" /> {t("Dismiss", "Скрыть")}
            </button>
          </div>
          {openers.map((o, i) => (
            <button
              key={i}
              type="button"
              onClick={() => useOpener(o)}
              className="w-full text-left rounded-xl border border-border bg-card hover:border-gold/40 hover:bg-card/80 transition-colors p-3.5"
            >
              <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-gold-dark mb-1.5">{o.angle}</p>
              <p className="text-[13px] text-foreground/85 leading-relaxed">{o.text}</p>
              <p className="text-[11px] text-muted-foreground mt-2 inline-flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> {t("Tap to start with this angle", "Нажмите чтобы начать с этого варианта")}
              </p>
            </button>
          ))}
        </div>
      )}

      {(critique || critiquing) && (
        <div className="mt-3 rounded-xl border border-gold/25 bg-gold/[0.04] p-4">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold text-gold-dark mb-2">
            <Sparkles className="w-3 h-3" />
            <span>{t("Reader's notes", "Заметки читателя")}</span>
            {critiquing && <Loader2 className="w-3 h-3 animate-spin ml-auto" />}
          </div>
          <div className="prose prose-sm max-w-none prose-headings:font-heading prose-headings:tracking-tight prose-p:leading-relaxed prose-strong:text-foreground dark:prose-invert">
            <ReactMarkdown>{critique || t("Reading your draft…", "Читаем черновик…")}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};
