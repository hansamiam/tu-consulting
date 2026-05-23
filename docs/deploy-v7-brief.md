# v7 Brief deploy runbook (2026-05-22 spec)

Converts the 9 open PRs into actually-deployed product. Each step
is gated on the previous; don't skip the verification between
merges or you'll lose the ability to bisect when something breaks.

Spec lives at `~/.claude/plans/ok-good-morning-claude-frolicking-moth.md`
(local-only). Implementation status memory at
`~/.claude/projects/-Users-samuel/memory/project_topuni_ai_v7_implementation_status.md`.

---

## The PR stack

All 9 PRs are forward-compatible — they can be merged in any order
**that respects parent-branch dependencies**:

```
                                            ┌─ #34 verify-brief
                              ┌─ #33 share-asset ─┘
                       ┌─ #32 payload-reshape ─┘
                ┌─ #31 cardstack ──────────────┘
         ┌─ #30 preplan ───────────────────────┘
         ├─ #28 archetypes ─┘   (merged INTO #30)
         ├─ #29 personality ┘   (merged INTO #30)
  main ──┼─ #27 intake ──────────────────────────  (independent)
         └─ #26 brief-sections-v7 ─┘ (merged INTO #30)
```

**Single fast path: merge #27 + #34.** #34 has #33→#32→#31→#30 as
its parent chain, and #30 has #26/#28/#29 merged in. Merging #34
brings the whole stack except #27. Merging #27 brings the
independent intake changes.

**Slower granular path: merge in dependency order** — #26, #28,
#29, #27 first (independent), then #30, then #31, then #32, then
#33, then #34. Useful if you want each PR reviewed in isolation
before the dependent one lands.

---

## Pre-flight checklist

Before merging anything to main, confirm these are set in the
Supabase function secrets:

```sh
supabase secrets list
```

Required for the brief generator:

- `LOVABLE_API_KEY` or (`OPENAI_API_KEY` + `AI_PROVIDER=openai`) or
  (`ANTHROPIC_API_KEY` + `AI_PROVIDER=anthropic`)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

The pre-plan call adds one extra LLM call per brief (~$0.0006 on
flash tier). Total brief spend goes from ~$0.05 to ~$0.0506 —
~1.2% increase. Latency adds ~2-4s to TTFB (offset by emitting the
archetype SSE event the moment the plan resolves).

---

## Step 1 — Merge #27 (intake) first

`#27 brief-v7-intake` is independent of the rest. It adds:

- New `major_certainty` Step 2 select
- Covert I/E placeholder in Step 3 background field
- `student_profiles.major_certainty` column (migration)

```sh
gh pr review 27 --approve
gh pr merge 27 --squash --delete-branch
```

Then run the migration:

```sh
cd ~/tu-consulting
git pull origin main
supabase link --project-ref bsfldtpemfxhnkdzccib  # if not already linked
supabase db push
```

Verify the column exists:

```sh
supabase db sql --query "select column_name, data_type from information_schema.columns where table_name = 'student_profiles' and column_name = 'major_certainty';"
```

Should print:

```
 column_name      | data_type
------------------+-----------
 major_certainty  | text
```

**Smoke**: open `/topuni-ai` in dev. Step 2 should show the new
"How sure are you?" select. Step 3's "Background context" field
placeholder should mention introverted/extrovert exemplars.

If this looks good, proceed to step 2. If not, revert with
`gh pr ready 27 --undo` (won't actually un-merge; you'd
revert via `git revert <merge-sha>` + new PR).

---

## Step 2 — Merge #34 (brings #26 / #28 / #29 / #30 / #31 / #32 / #33)

`#34 brief-v7-verify` is the leaf of the chain. Merging it brings:

- Backend: brief-sections.ts v7 (anti-slop prompts, cultural
  branching, semantic validators), archetype library (16-entry
  closed set + heuristic detector), personality-axis extractor
  (regex EN+RU), pre-plan LLM call with cache schema 3
