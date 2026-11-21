# B2 Supabase connection

This directory is for the **B2 test project only**.

- Supabase project ref: `wwlyvojtsrklcpqsloqz`
- Region: `ap-northeast-1`
- Project URL: `https://wwlyvojtsrklcpqsloqz.supabase.co`
- The live A1 project is explicitly out of scope. Never point B2 code or workflows at A1.

## Client configuration expected by the current source

`src/lib/supabaseConfig.js` reads either:

1. `window.__SUPABASE_CONFIG__ = { url, key }` injected at runtime, or
2. `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` at build time.

Use only the project's **publishable** key in browser/mobile code. Never put a secret/service-role key in source code, runtime config, APK, or GitHub artifacts.

Copy `.env.example` to a local `.env` only after the web build structure is restored. Do not commit `.env`.

## Current connection blockers

- The Supabase project exists and reports healthy, but database metadata/SQL requests timed out during the current check. Database connectivity and schema state therefore remain unverified.
- The current repository has no root `package.json`, so a reproducible web dependency/build pipeline is not yet present.
- `AuthContext.jsx` imports `supabaseDirectAuth.js`, but that file is not present in the repository at the checked path.
- The checked-in SQL candidates are not approved migrations. In particular, the schema contains ordinary-text password columns, and the combined migration replaces existing policies. These require security/schema review before anything is applied.

## Safe rollout order

1. Restore the complete web source manifest and missing modules.
2. Audit and reconcile the existing B2 database schema using read-only inspection.
3. Correct password storage/authentication and review every RLS policy, trigger, and privileged function.
4. Convert the approved schema into ordered, versioned migrations.
5. Apply only to B2, verify tables/RLS/advisors, then wire the publishable key through environment configuration.
6. Run application-level auth and tenant-isolation tests.

No SQL is executed by the release preflight workflows.
