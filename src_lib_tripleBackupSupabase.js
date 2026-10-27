/**
 * Triple Backup Supabase — self-contained SQL reconstruction file
 *
 * Includes ALL SQL scripts from public/ (not just schema + RLS):
 *   - supabase-schema.sql (tables, columns, PK, FK, constraints, indexes, views, functions, triggers)
 *   - supabase-rls-policies.sql (RLS policies)
 *   - supabase-app-token-auth.sql (HMAC token auth, PBKDF2, login/verify/change-password RPCs)
 *   - supabase-register-rpc.sql (register_customer, register_exchange RPCs)
 *   - supabase-direct-rls.sql (token-based RLS policies)
 *   - supabase-final-migration.sql (final consolidated migration)
 *   - supabase-missing-columns.sql, supabase-trial-columns.sql, etc.
 *
 * Output is labeled as a LOCAL DOCUMENTATION SNAPSHOT (not live database state).
 * No real data, PII, passwords, tokens, or keys are included.
 */

const SQL_FILES = [
  { name: 'supabase-schema.sql', label: 'Main schema (tables, views, functions, triggers)' },
  { name: 'supabase-rls-policies.sql', label: 'RLS policies' },
  { name: 'supabase-app-token-auth.sql', label: 'Token auth (HMAC, PBKDF2, login/verify RPCs)' },
  { name: 'supabase-register-rpc.sql', label: 'Registration RPCs (customer, exchange)' },
  { name: 'supabase-direct-rls.sql', label: 'Token-based RLS policies (x-app-token header)' },
  { name: 'supabase-final-migration.sql', label: 'Final consolidated migration' },
  { name: 'supabase-missing-columns.sql', label: 'Missing columns fix' },
  { name: 'supabase-trial-columns.sql', label: 'Trial period columns' },
  { name: 'supabase-migrate-passwords.sql', label: 'Password migration RPC' },
  { name: 'supabase-fix-register-rpc.sql', label: 'Register RPC fix' },
  { name: 'supabase-secure-login.sql', label: 'Secure login' },
  { name: 'supabase-login-fix.sql', label: 'Login fix' },
  { name: 'supabase-auth-fallback-rls.sql', label: 'Auth fallback RLS' },
  { name: 'supabase-builder-tables.sql', label: 'Builder tables' },
  { name: 'supabase-seller-system.sql', label: 'Seller system' },
  { name: 'supabase-languages.sql', label: 'Languages' },
  { name: 'supabase-recovery-rpc.sql', label: 'Recovery RPCs' },
  { name: 'supabase-recovery-backup.sql', label: 'Recovery backup' },
  { name: 'supabase-release-fixes.sql', label: 'Release fixes' },
  { name: 'supabase-diagnostic-check.sql', label: 'Diagnostic check' },
];

const DOC_FILES = [
  'SUPABASE-STRUCTURE.md',
  'SUPABASE-BACKUP-MANIFEST.txt',
  'BACKUP-MANIFEST.txt',
  'REBUILD-CHECKLIST.md',
  'BASE44-DEPENDENCIES.md',
];

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

