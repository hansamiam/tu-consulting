# TopUni AI Strategy Report Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to dispatch each stream as a parallel subagent. Each Stream section below is a self-contained brief; subagents do not need to read the other streams.

**Goal:** Ship a redesigned `/topuni-ai` strategy report — magazine-default desktop layout, IG-story polished as Share asset, AI-slop copy regenerated, data visualizations wired, print-friendly PDF export, navy color unified.

**Architecture:** 6 parallel streams (A–F), one PR per stream. Streams A/B/C/E/F are independent and start from `main` simultaneously. Stream D starts once B has committed its tab/layout structure to `main`. Each stream uses its own worktree under `~/tu-<stream-tag>/`.

**Tech Stack:** Vite + React + TypeScript + Tailwind + shadcn (frontend); Deno edge functions on Supabase (backend prompts). No automated test suite per CLAUDE.md — verification = `tsc --noEmit` clean + `npm run build` green + visual QA per stream.

**Spec:** `docs/superpowers/specs/2026-05-25-topuni-strategy-overhaul-design.md`

**Convention every stream follows:**
1. Create worktree off fresh `origin/main`: `git worktree add ~/tu-<tag> -b <branch> origin/main`
2. Make the changes scoped strictly to that stream's file-ownership column from the spec
3. Verify: `node_modules/.bin/tsc --noEmit` exits 0; `npm run build` succeeds
4. Commit with conventional-commit prefix
5. Push and open PR — body lists the streams it depends on (usually "none" for parallel streams)
6. Use `gh pr merge <n> --squash --auto --delete-branch` so it merges on green CI

---

## Stream A: Backend copy regen + banned-vocab v2

**Worktree:** `~/tu-copy-regen` on branch `feat/brief-copy-regen-v2`
**Owner files:**
- `supabase/functions/_shared/brief-sections.ts` (section prompt templates)
- `supabase/functions/_shared/editorial-rules.ts` (banned-vocab + cultural-context rules)
**Dependencies:** none — starts from main immediately

### Task A.1: Audit current prompts + identify slop sources

- [ ] **Read each section's `buildPrompt()` in `brief-sections.ts`** — list out what each prompt tells the LLM to produce for: archetype, whereYouStand, whereYouCanLand, whatToWrite, whatsBlockingYou, whatToDoThisMonth
- [ ] **Cross-reference against the 6 specific slop instances Samuel called out** (from screenshots — see Slop Hit List below) — identify which prompt phrase / instruction allows each one
- [ ] **No code change yet** — this is the diagnosis step. Write findings into a 1-paragraph audit comment at the top of brief-sections.ts

**Slop Hit List (must each become impossible):**

| # | Section | Slop pattern | Source likely |
|---|---------|-------------|---------------|
| 1 | whatToWrite | Tautological "Your essay starts — / That's where the essay starts" | Prompt encourages two layered intros |
| 2 | whatsBlockingYou | Headline + NOW body identical sentence | Prompt doesn't constrain headline ≠ entries[0].title |
| 3 | whereYouStand | "Most students in Kazakhstan your age pursue..." | Prompt allows demographic generalization openers |
| 4 | whereYouStand | "oversaturated piles" / "less common narrative" / "potential to be a standout" | No explicit banned-vocab for these |
| 5 | whereYouStand body | Multi-sentence hedging with maybe/perhaps/likely/sometime | Prompt doesn't cap sentence count or ban hedging |
| 6 | All sections | Hidden Advantage card body = single floating italic quote with no surrounding context | Section prompt allows empty body fields |

### Task A.2: Expand banned-vocab list in editorial-rules.ts

