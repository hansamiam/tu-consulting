#!/usr/bin/env -S deno run --allow-read --allow-write
//
// scripts/audit-banned-vocab-ui-copy.ts — codebase-wide scan for
// banned-vocab strings leaking into static UI copy.
//
// The runtime scanner in supabase/functions/_shared/editorial-rules.ts
// (scanBannedVocab) only runs against AI-generated output at gen
// time. Static React strings (button labels, marketing bullets,
// toast messages, microcopy) never go through that scanner — so
// banned vocab can drift into the codebase via copy edits and
// nobody notices until polish review.
//
// This script imports the SAME BANNED_VOCABULARY + CIS_CULTURAL_BANNED
// regex pools the runtime scanner uses, walks every .tsx / .ts file
// under src/, and writes a triage report to:
//
//   docs/audit/banned-vocab-ui-copy.md
//
// Each hit records: file path, line number, matched word, label
// (which banned-vocab category it tripped), and the full source line
// for context. The report is grouped by file and sorted by line.
//
// CI integration: exits with code 1 if any hit is found, so this
// can be wired into a GitHub Action / pre-merge check later. Today
// it ships as a manual triage tool — run it before polish PRs to
// see what's actually wrong.
//
// Usage:
//   deno run --allow-read --allow-write scripts/audit-banned-vocab-ui-copy.ts
//
// CI-friendly variant (no write, exit 1 on any hit):
//   deno run --allow-read scripts/audit-banned-vocab-ui-copy.ts --no-write

import {
  BANNED_VOCABULARY,
  CIS_CULTURAL_BANNED,
} from "../supabase/functions/_shared/editorial-rules.ts";

const SCAN_ROOT = "src";
const REPORT_PATH = "docs/audit/banned-vocab-ui-copy.md";
const ALLOWED_EXTENSIONS = new Set([".tsx", ".ts"]);

// Files where banned-vocab matches are EXPECTED and should be ignored:
//   - editorial-rules.ts itself defines the patterns
//   - test fixtures intentionally trip the scanner
//   - .test.ts files exercising banned-vocab handling
const IGNORE_PATHS = [
  /\/editorial-rules\.ts$/,
  /\.test\.tsx?$/,
  /\/fixtures?\//,
  /\/__tests__\//,
];

interface Hit {
  file: string;
  line: number;
  match: string;
  label: string;
  context: string;
  culturalOnly: boolean;
}

async function* walk(dir: string): AsyncIterable<string> {
  for await (const entry of Deno.readDir(dir)) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory) {
      yield* walk(path);
    } else if (entry.isFile) {
      const dot = path.lastIndexOf(".");
      if (dot < 0) continue;
      const ext = path.slice(dot);
      if (!ALLOWED_EXTENSIONS.has(ext)) continue;
      if (IGNORE_PATHS.some((re) => re.test(path))) continue;
      yield path;
    }
  }
}

