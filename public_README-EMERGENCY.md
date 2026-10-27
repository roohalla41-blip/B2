# Emergency Project Backup — حساب صراف

Generated: 2026-09-27T18:40:40.800Z

## Project
- **Name:** حساب صراف (Hesab Sarraf)
- **Domain:** https://motherapp.base44.app
- **Status:** In Development

## Structure
- `src/` — Frontend source (React + Vite)
- `base44/` — Backend functions, entities, shared SQL
- `public/` — Static files, PWA manifest, service worker
- Root config files (package.json, vite.config.js, etc.)

## Dependencies
### Main
- React 18.2 + Vite 6.1
- Tailwind CSS 3.4 + shadcn/ui
- @supabase/supabase-js 2.109
- @base44/sdk 0.8.51

### Base44 Dependencies
- @base44/sdk — client SDK (auth, entities, integrations)
- @base44/vite-plugin — Vite plugin
- base44/functions/supabase/entry.ts — backend function (Deno)
- base44/entities/*.jsonc — entity schemas
- base44/shared/*.sql — database schema + RLS
- index.html — Base44 runtime script injection
- vite.config.js — @base44/vite-plugin

### Supabase Dependencies
- 54+ tables (PostgreSQL)
- 9 SQL views (balances, summary, transactions)
- 4 RPC functions (transfer, reversal, edit, balance)
- RLS policies (defense in depth)
- Auth (custom HMAC + Supabase OTP)
- Storage (public bucket)
- Environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_KEY, SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_KEY

## Secrets (NOT included — set separately)
- CREATOR_EMAIL — Creator account email
- CREATOR_PASSWORD — Creator account password
- SUPABASE_SERVICE_KEY — Service role key (bypasses RLS)
- SUPABASE_URL — Backend Supabase URL
- SUPABASE_KEY — Backend anon key

## Rebuild Checklist
1. Create new Vite + React project
2. Install dependencies from package.json
3. Set up Tailwind CSS + shadcn/ui
4. Create Supabase project + run base44/shared/supabase_schema.sql
5. Apply RLS: base44/shared/rls_policies.sql
6. Deploy backend function (base44/functions/supabase/entry.ts)
7. Set secrets (see above)
8. Copy source files (src/*)
9. Update routing (src/App.jsx)
10. Test auth + CRUD + financial operations

## Not Included
- node_modules/ (run npm install)
- .git/ (version control)
- dist/ (build output)
- Any .env files or secrets
- Lock files may be outdated — run npm install
