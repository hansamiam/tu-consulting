# TopUni

AI-driven university admissions strategy + scholarship database for ambitious students applying internationally. Built by Yale, Cambridge, and Harvard alumni.

```
acquisition   →  41 SEO landing pages + ~190 detail pages + viral shared briefs (with dynamic OG cards) + referrals + /match
activation    →  wizard → AI brief (RAG) → signup capture → DB persistence → counselor with full case awareness
retention     →  pipeline kanban + deadline calendar + weekly AI nudges + smart counselor + cron deadline reminders + document OCR feeding the chat
monetization  →  premium tier on brief (Gemini 2.5 Pro + 4 extra sections) + premium tier on essay critique
operational   →  URL freshness cron + Manus AI ingestion (~150 rows) + provenance tags + nudge audit log + RLS everywhere
```

## Stack

- **Frontend**: Vite + React + TypeScript + TailwindCSS + shadcn/ui (Radix). Code-split per route via `React.lazy`; vendor chunks long-term cacheable across deploys.
- **Backend**: Supabase Postgres + Edge Functions (Deno) + Storage + Auth.
- **AI gateway**: pluggable via `supabase/functions/_shared/ai-gateway.ts` — defaults to Lovable's gateway (`LOVABLE_API_KEY`); flip `AI_PROVIDER` env var to swap to OpenAI or Anthropic without touching any function.
- **Search**: pgvector (1536-dim) on `scholarships.embedding` with IVFFlat index. RAG-driven retrieval feeds the AI report's prompt context + Discover's blended ranking.
- **Email**: transactional email queue (`process-email-queue` edge function) → Lovable's email API. Suppression list enforced.
- **Cron**: pg_cron + pg_net firing edge functions on schedule.

## Local dev

```sh
npm install
npm run dev          # vite dev server on :8080
npm run gen:types    # regenerate Supabase types from live schema
npm run build        # production build with code-splitting
npm run lint
```

`.env`:
```
VITE_SUPABASE_PROJECT_ID=bsfldtpemfxhnkdzccib
VITE_SUPABASE_URL=https://bsfldtpemfxhnkdzccib.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
```

## Required edge function secrets

Set on the Supabase project (Settings → Edge Functions → Secrets, or `supabase secrets set NAME=value`):

| Secret | Purpose | Required when |
|---|---|---|
| `LOVABLE_API_KEY` | Lovable AI gateway (default provider) — powers brief / counselor / embeddings / vision / essay critique / nudges + email send | `AI_PROVIDER` is unset or set to `lovable` |
| `OPENAI_API_KEY` | OpenAI direct | `AI_PROVIDER=openai`, OR you want OpenAI as fallback for embeddings/vision when using Anthropic |
| `ANTHROPIC_API_KEY` | Anthropic direct | `AI_PROVIDER=anthropic` (vision/embeddings still need OpenAI) |
| `AI_PROVIDER` | `lovable` (default) / `openai` / `anthropic` | always |
| `STRIPE_SECRET_KEY` | Stripe billing | for Pricing / subscriptions |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification | when Stripe webhooks are wired to `verify-payment` |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL` are auto-injected by Supabase — no manual setup.

## Deploying

### Migrations
```sh
supabase login --token <PAT>
supabase link --project-ref bsfldtpemfxhnkdzccib
supabase db push                 # if CLI's session-role works
```
If the CLI's session-role flow is blocked (some plans), use the management-API SQL endpoint instead — there's `scripts/run_migrations.sh` (or run individual `.sql` files via the dashboard SQL editor).

### Edge functions
```sh
supabase functions deploy        # deploys ALL functions in supabase/functions/
supabase functions deploy <name> # deploy one
```

### Cron jobs
The `pg_cron` schedules are baked into migrations:
- `scholarship-deadline-cron` — daily 09:00 UTC
- `scholarship-url-health-cron` — Mondays 04:00 UTC
- `weekly-nudge-cron` — Sundays 10:00 UTC

If you change the project's URL or service-role key, re-apply the cron migrations (they hard-code those values now since `app.settings.*` GUCs need superuser).

## Cold-start runbook (after a fresh Supabase project)

1. Apply all migrations (above).
2. Deploy all edge functions (above).
3. Set the secrets table (Lovable API key + Stripe).
4. Run the embed worker once to populate vectors:
   ```sh
   curl -X POST -H "Authorization: Bearer $SERVICE_ROLE" \
     https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/embed-scholarships \
     -d '{"max_rows":500}'
   ```
   This embeds every scholarship missing a vector (~$0.20 of OpenAI cost for 200 rows).
5. Confirm on `/admin/insights` → "Embeddings ready" should match the catalog count.
6. Wire the Stripe webhook → `https://<project>.supabase.co/functions/v1/verify-payment`.

## Routes

| Route | Notes |
|---|---|
| `/` `/ru` | Marketing homepage |
| `/topuni-ai` | Wizard + AI brief generator (main funnel) |
| `/discover` | Scholarship database with blended ranking |
| `/scholarships/:id` | Per-scholarship SEO detail page |
| `/scholarships/by-{country\|field\|theme}/...` | 41 SEO landing pages |
| `/match` | Fast text→scholarships matcher |
| `/pipeline` `/calendar` | Mission control for tracked applications |
| `/essay` | Premium-gated reader-perspective essay critique |
| `/refer` | Share your referral code |
| `/account` | Authed user hub |
| `/brief/:slug` | Public shareable AI strategy brief |
| `/admin` `/admin/insights` `/admin/funnel` | Admin-only |

## Schema notes

- Every user-facing table has `auth.uid() = user_id` RLS — non-owners can't read or write.
- `scholarships.data_source` distinguishes hand-curated rows from external research (`manus_ai_2026_05_03`). UI surfaces this as a provenance pill.
- `scholarships.url_consecutive_fails` ≥ 3 → UI shows a "may have moved" warning. Driven by the weekly URL-health cron.
- `application_tracker` PK is `(user_id, scholarship_id)` — composite.
- `counselor_messages` writes are tee'd by the `topuni-chat` edge function as it streams the response back to the client.

## Adding a new edge function

```ts
// supabase/functions/my-fn/index.ts
import { chatCompletions } from "../_shared/ai-gateway.ts";

Deno.serve(async (req) => {
  const resp = await chatCompletions({
    tier: "flash",                    // or "pro"
    messages: [
      { role: "system", content: "You are a..." },
      { role: "user", content: "..." },
    ],
    stream: true,
  });
  return new Response(resp.body, {
    headers: { "Content-Type": "text/event-stream" },
  });
});
```

The shared module handles provider selection, model translation, auth headers, and Anthropic's different message shape. If you need embeddings or vision, import `embeddings` / `vision` from the same file.

## Project history

This codebase migrated off Lovable Cloud's managed Supabase to a self-owned project (`bsfldtpemfxhnkdzccib`, Top Uni Group org) on 2026-05-02. Schema, edge functions, and frontend all portable; the migration was non-destructive (Lovable's project still exists, just no longer wired up).