export async function generateTripleBackupSupabase() {
  const now = new Date().toISOString();
  const dateStr = now.slice(0, 10);

  let sql = '';
  let fetchedCount = 0;
  let failedCount = 0;
  const fetchedFiles = [];
  const failedFiles = [];

  // ── Header ──
  sql += `-- ============================================================\n`;
  sql += `-- Supabase Emergency Backup — حساب صراف\n`;
  sql += `-- Generated: ${now}\n`;
  sql += `--\n`;
  sql += `-- SOURCE: Local SQL files in public/ directory\n`;
  sql += `-- TYPE: LOCAL DOCUMENTATION SNAPSHOT (not live database state)\n`;
  sql += `--\n`;
  sql += `-- This file contains structure (schema) only — no real data,\n`;
  sql += `-- PII, passwords, tokens, or keys are included.\n`;
  sql += `--\n`;
  sql += `-- To verify against live database state, run diagnostic queries\n`;
  sql += `-- in Supabase SQL Editor and compare with this file.\n`;
  sql += `--\n`;
  sql += `-- WARNING: This is a documentation snapshot. The actual database\n`;
  sql += `-- may have additional tables, columns, or policies not reflected here.\n`;
  sql += `-- Always verify with live database before any migration.\n`;
  sql += `-- ============================================================\n\n`;

  // ── Section 1: SQL Files ──
  sql += `-- ============================================================\n`;
  sql += `-- SECTION 1: SQL SCHEMA & MIGRATION SCRIPTS\n`;
  sql += `-- ============================================================\n\n`;

  for (const file of SQL_FILES) {
    sql += `-- ────────────────────────────────────────────\n`;
    sql += `-- FILE: ${file.name}\n`;
    sql += `-- PURPOSE: ${file.label}\n`;
    sql += `-- ────────────────────────────────────────────\n`;
    try {
      const content = await fetchText(`/${file.name}`);
      sql += content;
      sql += `\n\n`;
      fetchedCount++;
      fetchedFiles.push(file.name);
    } catch {
      sql += `-- ERROR: Could not fetch ${file.name} — file may not exist or server returned error\n\n`;
      failedCount++;
      failedFiles.push(file.name);
    }
  }

  // ── Section 2: Documentation Files ──
  sql += `-- ============================================================\n`;
  sql += `-- SECTION 2: DOCUMENTATION FILES\n`;
  sql += `-- ============================================================\n\n`;

  for (const docFile of DOC_FILES) {
    try {
      const content = await fetchText(`/${docFile}`);
      sql += `-- ── ${docFile} ──\n`;
      // Include as SQL comment block
      const lines = content.split('\n');
      for (const line of lines) {
        sql += `-- ${line}\n`;
      }
      sql += `\n`;
    } catch {
      // Skip missing docs
    }
  }

  // ── Section 3: Storage Structure (reference) ──
  sql += `-- ============================================================\n`;
  sql += `-- SECTION 3: STORAGE STRUCTURE (reference)\n`;
  sql += `-- ============================================================\n\n`;
  sql += `-- Bucket: public (publicly readable)\n`;
  sql += `-- Path pattern: receipts/<timestamp>_<filename>\n`;
  sql += `-- Used for: receipt uploads from backend function\n`;
  sql += `-- Creation: via backend code or manual SQL:\n`;
  sql += `--   INSERT INTO storage.buckets (id, name, public) VALUES ('public', 'public', true);\n\n`;

  // ── Section 4: Auth Structure (reference, no secrets) ──
  sql += `-- ============================================================\n`;
  sql += `-- SECTION 4: AUTH STRUCTURE (structural only, no secrets)\n`;
  sql += `-- ============================================================\n\n`;
  sql += `-- Auth model: Custom HMAC + Supabase Auth OTP (hybrid)\n`;
  sql += `--\n`;
  sql += `-- 1. Custom Auth (primary):\n`;
  sql += `--    - users table: id, username, mobile, email, password (PBKDF2 hashed)\n`;
  sql += `--    - HMAC-SHA256 session tokens signed with app_auth_secret (database table, NOT exposed)\n`;
  sql += `--    - Token payload: {uid, r (role), ec (exchange_code), exp}\n`;
  sql += `--    - Session TTL: 12 hours (43200000 ms)\n`;
  sql += `--    - PBKDF2 password hashing (100k iterations, SHA-256)\n`;
  sql += `--    - Rate limiting: 5 failed logins in 15 min = lockout (via audit_logs)\n`;
  sql += `--    - Roles: creator, admin, sarraaf (exchange), employee, customer\n`;
  sql += `--    - Creator account: created via backend bootstrapAdmin action\n`;
  sql += `--      (uses CREATOR_EMAIL and CREATOR_PASSWORD secrets — not in this file)\n`;
  sql += `--\n`;
  sql += `-- 2. Google OAuth:\n`;
  sql += `--    - Via Supabase Auth (signInWithOAuth)\n`;
  sql += `--    - Edge Function legacy-auth verifies Google access token\n`;
  sql += `--    - Auto-creates customer account if new\n`;
  sql += `--\n`;
  sql += `-- 3. Supabase Auth OTP (email verification):\n`;
  sql += `--    - Used for email verification during signup\n`;
  sql += `--    - Stored in email_otps table or app_settings\n`;
  sql += `--\n`;
  sql += `-- 4. RLS (Row Level Security):\n`;
  sql += `--    - Token-based: x-app-token header read by app_claims() function\n`;
  sql += `--    - app_is_admin(): checks if token role is creator/admin\n`;
  sql += `--    - app_ec(): extracts exchange_code from token\n`;
  sql += `--    - app_uid(): extracts user id from token\n`;
  sql += `--    - Tenant isolation: exchange_code filter on all tenant-scoped tables\n`;
  sql += `--    - See supabase-direct-rls.sql for full policy definitions\n`;
  sql += `--\n`;
  sql += `-- NOTE: No actual passwords, tokens, or secrets are included in this file.\n`;
  sql += `-- All secrets are set via the hosting platform's secret manager.\n\n`;

  // ── Section 5: Validation Summary ──
  sql += `-- ============================================================\n`;
  sql += `-- SECTION 5: VALIDATION SUMMARY\n`;
  sql += `-- ============================================================\n\n`;
  sql += `-- FILES FETCHED SUCCESSFULLY (${fetchedCount}):\n`;
  for (const f of fetchedFiles) {
    sql += `--   ✅ ${f}\n`;
  }
  sql += `\n`;
  if (failedCount > 0) {
    sql += `-- FILES FAILED TO FETCH (${failedCount}):\n`;
    for (const f of failedFiles) {
      sql += `--   ❌ ${f}\n`;
    }
    sql += `\n`;
  }
  sql += `-- TOTAL SQL FILES: ${SQL_FILES.length}\n`;
  sql += `-- SUCCESSFULLY FETCHED: ${fetchedCount}\n`;
  sql += `-- FAILED: ${failedCount}\n`;
  sql += `--\n`;
  sql += `-- END OF Supabase Emergency Backup\n`;

  // ── Download ──
  const blob = new Blob([sql], { type: 'text/sql;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `supabase-emergency-backup-${dateStr}.sql`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return a.download;
}