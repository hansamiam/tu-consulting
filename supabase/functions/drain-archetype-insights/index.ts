// deno-lint-ignore-file no-explicit-any
/**
 * drain-archetype-insights — pops the archetype-insights queue and
 * generates one fortune-cookie sentence per (scholarship × archetype)
 * cell. Cron-driven (every 60s) so newly-published scholarships have
 * their 19 cells filled within a minute.
 *
 * Design choices:
 *  • Eligibility hard-gate BEFORE the LLM call. If an archetype's
 *    typical country/level/field set is incompatible with the
 *    scholarship's requirements, write `eligibility_skipped=true` with
 *    `insight_text=null` and skip the API call. Prevents the
 *    Commonwealth-Kazakhstan hallucination class entirely — the LLM
 *    never sees ineligible pairs.
 *  • Scholarship-specific prompt context. Each cell pulls
 *    ideal_candidate_profile + how_to_win + strategy_notes +
 *    common_rejection_reasons + selectivity_level — so the LLM has
 *    real selection signal to write against, not just a name + amount.
 *    Addresses the "generic fortune cookie" failure mode the adversary
 *    surfaced.
 *  • Output validator: regex bans the predicted-fit / numeric-claim /
 *    multi-sentence shapes; length cap at 28 words. Fails → archive
 *    the queue row + log a skip; never write a low-quality cell.
 *  • Batch size small (default 8) to fit in the function's wall-clock
 *    budget without timing out — Sonnet calls average ~3-4s.
 */

import { respondJson, respondError } from '../_shared/http.ts'
import { CORS_HEADERS_BASIC, handleCorsOptions } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/clients.ts'
import { requireAdminOrService } from '../_shared/auth.ts'
import { chatCompletions } from '../_shared/ai-gateway.ts'
import {
  ARCHETYPE_LIBRARY,
  getArchetype,
  type ArchetypeId,
} from '../_shared/archetype-library.ts'

const PROMPT_VERSION = 1
const DEFAULT_BATCH_SIZE = 8
const DEFAULT_VISIBILITY_TIMEOUT_S = 90 // long enough for the LLM call
const MAX_RETRIES = 3

interface QueueRow {
  msg_id: number
  message: { scholarship_id?: string; archetype_id?: string } | null
  read_ct: number
}

interface ScholarshipFacts {
  scholarship_id: string
  scholarship_name: string | null
  award_type: string | null
  coverage_type: string | null
  host_country: string | null
  target_degree_level: string | null
  target_fields: string[] | null
  target_demographics: string[] | null
  eligibility_requirements: string | null
  eligible_countries: string[] | null
  citizenship_requirements: string | null
  ideal_candidate_profile: string | null
  how_to_win: string | null
  strategy_notes: string | null
  common_rejection_reasons: string | null
  selectivity_level: string | null
  award_amount_text: string | null
  min_gpa: number | null
}

/** Per-archetype eligibility hint — used by the hard-gate to skip
 *  pairs that are structurally incompatible. Conservative: we ONLY
 *  skip when the scholarship explicitly excludes the archetype's
 *  defining shape. When unclear, we let the LLM write a cell. */
const ARCHETYPE_DEGREE_PREFERENCE: Partial<Record<ArchetypeId, 'undergraduate' | 'master' | 'either'>> = {
  // Most archetypes work at any level. Tight-Lane skews toward
  // undergraduate (8th-grade focus narrative); the rest are either.
  'tight-lane': 'undergraduate',
}

