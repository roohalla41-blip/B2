# Rebuild Checklist — حساب صراف

## Prerequisites
- [ ] Node.js 18+ installed
- [ ] Supabase account (free tier works)
- [ ] Code editor (VS Code recommended)

## Step 1: Create Project
- [ ] Create new Vite + React project: `npm create vite@latest hesab-sarraf -- --template react`
- [ ] Copy `package.json` dependencies
- [ ] Run `npm install`

## Step 2: Configure Build
- [ ] Copy `vite.config.js` (remove @base44/vite-plugin if migrating)
- [ ] Copy `tailwind.config.js`
- [ ] Copy `postcss.config.js`
- [ ] Copy `index.html` (remove Base44 runtime script if migrating)
- [ ] Copy `jsconfig.json`
- [ ] Copy `components.json`

## Step 3: Set Up Supabase
- [ ] Create new Supabase project
- [ ] Run `base44/shared/supabase_schema.sql` in SQL Editor
- [ ] Run `base44/shared/rls_policies.sql` in SQL Editor
- [ ] Create RPC functions (see SUPABASE-STRUCTURE.md)
- [ ] Create storage bucket: `public`

## Step 4: Set Secrets
- [ ] `VITE_SUPABASE_URL` — Supabase project URL
- [ ] `VITE_SUPABASE_KEY` — Supabase anon key
- [ ] `SUPABASE_URL` — Same as above (backend)
- [ ] `SUPABASE_KEY` — Same as above (backend)
- [ ] `SUPABASE_SERVICE_KEY` — Service role key
- [ ] `CREATOR_EMAIL` — Creator account email
- [ ] `CREATOR_PASSWORD` — Creator account password

## Step 5: Copy Source
- [ ] Copy `src/` directory
- [ ] Copy `base44/` directory
- [ ] Copy `public/` directory

## Step 6: Deploy Backend
- [ ] Deploy `base44/functions/supabase/entry.ts` as Edge Function
- [ ] Or keep on Base44 platform (if not migrating)

## Step 7: Test
- [ ] Test connection (SetupDatabase page)
- [ ] Bootstrap admin (CREATOR_EMAIL + CREATOR_PASSWORD)
- [ ] Test exchange registration
- [ ] Test customer registration
- [ ] Test login (exchange + customer + Google)
- [ ] Test CRUD operations
- [ ] Test financial operations (dadogereft, transfer)
- [ ] Test wallet operations
- [ ] Verify RLS policies active

## Step 8: Build & Deploy
- [ ] Run `npm run build`
- [ ] Deploy to hosting platform
- [ ] Configure custom domain
- [ ] Set up PWA (service worker)

## Notes
- No secrets are included in the backup — set them separately.
- Lock files may be outdated — run `npm install` to regenerate.
- The project uses Base44 platform for hosting by default.
- To migrate off Base44, see BASE44-DEPENDENCIES.md.