- Frontend: card-stack swipe nav, payload reshapes (essaySeed /
  buckets / mondayMove), Wrapped-Bold PNG share via html-to-image
- Scripts: `verify-brief.ts` runnable harness with 6 spec tests

```sh
gh pr review 34 --approve
gh pr merge 34 --squash --delete-branch
git pull origin main
```

Deploy the edge function:

```sh
supabase functions deploy topuni-ai-pathway
```

The deploy shouldn't need any env-var changes (the resolver +
extractor are pure-deterministic with no new env deps).

---

## Step 3 — Smoke test against a real student profile

Open `/topuni-ai` on your phone (mobile experience is the primary
target). Walk through the wizard for the **Yerlan** profile (the
canonical Bridge-Domain Kid case — cross-domain student, undecided
major, the gold-standard exemplar the v7 spec was built around):

- Step 1: "Yerlan Bekov", your email, "Kazakhstan", 11th Grade
- Step 2: GPA 3.7, IELTS 7.0, **major_certainty = "Not at all"**,
  target countries Canada + United Kingdom + Singapore, major
  "Computer Science" (placeholder — the brief should call this out)
- Step 3: career goal "build something policy-shaped, not sure
  what yet", extracurriculars "debate captain since 9th grade,
  Math Olympiad regional bronze, ran a small coding club for
  middle-schoolers", background "introverted policy nerd who reads
  more than he should — got into debate because it was the one
  place arguing wasn't rude"

Archetype should resolve to **Bridge-Domain Kid** (cross-domain
debate + math intersection) or **Open Question** (undecided major
overrides). Primary gap should be **major-uncertainty** (warm
naming) because `major_certainty = "not at all"`.

**Additional smoke tests** if you want broader archetype coverage:

- **Aigerim Tolegen (Open Question, normal-shaped profile)** —
  GPA 3.6, IELTS 6.5, major_certainty = "Some idea, not confident",
  target countries Canada + Singapore, major "Business",
  extracurriculars "captain of girls' volleyball, MUN delegate,
  tutor for younger students", background "first in family to apply
  abroad, parents both work in retail". Tests that the brief works
  for the typical single-focus undecided kid without cross-domain
  ECs. Should resolve archetype = **Open Question** or **Quiet
  Builder**.

- **Daniyar Bekenov (Tight Lane, decided major)** — Major
  "Computer Science", **major_certainty = "Certain"**,
  targetCountries `["United States"]` only (single-country
  tunnel-vision = library-entry gap fires), extracurriculars
  "competitive programming club president since 9th grade, ICPC
  honors, taught Python summer camp two years". Should resolve
  archetype = **Tight Lane**, primary gap = library-entry (NOT
  major-uncertainty).

All three pre-built fixtures live in `scripts/sample-brief.test.json`
(Yerlan), `scripts/sample-brief-typical.test.json` (Aigerim) and
`scripts/sample-brief-tight-lane.test.json` (Daniyar) if you want
to run the harness against a synthetic brief without going through
the wizard first.

Click "Generate my plan." Watch the brief stream.

### What you should see (visual)

1. **Archetype card** appears FIRST with the archetype name + tagline
   on a saturated brand-tinted background (navy or warm-gold family
   per PR #36 palette). For the Yerlan profile, likely "The
   Bridge-Domain Kid" (navy `#1F3A6B`) or "The Open Question" (warm
   graphite `#6F6963`). For Aigerim, likely "The Open Question."
   For Daniyar, likely "The Tight Lane" (ink navy `#122A47`).
