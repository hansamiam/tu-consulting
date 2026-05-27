#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read --allow-write
//
// scripts/backfill-scholarship-strategy.ts — Path A of the per-scholarship
// deeper-dive plan (~/.claude/plans/per-scholarship-deeper-dive-insight.md).
//
// Backfills the four strategy fields on `public.scholarships`:
//   - how_to_win              (~80-120 word older-cousin guidance)
//   - common_rejection_reasons (~2-4 sentences of concrete patterns)
//   - strategy_notes          (~1-2 sentence strategist hot take, renders as pull-quote)
//   - risk_note               (~1-2 sentence honest downside flag)
//
// DRY-RUN BY DEFAULT. Writes a per-scholarship JSON artifact under
// `scripts/backfill-output/<scholarship_id>.json` containing:
//   { scholarshipId, scholarshipName, prompts: {...}, generated: {...},
//     wouldSkip: {...field: true if already populated} }
//
// Samuel reviews the outputs, audits the prompts (the Q-INSIGHT-QUALITY
// concern flagged in the v7 spec), then re-runs with --apply to upsert.
//
// Usage:
//   # Dry-run all 17 published scholarships, all 4 fields:
//   deno run --allow-env --allow-net --allow-read --allow-write \
//     scripts/backfill-scholarship-strategy.ts
//
//   # Dry-run only how_to_win + strategy_notes:
//   ...backfill-scholarship-strategy.ts --fields=how_to_win,strategy_notes
//
//   # Dry-run a single scholarship:
//   ...backfill-scholarship-strategy.ts --id=<scholarship_id>
//
//   # APPLY mode — writes to the DB:
//   ...backfill-scholarship-strategy.ts --apply
//
// Required env vars:
//   SUPABASE_URL                  — defaults to the production project URL
//   SUPABASE_SERVICE_ROLE_KEY     — service role key for the project
//   LOVABLE_API_KEY  OR  AI_PROVIDER + (OPENAI_API_KEY | ANTHROPIC_API_KEY)
//                                 — same env as the existing edge functions
//
// Cost estimate (per the plan):
//   17 scholarships × ~4 fields × ~$0.005 flash-tier ≈ $0.34 total dry-run.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";
import { chatCompletions } from "../supabase/functions/_shared/ai-gateway.ts";
import {
  EDITORIAL_RULES_TIGHT,
  scanBannedVocab,
} from "../supabase/functions/_shared/editorial-rules.ts";

type StrategyField = "how_to_win" | "common_rejection_reasons" | "strategy_notes" | "risk_note";
const ALL_FIELDS: StrategyField[] = [
  "how_to_win",
  "common_rejection_reasons",
  "strategy_notes",
  "risk_note",
];

interface CLIArgs {
  apply: boolean;
  fields: StrategyField[];
  scholarshipId: string | null;
}

function parseArgs(): CLIArgs {
  const apply = Deno.args.includes("--apply");
  const fieldsArg = Deno.args.find((a) => a.startsWith("--fields="));
  const fields = fieldsArg
    ? fieldsArg.slice("--fields=".length).split(",").map((f) => f.trim()) as StrategyField[]
    : ALL_FIELDS;
  for (const f of fields) {
    if (!ALL_FIELDS.includes(f)) {
      console.error(`Unknown field: ${f}. Allowed: ${ALL_FIELDS.join(", ")}`);
      Deno.exit(2);
    }
  }
  const idArg = Deno.args.find((a) => a.startsWith("--id="));
  const scholarshipId = idArg ? idArg.slice("--id=".length) : null;
  return { apply, fields, scholarshipId };
}

interface ScholarshipRow {
  scholarship_id: string;
  scholarship_name: string | null;
  provider_name: string | null;
  host_country: string | null;
  award_value: string | null;
  application_deadline: string | null;
  eligibility_summary: string | null;
  target_demographics: string[] | null;
  target_fields: string[] | null;
  official_url: string | null;
  description: string | null;
  min_gpa: number | null;
  min_ielts: number | null;
  how_to_win: string | null;
  common_rejection_reasons: string | null;
  strategy_notes: string | null;
  risk_note: string | null;
  weak_candidate_warning: string | null;
  what_to_prepare_first: string | null;
}

const SELECT_COLUMNS = `
  scholarship_id, scholarship_name, provider_name, host_country, award_value,
  application_deadline, eligibility_summary, target_demographics, target_fields,
  official_url, description, min_gpa, min_ielts,
  how_to_win, common_rejection_reasons, strategy_notes, risk_note,
  weak_candidate_warning, what_to_prepare_first
`;

