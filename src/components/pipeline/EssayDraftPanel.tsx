/**
 * EssayDraftPanel — round-36 redesign.
 *
 * The essay-drafting tool is the focus surface in Workspace; the
 * tracker / calendar / settings are administrative scaffolding
 * around it. So this panel got real structural attention:
 *
 *  · Side-by-side layout on desktop. The textarea sits in the left
 *    column; AI critique streams into a fixed-width right column.
 *    Earlier the critique pushed the textarea up the page when it
 *    expanded, breaking the writing flow. Mobile keeps the stacked
 *    layout (no horizontal room for a split).
 *  · Word target tracking. Most scholarship essays have a 500 / 650
 *    / 1000-word ceiling. The student picks one (defaults to "Aim
 *    500", overridable per-scholarship via localStorage), and a
 *    progress bar fills as they write. Hits gold when within ±10%
 *    of target, red when over.
 *  · Save status visible. A small dot + "Saved 3 secs ago" line
 *    replaces the binary "Saved" tick that flashed and disappeared.
 *  · Auto-save still goes through useApplicationTracker → DB so
 *    the draft survives refresh + cross-device.
 *
 * "Get 3 starting drafts" + "Critique with AI" + "Stop" all kept;
 * just consolidated into a clean toolbar above the editor.
 */
import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Award,
  Wand2,
  X,
  PenLine,
  Target,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { EssayOutlineCard } from "@/components/pipeline/EssayOutlineCard";

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

/** Common scholarship-essay word ceilings. Pick one to track against. */
const WORD_TARGETS = [300, 500, 650, 800, 1000] as const;
type WordTarget = typeof WORD_TARGETS[number];

const TARGET_KEY_PREFIX = "topuni_essay_target_";

const loadTarget = (scholarshipId: string): WordTarget => {
  if (typeof window === "undefined") return 500;
  try {
    const raw = window.localStorage.getItem(TARGET_KEY_PREFIX + scholarshipId);
    const n = raw ? Number.parseInt(raw, 10) : NaN;
    if (WORD_TARGETS.includes(n as WordTarget)) return n as WordTarget;
  } catch { /* ignore */ }
  return 500;
};

const saveTarget = (scholarshipId: string, target: WordTarget) => {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(TARGET_KEY_PREFIX + scholarshipId, String(target)); } catch { /* ignore */ }
};

