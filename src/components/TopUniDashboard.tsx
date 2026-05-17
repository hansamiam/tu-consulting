import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Award,
  GraduationCap,
  Bot,
  Loader2,
  Send,
  ArrowLeft,
  Search,
  ArrowRight,
  BookOpen,
  ExternalLink,
  Calendar,
  Zap,
  RotateCcw,
  Compass,
  PenLine,
  Wallet,
  FileText,
  Plane,
  Lightbulb,
  AlertTriangle,
  Quote,
  Check,
  Share2,
  Copy,
  Mail,
  Crown,
  Shield,
  Bookmark,
  BookmarkCheck,
  RefreshCw,
  ChevronDown,
  Layers,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminUser } from "@/lib/adminMode";
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
// ProSectionsTeaser import retired 2026-05-10 — paywall chrome
// consolidated to the single Pro brief upgrade card below the brief.
import { SavedDeadlineBanner } from "@/components/SavedDeadlineBanner";
// PremiumSection import retired 2026-05-10 — Career ROI / Visa pathway
// custom renderers were dropped alongside the brief consolidation.
import { CombinedFundingChart } from "@/components/brief/CombinedFundingChart";
import { useApplicationTracker } from "@/hooks/useApplicationTracker";
import { track } from "@/lib/analytics";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { ENV, EDGE_FUNCTIONS_URL } from "@/lib/env";
import { cleanScholarshipName, cleanProvider, compactAward } from "@/lib/scholarshipFields";
import { BriefMagazine } from "@/components/brief/BriefMagazine";
import type { BriefSections, SectionId } from "@/components/brief/types";
import { serializeBriefForCounselor } from "@/components/brief/serializeForCounselor";

interface StudentProfile {
  fullName: string;
  email: string;
  whatsapp: string;
  /* Where the student is from. Used by the brief generator to tailor
   * eligibility framing ("for ambitious students applying internationally
   * (this student is from {nationality})") and to bias scholarships
   * that name this nationality in their eligible_countries list. */
  nationality: string;
  gradeLevel: string;
  gpa: string;
  ielts: string;
  toefl: string;
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

const PATHWAY_URL = `${EDGE_FUNCTIONS_URL}/topuni-ai-pathway`;

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
                    ? "Недели 1–2 — бесплатно. Pro раскрывает недели 3–12 с задачами по каждой неделе и отслеживанием прогресса."
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
    const buckets: { heading: string; items: { name: string; headline: string; details: string[] }[] }[] = [];
    let cur: typeof buckets[number] | null = null;
    /* The premium + basic prompts emit each university as ONE
     * `**Name**` bullet followed by 1-3 plain bullets describing the
     * program / acceptance rate / USP. Earlier the parser flushed on
     * every bullet, so a single university with 4 bullets rendered
     * as 4 separate cards in the grid — visual chaos and double-
     * counting.
     *
     * The fix: track the current item, and treat a non-`**`-starting
     * bullet as a sub-detail to append to the current item. A new
     * `**` bullet flushes the current item and starts a new one. */
    let curItem: typeof buckets[number]["items"][number] | null = null;
    let pendingLines: string[] = [];

    const flushPendingIntoCurItem = () => {
      if (!curItem || pendingLines.length === 0) return;
      const text = pendingLines.join(" ").replace(/\s+/g, " ").trim();
      pendingLines = [];
      if (text) curItem.details.push(text);
    };

    const startNewItem = (bulletText: string) => {
      if (!cur) return;
      flushPendingIntoCurItem();
      const m = bulletText.match(/^\*\*([^*]+)\*\*\s*[—–-]?\s*(.*)$/);
      if (m) {
        curItem = { name: m[1].trim(), headline: m[2].trim(), details: [] };
      } else {
        curItem = { name: bulletText.replace(/\*\*/g, "").trim(), headline: "", details: [] };
      }
      cur.items.push(curItem);
    };

