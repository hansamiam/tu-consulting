# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm install
npm run dev          # Vite dev server (port 8080; falls back to next free port)
npm run build        # production build with manual vendor chunking
npm run build:dev    # build in development mode
npm run lint         # eslint — see "Linting" caveat below
npm run preview      # serve the production build
npm run gen:types    # regenerate src/integrations/supabase/types.ts from the live cloud schema
```

There is **no test suite** — no vitest/jest/playwright, zero `*.test.*` files. Do not assume a test command exists.

**Edge functions** (Deno): type-check one with `deno check supabase/functions/<name>/index.ts`. Deploy with `supabase functions deploy [<name>]`.

**Migrations**: `supabase link --project-ref bsfldtpemfxhnkdzccib` then `supabase db push`.

**Local database**: by default the app and edge functions talk to the **production cloud Postgres** — local `npm run dev` writes hit prod. For an isolated local DB, see the "Local development database" section of `README.md` (`scripts/local-db.sh` builds it from a cloud schema snapshot).

## Architecture

Two halves: a Vite/React SPA and a Supabase backend (`project_id` `bsfldtpemfxhnkdzccib`).

**Frontend** — `src/`
- Routing lives entirely in `src/App.tsx`. Every page except the homepage is `React.lazy`-split into its own Vite chunk; add new routes above the `*` catch-all.
- `src/integrations/supabase/client.ts` is **auto-generated — do not hand-edit**. `types.ts` likewise (regenerate via `npm run gen:types` after a schema change).
- Read build-time env through `src/lib/env.ts` (`ENV`, `EDGE_FUNCTIONS_URL`) rather than `import.meta.env` directly.
- Most pages and the homepage carry an `en`/`ru` language prop threaded from the route; there is no i18n library — translations are inline `t(en, ru)` helpers per component.
- `src/_archive/` holds retired code (the "Prep" product spun off) — it is eslint-ignored; do not extend it.

**Backend** — `supabase/`
- ~60 Deno edge functions under `supabase/functions/`. Each is an `index.ts` running `Deno.serve`; deps are imported by full `https://esm.sh/...` URL. Per-function `verify_jwt` is set in `supabase/config.toml`.
- Shared edge modules in `supabase/functions/_shared/`:
  - `ai-gateway.ts` — pluggable LLM provider. Defaults to Lovable's gateway; `AI_PROVIDER` env var switches to OpenAI/Anthropic. Import `chatCompletions` / `embeddings` / `vision` — never call a provider SDK directly.
  - `dispatchClient.ts` — for cron functions that fan out to other edge functions; uses a rotation-resilient token from `private.app_secrets` so internal calls survive a "disable legacy JWT" project setting.
  - `clients.ts` — `createServiceClient()` / `createUserClient(authHeader)` factories. `cors.ts`, `http.ts` — CORS headers + JSON responders. `auth.ts` — admin/service-role gate. `firecrawl.ts`, `rate-limit.ts`, `editorial-rules.ts`, `scholarshipFields.ts`, `brief-sections.ts`.
- ~180 SQL migrations in `supabase/migrations/`. Many are **operational scripts** (named `seed_*`, `*_backfill*`, `*_audit*`, `fire_now_*`, `force_*`, `diag_*`), not schema — some hard-code the cloud URL and `net.http_post` to it. Do not assume a migration is pure DDL.

**Cross-cutting flows**
- **RAG / search**: pgvector (1536-dim) on `scholarships.embedding`, IVFFlat index. Drives the AI brief's prompt context and Discover's blended ranking. The `embed-scholarships` function backfills vectors.
- **Cron**: `pg_cron` + `pg_net` fire edge functions on schedule; the schedules are baked into migrations.
- **Email**: a `pgmq` queue drained by `process-email-queue`; transactional templates are `.tsx` files in `_shared/transactional-email-templates/`.
- **AI brief funnel** (`/topuni-ai`): wizard → `topuni-ai-pathway` streams an SSE brief → signup → persisted → counselor (`topuni-chat`) with full case awareness.
- Every user-facing table enforces `auth.uid() = user_id` RLS.

See `README.md` for the route table, required edge-function secrets, and the cold-start runbook.

## Conventions / caveats

- TypeScript config is intentionally loose (`strict: false`, `noImplicitAny: false`). `npm run lint` currently reports pre-existing errors (mostly `any` in backend and admin pages) — a clean run is not the baseline; do not let your change *add* errors.
- Path alias `@/` → `src/`.
- Edge functions log via `console.*` only — there is no structured logging or external error tracking.