/* ─── Field-specific prompts ────────────────────────────────────────
   Each prompt is intentionally SHORT and references the editorial
   tone from supabase/functions/_shared/editorial-rules.ts. Samuel
   audits these as part of the Q-INSIGHT-QUALITY gate before --apply.
*/

// This copy renders to ANY visitor on a public scholarship detail page —
// not yet personalized to a specific student profile (per Q-INSIGHT-QUALITY
// in ~/.claude/plans/ok-good-morning-claude-frolicking-moth.md, pre-gen
// strategy text is GENERIC; the per-student personalization layer is Path B).
// So: voice rules apply, but no nationality branching, no intake claims.
const VOICE_PREAMBLE = `
You are writing supporting copy for a public scholarship listing on Top Uni.
The reader is any international student considering this specific scholarship —
NOT a specific known student. Don't invent facts about the reader's profile.

${EDITORIAL_RULES_TIGHT}

Output prose only — no bullets, no preamble, no markdown headers, no quotes.
`;

function scholarshipContext(s: ScholarshipRow): string {
  const lines = [
    `- Name: ${s.scholarship_name ?? "—"}`,
    `- Provider: ${s.provider_name ?? "—"}`,
    `- Host country: ${s.host_country ?? "—"}`,
    `- Award value: ${s.award_value ?? "—"}`,
    `- Deadline: ${s.application_deadline ?? "—"}`,
    `- Eligibility summary: ${s.eligibility_summary ?? "—"}`,
    `- Target demographics: ${(s.target_demographics ?? []).join(", ") || "—"}`,
    `- Target fields: ${(s.target_fields ?? []).join(", ") || "—"}`,
    `- Min GPA: ${s.min_gpa ?? "—"}`,
    `- Min IELTS: ${s.min_ielts ?? "—"}`,
    `- Official URL: ${s.official_url ?? "—"}`,
    `- Description: ${s.description ?? "—"}`,
  ];
  if (s.weak_candidate_warning) lines.push(`- Existing weak-candidate warning: ${s.weak_candidate_warning}`);
  if (s.what_to_prepare_first) lines.push(`- Existing "start here" text: ${s.what_to_prepare_first}`);
  return lines.join("\n");
}

function promptFor(field: StrategyField, s: ScholarshipRow): string {
  const ctx = scholarshipContext(s);
  switch (field) {
    case "how_to_win":
      return `${VOICE_PREAMBLE}

SCHOLARSHIP:
${ctx}

Write the "How to win it" body for this scholarship.
- 80-120 words, 2-3 short paragraphs.
- Names ONE or TWO specific differentiators the winning application
  shows that the average one doesn't — anchored to the actual eligibility
  / target demographics / target fields above. If those fields are sparse,
  speak in suggestion mood about what the application probably needs to
  demonstrate based on the provider's stated focus.
- Quiet confidence, NOT hype.

Output the prose only. No headers, no bullets, no preamble.`;

    case "common_rejection_reasons":
      return `${VOICE_PREAMBLE}

SCHOLARSHIP:
${ctx}

Write the "Why people get rejected" body for this scholarship.
- 2-4 sentences, single paragraph.
- Names 2-3 concrete patterns common applicants stumble on — based on
  the scholarship's eligibility constraints + target audience.
  Examples of the SHAPE: "Applicants from outside the target country
  list often get filtered at intake despite strong files." /
  "The award is bilingual-medium and many applicants underestimate the
  language proof requirement."
- Plain, honest, no piety. Suggestion mood.

Output the prose only.`;

    case "strategy_notes":
      return `${VOICE_PREAMBLE}

SCHOLARSHIP:
${ctx}

Write the "Strategist's note" for this scholarship.
- 1-2 sentences. Renders as a magazine pull-quote.
- ONE punchy observation a strategist would tell a serious candidate
  — about timing, document order, narrative angle, or audience fit.
  Specific, not generic.

Output the sentence(s) only.`;

    case "risk_note":
      return `${VOICE_PREAMBLE}

SCHOLARSHIP:
${ctx}

Write the "risk note" for this scholarship.
- 1-2 sentences. Honest about a non-obvious downside or constraint —
  visa-realism, post-award obligations, restrictive cohort size,
  partial-funding caveats, etc.
- Empathetic, not alarmist. The reader still might apply.

Output the sentence(s) only.`;
  }
}

/* ─── Main loop ────────────────────────────────────────────────────── */