2. **Where you stand card** uses the v7 prose: identity claim
   headline + pile-contrast body referencing IT-track/engineering/
   finance piles (NEVER pre-med — that's the CIS rule).
3. **Where you belong card** uses country buckets (not
   reach/target/safety). Matches the intake targetCountries, 1-3
   schools per country, each with a one-line lore.
4. **The essay only you can write**: ONE seed in speculative tense
   ("sometime in the last two years...", "find that exact moment").
   Not 3 angles.
5. **What you're avoiding**: for Yerlan and Aigerim (both have
   `majorCertainty in {not_at_all, some_idea}`), the major-uncertainty
   branch fires — named warmly as information not a flaw. For
   Daniyar (Tight Lane), the single-country tunnel-vision library
   entry fires instead (because targetCountries.length === 1).
6. **Your Monday Move**: ONE move with a verb + artifact + low-bar
   permission phrase ("don't polish" / "just list" / "stop when
   you have three").
7. **Handoff Bridge** at the end: archetype-personalized headline
   ("Bridge-Domain Kids like you usually save 3-5 in Canada / UK
   / Singapore..." / "The Open Question kids tend to save 4-6
   across [countries]..." / "Tight-Lane kids usually save 4-5...")
   + 3 live matched scholarships + Open Discover CTA in the
   archetype color.

Most cards should display **closed by default** (Q1=A Wrapped pivot
— big headline on tinted background, body hidden); tap "Read the
reasoning" / "See the schools" / "Read the seed" / "See the move"
to expand each card's editorial body.

### What you should see (network / DevTools)

Open the network panel. Find the `topuni-ai-pathway` request.
Inspect the SSE stream. The first event should be:

```
data: {"section":"archetype","payload":{"id":"bridge-domain-kid","name":"The Bridge-Domain Kid","tagline":"...","color":"#5B7CFA",...}}
```

The response headers should include `X-Brief-Schema: 3`.

### What you should see (server logs)

```sh
supabase functions logs topuni-ai-pathway --tail
```

Look for:

```
[brief-plan] archetype=bridge-domain-kid confidence=85 llmBacked=true regenerated=false
```

If `llmBacked=false` the pre-plan call failed → fell back to the
deterministic plan. Acceptable but worth investigating (check the
preceding `[brief-plan] attempt N invalid: ...` line).

---

## Step 4 — Capture + run verify-brief.ts

You can either capture a real brief OR run the harness against the
pre-built fixtures already in the repo:

```sh
# Quick: prove the harness works against the canonical Yerlan fixture
deno run --allow-read scripts/verify-brief.ts scripts/sample-brief.test.json
# expected: 6 / 6 passed

# Then the typical-student fixture (Aigerim, normal-shaped profile)
deno run --allow-read scripts/verify-brief.ts scripts/sample-brief-typical.test.json
# expected: 6 / 6 passed

# And the tight-lane fixture (Daniyar, decided major)
deno run --allow-read scripts/verify-brief.ts scripts/sample-brief-tight-lane.test.json
# expected: 6 / 6 passed
```

To validate a REAL brief from your deployment, capture from
Supabase dashboard:

1. Open the `brief_cache` table
2. Find the row from your test brief (sort by `generated_at desc`
   limit 1)
3. Copy the `content` field — it's a JSON string

Build a fixture JSON locally:

```sh
cat > /tmp/captured-brief.json <<'EOF'
{
  "intake": {
    "fullName": "...",
    "nationality": "Kazakhstan",
    "majorCertainty": "not_at_all",
    "targetCountries": ["Canada", "United Kingdom", "Singapore"],
    "topActivity": "debate captain, Math Olympiad regional bronze",
    "background": "introverted policy nerd who reads more than I should",
    "major": "Computer Science",
    "gpa": "3.7"
  },
  "dbContext": "(paste from the function logs or skip — Test 4 is the only one that uses this)",
  "brief": <PASTE-THE-CONTENT-FIELD-HERE>
}
EOF
```

Then run:

```sh
deno run --allow-read scripts/verify-brief.ts /tmp/captured-brief.json
```

Expected: **6 / 6 passed → exit 0.**

If any test fails, the output names which assertion broke and why.
Common failures + their fixes:

| Failure | Likely cause | Fix |
|---------|--------------|-----|
| `archetype is "X"; expected bridge-domain-kid, open-question` | LLM picked the wrong archetype | Investigate: heuristic prior in `archetype-library.ts` may need tuning. Or LLM mis-overrode it. Check logs for `[brief-plan]` line. |
| `banned-vocab hit (X): "Y"` | Brief contains slop word | Patch `editorial-rules.ts` BANNED_VOCABULARY if it's a false positive (i.e., the word genuinely doesn't mean slop in this context). Otherwise patch the section prompt to be more explicit. |
| `bucket country "X" not in intake.targetCountries` | LLM hallucinated a country | Check `validate()` in `whereYouCanLand` — it should already reject this. If it slipped through, the regen path may need to be stricter. |
| `school "X" doesn't appear in dbContext — likely invented` | LLM made up a university | The semantic validator catches this — but only via `mustNameIntakeField`. Add the school-name check to brief-sections.ts validator directly. |
| `No intake anchor appears in 2+ sections` | Brief lacks throughline | Most likely: the pre-plan call failed (`llmBacked: false`) so the fallback plan produced bland prose. Look at logs. |

---

## Step 5 — Validate share-to-Story on real mobile

The verify-brief harness can't run html-to-image. The share UX
needs eyeballs on a real device.

1. Open `/topuni-ai` on iOS Safari (real phone — simulator's share
   sheet doesn't include Instagram).
2. Complete the wizard, let the brief render.
3. Swipe to the Archetype card. Tap **Share to Story** (button
   label changes to "Preparing…" briefly).
4. Native share sheet should appear within ~500ms. Verify:
   - PNG preview shows the Wrapped-Bold archetype card (name +
     tagline on saturated color, brand mark up top, URL footer)
   - Instagram is listed as a destination
   - Tapping Instagram opens IG with the image attached as a
     Story prompt
5. Test on Chrome on Android — should follow the same path via
   `navigator.share({ files })`.
6. Test on desktop Chrome / Safari — should trigger a direct PNG
   download.
7. Test on desktop Firefox — should also trigger download
   (Web Share for files isn't supported there).

If the share sheet doesn't appear at all on mobile, check the
browser console — html-to-image errors will surface there.

---

## Rollback procedure

If the deploy goes sideways:

```sh
# Find the merge commit on main
git log --oneline -10

# Revert the merge (preserves history)
git revert -m 1 <merge-sha>
git push origin main

# Redeploy the function from the reverted state
supabase functions deploy topuni-ai-pathway
```

The migration for `major_certainty` is non-destructive (nullable
column, CHECK constraint with valid enum values). It does NOT need
to be reverted unless you want to remove the column itself, which
shouldn't be necessary.

The brief_cache schema 3 entries written under v7 are
**forward-readable** by the post-revert code (schema 2 reader
falls back to the raw `sections` block, ignoring the `plan` field).
Old cached briefs replay correctly under the reverted renderer too.

---

## After verification, next polish

Once the 9 PRs are merged + deployed + verifying clean, the
externally-blocked items become unblocked:

1. **`instagram-stories://` deep link** — needs (a) a registered
   Facebook app ID, (b) a Supabase Storage bucket configured for
   public-signed-URL access. With those, the share button can
   pre-attach the PNG INTO the IG Story camera (skipping the
   share-sheet step).
2. **CI workflow for verify-brief** — `.github/workflows/verify-brief.yml`
   to run the harness on every `brief_cache` write (or weekly cron
   against a snapshot). Skipping for now since the trigger isn't
   decided.
3. **Discover handoff via Card 06 closing** — the brief's last
   surface (NextStepsCard) currently has generic "Open Discover"
   CTA copy. With the plan's archetype + mondayMoveArtifact in
   hand, we can personalize the CTA. Phase 4 polish.
