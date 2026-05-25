# Top Uni AI Strategy Report — Full Overhaul

**Date:** 2026-05-25
**Author:** Samuel + Claude (Opus 4.7)
**Status:** Approved for parallel implementation
**Ship target:** All 6 streams merged before Nurzada launch post

## Why

The `/topuni-ai` strategy report, as it renders today, is the headline product surface for the founding-20 launch — and it's not shippable. Samuel reviewed the live output and flagged it as "ugly as heck": skinny 9:16 card centered on a wide desktop viewport with massive whitespace wings; empty bottom-two-thirds inside every card; AI-slop redundant copy (tautological "Your essay starts — / That's where the essay starts"); same sentence echoed in headline + body on the avoiding card; zero diagrams or visualizations despite five chart components sitting unmounted in `src/components/brief/`; navy CTA color clashes with footer navy; Monday-Move heading-to-body type ratio broken.

The report is also presentation-thin in one direction: it's an Instagram-story click-through with no long-form scroll / PDF companion. The founding-20 audience needs both — the swipeable IG-shareable for proof-of-product, and a serious one-page-feel scroll/print version for the "real strategy report" perception.

## What we're building

Six parallel work streams, each its own PR. End state:

1. Desktop default view is the long-form magazine (`BriefMagazine` / `BriefMinimal`), already 80% built. IG-story stays as the "Share Story" affordance, primary on mobile.
2. The report copy is regenerated against tighter prompts in `_shared/brief-sections.ts`. No tautology, no hedging adverbs, no AI-slop verbs, no patronizing demographic generalizations.
3. Inline data visualizations: archetype radial SVG, mini world map of destinations, deadline timeline strip, funding stack chart.
4. "Where You Belong" no longer reads thin when the user picked 1 country — adjacent-tier countries surface with sample programs.
5. Print stylesheet + the existing masthead Print CTA produces a clean Cmd+P → PDF export. No server-side PDF generation in v1.
6. Single navy token used everywhere (footer, Open Discover CTA, essay-frame bg). Type scale audited and rebalanced.

### Content-density constraint (locked)

The total written copy across all 6 sections, single-spaced and compressed, should fit on one printed page. Estimated budget: **~600–900 words total**. The visual presentation gets breathing room and large type; the underlying content stays tight. Each section gets approximately:

- Archetype (00): 1 headline + 1 tagline + 1 sentence = ~25 words
- Where You Stand (01): 1 headline + 2-3 sentences = ~80 words
- Where You Can Land (02): 1 headline + 2 sentences + per-bucket micro-lore = ~150 words
- What to Write (03): 1 essay-seed (title + 3 sentences + closer) = ~80 words
- What's Blocking (04): 1 headline + 1 lead + 3 entries × ~25 words = ~110 words
- Monday Move (05): 1 headline + 2-3 sentences = ~70 words

Sum: ~515 words core + framing chrome = under 900-word ceiling. Anything that would push past it is cut, not rewritten.

## Scope

### In scope

- All rendering inside `src/components/brief/` and the `/topuni-ai` dashboard tab structure
- All section prompts in `supabase/functions/_shared/brief-sections.ts`
- The `EDITORIAL_RULES` banned-vocab list in the shared edge module
- New small components: archetype radial SVG, adjacent-country lookup, print stylesheet
- Wiring previously-built but unmounted components: `BriefChapterNav`, `CareerRoiChart`, `CombinedFundingChart`, `DeadlineTimeline`, `FundingStack`, `VisaPathwayChart`, `ShareAsset`

### Out of scope