async function main() {
  const args = parseArgs();
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "https://bsfldtpemfxhnkdzccib.supabase.co";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) {
    console.error("SUPABASE_SERVICE_ROLE_KEY is required.");
    Deno.exit(2);
  }
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  let query = supabase
    .from("scholarships")
    .select(SELECT_COLUMNS)
    .eq("is_published", true);
  if (args.scholarshipId) query = query.eq("scholarship_id", args.scholarshipId);

  const { data, error } = await query;
  if (error) {
    console.error("DB error:", error);
    Deno.exit(2);
  }
  const rows = (data ?? []) as unknown as ScholarshipRow[];
  console.log(`Found ${rows.length} published scholarship(s) matching filter.`);
  console.log(`Mode: ${args.apply ? "\x1b[31mAPPLY (writes to DB)\x1b[0m" : "\x1b[32mDRY-RUN (writes to scripts/backfill-output/)\x1b[0m"}`);
  console.log(`Fields: ${args.fields.join(", ")}`);
  console.log("");

  if (!args.apply) {
    try { await Deno.mkdir("scripts/backfill-output", { recursive: true }); } catch { /* ignore */ }
  }

  let generatedCount = 0;
  let skippedCount = 0;
  let violationCount = 0;
  for (const s of rows) {
    const generated: Partial<Record<StrategyField, string>> = {};
    const prompts: Partial<Record<StrategyField, string>> = {};
    const wouldSkip: Partial<Record<StrategyField, true>> = {};
    const violations: Partial<Record<StrategyField, Array<{ match: string; label: string }>>> = {};

    for (const field of args.fields) {
      const existing = (s[field] ?? "").trim();
      if (existing.length > 20) {
        wouldSkip[field] = true;
        skippedCount += 1;
        continue;
      }
      const prompt = promptFor(field, s);
      prompts[field] = prompt;
      try {
        const resp = await chatCompletions({
          tier: "flash",
          messages: [{ role: "user", content: prompt }],
        });
        if (!resp.ok) {
          const errBody = await resp.text();
          console.error(`  ${s.scholarship_name} · ${field} · HTTP ${resp.status}: ${errBody.slice(0, 200)}`);
          continue;
        }
        const data = await resp.json();
        // Same parser pattern as topuni-ai-pathway: OpenAI-compat choices[0]
        // OR Anthropic content[].text — covers all three providers.
        const text = ((
          data?.choices?.[0]?.message?.content
          ?? (Array.isArray(data?.content) ? data.content.map((c: { text?: string }) => c?.text ?? "").join("") : "")
          ?? ""
        ) as string).trim();
        if (!text) {
          console.error(`  ${s.scholarship_name} · ${field} · empty response`);
          continue;
        }
        // Q-INSIGHT-QUALITY post-gen scan: never write banned-vocab to DB.
        // No cultural-context arg — this is generic copy, not nationality-scoped.
        const hits = scanBannedVocab(text);
        if (hits.length > 0) {
          violations[field] = hits;
          violationCount += hits.length;
          const flags = hits.map((h) => `${h.label}:"${h.match}"`).join(", ");
          console.error(`  ${s.scholarship_name} · ${field} · BANNED VOCAB: ${flags}`);
          // In --apply mode, skip writing this field. Dry-run still records it.
          if (args.apply) continue;
        }
        generated[field] = text;
        generatedCount += 1;
        console.log(`  ${s.scholarship_name} · ${field} · ${text.length} chars${hits.length ? " (flagged, dry-run only)" : ""}`);
      } catch (e) {
        console.error(`  ${s.scholarship_name} · ${field} · ERROR: ${(e as Error).message}`);
      }
    }

    if (args.apply) {
      if (Object.keys(generated).length === 0) continue;
      const { error: upErr } = await supabase
        .from("scholarships")
        .update(generated)
        .eq("scholarship_id", s.scholarship_id);
      if (upErr) {
        console.error(`  ${s.scholarship_name} · UPDATE ERROR: ${upErr.message}`);
      } else {
        console.log(`  ${s.scholarship_name} · applied (${Object.keys(generated).length} field(s))`);
      }
    } else {
      const path = `scripts/backfill-output/${s.scholarship_id}.json`;
      await Deno.writeTextFile(
        path,
        JSON.stringify({
          scholarshipId: s.scholarship_id,
          scholarshipName: s.scholarship_name,
          providerName: s.provider_name,
          hostCountry: s.host_country,
          prompts,
          generated,
          wouldSkip,
          violations,
        }, null, 2),
      );
    }
  }

  console.log("");
  console.log(`Done. Generated: ${generatedCount}. Skipped (already populated): ${skippedCount}. Banned-vocab hits: ${violationCount}.`);
  if (!args.apply) console.log("Review scripts/backfill-output/*.json then re-run with --apply.");
  if (args.apply && violationCount > 0) console.log(`(${violationCount} field(s) were dropped on --apply because the LLM emitted banned vocab. Re-run dry-run, tighten prompts, retry.)`);
}

if (import.meta.main) await main();