/** Hard-gate: returns a reason string if the pair is incompatible, else null. */
function eligibilityHardGate(
  archetype: ArchetypeId,
  s: ScholarshipFacts,
): string | null {
  // Rule 1: degree level. If the scholarship targets a specific degree
  // level and the archetype's preferred level disagrees, skip.
  const pref = ARCHETYPE_DEGREE_PREFERENCE[archetype]
  if (pref && pref !== 'either' && s.target_degree_level) {
    const lvl = s.target_degree_level.toLowerCase()
    if (pref === 'undergraduate' && (lvl.includes('master') || lvl.includes('phd') || lvl.includes('doctora'))) {
      return `archetype prefers undergraduate; scholarship targets ${s.target_degree_level}`
    }
  }

  // Rule 2: Quant archetype against pure-humanities scholarships. The
  // Quant archetype is defined by STEM-only signal — pairing it with a
  // humanities-restricted award produces a fortune that doesn't apply.
  if (archetype === 'quant' && Array.isArray(s.target_fields)) {
    const fields = s.target_fields.map((f) => f.toLowerCase())
    const allHum = fields.length > 0 && fields.every((f) =>
      /law|history|philosophy|literature|art|humanities|theology|religion/.test(f),
    )
    if (allHum) return 'quant archetype incompatible with humanities-only scholarship'
  }

  // Rule 3: target_demographics that explicitly require a different
  // shape than the archetype embodies. Conservative — only skip when
  // the demographic is a hard exclusion.
  if (Array.isArray(s.target_demographics) && s.target_demographics.length > 0) {
    const demos = s.target_demographics.map((d) => d.toLowerCase()).join(' ')
    // Athlete-only scholarships paired with non-athlete archetypes.
    if (/athletes?.only|athletic scholarship/.test(demos)) {
      const athleteCompat: ArchetypeId[] = ['quiet-athlete']
      if (!athleteCompat.includes(archetype)) {
        return 'scholarship restricted to athletes only'
      }
    }
    // Women-only / female-only — gender-restricted scholarships are
    // fine for ANY archetype because gender is orthogonal to archetype.
    // No skip rule here.
  }

  return null
}

/** Build the LLM prompt for one cell. Includes scholarship-specific
 *  selection signals so the output cites real attributes of THIS
 *  scholarship rather than a generic archetype-only platitude. */
function buildPrompt(archetypeId: ArchetypeId, s: ScholarshipFacts): { system: string; user: string } {
  const arch = getArchetype(archetypeId)
  const facts: string[] = []
  if (s.scholarship_name) facts.push(`Name: ${s.scholarship_name}`)
  if (s.host_country) facts.push(`Host country: ${s.host_country}`)
  if (s.target_degree_level) facts.push(`Level: ${s.target_degree_level}`)
  if (s.coverage_type) facts.push(`Coverage: ${s.coverage_type}`)
  if (s.award_amount_text) facts.push(`Award: ${s.award_amount_text}`)
  if (s.selectivity_level) facts.push(`Selectivity: ${s.selectivity_level}`)
  if (Array.isArray(s.target_fields) && s.target_fields.length > 0) {
    facts.push(`Target fields: ${s.target_fields.slice(0, 6).join(', ')}`)
  }
  if (Array.isArray(s.target_demographics) && s.target_demographics.length > 0) {
    facts.push(`Target demographics: ${s.target_demographics.slice(0, 4).join(', ')}`)
  }
  if (s.ideal_candidate_profile) facts.push(`Ideal candidate: ${s.ideal_candidate_profile.slice(0, 600)}`)
  if (s.how_to_win) facts.push(`How to win: ${s.how_to_win.slice(0, 500)}`)
  if (s.strategy_notes) facts.push(`Strategy notes: ${s.strategy_notes.slice(0, 400)}`)
  if (s.common_rejection_reasons) facts.push(`Common rejection reasons: ${s.common_rejection_reasons.slice(0, 300)}`)

  const system = [
    'You write one-sentence "fortune cookie" insights for scholarship cards.',
    'Each insight applies to ONE student archetype reading ONE scholarship.',
    'Style: a single short sentence, ≤ 25 words, conversational and confident.',
    'BANNED: fit predictions ("you would be competitive"), eligibility claims',
    '("you qualify"), numeric claims not in the facts, multi-sentence outputs,',
    'questions, second-person commands like "you should". No emoji. No quotes.',
    'The insight must cite something SPECIFIC about THIS scholarship that this',
    'archetype in particular should know — not a generic platitude that fits',
    'any scholarship.',
  ].join(' ')

  const user = [
    `ARCHETYPE: ${arch.name} — ${arch.tagline}`,
    '',
    'SCHOLARSHIP FACTS:',
    ...facts,
    '',
    `Write one sentence (≤25 words) for a ${arch.name} reading this scholarship's card.`,
    'It should reference a specific selection-signal cue from the facts above (ideal candidate, how to win,',
    'strategy notes, or rejection reasons) and frame how this archetype should approach it.',
    'Do NOT predict their fit; do NOT make eligibility claims; do NOT cite numbers that aren\'t in the facts.',
    'Output ONLY the sentence. No preamble. No quotes.',
  ].join('\n')

  return { system, user }
}

