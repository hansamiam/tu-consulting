/**
 * AdditionalEssaysPanel — multi-essay support per scholarship.
 *
 * Real pain point: Schwarzman wants 3 essays, Rhodes wants 2,
 * Marshall wants 3, Fulbright Foreign Student wants 2-3. The single
 * essay_draft column on application_tracker only carried one essay,
 * so users either concatenated all three (mess) or drafted in
 * external tools (broken AI critique loop). This panel adds the
 * 2nd, 3rd, Nth essays beneath the primary EssayDraftPanel; each
 * has its own title, optional prompt text, word target, and draft.
 *
 * Auto-saves to application_tracker.additional_essays (jsonb array)
 * via the same offline-first hook the rest of the tracker uses, so
 * additional essays survive refresh + sync across devices.
 *
 * Default state: collapsed, with a small "Add another essay" button
 * for users who only need one. Clicking the button reveals the
 * first additional essay slot. Each saved essay is independently
 * removable. */
import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Loader2, Sparkles, Wand2, X, Plus, Target, Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import type { AdditionalEssay } from "@/hooks/useApplicationTracker";
import { EssayOutlineCard } from "@/components/pipeline/EssayOutlineCard";

interface Props {
  scholarshipId: string;
  scholarshipName: string;
  /** Persisted essays array from useApplicationTracker. Empty/null
   *  when the scholarship has no additional essays yet. */
  value: AdditionalEssay[] | null;
  onChange: (next: AdditionalEssay[] | null) => void;
  language?: "en" | "ru";
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const WORD_TARGETS = [300, 500, 650, 800, 1000] as const;
type WordTarget = typeof WORD_TARGETS[number];

const newEssayId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `essay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

const wordCount = (s: string): number => (s.trim() ? s.trim().split(/\s+/).length : 0);

export const AdditionalEssaysPanel = ({ scholarshipId: _scholarshipId, scholarshipName, value, onChange, language = "en" }: Props) => {
  const ru = language === "ru";
  const t = (en: string, r: string) => (ru ? r : en);

  const essays = value ?? [];

  const updateEssay = (id: string, patch: Partial<AdditionalEssay>) => {
    const next = essays.map((e) =>
      e.id === id ? { ...e, ...patch, updated_at: new Date().toISOString() } : e,
    );
    onChange(next.length > 0 ? next : null);
  };

  const addEssay = () => {
    const fresh: AdditionalEssay = {
      id: newEssayId(),
      title: t(`Essay ${essays.length + 2}`, `Эссе ${essays.length + 2}`),
      prompt: null,
      target: 500,
      draft: "",
      updated_at: new Date().toISOString(),
    };
    onChange([...essays, fresh]);
  };

  const removeEssay = (id: string) => {
    const next = essays.filter((e) => e.id !== id);
    onChange(next.length > 0 ? next : null);
  };

  if (essays.length === 0) {
    return (
      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={addEssay}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Plus className="w-3.5 h-3.5" />
          {t("Add another essay", "Добавить ещё эссе")}
        </Button>
        <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">
          {t(
            "Schwarzman / Rhodes / Marshall and similar programs require multiple essays. Add a slot for each.",
            "Schwarzman / Rhodes / Marshall и подобные программы требуют несколько эссе. Добавьте слот для каждого.",
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
          {t("Additional essays", "Дополнительные эссе")} · {essays.length}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={addEssay}
          className="gap-1.5 h-7 text-[11px]"
        >
          <Plus className="w-3 h-3" />
          {t("Add", "Добавить")}
        </Button>
      </div>

      {essays.map((essay, idx) => (
        <EssayCard
          key={essay.id}
          essay={essay}
          index={idx + 2}
          scholarshipName={scholarshipName}
          language={language}
          onChange={(patch) => updateEssay(essay.id, patch)}
          onRemove={() => removeEssay(essay.id)}
        />
      ))}
    </div>
  );
};

/* ─── EssayCard — one entry in the additional essays array ─────────── */

interface EssayCardProps {
  essay: AdditionalEssay;
  /** Display index — 2 for the first additional essay, since the
   *  primary EssayDraftPanel is "essay 1". */
  index: number;
  scholarshipName: string;
  language: "en" | "ru";
  onChange: (patch: Partial<AdditionalEssay>) => void;
  onRemove: () => void;
}

const EssayCard = ({ essay, index, scholarshipName, language, onChange, onRemove }: EssayCardProps) => {
  const ru = language === "ru";
  const t = (en: string, r: string) => (ru ? r : en);

  const [draft, setDraft] = useState<string>(essay.draft);
  const [title, setTitle] = useState<string>(essay.title);
  const [prompt, setPrompt] = useState<string>(essay.prompt ?? "");
  const target: WordTarget = (WORD_TARGETS.includes(essay.target as WordTarget) ? essay.target : 500) as WordTarget;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local state when parent essay updates (rare — cross-device).
  useEffect(() => {
    if (!debounceRef.current) {
      setDraft(essay.draft);
      setTitle(essay.title);
      setPrompt(essay.prompt ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [essay.id]);

  // Latest typed draft + onChange ref so unmount-cleanup can flush
  // the in-flight debounced save. Closing the panel within 800ms of
  // the last keystroke would otherwise drop the most recent edits —
  // unacceptable for an essay editor.
  const latestDraftRef = useRef<string>(essay.draft);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const onDraftChange = (next: string) => {
    setDraft(next);
    latestDraftRef.current = next;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange({ draft: next });
      debounceRef.current = null;
    }, 800);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
        onChangeRef.current({ draft: latestDraftRef.current });
      }
    };
  }, []);

  const onTitleBlur = () => {
    if (title.trim() && title !== essay.title) onChange({ title: title.trim() });
  };
  const onPromptBlur = () => {
    if (prompt !== (essay.prompt ?? "")) onChange({ prompt: prompt.trim() || null });
  };

  // ─── AI critique (streaming) ──────────────────────────────────────
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
          targetScholarship: scholarshipName + (title ? ` — ${title}` : ""),
          essayPrompt: prompt || undefined,
          language,
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        // Parse JSON error body when the edge fn returns one;
        // otherwise the toast renders the raw \`{"error":"..."}\`
        // string. Same shape as EssayDraftPanel's critique fetch.
        const raw = await res.text().catch(() => "");
        let message = raw || `Request failed (${res.status})`;
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.error === "string") message = parsed.error;
        } catch { /* keep raw */ }
        throw new Error(message);
      }
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
            if (delta) { acc += delta; setCritique(acc); }
          } catch {
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

  const wc = wordCount(draft);
  const pct = Math.min(150, Math.round((wc / target) * 100));
  const progressTone =
    pct >= 110 ? "bg-destructive"
    : pct >= 90 ? "bg-gold"
    : pct >= 50 ? "bg-gold/60"
    : "bg-foreground/30";
  const targetReadout =
    pct >= 110 ? t(`${wc - target} over`, `+${wc - target} сверх`)
    : pct >= 90 ? t("On target", "В цели")
    : t(`${target - wc} to go`, `Ещё ${target - wc}`);

  const showCritique = !!(critique || critiquing);

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-4 sm:p-5 space-y-3">
      {/* Header — index, editable title, target picker, remove. */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-gold/15 text-gold-dark text-[10px] font-bold tabular-nums shrink-0">
            {index}
          </span>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={onTitleBlur}
            placeholder={t("e.g. Leadership essay", "напр. Эссе о лидерстве")}
            className="h-7 text-sm font-semibold border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-gold/40 px-1 -mx-1"
          />
        </div>
        <button
          onClick={onRemove}
          aria-label={t("Remove this essay", "Удалить это эссе")}
          title={t("Remove this essay", "Удалить это эссе")}
          className="shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Optional prompt block — collapsible, mostly hidden. Only renders
          when expanded or when prompt has content. */}
      <details className="group" open={!!prompt}>
        <summary className="text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors inline-flex items-center gap-1">
          {t("Prompt", "Вопрос эссе")}
          <span className="text-muted-foreground/60">{prompt ? "" : t("(optional)", "(необязательно)")}</span>
        </summary>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onBlur={onPromptBlur}
          placeholder={t(
            "Paste the actual prompt the scholarship is asking — keeps you anchored while drafting. Example: \"Tell us about a time you led through ambiguity.\"",
            "Вставьте сам вопрос — это поможет не уходить от темы. Например: «Расскажите о случае, когда вы вели за собой в условиях неопределённости».",
          )}
          rows={2}
          className="mt-2 text-[12px] leading-relaxed bg-muted/30 border-border/60"
        />
      </details>

      {/* Word count + target picker + progress. Compact row. */}
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="text-muted-foreground tabular-nums">
          {wc.toLocaleString()} {t("words", "слов")}
        </span>
        <div className="flex items-center gap-1.5">
          <Target className="h-3 w-3 text-muted-foreground" />
          {WORD_TARGETS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange({ target: n })}
              className={`text-[10px] font-medium tabular-nums px-1.5 py-0.5 rounded transition-colors ${
                target === n
                  ? "bg-foreground/[0.08] text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div className="relative h-1 rounded-full bg-muted/60 overflow-hidden" title={`${wc} / ${target} · ${targetReadout}`}>
        <div className={`h-full ${progressTone} transition-all duration-300`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>

      {/* Editor + critique. Same pattern as primary EssayDraftPanel —
          xl: side-by-side, smaller stacks. */}
      <div className={`grid gap-3 ${showCritique ? "xl:grid-cols-[minmax(0,1fr),300px]" : "grid-cols-1"}`}>
        <div className="min-w-0">
          <Textarea
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            placeholder={t(
              "Drop this essay's draft here.",
              "Вставьте черновик этого эссе.",
            )}
            rows={10}
            className="resize-y font-sans text-[14px] leading-relaxed"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {/* Outline scaffold — most useful for additional essays
                because each one has a distinct prompt + word ceiling
                and the writer's already deep enough into the
                application to want structure tailored to THIS essay's
                question. Hides once the draft is past the structural
                question (400+ words). */}
            {wc < 400 && (
              <EssayOutlineCard
                scholarshipName={scholarshipName}
                essayPrompt={essay.prompt}
                essayTitle={essay.title}
                wordTarget={target}
                language={language}
                onInsert={(scaffold) => {
                  const next = draft.trim() ? `${scaffold}\n\n${draft}` : scaffold;
                  setDraft(next);
                  onChange({ draft: next });
                }}
              />
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={requestCritique}
              disabled={critiquing || draft.trim().length < 50}
              className="gap-1.5 h-8 text-[12px]"
            >
              {critiquing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
              {critiquing ? t("Reading…", "Читаю…") : critique ? t("Re-critique", "Заново") : t("Critique with AI", "AI-критика")}
            </Button>
            {critiquing && (
              <Button variant="ghost" size="sm" onClick={cancelCritique} className="text-muted-foreground gap-1 h-8 text-[12px]">
                <X className="w-3 h-3" /> {t("Stop", "Стоп")}
              </Button>
            )}
          </div>
        </div>

        {showCritique && (
          <aside className="rounded-xl border border-gold/25 bg-gold/[0.04] p-3.5 min-w-0 xl:max-h-[500px] xl:overflow-y-auto">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold text-gold-dark mb-2">
              <Sparkles className="w-3 h-3" />
              <span>{t("Reader's notes", "Заметки читателя")}</span>
              {critiquing && <Loader2 className="w-3 h-3 animate-spin ml-auto" />}
              {!critiquing && critique && (
                <button
                  onClick={() => setCritique("")}
                  className="ml-auto text-muted-foreground hover:text-foreground"
                  aria-label={t("Dismiss critique", "Закрыть отзыв")}
                  title={t("Dismiss critique", "Закрыть отзыв")}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="prose prose-sm max-w-none prose-headings:font-heading prose-headings:tracking-tight prose-p:leading-relaxed prose-strong:text-foreground dark:prose-invert">
              <ReactMarkdown>{critique || t("Reading your draft…", "Читаем черновик…")}</ReactMarkdown>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
