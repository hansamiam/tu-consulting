/**
 * EssayCritique — paste-and-critique surface at /essay.
 *
 * Lets a student paste an admissions / scholarship essay and receive
 * a streamed reader-perspective critique. Premium users get full
 * critique with rewrite samples + a calibrated /10 score; free users
 * get a sectioned preview that ends with an upgrade prompt.
 *
 * Streaming wire format matches topuni-ai-pathway / topuni-chat: SSE
 * with OpenAI-style { choices: [{ delta: { content } }] } chunks.
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

const ESSAY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/essay-critique`;

type EssayType = "personal_statement" | "scholarship" | "sop" | "supplemental";

const ESSAY_TYPE_OPTIONS: { value: EssayType; label: string }[] = [
  { value: "personal_statement", label: "Personal statement" },
  { value: "scholarship",        label: "Scholarship application essay" },
  { value: "sop",                label: "Statement of Purpose (SoP)" },
  { value: "supplemental",       label: "Supplemental essay" },
];

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

const EssayCritique = () => {
  const { user, subscription } = useAuth();
  const isPremium = !!subscription && (
    subscription.is_active || subscription.is_founding_member || subscription.earned_trial_active ||
    subscription.tier === "pro" || subscription.tier === "founding"
  );

  /* Form state — persisted to localStorage so a tab close doesn't lose
     hours of essay drafting. */
  const [essay, setEssay] = useState("");
  const [essayType, setEssayType] = useState<EssayType>("personal_statement");
  const [targetSchool, setTargetSchool] = useState("");
  const [targetScholarship, setTargetScholarship] = useState("");
  const [prompt, setPrompt] = useState("");
  const [wordLimit, setWordLimit] = useState("");

  /* Result state */
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState("");
  const [tier, setTier] = useState<"free-preview" | "premium" | "anon-preview" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<number | null>(null);

  /* Hydrate draft on mount */
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

  /* Persist on change (debounced via React's natural batching) */
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

  /* SEO meta */
  useEffect(() => {
    document.title = "AI essay critique for admissions & scholarships — TopUni";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute(
      "content",
      "Paste your admissions or scholarship essay and get a streamed reader-perspective critique — what's working, what's not, and the rewrite that would change your verdict.",
    );
  }, []);

  const wordCount = essay.split(/\s+/).filter(Boolean).length;
  const overLimit = wordLimit && Number(wordLimit) > 0 && wordCount > Number(wordLimit);

  const cancelRef = useRef<AbortController | null>(null);

  const runCritique = async () => {
    if (essay.trim().length < 50) {
      setError("Paste at least 50 characters of essay text.");
      return;
    }
    setError(null);
    setRunning(true);
    setResult("");
    setTier(null);
    setGeneratedAt(null);

    const ac = new AbortController();
    cancelRef.current = ac;

    try {
      // Auth header — pass user's session token if available so the
      // edge function can resolve premium tier from subscriptions.
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
          essay,
          essayType,
          targetSchool: targetSchool.trim() || undefined,
          targetScholarship: targetScholarship.trim() || undefined,
          prompt: prompt.trim() || undefined,
          wordLimit: wordLimit ? Number(wordLimit) : undefined,
          language: "en",
        }),
      });

      const tierHeader = (resp.headers.get("X-TopUni-Tier") as "premium" | "free-preview" | null) ?? "anon-preview";
      setTier(tierHeader);

      if (!resp.ok || !resp.body) {
        const data = await resp.json().catch(() => ({}));
        setError(data.error || "Something went wrong. Try again?");
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
            if (c) {
              soFar += c;
              setResult(soFar);
            }
          } catch { /* ignore parse errors on partial chunks */ }
        }
      }
      setRunning(false);
      setGeneratedAt(Date.now());
    } catch (e) {
      if ((e as { name?: string })?.name !== "AbortError") {
        setError(e instanceof Error ? e.message : "Stream error");
      }
      setRunning(false);
    }
  };

  const stop = () => { cancelRef.current?.abort(); };
  const clearAll = () => {
    setEssay(""); setTargetSchool(""); setTargetScholarship(""); setPrompt(""); setWordLimit("");
    setResult(""); setError(null); setTier(null); setGeneratedAt(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* HERO ─────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-primary via-primary to-primary/95 py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-5 sm:px-8">
          <Link
            to="/topuni-ai"
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-primary-foreground/70 hover:text-gold-light transition-colors mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to TopUni AI
          </Link>
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold font-semibold mb-3">
            Essay critique
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-primary-foreground tracking-tight leading-tight mb-3">
            What an admissions reader sees first.
          </h1>
          <p className="text-primary-foreground/75 text-sm sm:text-base leading-relaxed max-w-2xl">
            Paste your draft. Get a reader-perspective critique — what works, what loses them, and the rewrite that
            would change the verdict. The same lens used by Yale, Cambridge, Harvard admissions readers.
          </p>
        </div>
      </section>

      {/* BODY ─────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
        <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
          {/* LEFT: input form */}
          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                Essay type
              </label>
              <Select value={essayType} onValueChange={(v) => setEssayType(v as EssayType)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ESSAY_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                  Target school <span className="opacity-60">(optional)</span>
                </label>
                <Input
                  className="mt-1.5"
                  value={targetSchool}
                  onChange={(e) => setTargetSchool(e.target.value)}
                  placeholder="e.g. Yale"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                  Scholarship <span className="opacity-60">(optional)</span>
                </label>
                <Input
                  className="mt-1.5"
                  value={targetScholarship}
                  onChange={(e) => setTargetScholarship(e.target.value)}
                  placeholder="e.g. Chevening"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                Essay prompt / question <span className="opacity-60">(optional)</span>
              </label>
              <Textarea
                className="mt-1.5 resize-none"
                rows={2}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="What the application asks you to write about"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                Target word count <span className="opacity-60">(optional)</span>
              </label>
              <Input
                className="mt-1.5"
                type="number"
                value={wordLimit}
                onChange={(e) => setWordLimit(e.target.value)}
                placeholder="650"
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                  Your essay
                </label>
                <span className={`text-[11px] tabular-nums ${overLimit ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                  {wordCount} {wordLimit ? `/ ${wordLimit}` : ""} words
                </span>
              </div>
              <Textarea
                rows={14}
                className="resize-none font-serif text-[13px] leading-relaxed"
                value={essay}
                onChange={(e) => setEssay(e.target.value)}
                placeholder="Paste your draft here. The more honest the draft, the sharper the read."
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="gold"
                onClick={runCritique}
                disabled={running || essay.trim().length < 50}
                className="gap-1.5"
              >
                {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenLine className="w-4 h-4" />}
                {running ? "Reading…" : isPremium ? "Critique my essay" : "Critique (preview)"}
              </Button>
              {running && (
                <Button variant="outline" onClick={stop}>Stop</Button>
              )}
              {!running && (essay || result) && (
                <Button variant="ghost" onClick={clearAll} className="gap-1.5 text-muted-foreground">
                  <Eraser className="w-3.5 h-3.5" /> Clear
                </Button>
              )}
              {!isPremium && (
                <span className="ml-auto text-[11px] text-muted-foreground inline-flex items-center gap-1">
                  <Crown className="w-3 h-3 text-gold-dark" />
                  Free preview · <Link to="/pricing" className="underline text-foreground">Upgrade</Link>
                </span>
              )}
            </div>
          </div>

          {/* RIGHT: result */}
          <div>
            {result || running ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-2xl p-5 sm:p-7 sticky top-6"
              >
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="h-px w-6 bg-gold-dark" />
                    <span className="text-[10px] uppercase tracking-[0.22em] text-gold-dark font-semibold">
                      Reader's read
                    </span>
                  </div>
                  {tier === "premium" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.14em] bg-gold/10 text-gold-dark border border-gold/30">
                      <Crown className="w-3 h-3" /> Premium
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
                        <p className="text-[11px] uppercase tracking-[0.18em] text-gold-dark font-semibold">
                          Unlock the full critique
                        </p>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed mb-3">
                        Premium adds two more rewrite samples, a calibrated /10 score, and Gemini 2.5 Pro reading
                        depth. Same essay, deeper read.
                      </p>
                      <Button variant="gold" size="sm" asChild className="gap-1.5">
                        <Link to="/pricing">
                          See pricing <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}
                {!running && generatedAt && (
                  <p className="text-[10px] text-muted-foreground/70 mt-4">
                    Generated {new Date(generatedAt).toLocaleString()} · re-running uses fresh model output
                  </p>
                )}
              </motion.div>
            ) : (
              <div className="bg-card border border-dashed border-border rounded-2xl p-8 text-center sticky top-6">
                <Sparkles className="h-8 w-8 text-gold-dark/60 mx-auto mb-3" />
                <p className="font-heading font-semibold text-foreground mb-1.5">
                  Your reader-perspective critique appears here.
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Five sections {isPremium ? "+ rewrite samples + /10 score" : "in the preview"}: first-30-seconds read,
                  what's working, what's not, the hidden weakness, and the highest-leverage rewrite.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer language="en" />
    </div>
  );
};

export default EssayCritique;
