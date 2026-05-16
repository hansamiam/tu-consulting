// embed-scholarships
//
// Worker that pulls scholarships missing embeddings from the
// `scholarships_needing_embedding` view, calls the Lovable AI gateway's
// embeddings endpoint, and writes the resulting vectors back to the
// scholarships table. Service-role auth required — this is admin
// infrastructure, not a public endpoint.
//
// Designed to be cron-triggerable. Idempotent. Batches calls so a
// single invocation can process up to ~200 rows in one go without
// blowing the function timeout (60s on Supabase free tier).
//
// Trigger manually with:
//   curl -X POST <fn-url> \
//     -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
//     -H "Content-Type: application/json" \
//     -d '{"max_rows": 200}'

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { embeddings as gatewayEmbeddings } from "../_shared/ai-gateway.ts";
import { requireAdminOrService } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// OpenAI text-embedding-3-small: 1536 dim, $0.02 / 1M tokens.
// Lovable AI gateway proxies this transparently.
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIM = 1536;

// Batch sizes calibrated against function timeout + AI gateway rate limits
const EMBEDDING_API_BATCH = 100;        // OpenAI accepts up to 2048 inputs/req
const DB_FLUSH_BATCH      = 50;         // rows per UPDATE round

interface NeedingRow {
  scholarship_id: string;
  source_text: string;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function embedBatch(texts: string[]): Promise<number[][]> {
  const vectors = await gatewayEmbeddings({ input: texts, modelOverride: EMBEDDING_MODEL });
  // Validate dimension at the boundary so a model swap doesn't corrupt the index
  for (const v of vectors) {
    if (v.length !== EMBEDDING_DIM) {
      throw new Error(`Bad embedding dim: got ${v.length}, want ${EMBEDDING_DIM}`);
    }
  }
  return vectors;
}

// Postgres vector(N) literal — same syntax as `'[1,2,3]'::vector(3)`
const toVectorLiteral = (v: number[]): string => `[${v.join(",")}]`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Cron / admin gate. verify_jwt is false for this function (the gateway
  // can't see the cron's sb_secret apikey as a JWT), so it authenticates
  // the caller itself here.
  const auth = await requireAdminOrService(req);
  if (!auth.ok) return json(401, { error: auth.reason ?? "unauthorized" });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_ROLE) return json(500, { error: "Supabase env not configured" });
    // AI gateway env validated lazily in gatewayEmbeddings — see _shared/ai-gateway.ts

    const body = await req.json().catch(() => ({} as { max_rows?: number }));
    const maxRows = Math.min(Math.max(Number(body.max_rows) || 200, 1), 500);

    const supa = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Pull rows that need embedding from the maintenance view
    const { data: rows, error: fetchErr } = await supa
      .from("scholarships_needing_embedding")
      .select("scholarship_id, source_text")
      .limit(maxRows)
      .returns<NeedingRow[]>();
    if (fetchErr) throw new Error(`Fetch needing-embedding: ${fetchErr.message}`);

    if (!rows || rows.length === 0) {
      return json(200, { processed: 0, message: "No rows need embedding" });
    }

    const startedAt = Date.now();
    let processed = 0;
    const errors: { scholarship_id: string; error: string }[] = [];

    // Embed in batches of EMBEDDING_API_BATCH, then flush DB updates.
    for (let i = 0; i < rows.length; i += EMBEDDING_API_BATCH) {
      const slice = rows.slice(i, i + EMBEDDING_API_BATCH);
      const inputs = slice.map((r) => r.source_text || "");
      let vectors: number[][];
      try {
        vectors = await embedBatch(inputs);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // Mark this batch as errored but keep going
        for (const r of slice) errors.push({ scholarship_id: r.scholarship_id, error: msg });
        continue;
      }

      // Flush updates in DB_FLUSH_BATCH chunks
      for (let j = 0; j < slice.length; j += DB_FLUSH_BATCH) {
        const updateSlice = slice.slice(j, j + DB_FLUSH_BATCH);
        const updateVecs = vectors.slice(j, j + DB_FLUSH_BATCH);
        // Run updates in parallel — they're each one row, no contention
        const settled = await Promise.allSettled(
          updateSlice.map((r, k) =>
            supa
              .from("scholarships")
              .update({
                embedding: toVectorLiteral(updateVecs[k]) as unknown as string,
                embedding_source_text: r.source_text,
                embedded_at: new Date().toISOString(),
              })
              .eq("scholarship_id", r.scholarship_id),
          ),
        );
        for (let k = 0; k < settled.length; k++) {
          const s = settled[k];
          if (s.status === "rejected") {
            errors.push({ scholarship_id: updateSlice[k].scholarship_id, error: String(s.reason) });
          } else if (s.value.error) {
            errors.push({ scholarship_id: updateSlice[k].scholarship_id, error: s.value.error.message });
          } else {
            processed++;
          }
        }
      }
    }

    return json(200, {
      processed,
      total_to_process: rows.length,
      errors_count: errors.length,
      first_errors: errors.slice(0, 5),
      duration_ms: Date.now() - startedAt,
    });
  } catch (e) {
    console.error("embed-scholarships error:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});
