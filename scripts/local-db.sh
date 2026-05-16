#!/usr/bin/env bash
#
# local-db.sh — stand up an isolated local Postgres for development.
#
# Populates the local Supabase stack from a schema snapshot of the cloud
# project plus a catalog-data subset — NOT by replaying supabase/migrations/
# (those include operational/cron migrations that fire HTTP at the real
# cloud project). Re-run any time to rebuild the local DB from scratch.
#
# Prerequisites:
#   - Docker daemon running
#   - supabase CLI installed (brew install supabase/tap/supabase)
#   - supabase/schema.sql and supabase/seed.sql generated — see README
#     "Local development". Regenerate them when the cloud schema changes.
#
# Usage:
#   bash scripts/local-db.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCHEMA="$ROOT/supabase/schema.sql"
SEED="$ROOT/supabase/seed.sql"
DB="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

command -v supabase >/dev/null 2>&1 || {
  echo "error: supabase CLI not found — brew install supabase/tap/supabase" >&2
  exit 1
}
[ -f "$SCHEMA" ] || {
  echo "error: $SCHEMA missing — generate it first (see README 'Local development')" >&2
  exit 1
}

echo "▸ starting local Supabase stack ..."
supabase start

echo "▸ loading schema → local DB ..."
psql "$DB" -v ON_ERROR_STOP=1 -q -f "$SCHEMA"

if [ -f "$SEED" ]; then
  echo "▸ loading catalog seed data ..."
  psql "$DB" -v ON_ERROR_STOP=1 -q -f "$SEED"
else
  echo "▸ no supabase/seed.sql — skipping seed (DB will be schema-only)"
fi

echo ""
echo "✓ local DB ready"
echo "  API:     http://127.0.0.1:54321"
echo "  DB:      $DB"
echo "  Studio:  http://127.0.0.1:54323"
echo ""
echo "  Point the frontend at it: copy .env.example → .env.local"
echo "  (Vite loads .env.local over .env automatically), then npm run dev."
