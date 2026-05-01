import { useState, useRef, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sparkles, GraduationCap,
  Bot, Loader2, Send, ArrowLeft,
  Search, ArrowRight, Download, BookOpen, ExternalLink, Calendar, Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";

interface StudentProfile {
  fullName: string;
  email: string;
  whatsapp: string;
  gradeLevel: string;
  gpa: string;
  ielts: string;
  sat: string;
  targetCountries: string[];
  major: string;
  budget: string;
  scholarshipNeeded: string;
  timeline: string;
  prestige: number;
  scholarship: number;
  careerRoi: number;
  visaAccess: number;
  locationPref: number;
}

interface TopUniDashboardProps {
  profile: StudentProfile;
  language: "en" | "ru";
  onBack: () => void;
}

type Msg = { role: "user" | "assistant"; content: string };

// (TrackerItem interface removed along with the tracker tab.)

const PATHWAY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/topuni-ai-pathway`;

/* ─── Inline-markdown helper ──────────────────────────────────────────
   Tiny renderer for the bold + italic inside a single line. Used by the
   InteractiveActionPlan because we want plain checkbox-list rendering
   but still want **bold** and *italic* to render as themselves. */
const renderInline = (txt: string): React.ReactNode => {
  const parts = txt.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} className="font-semibold text-foreground">{p.slice(2, -2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*"))   return <em key={i} className="italic">{p.slice(1, -1)}</em>;
    return <span key={i}>{p}</span>;
  });
};

/* ─── Interactive action plan ─────────────────────────────────────────
   Parses the "Your 90-day action plan" markdown section into structured
   sub-sections (e.g. Weeks 1-2 / 3-6 / 7-12) and renders each bullet as
   a checkbox the user can tick off. Completion state is persisted in
   localStorage by stable text hash, so the user can come back to the
   report and see their progress. */
const InteractiveActionPlan = ({ markdown, completedTasks, onToggle, taskKey, isRu }: {
  markdown: string;
  completedTasks: Set<string>;
  onToggle: (id: string) => void;
  taskKey: (text: string) => string;
  isRu: boolean;
}) => {
  const { title, blocks } = useMemo(() => {
    const lines = markdown.split("\n");
    let title = "";
    const blocks: { heading: string; intro: string; items: string[] }[] = [];
    let cur: typeof blocks[number] | null = null;
    let pendingIntro: string[] = [];
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) { pendingIntro = []; continue; }
      if (line.startsWith("## ")) {
        title = line.slice(3).trim();
      } else if (line.startsWith("### ")) {
        cur = { heading: line.slice(4).trim(), intro: "", items: [] };
        blocks.push(cur);
        pendingIntro = [];
      } else if (cur && /^([-*]|\d+\.)\s+/.test(line)) {
        const text = line.replace(/^([-*]|\d+\.)\s+/, "").trim();
        if (text) cur.items.push(text);
      } else if (cur && cur.items.length === 0 && !line.startsWith("#")) {
        // Lines between a ### heading and the first bullet are treated as intro
        pendingIntro.push(line);
        cur.intro = pendingIntro.join(" ");
      }
    }
    return { title, blocks };
  }, [markdown]);

  // No structured sub-sections yet → caller will fall back to plain markdown
  if (blocks.length === 0 || blocks.every(b => b.items.length === 0)) return null;

  const allKeys = blocks.flatMap(b => b.items.map(i => taskKey(i)));
  const doneCount = allKeys.filter(k => completedTasks.has(k)).length;
  const pct = allKeys.length > 0 ? Math.round((doneCount / allKeys.length) * 100) : 0;

  return (
    <div className="not-prose my-10">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">{title || (isRu ? "Ваш 90-дневный план" : "Your 90-day action plan")}</h2>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          <span className="text-foreground font-semibold">{doneCount}</span> / {allKeys.length} {isRu ? "сделано" : "done"}
        </span>
      </div>
      {/* Progress bar */}
      <div className="h-1 rounded-full bg-muted overflow-hidden mb-7">
        <div
          className="h-full bg-gradient-to-r from-gold-dark to-gold transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="space-y-6">
        {blocks.map((b, sIdx) => {
          const blockKeys = b.items.map(i => taskKey(i));
          const blockDone = blockKeys.filter(k => completedTasks.has(k)).length;
          return (
            <div key={sIdx}>
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-dark">{b.heading}</h3>
                <span className="text-[10px] text-muted-foreground tabular-nums">{blockDone} / {b.items.length}</span>
              </div>
              {b.intro && (
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{renderInline(b.intro)}</p>
              )}
              <div className="bg-card border border-border rounded-xl divide-y divide-border/60 overflow-hidden">
                {b.items.map((text, iIdx) => {
                  const id = taskKey(text);
                  const done = completedTasks.has(id);
                  return (
                    <label key={iIdx} className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors">
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={() => onToggle(id)}
                        className="mt-1 h-4 w-4 rounded border-border accent-gold-dark cursor-pointer shrink-0"
                      />
                      <span className={`text-sm leading-relaxed transition-colors ${done ? "text-muted-foreground line-through decoration-muted-foreground/40" : "text-foreground"}`}>
                        {renderInline(text)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── University shortlist → card grid ───────────────────────────────
   Parses the "Your university shortlist" section into the three buckets
   defined by ### sub-headings (Strong fits / Aligned / Worth keeping
   on the radar) and renders each bullet item as a visual card with the
   university name, description, and a country-coded link out to a
   filtered Discover view. Way more scannable than bulleted prose. */
const UniversityShortlist = ({ markdown, isRu, onOpenDiscover }: {
  markdown: string;
  isRu: boolean;
  onOpenDiscover: () => void;
}) => {
  const { title, buckets } = useMemo(() => {
    const lines = markdown.split("\n");
    let title = "";
    const buckets: { heading: string; items: { name: string; detail: string }[] }[] = [];
    let cur: typeof buckets[number] | null = null;
    let pendingBullet: string[] = [];

    const flushPending = () => {
      if (cur && pendingBullet.length > 0) {
        const text = pendingBullet.join(" ").trim();
        const m = text.match(/^\*\*([^*]+)\*\*\s*[—–-]?\s*(.*)$/);
        if (m) {
          cur.items.push({ name: m[1].trim(), detail: m[2].trim() });
        } else if (text) {
          cur.items.push({ name: text.replace(/^\*\*|\*\*$/g, "").trim(), detail: "" });
        }
        pendingBullet = [];
      }
    };

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) { flushPending(); continue; }
      if (line.startsWith("## ")) {
        title = line.slice(3).trim();
      } else if (line.startsWith("### ")) {
        flushPending();
        cur = { heading: line.slice(4).trim(), items: [] };
        buckets.push(cur);
      } else if (cur && /^([-*]|\d+\.)\s+/.test(line)) {
        flushPending();
        pendingBullet = [line.replace(/^([-*]|\d+\.)\s+/, "").trim()];
      } else if (cur && pendingBullet.length > 0) {
        // Continuation of a bullet (multi-line bullet)
        pendingBullet.push(line);
      }
    }
    flushPending();
    return { title, buckets: buckets.filter(b => b.items.length > 0) };
  }, [markdown]);

  if (buckets.length === 0) return null;

  // Map bucket index → tier accent. Strong fits = gold, Aligned = navy, last = muted.
  const tierFor = (i: number, total: number) => {
    if (i === 0) return { kicker: "text-gold-dark", strip: "from-gold-light via-gold-dark to-gold-light" };
    if (i === total - 1) return { kicker: "text-muted-foreground", strip: "from-muted-foreground/30 to-muted-foreground/50" };
    return { kicker: "text-primary", strip: "from-primary/60 via-primary to-primary/60" };
  };

  return (
    <div className="not-prose my-10">
      <div className="flex items-baseline justify-between gap-3 mb-6">
        <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {title || (isRu ? "Ваш шорт-лист университетов" : "Your university shortlist")}
        </h2>
        <button
          onClick={onOpenDiscover}
          className="text-xs text-muted-foreground hover:text-gold-dark transition-colors hidden sm:inline-flex items-center gap-1"
        >
          {isRu ? "Открыть Discover" : "Open in Discover"} <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="space-y-7">
        {buckets.map((b, bIdx) => {
          const tier = tierFor(bIdx, buckets.length);
          return (
            <div key={bIdx}>
              <p className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${tier.kicker} mb-3`}>
                {b.heading}
              </p>
              <div className="grid sm:grid-cols-2 gap-2.5">
                {b.items.map((item, iIdx) => (
                  <div
                    key={iIdx}
                    className="group relative bg-card border border-border rounded-xl p-4 hover:border-foreground/20 hover:shadow-sm transition-all overflow-hidden"
                  >
                    <div className={`absolute left-0 inset-y-0 w-[2px] bg-gradient-to-b ${tier.strip} opacity-70`} />
                    <h4 className="font-heading font-semibold text-[15px] text-foreground tracking-tight leading-snug mb-1">
                      {item.name}
                    </h4>
                    {item.detail && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {renderInline(item.detail)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Section-aware renderer ───────────────────────────────────────────
   Splits the streaming markdown by ## headings. Routes specific sections
   (action plan, university shortlist) to custom interactive renderers;
   everything else renders as standard markdown. */
const PATHWAY_PLAN_SECTION_REGEX = /^##\s+.*?(action plan|90.day|план действий)/i;
const PATHWAY_UNIS_SECTION_REGEX = /^##\s+.*?(university shortlist|your university|шорт.лист университетов)/i;

const ReportRenderer = ({ markdown, completedTasks, onToggle, taskKey, isRu, onOpenDiscover }: {
  markdown: string;
  completedTasks: Set<string>;
  onToggle: (id: string) => void;
  taskKey: (text: string) => string;
  isRu: boolean;
  onOpenDiscover: () => void;
}) => {
  const sections = useMemo(() => {
    if (!markdown.trim()) return [] as string[];
    return markdown.split(/(?=^##\s+)/m).filter(s => s.trim().length > 0);
  }, [markdown]);

  if (sections.length === 0) return null;

  return (
    <>
      {sections.map((section, i) => {
        if (PATHWAY_PLAN_SECTION_REGEX.test(section)) {
          return <InteractiveActionPlanOrFallback
            key={i} markdown={section} completedTasks={completedTasks}
            onToggle={onToggle} taskKey={taskKey} isRu={isRu}
          />;
        }
        if (PATHWAY_UNIS_SECTION_REGEX.test(section)) {
          // Stream-safe: only flip to cards once the AI has produced at least one ### sub-bucket
          const hasBuckets = /^###\s+/m.test(section);
          if (hasBuckets) {
            return <UniversityShortlist key={i} markdown={section} isRu={isRu} onOpenDiscover={onOpenDiscover} />;
          }
        }
        return <ReactMarkdown key={i}>{section}</ReactMarkdown>;
      })}
    </>
  );
};

/* If the AI hasn't streamed in any list items yet for the plan section,
   fall back to standard markdown so the user sees something during stream. */
const InteractiveActionPlanOrFallback = (props: {
  markdown: string;
  completedTasks: Set<string>;
  onToggle: (id: string) => void;
  taskKey: (text: string) => string;
  isRu: boolean;
}) => {
  const hasItems = /^\s*([-*]|\d+\.)\s+/m.test(props.markdown);
  if (!hasItems) return <ReactMarkdown>{props.markdown}</ReactMarkdown>;
  return <InteractiveActionPlan {...props} />;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/topuni-chat`;

const TopUniDashboard = ({ profile, language, onBack }: TopUniDashboardProps) => {
  const isRu = language === "ru";
  const t = (en: string, ru: string) => isRu ? ru : en;
  const navigate = useNavigate();

  // Pathway state
  const [pathwayContent, setPathwayContent] = useState("");
  const [pathwayLoading, setPathwayLoading] = useState(false);
  const [pathwayGenerated, setPathwayGenerated] = useState(false);

  // Interactive action plan: track which planned tasks the user has completed.
  // Keyed by stable hash of the task text (so the keys survive re-generation
  // as long as the AI keeps the same wording, and gracefully reset when
  // wording changes).
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("topuni-tasks-done") || "[]")); }
    catch { return new Set(); }
  });
  useEffect(() => {
    localStorage.setItem("topuni-tasks-done", JSON.stringify([...completedTasks]));
  }, [completedTasks]);
  const toggleTask = (id: string) => {
    setCompletedTasks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const taskKey = (text: string) => {
    // Cheap stable hash. Same text → same key, different text → different key.
    let h = 0;
    for (let i = 0; i < text.length; i++) h = ((h << 5) - h + text.charCodeAt(i)) | 0;
    return `t${h.toString(36)}`;
  };

  // Live scholarship matches — pulled from the database, scored against the
  // student's profile. The visual bridge from this report into Discover.
  type LiveMatch = {
    scholarship_id: string;
    scholarship_name: string;
    provider_name: string | null;
    host_country: string | null;
    coverage_type: string;
    award_amount_text: string | null;
    estimated_total_value_usd: number | null;
    application_deadline: string | null;
    why_this_fits: string | null;
  };
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);

  useEffect(() => {
    // Skip if profile is essentially empty (no targets, no scores)
    if (!profile.fullName || profile.fullName === "Student") return;
    (async () => {
      let q = supabase.from("scholarships").select(
        "scholarship_id, scholarship_name, provider_name, host_country, coverage_type, award_amount_text, estimated_total_value_usd, application_deadline, why_this_fits"
      ).eq("verified", true);
      if (profile.targetCountries && profile.targetCountries.length > 0) {
        q = q.in("host_country", profile.targetCountries);
      }
      const { data } = await q
        .order("application_deadline", { ascending: true, nullsFirst: false })
        .limit(6);
      if (data) setLiveMatches(data as LiveMatch[]);
    })();
  }, [profile.fullName, profile.targetCountries?.join(",")]);

  // Chat state
  const [chatMessages, setChatMessages] = useState<Msg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Only generate pathway if profile is actually filled
  const isProfileFilled = profile.fullName && profile.fullName !== "Student" && profile.gpa && profile.targetCountries.length > 0;

  useEffect(() => {
    if (!pathwayGenerated && isProfileFilled) {
      generatePathway();
    }
  }, []);

  const streamSSE = async (url: string, body: any, onDelta: (chunk: string) => void, onDone: () => void) => {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok || !resp.body) {
      const errData = await resp.json().catch(() => ({}));
      onDelta(errData.error || "Something went wrong. Please try again.");
      onDone();
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") { streamDone = true; break; }
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch { /* ignore */ }
      }
    }
    onDone();
  };

  const generatePathway = async () => {
    setPathwayLoading(true);
    setPathwayContent("");
    let soFar = "";

    await streamSSE(
      PATHWAY_URL,
      { profile, language },
      (chunk) => { soFar += chunk; setPathwayContent(soFar); },
      () => { setPathwayLoading(false); setPathwayGenerated(true); }
    );
  };

  const sendChatMessage = async (text: string) => {
    if (!text.trim() || chatLoading) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const allMessages = [...chatMessages, userMsg];
    setChatMessages(allMessages);
    setChatInput("");
    setChatLoading(true);

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setChatMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    await streamSSE(
      CHAT_URL,
      { messages: allMessages, language },
      (chunk) => upsertAssistant(chunk),
      () => setChatLoading(false)
    );
  };

  // (Tracker functions removed along with the tracker tab — application
  // status is tracked inside Discover now.)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> {t("Back", "Назад")}
          </button>
          <Badge className="bg-accent/10 text-accent border-accent/30">
            <Sparkles className="w-3 h-3 mr-1" /> {t("AI-Powered", "На базе AI")}
          </Badge>
        </div>
        <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground">
          {isProfileFilled
            ? t(`Welcome, ${profile.fullName.split(" ")[0]}`, `Добро пожаловать, ${profile.fullName.split(" ")[0]}`)
            : t("Your Dashboard", "Ваша панель")
          }
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("Your university planning dashboard", "Ваша панель планирования")}
        </p>
        {isProfileFilled && (
          <div className="flex flex-wrap gap-2 mt-3">
            {profile.targetCountries.map(c => (
              <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
            ))}
            {profile.major && <Badge variant="outline" className="text-xs">{profile.major}</Badge>}
            {profile.gpa && <Badge variant="outline" className="text-xs">GPA: {profile.gpa}</Badge>}
            {profile.ielts && <Badge variant="outline" className="text-xs">IELTS: {profile.ielts}</Badge>}
          </div>
        )}
        {/* Discover CTA — prominent next step */}
        <div className="mt-4 p-4 rounded-xl border border-accent/30 bg-accent/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-foreground">
              {t("Browse scholarships matched to your profile", "Стипендии, подобранные по вашему профилю")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("GPA, test scores, citizenship, and field — verified requirements, ranked by fit.", "ГПА, баллы, гражданство, специальность — верифицированные требования.")}
            </p>
          </div>
          <Button variant="gold" size="sm" className="gap-1.5 shrink-0" onClick={() => navigate(isRu ? "/discover/ru" : "/discover")}>
            <Search className="w-4 h-4" /> {t("Find my scholarships", "Найти стипендии")} <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </motion.div>

      {/* Dashboard — two surfaces only: Strategy (the report) and Counselor (chat) */}
      <Tabs defaultValue={isProfileFilled ? "pathway" : "counselor"} className="space-y-6">
        <div className="flex flex-wrap items-center gap-3 border-b border-border pb-1">
          <TabsList className="bg-transparent p-0 h-auto gap-7 rounded-none -mb-[1px]">
            <TabsTrigger value="pathway" className="data-[state=active]:text-foreground data-[state=active]:border-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent border-b-2 border-transparent text-muted-foreground hover:text-foreground rounded-none px-0 pb-3 pt-0 text-sm font-medium gap-1.5 bg-transparent">
              <GraduationCap className="w-4 h-4" /> {t("Strategy", "Стратегия")}
            </TabsTrigger>
            <TabsTrigger value="counselor" className="data-[state=active]:text-foreground data-[state=active]:border-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent border-b-2 border-transparent text-muted-foreground hover:text-foreground rounded-none px-0 pb-3 pt-0 text-sm font-medium gap-1.5 bg-transparent">
              <Bot className="w-4 h-4" /> {t("Counselor", "Советник")}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* MY PATHWAY TAB */}
        <TabsContent value="pathway">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                {t("Your AI-Generated Pathway", "Ваш AI-сгенерированный путь")}
              </CardTitle>
              {pathwayGenerated && pathwayContent && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={generatePathway} disabled={pathwayLoading}>
                    {pathwayLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("Regenerate", "Обновить")}
                  </Button>
                  <Button
                    variant="gold"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => window.print()}
                    disabled={pathwayLoading}
                  >
                    <Download className="w-4 h-4" />
                    {t("Download PDF", "Скачать PDF")}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {!isProfileFilled && !pathwayContent && (
                <div className="text-center py-12 space-y-4">
                  <GraduationCap className="w-10 h-10 mx-auto text-muted-foreground/40" />
                  <p className="text-muted-foreground text-sm">{t("Complete your profile to generate a personalized pathway.", "Заполните профиль для персонального плана.")}</p>
                  <Button variant="gold" onClick={onBack}>
                    <Sparkles className="w-4 h-4 mr-2" /> {t("Start Your Plan", "Начать план")}
                  </Button>
                </div>
              )}
              {pathwayLoading && !pathwayContent && (
                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin text-accent" />
                  <p className="text-muted-foreground text-sm">{t("Analyzing your profile and matching universities...", "Анализируем ваш профиль и подбираем университеты...")}</p>
                </div>
              )}
              {pathwayContent && (
                <div id="printable-report" className="prose prose-sm max-w-none dark:prose-invert [&_h2]:text-foreground [&_h2]:font-heading [&_h2]:text-xl [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:text-foreground [&_h3]:font-heading [&_h3]:text-lg [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:text-muted-foreground [&_li]:text-muted-foreground [&_strong]:text-foreground">
                  {/* Print-only masthead */}
                  <div className="print-only mb-8 pb-6 border-b-2 border-foreground hidden">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-foreground/60 mb-2">TopUni · Pathway Report</p>
                    <h1 className="font-heading text-3xl font-bold text-foreground tracking-tight leading-tight m-0">
                      Admissions Strategy for {profile.fullName || "Student"}
                    </h1>
                    <p className="text-sm text-foreground/65 mt-2">
                      Generated {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} ·
                      {profile.targetCountries?.length > 0 ? ` Targeting ${profile.targetCountries.join(", ")} ·` : ""}
                      {profile.major ? ` ${profile.major}` : ""}
                    </p>
                  </div>

                  {/* Profile recap chips — visual context, no chart, no fluff */}
                  <div className="not-prose flex flex-wrap gap-2 mb-8 pb-6 border-b border-border">
                    {[
                      profile.gradeLevel,
                      profile.major,
                      profile.gpa ? `GPA ${profile.gpa}` : null,
                      profile.ielts ? `IELTS ${profile.ielts}` : null,
                      profile.sat ? `SAT ${profile.sat}` : null,
                      ...(profile.targetCountries || []),
                    ].filter(Boolean).map((chip) => (
                      <span key={chip as string} className="text-xs bg-muted/50 text-foreground/80 border border-border px-2.5 py-1 rounded-full font-medium">{chip as string}</span>
                    ))}
                  </div>

                  {/* Live scholarship matches — the visual bridge into Discover */}
                  {liveMatches.length > 0 && (
                    <div className="not-prose mb-10">
                      <div className="flex items-baseline justify-between mb-4">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark mb-1">Your top scholarship matches</p>
                          <h3 className="font-heading text-base font-bold text-foreground tracking-tight">{t("Pulled live from our database — sorted by deadline", "Подобрано из базы — по дедлайнам")}</h3>
                        </div>
                        <Button variant="outline" size="sm" className="gap-1.5 shrink-0 hidden sm:flex" onClick={() => navigate(isRu ? "/discover/ru" : "/discover")}>
                          {t("See all in Discover", "Открыть Discover")} <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-2.5">
                        {liveMatches.slice(0, 6).map((m) => {
                          const days = m.application_deadline ? Math.ceil((new Date(m.application_deadline).getTime() - Date.now()) / 86400000) : null;
                          const dl = !m.application_deadline ? "Rolling" : days! <= 0 ? "Closed" : days! <= 30 ? `${days} days` : days! <= 90 ? `${days} days` : `${Math.ceil(days! / 30)} months`;
                          const dlClass = !m.application_deadline ? "text-muted-foreground" : days! <= 30 ? "text-destructive" : days! <= 90 ? "text-warning" : "text-muted-foreground";
                          return (
                            <button
                              key={m.scholarship_id}
                              onClick={() => navigate(isRu ? "/discover/ru" : "/discover")}
                              className="group text-left bg-card border border-border rounded-xl p-4 hover:border-gold/40 hover:shadow-sm transition-all"
                            >
                              <div className="flex items-baseline justify-between gap-2 mb-2">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground truncate">
                                  {m.host_country || "—"}
                                </p>
                                <span className={`text-[11px] font-semibold tabular-nums ${dlClass}`}>{dl}</span>
                              </div>
                              <h4 className="font-heading font-semibold text-[15px] text-foreground line-clamp-2 leading-snug mb-1 group-hover:text-gold-dark transition-colors">
                                {m.scholarship_name}
                              </h4>
                              <p className="text-xs text-muted-foreground truncate">
                                {m.award_amount_text || (m.coverage_type === "full_ride" ? "Full ride" : m.coverage_type === "tuition_only" ? "Tuition" : "Stipend")}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                      <Button variant="outline" size="sm" className="w-full mt-3 gap-1.5 sm:hidden" onClick={() => navigate(isRu ? "/discover/ru" : "/discover")}>
                        {t("See all in Discover", "Открыть Discover")} <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}

                  <ReportRenderer
                    markdown={pathwayContent}
                    completedTasks={completedTasks}
                    onToggle={toggleTask}
                    taskKey={taskKey}
                    isRu={isRu}
                    onOpenDiscover={() => navigate(isRu ? "/discover/ru" : "/discover")}
                  />
                  {pathwayLoading && <span className="inline-block w-2 h-4 bg-accent animate-pulse ml-1" />}

                  {/* Next steps — drives users into the rest of the funnel */}
                  {!pathwayLoading && (
                    <div className="not-prose grid sm:grid-cols-2 gap-3 mt-12 pt-8 border-t border-border">
                      <button
                        onClick={() => navigate(isRu ? "/discover/ru" : "/discover")}
                        className="group text-left bg-card border border-border rounded-2xl p-6 hover:border-gold/40 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="h-10 w-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
                            <Search className="w-5 h-5 text-gold-dark" />
                          </div>
                          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Step 02</span>
                        </div>
                        <h4 className="font-heading font-bold text-lg text-foreground mb-1.5 tracking-tight">Discover</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                          {t("See every ranked scholarship match, with how-to-win strategy notes and rejection patterns.", "Все ранжированные стипендии со стратегией и причинами отказов.")}
                        </p>
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground group-hover:text-gold-dark transition-colors">
                          {t("Open the database", "Открыть базу")} <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </button>
                      <button
                        onClick={() => navigate("/academy")}
                        className="group text-left bg-card border border-border rounded-2xl p-6 hover:border-gold/40 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="h-10 w-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-gold-dark" />
                          </div>
                          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Step 03</span>
                        </div>
                        <h4 className="font-heading font-bold text-lg text-foreground mb-1.5 tracking-tight">Academy</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                          {t("Live monthly workshops with our founders. Refine the strategy with people who've been through it.", "Ежемесячные воркшопы с нашими основателями.")}
                        </p>
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground group-hover:text-gold-dark transition-colors">
                          {t("Preview Academy", "Открыть Academy")} <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Print-only footer disclaimer */}
                  <div className="print-only mt-12 pt-6 border-t border-foreground/20 hidden">
                    <p className="text-[10px] text-foreground/55 leading-relaxed m-0">
                      Generated by TopUni AI · topuni.com · This report is a starting point for your application strategy. Verify scholarship details, deadlines, and eligibility on official institution websites before applying. © {new Date().getFullYear()} TopUni Consulting.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* (Predictor / Essays / Tracker / Scholarships matcher tabs removed —
            all secondary or duplicating Discover. The strategy report is the
            product; the chat counselor is the follow-up surface.) */}

        {/* AI COUNSELOR TAB */}
        <TabsContent value="counselor">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="shrink-0">
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-accent" />
                {t("AI Counselor", "AI Советник")}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {t("Your personal admissions counselor. Ask anything about universities, scholarships, applications, or strategy.",
                   "Ваш личный консультант по поступлению. Спросите о университетах, стипендиях, заявках или стратегии.")}
              </p>
            </CardHeader>
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-6 space-y-3">
              {chatMessages.length === 0 && (
                <div className="space-y-3 pt-4">
                  <div className="bg-accent/10 rounded-lg p-3 text-sm text-muted-foreground">
                    <p className="font-semibold text-foreground mb-1">
                      {isProfileFilled
                        ? (isRu ? `👋 Привет, ${profile.fullName.split(" ")[0]}! Я ваш AI-советник.` : `👋 Hi ${profile.fullName.split(" ")[0]}! I'm your AI counselor.`)
                        : (isRu ? "👋 Привет! Я ваш AI-советник по поступлению." : "👋 Hi! I'm your AI admissions counselor.")
                      }
                    </p>
                    <p>{isRu ? "Задайте любой вопрос о поступлении, стипендиях или планировании." : "Ask me anything about admissions, scholarships, or study planning."}</p>
                  </div>

                  {!isProfileFilled && (
                    <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 space-y-3">
                      <p className="text-sm text-foreground font-medium">
                        {t("💡 Want personalized advice?", "💡 Хотите персональные советы?")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("Complete your profile for tailored university matches, admission predictions, and more.", "Заполните профиль для персональных рекомендаций.")}
                      </p>
                      <Button variant="gold" size="sm" onClick={onBack}>
                        <Sparkles className="w-4 h-4 mr-1" /> {t("Start Your Plan", "Начать план")}
                      </Button>
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-2">
                    {[
                      t("What are my chances at my top choice?", "Каковы мои шансы в топ-выборе?"),
                      t("Help me write my personal statement", "Помогите с мотивационным письмом"),
                      t("What scholarships should I apply to?", "На какие стипендии подать?"),
                      t("Create a study plan for IELTS", "Составьте план подготовки к IELTS"),
                    ].map((q, i) => (
                      <button key={i} onClick={() => sendChatMessage(q)}
                        className="text-left text-xs px-3 py-2 rounded-md border border-border hover:border-accent/50 hover:bg-accent/5 text-muted-foreground transition-colors">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === "user" ? "bg-accent text-accent-foreground" : "bg-muted text-foreground"
                  }`}>
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && chatMessages[chatMessages.length - 1]?.role === "user" && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-accent" />
                  </div>
                </div>
              )}
            </div>
            <div className="border-t border-border p-4 shrink-0">
              <form onSubmit={(e) => { e.preventDefault(); sendChatMessage(chatInput); }} className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder={isRu ? "Спросите о поступлении..." : "Ask about admissions..."}
                  className="text-sm"
                  disabled={chatLoading}
                />
                <Button type="submit" size="icon" variant="gold" disabled={chatLoading || !chatInput.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default TopUniDashboard;