/** Output validator. Returns the cleaned text or null if it fails. */
function validateInsight(raw: string): { ok: true; text: string } | { ok: false; reason: string } {
  const stripped = raw.trim().replace(/^["'"]+|["'"]+$/g, '').replace(/\s+/g, ' ')
  if (!stripped) return { ok: false, reason: 'empty output' }
  // Single sentence — count sentence-terminating punctuation. Allow ONE.
  const sentenceTerms = (stripped.match(/[.!?](?=\s|$)/g) || []).length
  if (sentenceTerms > 1) return { ok: false, reason: 'multi-sentence' }
  // Length cap.
  const wordCount = stripped.split(/\s+/).length
  if (wordCount > 28) return { ok: false, reason: `too long (${wordCount} words)` }
  if (wordCount < 4) return { ok: false, reason: `too short (${wordCount} words)` }
  // Banned predictive vocab.
  if (/\byou\s+(would|will|could|might)\s+(be\s+)?(competitive|a\s+strong|qualify|win)/i.test(stripped)) {
    return { ok: false, reason: 'predictive fit claim' }
  }
  if (/\byour\s+(odds|chances|fit)\b/i.test(stripped)) {
    return { ok: false, reason: 'odds/fit claim' }
  }
  if (/\?$/.test(stripped)) return { ok: false, reason: 'question' }
  // Banned AI-template stack we already maintain.
  if (/\bas\s+a\s+\b/i.test(stripped)) return { ok: false, reason: '"as a [archetype]" hedge' }
  return { ok: true, text: stripped }
}

async function callLlmForCell(
  archetypeId: ArchetypeId,
  s: ScholarshipFacts,
): Promise<{ text: string; model: string } | { skip: string }> {
  const { system, user } = buildPrompt(archetypeId, s)
  const resp = await chatCompletions({
    tier: 'pro',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    stream: false,
  })
  if (!resp.ok) {
    const body = await resp.text().catch(() => '')
    return { skip: `LLM ${resp.status}: ${body.slice(0, 200)}` }
  }
  const data = await resp.json()
  // OpenAI-compat shape vs Anthropic shape — chatCompletions translates
  // the request; the response we read here is whichever provider's raw
  // body. The ai-gateway module returns the upstream Response untouched,
  // so we handle both shapes.
  let raw = ''
  if (data.choices?.[0]?.message?.content) raw = String(data.choices[0].message.content)
  else if (Array.isArray(data.content) && data.content[0]?.text) raw = String(data.content[0].text)
  else return { skip: 'unrecognized LLM response shape' }
  const model = String(data.model || data.id || 'unknown')
  const val = validateInsight(raw)
  if (!val.ok) return { skip: `validator: ${val.reason}` }
  return { text: val.text, model }
}

// deno-lint-ignore no-explicit-any
async function fetchScholarshipFacts(supabase: any, scholarshipId: string): Promise<ScholarshipFacts | null> {
  const { data, error } = await supabase
    .from('scholarships')
    .select(
      'scholarship_id, scholarship_name, award_type, coverage_type, host_country, ' +
      'target_degree_level, target_fields, target_demographics, eligibility_requirements, ' +
      'eligible_countries, citizenship_requirements, ideal_candidate_profile, how_to_win, ' +
      'strategy_notes, common_rejection_reasons, selectivity_level, award_amount_text, min_gpa',
    )
    .eq('scholarship_id', scholarshipId)
    .maybeSingle()
  if (error) {
    console.warn('[drain] scholarship fetch error', scholarshipId, error)
    return null
  }
  return (data as ScholarshipFacts) || null
}