    /* 2026-05-10 pivot: scholarship-first format is FLAT — no ###
     * sub-headings, just 3 `**Name**` bullets. Pre-pivot the parser
     * required at least one ### heading or buckets stayed empty and
     * the section rendered as null. The implicit bucket below is
     * lazily created when we see a bullet without an active bucket
     * so the new format renders cleanly while old cached briefs
     * (with three explicit ### buckets) still parse identically. */
    const ensureBucket = () => {
      if (cur) return;
      cur = { heading: "", items: [] };
      buckets.push(cur);
    };

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) { flushPendingIntoCurItem(); continue; }
      if (line.startsWith("## ")) {
        title = line.slice(3).trim();
      } else if (line.startsWith("### ")) {
        flushPendingIntoCurItem();
        curItem = null;
        cur = { heading: line.slice(4).trim(), items: [] };
        buckets.push(cur);
      } else if (/^([-*]|\d+\.)\s+/.test(line)) {
        ensureBucket();
        const bulletText = line.replace(/^([-*]|\d+\.)\s+/, "").trim();
        // A bullet starting with `**Name**` is a new university; a
        // bullet without it is a sub-detail under the current item.
        if (/^\*\*[^*]+\*\*/.test(bulletText)) {
          startNewItem(bulletText);
        } else if (curItem) {
          flushPendingIntoCurItem();
          pendingLines = [bulletText];
        } else {
          // No anchor `**` row yet — fall back to treating it as a
          // standalone item so we don't drop content silently.
          startNewItem(bulletText);
        }
      } else if (curItem) {
        pendingLines.push(line);
      }
    }
    flushPendingIntoCurItem();
    return { title, buckets: buckets.filter(b => b.items.length > 0) };
  }, [markdown]);

  if (buckets.length === 0) return null;

  // Map bucket index → tier accent. With the 2026-05-10 scholarship-
  // first flat format (single implicit bucket) every school is gold-
  // tier since all three are illustrative landings of the funding
  // pathway, not ranked tiers. With the legacy bucketed format
  // (3 ### sub-headings: Strong fits / Aligned / Worth keeping) we
  // keep the gold→navy→muted ladder so old cached briefs render the
  // same as before.
  const tierFor = (i: number, total: number) => {
    if (total === 1) return { kicker: "text-gold-dark", strip: "from-gold-light via-gold-dark to-gold-light" };
    if (i === 0) return { kicker: "text-gold-dark", strip: "from-gold-light via-gold-dark to-gold-light" };
    if (i === total - 1) return { kicker: "text-muted-foreground", strip: "from-muted-foreground/30 to-muted-foreground/50" };
    return { kicker: "text-primary", strip: "from-primary/60 via-primary to-primary/60" };
  };

  return (
    <div className="not-prose my-10">
      <div className="flex items-baseline justify-between gap-3 mb-6">
        <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {title || (isRu ? "Куда ведут ваши стипендии" : "Schools where these scholarships land you")}
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
                    {item.headline && (
                      <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                        {renderInline(item.headline)}
                      </p>
                    )}
                    {item.details.length > 0 && (
                      <ul className="text-[11px] text-muted-foreground/85 leading-relaxed space-y-0.5 list-disc pl-4 marker:text-muted-foreground/40">
                        {item.details.map((d, di) => (
                          <li key={di}>{renderInline(d)}</li>
                        ))}
                      </ul>
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

const FundingShortlist = ({ markdown, liveMatches, isRu, onOpenDiscover, combinedFunding, onRegen, isRegenerating, tier = "premium", onSaveScholarship, savedSet }: {
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
  /** Inline save handler — turns each matched item into an actionable
   *  workspace card instead of a read-only list entry. Mirrors the
   *  top-matches grid pattern. SharedBrief leaves these undefined. */
  onSaveScholarship?: (id: string, name: string) => void;
  savedSet?: Set<string>;
}) => {
  const { title, items, stack } = useMemo(() => {
    const lines = markdown.split("\n");
    let title = "";
    let stack = "";
    type Item = { name: string; headline: string; details: string[] };
    const items: Item[] = [];
    let curItem: Item | null = null;
    let pendingLines: string[] = [];

    const flushPendingIntoCurItem = () => {
      if (!curItem || pendingLines.length === 0) return;
      const text = pendingLines.join(" ").replace(/\s+/g, " ").trim();
      pendingLines = [];
      if (text) curItem.details.push(text);
    };

    const startNewItem = (bulletText: string) => {
      flushPendingIntoCurItem();
      const m = bulletText.match(/^\*\*([^*]+)\*\*\s*[—–-]?\s*(.*)$/);
      if (m) {
        curItem = { name: m[1].trim(), headline: m[2].trim(), details: [] };
      } else {
        curItem = { name: bulletText.replace(/\*+/g, "").trim(), headline: "", details: [] };
      }
      items.push(curItem);
    };

    // Stack callout — the consolidated 2026-05-10 prompt asks the LLM
    // to end the funding section with a single one-line "Stack:" /
    // "**Stack:**" / "Стек:" callout naming a plausible 2-scholarship
    // combination that fully funds the student. Detect it before the
    // bulleted-item parser so it doesn't get captured as a sub-detail
    // of the last item.
    const stackRegex = /^\s*\**\s*(stack|стек)\s*\**\s*[:.]?\s*\**\s*(.+?)\s*\**\s*$/i;

    /* Each scholarship in the prompt is one `**Name**` bullet plus 1-2
     * plain sub-bullets (why-fits, deadline). Pre-fix the parser
     * flushed on every bullet, so a single scholarship became 2-3
     * separate cards — confusing + visually broken. Now sub-bullets
     * append to the current item's details list. */
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) { flushPendingIntoCurItem(); continue; }
      if (line.startsWith("## ")) {
        title = line.slice(3).trim();
        continue;
      }
      // Pull the stack callout out of the flow — only when it's NOT a
      // bulleted line (the LLM may emit it as a plain paragraph or
      // bold paragraph at the section's tail). The match needs the
      // value capture to look like a real stack ("Chevening + Aga
      // Khan = ~$80K"), not just an item starting with "stack" by
      // coincidence.
      if (!/^([-*]|\d+\.)\s+/.test(line)) {
        const m = line.match(stackRegex);
        if (m && !stack && m[2].length >= 8) {
          stack = m[2].trim().replace(/\*+/g, "");
          continue;
        }
      }
      if (/^([-*]|\d+\.)\s+/.test(line)) {
        const bulletText = line.replace(/^([-*]|\d+\.)\s+/, "").trim();
        if (/^\*\*[^*]+\*\*/.test(bulletText)) {
          startNewItem(bulletText);
        } else if (curItem) {
          flushPendingIntoCurItem();
          pendingLines = [bulletText];
        } else {
          startNewItem(bulletText);
        }
      } else if (curItem && !line.startsWith("#")) {
        pendingLines.push(line);
      }
    }
    flushPendingIntoCurItem();
    // Backwards-compat: keep `detail` for downstream code that already
    // reads it. Compose from headline + first detail line so existing
    // call sites (single-line render) still see something useful while
    // the new sub-bullet UI consumes details[].
    return {
      title,
      stack,
      items: items.map(it => ({
        ...it,
        detail: [it.headline, ...it.details].filter(Boolean).join(" · "),
      })),
    };
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
          const isSaved = isLinked && savedSet?.has(it.match!.scholarship_id);
          // Matched items: clickable Link → detail page (specific, actionable),
          // not /discover (generic dump). Inline save button + verified badge
          // make each card a workspace surface instead of a read-only entry.
          // Unmatched items (AI mentioned a scholarship not in our DB) render
          // muted with a tooltip — same trust-signaling pattern the EnrichedMarkdown
          // uses for fall-back bolds.
          if (isLinked) {
            const m = it.match!;
            return (
              <div
                key={`fund-${i}`}
                className="group relative bg-card border border-border rounded-xl hover:border-gold/40 hover:shadow-sm transition-all"
              >
                <div className="absolute left-0 inset-y-0 w-[2px] bg-gold-dark/60" />
                <Link
                  to={`/scholarships/${m.scholarship_id}`}
                  onClick={() => void track("scholarship_detail_opened", { surface: "brief_funding_shortlist", scholarship_id: m.scholarship_id })}
                  className="block px-5 py-4 pr-12"
                >
                  <div className="flex items-baseline justify-between gap-3 mb-2">
                    <h4 className="font-heading font-semibold text-[15px] text-foreground tracking-tight leading-snug min-w-0 truncate group-hover:text-gold-dark transition-colors">
                      {it.name}
                    </h4>
                    <div className="flex items-center gap-3 text-[11px] tabular-nums shrink-0">
                      {m.estimated_total_value_usd ? (
                        <span className="text-gold-dark font-semibold">{fmtMoney(m.estimated_total_value_usd)}</span>
                      ) : null}
                      {dl && <span className={`font-semibold ${dlClass}`}>{dl}</span>}
                    </div>
                  </div>
                  {it.detail && (
                    <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                      {renderInline(it.detail)}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground group-hover:text-gold-dark transition-colors inline-flex items-center gap-0.5">
                      {isRu ? "Открыть детали" : "Open detail"} <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
                {onSaveScholarship && (
                  <button
                    type="button"
                    aria-label={isSaved ? (isRu ? "Убрать из pipeline" : "Remove from pipeline") : (isRu ? "Сохранить в pipeline" : "Save to pipeline")}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onSaveScholarship(m.scholarship_id, m.scholarship_name);
                      void track(isSaved ? "scholarship_unsaved" : "scholarship_saved", { surface: "brief_funding_shortlist", scholarship_id: m.scholarship_id });
                    }}
                    className={`absolute top-3 right-3 h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
                      isSaved
                        ? "text-gold-dark bg-gold/10 hover:bg-gold/15"
                        : "text-muted-foreground/60 hover:text-gold-dark hover:bg-gold/5 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                    }`}
                    title={isSaved ? (isRu ? "Сохранено · убрать" : "Saved · click to remove") : (isRu ? "Сохранить в pipeline" : "Save to your pipeline")}
                  >
                    {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  </button>
                )}
              </div>
            );
          }
          // Unmatched item — AI mentioned a name we don't have in the DB.
          // Render it muted with a tooltip so the user knows to verify
          // independently. Same trust-signaling pattern as EnrichedMarkdown
          // unmatched bolds.
          return (
            <div
              key={`fund-${i}`}
              className="group relative bg-muted/20 border border-dashed border-border rounded-xl px-5 py-4 overflow-hidden"
              title={isRu
                ? "Не найдено в проверенной базе TopUni — проверьте на официальном сайте перед подачей."
                : "Not yet matched in TopUni's verified scholarship database — please verify on the official source before applying."}
            >
              <div className="absolute left-0 inset-y-0 w-[2px] bg-muted-foreground/30" />
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <h4 className="font-heading font-semibold text-[15px] text-foreground/65 tracking-tight leading-snug min-w-0 truncate underline decoration-dotted decoration-foreground/30 underline-offset-2">
                  {it.name}
                </h4>
              </div>
              {it.detail && (
                <p className="text-xs text-muted-foreground/70 leading-relaxed">
                  {renderInline(it.detail)}
                </p>
              )}
            </div>
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
                      ? "Топ-3 видны бесплатно. Pro раскрывает все ранжированные совпадения со стратегией под каждое и разбивкой оценки соответствия."
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

      {/* Stack callout — the consolidated 2026-05-10 funding-section
          prompt asks the LLM to end the section with a single one-line
          "Stack:" combination. Lift it into a distinct editorial moment
          so it doesn't dissolve into the last item's details. Same
          visual register as the 30-day call in positioning — gold
          left-rail callout with a chip eyebrow. */}
      {stack && (
        <div className="mt-6 relative bg-gradient-to-br from-gold-light/10 to-card border-l-[3px] border-gold-dark rounded-r-xl rounded-l-sm p-5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Layers className="w-4 h-4 text-gold-dark" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-dark">
              {isRu ? "Стек финансирования" : "Funding stack"}
            </span>
          </div>
          <p className="font-heading text-base sm:text-lg leading-snug text-foreground tracking-tight">
            {renderInline(stack)}
          </p>
        </div>
      )}
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
const EssayAngles = ({ markdown, isRu, onAskCounselor }: { markdown: string; isRu: boolean; onAskCounselor?: (question: string) => void }) => {
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
            {onAskCounselor && (
              <button
                type="button"
                onClick={() => onAskCounselor(
                  isRu
                    ? `Хочу развить эссе вокруг этого угла: "${a.concept}". Помогите со структурой и зацепкой.`
                    : `I want to draft my essay around this angle: "${a.concept}". Help me with the structure and hook.`,
                )}
                className="mt-4 pt-3 border-t border-border/60 inline-flex items-center gap-1.5 text-[11px] font-semibold text-gold-dark hover:text-foreground transition-colors group/cta self-start"
              >
                <Bot className="w-3 h-3" />
                {isRu ? "Развить с советником" : "Draft with the counselor"}
                <ArrowRight className="w-2.5 h-2.5 transition-transform group-hover/cta:translate-x-0.5" />
              </button>
            )}
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
const HonestGaps = ({ markdown, isRu, onAskCounselor }: { markdown: string; isRu: boolean; onAskCounselor?: (question: string) => void }) => {
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
                <div className="mt-3 pt-3 border-t border-border/60">
                  <div className="flex items-start gap-2">
                    <Zap className="w-3.5 h-3.5 text-gold-dark mt-0.5 shrink-0" />
                    <p className="text-xs font-medium text-foreground leading-relaxed">
                      {renderInline(g.action)}
                    </p>
                  </div>
                  {onAskCounselor && (
                    <button
                      type="button"
                      onClick={() => onAskCounselor(
                        isRu
                          ? `Помогите закрыть пробел "${g.headline}". Действие из брифинга: "${g.action}". Какой следующий шаг?`
                          : `Help me close the gap: "${g.headline}". The action from my brief is: "${g.action}". What's the next concrete step?`,
                      )}
                      className="mt-2.5 ml-5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-gold-dark hover:text-foreground transition-colors group/cta"
                    >
                      <Bot className="w-3 h-3" />
                      {isRu ? "Спросить советника" : "Ask the counselor"}
                      <ArrowRight className="w-2.5 h-2.5 transition-transform group-hover/cta:translate-x-0.5" />
                    </button>
                  )}
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
const StrategicPositioning = ({ markdown, isRu, onRegen, isRegenerating, onAskCounselor }: { markdown: string; isRu: boolean; onRegen?: (id: string) => void; isRegenerating?: boolean; onAskCounselor?: (question: string) => void }) => {
  const { title, pullQuote, body, call } = useMemo(() => {
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
    let body = bodyLines.join("\n").trim();
    // Pull-quote extraction — the consolidated 2026-05-10 prompt asks
    // the LLM to OPEN the section with a single ≤30-word thesis
    // sentence as the report's editorial pull-quote, then 1-2 paragraphs
    // of analysis. Render the opener as a stand-alone editorial line
    // above the body so it lands like a magazine deck rather than
    // dissolving into the first paragraph. Heuristic: take the first
    // sentence (up to a period that's followed by a space + capital
    // letter or end of line/paragraph) IF it's reasonably short. If
    // the LLM didn't produce a pull-quote-shaped opener, leave body
    // as-is and skip the callout.
    let pullQuote = "";
    if (body) {
      // Strip leading bold/italic markers from the first line so the
      // pull-quote regex picks up a clean sentence.
      const firstParaEnd = body.indexOf("\n\n");
      const firstPara = firstParaEnd === -1 ? body : body.slice(0, firstParaEnd);
      const stripped = firstPara.replace(/^\*+\s*|\s*\*+$/g, "").trim();
      const sentenceMatch = stripped.match(/^([^.!?]{8,180}[.!?])(?:\s+|$)/);
      if (sentenceMatch) {
        const candidate = sentenceMatch[1].trim();
        const wordCount = candidate.split(/\s+/).filter(Boolean).length;
        // Pull-quote shape: 8-35 words, ends with strong punctuation,
        // not just a decorative one-liner. Stricter than the prompt's
        // 30-word cap so close-to-the-line LLM outputs still extract.
        if (wordCount >= 8 && wordCount <= 35) {
          pullQuote = candidate;
          // Remove the pull-quote sentence from body so it doesn't
          // duplicate. Use the original (un-stripped) match length so
          // we don't accidentally cut into the second sentence.
          const idx = body.indexOf(candidate);
          if (idx !== -1) {
            body = body.slice(0, idx) + body.slice(idx + candidate.length).trimStart();
            body = body.trim();
          }
        }
      }
    }
    return { title, pullQuote, body, call };
  }, [markdown]);

  if (!body && !call && !pullQuote) return null;

  return (
    <div className="not-prose my-10">
      <div className="flex items-center gap-2 mb-3">
        <span className="h-px w-8 bg-gold-dark" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark">
          {isRu ? "Стратегический отчёт" : "Strategy report"}
        </span>
        <SectionRegenButton sectionId="positioning" onRegen={onRegen} isRegenerating={isRegenerating} isRu={isRu} />
      </div>
      <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-4 leading-tight">
        {title || (isRu ? "Стратегическое позиционирование" : "Strategic positioning")}
      </h2>
      {pullQuote && (
        // Editorial deck — the pull-quote thesis sentence the prompt
        // asks for, lifted into its own typographic moment. Heavier
        // weight than the body, italicised slightly for editorial feel,
        // a thin gold underscore tying it to the section accent.
        <p className="font-heading text-xl sm:text-2xl italic font-semibold text-foreground/95 leading-snug tracking-[-0.01em] mb-5 pb-5 border-b border-gold/30">
          {pullQuote}
        </p>
      )}
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
          {onAskCounselor && (
            // The 30-day call is the most actionable thing in the entire
            // brief. One tap routes the user to the counselor with a
            // prefilled "help me execute this" question — closing the
            // loop between strategic insight and concrete coaching.
            <button
              type="button"
              onClick={() => onAskCounselor(
                isRu
                  ? `Помогите мне реализовать этот шаг на 30 дней из моего брифинга: "${call}"`
                  : `Help me execute this 30-day call from my brief: "${call}"`,
              )}
              className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-gold-dark hover:text-foreground transition-colors group/cta"
            >
              <Bot className="w-3.5 h-3.5" />
              {isRu ? "Спланировать с советником" : "Plan this with the counselor"}
              <ArrowRight className="w-3 h-3 transition-transform group-hover/cta:translate-x-0.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/* FinalWord component retired 2026-05-10 — the "## Final word" section
   was dropped from PREMIUM_SECTIONS in the brief consolidation, so the
   editorial closing block had no markdown to render. Stale cached
   briefs that still contain a Final word section fall through to the
   generic EnrichedMarkdown renderer. */

const PATHWAY_POS_SECTION_REGEX = /^##\s+.*?(strategic positioning|positioning|стратегическое позиционирование|позиционирование)/i;
const PATHWAY_PLAN_SECTION_REGEX = /^##\s+.*?(action plan|90.day|план действий)/i;
const PATHWAY_UNIS_SECTION_REGEX = /^##\s+.*?(university shortlist|your university|schools where|куда ведут|шорт.лист университетов)/i;
const PATHWAY_FUND_SECTION_REGEX = /^##\s+.*?(funding pathway|funding deep|финансирование|стипендии)/i;
const PATHWAY_ESSAYS_SECTION_REGEX = /^##\s+.*?(essay angle|essay angles|углов? для эссе|эссе)/i;
const PATHWAY_GAPS_SECTION_REGEX = /^##\s+.*?(honest gap|gaps to close|пробел|недотяг|слабые)/i;
// PATHWAY_FINAL_SECTION_REGEX retired 2026-05-10 — Final-word section
// dropped from PREMIUM_SECTIONS, so the matcher had nothing to match.

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
// PATHWAY_CAREER_SECTION_REGEX + PATHWAY_VISA_SECTION_REGEX retired
// 2026-05-10 along with the corresponding LLM sections.

export const ReportRenderer = ({ markdown, completedTasks, onToggle, taskKey, isRu, onOpenDiscover, liveMatches, onSaveScholarship, savedSet, structured, onRegenSection, regeneratingSectionId, tier = "premium", onAskCounselor }: {
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
  /** Optional cross-surface action — when provided, the brief's
   *  Strategic Positioning section renders a "Plan this with the
   *  counselor" CTA below the 30-day call. SharedBrief leaves this
   *  undefined since recipients don't have access to the original
   *  user's counselor. */
  onAskCounselor?: (question: string) => void;
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
            return <div key={i} {...anchorProps}><StrategicPositioning markdown={section} isRu={isRu} onRegen={onRegenSection} isRegenerating={regeneratingSectionId === "positioning"} onAskCounselor={onAskCounselor} /></div>;
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
            return <div key={i} {...anchorProps}><FundingShortlist markdown={section} liveMatches={liveMatches} isRu={isRu} onOpenDiscover={onOpenDiscover} combinedFunding={structured?.combinedFunding ?? null} onRegen={onRegenSection} isRegenerating={regeneratingSectionId === "funding"} tier={tier} onSaveScholarship={onSaveScholarship} savedSet={savedSet} /></div>;
          }
        }
        if (PATHWAY_ESSAYS_SECTION_REGEX.test(section)) {
          const hasContent = /^\s*([-*]|\d+\.|#)\s+/m.test(section.split("\n").slice(1).join("\n"));
          if (hasContent) {
            return <div key={i} {...anchorProps}><EssayAngles markdown={section} isRu={isRu} onAskCounselor={onAskCounselor} /></div>;
          }
        }
        if (PATHWAY_GAPS_SECTION_REGEX.test(section)) {
          const hasContent = /^\s*([-*]|\d+\.|#)\s+/m.test(section.split("\n").slice(1).join("\n"));
          if (hasContent) {
            return <div key={i} {...anchorProps}><HonestGaps markdown={section} isRu={isRu} onAskCounselor={onAskCounselor} /></div>;
          }
        }
        // Career ROI / Visa pathway / Final word custom renderers retired
        // 2026-05-10 alongside the brief consolidation (PREMIUM_SECTIONS
        // dropped from 9 → 5). The LLM no longer emits those H2 sections,
        // so the regex matchers were dead branches keeping
        // PremiumSection / FinalWord on the import graph for nothing.
        // If a stale cached brief still contains those headers, the
        // generic EnrichedMarkdown fallback below renders them cleanly
        // — no special chrome, no chart placeholders.
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

const CHAT_URL = `${EDGE_FUNCTIONS_URL}/topuni-chat`;

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
    t("Drafting your strategy report", "Готовим стратегический отчёт"),
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
        {t("Building your strategy report", "Готовим ваш стратегический отчёт")}
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

/* Prompt accordion — collapses the 5 prompt categories so the counsellor
 * rail stays tight (was rendering ~25 vertical lines, matching the chat
 * box height). Single-open mode: opening a category collapses any other.
 * The category header itself is the click target. */
interface PromptGroup { label: string; icon: React.ReactNode; prompts: string[] }
const PromptAccordion = ({ groups, onPromptSelect, disabled }: {
  groups: PromptGroup[];
  onPromptSelect: (p: string) => void;
  disabled?: boolean;
}) => {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="space-y-1">
      {groups.map((g) => {
        const isOpen = open === g.label;
        return (
          <div key={g.label} className="border-b border-border/40 last:border-b-0">
            <button
              type="button"
              onClick={() => setOpen((cur) => (cur === g.label ? null : g.label))}
              className="w-full flex items-center justify-between gap-2 py-2 text-[11px] uppercase tracking-[0.14em] text-foreground font-semibold hover:text-gold-dark transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <span className="text-accent">{g.icon}</span>
                {g.label}
              </span>
              <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && (
              <div className="space-y-0.5 pb-2">
                {g.prompts.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => onPromptSelect(p)}
                    disabled={disabled}
                    className="block w-full text-left text-xs leading-snug px-2 py-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-50"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
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
     universities, deeper sections, Gemini 2.5 Pro).
     Tightened in round 55: previous OR chain included `tier === "pro"`
     and `tier === "founding"` independently of subscription status,
     so a user whose subscription was canceled (Stripe webhook flipped
     status to "canceled" but DB tier stayed "pro") still passed as a
     member — silent revenue leak. is_active already captures
     active+trialing+earned_trial. is_founding_member is the lifetime
     status badge for founders who paid the launch price; keep it.
     isAdminUser bypasses for the admin allowlist so the founder can
     test premium surfaces without maintaining a paid sub on every
     test account. */
  const { user, subscription } = useAuth();
  const isMember = !!subscription && (
    subscription.is_active ||
    subscription.is_founding_member ||
    isAdminUser(user)
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

  // 2026-05-17: tiered strategy report retired. Every user gets the
  // full premium magazine report — no basic/premium split, no Pro
  // depth questions, no upsell on the report itself. Membership now
  // gates only the personalized counselor sessions + Discover saves
  // (the things that genuinely scale with human attention), not the
  // one-shot strategy report. Hard-coded to "premium" so every
  // existing code path that branches on reportGrade keeps generating
  // the deeper PREMIUM_SECTIONS journey.
  const reportGrade: "basic" | "premium" = "premium";

  /* Profile hash — bumps when ANY signal changes that should invalidate
     the cached brief: identity fields, language, AND the reportGrade
     (so a user who upgrades from basic to premium auto-regenerates the
     deeper version on next visit, not the stale basic one). */
  // Stable string key for profile.targetCountries so the deps array
  // can be statically checked. The array reference flips on every
  // render even when the underlying values are identical.
  const targetCountriesKey = (profile.targetCountries ?? []).join(",");
  const profileHash = useMemo(() => {
    const fingerprint = JSON.stringify({
      n: profile.fullName, g: profile.gpa,
      // Test-score fingerprints. ielts + sat were already in but
      // toefl was missing — a user adding a TOEFL score later got a
      // stale brief that hadn't seen it (the pathway fn uses toefl
      // for eligibility filtering, so the cache miss should fire).
      i: profile.ielts, tf: profile.toefl, s: profile.sat,
      m: profile.major, c: profile.targetCountries, b: profile.budget,
      // Nationality + grade-level were missing from the fingerprint
      // even though the pathway fn (a) feeds nationality into
      // eligibility + visa-difficulty framing, and (b) uses
      // gradeLevel/degree to filter scholarships by target degree.
      // Editing either one should regenerate the brief; previously
      // it cache-hit and showed the old framing.
      nat: profile.nationality, lvl: profile.gradeLevel,
      lang: language, grade: reportGrade,
      // Pro depth fingerprints — fingerprint the actual CONTENT (not
      // just whether it's filled), mirroring the backend's
      // computeBriefHash which slices each field to 200 chars. The
      // earlier "1"/"0" emptiness flag meant editing the topActivity
      // text from "robotics" to "tennis" left the frontend cache
      // intact → the brief didn't change even though the backend
      // would have regenerated. 200-char slice keeps the hash bounded
      // for users who paste long stories.
      d: (proDepth.topActivity ?? "").slice(0, 200),
      s2: (proDepth.personalStory ?? "").slice(0, 200),
      sc: (proDepth.namedSchools ?? "").slice(0, 200),
    });
    let h = 0;
    for (let i = 0; i < fingerprint.length; i++) h = ((h << 5) - h + fingerprint.charCodeAt(i)) | 0;
    return `p${h.toString(36)}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.fullName, profile.gpa, profile.ielts, profile.toefl, profile.sat, profile.major, targetCountriesKey, profile.budget, profile.nationality, profile.gradeLevel, language, reportGrade, proDepth.topActivity, proDepth.personalStory, proDepth.namedSchools]);

  const PATHWAY_STORAGE_KEY = "topuni-pathway-cache";

  const restored = useMemo(() => {
    try {
      const raw = localStorage.getItem(PATHWAY_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.hash === profileHash && typeof parsed.content === "string" && parsed.content.length > 100) {
        // Defensive — older builds wrote error text into pathwayContent
        // (e.g. "Something went wrong. Please try again.") before the
        // pathwayError state existed. Skip the cache restore when the
        // saved blob looks like an error string instead of a real
        // markdown report. A real report always opens with a level-2
        // heading; error messages don't.
        const looksLikeErrorBlob =
          /^something went wrong|^couldn't generate|^rate limit|^session expired|^stream error|^network error/i.test(parsed.content.trim()) ||
          (parsed.content.length < 600 && !parsed.content.includes("\n##"));
        if (looksLikeErrorBlob) {
          localStorage.removeItem(PATHWAY_STORAGE_KEY);
          return null;
        }
        return { content: parsed.content as string, generatedAt: typeof parsed.generatedAt === "number" ? parsed.generatedAt : null };
      }
    } catch { /* ignore */ }
    return null;
  }, [profileHash]);

  const [pathwayContent, setPathwayContent] = useState<string>(() => {
    // schema-2 (magazine JSON) restored content is parsed into magazineSections
    // below; pathwayContent should be empty in that case so the legacy
    // renderer doesn't try to read JSON as markdown.
    const c = restored?.content ?? "";
    if (typeof c === "string" && c.startsWith("{") && c.includes('"sections"')) return "";
    return c;
  });
  const [pathwayLoading, setPathwayLoading] = useState(false);
  /* v6 magazine sections — populated by the new SSE protocol
   * (`data: {section, payload}`). When this has entries we render
   * BriefMagazine instead of the legacy ReportRenderer markdown path. */
  const [magazineSections, setMagazineSections] = useState<BriefSections>(() => {
    const c = restored?.content;
    if (typeof c !== "string" || !c.startsWith("{")) return {};
    try {
      const parsed = JSON.parse(c) as { schema?: number; sections?: BriefSections };
      if (parsed?.schema === 2 && parsed.sections) return parsed.sections;
    } catch { /* not magazine JSON, fall through */ }
    return {};
  });
  /* Error state for the strategy-report stream. Previously when the
   * edge function 401'd or the LLM provider hiccuped, streamSSE wrote
   * the error message directly into pathwayContent — the user saw a
   * broken-looking "report" with a stack-trace-ish line at the top.
   * Now we route errors here and render a clean retry UI instead. */
  const [pathwayError, setPathwayError] = useState<string | null>(null);
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
      .or("verification_status.is.null,verification_status.in.(verified,stale,pending)")
      // Lifecycle filter — closed_archived rows shouldn't appear as
      // live matches in the brief sidebar even when the user's target
      // countries match. The pathway fn already filters by lifecycle
      // server-side; aligning this client query keeps the brief's
      // text and the sidebar cards consistent.
      .or("lifecycle_status.in.(active,reopens_annually),lifecycle_status.is.null");
      if (profile.targetCountries && profile.targetCountries.length > 0) {
        q = q.in("host_country", profile.targetCountries);
      }
      const { data } = await q
        .order("application_deadline", { ascending: true, nullsFirst: false })
        .limit(6);
      if (data) setLiveMatches(data as LiveMatch[]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.fullName, targetCountriesKey]);

  /* Saved-but-not-top-matched scholarships — the user may have saved
     scholarships from /discover that don't appear in their auto-fetched
     liveMatches (which is country-filtered top 6 by deadline urgency).
     Without this hydration, the counselor's response renderer treats
     those names as un-resolvable bolds — falling back to muted text
     and losing the rich InlineScholarshipCard treatment. Same applies
     to the brief's funding-shortlist match-lookup.

     Fetch only IDs that aren't already in liveMatches (skip the round-
     trip when there's overlap) and only non-broken rows (pending is
     allowed under the disclaimer policy — see commit 015281a). */
  const [savedExtras, setSavedExtras] = useState<LiveMatch[]>([]);
  // Stable key for tracker.shortlist — Set reference flips each render
  // even when membership is unchanged. Hoisting also lets ESLint
  // statically check the deps array.
  const shortlistKey = Array.from(tracker.shortlist).sort().join(",");
  useEffect(() => {
    const liveIds = new Set(liveMatches.map((m) => m.scholarship_id));
    const idsToFetch = Array.from(tracker.shortlist).filter((id) => !liveIds.has(id));
    if (idsToFetch.length === 0) {
      if (savedExtras.length > 0) setSavedExtras([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("scholarships")
        .select(
          "scholarship_id, scholarship_name, provider_name, host_country, " +
          "coverage_type, award_amount_text, estimated_total_value_usd, " +
          "application_deadline, why_this_fits, official_url, " +
          "verification_status, last_verified_at"
        )
        .or("verification_status.is.null,verification_status.in.(verified,stale,pending)")
        .in("scholarship_id", idsToFetch)
        .limit(40);
      if (cancelled || !data) return;
      setSavedExtras(data as LiveMatch[]);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shortlistKey, liveMatches]);

  /* Brief-mentioned scholarships — the AI brief mentions scholarships from
     a wider semantic-search retrieval set than `liveMatches` (which is
     limited to the user's targetCountries top-6 by deadline). Without this
     hydration, FundingShortlist sees a `**Gates Cambridge**` bullet but
     `liveMatches` only has US scholarships → renders as muted "unverified"
     card with a dotted underline, even though Gates Cambridge exists in
     the DB and has a deadline + funding amount we could surface.

     Pulls the bolded names from the funding-pathway section of the brief
     and resolves any not already in liveMatches by ilike. Cheap (1 query
     per generation, capped at 12 names) and only runs once the brief
     finishes streaming. */
  const [briefMentioned, setBriefMentioned] = useState<LiveMatch[]>([]);
  useEffect(() => {
    if (pathwayLoading || !pathwayContent) return;
    // Extract `**Name**` bullets from the funding section. The funding
    // shortlist heading varies by language ("Funding pathway" / "Финансирование");
    // we just scan the whole brief — name-collisions with non-funding
    // bolds are fine since we filter to scholarship rows server-side.
    const names = new Set<string>();
    const re = /^\s*[-*]\s+\*\*([^*]+)\*\*/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(pathwayContent)) !== null) {
      const n = m[1].trim();
      // Strip trailing parenthetical years/notes the AI sometimes adds:
      // "Chevening (UK gov)" → "Chevening".
      const clean = n.replace(/\s*\([^)]*\)\s*$/, "").trim();
      if (clean.length >= 4 && clean.length <= 80) names.add(clean);
    }
    if (names.size === 0) {
      if (briefMentioned.length > 0) setBriefMentioned([]);
      return;
    }
    // Skip names already covered by liveMatches.
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const liveNorm = liveMatches.map((lm) => norm(lm.scholarship_name));
    const remaining = Array.from(names).filter((n) => {
      const nn = norm(n);
      return !liveNorm.some((ln) => ln === nn || ln.includes(nn) || nn.includes(ln));
    });
    if (remaining.length === 0) {
      if (briefMentioned.length > 0) setBriefMentioned([]);
      return;
    }
    let cancelled = false;
    (async () => {
      // ilike OR over up to 12 names. Each filter expression is
      // `scholarship_name.ilike.%name%` — escape `%` and `,` in the name.
      const filters = remaining.slice(0, 12)
        .map((n) => `scholarship_name.ilike.%${n.replace(/[%,]/g, " ")}%`)
        .join(",");
      const { data } = await supabase
        .from("scholarships")
        .select(
          "scholarship_id, scholarship_name, provider_name, host_country, " +
          "coverage_type, award_amount_text, estimated_total_value_usd, " +
          "application_deadline, why_this_fits, official_url, " +
          "verification_status, last_verified_at"
        )
        .or("verification_status.is.null,verification_status.in.(verified,stale,pending)")
        .or("lifecycle_status.in.(active,reopens_annually),lifecycle_status.is.null")
        .or(filters)
        .limit(24);
      if (cancelled || !data) return;
      // Dedup by scholarship_id; keep best name-match per AI-mentioned name.
      const byId = new Map<string, LiveMatch>();
      for (const row of data as LiveMatch[]) {
        if (!byId.has(row.scholarship_id)) byId.set(row.scholarship_id, row);
      }
      setBriefMentioned(Array.from(byId.values()));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathwayContent, pathwayLoading, liveMatches]);

  /* Combined match set — feeds every surface that resolves scholarship
     names to rich cards (counselor responses, brief funding-shortlist
     cross-reference, brief inline-card decoration). De-duplicated by
     scholarship_id with liveMatches winning (those have similarity
     scoring + are the AI's retrieval set), then savedExtras (user
     intent), then briefMentioned (AI mention resolution). */
  const allMatches = useMemo(() => {
    const seen = new Set<string>();
    const out: LiveMatch[] = [];
    for (const m of liveMatches) {
      if (seen.has(m.scholarship_id)) continue;
      seen.add(m.scholarship_id); out.push(m);
    }
    for (const m of savedExtras) {
      if (seen.has(m.scholarship_id)) continue;
      seen.add(m.scholarship_id); out.push(m);
    }
    for (const m of briefMentioned) {
      if (seen.has(m.scholarship_id)) continue;
      seen.add(m.scholarship_id); out.push(m);
    }
    return out;
  }, [liveMatches, savedExtras, briefMentioned]);

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
    // Debounce the localStorage write — streaming an assistant turn
    // can fire 100s of chatMessages updates per response, each one
    // re-serializing the entire history. Settling the writes at 600 ms
    // keeps the persistence responsive without churning the disk.
    const id = setTimeout(() => {
      try { localStorage.setItem("topuni-chat-history", JSON.stringify(chatMessages)); } catch { /* ignore */ }
    }, 600);
    return () => clearTimeout(id);
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

  // Single in-flight insert promise. Without this, two rapid sends
  // before chatSessionId state propagated would each spawn a separate
  // counselor_sessions row — splitting messages across orphaned
  // sessions for what the user perceived as one conversation.
  const ensureSessionPromiseRef = useRef<Promise<string | null> | null>(null);
  const ensureSession = async (): Promise<string | null> => {
    if (chatSessionId) return chatSessionId;
    if (ensureSessionPromiseRef.current) return ensureSessionPromiseRef.current;
    const p = (async () => {
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
        return data.session_id as string;
      } catch { return null; }
      finally { ensureSessionPromiseRef.current = null; }
    })();
    ensureSessionPromiseRef.current = p;
    return p;
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
          // v6 magazine: send JSON `{schema:2, sections}` so the
          // recipient SharedBrief page renders via BriefMagazine.
          // Legacy/basic-tier: send markdown verbatim.
          content: Object.keys(magazineSections).length > 0
            ? JSON.stringify({ schema: 2, sections: magazineSections })
            : pathwayContent,
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
      // Surface failure to the user — they clicked "Share" expecting a
      // link, and a silent failure leaves them staring at a stopped
      // spinner with no idea what to do next.
      toast.error(
        language === "ru"
          ? "Не удалось создать ссылку — попробуйте ещё раз."
          : "Couldn't create share link — please try again.",
      );
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
    } catch {
      // Clipboard API can fail when the page isn't HTTPS, the user
      // denies permission, or in some embedded webviews. Surface
      // the URL via toast so the user can long-press / right-click
      // to copy manually instead of seeing nothing happen.
      toast.error(
        language === "ru" ? "Не удалось скопировать — выделите ссылку вручную" : "Couldn't copy — select the link manually",
        { description: shareUrl, duration: 8000 },
      );
    }
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
      const isRu = language === "ru";
      const statsParts: string[] = [];
      statsParts.push(isRu ? `${liveMatches.length} совпадений` : `${liveMatches.length} matches`);
      if (totalText) statsParts.push(isRu ? `потенциал — ${totalText}` : `${totalText} potential funding`);
      if (closestDays !== null) statsParts.push(
        isRu ? `ближайший дедлайн — ${closestDays} дн.` : `earliest deadline in ${closestDays} days`,
      );
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
            language,
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
  // Target countries became optional 2026-05-10 (the wizard's "where
  // do you want to go" was redundant with the in-app country filter,
  // and forcing a choice prematurely narrowed the brief). Drop it
  // from the gate — the brief generator handles empty targetCountries
  // by sampling across geographies and labelling "Target countries:
  // Open" in the prompt.
  const isProfileFilled = !!(profile.fullName && profile.fullName !== "Student" && profile.gpa);

  /* Tabs state — promoted to a useState so other surfaces (Pipeline's
     "Ask the AI counselor about this" button) can switch us to the
     counselor tab via sessionStorage on mount. Default mirrors the
     previous defaultValue logic: profile filled → strategy tab,
     otherwise → counselor (which is more useful for empty-profile
     visitors). */
  // AI Counselor tab hidden 2026-05-09 — it was eating tokens with low
  // user-uptake. Code path retained so the report's inline "Ask the
  // counselor" CTAs still work for anyone who navigates directly, and
  // so flipping back to true re-exposes it without rebuilds.
  const SHOW_COUNSELOR_TAB = false;
  const [activeTab, setActiveTab] = useState<string>("pathway");

  useEffect(() => {
    // Mount-only — intentional. Profile changes are handled by the
    // profileHash → restored cache invalidation path, not by re-firing
    // this effect. Including the deps would cause double-generation
    // when the brief itself updates state during streaming.
    if (!pathwayGenerated && isProfileFilled) {
      generatePathway();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Auto-regenerate when the profile-hash changes to a value with no
   * cached content — the most common trigger is the user upgrading to
   * Pro, which flips reportGrade from "basic" to "premium" and changes
   * the hash. Pre-fix the dashboard kept rendering the cached basic
   * brief until the user manually clicked Regenerate, so the entire
   * "you're a Pro now" moment was invisible.
   *
   * Guards: skip while a generation is already in flight, and skip if
   * the new hash matches the cached content already in pathwayContent
   * (the restored useMemo handles that path). Also bail when the
   * profile isn't filled — there's nothing meaningful to generate. */
  useEffect(() => {
    if (!isProfileFilled) return;
    if (pathwayLoading) return;
    if (restored) {
      // Cache hit for the new hash — load it instead of regenerating.
      if (restored.content !== pathwayContent) {
        setPathwayContent(restored.content);
        setPathwayGenerated(true);
        setPathwayGeneratedAt(restored.generatedAt);
      }
      return;
    }
    // Cache miss for the new hash. If we currently have stale content
    // (from a previous hash), clear it and regenerate.
    if (pathwayContent || pathwayGenerated) {
      setPathwayContent("");
      setPathwayGenerated(false);
      setPathwayGeneratedAt(null);
      setStructuredBrief(null);
      generatePathway();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileHash]);

  /* In-page counselor handoff — used by brief surfaces (e.g. the
     Strategic Positioning's "Plan this with the counselor" CTA below
     the 30-day call) to switch tabs and seed the chat input without
     a sessionStorage round-trip. Pipeline's cross-page handoff still
     uses sessionStorage (different process — it navigates to /topuni-
     ai from /pipeline). */
  const askCounselorWithPrefill = (question: string) => {
    setActiveTab("counselor");
    setChatInput(question);
    setTimeout(() => {
      chatTextareaRef.current?.focus();
      // Scroll the user up so the chat input is visible — they'll be
      // looking at the counselor surface, not the brief.
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 80);
    void track("brief_30_day_call_clicked", { source: "strategic_positioning_cta" });
  };

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
  /* Snapshot of the user's pipeline state for the greeting hash + payload.
     Must include tracker IDs AND statuses so the greeting refreshes when
     the pipeline changes (saved a new scholarship → fresh greeting that
     references it). Sorted+joined for stable hashing. */
  const trackedSnapshot = useMemo(() => {
    const ids = Array.from(tracker.shortlist).sort();
    const statusFingerprint = Object.entries(tracker.statusMap)
      .map(([id, status]) => `${id}:${status}`)
      .sort()
      .join("|");
    return { ids, statusFingerprint };
  }, [tracker.shortlist, tracker.statusMap]);

  useEffect(() => {
    if (!isProfileFilled) return;
    if (chatMessages.length > 0) return;
    if (greetingLoading) return;
    if (pathwayLoading) return; // wait until streaming is done so the brief is stable

    // Hash the inputs that change the greeting. Profile + brief head +
    // pipeline fingerprint. Cheap djb2-like hash. nationality + language
    // were missing — a user toggling language would see a stale-language
    // greeting from cache, and editing nationality wouldn't refresh the
    // visa-difficulty / eligibility framing.
    const briefHead = (pathwayContent || "").slice(0, 800);
    const hashInput = JSON.stringify({
      n: profile.fullName,
      nat: profile.nationality,
      gl: profile.gradeLevel,
      g: profile.gpa,
      i: profile.ielts,
      tc: profile.targetCountries,
      m: profile.major,
      lang: language,
      bh: briefHead.length,
      bs: briefHead.slice(0, 300),
      // Fingerprint the actual id set, not just the length. Removing
      // scholarship A and adding scholarship B keeps the length the
      // same, so the prior `tr: ids.length` comparison cache-hit and
      // re-served a greeting that still referenced A by name.
      // ids is already sorted in trackedSnapshot, so this is stable.
      tr: trackedSnapshot.ids.join(","),
      ts: trackedSnapshot.statusFingerprint,
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

    // Fresh greeting. Hydrate saved scholarship names + deadlines from
    // the DB before calling the edge function — so an engaged user with
    // a populated pipeline gets a greeting that names "Schwarzman closes
    // in 11 days" instead of generic profile observations. Skip the
    // hydrate for users with empty pipelines.
    setGreetingFiredHash(inputHash);
    setGreetingLoading(true);
    (async () => {
      try {
        let savedScholarships: Array<{ name: string; application_deadline: string | null; status: string | null }> = [];
        if (trackedSnapshot.ids.length > 0) {
          const { data: hydrated } = await supabase
            .from("scholarships")
            .select("scholarship_id, scholarship_name, application_deadline")
            // Hydrate everything except 'broken'. Pending rows are
            // surfaced under the platform-wide "always confirm on the
            // official site" disclaimer (see commit 015281a).
            .or("verification_status.is.null,verification_status.in.(verified,stale,pending)")
            .in("scholarship_id", trackedSnapshot.ids)
            .limit(20);
          savedScholarships = (hydrated ?? []).map((r) => ({
            name: r.scholarship_name,
            application_deadline: r.application_deadline,
            status: tracker.statusMap[r.scholarship_id] ?? null,
          }));
        }

        const { data, error } = await supabase.functions.invoke<{
          ok: boolean; greeting: string; follow_ups: string[]; error?: string;
        }>("topuni-counselor-greeting", {
          body: {
            profile,
            briefContent: pathwayContent ?? "",
            language,
            savedScholarships,
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
    // Deps must mirror the hashInput inputs above so editing any
    // greeting-relevant field re-runs the effect (which then recomputes
    // hashInput and cache-busts if needed). nationality + language were
    // missing pre round 60 — same omission as the round-57 fingerprint
    // fix on the brief side.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isProfileFilled, chatMessages.length, pathwayLoading, pathwayContent,
    profile.fullName, profile.nationality, profile.gradeLevel,
    profile.gpa, profile.ielts, targetCountriesKey, profile.major, language,
    greetingFiredHash, greetingLoading,
    // Was trackedSnapshot.ids.length — that compared only count, so a
    // swap of "remove A, add B" left the dep stable and the effect
    // never re-ran with the new pipeline. Joined sorted IDs are a
    // primitive string → cheap to compare and accurate.
    trackedSnapshot.ids.join(","), trackedSnapshot.statusFingerprint,
  ]);

  // Abort controllers for long-running streams so an unmount /
  // navigation cancels the in-flight server-side stream instead of
  // leaving it billing tokens until completion. Tracked per stream
  // type so a chat send can run alongside the brief without one
  // aborting the other.
  const briefAbortRef = useRef<AbortController | null>(null);
  const chatAbortRef = useRef<AbortController | null>(null);

  const streamSSE = async (
    url: string,
    body: Record<string, unknown>,
    onDelta: (chunk: string) => void,
    onDone: () => void,
    onError?: (status: number, message: string) => void,
    signal?: AbortSignal,
    onSection?: (section: SectionId, payload: unknown) => void,
  ) => {
    // Pass the user's session JWT when authed so edge functions can
    // resolve user_id via getUser() — needed for the counselor's
    // live-case context (tracker / tasks / cached brief). Falls back
    // to anon key for unauthenticated callers.
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? ENV.SUPABASE_PUBLISHABLE_KEY;
    let resp: Response;
    try {
      resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: ENV.SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify(body),
        signal,
      });
    } catch (e) {
      // AbortError → caller's unmount cleanup; don't toast / fallback.
      if ((e as Error).name === "AbortError") return;
      if (onError) onError(0, (e as Error).message || "Network error");
      else { onDelta((e as Error).message || "Network error"); onDone(); }
      return;
    }

    if (!resp.ok || !resp.body) {
      const errData = await resp.json().catch(() => ({}));
      const message = errData.error || "Something went wrong. Please try again.";
      // Prefer the dedicated error path so callers can keep
      // pathwayGenerated=false and surface a retry. Fall back to
      // writing the error into the content stream for callers that
      // haven't been migrated to onError yet.
      if (onError) {
        onError(resp.status, message);
      } else {
        onDelta(message);
        onDone();
      }
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;

    try {
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
            // v6 magazine shape: `{section, payload}` — premium brief
            // streams per-section JSON instead of markdown chunks.
            if (parsed && typeof parsed === "object" && parsed.section && "payload" in parsed) {
              onSection?.(parsed.section as SectionId, parsed.payload);
              continue;
            }
            // Legacy markdown chunk (basic tier + old shape)
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) onDelta(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      // AbortError fires when the caller's signal aborts mid-stream.
      // Treat it as silent — the unmount cleanup is the user intent;
      // no toast, no onDone progression (component is gone anyway).
      if ((e as Error).name === "AbortError") return;
      if (onError) onError(0, (e as Error).message || "Stream error");
      else { onDelta((e as Error).message || "Stream error"); onDone(); }
      return;
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
        // Section regen used to silently swallow errors — the user
        // clicked "Regenerate" and saw NOTHING happen on failure.
        // Toast a contextual message so they know the click landed.
        (status, message) => {
          const isRateLimit = status === 429;
          const userMessage = isRateLimit
            ? (language === "ru" ? "Превышен лимит запросов — попробуйте через минуту." : "Rate limit hit — try again in a minute.")
            : (language === "ru" ? `Не удалось перегенерировать раздел: ${message}` : `Couldn't regenerate section: ${message}`);
          toast.error(userMessage);
        },
      );
    } finally {
      setRegeneratingSectionId(null);
    }
  };

  const generatePathway = async () => {
    // Abort any prior in-flight brief stream so a re-trigger doesn't
    // leave the previous generation running in the background.
    briefAbortRef.current?.abort();
    const briefController = new AbortController();
    briefAbortRef.current = briefController;

    // Snapshot the pre-regen brief so we can restore it on error.
    // Pre-fix a regen failure wiped a previously-good brief AND set
    // pathwayError, so a transient network blip cost the user their
    // working report. Now: if regen fails AND we had prior content,
    // we restore the snapshot (the error toast still surfaces so the
    // failure is acknowledged).
    const priorContent = pathwayContent;

    setPathwayLoading(true);
    setPathwayError(null);
    setPathwayContent("");
    setMagazineSections({});
    let soFar = "";
    const magazineAcc: BriefSections = {};
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
        // 2026-05-10: short-content guard. v6 magazine path emits no
        // markdown deltas — it streams structured per-section JSON via
        // onSection instead. Accept EITHER ≥200 chars of markdown OR
        // at least 1 magazine section as a "generated" signal.
        const sectionCount = Object.keys(magazineAcc).length;
        if (soFar.trim().length < 200 && sectionCount === 0) {
          setPathwayGenerated(false);
          setPathwayContent("");
          setMagazineSections({});
          setPathwayError(language === "ru"
            ? "Не удалось сгенерировать брифинг — попробуйте снова через минуту."
            : "We couldn't generate your strategy report — try again in a moment.");
          void track("brief_generation_failed", { status: 0, tier: reportGrade, reason: "empty_stream" });
          return;
        }
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
          // v6 magazine: persist as JSON `{schema:2, sections}` so the
          // restored content branch can rehydrate magazineSections.
          // Legacy markdown: persist as raw string under the same key.
          const sectionCountForCache = Object.keys(magazineAcc).length;
          if (sectionCountForCache > 0) {
            localStorage.setItem(PATHWAY_STORAGE_KEY, JSON.stringify({
              hash: profileHash,
              content: JSON.stringify({ schema: 2, sections: magazineAcc }),
              generatedAt: now,
            }));
          } else if (soFar && soFar.length > 100) {
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
        // 2026-05-17: extract-brief-data second pass disabled. It
        // existed to populate the Combined Funding chart + Career ROI
        // chart on the LEGACY markdown report; the new magazine renderer
        // doesn't show those charts, so the call is wasted spend. Gated
        // on `false` rather than deleted in case we re-introduce a
        // chart appendix later — re-enabling is a one-line flip.
        const EXTRACT_BRIEF_DATA_ENABLED = false;
        if (EXTRACT_BRIEF_DATA_ENABLED && reportGrade === "premium" && soFar.length > 800) {
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
                      nationality: profile.nationality,
                      major: profile.major,
                      field: profile.major,
                      targetCountries: profile.targetCountries,
                      gpa: profile.gpa,
                      ielts: profile.ielts,
                      toefl: profile.toefl,
                      sat: profile.sat,
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
                    // v6 magazine: use the JSON-shaped sections we just
                    // streamed. Legacy basic-tier: markdown soFar.
                    content: Object.keys(magazineAcc).length > 0
                      ? JSON.stringify({ schema: 2, sections: magazineAcc })
                      : soFar,
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
                // the in-dialog "Email me" path uses). Localized so
                // Russian users get a Russian eyebrow stats line.
                const isRu = language === "ru";
                const total = liveMatches.reduce((s, m) => s + (m.estimated_total_value_usd || 0), 0);
                const totalText = total >= 1_000_000
                  ? `$${(total / 1_000_000).toFixed(1)}M`
                  : total >= 1000 ? `$${Math.round(total / 1000)}K` : "";
                const closestDays = liveMatches
                  .map(m => m.application_deadline ? Math.ceil((new Date(m.application_deadline).getTime() - Date.now()) / 86400000) : null)
                  .filter((d): d is number => d !== null && d > 0)
                  .sort((a, b) => a - b)[0] ?? null;
                const statsParts: string[] = [
                  isRu ? `${liveMatches.length} совпадений` : `${liveMatches.length} matches`,
                ];
                if (totalText) statsParts.push(isRu ? `потенциал — ${totalText}` : `${totalText} potential funding`);
                if (closestDays !== null) statsParts.push(
                  isRu ? `ближайший дедлайн — ${closestDays} дн.` : `earliest deadline in ${closestDays} days`,
                );

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
                      language,
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
      },
      // Error path — keep pathwayGenerated=false so the user can
      // retry. Persist the error to pathwayError so the report area
      // shows a clean retry card instead of a torn half-stream of
      // text. Toast still fires so the error is visible even if the
      // user has scrolled past the report block.
      (status, message) => {
        setPathwayLoading(false);
        // Restore prior content on regen failure so the user keeps
        // their working brief. Only surface the empty-state error
        // block when there was no prior content (genuine first-time
        // generation failure).
        if (priorContent) {
          setPathwayContent(priorContent);
        } else {
          setPathwayContent("");
        }
        const isRateLimit = status === 429;
        const isAuth = status === 401 || status === 403;
        const userMessage = isRateLimit
          ? (language === "ru" ? "Превышен лимит запросов — попробуйте через минуту." : "Rate limit hit — try again in a minute.")
          : isAuth
          ? (language === "ru" ? "Сессия истекла — войдите заново." : "Session expired — please sign in again.")
          : (language === "ru" ? `Не удалось сгенерировать стратегию: ${message}` : `Couldn't generate the strategy report: ${message}`);
        // Only set the error banner on first-time failures — when
        // we restored prior content, the toast is enough; the user
        // doesn't need a destructive-tinted banner sitting above
        // their still-good brief.
        if (!priorContent) setPathwayError(userMessage);
        toast.error(userMessage);
        void track("brief_generation_failed", { status, tier: reportGrade });
      },
      briefController.signal,
      // v6 magazine — receive per-section JSON payloads as they stream
      (section, payload) => {
        magazineAcc[section] = payload as never;
        setMagazineSections({ ...magazineAcc });
      },
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

    // Abort any prior in-flight chat send (rare — chatLoading guard
    // covers the common case) and stash a fresh controller so the
    // unmount cleanup can cancel this turn if the user navigates away.
    chatAbortRef.current?.abort();
    const chatController = new AbortController();
    chatAbortRef.current = chatController;

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
    // asking the student to repeat themselves. v6 magazine briefs live in
    // magazineSections (not pathwayContent); we flatten the structured JSON
    // back to plain prose for the counselor's system prompt.
    const reportSummary = (() => {
      if (Object.keys(magazineSections).length > 0) {
        return serializeBriefForCounselor(magazineSections).slice(0, 4000);
      }
      return pathwayContent ? pathwayContent.slice(0, 4000) : "";
    })();

    await streamSSE(
      CHAT_URL,
      { messages: allMessages, language, profile, reportSummary, sessionId },
      (chunk) => upsertAssistant(chunk),
      () => setChatLoading(false),
      // Without an explicit onError, streamSSE injects the error text
      // as a content chunk → it renders as if the AI said "Rate limit
      // exceeded. Please slow down." which looks unhinged. Toast the
      // error, reset loading, and roll back the user's just-pushed
      // message so they can retry without an orphaned echo of their
      // own send hanging in the chat.
      (status, message) => {
        setChatLoading(false);
        setChatMessages(prev => {
          const last = prev[prev.length - 1];
          // Only roll back if we never streamed any assistant content
          // (i.e. the failure was at request-time, not mid-stream).
          if (last?.role === "user" && assistantSoFar === "") {
            return prev.slice(0, -1);
          }
          return prev;
        });
        const friendly = status === 429
          ? t("Slow down a sec — too many messages too fast. Try again in a minute.",
              "Слишком много сообщений подряд. Подождите минуту и попробуйте снова.")
          : message || t("Couldn't reach the counselor. Try again.",
                          "Не удалось связаться с советником. Попробуйте снова.");
        toast.error(friendly);
      },
      chatController.signal,
    );
  };

  // Unmount cleanup — abort any in-flight brief or chat stream so
  // navigating away from /topuni-ai mid-stream cancels the
  // server-side generation instead of leaving it running.
  useEffect(() => {
    return () => {
      briefAbortRef.current?.abort();
      chatAbortRef.current?.abort();
    };
  }, []);

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
        {isProfileFilled && (() => {
          /* Premium intake summary — replaced the tag-chip strip with a
             single italic peer-voice line that reads like the brief is
             addressing the reader. The chips felt utilitarian and looked
             tacky stacked under a personal greeting; the line below pairs
             with the "Welcome, [Name]" headline like one breath. Test
             scores live on a quieter sub-row only when present, so users
             who put in IELTS/SAT still see them acknowledged without
             cluttering the headline. */
          const fmtCountries = (cs: string[]): string => {
            if (cs.length === 0) return "";
            if (cs.length === 1) return cs[0];
            if (cs.length === 2) return `${cs[0]} ${t("and", "и")} ${cs[1]}`;
            return `${cs.slice(0, -1).join(", ")} ${t("and", "и")} ${cs[cs.length - 1]}`;
          };
          const countriesPhrase = fmtCountries(profile.targetCountries);
          const hasMajor = profile.major && profile.major !== "Undecided" && profile.major !== "Не определился";
          const hasCountries = countriesPhrase.length > 0;
          const hasGpa = !!profile.gpa;
          const hasScores = !!(profile.ielts || profile.toefl || profile.sat);
          // The "Aiming" prefix only makes sense when there's a target —
          // major OR countries. With both absent (open-target user
          // dropping in just a GPA) the prefix orphaned itself, reading
          // "Aiming · 3.8 GPA" which is grammatical garbage. Suppress
          // the prefix in that case and let the GPA stand alone.
          const showAimingPrefix = hasMajor || hasCountries;
          return (
            <div className="mt-3 space-y-1">
              <p className="text-base md:text-[17px] italic text-muted-foreground leading-relaxed">
                {showAimingPrefix && (isRu ? "Цель — " : "Aiming ")}
                {hasMajor && (
                  <>
                    <span className="not-italic font-semibold text-foreground">{profile.major}</span>
                    {hasCountries && (isRu ? " в " : " in ")}
                  </>
                )}
                {hasCountries && !hasMajor && (isRu ? "" : "for ")}
                {hasCountries && (
                  <span className="not-italic font-semibold text-foreground">{countriesPhrase}</span>
                )}
                {hasGpa && (
                  <>
                    {showAimingPrefix && <span className="text-muted-foreground/60"> · </span>}
                    <span className="not-italic font-medium text-foreground/85">
                      {profile.gpa} {t("GPA", "GPA")}
                    </span>
                  </>
                )}
              </p>
              {hasScores && (
                <p className="text-xs text-muted-foreground/70 tracking-wide">
                  {[
                    profile.ielts && `IELTS ${profile.ielts}`,
                    profile.toefl && `TOEFL ${profile.toefl}`,
                    profile.sat && `SAT ${profile.sat}`,
                  ].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          );
        })()}

        {/* Trust indicator — concrete payoff for the wizard's "Save your
            strategy report" promise. Signed-in users see a quiet
            "Synced to your account" line; anonymous users see a soft
            nudge to sign in so they don't lose the brief. The line
            sits below the intake summary header where it doesn't
            compete with the brief content but shows up at the moment
            the user is reading their plan, the right context to
            decide "yes, I want this saved". */}
        {pathwayGenerated && (
          <p className="mt-3 text-[11px] text-muted-foreground/75 flex items-center gap-1.5">
            {user ? (
              <>
                <Shield className="w-3 h-3 text-gold-dark/70" />
                {t("Synced to your account · accessible from any device", "Сохранено в аккаунт · доступно с любого устройства")}
              </>
            ) : (
              <>
                <span>
                  {t("Saved on this device. ", "Сохранено на устройстве. ")}
                  <button
                    type="button"
                    onClick={() => navigate(isRu ? "/account/ru" : "/account")}
                    className="text-gold-dark hover:text-foreground underline-offset-2 hover:underline"
                  >
                    {t("Sign in to keep it", "Войти чтобы сохранить навсегда")}
                  </button>
                </span>
              </>
            )}
          </p>
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

      {/* Dashboard — two surfaces only: Strategy (the report) and Counselor
          (chat). When SHOW_COUNSELOR_TAB is false the tab strip is hidden
          entirely — a single-tab nav is just chrome with no choice to make,
          so the brief opens straight into the content. The Tabs wrapper
          itself stays so we don't have to refactor the body. */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {SHOW_COUNSELOR_TAB && (
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
        )}

        {/* MY PATHWAY TAB */}
        <TabsContent value="pathway">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
              <div className="flex flex-col gap-0.5">
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-accent" />
                  {t("Your strategy report", "Ваш стратегический отчёт")}
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
                      {t("Pro report", "Pro отчёт")}
                    </span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-gold-dark hover:bg-gold/10"
                      onClick={() => navigate(isRu ? "/pricing/ru" : "/pricing")}
                    >
                      <Crown className="w-4 h-4" />
                      {t("Upgrade for Pro report", "Pro отчёт")}
                    </Button>
                  )}
                  {/* Card-header Print button retired 2026-05-10 — the
                      BriefMasthead already exposes Share / Print /
                      Download PDF in its action row, which is the more
                      contextual placement (right where the report
                      actually starts). Two Print buttons in the same
                      surface was chrome duplication. Regenerate stays
                      here because it's a card-level action, not a
                      report-cover action. */}
                  <Button
                    variant="outline"
                    size="sm"
                    // Confirm before wiping a non-empty brief — pre-fix
                    // a misclick on Regenerate restarted the entire
                    // generation and the user lost the brief they were
                    // reading. Per-section regen still goes through
                    // its own focused flow (no confirm), since the user
                    // explicitly clicks a section's regen icon and is
                    // only replacing one bucket.
                    onClick={() => {
                      if (pathwayContent && !window.confirm(t(
                        "Regenerate the full strategy report? Your current report will be replaced.",
                        "Сгенерировать отчёт заново? Текущий отчёт будет заменён.",
                      ))) return;
                      generatePathway();
                    }}
                    disabled={pathwayLoading}
                    className="gap-1.5"
                  >
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
                    {t("Start Your Plan", "Начать план")}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
              {/* Error retry block — shows when streamSSE returned a
                  non-OK status. Was previously inlined into pathwayContent
                  so the user saw a torn report; now it's a clean retry
                  card and the report area stays empty until success. */}
              {pathwayError && !pathwayLoading && (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/[0.04] px-5 py-6 my-4 text-center space-y-3">
                  <p className="text-sm font-semibold text-destructive">
                    {t("Strategy report didn't generate.", "Стратегический отчёт не сгенерировался.")}
                  </p>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                    {pathwayError}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generatePathway}
                    className="gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {t("Try again", "Попробовать ещё раз")}
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
                  <Compass className="w-4 h-4 text-gold-dark mt-0.5 shrink-0" />
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

              <AnimatePresence>
                {pathwayLoading && !pathwayContent && (
                  // Wrap in AnimatePresence so the pipeline gracefully fades
                  // out at the moment the first SSE chunk arrives — without
                  // this the pipeline JSX would just unmount and the brief
                  // masthead would pop in mid-frame, which read as a hard
                  // jump cut in the streaming experience. The inner motion
                  // div handles the fade; AnimatePresence holds the unmount
                  // until the exit animation finishes.
                  <motion.div
                    key="generation-pipeline"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <GenerationPipeline profile={profile} isRu={isRu} />
                  </motion.div>
                )}
              </AnimatePresence>{" "}

              {/* Pro brief CTA blocks moved to BELOW the report — it's
                  bad business intelligence to paywall users before they
                  consume value. Render once the report is read; see the
                  "Pro upgrade — bottom of report" block below. */}

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

                  {/* Hero KPI strip — single concise widget the user sees
                      when the brief lands. Round 96: removed the
                      DeadlineTimeline, FundingStack, and profile-chip
                      strip that used to sit above the brief content.
                      Five stacked widget blocks before the actual
                      strategic-positioning paragraph was the "all over
                      the place" feeling — the Live Matches grid below
                      already surfaces deadlines + funding inline, and
                      the BriefMasthead already shows the profile. */}
                  {!pathwayLoading && (
                    <BriefHeroStats
                      liveMatches={allMatches}
                      briefContent={pathwayContent}
                      isRu={isRu}
                    />
                  )}

                  {/* 2026-05-10: brief renders as a single continuous
                      ReportRenderer pass instead of being split into
                      [positioning] | Live matches grid | [rest]. The
                      injected Live matches grid (6 scholarship cards
                      between positioning and the rest) was breaking
                      the brief's narrative flow with content that
                      duplicated the curated 3-4 picks the brief's
                      Funding pathway section already surfaces. The
                      Live matches grid still renders — just below the
                      brief, where it reads as an action shelf rather
                      than a mid-document interruption. */}
                  {(() => {
                    return (
                      <>
                        {/* v6 magazine path — if any sections streamed, render
                            the editorial layout. Falls back to the legacy
                            markdown ReportRenderer when no magazine sections
                            present (basic tier, legacy cached briefs). */}
                        {Object.keys(magazineSections).length > 0 ? (
                          <BriefMagazine
                            mode="static"
                            sections={magazineSections}
                            studentName={profile.fullName || (isRu ? "Ваш отчёт" : "Your strategy report")}
                            gradeLabel={reportGrade === "premium" ? "Pro" : "Basic"}
                            generatedAt={pathwayGeneratedAt ? new Date(pathwayGeneratedAt).toISOString() : undefined}
                          />
                        ) : pathwayContent && (
                          <ReportRenderer
                            markdown={pathwayContent}
                            completedTasks={completedTasks}
                            onToggle={toggleTask}
                            taskKey={taskKey}
                            isRu={isRu}
                            onOpenDiscover={() => navigate(isRu ? "/discover/ru" : "/discover")}
                            liveMatches={allMatches}
                            onSaveScholarship={handleSaveScholarship}
                            savedSet={tracker.shortlist}
                            structured={structuredBrief}
                            onRegenSection={reportGrade === "premium" ? regenerateSection : undefined}
                            regeneratingSectionId={regeneratingSectionId}
                            tier={reportGrade}
                            onAskCounselor={SHOW_COUNSELOR_TAB ? askCounselorWithPrefill : undefined}
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
                                  {cleanScholarshipName(m.scholarship_name)}
                                </h4>
                                <p className="text-xs text-muted-foreground truncate mb-2">
                                  {compactAward({
                                    coverage_type: m.coverage_type,
                                    award_amount_text: m.award_amount_text,
                                    estimated_total_value_usd: m.estimated_total_value_usd ?? null,
                                  }) || (() => {
                                    const ct = m.coverage_type;
                                    if (ct === "full_ride") return t("Full ride", "Полное покрытие");
                                    if (ct === "tuition_only") return t("Tuition", "Обучение");
                                    if (ct === "stipend") return t("Stipend", "Стипендия");
                                    if (ct === "partial") return t("Partial funding", "Частичное");
                                    return t("Funding", "Финансирование");
                                  })()}
                                  {(() => { const cp = cleanProvider(m.provider_name); return cp ? <span className="text-muted-foreground/60"> · {cp}</span> : null; })()}
                                </p>
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
                                    // Mobile (no hover): always 70% visible so the save action is
                                    // discoverable. Desktop: muted at rest, full-opacity on hover.
                                    : "text-muted-foreground/60 hover:text-gold-dark hover:bg-gold/5 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
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

                        {/* Second ReportRenderer (the [after] split)
                            retired 2026-05-10 — the brief now renders
                            once, continuously, above this point. */}
                        {/* ProSectionsTeaser retired 2026-05-10 — the
                            3-card "Pro adds: wider shortlist · per-section
                            regen · funding stack" teaser was followed
                            immediately by the "Want this rewritten
                            specifically about you?" Pro brief card below.
                            Two paywall surfaces back-to-back at the end
                            of the brief was the "300 grids" feel —
                            consolidated to a single pitch (the brief
                            card below is more story-driven and ties to
                            depth questions, the teaser was structural
                            chrome). /pricing carries the full feature
                            comparison for users who click through. */}

                        {/* Tiered Pro-report upsell retired 2026-05-17.
                            The strategy report is fully free now — no
                            depth questions, no basic-vs-Pro split. The
                            CTA below pitches MEMBERSHIP (live counselor
                            guidance) rather than a re-rendered report.
                            Only shown to non-members; members get an
                            in-product counselor tab and don't need the
                            upsell here. */}
                        {!pathwayLoading && (pathwayContent || Object.keys(magazineSections).length > 0) && !isMember && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="not-prose mt-12 rounded-xl border border-gold/40 bg-gradient-to-br from-gold/8 to-transparent p-5 sm:p-6 print:hidden"
                          >
                            <div className="flex items-start gap-4 flex-wrap">
                              <div className="min-w-0 flex-1">
                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-[0.18em] uppercase bg-gradient-to-r from-gold-dark to-gold text-primary mb-2">
                                  <Crown className="w-3 h-3" />
                                  {t("Membership", "Подписка")}
                                </div>
                                <h3 className="font-heading text-lg sm:text-xl font-bold tracking-tight text-foreground mb-1.5">
                                  {t("Want more tailored guidance from real counselors?",
                                     "Нужны более точные рекомендации от консультантов?")}
                                </h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {t("Membership unlocks live monthly workshops with our Yale, Cambridge, Tsinghua, Harvard alumni team plus unlimited counselor chat — real insight on your specific situation, not another auto-generated report.",
                                     "Подписка открывает живые ежемесячные воркшопы с командой выпускников Yale, Cambridge, Tsinghua, Harvard и неограниченный чат с консультантом — реальные ответы на вашу ситуацию.")}
                                </p>
                              </div>
                              <Button
                                variant="gold"
                                onClick={() => navigate(isRu ? "/pricing/ru" : "/pricing")}
                                className="gap-1.5 shrink-0"
                              >
                                <Crown className="w-4 h-4" />
                                {t("See membership", "Открыть подписку")}
                              </Button>
                            </div>
                          </motion.div>
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
                        onClick={() => navigate(isRu ? "/academy/ru" : "/academy")}
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
                      Generated by TopUni AI · topuni.com · This report is a starting point for your application strategy. Verify scholarship details, deadlines, and eligibility on official institution websites before applying. © {new Date().getFullYear()} TopUni.
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
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                        {t("Try a prompt", "Подсказки")}
                      </p>
                    </div>
                    {/* Collapsible per-category accordion. Defaults to all
                        closed so the rail height matches the chat box; user
                        clicks a category to expand the 3 prompt suggestions
                        inside. Single-open state keeps it tight. */}
                    <PromptAccordion
                      groups={promptGroups}
                      onPromptSelect={(p) => sendChatMessage(p)}
                      disabled={chatLoading}
                    />
                    {/* Quiet Discover entry — replaces the heavy page-header
                        CTA card so chat-tab users still have a clean path. */}
                    {/* Profile flows from intake → Discover automatically
                        (round 27 integration), so this CTA can honestly
                        promise "ranked for you" rather than just
                        "browse". The user lands on the results phase
                        directly. */}
                    <button
                      onClick={() => navigate(isRu ? "/discover/ru" : "/discover")}
                      className="group w-full text-left rounded-lg border border-border hover:border-gold/40 hover:bg-gold/5 transition-colors px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <Search className="w-3.5 h-3.5 text-gold-dark shrink-0" />
                        <span className="text-xs font-semibold text-foreground">
                          {t("See your ranked scholarships", "Ваши стипендии по ранжиру")}
                        </span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground ml-auto group-hover:text-gold-dark group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                        {t("Every scholarship in our database, ranked against your profile.",
                           "Каждая стипендия из базы, отсортирована под ваш профиль.")}
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
                              ? t("Reading your profile and strategy report — drafting a starting point in a second.",
                                  "Читаю ваш профиль и брифинг — через секунду подготовлю отправную точку.")
                              : referProfile
                              ? (pathwayContent && pathwayContent.length > 200
                                  ? t(`I have your profile and your strategy brief in front of me. Ask me anything — applications, essays, funding, tests, visa.`,
                                      `У меня уже есть ваш профиль и стратегический отчёт. Задайте любой вопрос — заявки, эссе, финансирование, тесты, виза.`)
                                  : t(`I have your profile in front of me. Generate your strategy brief on the Strategy tab and I'll have full context.`,
                                      `У меня уже есть ваш профиль. Сгенерируйте стратегический отчёт на вкладке Strategy — и я получу полный контекст.`))
                              : t("Ask me anything about applications, essays, scholarships, tests, or visas. Complete your profile for tailored answers.",
                                  "Спросите о заявках, эссе, стипендиях, тестах или визах. Заполните профиль для персональных ответов.")}
                          </p>
                          {!isProfileFilled && (
                            <Button variant="gold" size="sm" onClick={onBack} className="mt-4">
                              {t("Build my profile", "Заполнить профиль")}
                              <ArrowRight className="w-4 h-4 ml-1" />
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
                                    /* allMatches = top-6 auto-fetched + the user's
                                       saved scholarships not already in that 6.
                                       Without the merge, saved-from-/discover
                                       scholarships (G, H from the user's pipeline)
                                       wouldn't get InlineScholarshipCard treatment
                                       when the counselor mentions them — only the
                                       auto-matched ones would. */
                                    scholarships={allMatches.map(m => ({
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
          // Regeneration is now triggered automatically by the
          // profileHash-watching effect (round 96) — proDepth content
          // is part of the hash, so changing the depth flips the hash
          // → cache miss → generatePathway. The previous explicit
          // setTimeout(() => generatePathway(), 50) double-fired the
          // generation (once via effect, once via setTimeout); the
          // first stream got aborted by the second's abortController
          // swap. Letting the effect own this keeps a single source of
          // truth for "when do we regenerate."
        }}
      />

      {/* ─── Save-your-brief signup prompt (anon users only) ─────── */}
      {!user && (() => {
        // Surface concrete loss-aversion stats: matches found, scholarships
        // saved, closest urgent deadline. The dialog uses these to make the
        // ask "save THIS specific work" instead of "save your work" generic.
        const liveMatchCount = liveMatches.length;
        const savedCount = tracker.shortlist.size;
        const now = Date.now();
        const closestUrgent: { name: string; days: number } | null = (() => {
          // Candidates: any matched scholarship in the user's pipeline,
          // OR any liveMatch (since those are the ones surfaced in the
          // brief and most likely to feel like "their" candidates).
          const pool = allMatches.filter((m) =>
            m.application_deadline && (tracker.shortlist.has(m.scholarship_id) || liveMatches.some((lm) => lm.scholarship_id === m.scholarship_id))
          );
          let best: { name: string; days: number } | null = null;
          for (const m of pool) {
            const d = Math.ceil((new Date(m.application_deadline!).getTime() - now) / 86400000);
            if (d < 0 || d > 30) continue;
            if (!best || d < best.days) best = { name: m.scholarship_name, days: d };
          }
          return best;
        })();
        return (
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
          liveMatchCount={liveMatchCount}
          savedCount={savedCount}
          closestUrgent={closestUrgent}
          payload={{
            profile: {
              fullName: profile.fullName,
              email: profile.email,
              // nationality was being silently dropped here — without
              // it AuthCallback's student_profiles upsert wrote a NULL
              // nationality, then Discover's semantic match had no
              // citizenship filter to apply. Wizard captures it on
              // step 1; carry it through.
              nationality: profile.nationality,
              gradeLevel: profile.gradeLevel,
              gpa: profile.gpa,
              ielts: profile.ielts,
              toefl: profile.toefl,
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
        );
      })()}

      {/* ─── Share dialog ──────────────────────────────────────────
          Mints (or shows) a public /brief/:slug URL the student can
          send to parents/counselors. Shows expiry messaging for anon
          users; gently prompts signup for permanence. */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl tracking-tight">
              {t("Share your strategy report", "Поделиться стратегическим отчётом")}
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
