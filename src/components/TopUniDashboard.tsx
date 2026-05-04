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
  Search, ArrowRight, BookOpen, ExternalLink, Calendar, Zap,
  RotateCcw, Compass, PenLine, Wallet, FileText, Plane,
  Lightbulb, AlertTriangle, Quote, Check,
  Share2, Copy, Mail,
  Crown, Bookmark, BookmarkCheck,
  RefreshCw,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { SaveBriefPrompt } from "@/components/topuni/SaveBriefPrompt";
import { DocumentManager } from "@/components/topuni/DocumentManager";
import { CounselorSessions } from "@/components/topuni/CounselorSessions";
import { GenerationPipeline } from "@/components/GenerationPipeline";
import { EnrichedMarkdown, FocusScholarshipContext } from "@/components/EnrichedMarkdown";
import { ProBriefUnlock, type ProBriefDepth } from "@/components/ProBriefUnlock";
import { PremiumGate } from "@/components/PremiumGate";
import { BriefHeroStats } from "@/components/brief/BriefHeroStats";
import { BriefChapterNav } from "@/components/brief/BriefChapterNav";
import { BriefMasthead } from "@/components/brief/BriefMasthead";
import { ProSectionsTeaser } from "@/components/brief/ProSectionsTeaser";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { SavedDeadlineBanner } from "@/components/SavedDeadlineBanner";
import { DeadlineTimeline } from "@/components/brief/DeadlineTimeline";
import { FundingStack } from "@/components/brief/FundingStack";
import { PremiumSection } from "@/components/brief/PremiumSection";
import { CombinedFundingChart } from "@/components/brief/CombinedFundingChart";
import { useApplicationTracker } from "@/hooks/useApplicationTracker";
import { track } from "@/lib/analytics";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
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
  // Optional depth fields (Step 4 of the wizard) — empty strings when skipped.
  topActivity?: string;
  personalStory?: string;
  namedSchools?: string;
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
/** Light fuzzy scholarship-name detector used by action-item rendering.
 *  Strips suffixes like "Scholarship(s)", "Fellowship", "Program", "Scholars"
 *  before comparing — matches "Apply to Chevening" against "Chevening Scholarships". */
const detectScholarshipInText = (
  text: string,
  pool: { scholarship_id: string; scholarship_name: string }[],
): { scholarship_id: string; scholarship_name: string } | null => {
  if (!text || pool.length === 0) return null;
  const norm = (s: string) => s.toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s*(scholarships?|fellowship|program|scholars|award|grant)\b/g, "")
    .trim();
  const haystack = ` ${norm(text)} `;
  for (const s of pool) {
    const needle = norm(s.scholarship_name);
    if (needle.length < 4) continue;
    if (haystack.includes(` ${needle} `) || haystack.includes(` ${needle}.`) || haystack.includes(` ${needle},`)) {
      return s;
    }
  }
  return null;
};