- [ ] **Find the existing `BANNED_VOCAB` array** in `supabase/functions/_shared/editorial-rules.ts` (or wherever `scanBannedVocab()` reads from per the explorer's mapping)
- [ ] **Append these phrases** (single grep-safe lowercase regex tokens):
  ```
  "sometime", "sometimes", "maybe", "perhaps", "likely", "potentially",
  "stands out", "standout", "narrative", "oversaturated", "pile",
  "embark", "unlock", "journey", "potential to be", "your age",
  "most students in", "pursue a direct path", "stick to the traditional",
  "less common", "carve a unique"
  ```
- [ ] **Commit:** `chore(editorial): expand banned-vocab — kill hedging + demographic-cliché openers`

### Task A.3: Rewrite buildPrompt() for whatToWrite (essay seed)

- [ ] **Open `supabase/functions/_shared/brief-sections.ts`** — find the SectionSpec entry where `id === "whatToWrite"`
- [ ] **Replace the prompt body** with these explicit constraints:
  - Output one essay seed: `{ title, body, closer }`
  - `title`: ONE complete sentence. Not a pre-amble. Not "Your essay starts —". The actual essay opening line. ≤14 words.
  - `body`: Maximum 3 sentences. No hedging adverbs (banned list applies). Names ONE specific moment grounded in user's intake (use specificAnchorRequired). No "sometime in the last two years" — name a concrete year or course.
  - `closer`: One imperative sentence. ≤10 words. Tells the user the action ("Write the moment, not the meaning.")
- [ ] **Run `deno check supabase/functions/_shared/brief-sections.ts`** to confirm no type errors
- [ ] **Commit:** `feat(brief-prompt): essay-seed — one sentence title, 3-sentence body cap, imperative closer`

### Task A.4: Rewrite buildPrompt() for whatsBlockingYou

- [ ] **Find SectionSpec where `id === "whatsBlockingYou"`**
- [ ] **Replace prompt body** with:
  - Output `{ headline, lead, entries: [{priority, title, action}] }`
  - `headline`: Names the broad pattern in ≤8 words. (e.g., "You haven't picked a major yet.")
  - `lead`: ONE sentence reframing the pattern as opportunity, not deficit. ≤20 words.
  - `entries`: Exactly 3 items, ordered by priority (`now`, `next`, `later`).
  - **HARD RULE in prompt:** `headline` and `entries[0].title` MUST NOT share more than 3 consecutive words. Validation rejects if violated.
- [ ] **Add validation** to the section's `validate()`: implement `checkHeadlineDoesNotRepeatFirstEntry(payload)` that splits each into word arrays and rejects on >3 shared consecutive words
- [ ] **Commit:** `feat(brief-prompt): whatsBlockingYou — forbid headline echoing first entry title`

### Task A.5: Rewrite buildPrompt() for whereYouStand

- [ ] **Find SectionSpec where `id === "whereYouStand"`**
- [ ] **Replace prompt body** with:
  - Output `{ headline, lead, body, pullquote }`
  - `headline`: ≤10 words. Names what the user IS, not what they aren't.
  - `lead`: ONE sentence. ≤20 words. Cites a specific intake field (GPA, country, field).
  - `body`: Maximum 2 sentences. Each ≤25 words. Concrete examples only, no demographic openers ("Most students in X your age" pattern banned outright in prompt — repeat the constraint in instruction).
  - `pullquote`: One sentence ≤15 words pulled from body OR a paraphrase. Standalone.
- [ ] **Commit:** `feat(brief-prompt): whereYouStand — sentence caps + demographic-opener ban`

### Task A.6: Rewrite buildPrompt() for archetype, whereYouCanLand, whatToDoThisMonth

- [ ] **archetype**: tagline ≤8 words. No "you have the potential to be"-style hedging. Direct identity claim.
- [ ] **whereYouCanLand**: bucket schools each get one-line `lore` ≤18 words. Concrete and specific to that school.
- [ ] **whatToDoThisMonth (mondayMove)**: `headline` ≤12 words AS one complete action. `body` 2 sentences max, ≤25 words each. `closer` one-sentence imperative ≤10 words.
- [ ] **Commit:** `feat(brief-prompt): archetype + land + monday-move — explicit word caps`

### Task A.7: Deploy + smoke test

- [ ] **Deploy:** `supabase functions deploy topuni-ai-pathway` (from worktree root)
- [ ] **Smoke test with 3 archetype profiles** (Yerlan / Aigerim / Daniyar per memory):
  - Hit `/topuni-ai`, fill wizard with each profile's intake (Yerlan: Kazakh, Engineering, 4.0 GPA, Germany target)
  - Generate brief, screenshot output
  - Spot-check: any banned vocab? Any tautology? Any sentence over the cap?
- [ ] **If any check fails:** iterate the failing section's prompt and redeploy
- [ ] **Open PR titled:** `feat(brief): copy regen v2 — tight prompts, expanded banned-vocab, sentence caps`

---

## Stream B: Magazine-default desktop layout + Story/Read tabs

**Worktree:** `~/tu-magazine-default` on branch `feat/magazine-default-layout`
**Owner files:**
- `src/components/TopUniDashboard.tsx` (add tab state, swap default rendered tree by viewport)
- `src/components/brief/BriefChapterNav.tsx` (wire into desktop right rail)
- New: `src/components/brief/DashboardTabs.tsx` (tab UI primitive, ~60 lines)
**Dependencies:** none — starts from main immediately. Stream D follows once this is on `main`.

### Task B.1: Add DashboardTabs component

- [ ] **Create `src/components/brief/DashboardTabs.tsx`**:
  ```tsx
  // Two-tab segmented control: Story / Read. Mobile-first sizing.
  // Defaults to "story" on mobile (<md), "read" on desktop.
  // Stored in URL hash (#story / #read) so refresh preserves state
  // and Sam can share a direct link to either tab.
  import { useEffect, useState } from "react";

  export type DashboardTab = "story" | "read";

  interface Props {
    value: DashboardTab;
    onChange: (v: DashboardTab) => void;
    lang: "en" | "ru";
  }

  export const DashboardTabs = ({ value, onChange, lang }: Props) => {
    const t = (en: string, ru: string) => (lang === "ru" ? ru : en);
    return (
      <div role="tablist" aria-label="Report view" className="inline-flex rounded-full border border-border/60 bg-card p-0.5">
        {(["story", "read"] as const).map((tab) => {
          const active = value === tab;
          const label = tab === "story" ? t("Story", "История") : t("Read", "Читать");
          return (
            <button
              key={tab}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  };

  export const useDashboardTab = (defaultTab: DashboardTab): [DashboardTab, (v: DashboardTab) => void] => {
    const [tab, setTab] = useState<DashboardTab>(() => {
      const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
      return hash === "story" || hash === "read" ? hash : defaultTab;
    });
    useEffect(() => {
      if (typeof window !== "undefined") window.history.replaceState({}, "", `#${tab}`);
    }, [tab]);
    return [tab, setTab];
  };
  ```

### Task B.2: Add tab state to TopUniDashboard and swap rendered tree

- [ ] **Open `src/components/TopUniDashboard.tsx`** — find where `BriefStory` (or `BriefMinimal`/`BriefMagazine`) is mounted in the rendered tree
- [ ] **Determine the desktop default via window width:**
  ```tsx
  import { DashboardTabs, useDashboardTab, type DashboardTab } from "@/components/brief/DashboardTabs";
  // ...inside component:
  const isDesktop = typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
  const [tab, setTab] = useDashboardTab(isDesktop ? "read" : "story");
  ```
- [ ] **Mount tabs above the brief render:**
  ```tsx
  <div className="flex items-center justify-between mb-4">
    <h1 className="font-heading text-2xl sm:text-3xl font-bold">{/* existing welcome header stays */}</h1>
    <DashboardTabs value={tab} onChange={setTab} lang={language} />
  </div>
  {tab === "read" ? <BriefMagazine sections={sections} /* existing props */ /> : <BriefStory sections={sections} /* existing props */ />}
  ```
- [ ] **Run `node_modules/.bin/tsc --noEmit`** — fix any type mismatches (likely prop shape — read both component signatures first)

### Task B.3: Wire BriefChapterNav as desktop right rail

- [ ] **Open `src/components/brief/BriefChapterNav.tsx`** — confirm its prop signature accepts `{ briefContent: string; isRu: boolean }` per explorer's notes; if it derives from markdown but our sections come as structured JSON, adapt: pass section ids+kickers from `BriefSections` directly via a small wrapper component
- [ ] **Create `src/components/brief/BriefChapterNavWrapper.tsx`** if needed — converts `BriefSections` → list of `{ id, label }` chapters and renders `BriefChapterNav`
- [ ] **In `TopUniDashboard.tsx` desktop layout**, wrap the magazine in a 12-col grid:
  ```tsx
  {tab === "read" && isDesktop ? (
    <div className="grid grid-cols-12 gap-8">
      <main className="col-span-12 lg:col-span-9">
        <BriefMagazine sections={sections} /* props */ />
      </main>
      <aside className="hidden lg:block lg:col-span-3 sticky top-20 self-start">
        <BriefChapterNavWrapper sections={sections} lang={language} />
      </aside>
    </div>
  ) : ... }
  ```

### Task B.4: Story-tab desktop framing (phone-preview chrome)

- [ ] **When `tab === "story"` on desktop:** wrap the existing `<BriefStory>` in a chrome container so the bare 400px card no longer floats alone:
  ```tsx
  {tab === "story" && (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-3xl border border-border/60 bg-card p-6 sm:p-10 flex flex-col sm:flex-row items-center gap-8">
        <BriefStory sections={sections} /* props */ />
        <div className="flex-1 space-y-4 max-w-xs">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Share Story</p>
          <h2 className="font-heading text-xl font-bold leading-tight">
            {t("This is the version you'd post to Instagram.", "Эту версию можно опубликовать в Instagram.")}
          </h2>
          <p className="text-sm text-muted-foreground leading-snug">
            {t("Swipe through, screenshot the slides you like, share to your story.", "Листайте, делайте скриншоты любимых слайдов, делитесь в сторис.")}
          </p>
          {/* CTA to switch to Read for the full report */}
          <button onClick={() => setTab("read")} className="text-xs font-semibold underline-offset-4 hover:underline">
            {t("Read the full report →", "Читать полный отчёт →")}
          </button>
        </div>
      </div>
    </div>
  )}
  ```
- [ ] **Verify both tabs render correctly** in dev (`npm run dev`) on desktop AND mobile widths
- [ ] **Commit:** `feat(dashboard): magazine-default on desktop + Story/Read tabs + sticky chapter TOC`

### Task B.5: Verify + ship

- [ ] **Typecheck:** `node_modules/.bin/tsc --noEmit` → 0 errors
- [ ] **Build:** `npm run build` → green
- [ ] **Visual QA:** Open `/topuni-ai`, generate a brief, confirm: desktop defaults to Read tab with magazine + sticky TOC, Story tab shows phone-preview chrome with side panel, mobile defaults to Story tab without chrome, both tab states preserved on refresh via URL hash
- [ ] **Push + PR:** `feat(dashboard): magazine-default desktop layout, Story/Read tabs, sticky chapter TOC`

---

## Stream C: Story-card internal fix (anchors + font + dead space)

**Worktree:** `~/tu-story-internals` on branch `feat/story-card-internals`
**Owner files:**
- `src/components/brief/BriefStory/BriefStory.tsx` (font scale + per-frame visual anchor slot)
- Sub-frame components inside `src/components/brief/BriefStory/` (each frame file)
**Dependencies:** none — starts from main, runs parallel to B. (B controls the OUTER chrome; C controls the INNER card content.)

### Task C.1: Audit per-frame layout — measure the dead space

- [ ] **Open `BriefStory.tsx`** — locate the 6 frame components. For each, identify: where the bottom-of-card empty space starts (which div has flex-1 / grows to fill)
- [ ] **For each frame** decide what fills the dead space:
  - **Frame 02 (Archetype):** Archetype emblem placeholder (gradient circle for now; replaced with `ArchetypeRadial` from Stream D)
  - **Frame 03 (Stand):** Pullquote moves to bottom in larger italic display type, taking the space
  - **Frame 04 (Land):** Country flag strip becomes larger; "1 country" expands to include adjacency strip from Stream E
  - **Frame 05 (Essay):** No change to layout — body fills, this card is OK
  - **Frame 06 (Blocking):** 3 priority chips expand vertically with deadline-distance mini-bars
  - **Frame 07 (Monday Move):** Calendar mini-strip pinned-day visual (Mon-Sun row, target day highlighted)

### Task C.2: Rebalance type scale across all frames

- [ ] **Codify the scale** at the top of `BriefStory.tsx`:
  ```tsx
  // Type scale for Story cards. Sized for the 400px-wide 9:16 frame.
  // Kicker stays tiny + uppercase (current eyebrow).
  // Heading: 28px mobile, 36px desktop — bigger than current.
  // Body: 14px with leading-snug — bigger than current 12px.
  // Pullquote: 18px italic.
  const KICKER = "text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold";
  const HEADING = "font-heading text-[28px] md:text-[32px] font-bold leading-tight tracking-tight";
  const BODY = "text-[14px] leading-snug text-foreground/90";
  const PULLQUOTE = "text-[18px] italic font-medium text-foreground/85 leading-snug";
  const CLOSER = "text-[13px] font-semibold text-foreground/80";
  ```
- [ ] **Apply each constant in the corresponding frame** — search-and-replace old hardcoded sizes to the named constants

### Task C.3: Add visual-anchor slot to BriefStory frame primitive

- [ ] **Find the shared frame layout** in BriefStory.tsx (the card wrapper that all 6 frames render into)
- [ ] **Add a `<VisualAnchor>` slot** below the body content, before the footer pagination/play button:
  ```tsx
  // Each frame opts in by passing a `<VisualAnchor>` element. If a frame
  // doesn't pass one, the slot is empty (no layout shift). Stream D fills
  // these with charts; Stream C ships with the static placeholders below.
  ```
- [ ] **Frame 02 placeholder:** centered gradient circle 120px with archetype name initials inside
- [ ] **Frame 06 placeholder:** 3 horizontal bars with priority colors (red/amber/zinc) — each labeled with the entry title

### Task C.4: Fix the Monday Move font hierarchy

- [ ] **In Frame 07 (Monday Move)** — heading currently dwarfs body. Apply HEADING + BODY constants from C.2. Heading should be `text-[28px] md:text-[32px]` (not the giant size it currently uses). Body should be `text-[14px]`, not the tiny 12px.

### Task C.5: Verify + ship

- [ ] **Typecheck + build** clean
- [ ] **Visual QA:** generate a brief, walk all 7 frames in Story view. Confirm: no card has empty bottom-half; type sizes consistent across frames; Monday Move balanced
- [ ] **Commit + PR:** `feat(brief-story): internal layout — type scale unified, visual-anchor slots, kill dead space`

---

## Stream D: Data viz wired

**Worktree:** `~/tu-viz` on branch `feat/brief-viz-wired`
**Dependencies:** **Stream B must be on main first** — Stream D mounts visualizations into the layout B established.

**Owner files:**
- New: `src/components/brief/ArchetypeRadial.tsx` (~120 lines pure SVG)
- New: `src/components/brief/DestinationsMap.tsx` (~150 lines, simplified world SVG)
- Modify: section renderers in `src/components/brief/sections/` to mount existing charts (`CombinedFundingChart`, `DeadlineTimeline`, `FundingStack`, `CareerRoiChart`)
- Modify: BriefStory frames (Frame 02 mounts ArchetypeRadial, Frame 04 mounts DestinationsMap mini-version)

### Task D.1: Build ArchetypeRadial

- [ ] **Create `src/components/brief/ArchetypeRadial.tsx`:**
  ```tsx
  // 5-axis radial chart for the archetype card. Pure SVG.
  // Axes (fixed; values come from the archetype detector):
  //   quant ↔ qualitative
  //   individual ↔ collaborative
  //   deep-domain ↔ broad-horizon
  //   builder ↔ researcher
  //   leader ↔ contributor
  // Renders a regular pentagon with axis labels + a filled polygon
  // showing the user's position. ~120 lines.

  interface AxisValue { name: string; value: number; /* -1..1 */ }
  interface Props { axes: AxisValue[]; archetypeColor?: string; }

  export const ArchetypeRadial = ({ axes, archetypeColor = "#1A3B66" }: Props) => {
    const SIZE = 200;
    const CENTER = SIZE / 2;
    const RADIUS = 75;
    const angle = (i: number) => (i / axes.length) * Math.PI * 2 - Math.PI / 2;
    const point = (i: number, scale: number) => ({
      x: CENTER + Math.cos(angle(i)) * RADIUS * scale,
      y: CENTER + Math.sin(angle(i)) * RADIUS * scale,
    });
    const polygonPoints = axes.map((a, i) => {
      const p = point(i, (a.value + 1) / 2);
      return `${p.x},${p.y}`;
    }).join(" ");
    return (
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden>
        {/* Pentagon grid — 3 rings */}
        {[0.33, 0.66, 1].map((scale, idx) => (
          <polygon
            key={idx}
            points={axes.map((_, i) => { const p = point(i, scale); return `${p.x},${p.y}`; }).join(" ")}
            fill="none" stroke="currentColor" strokeOpacity="0.15"
          />
        ))}
        {/* Axis labels */}
        {axes.map((a, i) => {
          const labelPos = point(i, 1.18);
          return <text key={i} x={labelPos.x} y={labelPos.y} textAnchor="middle" className="text-[10px] fill-current opacity-60">{a.name}</text>;
        })}
        {/* User polygon */}
        <polygon points={polygonPoints} fill={archetypeColor} fillOpacity="0.18" stroke={archetypeColor} strokeWidth="1.5" />
      </svg>
    );
  };
  ```

### Task D.2: Mount ArchetypeRadial into Frame 02 + magazine archetype section

- [ ] **Read the archetype payload shape** in `src/components/brief/types.ts` — does `archetype` payload include axis values? If not, derive defaults from the archetype ID (each archetype gets a fixed axis profile, hardcoded lookup):
  ```tsx
  const ARCHETYPE_AXES: Record<string, AxisValue[]> = {
    "quant-builder": [/* ... */],
    "bridge-domain-kid": [/* ... */],
    // ...
  };
  ```
- [ ] **Mount in BriefStory Frame 02** — replace the C.3 gradient-circle placeholder with `<ArchetypeRadial axes={ARCHETYPE_AXES[archetype.id] ?? defaultAxes} archetypeColor={archetype.color} />`
- [ ] **Mount in magazine archetype section** at a larger scale

### Task D.3: Build DestinationsMap

- [ ] **Create `src/components/brief/DestinationsMap.tsx`** — mini world map of the 40 most-likely destination countries for CIS-origin students; each country a clickable SVG path; dot scales with `bucket.schools.length` if user has matches there; greyed if no match
- [ ] **Source:** use a Natural Earth simplified TopoJSON converted to SVG paths (single static file `src/lib/world-paths.ts`). Coordinates limited to ~40 country paths to keep bundle small (<5kb)

### Task D.4: Mount DestinationsMap into Frame 04 + magazine land section

- [ ] **Replace** the existing "2 schools, 1 country" plain-text rendering in BriefStory Frame 04 with map + count chip
- [ ] **Magazine section** version is larger and clickable (clicking a country jumps to that bucket's school list)

### Task D.5: Wire existing chart components into magazine sections

- [ ] **In `whereYouCanLand` section renderer:** mount `<CombinedFundingChart liveMatches={liveMatches} />` below the country buckets (tuition vs. typical-scholarship-coverage)
- [ ] **In `whereYouCanLand` again:** mount `<DeadlineTimeline matches={liveMatches} />` as a horizontal strip showing upcoming deadlines
- [ ] **In `whatsBlockingYou`:** mount `<FundingStack />` if showing a funding-gap blocker; else skip
- [ ] **For each chart:** confirm props match what the section renderer has access to — adapt by passing the right slice if needed

### Task D.6: Verify + ship

- [ ] **Typecheck + build** clean (chart libs may need import paths sanity-checked)
- [ ] **Visual QA:** generate brief with 3 different profiles, walk every section, confirm visualizations render and don't break on empty data
- [ ] **Commit + PR:** `feat(brief-viz): archetype radial + destinations map + inline charts in magazine`

---

## Stream E: Where-You-Belong sparseness + adjacent-country lookup

**Worktree:** `~/tu-adjacency` on branch `feat/destination-adjacency`
**Owner files:**
- New: `src/lib/adjacent-countries.ts` (static lookup table, ~80 lines)
- Modify: `src/components/brief/sections/WhereYouCanLand.tsx`
- Modify: `src/components/brief/BriefStory/BriefStory.tsx` Frame 04
**Dependencies:** none — parallel to A/B/C/F

### Task E.1: Build the adjacency lookup

- [ ] **Create `src/lib/adjacent-countries.ts`:**
  ```ts
  // Country adjacency for "You might also fit" suggestions.
  // Manually curated by Samuel for CIS-origin students.
  // Adjacent = similar tier, similar entry requirements, similar
  // tuition+visa profile. Not pure geography — e.g. UK→Ireland,
  // Germany→Netherlands/Austria/Czechia, US→Canada.

  export type CountryISO = string;
  export type Tier = "T1" | "T2" | "T3";

  interface CountryProfile {
    /** Tier 1 = elite Anglosphere, T2 = mainland EU + AU/NZ, T3 = emerging hubs */
    tier: Tier;
    /** Up to 4 adjacent countries, ordered by closeness of fit */
    adjacent: CountryISO[];
  }

  export const COUNTRY_ADJACENCY: Record<CountryISO, CountryProfile> = {
    DEU: { tier: "T2", adjacent: ["NLD", "AUT", "CZE", "DNK"] },
    NLD: { tier: "T2", adjacent: ["DEU", "BEL", "SWE", "AUT"] },
    GBR: { tier: "T1", adjacent: ["IRL", "NLD", "DEU", "AUS"] },
    USA: { tier: "T1", adjacent: ["CAN", "GBR", "AUS", "NLD"] },
    CAN: { tier: "T1", adjacent: ["USA", "GBR", "AUS", "IRL"] },
    AUS: { tier: "T1", adjacent: ["NZL", "CAN", "GBR", "SGP"] },
    IRL: { tier: "T2", adjacent: ["GBR", "NLD", "DEU", "CAN"] },
    TUR: { tier: "T3", adjacent: ["HUN", "POL", "CZE", "ITA"] },
    HUN: { tier: "T3", adjacent: ["POL", "CZE", "AUT", "DEU"] },
    POL: { tier: "T3", adjacent: ["HUN", "CZE", "DEU", "NLD"] },
    CZE: { tier: "T3", adjacent: ["DEU", "AUT", "HUN", "POL"] },
    AUT: { tier: "T2", adjacent: ["DEU", "CZE", "CHE", "NLD"] },
    CHE: { tier: "T2", adjacent: ["DEU", "AUT", "FRA", "NLD"] },
    FRA: { tier: "T2", adjacent: ["BEL", "NLD", "CHE", "DEU"] },
    ITA: { tier: "T2", adjacent: ["ESP", "FRA", "AUT", "DEU"] },
    ESP: { tier: "T2", adjacent: ["PRT", "ITA", "FRA", "NLD"] },
    SWE: { tier: "T2", adjacent: ["NOR", "DNK", "FIN", "NLD"] },
    NOR: { tier: "T2", adjacent: ["SWE", "DNK", "FIN", "NLD"] },
    DNK: { tier: "T2", adjacent: ["SWE", "NOR", "NLD", "DEU"] },
    FIN: { tier: "T2", adjacent: ["SWE", "NOR", "EST", "NLD"] },
    SGP: { tier: "T1", adjacent: ["AUS", "GBR", "CAN", "NZL"] },
    JPN: { tier: "T2", adjacent: ["KOR", "SGP", "AUS", "USA"] },
    KOR: { tier: "T2", adjacent: ["JPN", "SGP", "AUS", "USA"] },
    // Add more as needed; default fallback below covers gaps
  };

  /** Returns up to N adjacent country ISOs, or empty array if unknown. */
  export const getAdjacentCountries = (iso: CountryISO, limit = 3): CountryISO[] =>
    (COUNTRY_ADJACENCY[iso]?.adjacent ?? []).slice(0, limit);
  ```

### Task E.2: Wire into WhereYouCanLand section + Story Frame 04

- [ ] **In `WhereYouCanLand.tsx` section renderer:** after rendering the user's `buckets[]`, if `buckets.length < 3 OR targetCountries.length === 1`:
  - Pull `getAdjacentCountries(primaryCountryISO, 3)`
  - For each adjacent ISO, query `scholarships` table (Supabase client) for 1 representative published row (`.eq("host_country", iso).eq("is_published", true).limit(1)`)
  - Render under heading "You might also fit" with each: country name + 1 sample school + "see N more in Discover" link → `/discover?country=<iso>`
- [ ] **In `BriefStory.tsx` Frame 04:** same sparse-check, append a horizontal scroll-strip with 3 adjacent-country mini-cards below the main "X schools, Y country" pane
- [ ] **Test cases:**
  - User picked `targetCountries: ["Germany"]` → shows DEU bucket + NLD/AUT/CZE strip
  - User picked 3+ countries → no adjacency strip
  - User picked country not in lookup → strip silently absent

### Task E.3: Verify + ship

- [ ] **Typecheck + build** clean
- [ ] **Visual QA:** test all 3 cases above
- [ ] **Commit + PR:** `feat(brief): adjacent-country suggestions when destinations are sparse`

---

## Stream F: Print stylesheet + navy token unification

**Worktree:** `~/tu-print-and-navy` on branch `feat/print-and-navy`
**Owner files:**
- `src/index.css` (add `@media print` block)
- `tailwind.config.ts` (audit navy color tokens; consolidate)
- Open Discover CTA component (find via grep, swap hardcoded navy → `bg-brand-navy` token)
- Footer (verify uses same token)
- BriefMasthead.tsx (wire Print CTA to `window.print()`)
**Dependencies:** none — parallel to all others

### Task F.1: Audit current navy usage

- [ ] **Grep for navy color values:** `grep -rn "1A3B66\|navy\|brand-navy" src/ tailwind.config.ts | head -40`
- [ ] **Document findings** as a one-paragraph comment at top of `tailwind.config.ts`:
  - Which files use `#1A3B66` directly (hardcoded hex)?
  - Which files use `bg-brand-navy` already?
  - Are there TWO different navies in use? (The screenshot shows Open Discover CTA navy ≠ footer navy.)