- Server-side PDF generation (Puppeteer / react-pdf). Cmd+P print → PDF is sufficient for v1.
- New brief-section payload shapes. Backend payload contracts stay v7; only copy and validation tighten.
- Discover-side changes (those landed in #93/#94/#125-revert today)
- Counselor / chat surfaces
- New languages beyond en/ru

## Architecture

### Tab structure on /topuni-ai dashboard

```
Desktop (≥md breakpoint):
┌──────────────────────────────────────────────────────────────┐
│ Welcome, {name} · {meta line}                  [Story][Read] │
├───────────────────────────────────────┬──────────────────────┤
│                                       │  Chapter TOC         │
│  BriefMagazine (long-form scroll)     │  · 00 Archetype      │
│  - Masthead + HeroStats               │  · 01 Where you stand│
│  - Section renderers (one per card)   │  · 02 Where you land │
│  - Inline visualizations              │  · 03 What to write  │
│  - HandoffBridge → Discover           │  · 04 What's blocking│
│                                       │  · 05 Monday move    │
│                                       │                      │
│                                       │  Share controls      │
│                                       │  Discover preview    │
└───────────────────────────────────────┴──────────────────────┘

Mobile (<md):
┌─────────────────────────────┐
│ Welcome, {name}             │
│ [Story] · [Read]            │
├─────────────────────────────┤
│  BriefStory (9:16 deck)     │
│  ← Story tab default →      │
│  Tap Read for magazine view │
└─────────────────────────────┘
```

The Story tab on desktop renders the existing 400px-wide deck *but* centered in a frame that explicitly looks like a phone preview, with editorial chrome around it (caption, share buttons, "this is the IG-shareable version" affordance) instead of bare whitespace wings.

### Stream → file ownership

| Stream | Owner files | Touches |
|--------|------------|---------|
| **A: Copy regen** | `supabase/functions/_shared/brief-sections.ts`, `supabase/functions/_shared/editorial-rules.ts` | Backend prompts + validation only |
| **B: Magazine-default layout** | `src/components/TopUniDashboard.tsx`, `src/components/brief/BriefChapterNav.tsx` (wire), new tabs component | Frontend layout, tab state, sticky TOC mount |
| **C: Story-card internals** | `src/components/brief/BriefStory/BriefStory.tsx`, sub-frame files | Internal layout, font scale, visual anchors per frame |
| **D: Data viz wired** | New `src/components/brief/ArchetypeRadial.tsx`, new `src/components/brief/DestinationsMap.tsx`, wire existing chart components into magazine sections | Visualization components |
| **E: Where-You-Belong sparseness** | `src/components/brief/sections/WhereYouCanLand.tsx`, new `src/lib/adjacent-countries.ts` lookup, `BriefStory` Frame 04 | Sparse-fallback logic + adjacency data |
| **F: Print CSS + navy token** | `src/index.css` (print rules), `tailwind.config.ts` (token audit), Open Discover CTA component, footer | Cross-cutting visual polish |

Streams A, B, C, E, F are independent — work in parallel from main.
Stream D depends on B's tab/layout decisions; starts ~30 min after B opens its PR.

## Components

### New components

**`ArchetypeRadial.tsx`** — Pure SVG, 5-axis radial diagram (e.g. quant/qual, individual/collaborative, deep-domain/broad-horizon, builder/researcher, leader/contributor — final axes locked in stream D). Current archetype plotted as a filled polygon + dot at peak. No JS library — hand-rolled SVG, ~80 lines, prop = `{ axes: { name, value }[] }`.

**`DestinationsMap.tsx`** — Mini world map (likely SVG via a stripped svg-world-map source). Country dots scale with school count; clicking a country jumps to that section of magazine. ~120 lines.

**`adjacent-countries.ts`** — Static lookup: `Record<countryISO, { adjacent: string[], tier: "T1"|"T2"|"T3" }>`. Used by stream E to suggest 2–3 additional countries when user picked 1.

**`print.css`** (or Tailwind `print:` utilities throughout) — Hides nav/chrome/share/TOC; sets `@page A4`; section page-break-before rules; ensures charts render in print-safe colors.

### Newly wired existing components

- `BriefChapterNav.tsx` → mounts in right rail of magazine view on desktop
- `BriefHeroStats.tsx` → already mounted, kept under masthead
- `CareerRoiChart`, `CombinedFundingChart`, `DeadlineTimeline`, `FundingStack`, `VisaPathwayChart` → mount inside their respective magazine sections per stream D's section-by-section map (to be decided in stream D plan)

### Modified components

- `BriefStory.tsx` — keep 400px max-w on Story tab; add per-frame visual anchor slot (archetype emblem on 02, mini-map dot on 04, countdown ring on 06, etc.); rebalance type scale (kicker `text-[11px]`, body `text-[14px]`, heading responsive `text-[28px] md:text-[36px]`)
- `TopUniDashboard.tsx` — add tab state (`view: "story" | "read"`), default `read` on desktop / `story` on mobile, swap rendered tree accordingly
- `BriefMasthead.tsx` — wire the Print CTA to `window.print()`; ensure print stylesheet hides the CTA itself in printed output
- Open Discover CTA — color token unification

## Data flow

No backend payload contract changes. `BriefSections` v7 shape stays exactly as it is in `src/components/brief/types.ts`. The same SSE stream from `topuni-ai-pathway` feeds both Story and Read tabs (they read from the same React state, just render differently). Adjacent-countries lookup runs client-side; no API call.

For Where-You-Belong sparseness logic:
- Input: `whereYouCanLand.buckets[]` + user's `targetCountries[]`
- If `buckets.length < 3` OR `targetCountries.length === 1`: client-side enrichment fires — pulls top 3 adjacent countries from the lookup, queries `scholarships` table for 1 representative published row per adjacent country (existing Discover scoring), appends as "You might also fit" strip. No new edge function.

## Error handling

Existing patterns kept:
- Streaming SSE errors → existing recovery in `BriefMagazine` (skeleton states, retry)
- Adjacent-country query failure → silent fallback to "see more in Discover" CTA without suggestions
- Print stylesheet failure → user can still read the magazine view; degradation is invisible
- Archetype radial / map SVG render errors → fall back to existing text-only card (boundary catches, no white-screen)

## Testing

No automated test suite in this repo (per CLAUDE.md). Verification is per-stream:
- Stream A: prompt outputs spot-checked against 3 sample profiles (Yerlan/Aigerim/Daniyar archetypes per memory)
- Stream B/C: visual diff against current screenshots + manual desktop+mobile QA
- Stream D: visualization renders with both empty and populated `liveMatches`
- Stream E: tested with `targetCountries = ["Germany"]` (current failure case from screenshot)
- Stream F: `Cmd+P → Save as PDF` produces clean output; color token grep returns single source
- Final integration: full /topuni-ai flow walked end-to-end before deploy

## Open questions

None blocking. Adjacent-country tier lookup data (which countries pair with which) is a static editorial decision Samuel can amend post-ship.
