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
  RotateCcw, Compass, PenLine, Wallet, FileText, Plane,
  Lightbulb, AlertTriangle, Quote, Check,
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

/* ─── Funding pathway → scholarship card grid ─────────────────────────
   The AI's "## Your funding pathway" section names 3-5 scholarships from
   our database. Cross-references each named scholarship against the
   live matches we already pulled, decorating cards with real deadline,
   coverage, and value when available. Click → Discover. */
type LiveMatchLite = {
  scholarship_id: string;
  scholarship_name: string;
  host_country: string | null;
  coverage_type: string;
  award_amount_text: string | null;
  estimated_total_value_usd: number | null;
  application_deadline: string | null;
};

const fmtMoney = (v: number) =>
  v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `$${Math.round(v / 1000)}K` : `$${v}`;

const FundingShortlist = ({ markdown, liveMatches, isRu, onOpenDiscover }: {
  markdown: string;
  liveMatches: LiveMatchLite[];
  isRu: boolean;
  onOpenDiscover: () => void;
}) => {
  const { title, items } = useMemo(() => {
    const lines = markdown.split("\n");
    let title = "";
    const items: { name: string; detail: string }[] = [];
    let pending: string[] = [];

    const flush = () => {
      if (pending.length === 0) return;
      const text = pending.join(" ").trim();
      const m = text.match(/^\*\*([^*]+)\*\*\s*[—–-]?\s*(.*)$/);
      if (m) items.push({ name: m[1].trim(), detail: m[2].trim() });
      else if (text) items.push({ name: text.replace(/\*+/g, "").trim(), detail: "" });
      pending = [];
    };

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) { flush(); continue; }
      if (line.startsWith("## ")) {
        title = line.slice(3).trim();
      } else if (/^([-*]|\d+\.)\s+/.test(line)) {
        flush();
        pending = [line.replace(/^([-*]|\d+\.)\s+/, "").trim()];
      } else if (pending.length > 0 && !line.startsWith("#")) {
        pending.push(line);
      }
    }
    flush();
    return { title, items };
  }, [markdown]);

  // Cross-reference AI scholarship names against the live DB list
  const decorated = useMemo(() => {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    return items.map((it) => {
      const itemNorm = norm(it.name);
      const match = liveMatches.find((m) => {
        const dbNorm = norm(m.scholarship_name);
        // Bidirectional substring match — robust to variations like
        // "Chevening" vs "Chevening Scholarships"
        return itemNorm === dbNorm || itemNorm.includes(dbNorm) || dbNorm.includes(itemNorm);
      });
      return { ...it, match };
    });
  }, [items, liveMatches]);

  if (items.length === 0) return null;

  return (
    <div className="not-prose my-10">
      <div className="flex items-baseline justify-between gap-3 mb-6">
        <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {title || (isRu ? "Финансирование" : "Your funding pathway")}
        </h2>
        <button
          onClick={onOpenDiscover}
          className="text-xs text-muted-foreground hover:text-gold-dark transition-colors hidden sm:inline-flex items-center gap-1"
        >
          {isRu ? "Все стипендии" : "Browse all scholarships"} <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="space-y-2.5">
        {decorated.map((it, i) => {
          const days = it.match?.application_deadline
            ? Math.ceil((new Date(it.match.application_deadline).getTime() - Date.now()) / 86400000)
            : null;
          const dl =
            !it.match?.application_deadline ? null
            : days! <= 0 ? "Closed"
            : days! <= 30 ? `${days} days`
            : days! <= 90 ? `${days} days`
            : `${Math.ceil(days! / 30)} months`;
          const dlClass =
            !it.match?.application_deadline ? "text-muted-foreground"
            : days! <= 30 ? "text-destructive"
            : days! <= 90 ? "text-warning"
            : "text-muted-foreground";
          const isLinked = !!it.match;
          const Wrapper = isLinked ? "button" : "div";

          return (
            <Wrapper
              key={i}
              {...(isLinked ? { onClick: onOpenDiscover, type: "button" as const } : {})}
              className={`group relative w-full text-left bg-card border border-border rounded-xl px-5 py-4 overflow-hidden transition-all ${
                isLinked ? "hover:border-gold/40 hover:shadow-sm cursor-pointer" : ""
              }`}
            >
              <div className="absolute left-0 inset-y-0 w-[2px] bg-gold-dark/60" />
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <h4 className="font-heading font-semibold text-[15px] text-foreground tracking-tight leading-snug min-w-0 truncate group-hover:text-gold-dark transition-colors">
                  {it.name}
                </h4>
                {it.match && (
                  <div className="flex items-center gap-3 text-[11px] tabular-nums shrink-0">
                    {it.match.estimated_total_value_usd ? (
                      <span className="text-gold-dark font-semibold">{fmtMoney(it.match.estimated_total_value_usd)}</span>
                    ) : null}
                    {dl && (
                      <span className={`font-semibold ${dlClass}`}>{dl}</span>
                    )}
                  </div>
                )}
              </div>
              {it.detail && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {renderInline(it.detail)}
                </p>
              )}
              {isLinked && (
                <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mt-2 group-hover:text-gold-dark transition-colors">
                  {isRu ? "Открыть в Discover" : "Open in Discover"} <ArrowRight className="w-3 h-3" />
                </div>
              )}
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Section-aware renderer ───────────────────────────────────────────
   Splits the streaming markdown by ## headings. Routes specific sections
   (action plan, university shortlist, funding pathway) to custom
   renderers; everything else renders as standard markdown. */
/* ─── Essay angles → narrative cards ──────────────────────────────────
   The AI generates 3 distinct essay angles, each with a concept + why-it-
   differentiates + anchor story. Renders as 3 numbered narrative cards
   instead of a flat bulleted list, so each angle reads as a real
   strategic option the student can pick from. */
const EssayAngles = ({ markdown, isRu }: { markdown: string; isRu: boolean }) => {
  const { title, angles } = useMemo(() => {
    const lines = markdown.split("\n");
    let title = "";
    const angles: { concept: string; body: string[] }[] = [];
    let cur: typeof angles[number] | null = null;
    let pendingBody: string[] = [];

    const startAngle = (concept: string) => {
      if (cur && pendingBody.length) cur.body = pendingBody.slice();
      pendingBody = [];
      cur = { concept: concept.trim().replace(/^\*+|\*+$/g, ""), body: [] };
      angles.push(cur);
    };
    const finishCurrent = () => {
      if (cur && pendingBody.length) {
        cur.body = pendingBody.slice();
        pendingBody = [];
      }
    };

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) { continue; }
      if (line.startsWith("## ")) {
        title = line.slice(3).trim();
      } else if (line.startsWith("### ")) {
        finishCurrent();
        startAngle(line.slice(4).trim());
      } else if (/^\*\*([^*]+)\*\*\s*[:.—–-]?\s*$/.test(line)) {
        // Standalone bold heading-like line — treat as a new angle title
        finishCurrent();
        const m = line.match(/^\*\*([^*]+)\*\*/);
        if (m) startAngle(m[1]);
      } else if (/^(\d+\.)\s+\*\*/.test(line)) {
        // "1. **Concept**: rest..." style
        finishCurrent();
        const m = line.match(/^\d+\.\s+\*\*([^*]+)\*\*\s*[:.—–-]?\s*(.*)$/);
        if (m) {
          startAngle(m[1]);
          if (m[2]) pendingBody.push(m[2].trim());
        }
      } else if (/^[-*]\s+/.test(line) && cur) {
        pendingBody.push(line.replace(/^[-*]\s+/, "").trim());
      } else if (cur) {
        pendingBody.push(line);
      }
    }
    finishCurrent();

    // Filter out empty angles, cap at 3
    return { title, angles: angles.filter(a => a.concept && a.body.length > 0).slice(0, 3) };
  }, [markdown]);

  if (angles.length === 0) return null;

  return (
    <div className="not-prose my-10">
      <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-1">
        {title || (isRu ? "Три угла для эссе" : "Three essay angles")}
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        {isRu
          ? "Три различных нарратива, которые вы можете развить. Каждый — реальный стратегический выбор."
          : "Three distinct narratives you could lead with. Each is a real strategic choice."}
      </p>
      <div className="grid md:grid-cols-3 gap-3">
        {angles.map((a, i) => (
          <div
            key={i}
            className="relative bg-card border border-border rounded-xl p-5 overflow-hidden flex flex-col"
          >
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gold-dark/50" />
            <div className="flex items-center gap-2 mb-3">
              <span className="h-6 w-6 rounded-full bg-gold-dark/10 text-gold-dark text-[11px] font-semibold flex items-center justify-center">
                {i + 1}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {isRu ? "Угол" : "Angle"}
              </span>
            </div>
            <h4 className="font-heading font-semibold text-base text-foreground tracking-tight leading-snug mb-3">
              {a.concept}
            </h4>
            <div className="space-y-2 text-xs text-muted-foreground leading-relaxed flex-1">
              {a.body.map((b, j) => (
                <p key={j}>{renderInline(b)}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Honest gaps → severity-coded action cards ───────────────────────
   The AI lists 1-3 specific weaknesses with concrete steps. Each becomes
   a card with a severity strip (red/amber/blue) auto-detected from the
   gap text + an "Action" footer that pulls out the action-step bullet
   if the AI distinguished it. */
const HonestGaps = ({ markdown, isRu }: { markdown: string; isRu: boolean }) => {
  const { title, gaps } = useMemo(() => {
    const lines = markdown.split("\n");
    let title = "";
    const gaps: { headline: string; body: string[]; action: string }[] = [];
    let cur: typeof gaps[number] | null = null;
    let pendingBody: string[] = [];

    const finish = () => {
      if (cur) {
        cur.body = pendingBody.slice();
        pendingBody = [];
      }
    };
    const start = (headline: string) => {
      finish();
      cur = { headline: headline.trim().replace(/^\*+|\*+$/g, "").trim(), body: [], action: "" };
      gaps.push(cur);
    };

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      if (line.startsWith("## ")) {
        title = line.slice(3).trim();
      } else if (line.startsWith("### ")) {
        start(line.slice(4).trim());
      } else if (/^(\d+\.)\s+\*\*/.test(line)) {
        const m = line.match(/^\d+\.\s+\*\*([^*]+)\*\*\s*[:.—–-]?\s*(.*)$/);
        if (m) {
          start(m[1]);
          if (m[2]) pendingBody.push(m[2].trim());
        }
      } else if (/^(\d+\.)\s+/.test(line)) {
        start(line.replace(/^\d+\.\s+/, ""));
      } else if (/^[-*]\s+\*\*/.test(line)) {
        const m = line.match(/^[-*]\s+\*\*([^*]+)\*\*\s*[:.—–-]?\s*(.*)$/);
        if (m) {
          start(m[1]);
          if (m[2]) pendingBody.push(m[2].trim());
        }
      } else if (/^[-*]\s+/.test(line) && cur) {
        pendingBody.push(line.replace(/^[-*]\s+/, "").trim());
      } else if (cur) {
        pendingBody.push(line);
      }
    }
    finish();

    // Pull out an action bullet if one of the body lines starts with
    // "Action:" / "Plan:" / "Next:" — promote it to the action footer.
    const actionRegex = /^(action|plan|next step|next|to do|fix|шаг|план|действие)\s*[:—–-]\s*(.+)$/i;
    return {
      title,
      gaps: gaps.map(g => {
        const idx = g.body.findIndex(b => actionRegex.test(b));
        if (idx >= 0) {
          const m = g.body[idx].match(actionRegex);
          return {
            ...g,
            body: g.body.filter((_, i) => i !== idx),
            action: m?.[2]?.trim() || "",
          };
        }
        return g;
      }).filter(g => g.headline),
    };
  }, [markdown]);

  if (gaps.length === 0) return null;

  // Severity heuristic: if the gap text mentions tests/scores/GPA → high (red),
  // language/IELTS → medium (amber), everything else → low (navy/info).
  const severityFor = (g: { headline: string; body: string[] }) => {
    const blob = (g.headline + " " + g.body.join(" ")).toLowerCase();
    if (/gpa|sat|act|gre|gmat|score|test|exam|fail/.test(blob))
      return { strip: "bg-destructive", label: isRu ? "Высокий приоритет" : "High priority", labelClass: "text-destructive" };
    if (/ielts|toefl|english|language|essay|writing|portfolio|extracurricular/.test(blob))
      return { strip: "bg-amber-500", label: isRu ? "Средний приоритет" : "Medium priority", labelClass: "text-amber-600 dark:text-amber-500" };
    return { strip: "bg-primary", label: isRu ? "Стоит закрыть" : "Worth closing", labelClass: "text-primary" };
  };

  return (
    <div className="not-prose my-10">
      <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-1">
        {title || (isRu ? "Где честно недотягиваете" : "Honest gaps to close")}
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        {isRu
          ? "Никакой сахарной пудры — это слабые места, которые читают приёмные комиссии. И что с ними делать."
          : "No softening — these are the weak spots admissions readers will see, and what to do about each."}
      </p>
      <div className="space-y-3">
        {gaps.map((g, i) => {
          const sev = severityFor(g);
          return (
            <div
              key={i}
              className="relative bg-card border border-border rounded-xl pl-5 pr-5 py-4 overflow-hidden"
            >
              <div className={`absolute left-0 inset-y-0 w-[3px] ${sev.strip}`} />
              <div className="flex items-baseline justify-between gap-3 mb-1.5">
                <h4 className="font-heading font-semibold text-[15px] text-foreground tracking-tight leading-snug">
                  {g.headline}
                </h4>
                <span className={`text-[10px] font-semibold uppercase tracking-[0.18em] shrink-0 ${sev.labelClass}`}>
                  {sev.label}
                </span>
              </div>
              {g.body.length > 0 && (
                <div className="space-y-1.5 text-xs text-muted-foreground leading-relaxed">
                  {g.body.map((b, j) => (
                    <p key={j}>{renderInline(b)}</p>
                  ))}
                </div>
              )}
              {g.action && (
                <div className="mt-3 pt-3 border-t border-border/60 flex items-start gap-2">
                  <Zap className="w-3.5 h-3.5 text-gold-dark mt-0.5 shrink-0" />
                  <p className="text-xs font-medium text-foreground leading-relaxed">
                    {renderInline(g.action)}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Strategic positioning → executive brief + 30-day call pull-quote ──
   Renders the report's opening section as an editorial brief: heading +
   body paragraphs in serif, and the explicitly-marked "**Your 30-day
   call:** …" line lifted out into a gold-bordered pull-quote. Falls
   back to plain markdown if the call marker isn't present (e.g. legacy
   reports generated before the prompt update). */
const StrategicPositioning = ({ markdown, isRu }: { markdown: string; isRu: boolean }) => {
  const { title, body, call } = useMemo(() => {
    const lines = markdown.split("\n");
    let title = "";
    const bodyLines: string[] = [];
    let call = "";
    const callRegex = /^\*\*\s*(your 30-day call|30-day call|ваш стратегический шаг|стратегический шаг|30-дневный шаг)\s*[:.]?\*\*\s*(.+)$/i;
    const altCallRegex = /^\s*(your 30-day call|30-day call|ваш стратегический шаг)\s*[:.]\s*(.+)$/i;
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) { bodyLines.push(""); continue; }
      if (line.startsWith("## ")) {
        title = line.slice(3).trim();
        continue;
      }
      const m = line.match(callRegex) || line.match(altCallRegex);
      if (m && !call) {
        call = m[2].trim().replace(/\*+/g, "");
      } else {
        bodyLines.push(line);
      }
    }
    // Trim trailing blanks
    while (bodyLines.length && bodyLines[bodyLines.length - 1] === "") bodyLines.pop();
    return { title, body: bodyLines.join("\n").trim(), call };
  }, [markdown]);

  if (!body && !call) return null;

  return (
    <div className="not-prose my-10">
      <div className="flex items-center gap-2 mb-3">
        <span className="h-px w-8 bg-gold-dark" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark">
          {isRu ? "Стратегический брифинг" : "Strategic brief"}
        </span>
      </div>
      <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-4 leading-tight">
        {title || (isRu ? "Стратегическое позиционирование" : "Strategic positioning")}
      </h2>
      {body && (
        <div className="prose prose-sm sm:prose-base max-w-none text-foreground/90 [&_p]:leading-relaxed [&_p]:mb-3">
          <ReactMarkdown>{body}</ReactMarkdown>
        </div>
      )}
      {call && (
        <div className="mt-6 relative bg-gradient-to-br from-gold-light/10 to-card border-l-[3px] border-gold-dark rounded-r-xl rounded-l-sm p-5 sm:p-6">
          <div className="flex items-center gap-1.5 mb-2">
            <Quote className="w-4 h-4 text-gold-dark" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-dark">
              {isRu ? "Ваш шаг на 30 дней" : "Your 30-day call"}
            </span>
          </div>
          <p className="font-heading text-lg sm:text-xl leading-snug text-foreground tracking-tight">
            {renderInline(call)}
          </p>
        </div>
      )}
    </div>
  );
};

const PATHWAY_POS_SECTION_REGEX = /^##\s+.*?(strategic positioning|positioning|стратегическое позиционирование|позиционирование)/i;
const PATHWAY_PLAN_SECTION_REGEX = /^##\s+.*?(action plan|90.day|план действий)/i;
const PATHWAY_UNIS_SECTION_REGEX = /^##\s+.*?(university shortlist|your university|шорт.лист университетов)/i;
const PATHWAY_FUND_SECTION_REGEX = /^##\s+.*?(funding pathway|funding deep|финансирование|стипендии)/i;
const PATHWAY_ESSAYS_SECTION_REGEX = /^##\s+.*?(essay angle|essay angles|углов? для эссе|эссе)/i;
const PATHWAY_GAPS_SECTION_REGEX = /^##\s+.*?(honest gap|gaps to close|пробел|недотяг|слабые)/i;

const ReportRenderer = ({ markdown, completedTasks, onToggle, taskKey, isRu, onOpenDiscover, liveMatches }: {
  markdown: string;
  completedTasks: Set<string>;
  onToggle: (id: string) => void;
  taskKey: (text: string) => string;
  isRu: boolean;
  onOpenDiscover: () => void;
  liveMatches: LiveMatchLite[];
}) => {
  const sections = useMemo(() => {
    if (!markdown.trim()) return [] as string[];
    return markdown.split(/(?=^##\s+)/m).filter(s => s.trim().length > 0);
  }, [markdown]);

  if (sections.length === 0) return null;

  return (
    <>
      {sections.map((section, i) => {
        if (PATHWAY_POS_SECTION_REGEX.test(section)) {
          // Stream-safe: render once we have at least one body line beyond the heading
          const hasBody = section.split("\n").slice(1).join("\n").trim().length > 30;
          if (hasBody) {
            return <StrategicPositioning key={i} markdown={section} isRu={isRu} />;
          }
        }
        if (PATHWAY_PLAN_SECTION_REGEX.test(section)) {
          return <InteractiveActionPlanOrFallback
            key={i} markdown={section} completedTasks={completedTasks}
            onToggle={onToggle} taskKey={taskKey} isRu={isRu}
          />;
        }
        if (PATHWAY_UNIS_SECTION_REGEX.test(section)) {
          const hasBuckets = /^###\s+/m.test(section);
          if (hasBuckets) {
            return <UniversityShortlist key={i} markdown={section} isRu={isRu} onOpenDiscover={onOpenDiscover} />;
          }
        }
        if (PATHWAY_FUND_SECTION_REGEX.test(section)) {
          // Stream-safe: only flip once the AI has produced at least one bullet
          const hasBullets = /^\s*([-*]|\d+\.)\s+/m.test(section);
          if (hasBullets) {
            return <FundingShortlist key={i} markdown={section} liveMatches={liveMatches} isRu={isRu} onOpenDiscover={onOpenDiscover} />;
          }
        }
        if (PATHWAY_ESSAYS_SECTION_REGEX.test(section)) {
          // Stream-safe: only flip once we have something to render
          const hasContent = /^\s*([-*]|\d+\.|\#)\s+/m.test(section.split("\n").slice(1).join("\n"));
          if (hasContent) {
            return <EssayAngles key={i} markdown={section} isRu={isRu} />;
          }
        }
        if (PATHWAY_GAPS_SECTION_REGEX.test(section)) {
          const hasContent = /^\s*([-*]|\d+\.|\#)\s+/m.test(section.split("\n").slice(1).join("\n"));
          if (hasContent) {
            return <HonestGaps key={i} markdown={section} isRu={isRu} />;
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

/* ─── Analysis progress — substantive loading state ───────────────────
   Replaces the generic spinner the user used to see in the few seconds
   before the AI's first stream chunk arrived. Steps tick through with
   checkmarks at staggered intervals, so the wait feels like real work
   is happening, not like the page is hung. */
const AnalysisProgress = ({ profile, isRu }: {
  profile: { fullName?: string; targetCountries?: string[] };
  isRu: boolean;
}) => {
  const t = (en: string, ru: string) => (isRu ? ru : en);
  const countryList = (profile.targetCountries || []).slice(0, 2).join(", ");
  const steps = useMemo(() => [
    t("Reading your academic profile and targets", "Читаем ваш профиль и цели"),
    countryList
      ? t(`Cross-referencing universities in ${countryList}`, `Сопоставляем университеты в ${countryList}`)
      : t("Cross-referencing universities globally", "Сопоставляем университеты по всему миру"),
    t("Pulling matched scholarships from our database", "Подбираем стипендии из нашей базы"),
    t("Drafting your strategic brief", "Готовим стратегический брифинг"),
  ], [countryList, isRu]);

  const [done, setDone] = useState(0);
  useEffect(() => {
    setDone(0);
    const intervals: ReturnType<typeof setTimeout>[] = [];
    // Tick steps at 800ms, 1800ms, 3000ms, 4500ms — enough that the
    // first stream chunk usually arrives by step 3 or 4.
    [800, 1800, 3000, 4500].forEach((ms, i) => {
      intervals.push(setTimeout(() => setDone(i + 1), ms));
    });
    return () => intervals.forEach(clearTimeout);
  }, []);

  return (
    <div className="py-12 px-4 max-w-md mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <span className="h-px w-8 bg-gold-dark" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark">
          {t("Working", "Идёт работа")}
        </span>
      </div>
      <h3 className="font-heading text-xl font-bold text-foreground tracking-tight mb-1">
        {t("Building your strategic brief", "Готовим ваш стратегический брифинг")}
      </h3>
      <p className="text-xs text-muted-foreground mb-6">
        {t("Usually takes 20–40 seconds. Stay on this page.",
           "Обычно 20–40 секунд. Не закрывайте страницу.")}
      </p>
      <ul className="space-y-2.5">
        {steps.map((label, i) => {
          const isDone = i < done;
          const isCurrent = i === done;
          return (
            <li key={i} className="flex items-center gap-3 text-sm">
              <span className={`shrink-0 h-5 w-5 rounded-full flex items-center justify-center border transition-all ${
                isDone
                  ? "bg-gold-dark border-gold-dark text-white"
                  : isCurrent
                    ? "border-gold-dark/60 bg-gold-light/10"
                    : "border-border bg-card"
              }`}>
                {isDone ? <Check className="w-3 h-3" strokeWidth={3} />
                  : isCurrent ? <Loader2 className="w-3 h-3 animate-spin text-gold-dark" />
                  : <span className="text-[10px] text-muted-foreground/60 tabular-nums">{i + 1}</span>}
              </span>
              <span className={`leading-snug transition-colors ${
                isDone ? "text-foreground" : isCurrent ? "text-foreground font-medium" : "text-muted-foreground"
              }`}>{label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const TopUniDashboard = ({ profile, language, onBack }: TopUniDashboardProps) => {
  const isRu = language === "ru";
  const t = (en: string, ru: string) => isRu ? ru : en;
  const navigate = useNavigate();

  // Pathway state — persisted to localStorage so the user sees the SAME
  // report on every visit (vs a fresh generation each time), which keeps
  // their action-plan checkbox progress aligned to stable wording. Keyed
  // by a profile hash so editing the profile invalidates the stored report.
  const profileHash = useMemo(() => {
    const fingerprint = JSON.stringify({
      n: profile.fullName, g: profile.gpa, i: profile.ielts, s: profile.sat,
      m: profile.major, c: profile.targetCountries, b: profile.budget,
      lang: language,
    });
    let h = 0;
    for (let i = 0; i < fingerprint.length; i++) h = ((h << 5) - h + fingerprint.charCodeAt(i)) | 0;
    return `p${h.toString(36)}`;
  }, [profile.fullName, profile.gpa, profile.ielts, profile.sat, profile.major, profile.targetCountries?.join(","), profile.budget, language]);

  const PATHWAY_STORAGE_KEY = "topuni-pathway-cache";

  const restored = useMemo(() => {
    try {
      const raw = localStorage.getItem(PATHWAY_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.hash === profileHash && typeof parsed.content === "string" && parsed.content.length > 100) {
        return parsed.content as string;
      }
    } catch { /* ignore */ }
    return null;
  }, [profileHash]);

  const [pathwayContent, setPathwayContent] = useState<string>(restored ?? "");
  const [pathwayLoading, setPathwayLoading] = useState(false);
  const [pathwayGenerated, setPathwayGenerated] = useState<boolean>(!!restored);

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

  // Chat state — persisted to localStorage so the conversation survives reloads.
  const [chatMessages, setChatMessages] = useState<Msg[]>(() => {
    try {
      const raw = localStorage.getItem("topuni-chat-history");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const chatTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
    try { localStorage.setItem("topuni-chat-history", JSON.stringify(chatMessages)); } catch { /* ignore */ }
  }, [chatMessages]);

  // Auto-grow the textarea as the user types, capped at ~5 lines.
  useEffect(() => {
    const el = chatTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }, [chatInput]);

  const clearChat = () => {
    setChatMessages([]);
    try { localStorage.removeItem("topuni-chat-history"); } catch { /* ignore */ }
  };

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
      () => {
        setPathwayLoading(false);
        setPathwayGenerated(true);
        // Persist the completed report keyed by current profile hash, so
        // subsequent visits restore the same text and the action-plan
        // checkboxes (keyed by text hash) line up.
        try {
          if (soFar && soFar.length > 100) {
            localStorage.setItem(PATHWAY_STORAGE_KEY, JSON.stringify({
              hash: profileHash,
              content: soFar,
              generatedAt: Date.now(),
            }));
          }
        } catch { /* ignore */ }
      }
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

    // Hand the chat function the profile + a slim summary of the student's
    // strategy report so the counselor can answer with specifics instead of
    // asking the student to repeat themselves.
    const reportSummary = pathwayContent
      ? pathwayContent.slice(0, 4000)
      : "";

    await streamSSE(
      CHAT_URL,
      { messages: allMessages, language, profile, reportSummary },
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
                <AnalysisProgress profile={profile} isRu={isRu} />
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
                    liveMatches={liveMatches}
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

        {/* AI COUNSELOR TAB ───────────────────────────────────────────────
            A two-pane layout: profile-aware suggestion rail on the left,
            scrollable transcript on the right with persistent localStorage
            history. Suggestions are profile-aware (refer to the student's
            target country and major when present) so the chat feels like a
            real follow-up to the strategy report rather than a blank-slate
            ChatGPT clone. */}
        <TabsContent value="counselor">
          {(() => {
            const firstName = isProfileFilled ? profile.fullName.split(" ")[0] : "";
            const targetCountry = profile.targetCountries[0] || "";
            const major = profile.major || "";
            const referProfile = isProfileFilled && (targetCountry || major);

            const promptGroups: { label: string; icon: React.ReactNode; prompts: string[] }[] = isRu
              ? [
                  { label: "Стратегия", icon: <Compass className="w-3.5 h-3.5" />, prompts: [
                    referProfile && targetCountry
                      ? `Учитывая мой профиль, какие 5 университетов в ${targetCountry} мне стоит рассмотреть?`
                      : `Какие университеты соответствуют моему профилю?`,
                    `Каковы реальные шансы на поступление с моим GPA ${profile.gpa || "?"}?`,
                    `На что мне стоит сосредоточиться в ближайший месяц?`,
                  ]},
                  { label: "Эссе", icon: <PenLine className="w-3.5 h-3.5" />, prompts: [
                    `Помогите мне найти угол для мотивационного письма.`,
                    `Какие три истории из моего опыта стоит использовать в эссе?`,
                    `Дайте обратную связь по черновику моего personal statement.`,
                  ]},
                  { label: "Финансирование", icon: <Wallet className="w-3.5 h-3.5" />, prompts: [
                    targetCountry
                      ? `Какие стипендии в ${targetCountry} с полным покрытием стоит подать?`
                      : `Какие стипендии с полным покрытием стоит подать?`,
                    `Как объяснить финансовые потребности в эссе?`,
                    `Что такое need-blind и как это влияет на мою стратегию?`,
                  ]},
                  { label: "Тесты", icon: <FileText className="w-3.5 h-3.5" />, prompts: [
                    `Составьте план подготовки к IELTS на 8 недель.`,
                    `Какой балл SAT нужен для топ-30 университетов США?`,
                    `Стоит ли пересдавать тест с моим текущим баллом?`,
                  ]},
                  { label: "Виза", icon: <Plane className="w-3.5 h-3.5" />, prompts: [
                    `Какие документы нужны для студенческой визы?`,
                    `Что чаще всего приводит к отказу в визе?`,
                    `Когда лучше всего подавать заявление на визу?`,
                  ]},
                ]
              : [
                  { label: "Strategy", icon: <Compass className="w-3.5 h-3.5" />, prompts: [
                    referProfile && targetCountry
                      ? `Given my profile, what 5 universities in ${targetCountry} should I look at?`
                      : `What universities best match my profile?`,
                    `What are my realistic chances with a GPA of ${profile.gpa || "my current numbers"}?`,
                    referProfile && major
                      ? `What's the strongest path into a top ${major} program?`
                      : `What should I prioritize this month?`,
                  ]},
                  { label: "Essays", icon: <PenLine className="w-3.5 h-3.5" />, prompts: [
                    `Help me find the strongest angle for my personal statement.`,
                    `What three stories from my background should I lean on in essays?`,
                    `Give me critical feedback on a draft I'll paste in.`,
                  ]},
                  { label: "Funding", icon: <Wallet className="w-3.5 h-3.5" />, prompts: [
                    targetCountry
                      ? `Which fully-funded scholarships in ${targetCountry} should I apply to?`
                      : `Which fully-funded scholarships fit my profile?`,
                    `How do I explain financial need in my application?`,
                    `What does need-blind admission mean for my strategy?`,
                  ]},
                  { label: "Tests", icon: <FileText className="w-3.5 h-3.5" />, prompts: [
                    `Build me an 8-week IELTS prep plan.`,
                    `What SAT score do I need for the top-30 US universities?`,
                    `Should I retake my test with my current score?`,
                  ]},
                  { label: "Visa", icon: <Plane className="w-3.5 h-3.5" />, prompts: [
                    `What documents do I need for a student visa?`,
                    `What are the most common reasons for visa rejection?`,
                    `When is the best time to apply for my visa?`,
                  ]},
                ];

            return (
              <div className="grid lg:grid-cols-[280px_1fr] gap-6">
                {/* LEFT RAIL — categorized prompts ─────────────────────── */}
                <aside className="hidden lg:block">
                  <div className="sticky top-6 space-y-5">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold mb-2">
                        {t("Start a thread", "Начать диалог")}
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {t("Tap a prompt to send it, or type your own. Your conversation is saved.",
                           "Нажмите подсказку или напишите свой вопрос. Диалог сохраняется.")}
                      </p>
                    </div>
                    <div className="space-y-4">
                      {promptGroups.map((g) => (
                        <div key={g.label}>
                          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-foreground font-semibold mb-1.5">
                            <span className="text-accent">{g.icon}</span>
                            {g.label}
                          </div>
                          <div className="space-y-1">
                            {g.prompts.map((p, i) => (
                              <button
                                key={i}
                                onClick={() => sendChatMessage(p)}
                                disabled={chatLoading}
                                className="block w-full text-left text-xs leading-snug px-2 py-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-50"
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </aside>

                {/* MAIN CHAT ──────────────────────────────────────────── */}
                <Card className="h-[640px] flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border shrink-0 bg-card">
                    <div className="flex items-center gap-2.5">
                      <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Bot className="w-4 h-4" />
                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-foreground leading-tight">
                          {t("AI Counselor", "AI Советник")}
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-tight">
                          {t("Trained on Yale, Cambridge & Harvard admissions experience",
                             "Обучен на опыте поступления в Йель, Кембридж и Гарвард")}
                        </p>
                      </div>
                    </div>
                    {chatMessages.length > 0 && (
                      <button
                        onClick={clearChat}
                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        title={t("Clear conversation", "Очистить диалог")}
                      >
                        <RotateCcw className="w-3 h-3" /> {t("New thread", "Новый диалог")}
                      </button>
                    )}
                  </div>

                  <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
                    {chatMessages.length === 0 ? (
                      <div className="h-full flex flex-col">
                        {/* Editorial empty state — feels like walking into an office, not a chatbot. */}
                        <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto">
                          <div className="h-12 w-12 rounded-full bg-primary/5 flex items-center justify-center mb-4 ring-1 ring-primary/15">
                            <Bot className="w-5 h-5 text-primary" />
                          </div>
                          <h3 className="font-heading text-xl text-foreground mb-1.5">
                            {firstName
                              ? t(`Hi ${firstName}.`, `Привет, ${firstName}.`)
                              : t("Welcome.", "Добро пожаловать.")}
                          </h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {referProfile
                              ? t(`I have your profile and your strategy report in front of me. Ask me anything — applications, essays, funding, tests, visa.`,
                                  `У меня уже есть ваш профиль и стратегический отчёт. Задайте любой вопрос — заявки, эссе, финансирование, тесты, виза.`)
                              : t("Ask me anything about applications, essays, scholarships, tests, or visas. Complete your profile for tailored answers.",
                                  "Спросите о заявках, эссе, стипендиях, тестах или визах. Заполните профиль для персональных ответов.")}
                          </p>
                          {!isProfileFilled && (
                            <Button variant="gold" size="sm" onClick={onBack} className="mt-4">
                              <Sparkles className="w-4 h-4 mr-1" /> {t("Build my profile", "Заполнить профиль")}
                            </Button>
                          )}
                        </div>
                        {/* Mobile: show grouped prompts inline since the left rail is hidden */}
                        <div className="lg:hidden mt-6 space-y-3">
                          {promptGroups.slice(0, 3).map((g) => (
                            <div key={g.label}>
                              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-foreground font-semibold mb-1.5">
                                <span className="text-accent">{g.icon}</span>
                                {g.label}
                              </div>
                              <div className="grid grid-cols-1 gap-1.5">
                                {g.prompts.slice(0, 2).map((p, i) => (
                                  <button
                                    key={i}
                                    onClick={() => sendChatMessage(p)}
                                    disabled={chatLoading}
                                    className="text-left text-xs leading-snug px-3 py-2 rounded-md border border-border hover:border-accent/40 hover:bg-accent/5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                                  >
                                    {p}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        {chatMessages.map((msg, i) => (
                          <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                            <div className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                              msg.role === "user"
                                ? "bg-muted text-foreground"
                                : "bg-primary text-primary-foreground"
                            }`}>
                              {msg.role === "user"
                                ? (firstName ? firstName[0]?.toUpperCase() : "Y")
                                : <Bot className="w-3.5 h-3.5" />}
                            </div>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                              msg.role === "user"
                                ? "bg-primary text-primary-foreground rounded-tr-sm"
                                : "bg-muted/60 text-foreground rounded-tl-sm"
                            }`}>
                              {msg.role === "assistant" ? (
                                <div className="prose prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_strong]:text-foreground [&_a]:text-accent">
                                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                                </div>
                              ) : <span className="whitespace-pre-wrap">{msg.content}</span>}
                            </div>
                          </div>
                        ))}
                        {chatLoading && chatMessages[chatMessages.length - 1]?.role === "user" && (
                          <div className="flex gap-2.5">
                            <div className="shrink-0 h-7 w-7 rounded-full flex items-center justify-center bg-primary text-primary-foreground">
                              <Bot className="w-3.5 h-3.5" />
                            </div>
                            <div className="bg-muted/60 rounded-2xl rounded-tl-sm px-4 py-3">
                              <div className="flex gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" />
                                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0.15s" }} />
                                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0.3s" }} />
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="border-t border-border p-3 shrink-0 bg-card">
                    <form
                      onSubmit={(e) => { e.preventDefault(); sendChatMessage(chatInput); }}
                      className="flex items-end gap-2 rounded-xl border border-border bg-background focus-within:border-accent/40 focus-within:ring-2 focus-within:ring-accent/15 transition-all px-3 py-2"
                    >
                      <textarea
                        ref={chatTextareaRef}
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendChatMessage(chatInput);
                          }
                        }}
                        placeholder={isRu ? "Задайте вопрос... (Shift+Enter — новая строка)" : "Ask anything... (Shift+Enter for newline)"}
                        rows={1}
                        disabled={chatLoading}
                        className="flex-1 resize-none bg-transparent border-0 outline-none text-sm leading-relaxed placeholder:text-muted-foreground/70 disabled:opacity-50 max-h-[140px]"
                      />
                      <Button type="submit" size="icon" variant="gold" disabled={chatLoading || !chatInput.trim()} className="h-8 w-8 shrink-0">
                        <Send className="w-3.5 h-3.5" />
                      </Button>
                    </form>
                    <p className="text-[10px] text-muted-foreground/70 mt-1.5 px-1">
                      {t("Counselor uses your profile and report for context. Always sanity-check critical dates.",
                         "Советник использует ваш профиль и отчёт. Всегда перепроверяйте важные даты.")}
                    </p>
                  </div>
                </Card>
              </div>
            );
          })()}
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default TopUniDashboard;