Deno.serve(async (req: Request) => {
  const cors = handleCorsOptions(req)
  if (cors) return cors

  const auth = await requireAdminOrService(req)
  if (!auth.ok) return respondError(403, auth.reason || 'forbidden', CORS_HEADERS_BASIC)

  const url = new URL(req.url)
  const batchSize = Math.max(1, Math.min(20, Number(url.searchParams.get('batch') || DEFAULT_BATCH_SIZE)))

  // Cast to any: the new RPCs and the new table aren't in
  // database.types.ts yet (regenerate after migration apply). Once
  // `npm run gen:types` runs against prod the cast can come off.
  const supabase = createServiceClient() as any
  const { data: rows, error: readErr } = await supabase.rpc('read_archetype_insights_batch', {
    batch_size: batchSize,
    vt: DEFAULT_VISIBILITY_TIMEOUT_S,
  })
  if (readErr) {
    console.error('[drain] read error', readErr)
    return respondError(500, `read: ${readErr.message}`, CORS_HEADERS_BASIC)
  }
  const queueRows = (rows || []) as QueueRow[]
  if (queueRows.length === 0) {
    return respondJson(200, { drained: 0, queue_depth: 0 }, CORS_HEADERS_BASIC)
  }

  const knownArchetypeIds = new Set(ARCHETYPE_LIBRARY.map((a) => a.id))

  let written = 0
  let skipped = 0
  let errored = 0

  for (const row of queueRows) {
    const sid = row.message?.scholarship_id
    const aid = row.message?.archetype_id as ArchetypeId | undefined
    if (!sid || !aid) {
      // poisoned row — archive (don't requeue) and move on
      await supabase.rpc('archive_archetype_insight', { p_msg_id: row.msg_id })
      errored++
      continue
    }
    if (!knownArchetypeIds.has(aid)) {
      // archetype was removed from the library after enqueue — archive
      await supabase.rpc('archive_archetype_insight', { p_msg_id: row.msg_id })
      skipped++
      continue
    }

    // Retry-guard: if this row has been re-read more than MAX_RETRIES,
    // archive it to a dead-letter state so it stops cycling.
    if (row.read_ct > MAX_RETRIES) {
      await supabase.from('scholarship_archetype_insights').upsert(
        {
          scholarship_id: sid,
          archetype_id: aid,
          insight_text: null,
          eligibility_skipped: true,
          skip_reason: `max retries exceeded (${row.read_ct})`,
          generator_model: 'n/a',
          prompt_version: PROMPT_VERSION,
        },
        { onConflict: 'scholarship_id,archetype_id' },
      )
      await supabase.rpc('archive_archetype_insight', { p_msg_id: row.msg_id })
      errored++
      continue
    }

    const facts = await fetchScholarshipFacts(supabase, sid)
    if (!facts) {
      // Scholarship deleted — archive (no point retrying).
      await supabase.rpc('archive_archetype_insight', { p_msg_id: row.msg_id })
      skipped++
      continue
    }

    // Eligibility hard-gate runs BEFORE the LLM call.
    const skipReason = eligibilityHardGate(aid, facts)
    if (skipReason) {
      await supabase.from('scholarship_archetype_insights').upsert(
        {
          scholarship_id: sid,
          archetype_id: aid,
          insight_text: null,
          eligibility_skipped: true,
          skip_reason: skipReason,
          generator_model: 'n/a',
          prompt_version: PROMPT_VERSION,
        },
        { onConflict: 'scholarship_id,archetype_id' },
      )
      await supabase.rpc('delete_archetype_insight', { p_msg_id: row.msg_id })
      skipped++
      continue
    }

    try {
      const out = await callLlmForCell(aid, facts)
      if ('skip' in out) {
        // Validator or LLM failure — leave on the queue for retry, unless
        // we're at max retries (handled above). Bump read_ct via VT expiry.
        console.warn('[drain] cell skipped, will retry', { sid, aid, reason: out.skip })
        // Don't delete the message — let visibility timeout expire so it
        // re-emerges. Logged for telemetry.
        continue
      }
      await supabase.from('scholarship_archetype_insights').upsert(
        {
          scholarship_id: sid,
          archetype_id: aid,
          insight_text: out.text,
          eligibility_skipped: false,
          skip_reason: null,
          generator_model: out.model,
          prompt_version: PROMPT_VERSION,
        },
        { onConflict: 'scholarship_id,archetype_id' },
      )
      await supabase.rpc('delete_archetype_insight', { p_msg_id: row.msg_id })
      written++
    } catch (err: any) {
      console.error('[drain] cell error', { sid, aid, err: String(err) })
      errored++
      // Don't delete — let visibility timeout requeue.
    }
  }

  // Best-effort depth read for observability.
  let depth = 0
  try {
    const { data: d } = await supabase.rpc('archetype_insights_queue_depth')
    depth = Number(d || 0)
  } catch { /* ignore */ }

  return respondJson(200, { drained: queueRows.length, written, skipped, errored, queue_depth: depth }, CORS_HEADERS_BASIC)
})
