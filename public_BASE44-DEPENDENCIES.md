# Base44 Dependencies — حساب صراف

## NPM Packages
- `@base44/sdk` (0.8.51) — Base44 client SDK (auth, entities, integrations)
- `@base44/vite-plugin` (1.0.42) — Vite plugin for Base44 platform

## Source Files Depending on Base44
- `src/api/base44Client.js` — Pre-initialized base44 client instance
- `src/components/ProtectedRoute.jsx` — Auth guard using base44.auth.isAuthenticated()
- `src/components/AdminRoute.jsx` — Admin route guard using base44 auth
- `src/components/AppGate.jsx` — App-level gate with base44 auth context
- `src/lib/AuthContext.jsx` — Auth context with base44.auth fallback
- `src/components/ui/*` — shadcn/ui components (via @base44/vite-plugin)
- `index.html` — Base44 runtime script injection in `<head>`
- `vite.config.js` — Vite config with @base44/vite-plugin

## Backend
- `base44/functions/supabase/entry.ts` — Backend function (Deno runtime)
- `base44/shared/supabase_schema.sql` — Database schema SQL
- `base44/shared/rls_policies.sql` — RLS policies SQL
- `base44/config.jsonc` — Base44 app configuration
- `base44/entities/*.jsonc` — Entity schema definitions

## Migration Notes
- `base44.auth.*` → Replace with Supabase Auth or custom JWT
- `base44.entities.*` → Already replaced with supabaseApi.js
- `base44.functions.invoke` → Replace with direct Supabase calls or Edge Functions
- `base44.integrations.Core.*` → Replace with direct API calls
- `@base44/vite-plugin` → Remove from vite.config.js
- `index.html` `<head>` → Remove Base44 runtime script injection

## Status
- Entity CRUD: Migrated to supabaseApi.js (uses Supabase directly)
- Auth: Hybrid (HMAC tokens + base44.auth fallback for creator)
- Backend: Single Deno function (base44/functions/supabase/entry.ts)
- Deploy: Base44 platform (auto-deploy)