const InteractiveActionPlan = ({ markdown, completedTasks, onToggle, taskKey, isRu, liveMatches, onSaveScholarship, savedSet, tier = "premium" }: {
  markdown: string;
  completedTasks: Set<string>;
  onToggle: (id: string) => void;
  taskKey: (text: string) => string;
  isRu: boolean;
  liveMatches?: { scholarship_id: string; scholarship_name: string }[];
  onSaveScholarship?: (id: string, name: string) => void;
  savedSet?: Set<string>;
  /** When 'basic', Weeks 3-12 of the action plan are blurred behind a
   *  Pro upgrade gate. */
  tier?: "basic" | "premium";
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

      {(() => {
        const renderBlock = (b: typeof blocks[number], sIdx: number) => {
          const blockKeys = b.items.map(i => taskKey(i));
          const blockDone = blockKeys.filter(k => completedTasks.has(k)).length;
          return (
            <div key={`week-${sIdx}`}>
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
                  const detected = detectScholarshipInText(text, liveMatches ?? []);
                  const isSaved = detected ? savedSet?.has(detected.scholarship_id) : false;
                  return (
                    <div key={iIdx} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                      <label className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer">
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
                      {detected && onSaveScholarship && (
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSaveScholarship(detected.scholarship_id, detected.scholarship_name); }}
                          aria-label={isSaved ? `${detected.scholarship_name} saved to your pipeline` : `Save ${detected.scholarship_name} to your pipeline`}
                          title={isSaved ? "Saved · click to remove" : `Save ${detected.scholarship_name} to your pipeline`}
                          className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] px-2 py-1 rounded-md border transition-colors ${
                            isSaved
                              ? "bg-gold/15 text-gold-dark border-gold/40 hover:bg-gold/25"
                              : "bg-card text-muted-foreground border-border hover:text-gold-dark hover:border-gold/40 hover:bg-gold/5"
                          }`}
                        >
                          {isSaved ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
                          {isSaved ? (isRu ? "сохр." : "saved") : (isRu ? "сохранить" : "save")}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        };

        // Premium gate: basic-tier briefs see Weeks 1-2 in full + the rest
        // (Weeks 3-12) blurred behind an upgrade card. Premium tier sees
        // everything as before.
        const visibleBlocks = tier === "basic" ? blocks.slice(0, 1) : blocks;
        const gatedBlocks = tier === "basic" ? blocks.slice(1) : [];
        return (
          <>
            <div className="space-y-6">
              {visibleBlocks.map((b, i) => renderBlock(b, i))}
            </div>
            {gatedBlocks.length > 0 && (
              <div className="mt-6">
                <PremiumGate
                  gateId="brief-action-plan-weeks-3-12"
                  headline={isRu
                    ? `Открыть полные ${gatedBlocks.length} ${gatedBlocks.length === 1 ? "блок" : "блока"} плана`
                    : `Unlock the rest of your ${gatedBlocks.length === 1 ? "plan" : "90-day plan"}`}
                  subline={isRu
                    ? "Вы видите план Weeks 1-2 бесплатно. Pro раскрывает Weeks 3-12 с неделя-за-неделя задачами и проверкой прогресса."
                    : "Weeks 1-2 are free. Pro unlocks Weeks 3-12 with week-by-week deliverables and progress tracking."}
                >
                  <div className="space-y-6">
                    {gatedBlocks.map((b, i) => renderBlock(b, i + visibleBlocks.length))}
                  </div>
                </PremiumGate>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
};

/* ─── University shortlist → card grid ───────────────────────────────
   Parses the "Your university shortlist" section into the three buckets
   defined by ### sub-headings (Strong fits / Aligned / Worth keeping
   on the radar) and renders each bullet item as a visual card with the
   university name, description, and a country-coded link out to a
   filtered Discover view. Way more scannable than bulleted prose. */
const UniversityShortlist = ({ markdown, isRu, onOpenDiscover, onRegen, isRegenerating }: {
  markdown: string;
  isRu: boolean;
  onOpenDiscover: () => void;
  onRegen?: (id: string) => void;
  isRegenerating?: boolean;
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
        <div className="flex items-center gap-3">
          <SectionRegenButton sectionId="shortlist" onRegen={onRegen} isRegenerating={isRegenerating} isRu={isRu} />
          <button
            onClick={onOpenDiscover}
            className="text-xs text-muted-foreground hover:text-gold-dark transition-colors hidden sm:inline-flex items-center gap-1"
          >
            {isRu ? "Открыть Discover" : "Open in Discover"} <ArrowRight className="w-3 h-3" />
          </button>
        </div>
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
  provider_name?: string | null;
  host_country: string | null;
  coverage_type: string;
  award_amount_text: string | null;
  estimated_total_value_usd: number | null;
  application_deadline: string | null;
  official_url?: string | null;
  verification_status?: string | null;
  last_verified_at?: string | null;
};

const fmtMoney = (v: number) =>
  v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `$${Math.round(v / 1000)}K` : `$${v}`;

const FundingShortlist = ({ markdown, liveMatches, isRu, onOpenDiscover, combinedFunding, onRegen, isRegenerating, tier = "premium" }: {
  markdown: string;
  liveMatches: LiveMatchLite[];
  isRu: boolean;
  onOpenDiscover: () => void;
  /** Optional structured Combined Funding payload from extract-brief-data —
   *  renders the stacked-bar scenarios chart at the top of this section. */
  combinedFunding?: import("@/types/briefStructured").CombinedFundingSection | null;
  onRegen?: (id: string) => void;
  isRegenerating?: boolean;
  /** When 'basic', the funding list shows the top 3 items in full and
   *  blurs the rest behind a Pro upgrade gate. */
  tier?: "basic" | "premium";
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
        <div className="flex items-center gap-3">
          <SectionRegenButton sectionId="funding" onRegen={onRegen} isRegenerating={isRegenerating} isRu={isRu} />
          <button
            onClick={onOpenDiscover}
            className="text-xs text-muted-foreground hover:text-gold-dark transition-colors hidden sm:inline-flex items-center gap-1"
          >
            {isRu ? "Все стипендии" : "Browse all scholarships"} <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Combined Funding scenarios chart — premium-only, renders above the
          per-scholarship list when extract-brief-data returned scenarios. */}
      {combinedFunding && combinedFunding.scenarios && combinedFunding.scenarios.length > 0 && (
        <CombinedFundingChart data={combinedFunding} isRu={isRu} />
      )}

      {(() => {
        const renderItem = (it: typeof decorated[number], i: number) => {
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
            : days! <= 7 ? "text-destructive font-semibold"
            : days! <= 30 ? "text-amber-700 dark:text-amber-400"
            : days! <= 90 ? "text-foreground/60"
            : "text-muted-foreground";
          const isLinked = !!it.match;
          const Wrapper = isLinked ? "button" : "div";
          return (
            <Wrapper
              key={`fund-${i}`}
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
                    {dl && <span className={`font-semibold ${dlClass}`}>{dl}</span>}
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
        };

        // Premium gate: basic-tier briefs see top 3 in full + the rest
        // blurred behind an upgrade card. Premium tier sees everything.
        const visibleCount = tier === "basic" ? Math.min(3, decorated.length) : decorated.length;
        const visible = decorated.slice(0, visibleCount);
        const gated = decorated.slice(visibleCount);
        return (
          <>
            <div className="space-y-2.5">
              {visible.map((it, i) => renderItem(it, i))}
            </div>
            {gated.length > 0 && (() => {
              // Compute the concrete funding value the user is leaving on
              // the table — sum of estimated_total_value_usd across the
              // gated rows that we matched to live DB entries. Shows up in
              // the gate headline so the user sees exactly what's behind
              // the lock instead of a generic "unlock more".
              const gatedUsd = gated.reduce(
                (sum, it) => sum + (it.match?.estimated_total_value_usd || 0),
                0,
              );
              const valueText = gatedUsd >= 1_000_000
                ? `$${(gatedUsd / 1_000_000).toFixed(1)}M`
                : gatedUsd >= 1000
                  ? `$${Math.round(gatedUsd / 1000)}K`
                  : null;
              const headline = valueText
                ? (isRu
                    ? `Ещё ${gated.length} совпадений · ${valueText} потенциального финансирования`
                    : `${gated.length} more matches · ${valueText} more in potential funding`)
                : (isRu
                    ? `Открыть ещё ${gated.length} ${gated.length === 1 ? "стипендию" : "совпадений"}`
                    : `Unlock ${gated.length} more ${gated.length === 1 ? "match" : "matches"}`);
              return (
                <div className="mt-4">
                  <PremiumGate
                    gateId="brief-funding-extra-matches"
                    headline={headline}
                    subline={isRu
                      ? "Топ-3 видны бесплатно. Pro раскрывает все ранжированные совпадения со стратегией под каждое и разбивкой match-score."
                      : "Top 3 are free. Pro unlocks every ranked match with strategy notes and per-factor match-score breakdown."}
                  >
                    <div className="space-y-2.5">
                      {gated.map((it, i) => renderItem(it, i + visible.length))}
                    </div>
                  </PremiumGate>
                </div>
              );
            })()}
          </>
        );
      })()}
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
      // Strip a leading "Angle N:" / "Угол N:" prefix from prompt-driven
      // headings so the card displays the concept directly.
      const cleaned = concept
        .trim()
        .replace(/^\*+|\*+$/g, "")
        .replace(/^(angle|угол)\s*\d+\s*[:.—–-]\s*/i, "")
        .trim();
      cur = { concept: cleaned, body: [] };
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
    const gaps: { headline: string; body: string[]; action: string; priority: "high" | "medium" | "low" | null }[] = [];
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
      const cleaned = headline
        .trim()
        .replace(/^\*+|\*+$/g, "")
        .replace(/^(gap|пробел)\s*\d+\s*[:.—–-]\s*/i, "")
        .trim();
      cur = { headline: cleaned, body: [], action: "", priority: null };
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

    // Pull priority and action from the labelled body lines.
    const priorityRegex = /^\*?\*?\s*(priority|приоритет)\s*\*?\*?\s*[:—–-]\s*\*?\*?\s*(high|medium|low|высок|сред|низк)/i;
    const actionRegex = /^\*?\*?\s*(action this month|action|plan|next step|next|to do|fix|шаг|план|действие|действие в этом месяце)\s*\*?\*?\s*[:—–-]\s*(.+)$/i;
    const normalizePriority = (s: string): "high" | "medium" | "low" => {
      const v = s.toLowerCase();
      if (v.startsWith("high") || v.startsWith("высок")) return "high";
      if (v.startsWith("med") || v.startsWith("сред")) return "medium";
      return "low";
    };

    return {
      title,
      gaps: gaps.map(g => {
        let priority = g.priority;
        let action = g.action;
        const remainingBody: string[] = [];
        for (const b of g.body) {
          const pm = b.match(priorityRegex);
          const am = b.match(actionRegex);
          if (pm && !priority) {
            priority = normalizePriority(pm[2]);
            continue;
          }
          if (am && !action) {
            action = am[2].trim().replace(/\*+/g, "");
            continue;
          }
          remainingBody.push(b);
        }
        return { ...g, body: remainingBody, action, priority };
      }).filter(g => g.headline),
    };
  }, [markdown]);

  if (gaps.length === 0) return null;

  // Use AI-tagged priority when present, fall back to keyword heuristic.
  const severityFor = (g: { headline: string; body: string[]; priority: "high" | "medium" | "low" | null }) => {
    let p = g.priority;
    if (!p) {
      const blob = (g.headline + " " + g.body.join(" ")).toLowerCase();
      if (/gpa|sat|act|gre|gmat|score|test|exam|fail/.test(blob)) p = "high";
      else if (/ielts|toefl|english|language|essay|writing|portfolio|extracurricular/.test(blob)) p = "medium";
      else p = "low";
    }
    if (p === "high") return { strip: "bg-destructive", label: isRu ? "Высокий приоритет" : "High priority", labelClass: "text-destructive" };
    if (p === "medium") return { strip: "bg-amber-500", label: isRu ? "Средний приоритет" : "Medium priority", labelClass: "text-amber-600 dark:text-amber-500" };
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
const StrategicPositioning = ({ markdown, isRu, onRegen, isRegenerating }: { markdown: string; isRu: boolean; onRegen?: (id: string) => void; isRegenerating?: boolean }) => {
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
        <SectionRegenButton sectionId="positioning" onRegen={onRegen} isRegenerating={isRegenerating} isRu={isRu} />
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

/* ─── Final word → editorial closing block ─────────────────────────────
   The AI's "## Final word" is one paragraph of personalised
   encouragement closing the report. Rendering it as a flat markdown
   paragraph after all the cards looks abrupt; this gives it a quiet
   editorial framing — gold rule, kicker, italic body — so it lands
   like a signature block. */
const FinalWord = ({ markdown, isRu }: { markdown: string; isRu: boolean }) => {
  const { title, body } = useMemo(() => {
    const lines = markdown.split("\n");
    let title = "";
    const bodyLines: string[] = [];
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) { bodyLines.push(""); continue; }
      if (line.startsWith("## ")) {
        title = line.slice(3).trim();
        continue;
      }
      bodyLines.push(line);
    }
    while (bodyLines.length && bodyLines[bodyLines.length - 1] === "") bodyLines.pop();
    return { title, body: bodyLines.join("\n").trim() };
  }, [markdown]);

  if (!body) return null;

  return (
    <div className="not-prose my-12 pt-8 border-t border-border">
      <div className="flex items-center gap-2 mb-3">
        <span className="h-px w-8 bg-gold-dark" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark">
          {title || (isRu ? "Заключительное слово" : "Final word")}
        </span>
      </div>
      <div className="prose prose-sm sm:prose-base max-w-none text-foreground/90 [&_p]:leading-relaxed [&_p]:italic [&_p]:text-[15px] sm:[&_p]:text-base">
        <ReactMarkdown>{body}</ReactMarkdown>
      </div>
    </div>
  );
};

const PATHWAY_POS_SECTION_REGEX = /^##\s+.*?(strategic positioning|positioning|стратегическое позиционирование|позиционирование)/i;
const PATHWAY_PLAN_SECTION_REGEX = /^##\s+.*?(action plan|90.day|план действий)/i;
const PATHWAY_UNIS_SECTION_REGEX = /^##\s+.*?(university shortlist|your university|шорт.лист университетов)/i;
const PATHWAY_FUND_SECTION_REGEX = /^##\s+.*?(funding pathway|funding deep|финансирование|стипендии)/i;
const PATHWAY_ESSAYS_SECTION_REGEX = /^##\s+.*?(essay angle|essay angles|углов? для эссе|эссе)/i;
const PATHWAY_GAPS_SECTION_REGEX = /^##\s+.*?(honest gap|gaps to close|пробел|недотяг|слабые)/i;
const PATHWAY_FINAL_SECTION_REGEX = /^##\s+.*?(final word|closing|in closing|заключительное слово|заключение)/i;

/* Tiny shared affordance — surfaces a "regenerate this section" action in
   the section header when the host passes onRegen. Hidden in print, mute
   while a regen is in-flight on this section, gold accent on hover. */
const SectionRegenButton = ({
  sectionId, onRegen, isRegenerating, isRu,
}: {
  sectionId: string;
  onRegen?: (id: string) => void;
  isRegenerating?: boolean;
  isRu: boolean;
}) => {
  if (!onRegen) return null;
  return (
    <button
      onClick={() => onRegen(sectionId)}
      disabled={isRegenerating}
      className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-gold-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed print:hidden"
      title={isRu ? "Перегенерировать этот раздел" : "Regenerate just this section"}
      type="button"
    >
      {isRegenerating
        ? <Loader2 className="w-3 h-3 animate-spin" />
        : <RotateCcw className="w-3 h-3" />}
      {isRegenerating ? (isRu ? "Создаём…" : "Regen…") : (isRu ? "Перегенерировать" : "Regen")}
    </button>
  );
};
const PATHWAY_CAREER_SECTION_REGEX = /^##\s+.*?(career roi|carreer roi|карьерн|career return)/i;
const PATHWAY_VISA_SECTION_REGEX = /^##\s+.*?(visa.*pathway|visa.*post|post.*graduation|виза.*пути|виза|после выпуска)/i;

export const ReportRenderer = ({ markdown, completedTasks, onToggle, taskKey, isRu, onOpenDiscover, liveMatches, onSaveScholarship, savedSet, structured, onRegenSection, regeneratingSectionId, tier = "premium" }: {
  markdown: string;
  completedTasks: Set<string>;
  onToggle: (id: string) => void;
  taskKey: (text: string) => string;
  isRu: boolean;
  onOpenDiscover: () => void;
  liveMatches: LiveMatchLite[];
  onSaveScholarship?: (id: string, name: string) => void;
  savedSet?: Set<string>;
  /** Optional structured payload from extract-brief-data. When supplied,
   *  premium sections render charts above the narrative. */
  structured?: import("@/types/briefStructured").BriefStructured | null;
  /** When provided, premium sections render a per-section regen
   *  affordance that calls onRegenSection(spec_id). */
  onRegenSection?: (sectionId: string) => void;
  /** SectionSpec.id currently regenerating (so PremiumSection shows
   *  a loading state on that one button). */
  regeneratingSectionId?: string | null;
  tier?: "basic" | "premium";
}) => {
  // Mapped to InlineScholarshipCard's expected shape — provider/url default to null
  const scholarshipsForCards = liveMatches.map((m) => ({
    scholarship_id: m.scholarship_id,
    scholarship_name: m.scholarship_name,
    provider_name: m.provider_name ?? null,
    host_country: m.host_country,
    coverage_type: m.coverage_type,
    award_amount_text: m.award_amount_text,
    application_deadline: m.application_deadline,
    official_url: m.official_url ?? null,
    verification_status: m.verification_status ?? null,
    last_verified_at: m.last_verified_at ?? null,
  }));
  const sections = useMemo(() => {
    if (!markdown.trim()) return [] as string[];
    return markdown.split(/(?=^##\s+)/m).filter(s => s.trim().length > 0);
  }, [markdown]);

  if (sections.length === 0) return null;

  return (
    <>
      {sections.map((section, i) => {
        // Wrap each section in a chapter anchor so BriefChapterNav can scroll
        // to it whether it renders as plain markdown OR through a custom
        // section component that consumes the h2.
        const anchorId = `chapter-${i + 1}`;
        const anchorProps = { id: anchorId, className: "scroll-mt-24" } as const;

        if (PATHWAY_POS_SECTION_REGEX.test(section)) {
          const hasBody = section.split("\n").slice(1).join("\n").trim().length > 30;
          if (hasBody) {
            return <div key={i} {...anchorProps}><StrategicPositioning markdown={section} isRu={isRu} onRegen={onRegenSection} isRegenerating={regeneratingSectionId === "positioning"} /></div>;
          }
        }
        if (PATHWAY_PLAN_SECTION_REGEX.test(section)) {
          return <div key={i} {...anchorProps}><InteractiveActionPlanOrFallback
            markdown={section} completedTasks={completedTasks}
            onToggle={onToggle} taskKey={taskKey} isRu={isRu}
            liveMatches={liveMatches}
            onSaveScholarship={onSaveScholarship}
            savedSet={savedSet}
            tier={tier}
          /></div>;
        }
        if (PATHWAY_UNIS_SECTION_REGEX.test(section)) {
          const hasBuckets = /^###\s+/m.test(section);
          if (hasBuckets) {
            return <div key={i} {...anchorProps}><UniversityShortlist markdown={section} isRu={isRu} onOpenDiscover={onOpenDiscover} onRegen={onRegenSection} isRegenerating={regeneratingSectionId === "shortlist"} /></div>;
          }
        }
        if (PATHWAY_FUND_SECTION_REGEX.test(section)) {
          const hasBullets = /^\s*([-*]|\d+\.)\s+/m.test(section);
          if (hasBullets) {
            return <div key={i} {...anchorProps}><FundingShortlist markdown={section} liveMatches={liveMatches} isRu={isRu} onOpenDiscover={onOpenDiscover} combinedFunding={structured?.combinedFunding ?? null} onRegen={onRegenSection} isRegenerating={regeneratingSectionId === "funding"} tier={tier} /></div>;
          }
        }
        if (PATHWAY_ESSAYS_SECTION_REGEX.test(section)) {
          const hasContent = /^\s*([-*]|\d+\.|\#)\s+/m.test(section.split("\n").slice(1).join("\n"));
          if (hasContent) {
            return <div key={i} {...anchorProps}><EssayAngles markdown={section} isRu={isRu} /></div>;
          }
        }
        if (PATHWAY_GAPS_SECTION_REGEX.test(section)) {
          const hasContent = /^\s*([-*]|\d+\.|\#)\s+/m.test(section.split("\n").slice(1).join("\n"));
          if (hasContent) {
            return <div key={i} {...anchorProps}><HonestGaps markdown={section} isRu={isRu} /></div>;
          }
        }
        if (PATHWAY_FINAL_SECTION_REGEX.test(section)) {
          const hasBody = section.split("\n").slice(1).join("\n").trim().length > 30;
          if (hasBody) {
            return <div key={i} {...anchorProps}><FinalWord markdown={section} isRu={isRu} /></div>;
          }
        }
        if (PATHWAY_CAREER_SECTION_REGEX.test(section)) {
          const hasBody = section.split("\n").slice(1).join("\n").trim().length > 60;
          if (hasBody) {
            return <div key={i} {...anchorProps}><PremiumSection kind="career" markdown={section} isRu={isRu} scholarships={scholarshipsForCards} careerRoiData={structured?.careerRoi ?? null} onRegen={onRegenSection} isRegenerating={regeneratingSectionId === "career_roi"} /></div>;
          }
        }
        if (PATHWAY_VISA_SECTION_REGEX.test(section)) {
          const hasBody = section.split("\n").slice(1).join("\n").trim().length > 60;
          if (hasBody) {
            return <div key={i} {...anchorProps}><PremiumSection kind="visa" markdown={section} isRu={isRu} scholarships={scholarshipsForCards} visaPathwayData={structured?.visaPathway ?? null} onRegen={onRegenSection} isRegenerating={regeneratingSectionId === "visa"} /></div>;
          }
        }
        return <div key={i} {...anchorProps}><EnrichedMarkdown scholarships={scholarshipsForCards}>{section}</EnrichedMarkdown></div>;
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
  liveMatches?: LiveMatchLite[];
  onSaveScholarship?: (id: string, name: string) => void;
  savedSet?: Set<string>;
  tier?: "basic" | "premium";
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

  /* Auth + premium tier resolution — declared early because profileHash
     depends on reportGrade. Members get the premium prompt (15-20
     universities, deeper sections, Gemini 2.5 Pro). */
  const { user, subscription } = useAuth();
  const isMember = !!subscription && (
    subscription.is_active ||
    subscription.is_founding_member ||
    subscription.earned_trial_active ||
    subscription.tier === "pro" ||
    subscription.tier === "founding"
  );
  // Application tracker — used to wire the action-plan items' "Save"
  // pill into the user's pipeline. The same hook powers /pipeline,
  // /calendar, and the heart on every ScholarshipCard, so saves from
  // here flow through to every other surface.
  const tracker = useApplicationTracker();
  const handleSaveScholarship = (id: string, name: string) => {
    tracker.toggleShortlist(id);
    const isNowSaved = !tracker.shortlist.has(id);
    toast.success(
      isNowSaved
        ? (isRu ? `Сохранено: ${name}` : `Saved: ${name}`)
        : (isRu ? `Удалено: ${name}` : `Removed: ${name}`),
    );
  };

  // Pro depth fields — captured on demand via the ProBriefUnlock dialog,
  // not in the standard wizard. When set, the brief auto-regenerates at
  // premium tier with these injected into the prompt. Persisted to
  // localStorage so reopening the dashboard preserves them.
  const PRO_DEPTH_KEY = "topuni-pro-depth-v1";
  const [proDepth, setProDepth] = useState<ProBriefDepth>(() => {
    try {
      const raw = localStorage.getItem(PRO_DEPTH_KEY);
      if (!raw) return { topActivity: "", personalStory: "", namedSchools: "" };
      return JSON.parse(raw) as ProBriefDepth;
    } catch { return { topActivity: "", personalStory: "", namedSchools: "" }; }
  });
  const [proUnlockOpen, setProUnlockOpen] = useState(false);
  const hasProDepth = !!(proDepth.topActivity || proDepth.personalStory || proDepth.namedSchools);

  // The active grade for THIS render: members always get premium; non-members
  // get premium too if they've filled the Pro depth fields (the on-demand
  // upgrade path). Otherwise basic.
  const reportGrade: "basic" | "premium" = (isMember || hasProDepth) ? "premium" : "basic";

  /* Profile hash — bumps when ANY signal changes that should invalidate
     the cached brief: identity fields, language, AND the reportGrade
     (so a user who upgrades from basic to premium auto-regenerates the
     deeper version on next visit, not the stale basic one). */
  const profileHash = useMemo(() => {
    const fingerprint = JSON.stringify({
      n: profile.fullName, g: profile.gpa, i: profile.ielts, s: profile.sat,
      m: profile.major, c: profile.targetCountries, b: profile.budget,
      lang: language, grade: reportGrade,
      // Pro depth fingerprints — when the user fills the upgrade dialog
      // we want the cache to invalidate so the regenerated brief sticks.
      d: proDepth.topActivity ? "1" : "0",
      s2: proDepth.personalStory ? "1" : "0",
      sc: proDepth.namedSchools ? "1" : "0",
    });
    let h = 0;
    for (let i = 0; i < fingerprint.length; i++) h = ((h << 5) - h + fingerprint.charCodeAt(i)) | 0;
    return `p${h.toString(36)}`;
  }, [profile.fullName, profile.gpa, profile.ielts, profile.sat, profile.major, profile.targetCountries?.join(","), profile.budget, language, reportGrade, proDepth.topActivity, proDepth.personalStory, proDepth.namedSchools]);

  const PATHWAY_STORAGE_KEY = "topuni-pathway-cache";

  const restored = useMemo(() => {
    try {
      const raw = localStorage.getItem(PATHWAY_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.hash === profileHash && typeof parsed.content === "string" && parsed.content.length > 100) {
        return { content: parsed.content as string, generatedAt: typeof parsed.generatedAt === "number" ? parsed.generatedAt : null };
      }
    } catch { /* ignore */ }
    return null;
  }, [profileHash]);

  const [pathwayContent, setPathwayContent] = useState<string>(restored?.content ?? "");
  const [pathwayLoading, setPathwayLoading] = useState(false);
  /* Focus scholarship — populated when the user arrived from a
     /scholarships/:id detail page and clicked "Build my strategy around
     this." Drained from sessionStorage on mount; passed to the pathway
     edge fn so the brief explicitly elevates this scholarship in the
     funding section. Mirrors the counselor-prefill handoff pattern. */
  const [focusScholarship, setFocusScholarship] = useState<{
    scholarshipId: string;
    scholarshipName: string;
  } | null>(null);
  // Structured-output payload extracted from the brief (premium tier only).
  // Populated by a second-pass call to extract-brief-data after the markdown
  // stream completes. Drives chart rendering inside PremiumSection / Funding.
  const [structuredBrief, setStructuredBrief] = useState<import("@/types/briefStructured").BriefStructured | null>(null);
  const [structuredLoading, setStructuredLoading] = useState(false);
  // SectionSpec id currently being regenerated (Pro-tier per-section
  // regen). null when no regen is in flight.
  const [regeneratingSectionId, setRegeneratingSectionId] = useState<string | null>(null);
  const [pathwayGenerated, setPathwayGenerated] = useState<boolean>(!!restored);
  const [pathwayGeneratedAt, setPathwayGeneratedAt] = useState<number | null>(restored?.generatedAt ?? null);

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
    official_url: string | null;
    verification_status: string | null;
    last_verified_at: string | null;
  };
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);

  useEffect(() => {
    // Skip if profile is essentially empty (no targets, no scores)
    if (!profile.fullName || profile.fullName === "Student") return;
    (async () => {
      let q = supabase.from("scholarships").select(
        "scholarship_id, scholarship_name, provider_name, host_country, coverage_type, award_amount_text, estimated_total_value_usd, application_deadline, why_this_fits, official_url, verification_status, last_verified_at"
      )
      // Only surface verified + stale rows in the brief sidebar matches —
      // matches the LLM's retrieval filter so what the brief mentions and
      // what the cards show are aligned.
      .or("verification_status.is.null,verification_status.in.(verified,stale)");
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

  /* ─── Counselor session — DB-backed when authed ─────────────────
     Lazily created on first message of an authed user's chat. The
     edge function reads it from the request body and persists every
     turn (user + assistant) to counselor_messages. anon users keep
     using localStorage only. */
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);

  /* ─── Auto-greet (counselor's first message) ────────────────────
     When the user opens the counselor tab with a filled profile and
     no chat history yet, fire topuni-counselor-greeting to generate
     a personalised opening message. The greeting becomes the first
     assistant message in chatMessages and gets the AI's bespoke
     follow-up chips beneath it (instead of the keyword-matched
     static FOLLOWUPS).

     Cache key: hash(profile snapshot + first 800 chars of brief). When
     either changes (profile edit, brief regen), the cache invalidates
     and the next counselor open gets a fresh greeting.

     Stored in localStorage so a refresh / tab switch doesn't re-fire
     the API call (which would burn ~$0.0006 each time). */
  const GREETING_CACHE_KEY = "topuni-counselor-greeting-v1";
  type GreetingCache = { hash: string; greeting: string; followUps: string[] };
  const [greetingFollowUps, setGreetingFollowUps] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(GREETING_CACHE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as GreetingCache;
      return Array.isArray(parsed.followUps) ? parsed.followUps : [];
    } catch { return []; }
  });
  const [greetingLoading, setGreetingLoading] = useState(false);
  const [greetingFiredHash, setGreetingFiredHash] = useState<string | null>(null);

  const ensureSession = async (): Promise<string | null> => {
    if (chatSessionId) return chatSessionId;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      const { data, error } = await supabase
        .from("counselor_sessions")
        .insert({ user_id: session.user.id, language })
        .select("session_id")
        .single();
      if (error || !data) return null;
      setChatSessionId(data.session_id);
      return data.session_id;
    } catch { return null; }
  };

  const clearChat = async () => {
    setChatMessages([]);
    try {
      localStorage.removeItem("topuni-chat-history");
      // User asked for a fresh thread — invalidate the greeting cache so
      // the next render fires a NEW greeting instead of restoring the
      // previous one (which would feel like the click did nothing).
      localStorage.removeItem(GREETING_CACHE_KEY);
    } catch { /* ignore */ }
    setGreetingFollowUps([]);
    setGreetingFiredHash(null);
    // Don't archive the previous session — it's preserved for resume
    // history. Just start fresh.
    setChatSessionId(null);
  };

  /* Load a past session: drop its messages into the chat + set the
     active session_id so subsequent turns persist to the same thread. */
  const loadChatSession = (sessionId: string, msgs: Msg[]) => {
    setChatSessionId(sessionId);
    setChatMessages(msgs);
    try { localStorage.setItem("topuni-chat-history", JSON.stringify(msgs)); } catch { /* ignore */ }
  };

  /* ─── Public share — mints a /brief/:slug URL via the share-brief
     edge function. Used by the Share button in the report toolbar. */
  // (user / subscription / isMember / reportGrade declared earlier
  //  alongside profileHash — they're needed for cache-key invalidation.)

  /* ─── Save-your-work signup prompt. Fires once after the brief
     finishes generating, only for anon users. Stores a "shown" flag
     so we don't nag a user who explicitly dismissed. */
  const [savePromptOpen, setSavePromptOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareExpiresAt, setShareExpiresAt] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  const openShare = async () => {
    if (!pathwayContent || pathwayContent.length < 200) return;
    setShareOpen(true);
    if (shareUrl) return; // already generated this session
    setShareLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<{
        slug: string; url: string; expiresAt: string | null; isOwner: boolean;
      }>("share-brief", {
        body: {
          content: pathwayContent,
          language,
          reportGrade,
          profileSnapshot: {
            firstName: profile.fullName?.split(" ")[0],
            gradeLevel: profile.gradeLevel,
            major: profile.major,
            targetCountries: profile.targetCountries,
          },
        },
      });
      if (error) throw new Error(error.message);
      if (data) {
        setShareUrl(data.url);
        setShareExpiresAt(data.expiresAt);
      }
    } catch (e) {
      console.error("share-brief failed", e);
    } finally {
      setShareLoading(false);
    }
  };

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch { /* ignore */ }
  };


  // Email-me-my-brief flow inside the share dialog. Pre-fills the user's
  // saved email if available; otherwise asks for one. Uses the existing
  // send-transactional-email edge function with template_name=brief-generated.
  const [emailMeAddress, setEmailMeAddress] = useState("");
  const [emailMeSending, setEmailMeSending] = useState(false);
  const [emailMeStatus, setEmailMeStatus] = useState<"idle" | "sent" | "error">("idle");

  const sendBriefEmail = async () => {
    if (!shareUrl) return;
    const target = (emailMeAddress || profile.email || user?.email || "").trim();
    if (!target || !/^\S+@\S+\.\S+$/.test(target)) {
      setEmailMeStatus("error");
      return;
    }
    setEmailMeSending(true);
    setEmailMeStatus("idle");
    try {
      // Compose a one-line stats string for the email preview/header so the
      // inbox feels alive — pulled from liveMatches (same data the in-app
      // brief hero stats use).
      const total = liveMatches.reduce((s, m) => s + (m.estimated_total_value_usd || 0), 0);
      const totalText = total > 1_000_000
        ? `$${(total / 1_000_000).toFixed(1)}M`
        : total >= 1000
          ? `$${Math.round(total / 1000)}K`
          : "";
      const closestDays = liveMatches
        .map(m => m.application_deadline ? Math.ceil((new Date(m.application_deadline).getTime() - Date.now()) / 86400000) : null)
        .filter((d): d is number => d !== null && d > 0)
        .sort((a, b) => a - b)[0] ?? null;
      const statsParts: string[] = [];
      statsParts.push(`${liveMatches.length} matches`);
      if (totalText) statsParts.push(`${totalText} potential funding`);
      if (closestDays !== null) statsParts.push(`earliest deadline in ${closestDays} days`);
      const statsLine = statsParts.join(" · ");

      const topMatches = liveMatches.slice(0, 3).map(m => m.scholarship_name);

      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "brief-generated",
          recipientEmail: target,
          templateData: {
            firstName: profile.fullName?.trim().split(/\s+/)[0],
            briefUrl: shareUrl,
            statsLine,
            topMatches,
            major: profile.major,
            targetCountries: profile.targetCountries,
          },
        },
      });
      if (error) throw new Error(error.message);
      setEmailMeStatus("sent");
    } catch (e) {
      console.error("send-brief-email failed", e);
      setEmailMeStatus("error");
    } finally {
      setEmailMeSending(false);
    }
  };

  // Only generate pathway if profile is actually filled
  const isProfileFilled = profile.fullName && profile.fullName !== "Student" && profile.gpa && profile.targetCountries.length > 0;

  /* Tabs state — promoted to a useState so other surfaces (Pipeline's
     "Ask the AI counselor about this" button) can switch us to the
     counselor tab via sessionStorage on mount. Default mirrors the
     previous defaultValue logic: profile filled → strategy tab,
     otherwise → counselor (which is more useful for empty-profile
     visitors). */
  const [activeTab, setActiveTab] = useState<string>(isProfileFilled ? "pathway" : "counselor");

  useEffect(() => {
    if (!pathwayGenerated && isProfileFilled) {
      generatePathway();
    }
  }, []);

  /* Counselor prefill from another surface — when the user clicks
     "Ask the AI counselor about this" on the Pipeline detail sheet
     (or any future cross-surface CTA), the source stashes a payload
     in sessionStorage. On mount we drain it: switch to the counselor
     tab and seed the input with the suggested question, then delete
     the key so a refresh doesn't re-fire.

     Stale guard: ignore prefills older than 5 minutes (e.g. user
     navigated away and back hours later — we shouldn't surprise them
     with an old question). */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("topuni-counselor-prefill");
      if (!raw) return;
      sessionStorage.removeItem("topuni-counselor-prefill");
      const payload = JSON.parse(raw) as {
        scholarshipId?: string;
        scholarshipName?: string;
        question?: string;
        ts?: number;
      };
      if (!payload?.question) return;
      if (typeof payload.ts === "number" && Date.now() - payload.ts > 5 * 60_000) return;
      setActiveTab("counselor");
      setChatInput(payload.question);
      // Focus the textarea so the user can edit before sending.
      setTimeout(() => chatTextareaRef.current?.focus(), 100);
    } catch { /* ignore */ }
  }, []);

  /* Focus-scholarship drain — symmetric to the counselor prefill above.
     The /scholarships/:id "Build my strategy around this" CTA stashes
     {scholarshipId, scholarshipName, ts} so the brief generation can
     pin this scholarship at the top of the retrieved set and call it
     out by name. Drained once on mount with the same 5-minute stale
     guard. */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("topuni-focus-scholarship");
      if (!raw) return;
      sessionStorage.removeItem("topuni-focus-scholarship");
      const payload = JSON.parse(raw) as {
        scholarshipId?: string;
        scholarshipName?: string;
        ts?: number;
      };
      if (!payload?.scholarshipId || !payload.scholarshipName) return;
      if (typeof payload.ts === "number" && Date.now() - payload.ts > 5 * 60_000) return;
      setFocusScholarship({
        scholarshipId: payload.scholarshipId,
        scholarshipName: payload.scholarshipName,
      });
      void track("brief_focus_scholarship_set", {
        scholarship_id: payload.scholarshipId,
        scholarship_name: payload.scholarshipName,
      });
    } catch { /* ignore */ }
  }, []);

  /* Auto-greet the counselor when the user opens chat empty-handed but
     with enough context to ground a real opener. We compute a hash of
     the inputs that affect the greeting; if the cached hash matches,
     reuse the cached greeting + follow-ups (no API call). Otherwise
     fire topuni-counselor-greeting and prepend the result as the first
     assistant message in chatMessages.

     Conditions:
       - profile filled (we have a name + scores + country)
       - brief streaming complete (or skipped — brief is optional but
         strongly enhances the greeting quality)
       - chatMessages empty (don't overwrite an existing thread)
       - we haven't already fired for this exact (profile + brief) hash
         in the current session (greetingFiredHash guard) */
  useEffect(() => {
    if (!isProfileFilled) return;
    if (chatMessages.length > 0) return;
    if (greetingLoading) return;
    if (pathwayLoading) return; // wait until streaming is done so the brief is stable

    // Hash the inputs that change the greeting. profile name + countries +
    // major + GPA + the head of the brief. Cheap djb2-like hash.
    const briefHead = (pathwayContent || "").slice(0, 800);
    const hashInput = JSON.stringify({
      n: profile.fullName,
      gl: profile.gradeLevel,
      g: profile.gpa,
      i: profile.ielts,
      tc: profile.targetCountries,
      m: profile.major,
      bh: briefHead.length,
      bs: briefHead.slice(0, 300), // sample the first part of the brief
    });
    let h = 5381;
    for (let i = 0; i < hashInput.length; i++) h = (h * 33) ^ hashInput.charCodeAt(i);
    const inputHash = (h >>> 0).toString(36);

    if (greetingFiredHash === inputHash) return;

    // Check localStorage cache first.
    try {
      const raw = localStorage.getItem(GREETING_CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as GreetingCache;
        if (cached.hash === inputHash && typeof cached.greeting === "string" && cached.greeting.length >= 50) {
          setChatMessages([{ role: "assistant", content: cached.greeting }]);
          setGreetingFollowUps(Array.isArray(cached.followUps) ? cached.followUps : []);
          setGreetingFiredHash(inputHash);
          void track("counselor_greeting_shown", { source: "cache" });
          return;
        }
      }
    } catch { /* fall through to fetch */ }

    // Fresh greeting — fire and forget; stash the result on completion.
    setGreetingFiredHash(inputHash);
    setGreetingLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke<{
          ok: boolean; greeting: string; follow_ups: string[]; error?: string;
        }>("topuni-counselor-greeting", {
          body: {
            profile,
            briefContent: pathwayContent ?? "",
            language,
          },
        });
        if (error || !data?.ok || !data.greeting) {
          // Soft fail — keep the static empty state, no toast (greeting is
          // a nice-to-have, not load-bearing).
          console.warn("[counselor-greeting] failed", error?.message ?? data?.error);
          return;
        }
        const followUps = Array.isArray(data.follow_ups) ? data.follow_ups : [];
        setChatMessages([{ role: "assistant", content: data.greeting }]);
        setGreetingFollowUps(followUps);
        try {
          localStorage.setItem(GREETING_CACHE_KEY, JSON.stringify({
            hash: inputHash, greeting: data.greeting, followUps,
          } satisfies GreetingCache));
        } catch { /* ignore */ }
        void track("counselor_greeting_shown", { source: "fresh" });
      } catch (e) {
        console.warn("[counselor-greeting] threw", (e as Error).message);
      } finally {
        setGreetingLoading(false);
      }
    })();
  }, [
    isProfileFilled, chatMessages.length, pathwayLoading, pathwayContent,
    profile.fullName, profile.gradeLevel, profile.gpa, profile.ielts,
    profile.targetCountries, profile.major, language,
    greetingFiredHash, greetingLoading,
  ]);

  const streamSSE = async (url: string, body: any, onDelta: (chunk: string) => void, onDone: () => void) => {
    // Pass the user's session JWT when authed so edge functions can
    // resolve user_id via getUser() — needed for the counselor's
    // live-case context (tracker / tasks / cached brief). Falls back
    // to anon key for unauthenticated callers.
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
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

  /* Per-section regeneration (premium tier only). Calls topuni-ai-pathway
     with `regenSection: <id>`; the backend regenerates JUST that section
     via the multi-pass infrastructure and streams its markdown back. We
     splice the returned text into pathwayContent at the existing
     section's location and persist the updated brief to localStorage. */
  const regenerateSection = async (sectionId: string) => {
    if (!pathwayContent || regeneratingSectionId) return;
    setRegeneratingSectionId(sectionId);

    /* Heading-pattern map for splicing. Each entry's key matches a
       SectionSpec.id in supabase/functions/_shared/brief-sections.ts so
       the backend's regenSection branch hits the right per-section
       prompt. Patterns deliberately match both EN + RU phrasings. */
    const HEADING_PATTERNS: Record<string, RegExp> = {
      positioning:    /^##\s+.*?(strategic\s+positioning|positioning|стратегическое\s+позиционирование|позиционирование)/im,
      shortlist:      /^##\s+.*?(university\s+shortlist|your\s+university|шорт.лист\s+университетов)/im,
      career_roi:     /^##\s+.*?(career\s+roi|career\s+return|carreer\s+roi|карьерн|карьерный)/im,
      funding:        /^##\s+.*?(funding\s+pathway|funding\s+deep|финансирование|стипендии)/im,
      visa:           /^##\s+.*?(visa.*pathway|visa.*post|post.*graduation|виза.*пути|виза|после выпуска)/im,
      essays:         /^##\s+.*?(essay\s+angle|essay\s+angles|углов?\s+для\s+эссе|эссе)/im,
      monthly_budget: /^##\s+.*?(monthly\s+budget|budget\s+breakdown|месячный\s+бюджет|бюджет)/im,
      honest_gaps:    /^##\s+.*?(honest\s+gap|gaps\s+to\s+close|пробел|недотяг|слабые)/im,
      action_plan:    /^##\s+.*?(action\s+plan|90.day|план\s+действий)/im,
      final_word:     /^##\s+.*?(final\s+word|closing|in\s+closing|заключительное\s+слово|заключение)/im,
    };
    const headingRx = HEADING_PATTERNS[sectionId];
    if (!headingRx) {
      setRegeneratingSectionId(null);
      return;
    }

    const enrichedProfile = {
      ...profile,
      topActivity: proDepth.topActivity || "",
      personalStory: proDepth.personalStory || "",
      namedSchools: proDepth.namedSchools || "",
    };

    let newSectionMd = "";
    try {
      await streamSSE(
        PATHWAY_URL,
        {
          profile: enrichedProfile,
          language,
          reportGrade,
          regenSection: sectionId,
          // Carry the focus scholarship through per-section regens too —
          // otherwise re-generating the funding section would lose the
          // pinned scholarship and the user's "build around this" intent.
          focusScholarshipId: focusScholarship?.scholarshipId ?? null,
        },
        (chunk) => { newSectionMd += chunk; },
        () => {
          // Splice the new section into pathwayContent in place. Find the
          // existing section's heading; section body runs from heading to
          // the next "## " heading or EOF.
          const m = headingRx.exec(pathwayContent);
          if (!m || m.index === undefined) {
            // Defensive: heading missing → append the new section instead.
            setPathwayContent(pathwayContent + "\n\n" + newSectionMd.trim());
            return;
          }
          const start = m.index;
          const headingLineEnd = pathwayContent.indexOf("\n", start);
          const after = headingLineEnd === -1
            ? ""
            : pathwayContent.slice(headingLineEnd + 1);
          const nextHeadingMatch = /^##\s+/m.exec(after);
          const end = nextHeadingMatch && headingLineEnd !== -1
            ? headingLineEnd + 1 + nextHeadingMatch.index
            : pathwayContent.length;
          const before = pathwayContent.slice(0, start);
          const tail = pathwayContent.slice(end);
          // Rejoin with consistent paragraph spacing between sections.
          const tailJoiner = tail.startsWith("\n") ? "" : "\n\n";
          const updated = before + newSectionMd.trim() + tailJoiner + tail;
          setPathwayContent(updated);
          // Persist so a refresh shows the regenerated section.
          try {
            localStorage.setItem(PATHWAY_STORAGE_KEY, JSON.stringify({
              hash: profileHash,
              content: updated,
              generatedAt: Date.now(),
            }));
          } catch { /* ignore */ }
        },
      );
    } finally {
      setRegeneratingSectionId(null);
    }
  };

  const generatePathway = async () => {
    setPathwayLoading(true);
    setPathwayContent("");
    let soFar = "";
    const startedAtMs = Date.now();

    void track("brief_generation_started", { tier: reportGrade, has_pro_depth: hasProDepth });

    // Merge the wizard profile with any Pro depth fields the user has
    // captured via the upgrade dialog. The edge function reads these from
    // the same `profile` object — wizard fields default to empty strings
    // when the standard 3-step flow finishes, so we always overlay.
    const enrichedProfile = {
      ...profile,
      topActivity: proDepth.topActivity || "",
      personalStory: proDepth.personalStory || "",
      namedSchools: proDepth.namedSchools || "",
    };

    await streamSSE(
      PATHWAY_URL,
      {
        profile: enrichedProfile,
        language,
        reportGrade,
        // When the user arrived from a /scholarships/:id detail page,
        // hand the scholarship id off so the edge fn can elevate this
        // row in the retrieved set and call it out by name in the
        // funding pathway section. Null when the user came in fresh.
        focusScholarshipId: focusScholarship?.scholarshipId ?? null,
      },
      (chunk) => { soFar += chunk; setPathwayContent(soFar); },
      () => {
        const now = Date.now();
        setPathwayLoading(false);
        setPathwayGenerated(true);
        setPathwayGeneratedAt(now);
        void track("brief_generation_completed", {
          tier: reportGrade,
          word_count: soFar.trim().split(/\s+/).filter(Boolean).length,
          duration_ms: now - startedAtMs,
        });
        // Show signup prompt 4s after brief lands — gives the student
        // a moment to scroll the result before we ask them to save.
        // Only for anon users; only once per session.
        if (!user && !sessionStorage.getItem("topuni-save-prompt-dismissed")) {
          setTimeout(() => setSavePromptOpen(true), 4000);
        }
        // Persist the completed report keyed by current profile hash, so
        // subsequent visits restore the same text and the action-plan
        // checkboxes (keyed by text hash) line up.
        try {
          if (soFar && soFar.length > 100) {
            localStorage.setItem(PATHWAY_STORAGE_KEY, JSON.stringify({
              hash: profileHash,
              content: soFar,
              generatedAt: now,
            }));
          }
        } catch { /* ignore */ }

        // Premium-tier second pass — extract structured data for the chart
        // sections (Career ROI, Combined Funding, Visa Pathway). Runs in
        // parallel to the email send below so the user sees charts within
        // a few seconds of the brief landing. Soft-fails: on any error the
        // markdown narrative still renders cleanly.
        if (reportGrade === "premium" && soFar.length > 800) {
          setStructuredLoading(true);
          (async () => {
            try {
              const retrievedScholarships = liveMatches.slice(0, 12).map(m => ({
                scholarship_name: m.scholarship_name,
                coverage_type: m.coverage_type,
                award_amount_text: m.award_amount_text,
                estimated_total_value_usd: m.estimated_total_value_usd,
                host_country: m.host_country,
              }));
              const { data, error } = await supabase.functions.invoke<import("@/types/briefStructured").BriefStructured>(
                "extract-brief-data",
                {
                  body: {
                    briefMarkdown: soFar,
                    profile: {
                      fullName: profile.fullName,
                      nationality: profile.country,
                      major: profile.major,
                      field: profile.major,
                      targetCountries: profile.targetCountries,
                      gpa: profile.gpa,
                      ielts: profile.ielts,
                    },
                    retrievedScholarships,
                    language,
                  },
                },
              );
              if (error) {
                console.warn("[brief] extract-brief-data error", error.message);
                return;
              }
              if (data) setStructuredBrief(data);
            } catch (e) {
              console.warn("[brief] extract-brief-data failed", e);
            } finally {
              setStructuredLoading(false);
            }
          })();
        } else {
          // Reset on basic-tier regen so stale premium data doesn't leak
          // into a downgraded view.
          setStructuredBrief(null);
        }

        // Auto-send the brief to the user's inbox so it's permanent and
        // forwardable without them needing to find the share button.
        // Authed users only — anon users go through SaveBriefPrompt which
        // captures email + fires this same flow on submit.
        // Gated by per-profileHash localStorage flag so we don't spam
        // on every regenerate of the same brief.
        if (user?.email && soFar.length > 500) {
          const sentKey = `topuni-brief-emailed:${profileHash}`;
          if (!localStorage.getItem(sentKey)) {
            // Fire-and-forget; don't block the UI on email send.
            (async () => {
              try {
                // Mint the share URL first so the email links somewhere real.
                const { data: shareData } = await supabase.functions.invoke<{
                  url: string;
                }>("share-brief", {
                  body: {
                    content: soFar,
                    language,
                    reportGrade,
                    profileSnapshot: {
                      firstName: profile.fullName?.split(" ")[0],
                      gradeLevel: profile.gradeLevel,
                      major: profile.major,
                      targetCountries: profile.targetCountries,
                    },
                  },
                });
                if (!shareData?.url) return;

                // Compose stats line + top-3 from liveMatches (same shape
                // the in-dialog "Email me" path uses).
                const total = liveMatches.reduce((s, m) => s + (m.estimated_total_value_usd || 0), 0);
                const totalText = total >= 1_000_000
                  ? `$${(total / 1_000_000).toFixed(1)}M`
                  : total >= 1000 ? `$${Math.round(total / 1000)}K` : "";
                const closestDays = liveMatches
                  .map(m => m.application_deadline ? Math.ceil((new Date(m.application_deadline).getTime() - Date.now()) / 86400000) : null)
                  .filter((d): d is number => d !== null && d > 0)
                  .sort((a, b) => a - b)[0] ?? null;
                const statsParts: string[] = [`${liveMatches.length} matches`];
                if (totalText) statsParts.push(`${totalText} potential funding`);
                if (closestDays !== null) statsParts.push(`earliest deadline in ${closestDays} days`);

                await supabase.functions.invoke("send-transactional-email", {
                  body: {
                    templateName: "brief-generated",
                    recipientEmail: user.email,
                    idempotencyKey: `brief-${profileHash}`,
                    templateData: {
                      firstName: profile.fullName?.trim().split(/\s+/)[0],
                      briefUrl: shareData.url,
                      statsLine: statsParts.join(" · "),
                      topMatches: liveMatches.slice(0, 3).map(m => m.scholarship_name),
                      major: profile.major,
                      targetCountries: profile.targetCountries,
                    },
                  },
                });
                localStorage.setItem(sentKey, "1");
              } catch (e) {
                console.warn("auto brief email failed", e);
              }
            })();
          }
        }
      }
    );
  };

  /* Counselor free-message limit: non-Pro users get 5 user-side messages
     per session before the gate fires. Pro users (members or those who
     filled the Pro depth) bypass entirely. We track via session count of
     user-role messages — easy to inspect, easy to bypass on close+reopen
     (intentional — the cap is friction, not a hard wall, and the upgrade
     CTA is what matters for funnel telemetry). */
  const COUNSELOR_FREE_MESSAGE_LIMIT = 5;
  const userMessagesThisSession = chatMessages.filter(m => m.role === "user").length;
  const counselorGated = !isMember && !hasProDepth && userMessagesThisSession >= COUNSELOR_FREE_MESSAGE_LIMIT;

  const sendChatMessage = async (text: string) => {
    if (!text.trim() || chatLoading) return;
    if (counselorGated) {
      void track("counselor_message_blocked", {
        sent_count: userMessagesThisSession,
        limit: COUNSELOR_FREE_MESSAGE_LIMIT,
      });
      // The UI shows the gate; we just don't send. Defensive in case the
      // gate isn't visually rendered (race condition during transitions).
      return;
    }
    void track("counselor_message_sent", { sent_count: userMessagesThisSession + 1 });
    const userMsg: Msg = { role: "user", content: text.trim() };
    const allMessages = [...chatMessages, userMsg];
    setChatMessages(allMessages);
    setChatInput("");
    setChatLoading(true);

    // Lazy-create the DB session for authed users so each turn lands
    // in counselor_messages. Anon users get null → server keeps the
    // existing localStorage-only path.
    const sessionId = await ensureSession();

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
      { messages: allMessages, language, profile, reportSummary, sessionId },
      (chunk) => upsertAssistant(chunk),
      () => setChatLoading(false)
    );
  };

  // (Tracker functions removed along with the tracker tab — application
  // status is tracked inside Discover now.)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header — kept lean: back button, name, profile chips. The
          AI-Powered badge and "Your university planning dashboard"
          subtitle were filler. */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> {t("Back", "Назад")}
        </button>
        <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground tracking-tight">
          {isProfileFilled
            ? t(`Welcome, ${profile.fullName.split(" ")[0]}`, `Добро пожаловать, ${profile.fullName.split(" ")[0]}`)
            : t("Your dashboard", "Ваша панель")
          }
        </h1>
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
      </motion.div>

      {/* Saved-deadline urgency banner — surfaces if the user has a saved
          scholarship with a deadline in the next 14 days. Hidden when the
          user has no saved scholarships, no urgent ones, or has dismissed
          it for the day. Same component for Strategy and Counselor tabs
          (renders above the tablist so the urgency is visible whichever
          surface they're on). */}
      <SavedDeadlineBanner
        trackedIds={Array.from(new Set([...tracker.shortlist, ...Object.keys(tracker.statusMap)]))}
        isRu={isRu}
      />

      {/* Dashboard — two surfaces only: Strategy (the report) and Counselor (chat) */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
              <div className="flex flex-col gap-0.5">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent" />
                  {t("Your strategic brief", "Ваш стратегический брифинг")}
                </CardTitle>
                {pathwayGeneratedAt && !pathwayLoading && (() => {
                  const elapsed = Math.max(0, Date.now() - pathwayGeneratedAt);
                  const mins = Math.floor(elapsed / 60_000);
                  const hrs = Math.floor(mins / 60);
                  const days = Math.floor(hrs / 24);
                  const stamp =
                    mins < 1 ? t("just now", "только что")
                    : mins < 60 ? t(`${mins} min ago`, `${mins} мин. назад`)
                    : hrs < 24 ? t(`${hrs} hr ago`, `${hrs} ч. назад`)
                    : t(`${days}d ago`, `${days} дн. назад`);
                  return (
                    <p className="text-[11px] text-muted-foreground pl-7">
                      {t(`Generated ${stamp} · saved automatically`,
                         `Сгенерировано ${stamp} · сохранено автоматически`)}
                    </p>
                  );
                })()}
              </div>
              {pathwayGenerated && pathwayContent && (
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {/* Premium upgrade nudge — visible only when the user
                      ran the basic tier. Members see a quiet "Premium"
                      badge instead. */}
                  {isMember ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.14em] bg-gold/10 text-gold-dark border border-gold/30">
                      <Crown className="w-3 h-3" />
                      {t("Premium brief", "Премиум брифинг")}
                    </span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-gold-dark hover:bg-gold/10"
                      onClick={() => navigate(isRu ? "/pricing/ru" : "/pricing")}
                    >
                      <Crown className="w-4 h-4" />
                      {t("Upgrade for Premium brief", "Премиум брифинг")}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={generatePathway} disabled={pathwayLoading} className="gap-1.5">
                    {pathwayLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    {t("Regenerate", "Обновить")}
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
              {/* Focus-scholarship indicator — when the user arrived from
                  /scholarships/:id and asked us to build the strategy
                  around that scholarship, surface it explicitly so the
                  user knows the brief is being shaped around their pick.
                  Renders during generation AND on completed briefs. */}
              {focusScholarship && (
                <div className="not-prose mb-6 rounded-lg border border-gold/35 bg-gradient-to-br from-gold/[0.07] to-transparent px-4 py-3 flex items-start gap-3 print:hidden">
                  <Sparkles className="w-4 h-4 text-gold-dark mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-dark mb-1">
                      {t("Strategy focused around", "Стратегия выстроена вокруг")}
                    </p>
                    <p className="text-sm text-foreground font-semibold leading-snug truncate">
                      {focusScholarship.scholarshipName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFocusScholarship(null)}
                    className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-4 hover:underline shrink-0"
                  >
                    {t("Clear", "Сбросить")}
                  </button>
                </div>
              )}

              {pathwayLoading && !pathwayContent && (
                <GenerationPipeline profile={profile} isRu={isRu} />
              )}

              {/* Pro brief upgrade card — shown above the brief once it
                  finishes streaming, ONLY for non-member visitors who
                  haven't filled the depth fields yet. Clicking opens the
                  3-question dialog; saving regenerates the brief at
                  premium tier with the depth context. */}
              {pathwayContent && !pathwayLoading && !isMember && !hasProDepth && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="not-prose mb-8 rounded-xl border border-gold/40 bg-gradient-to-br from-gold/8 to-transparent p-5 sm:p-6 print:hidden"
                >
                  <div className="flex items-start gap-4 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-[0.18em] uppercase bg-gradient-to-r from-gold-dark to-gold text-primary mb-2">
                        <Crown className="w-3 h-3" />
                        {t("Pro brief", "Pro-брифинг")}
                      </div>
                      <h3 className="font-heading text-lg sm:text-xl font-bold tracking-tight text-foreground mb-1.5">
                        {t("Want this brief written more about you specifically?",
                           "Хотите чтобы брифинг был написан конкретно про вас?")}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {t("Three more questions — your activities, your story, your named target schools — and the AI rewrites the brief at premium tier. Strategic positioning, essay angles, and shortlist all reference your story directly. Free, no signup.",
                           "Ещё три вопроса — ваши активности, ваша история, конкретные университеты — и AI перепишет брифинг на премиум-уровне. Позиционирование, ракурсы эссе и шорт-лист будут ссылаться на вашу историю напрямую. Бесплатно, без регистрации.")}
                      </p>
                    </div>
                    <Button
                      variant="gold"
                      onClick={() => setProUnlockOpen(true)}
                      className="gap-1.5 shrink-0"
                    >
                      <Sparkles className="w-4 h-4" />
                      {t("Unlock Pro brief", "Открыть Pro-брифинг")}
                    </Button>
                  </div>
                </motion.div>
              )}

              {pathwayContent && (
                <FocusScholarshipContext.Provider value={focusScholarship?.scholarshipId ?? null}>
                <div className="grid xl:grid-cols-[1fr_220px] gap-x-10 print:block">
                <div id="printable-report" className="min-w-0 prose prose-sm max-w-none dark:prose-invert [&_h2]:text-foreground [&_h2]:font-heading [&_h2]:text-xl [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:scroll-mt-24 [&_h2]:tracking-[-0.01em] [&_h3]:text-foreground [&_h3]:font-heading [&_h3]:text-lg [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:text-muted-foreground [&_li]:text-muted-foreground [&_strong]:text-foreground">
                  {/* Editorial masthead — frames the brief as a real report
                      deliverable. Renders for both screen and print. Pulls
                      a synthesis sentence from the AI's strategic-positioning
                      paragraph (or falls back to a profile-derived line while
                      the brief is still streaming). Hosts the Share / Print /
                      Download actions inline so the user can act from the
                      cover without scrolling back to the card header. */}
                  <BriefMasthead
                    studentName={profile.fullName}
                    profile={{
                      gradeLevel: profile.gradeLevel,
                      major: profile.major,
                      targetCountries: profile.targetCountries,
                      nationality: profile.nationality,
                    }}
                    briefContent={pathwayContent}
                    isStreaming={pathwayLoading}
                    isRu={isRu}
                    isPro={isMember}
                    onShare={openShare}
                    onPrint={() => window.print()}
                    onDownloadPdf={() => window.print()}
                  />

                  {/* Hero KPI strip — first thing the user sees when the brief
                      lands. Numbers come from liveMatches + brief word count
                      so they re-render live as new sections stream in. */}
                  {!pathwayLoading && (
                    <BriefHeroStats
                      liveMatches={liveMatches}
                      briefContent={pathwayContent}
                      isRu={isRu}
                    />
                  )}

                  {/* 12-month deadline timeline — visceral urgency. Hidden
                      when there are <2 upcoming deadlines (component returns
                      null). Clicks send the user to Discover. */}
                  {!pathwayLoading && (
                    <DeadlineTimeline
                      liveMatches={liveMatches}
                      isRu={isRu}
                      onSelectMatch={() => navigate(isRu ? "/discover/ru" : "/discover")}
                    />
                  )}

                  {/* Combined funding stack viz — top 5 matches as a stacked
                      horizontal bar so the reader sees the money pile up. */}
                  {!pathwayLoading && (
                    <FundingStack liveMatches={liveMatches} isRu={isRu} />
                  )}

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

                  {/* Split the markdown into [positioning] and [rest] so the
                      Strategic Brief leads (analysis first), then the live
                      matches grid lights up urgency, then the rest of the
                      structured report unfolds. Falls back to the original
                      flow if the positioning section isn't found. */}
                  {(() => {
                    const all = pathwayContent.split(/(?=^##\s+)/m).filter(s => s.trim());
                    const posIdx = all.findIndex(s => PATHWAY_POS_SECTION_REGEX.test(s));
                    const before = posIdx >= 0 ? all.slice(0, posIdx + 1).join("") : "";
                    const after = posIdx >= 0 ? all.slice(posIdx + 1).join("") : pathwayContent;
                    return (
                      <>
                        {before && (
                          <ReportRenderer
                            markdown={before}
                            completedTasks={completedTasks}
                            onToggle={toggleTask}
                            taskKey={taskKey}
                            isRu={isRu}
                            onOpenDiscover={() => navigate(isRu ? "/discover/ru" : "/discover")}
                            liveMatches={liveMatches}
                            onSaveScholarship={handleSaveScholarship}
                            savedSet={tracker.shortlist}
                            structured={structuredBrief}
                            onRegenSection={reportGrade === "premium" ? regenerateSection : undefined}
                            regeneratingSectionId={regeneratingSectionId}
                            tier={reportGrade}
                          />
                        )}
                        {/* Live matches grid sits between the brief and the
                            structured plan. */}
                        {liveMatches.length > 0 && (() => {
                    const now = Date.now();
                    const urgent = liveMatches.filter(m => {
                      if (!m.application_deadline) return false;
                      const days = Math.ceil((new Date(m.application_deadline).getTime() - now) / 86400000);
                      return days > 0 && days <= 30;
                    }).length;
                    const stackUsd = liveMatches.reduce((sum, m) => sum + (m.estimated_total_value_usd || 0), 0);
                    const stackText = stackUsd >= 1_000_000
                      ? `$${(stackUsd / 1_000_000).toFixed(1)}M`
                      : stackUsd >= 1000
                        ? `$${Math.round(stackUsd / 1000)}K`
                        : "";
                    const top = liveMatches.slice(0, 6);
                    const unsavedTopCount = top.filter(m => !tracker.shortlist.has(m.scholarship_id)).length;
                    const saveAllTop = () => {
                      let added = 0;
                      for (const m of top) {
                        if (!tracker.shortlist.has(m.scholarship_id)) {
                          tracker.toggleShortlist(m.scholarship_id);
                          added++;
                        }
                      }
                      if (added > 0) {
                        toast.success(
                          isRu
                            ? `Сохранено ${added} в ваш pipeline`
                            : `Saved ${added} to your pipeline`,
                        );
                        void track("scholarship_saved", { surface: "brief_top_matches_bulk", count: added });
                      }
                    };
                    return (
                    <div className="not-prose mb-10">
                      <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark mb-1">
                            {t("Your top scholarship matches", "Ваши лучшие совпадения")}
                          </p>
                          <h3 className="font-heading text-base sm:text-lg font-bold text-foreground tracking-tight leading-tight">
                            {urgent > 0
                              ? (isRu
                                  ? `${urgent} ${urgent === 1 ? "дедлайн" : "дедлайна"} в ближайшие 30 дней`
                                  : `${urgent} deadline${urgent === 1 ? "" : "s"} in the next 30 days`)
                              : stackText
                                ? (isRu
                                    ? `Стек финансирования: ${stackText}`
                                    : `${stackText} in potential funding`)
                                : t("Pulled live from our database — sorted by deadline",
                                    "Подобрано из базы — по дедлайнам")}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {unsavedTopCount > 0 && (
                            <Button
                              variant="gold"
                              size="sm"
                              className="gap-1.5"
                              onClick={saveAllTop}
                              title={t("Save all top matches to your pipeline so you can track deadlines", "Сохранить все совпадения в pipeline для отслеживания дедлайнов")}
                            >
                              <Bookmark className="w-3.5 h-3.5" />
                              {t(`Save ${unsavedTopCount} to pipeline`, `Сохранить ${unsavedTopCount} в pipeline`)}
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="gap-1.5 hidden sm:flex" onClick={() => navigate(isRu ? "/discover/ru" : "/discover")}>
                            {t("See all", "Все")} <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-2.5">
                        {top.map((m) => {
                          const days = m.application_deadline ? Math.ceil((new Date(m.application_deadline).getTime() - Date.now()) / 86400000) : null;
                          const dl = !m.application_deadline ? t("Rolling", "Без срока") : days! <= 0 ? t("Closed", "Закрыт") : days! <= 30 ? `${days} ${t("days", "дн.")}` : days! <= 90 ? `${days} ${t("days", "дн.")}` : `${Math.ceil(days! / 30)} ${t("months", "мес.")}`;
                          const dlClass = !m.application_deadline ? "text-muted-foreground" : days! <= 7 ? "text-destructive font-semibold" : days! <= 30 ? "text-amber-700 dark:text-amber-400" : days! <= 90 ? "text-foreground/60" : "text-muted-foreground";
                          const isSaved = tracker.shortlist.has(m.scholarship_id);
                          const detailPath = `/scholarships/${m.scholarship_id}`;
                          return (
                            <div
                              key={m.scholarship_id}
                              className="group relative bg-card border border-border rounded-xl hover:border-gold/40 hover:shadow-sm transition-all"
                            >
                              <Link
                                to={detailPath}
                                className="block p-4 pr-12"
                                onClick={() => void track("scholarship_detail_opened", { surface: "brief_top_matches", scholarship_id: m.scholarship_id })}
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
                                <p className="text-xs text-muted-foreground truncate mb-2">
                                  {m.award_amount_text || (m.coverage_type === "full_ride" ? t("Full ride", "Полное покрытие") : m.coverage_type === "tuition_only" ? t("Tuition", "Обучение") : t("Stipend", "Стипендия"))}
                                  {m.provider_name && <span className="text-muted-foreground/60"> · {m.provider_name}</span>}
                                </p>
                                {m.verification_status && m.verification_status !== "pending" && (
                                  <VerifiedBadge
                                    status={m.verification_status}
                                    verifiedAt={m.last_verified_at ?? null}
                                    size="xs"
                                    compact
                                  />
                                )}
                              </Link>
                              <button
                                type="button"
                                aria-label={isSaved ? t("Remove from pipeline", "Убрать из pipeline") : t("Save to pipeline", "Сохранить в pipeline")}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleSaveScholarship(m.scholarship_id, m.scholarship_name);
                                  void track(isSaved ? "scholarship_unsaved" : "scholarship_saved", { surface: "brief_top_matches", scholarship_id: m.scholarship_id });
                                }}
                                className={`absolute top-3 right-3 h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
                                  isSaved
                                    ? "text-gold-dark bg-gold/10 hover:bg-gold/15"
                                    : "text-muted-foreground/60 hover:text-gold-dark hover:bg-gold/5 opacity-0 group-hover:opacity-100 focus:opacity-100"
                                }`}
                                title={isSaved ? t("Saved · click to remove", "Сохранено · убрать") : t("Save to your pipeline", "Сохранить в pipeline")}
                              >
                                {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <Button variant="outline" size="sm" className="w-full mt-3 gap-1.5 sm:hidden" onClick={() => navigate(isRu ? "/discover/ru" : "/discover")}>
                        {t("See all in Discover", "Открыть Discover")} <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    );
                  })()}

                        {after && (
                          <ReportRenderer
                            markdown={after}
                            completedTasks={completedTasks}
                            onToggle={toggleTask}
                            taskKey={taskKey}
                            isRu={isRu}
                            onOpenDiscover={() => navigate(isRu ? "/discover/ru" : "/discover")}
                            liveMatches={liveMatches}
                            onSaveScholarship={handleSaveScholarship}
                            savedSet={tracker.shortlist}
                            structured={structuredBrief}
                            onRegenSection={reportGrade === "premium" ? regenerateSection : undefined}
                            regeneratingSectionId={regeneratingSectionId}
                            tier={reportGrade}
                          />
                        )}
                        {/* Pro-only sections teaser — basic-tier non-Pro
                            users get a final block previewing the three
                            sections Pro adds (Career ROI, Visa, Budget).
                            Each card opens the comparison modal with the
                            matching gateId so funnel telemetry attributes
                            which Pro section the user clicked. */}
                        {!pathwayLoading && reportGrade === "basic" && !isMember && (
                          <ProSectionsTeaser isRu={isRu} />
                        )}
                      </>
                    );
                  })()}
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

                  {/* Brief artisanal footer — model + word count + timestamp.
                      Tiny premium touch the user sees only when they finish
                      reading. Print-only disclaimer stays separate below. */}
                  {!pathwayLoading && (
                    <div className="not-prose mt-10 pt-6 border-t border-border print:hidden">
                      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-[11px] text-muted-foreground">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="font-mono tabular-nums">
                            {pathwayContent.trim().split(/\s+/).filter(Boolean).length.toLocaleString(isRu ? "ru" : "en")} {t("words", "слов")}
                          </span>
                          <span className="text-muted-foreground/30">·</span>
                          <span>{t(`Generated ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
                                  `Создано ${new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}`)}</span>
                          <span className="text-muted-foreground/30">·</span>
                          <span>
                            {reportGrade === "premium"
                              ? <span className="inline-flex items-center gap-1 font-semibold text-gold-dark"><Crown className="w-2.5 h-2.5" /> {t("Pro tier", "Pro-уровень")}</span>
                              : <span>{t("Standard tier", "Базовый уровень")}</span>}
                          </span>
                        </div>
                        <span className="text-muted-foreground/50">
                          TopUni AI · v1.2
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Print-only footer disclaimer */}
                  <div className="print-only mt-12 pt-6 border-t border-foreground/20 hidden">
                    <p className="text-[10px] text-foreground/55 leading-relaxed m-0">
                      Generated by TopUni AI · topuni.com · This report is a starting point for your application strategy. Verify scholarship details, deadlines, and eligibility on official institution websites before applying. © {new Date().getFullYear()} TopUni Consulting.
                    </p>
                  </div>
                </div>
                {/* Sticky chapter nav — only when the brief has settled and
                    has multiple sections. Hidden under xl so mobile/tablet
                    keeps the brief full-width. */}
                {!pathwayLoading && (
                  <BriefChapterNav briefContent={pathwayContent} isRu={isRu} />
                )}
                </div>
                </FocusScholarshipContext.Provider>
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
                {/* LEFT RAIL — past chats + categorized prompts ─────────── */}
                <aside className="hidden lg:block">
                  <div className="sticky top-6 space-y-5">
                    {/* Past sessions disclosure (auth-only). Renders nothing
                        for anon users so the rail stays clean. */}
                    <CounselorSessions
                      isRu={isRu}
                      activeSessionId={chatSessionId}
                      onLoadSession={loadChatSession}
                      onNewSession={clearChat}
                      refreshKey={chatSessionId}
                    />
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
                    {/* Quiet Discover entry — replaces the heavy page-header
                        CTA card so chat-tab users still have a clean path. */}
                    <button
                      onClick={() => navigate(isRu ? "/discover/ru" : "/discover")}
                      className="group w-full text-left rounded-lg border border-border hover:border-gold/40 hover:bg-gold/5 transition-colors px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <Search className="w-3.5 h-3.5 text-gold-dark shrink-0" />
                        <span className="text-xs font-semibold text-foreground">
                          {t("Open Discover", "Открыть Discover")}
                        </span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground ml-auto group-hover:text-gold-dark group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                        {t("Browse the full scholarship database",
                           "Вся база стипендий")}
                      </p>
                    </button>

                    {/* Document upload — counselor reads transcript /
                        essay drafts / references and cites them in
                        answers. Auth-only; signed-out users see a
                        sign-in prompt. */}
                    <div className="pt-4 mt-4 border-t border-border">
                      <DocumentManager isRu={isRu} compact />
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
                        {/* Editorial empty state — feels like walking into an
                            office, not a chatbot. When the AI auto-greet is
                            in flight (greetingLoading), swap the static body
                            for a "preparing your opening" indicator so the
                            user knows something is being drafted just for
                            them rather than wondering if the page is hung. */}
                        <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto">
                          <div className="h-12 w-12 rounded-full bg-primary/5 flex items-center justify-center mb-4 ring-1 ring-primary/15">
                            {greetingLoading
                              ? <Loader2 className="w-5 h-5 text-primary animate-spin" />
                              : <Bot className="w-5 h-5 text-primary" />}
                          </div>
                          <h3 className="font-heading text-xl text-foreground mb-1.5">
                            {greetingLoading
                              ? t("Preparing your opening…", "Готовлю открытие…")
                              : firstName
                                ? t(`Hi ${firstName}.`, `Привет, ${firstName}.`)
                                : t("Welcome.", "Добро пожаловать.")}
                          </h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {greetingLoading
                              ? t("Reading your profile and brief — drafting a starting point in a second.",
                                  "Читаю ваш профиль и брифинг — через секунду подготовлю отправную точку.")
                              : referProfile
                              ? (pathwayContent && pathwayContent.length > 200
                                  ? t(`I have your profile and your strategy brief in front of me. Ask me anything — applications, essays, funding, tests, visa.`,
                                      `У меня уже есть ваш профиль и стратегический брифинг. Задайте любой вопрос — заявки, эссе, финансирование, тесты, виза.`)
                                  : t(`I have your profile in front of me. Generate your strategy brief on the Strategy tab and I'll have full context.`,
                                      `У меня уже есть ваш профиль. Сгенерируйте стратегический брифинг на вкладке Strategy — и я получу полный контекст.`))
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
                                  <EnrichedMarkdown
                                    scholarships={liveMatches.map(m => ({
                                      scholarship_id: m.scholarship_id,
                                      scholarship_name: m.scholarship_name,
                                      provider_name: m.provider_name ?? null,
                                      host_country: m.host_country,
                                      coverage_type: m.coverage_type,
                                      award_amount_text: m.award_amount_text,
                                      application_deadline: m.application_deadline,
                                      official_url: m.official_url ?? null,
                                    }))}
                                  >
                                    {msg.content}
                                  </EnrichedMarkdown>
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

                        {/* Suggested follow-ups — render below the LAST assistant
                            message when the bot isn't currently typing.

                            When the only assistant message is the AI auto-
                            greet (greetingFollowUps populated, chatMessages
                            length === 1), use the AI's bespoke follow-ups
                            — they reference the student's actual profile
                            and brief, much sharper than keyword-matched
                            static chips.

                            Otherwise fall back to the curated FOLLOWUPS
                            pool keyed off the most recent assistant
                            content. */}
                        {!chatLoading && chatMessages.length > 0 && chatMessages[chatMessages.length - 1].role === "assistant" && (() => {
                          const lastContent = chatMessages[chatMessages.length - 1].content.toLowerCase();

                          const useGreetingChips =
                            chatMessages.length === 1 && greetingFollowUps.length > 0;

                          let opts: string[];
                          if (useGreetingChips) {
                            opts = greetingFollowUps;
                          } else {
                            const FOLLOWUPS: { match: RegExp; en: string[]; ru: string[] }[] = [
                              { match: /essay|personal statement|sop|letter/i,
                                en: ["Help me draft this essay", "What hooks tend to work?", "Show me a strong opening line"],
                                ru: ["Помогите написать черновик", "Какие зацепки работают?", "Покажите сильное начало"] },
                              { match: /scholarship|funding|chevening|fulbright|daad/i,
                                en: ["Show me similar scholarships", "What are my real odds here?", "What's the application strategy?"],
                                ru: ["Покажите похожие стипендии", "Каковы реальные шансы?", "Какая стратегия подачи?"] },
                              { match: /visa|opt|stem|immigration/i,
                                en: ["Walk me through the timeline", "What documents do I need?", "Common rejection reasons?"],
                                ru: ["Расскажите о таймлайне", "Какие документы нужны?", "Частые причины отказов?"] },
                              { match: /gpa|grade|test|sat|ielts|toefl/i,
                                en: ["Where should I retest?", "How do I offset this?", "Schools that look past low scores?"],
                                ru: ["Где пересдать?", "Как это компенсировать?", "Школы, прощающие низкие баллы?"] },
                              { match: /interview|admissions|application/i,
                                en: ["Common interview questions?", "What signals strong fit?", "How early should I apply?"],
                                ru: ["Частые вопросы на интервью?", "Что показывает хороший fit?", "Когда лучше подать?"] },
                            ];
                            const matched = FOLLOWUPS.find(g => g.match.test(lastContent));
                            const generic = {
                              en: ["What should I focus on this month?", "What gaps am I missing?", "What's the next concrete step?"],
                              ru: ["На чём сфокусироваться в этом месяце?", "Какие пробелы я упускаю?", "Какой следующий шаг?"],
                            };
                            opts = matched ? (isRu ? matched.ru : matched.en) : (isRu ? generic.ru : generic.en);
                          }
                          return (
                            <motion.div
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.4, delay: 0.2 }}
                              className="flex flex-wrap gap-2 pl-9 pt-1"
                            >
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70 self-center mr-1">
                                {useGreetingChips ? t("Start with", "Начать с") : t("Try", "Спросить")}
                              </span>
                              {opts.map((p, i) => (
                                <button
                                  key={i}
                                  onClick={() => sendChatMessage(p)}
                                  className="text-xs px-3 py-1.5 rounded-full border border-border text-foreground/75 hover:border-gold/40 hover:bg-gold/5 hover:text-foreground transition-all"
                                >
                                  {p}
                                </button>
                              ))}
                            </motion.div>
                          );
                        })()}
                      </>
                    )}
                  </div>

                  <div className="border-t border-border p-3 shrink-0 bg-card">
                    {counselorGated ? (
                      // Free-message cap reached — replace input with a
                      // soft Pro upgrade card. PremiumGate fires gate_seen
                      // + gate_upgrade_clicked into the analytics_events
                      // table for funnel telemetry.
                      <PremiumGate
                        gateId="counselor-free-limit"
                        headline={t(
                          `You've sent ${COUNSELOR_FREE_MESSAGE_LIMIT} free counselor messages — unlock unlimited with Pro`,
                          `Вы отправили ${COUNSELOR_FREE_MESSAGE_LIMIT} бесплатных сообщений — Pro даёт безлимит`,
                        )}
                        subline={t(
                          "Pro lets you keep iterating with the counselor on essay drafts, deadline plans, country pivots — no limit.",
                          "Pro даёт безлимит общения с советником: эссе, дедлайны, смена стран — без ограничений.",
                        )}
                      >
                        <div className="h-32 rounded-xl border border-border bg-background opacity-50 flex items-center justify-center text-sm text-muted-foreground">
                          {t("Continue the conversation with Pro", "Продолжите общение с Pro")}
                        </div>
                      </PremiumGate>
                    ) : (
                      <>
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
                        <div className="flex items-baseline justify-between gap-2 mt-1.5 px-1">
                          <p className="text-[10px] text-muted-foreground/70">
                            {t("Counselor uses your profile and report for context. Always sanity-check critical dates.",
                               "Советник использует ваш профиль и отчёт. Всегда перепроверяйте важные даты.")}
                          </p>
                          {!isMember && !hasProDepth && userMessagesThisSession >= 3 && (
                            <p className="text-[10px] text-amber-700 dark:text-amber-400 tabular-nums shrink-0">
                              {t(
                                `${COUNSELOR_FREE_MESSAGE_LIMIT - userMessagesThisSession} free message${COUNSELOR_FREE_MESSAGE_LIMIT - userMessagesThisSession === 1 ? "" : "s"} left`,
                                `${COUNSELOR_FREE_MESSAGE_LIMIT - userMessagesThisSession} бесплатн. сообщ.`,
                              )}
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </Card>
              </div>
            );
          })()}
        </TabsContent>

      </Tabs>

      {/* ─── Pro brief unlock dialog — captures the 3 depth fields on
          demand. Saving persists to localStorage AND triggers a new
          generation at premium tier with the depth context. ─────── */}
      <ProBriefUnlock
        open={proUnlockOpen}
        onOpenChange={setProUnlockOpen}
        initial={proDepth}
        language={language}
        onSubmit={(depth) => {
          setProDepth(depth);
          try { localStorage.setItem(PRO_DEPTH_KEY, JSON.stringify(depth)); } catch { /* ignore */ }
          // Regenerate at the deeper tier with the new context. The
          // reportGrade derivation already flips to premium when
          // hasProDepth becomes true on the next render — but we kick
          // off the call here directly to avoid one render of stale
          // basic content showing before the regen starts.
          setTimeout(() => generatePathway(), 50);
        }}
      />

      {/* ─── Save-your-brief signup prompt (anon users only) ─────── */}
      {!user && (
        <SaveBriefPrompt
          open={savePromptOpen}
          onOpenChange={(o) => {
            setSavePromptOpen(o);
            if (!o) {
              try { sessionStorage.setItem("topuni-save-prompt-dismissed", "1"); } catch { /* ignore */ }
            }
          }}
          defaultEmail={profile.email}
          language={language}
          payload={{
            profile: {
              fullName: profile.fullName,
              email: profile.email,
              gradeLevel: profile.gradeLevel,
              gpa: profile.gpa,
              ielts: profile.ielts,
              sat: profile.sat,
              targetCountries: profile.targetCountries,
              major: profile.major,
              budget: profile.budget,
              scholarshipNeeded: profile.scholarshipNeeded,
              timeline: profile.timeline,
              prestige: profile.prestige,
              scholarshipPriority: profile.scholarship,
              careerRoi: profile.careerRoi,
              visaAccess: profile.visaAccess,
              locationPref: profile.locationPref,
            },
            pathway: pathwayContent && pathwayContent.length > 200
              ? {
                  content: pathwayContent,
                  language,
                  grade: reportGrade,
                  profileHash,
                }
              : undefined,
            createdAt: Date.now(),
          }}
        />
      )}

      {/* ─── Share dialog ──────────────────────────────────────────
          Mints (or shows) a public /brief/:slug URL the student can
          send to parents/counselors. Shows expiry messaging for anon
          users; gently prompts signup for permanence. */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-tight">
              {t("Share your strategic brief", "Поделиться стратегическим брифингом")}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              {t(
                "Anyone with the link can view this brief. Use it for parents, counselors, or your own reference.",
                "Любой, у кого есть ссылка, увидит этот брифинг. Удобно для родителей, консультантов или себя."
              )}
            </DialogDescription>
          </DialogHeader>

          {shareLoading ? (
            <div className="py-10 flex flex-col items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                {t("Generating share link…", "Создаём ссылку…")}
              </p>
            </div>
          ) : shareUrl ? (
            <div className="space-y-4 py-2">
              {/* The URL with copy button */}
              <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-lg px-3 py-2.5">
                <code className="text-xs sm:text-sm text-foreground flex-1 truncate font-mono">
                  {shareUrl}
                </code>
                <Button
                  variant={shareCopied ? "outline" : "gold"}
                  size="sm"
                  className="gap-1.5 shrink-0"
                  onClick={copyShareUrl}
                >
                  {shareCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      {t("Copied", "Скопировано")}
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      {t("Copy", "Копировать")}
                    </>
                  )}
                </Button>
              </div>

              {/* Email-me-my-brief — sends a polished HTML email to the
                  user's inbox (or any address they type). Uses the existing
                  send-transactional-email pipeline + brief-generated template. */}
              <div className="rounded-lg border border-border bg-card p-3.5 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-gold-dark shrink-0" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-dark">
                    {t("Email me my brief", "Прислать мне на почту")}
                  </p>
                </div>
                {emailMeStatus === "sent" ? (
                  <div className="flex items-center gap-2 text-xs text-success">
                    <Check className="w-3.5 h-3.5" />
                    <span>{t("Sent — check your inbox", "Отправлено — проверьте почту")}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Input
                        type="email"
                        value={emailMeAddress || profile.email || user?.email || ""}
                        onChange={(e) => setEmailMeAddress(e.target.value)}
                        placeholder={t("you@example.com", "почта@example.com")}
                        className="h-9 text-sm flex-1"
                        disabled={emailMeSending}
                      />
                      <Button
                        variant="gold"
                        size="sm"
                        className="gap-1.5 shrink-0"
                        onClick={sendBriefEmail}
                        disabled={emailMeSending}
                      >
                        {emailMeSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                        {emailMeSending ? t("Sending…", "Отправка…") : t("Send", "Отправить")}
                      </Button>
                    </div>
                    {emailMeStatus === "error" && (
                      <p className="text-[11px] text-destructive leading-snug">
                        {t("Couldn't send — check the address and try again.",
                           "Не удалось отправить — проверьте адрес и попробуйте снова.")}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Quick share targets — mailto (forward to others) + native share */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  asChild
                >
                  <a
                    href={`mailto:?subject=${encodeURIComponent(
                      t("My TopUni admissions strategy", "Моя стратегия поступления — TopUni")
                    )}&body=${encodeURIComponent(shareUrl)}`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    {t("Forward", "Переслать")}
                  </a>
                </Button>
                {typeof navigator !== "undefined" && "share" in navigator && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => navigator.share?.({ url: shareUrl, title: "My TopUni strategy" }).catch(() => {})}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    {t("More", "Ещё")}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 ml-auto"
                  asChild
                >
                  <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5" />
                    {t("Preview", "Превью")}
                  </a>
                </Button>
              </div>

              {/* Expiry / persistence messaging */}
              {shareExpiresAt ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3.5 text-xs leading-relaxed">
                  <p className="text-amber-700 dark:text-amber-400 font-medium mb-1">
                    {t(
                      `This link expires in 30 days.`,
                      `Эта ссылка истекает через 30 дней.`
                    )}
                  </p>
                  <p className="text-muted-foreground">
                    {t(
                      "Sign up free to keep it permanent and editable, plus deadline reminders for any scholarship you save.",
                      "Зарегистрируйтесь бесплатно, чтобы ссылка не истекала и пришли напоминания о дедлайнах."
                    )}
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  {t(
                    "This link is permanent — you can revoke it any time from your account.",
                    "Ссылка постоянная — вы можете отозвать её в любой момент."
                  )}
                </p>
              )}
            </div>
          ) : (
            <div className="py-6 text-sm text-muted-foreground">
              {t("Couldn't create the share link. Try again?", "Не удалось создать ссылку. Попробуйте ещё раз?")}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShareOpen(false)}>
              {t("Done", "Готово")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TopUniDashboard;
