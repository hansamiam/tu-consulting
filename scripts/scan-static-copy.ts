#!/usr/bin/env -S deno run --allow-read
/**
 * scan-static-copy.ts — assert that the closed-library copy that
 * ships with every brief stays clean of banned vocabulary.
 *
 * The brief-generator's LLM validators scan the LLM output, but
 * static copy that lives in code (archetype taglines, handoff
 * headlines) bypasses the validator path. This caught us once
 * (PR #46) — locking it into CI so the same drift can't happen
 * again silently.
 *
 * Usage:
 *   deno run --allow-read scripts/scan-static-copy.ts
 *
 * Exit code 0 = all strings pass. Exit code 1 = at least one hit.
 *
 * Add to .github/workflows when CI strategy is decided.
 */

import { ARCHETYPE_LIBRARY } from "../supabase/functions/_shared/archetype-library.ts";
import { TEMPLATES as HANDOFF_TEMPLATES } from "../src/components/brief/handoff-headlines.ts";
import { scanBannedVocab } from "../supabase/functions/_shared/editorial-rules.ts";

interface Finding {
  source: string;
  field: string;
  text: string;
  label: string;
  match: string;
}

const findings: Finding[] = [];

// 1. Archetype taglines + names (16 entries)
for (const arch of ARCHETYPE_LIBRARY) {
  // Scan both EN-only and central_asia bans — taglines ship globally
  // but should be CIS-safe too.
  const hits = [
    ...scanBannedVocab(arch.tagline),
    ...scanBannedVocab(arch.tagline, "central_asia"),
  ];
  for (const h of hits) {
    findings.push({
      source: "archetype-library.ts",
      field: `${arch.id}.tagline`,
      text: arch.tagline,
      label: h.label,
      match: h.match,
    });
  }
}

// 2. Handoff headline templates (single + multi variants per archetype)
for (const [archId, variants] of Object.entries(HANDOFF_TEMPLATES)) {
  for (const variant of ["single", "multi"] as const) {
    const text = variants[variant];
    const hits = [
      ...scanBannedVocab(text),
      ...scanBannedVocab(text, "central_asia"),
    ];
    for (const h of hits) {
      findings.push({
        source: "handoff-headlines.ts",
        field: `${archId}.${variant}`,
        text,
        label: h.label,
        match: h.match,
      });
    }
  }
}

// Report
if (findings.length === 0) {
  const taglineCount = ARCHETYPE_LIBRARY.length;
  const headlineCount = Object.keys(HANDOFF_TEMPLATES).length * 2;
  console.log(`✓ scan-static-copy: ${taglineCount + headlineCount} strings clean`);
  console.log(`  - ${taglineCount} archetype taglines`);
  console.log(`  - ${headlineCount} handoff headline templates`);
  Deno.exit(0);
}

console.error(`✗ scan-static-copy: ${findings.length} hit(s)\n`);
for (const f of findings) {
  console.error(`  ${f.source} :: ${f.field}`);
  console.error(`    text:  "${f.text}"`);
  console.error(`    label: ${f.label} — matched "${f.match}"\n`);
}
Deno.exit(1);