// Filter out the loudest false positives: comment / JSDoc lines and
// Tailwind className-only lines. These are not user-visible copy.
//   - "// foo" line comments
//   - "* foo" inside /* */ blocks
//   - lines whose only string content is a class-name attribute value
//     (className="..." with no other string children on the same line)
function isLikelyNonCopyLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.startsWith("//")) return true;
  if (trimmed.startsWith("*")) return true; // JSDoc continuation
  // Pure className lines: e.g. `<div className="items-stretch flex">` —
  // hits inside Tailwind class strings are false positives.
  const classNameOnly = /^<?\w*\s*className=["'`][^"'`]*["'`]\s*\/?>?\s*$/;
  if (classNameOnly.test(trimmed)) return true;
  return false;
}

function scanLine(line: string): Array<{ match: string; label: string; culturalOnly: boolean }> {
  if (isLikelyNonCopyLine(line)) return [];
  const hits: Array<{ match: string; label: string; culturalOnly: boolean }> = [];
  for (const { pattern, label } of BANNED_VOCABULARY) {
    const m = line.match(pattern);
    if (m) hits.push({ match: m[0], label, culturalOnly: false });
  }
  for (const { pattern, label } of CIS_CULTURAL_BANNED) {
    const m = line.match(pattern);
    if (m) hits.push({ match: m[0], label, culturalOnly: true });
  }
  return hits;
}

async function main() {
  const noWrite = Deno.args.includes("--no-write");
  const allHits: Hit[] = [];

  for await (const file of walk(SCAN_ROOT)) {
    const content = await Deno.readTextFile(file);
    const lines = content.split("\n");
    lines.forEach((line, i) => {
      const hits = scanLine(line);
      for (const h of hits) {
        allHits.push({
          file,
          line: i + 1,
          match: h.match,
          label: h.label,
          context: line.trim(),
          culturalOnly: h.culturalOnly,
        });
      }
    });
  }

  if (allHits.length === 0) {
    console.log("Clean — no banned-vocab matches in src/.");
    if (!noWrite) {
      try { await Deno.mkdir("docs/audit", { recursive: true }); } catch { /* ok */ }
      await Deno.writeTextFile(REPORT_PATH, `# Banned-vocab UI copy audit\n\nLast run: ${new Date().toISOString()}\n\n**Clean — no banned-vocab matches in src/.**\n`);
    }
    Deno.exit(0);
  }

  // Group by file for readable output
  const byFile = new Map<string, Hit[]>();
  for (const h of allHits) {
    const list = byFile.get(h.file) ?? [];
    list.push(h);
    byFile.set(h.file, list);
  }
  const sortedFiles = [...byFile.keys()].sort();

  const lines: string[] = [];
  lines.push(`# Banned-vocab UI copy audit`);
  lines.push(``);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(``);
  lines.push(`Scanned: every \`.tsx\` and \`.ts\` file under \`${SCAN_ROOT}/\`,`);
  lines.push(`excluding the editorial-rules source + test fixtures.`);
  lines.push(``);
  lines.push(`Patterns: imported directly from \`supabase/functions/_shared/editorial-rules.ts\` —`);
  lines.push(`stays in lockstep with the runtime scanner.`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## Summary`);
  lines.push(``);
  lines.push(`- Total hits: **${allHits.length}**`);
  lines.push(`- Files affected: **${sortedFiles.length}**`);
  const labelCounts = new Map<string, number>();
  for (const h of allHits) labelCounts.set(h.label, (labelCounts.get(h.label) ?? 0) + 1);
  const sortedLabels = [...labelCounts.entries()].sort((a, b) => b[1] - a[1]);
  for (const [label, n] of sortedLabels) {
    lines.push(`  - \`${label}\`: ${n}`);
  }
  lines.push(``);
  lines.push(`Note: \`pre-med-not-CIS-frame\` hits are context-sensitive — they only`);
  lines.push(`fail when the rendering surface is for a CIS-context reader. Treat`);
  lines.push(`those as informational unless the surface in question targets KZ/KG/UZ/etc.`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## Hits by file`);
  lines.push(``);

  for (const file of sortedFiles) {
    const hits = byFile.get(file)!;
    lines.push(`### \`${file}\` (${hits.length} hit${hits.length === 1 ? "" : "s"})`);
    lines.push(``);
    lines.push(`| Line | Match | Label | Context |`);
    lines.push(`|------|-------|-------|---------|`);
    for (const h of hits) {
      const safeContext = h.context
        .replace(/\|/g, "\\|")
        .replace(/`/g, "\\`")
        .slice(0, 120);
      const labelCell = h.culturalOnly ? `${h.label} *(CIS-only)*` : h.label;
      lines.push(`| ${h.line} | \`${h.match}\` | ${labelCell} | ${safeContext} |`);
    }
    lines.push(``);
  }

  const report = lines.join("\n");

  if (noWrite) {
    console.log(report);
  } else {
    try { await Deno.mkdir("docs/audit", { recursive: true }); } catch { /* ok */ }
    await Deno.writeTextFile(REPORT_PATH, report);
    console.log(`Wrote ${REPORT_PATH}`);
    console.log(`Found ${allHits.length} banned-vocab hit(s) across ${sortedFiles.length} file(s).`);
  }

  // Exit non-zero so CI catches regressions. Cultural-only hits do
  // NOT block — they're context-sensitive and would false-positive
  // on any CIS-aware copy that mentions the rejected frame in passing.
  const blocking = allHits.filter((h) => !h.culturalOnly);
  Deno.exit(blocking.length > 0 ? 1 : 0);
}

if (import.meta.main) await main();
