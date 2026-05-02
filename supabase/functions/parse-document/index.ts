// parse-document
//
// Triggered after a student uploads a file to the `student-documents`
// bucket. Downloads the object, extracts text, writes it back to
// student_documents.extracted_text + flips parse_status.
//
// Strategy by mime type:
//   - text/plain          → decode bytes as UTF-8
//   - application/pdf     → AI-vision via the Lovable AI gateway with
//                           a "transcribe this document" instruction
//                           (works for both selectable-text and
//                           scanned PDFs uniformly, no Deno-side PDF
//                           parser dep needed)
//   - image/*             → same vision path
//   - DOCX, RTF           → marked unsupported for v1 (small fraction
//                           of uploads; user can paste text instead)
//
// Body (POST):
//   { document_id: string }
//
// The function authenticates the caller's JWT, verifies they own the
// document_id, then proceeds. Service-role for the storage download
// + final UPDATE so RLS doesn't block.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { vision as gatewayVision } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface DocRow {
  document_id: string;
  user_id: string;
  storage_path: string;
  mime_type: string | null;
  filename: string;
  kind: string;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const KIND_INSTRUCTION: Record<string, string> = {
  transcript: "This is a student transcript or grade report. Transcribe ALL course names, grades, GPAs, dates, and institution names verbatim. Preserve any GPA-on-scale notation (e.g. 3.8/4.0). Output in plain text, structured by semester / year if visible.",
  essay_draft: "This is a student's draft essay (personal statement, scholarship essay, or SoP). Transcribe the FULL text verbatim, preserving paragraph breaks. Do not summarise.",
  reference_letter: "This is a recommendation letter. Transcribe the full text verbatim including the recommender's name, title, and institution.",
  cv: "This is a CV or resume. Transcribe ALL sections verbatim — education, experience, skills, awards. Preserve dates and bullet structure.",
  test_score: "This is a standardized test score report (IELTS / TOEFL / SAT / GRE / GMAT). Transcribe the test name, all section scores, the total/composite, the test date, and the certificate / registration number.",
  other: "Transcribe all readable text from this document verbatim. Preserve structure where possible.",
};

async function transcribeViaVision(
  bytes: Uint8Array,
  mime: string,
  kind: string,
): Promise<string> {
  const base64 = base64Encode(bytes);
  const instruction = KIND_INSTRUCTION[kind] ?? KIND_INSTRUCTION.other;
  return gatewayVision({
    tier: "flash",
    systemPrompt:
      "You are an OCR and document transcription assistant. Output ONLY the transcribed text — no preface, no commentary, no markdown headings unless they appear in the source.",
    instruction,
    imageBase64: base64,
    mime,
  });
}

/* base64 encode large Uint8Arrays without busting the call stack —
   `btoa(String.fromCharCode(...bytes))` blows up past ~70KB. */
function base64Encode(bytes: Uint8Array): string {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(s);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "POST only" });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE || !ANON_KEY) return json(500, { error: "Supabase env not configured" });
  // AI gateway env validated lazily in gatewayVision — see _shared/ai-gateway.ts

  // Auth check — caller must own the document_id
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(401, { error: "Authorization required" });
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: u } = await userClient.auth.getUser();
  const userId = u.user?.id;
  if (!userId) return json(401, { error: "Unauthenticated" });

  const body = (await req.json().catch(() => ({}))) as { document_id?: string };
  const documentId = body.document_id;
  if (!documentId) return json(400, { error: "document_id required" });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: doc, error: docErr } = await admin
    .from("student_documents")
    .select("document_id, user_id, storage_path, mime_type, filename, kind")
    .eq("document_id", documentId)
    .maybeSingle<DocRow>();
  if (docErr || !doc) return json(404, { error: "Document not found" });
  if (doc.user_id !== userId) return json(403, { error: "Not your document" });

  // Mark parsing
  await admin
    .from("student_documents")
    .update({ parse_status: "parsing", parse_error: null })
    .eq("document_id", documentId);

  try {
    // Download from storage
    const { data: file, error: dlErr } = await admin.storage
      .from("student-documents")
      .download(doc.storage_path);
    if (dlErr || !file) throw new Error(`Storage download: ${dlErr?.message ?? "no file"}`);

    const buf = new Uint8Array(await file.arrayBuffer());
    const mime = doc.mime_type || guessMime(doc.filename);

    let text = "";
    if (mime === "text/plain") {
      text = new TextDecoder().decode(buf).trim();
      if (text.length < 5) throw new Error("Empty plain-text file");
    } else if (mime === "application/pdf" || mime.startsWith("image/")) {
      text = await transcribeViaVision(buf, mime, doc.kind);
    } else if (
      mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mime === "application/rtf"
    ) {
      // DOCX / RTF unsupported in v1 — recommend re-export
      await admin
        .from("student_documents")
        .update({
          parse_status: "unsupported",
          parse_error: "DOCX / RTF parsing not yet supported. Export to PDF and re-upload.",
          parsed_at: new Date().toISOString(),
        })
        .eq("document_id", documentId);
      return json(200, { ok: false, status: "unsupported" });
    } else {
      throw new Error(`Unsupported mime: ${mime}`);
    }

    // Cap stored text — counselor doesn't need 200KB of transcript
    const trimmed = text.length > 30_000 ? text.slice(0, 30_000) + "\n\n[…truncated]" : text;

    await admin
      .from("student_documents")
      .update({
        parse_status: "ready",
        parse_error: null,
        extracted_text: trimmed,
        parsed_at: new Date().toISOString(),
      })
      .eq("document_id", documentId);

    return json(200, { ok: true, status: "ready", chars: trimmed.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("parse-document failed", documentId, msg);
    await admin
      .from("student_documents")
      .update({
        parse_status: "failed",
        parse_error: msg.slice(0, 1000),
        parsed_at: new Date().toISOString(),
      })
      .eq("document_id", documentId);
    return json(500, { ok: false, error: msg });
  }
});

function guessMime(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop() || "";
  if (ext === "pdf") return "application/pdf";
  if (ext === "txt") return "text/plain";
  if (ext === "rtf") return "application/rtf";
  if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "heic") return "image/heic";
  return "application/octet-stream";
}
