/**
 * EssayCritique — paste-and-critique surface at /essay (and /essay/ru).
 *
 * Lets a student paste an admissions / scholarship essay and receive
 * a streamed reader-perspective critique. Premium users get full
 * critique with rewrite samples + a calibrated /10 score; free users
 * get a sectioned preview that ends with an upgrade prompt.
 *
 * Streaming wire format matches topuni-ai-pathway / topuni-chat: SSE
 * with OpenAI-style { choices: [{ delta: { content } }] } chunks.
 *
 * Bilingual via the `language` prop. Edge function gets the language
 * passed in the body so the critique is generated in Russian for RU
 * users — not just the surrounding chrome.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Crown, Loader2, PenLine, Sparkles, Eraser,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface EssayCritiqueProps { language?: "en" | "ru"; }

const ESSAY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/essay-critique`;

type EssayType = "personal_statement" | "scholarship" | "sop" | "supplemental";

const STORAGE_KEY = "topuni-essay-critique-v1";

interface PersistedDraft {
  essay: string;
  essayType: EssayType;
  targetSchool: string;
  targetScholarship: string;
  prompt: string;
  wordLimit: string;
  lastResult?: string;
  lastResultTier?: "free-preview" | "premium" | "anon-preview";
  generatedAt?: number;
}

const COPY = {
  en: {
    docTitle: "AI essay critique for admissions & scholarships — TopUni",
    metaDesc: "Paste your admissions or scholarship essay and get a streamed reader-perspective critique — what's working, what's not, and the rewrite that would change your verdict.",
    backToAi: "Back to TopUni AI",
    kicker: "Essay critique",
    h1: "What an admissions reader sees first.",
    sub: "Paste your draft. Get a reader-perspective critique — what works, what loses them, and the rewrite that would change the verdict. The same lens used by Yale, Cambridge, Harvard admissions readers.",
    essayTypeLabel: "Essay type",
    essayTypes: [
      { value: "personal_statement", label: "Personal statement" },
      { value: "scholarship",        label: "Scholarship application essay" },
      { value: "sop",                label: "Statement of Purpose (SoP)" },
      { value: "supplemental",       label: "Supplemental essay" },
    ] as { value: EssayType; label: string }[],
    targetSchool: "Target school",
    optional: "(optional)",
    targetSchoolPh: "e.g. Yale",
    scholarshipLabel: "Scholarship",
    scholarshipPh: "e.g. Chevening",
    promptLabel: "Essay prompt / question",
    promptPh: "What the application asks you to write about",
    wordLimitLabel: "Target word count",
    wordLimitPh: "650",
    yourEssay: "Your essay",
    wordsUnit: "words",
    essayPh: "Paste your draft here. The more honest the draft, the sharper the read.",
    minLength: "Paste at least 50 characters of essay text.",
    failed: "Something went wrong. Try again?",
    streamErr: "Stream error",
    submit: { idleAnon: "Critique (preview)", idlePremium: "Critique my essay", running: "Reading…" },
    stop: "Stop",
    clear: "Clear",
    freePreview: "Free preview ·",
    upgrade: "Upgrade",
    readersRead: "Reader's read",
    premiumBadge: "Premium",
    unlockFull: "Unlock the full critique",
    unlockBody: "Premium adds two more rewrite samples, a calibrated /10 score, and Gemini 2.5 Pro reading depth. Same essay, deeper read.",
    seePricing: "See pricing",
    generatedAt: (s: string) => `Generated ${s} · re-running uses fresh model output`,
    emptyTitle: "Your reader-perspective critique appears here.",
    emptyBody: (premium: boolean) =>
      premium
        ? "Five sections + rewrite samples + /10 score: first-30-seconds read, what's working, what's not, the hidden weakness, and the highest-leverage rewrite."
        : "Five sections in the preview: first-30-seconds read, what's working, what's not, the hidden weakness, and the highest-leverage rewrite.",
  },
  ru: {
    docTitle: "AI-критика эссе для поступления и стипендий — TopUni",
    metaDesc: "Вставьте эссе для поступления или стипендии и получите потоковую критику с позиции читателя приёмной — что работает, что нет, и какая правка изменит вердикт.",
    backToAi: "К TopUni AI",
    kicker: "Критика эссе",
    h1: "Что видит читатель приёмной в первую секунду.",
    sub: "Вставьте черновик. Получите критику с позиции читателя — что работает, что теряет внимание, и правку, которая изменит вердикт. Та же оптика, что у читателей Yale, Cambridge, Harvard.",
    essayTypeLabel: "Тип эссе",
    essayTypes: [
      { value: "personal_statement", label: "Personal statement" },
      { value: "scholarship",        label: "Эссе на стипендию" },
      { value: "sop",                label: "Statement of Purpose (SoP)" },
      { value: "supplemental",       label: "Дополнительное эссе" },
    ] as { value: EssayType; label: string }[],
    targetSchool: "Целевой университет",
    optional: "(необязательно)",
    targetSchoolPh: "напр. Yale",
    scholarshipLabel: "Стипендия",
    scholarshipPh: "напр. Chevening",
    promptLabel: "Промпт / вопрос эссе",
    promptPh: "О чём именно просит написать заявка",
    wordLimitLabel: "Лимит слов",
    wordLimitPh: "650",
    yourEssay: "Ваше эссе",
    wordsUnit: "слов",
    essayPh: "Вставьте черновик. Чем честнее черновик, тем точнее разбор.",
    minLength: "Вставьте минимум 50 символов текста.",
    failed: "Что-то пошло не так. Попробовать снова?",
    streamErr: "Ошибка потока",
    submit: { idleAnon: "Критика (превью)", idlePremium: "Разобрать моё эссе", running: "Читаем…" },
    stop: "Стоп",
    clear: "Очистить",
    freePreview: "Бесплатное превью ·",
    upgrade: "Обновить",
    readersRead: "Взгляд читателя",
    premiumBadge: "Premium",
    unlockFull: "Открыть полную критику",
    unlockBody: "Premium добавляет ещё два примера переписывания, калиброванный балл /10 и глубину чтения Gemini 2.5 Pro. То же эссе — глубже разбор.",
    seePricing: "Смотреть цены",
    generatedAt: (s: string) => `Сгенерировано ${s} · перезапуск даст новый ответ модели`,
    emptyTitle: "Ваша критика появится здесь.",
    emptyBody: (premium: boolean) =>
      premium
        ? "Пять разделов + примеры переписывания + балл /10: первые 30 секунд чтения, что работает, что нет, скрытая слабость и правка с максимальным эффектом."
        : "Пять разделов в превью: первые 30 секунд чтения, что работает, что нет, скрытая слабость и правка с максимальным эффектом.",
  },
} as const;

const EssayCritique = ({ language = "en" }: EssayCritiqueProps) => {
  const t = COPY[language];
  const { user, subscription } = useAuth();
  const isPremium = !!subscription && (
    subscription.is_active || subscription.is_founding_member || subscription.earned_trial_active ||
    subscription.tier === "pro" || subscription.tier === "founding"
  );
  void user; // (kept for future per-user analytics)

  const [essay, setEssay] = useState("");
  const [essayType, setEssayType] = useState<EssayType>("personal_statement");
  const [targetSchool, setTargetSchool] = useState("");
  const [targetScholarship, setTargetScholarship] = useState("");
  const [prompt, setPrompt] = useState("");
  const [wordLimit, setWordLimit] = useState("");

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState("");
  const [tier, setTier] = useState<"free-preview" | "premium" | "anon-preview" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as PersistedDraft;
      if (p.essay) setEssay(p.essay);
      if (p.essayType) setEssayType(p.essayType);
      if (p.targetSchool) setTargetSchool(p.targetSchool);
      if (p.targetScholarship) setTargetScholarship(p.targetScholarship);
      if (p.prompt) setPrompt(p.prompt);
      if (p.wordLimit) setWordLimit(p.wordLimit);
      if (p.lastResult) {
        setResult(p.lastResult);
        setTier(p.lastResultTier ?? "anon-preview");
        setGeneratedAt(p.generatedAt ?? null);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      const payload: PersistedDraft = {
        essay, essayType, targetSchool, targetScholarship, prompt, wordLimit,
        lastResult: result || undefined,
        lastResultTier: tier ?? undefined,
        generatedAt: generatedAt ?? undefined,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch { /* ignore */ }
  }, [essay, essayType, targetSchool, targetScholarship, prompt, wordLimit, result, tier, generatedAt]);

  useEffect(() => {
    document.title = t.docTitle;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", t.metaDesc);
  }, [t.docTitle, t.metaDesc]);

  const wordCount = essay.split(/\s+/).filter(Boolean).length;
  const overLimit = wordLimit && Number(wordLimit) > 0 && wordCount > Number(wordLimit);
  const cancelRef = useRef<AbortController | null>(null);

  const runCritique = async () => {
    if (essay.trim().length < 50) { setError(t.minLength); return; }
    setError(null);
    setRunning(true);
    setResult("");
    setTier(null);
    setGeneratedAt(null);

    const ac = new AbortController();
    cancelRef.current = ac;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const resp = await fetch(ESSAY_URL, {
        method: "POST",
        signal: ac.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          essay, essayType,
          targetSchool: targetSchool.trim() || undefined,
          targetScholarship: targetScholarship.trim() || undefined,
          prompt: prompt.trim() || undefined,
          wordLimit: wordLimit ? Number(wordLimit) : undefined,
          language,
        }),
      });

      const tierHeader = (resp.headers.get("X-TopUni-Tier") as "premium" | "free-preview" | null) ?? "anon-preview";
      setTier(tierHeader);

      if (!resp.ok || !resp.body) {
        const data = await resp.json().catch(() => ({}));
        setError(data.error || t.failed);
        setRunning(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let soFar = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, nl);
          textBuffer = textBuffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { setRunning(false); setGeneratedAt(Date.now()); return; }
          try {
            const parsed = JSON.parse(jsonStr);
            const c = parsed?.choices?.[0]?.delta?.content as string | undefined;
            if (c) { soFar += c; setResult(soFar); }
          } catch { /* ignore */ }
        }
      }
      setRunning(false);
      setGeneratedAt(Date.now());
    } catch (e) {
      if ((e as { name?: string })?.name !== "AbortError") {
        setError(e instanceof Error ? e.message : t.streamErr);
      }
      setRunning(false);
    }
  };

  const stop = () => { cancelRef.current?.abort(); };
  const clearAll = () => {
    setEssay(""); setTargetSchool(""); setTargetScholarship(""); setPrompt(""); setWordLimit("");
    setResult(""); setError(null); setTier(null); setGeneratedAt(null);
  };

  const aiPath = language === "ru" ? "/topuni-ai/ru" : "/topuni-ai";
  const pricingPath = language === "ru" ? "/pricing/ru" : "/pricing";

  return (
    <div className="min-h-screen bg-background">
      <Navigation language={language} />

      <section className="bg-gradient-to-br from-primary via-primary to-primary/95 py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-5 sm:px-8">
          <Link to={aiPath} className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-primary-foreground/70 hover:text-gold-light transition-colors mb-4">
            <ArrowLeft className="w-3.5 h-3.5" />
            {t.backToAi}
          </Link>
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold font-semibold mb-3">{t.kicker}</p>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-primary-foreground tracking-tight leading-tight mb-3">{t.h1}</h1>
          <p className="text-primary-foreground/75 text-sm sm:text-base leading-relaxed max-w-2xl">{t.sub}</p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
        <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
          {/* LEFT: form */}
          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">{t.essayTypeLabel}</label>
              <Select value={essayType} onValueChange={(v) => setEssayType(v as EssayType)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {t.essayTypes.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                  {t.targetSchool} <span className="opacity-60">{t.optional}</span>
                </label>
                <Input className="mt-1.5" value={targetSchool} onChange={(e) => setTargetSchool(e.target.value)} placeholder={t.targetSchoolPh} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                  {t.scholarshipLabel} <span className="opacity-60">{t.optional}</span>
                </label>
                <Input className="mt-1.5" value={targetScholarship} onChange={(e) => setTargetScholarship(e.target.value)} placeholder={t.scholarshipPh} />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                {t.promptLabel} <span className="opacity-60">{t.optional}</span>
              </label>
              <Textarea className="mt-1.5 resize-none" rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={t.promptPh} />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                {t.wordLimitLabel} <span className="opacity-60">{t.optional}</span>
              </label>
              <Input className="mt-1.5" type="number" value={wordLimit} onChange={(e) => setWordLimit(e.target.value)} placeholder={t.wordLimitPh} />
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">{t.yourEssay}</label>
                <span className={`text-[11px] tabular-nums ${overLimit ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                  {wordCount} {wordLimit ? `/ ${wordLimit}` : ""} {t.wordsUnit}
                </span>
              </div>
              <Textarea
                rows={14}
                className="resize-none font-serif text-[13px] leading-relaxed"
                value={essay}
                onChange={(e) => setEssay(e.target.value)}
                placeholder={t.essayPh}
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="gold" onClick={runCritique} disabled={running || essay.trim().length < 50} className="gap-1.5">
                {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenLine className="w-4 h-4" />}
                {running ? t.submit.running : isPremium ? t.submit.idlePremium : t.submit.idleAnon}
              </Button>
              {running && <Button variant="outline" onClick={stop}>{t.stop}</Button>}
              {!running && (essay || result) && (
                <Button variant="ghost" onClick={clearAll} className="gap-1.5 text-muted-foreground">
                  <Eraser className="w-3.5 h-3.5" /> {t.clear}
                </Button>
              )}
              {!isPremium && (
                <span className="ml-auto text-[11px] text-muted-foreground inline-flex items-center gap-1">
                  <Crown className="w-3 h-3 text-gold-dark" />
                  {t.freePreview} <Link to={pricingPath} className="underline text-foreground">{t.upgrade}</Link>
                </span>
              )}
            </div>
          </div>

          {/* RIGHT: result */}
          <div>
            {result || running ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-5 sm:p-7 sticky top-6">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="h-px w-6 bg-gold-dark" />
                    <span className="text-[10px] uppercase tracking-[0.22em] text-gold-dark font-semibold">{t.readersRead}</span>
                  </div>
                  {tier === "premium" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.14em] bg-gold/10 text-gold-dark border border-gold/30">
                      <Crown className="w-3 h-3" /> {t.premiumBadge}
                    </span>
                  )}
                </div>
                <div
                  className="prose prose-sm max-w-none
                             [&_h2]:font-heading [&_h2]:text-base [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-foreground
                             [&_p]:leading-relaxed [&_p]:text-foreground/90
                             [&_li]:leading-relaxed [&_li]:text-foreground/90
                             [&_strong]:text-foreground"
                >
                  <ReactMarkdown>{result}</ReactMarkdown>
                  {running && <span className="inline-block w-1.5 h-4 bg-accent animate-pulse ml-1 align-middle" />}
                </div>
                {!running && tier === "free-preview" && (
                  <div className="mt-6 pt-5 border-t border-border">
                    <div className="rounded-xl border border-gold/30 bg-gold/5 p-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Crown className="w-3.5 h-3.5 text-gold-dark" />
                        <p className="text-[11px] uppercase tracking-[0.18em] text-gold-dark font-semibold">{t.unlockFull}</p>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed mb-3">{t.unlockBody}</p>
                      <Button variant="gold" size="sm" asChild className="gap-1.5">
                        <Link to={pricingPath}>{t.seePricing} <ArrowRight className="w-3.5 h-3.5" /></Link>
                      </Button>
                    </div>
                  </div>
                )}
                {!running && generatedAt && (
                  <p className="text-[10px] text-muted-foreground/70 mt-4">
                    {t.generatedAt(new Date(generatedAt).toLocaleString(language === "ru" ? "ru-RU" : "en-US"))}
                  </p>
                )}
              </motion.div>
            ) : (
              <div className="bg-card border border-dashed border-border rounded-2xl p-8 text-center sticky top-6">
                <Sparkles className="h-8 w-8 text-gold-dark/60 mx-auto mb-3" />
                <p className="font-heading font-semibold text-foreground mb-1.5">{t.emptyTitle}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{t.emptyBody(isPremium)}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer language={language} />
    </div>
  );
};

export default EssayCritique;