export const EssayDraftPanel = ({ scholarshipId, scholarshipName, value, onChange, language = "en" }: Props) => {
  const ru = language === "ru";
  const t = (en: string, r: string) => (ru ? r : en);

  // Local draft state mirrors the persisted value but lets us debounce
  // the upsert. 800ms after the last keystroke we push the value up to
  // the parent (which routes it through useApplicationTracker → DB).
  const [draft, setDraft] = useState<string>(value);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [savedRel, setSavedRel] = useState<string>("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!debounceRef.current && value !== draft) setDraft(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Tick the relative time so "Saved 3 secs ago" updates without a
  // re-fire of the save effect itself. Cleared when no save has fired.
  useEffect(() => {
    if (!savedAt) { setSavedRel(""); return; }
    const tick = () => {
      const secs = Math.max(0, Math.floor((Date.now() - savedAt) / 1000));
      if (secs < 5)  setSavedRel(t("just now", "только что"));
      else if (secs < 60) setSavedRel(t(`${secs}s ago`, `${secs} с назад`));
      else if (secs < 3600) setSavedRel(t(`${Math.floor(secs / 60)}m ago`, `${Math.floor(secs / 60)} мин назад`));
      else setSavedRel(t("a while ago", "давно"));
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedAt]);

  // Latest typed draft, captured for the unmount-flush. The debounce
  // closure keeps an older `next` snapshot — if the user closes the
  // detail sheet within 800ms of their last keystroke we'd lose those
  // last characters. Hold the live value in a ref so cleanup can flush.
  const latestDraftRef = useRef<string>(value);
  const onTextChange = (next: string) => {
    setDraft(next);
    latestDraftRef.current = next;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange(next);
      debounceRef.current = null;
      setSavedAt(Date.now());
    }, 800);
  };

  // Flush any pending debounced save on unmount so a panel close mid-
  // typing doesn't drop the last few characters. Essay text is the
  // most expensive thing the user has ever typed in TopUni — losing
  // even a sentence to a 0.8s debounce is unacceptable.
  // Use a ref for onChange so cleanup gets the freshest dispatcher
  // without re-running on every render.
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
        onChangeRef.current(latestDraftRef.current);
      }
    };
  }, []);

  // ─── Word target ──────────────────────────────────────────────────
  const [target, setTarget] = useState<WordTarget>(() => loadTarget(scholarshipId));
  useEffect(() => { setTarget(loadTarget(scholarshipId)); }, [scholarshipId]);
  const onTargetChange = (next: WordTarget) => {
    setTarget(next);
    saveTarget(scholarshipId, next);
  };

  // ─── Essay openers ────────────────────────────────────────────────
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

  // Renamed from useOpener (round 39) — the `use` prefix made
  // ESLint's rules-of-hooks check think this was a hook, which it
  // isn't (just a regular handler that calls setState).
  const applyOpener = (opener: Opener) => {
    const next = draft.trim() ? `${opener.text}\n\n${draft}` : opener.text;
    setDraft(next);
    onChange(next);
    setOpeners(null);
    setSavedAt(Date.now());
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
          targetScholarship: scholarshipName,
          language,
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        // Prefer parsed JSON error body — every edge fn returns
        // { error: "..." } on failure. Fall back to raw text only
        // if the body isn't JSON. Without this, a 429 body of
        // \`{"error":"Rate limit exceeded..."}\` showed up as the
        // raw JSON string in the toast.
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
            if (delta) {
              acc += delta;
              setCritique(acc);
            }
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

  // Abort any in-flight critique stream when the panel unmounts.
  // Without this, closing the detail sheet mid-critique left the
  // request streaming server-side (tokens billed) and the React
  // setState calls would warn "Can't update an unmounted component."
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const wordCount = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  const charCount = draft.length;
  const pct = Math.min(150, Math.round((wordCount / target) * 100));
  // Progress bar tone: muted while building, gold when within ±10% of
  // target, amber when getting tight (90-100%), red when over.
  const progressTone =
    pct >= 110 ? "bg-destructive"
    : pct >= 90 ? "bg-gold"
    : pct >= 50 ? "bg-gold/60"
    : "bg-foreground/30";
  const targetReadout =
    pct >= 110 ? t(`${wordCount - target} over`, `+${wordCount - target} сверх`)
    : pct >= 90 ? t("On target", "В цели")
    : t(`${target - wordCount} to go`, `Ещё ${target - wordCount}`);

  // Show critique panel on desktop alongside editor when there's
  // critique content OR a critique is in flight; otherwise hide so
  // the editor takes the full width.
  const showCritiquePanel = !!(critique || critiquing);

  return (
    <div>
      {/* Toolbar — title + word counter + word target picker. */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
            {t("Essay draft", "Эссе")}
          </p>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {wordCount.toLocaleString()} {t("words", "слов")} · {charCount.toLocaleString()} {t("chars", "симв.")}
          </span>
          {savedRel && (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {t("Saved", "Сохранено")} {savedRel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Target className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold mr-1">
            {t("Aim", "Цель")}
          </span>
          {WORD_TARGETS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onTargetChange(n)}
              className={`text-[11px] font-medium tabular-nums px-1.5 py-0.5 rounded transition-colors ${
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

      {/* Progress bar — sits between toolbar and editor as a thin
          rhythm element. Always visible (even at 0%) so the visual
          space stays stable. Title-attribute carries the readout for
          accessibility. */}
      <div
        className="relative h-1 rounded-full bg-muted/60 overflow-hidden mb-2"
        title={`${wordCount} / ${target} ${t("words", "слов")} · ${targetReadout}`}
      >
        <div
          className={`h-full ${progressTone} transition-all duration-300`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
        <span className="absolute right-1 -top-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground bg-background/0 leading-none">
          {targetReadout}
        </span>
      </div>

      {/* Editor + critique grid. lg+ = two columns side by side; smaller
          = stacked. The critique column only renders when there's
          content to show, otherwise the editor fills the row. */}
      {/* xl: breakpoint (1280px viewport) — pairs with the detail
          sheet's lg:max-w-4xl so the side-by-side layout only fires
          when the parent container actually has room for editor +
          360px critique. Smaller viewports stack the columns. */}
      <div className={`grid gap-3 ${showCritiquePanel ? "xl:grid-cols-[minmax(0,1fr),320px]" : "grid-cols-1"}`}>
        <div className="min-w-0">
          <Textarea
            value={draft}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder={t(
              "Drop your essay draft here. Stuck on the opening? Tap \"Get 3 starting drafts\" and the AI gives you three angles to pick from.",
              "Вставьте черновик эссе. Не знаете с чего начать? Нажмите «3 варианта вступления» — AI предложит три угла на выбор.",
            )}
            rows={28}
            className="resize-y font-sans text-[14px] leading-relaxed min-h-[640px]"
          />
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {/* Outline button — shows whenever the draft is empty or
                short, since that's when "I don't know how to structure
                this" is the actual problem. Hides once the user has
                400+ words in (past the structural question). */}
            {draft.trim().split(/\s+/).filter(Boolean).length < 400 && (
              <EssayOutlineCard
                scholarshipName={scholarshipName}
                wordTarget={target}
                language={language}
                onInsert={(scaffold) => {
                  const next = draft.trim() ? `${scaffold}\n\n${draft}` : scaffold;
                  setDraft(next);
                  onChange(next);
                  setSavedAt(Date.now());
                }}
              />
            )}
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
              the textarea. Auto-clears after pick. Stays in the editor
              column even when the critique column is open. */}
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
                  onClick={() => applyOpener(o)}
                  className="w-full text-left rounded-xl border border-border bg-card hover:border-gold/40 hover:bg-card/80 transition-colors p-3.5"
                >
                  <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-gold-dark mb-1.5">{o.angle}</p>
                  <p className="text-[13px] text-foreground/85 leading-relaxed">{o.text}</p>
                  <p className="text-[11px] text-muted-foreground mt-2 inline-flex items-center gap-1">
                    <Award className="w-2.5 h-2.5" /> {t("Tap to start with this angle", "Нажмите чтобы начать с этого варианта")}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Critique side panel — desktop. Stays attached to the editor
            via the parent grid so vertical scroll doesn't unalign them.
            On mobile (no lg breakpoint) this falls below the editor in
            the column. */}
        {showCritiquePanel && (
          <aside className="rounded-xl border border-gold/25 bg-gold/[0.04] p-4 min-w-0 xl:max-h-[600px] xl:overflow-y-auto">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold text-gold-dark mb-2">
              <Award className="w-3 h-3" />
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