### Task F.2: Consolidate to one token

- [ ] **In `tailwind.config.ts`** — confirm `brand-navy` is in `theme.extend.colors` with the canonical hex (use the FOOTER navy from the screenshot — that's the brand reference)
- [ ] **Replace every hardcoded `#1A3B66` or alternate-navy hex** with `bg-brand-navy` / `text-brand-navy` className
- [ ] **Specifically check + fix:**
  - `src/components/discover/AcademyHookCta.tsx` (the Open Discover CTA Sam called out)
  - `src/components/Footer.tsx` or equivalent
  - `src/components/brief/BriefStory/...` (Frame 05 essay-bg navy)

### Task F.3: Add print stylesheet

- [ ] **In `src/index.css`** append a `@media print` block:
  ```css
  @media print {
    /* Hide nav chrome, share controls, tabs, sticky TOC, footer */
    nav, header[role="banner"], aside, [data-print-hide], .sticky, button {
      display: none !important;
    }
    /* Reset background + foreground for ink economy */
    body { background: #fff !important; color: #000 !important; font-family: Georgia, serif; }
    .bg-card, .bg-muted, .bg-background { background: #fff !important; }
    /* Page setup */
    @page { size: A4; margin: 1.5cm 1.8cm; }
    /* Section breaks */
    section, [data-print-section] { page-break-inside: avoid; break-inside: avoid; }
    section + section { page-break-before: auto; }
    /* Charts: ensure they print in monochrome-readable form */
    svg { color: #000 !important; }
  }
  ```
- [ ] **Add `data-print-hide` attribute** to: DashboardTabs (Stream B's output — coordinate via spec, no need for direct dep since both land on main), the right-rail TOC, Story-tab phone-preview chrome side panel, share buttons in BriefMasthead

### Task F.4: Wire Print CTA in BriefMasthead

- [ ] **Open `src/components/brief/BriefMasthead.tsx`** — find the existing Print CTA placeholder
- [ ] **Wire to:** `onClick={() => window.print()}`. Add `data-print-hide` attribute so it doesn't print itself
- [ ] **Visual hint** next to CTA: "Opens print dialog — choose 'Save as PDF' for download"

### Task F.5: Verify + ship

- [ ] **Typecheck + build** clean
- [ ] **Visual QA:** generate brief, click Print, confirm PDF preview shows clean magazine view with sections paginated, no nav chrome, no tabs, charts visible
- [ ] **Color QA:** confirm Open Discover CTA navy matches Footer navy exactly (eyedropper)
- [ ] **Commit + PR:** `feat(brief): print stylesheet for PDF export + navy color token unification`

---

## Final integration step (after all 6 streams merged)

- [ ] **From `~/tu-consulting`** on `main` (after all 6 PRs merged): `git pull`
- [ ] **Walk the full flow** end-to-end on Vercel preview deploy:
  - Sign in fresh
  - Open `/topuni-ai`
  - Fill wizard with Yerlan profile
  - Watch brief stream in magazine view (default desktop)
  - Verify: copy is tight, no banned vocab, no tautology, charts render, adjacency works if Yerlan picked 1 country, print produces clean PDF
  - Switch to Story tab — confirm phone-preview chrome on desktop, cards have visual anchors filling dead space, type scale balanced
  - Switch back to Read — confirm sticky TOC works, Open Discover CTA navy matches footer
- [ ] **Save a memory entry** documenting the overhaul shipped, link the PR numbers
- [ ] **Hand off to Sam** for Nurzada post

---

## Self-Review

**Spec coverage:** Every spec section maps to a stream — copy regen → A, layout → B, story internals → C, viz → D, sparseness → E, print + navy → F. Architecture diagram → addressed in B. Component inventory (new + wired) → distributed across B/D/E/F.

**Placeholder scan:** No "TBD"/"TODO"/"figure out". The two forward-references — D.2's ARCHETYPE_AXES default mapping and D.3's TopoJSON source — both have concrete implementation paths (hardcoded lookup, single static file with specific size budget).

**Type consistency:** `DashboardTab`, `BriefSections`, `CountryISO`, `AxisValue` consistent across streams. Each stream stays within its file-ownership column to avoid type drift.

**Convention:** Every stream worktree + branch tag uses `tu-<tag>` / `feat/<tag>` naming. Every PR uses `--auto --delete-branch` for auto-merge on green CI.
