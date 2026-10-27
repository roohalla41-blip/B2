/**
 * Triple Backup PDF — نقشه و مستندات کامل اضطراری پروژه
 * شامل ۱۲ نقشه معماری + مستندات کامل + وابستگی‌های Base44 و Supabase
 */

import { jsPDF } from 'jspdf';

const PAGE_W = 210, PAGE_H = 297, MARGIN = 15, MAX_W = PAGE_W - MARGIN * 2;
const LINE_H = 5, SMALL_H = 4;

const PROJECT = {
  name: 'حساب صراف (Hesab Sarraf)',
  version: 'v01 — Emergency Backup',
  domain: 'https://motherapp.base44.app',
  date: new Date().toISOString(),
  description: 'سامانه جامع مدیریت عملیات صرافی، تبدیل ارز، حسابداری مشتریان و گزارش‌گیری مالی.',
};

const STACK = [
  ['Frontend', 'React 18.2 + Vite 6.1'],
  ['Styling', 'Tailwind CSS 3.4 + shadcn/ui + Radix UI'],
  ['Routing', 'React Router DOM 6.26'],
  ['Data Fetching', '@tanstack/react-query 5.84'],
  ['Forms', 'react-hook-form 7.54 + zod 3.24'],
  ['Icons', 'lucide-react 0.475'],
  ['Charts', 'recharts 2.15'],
  ['Animation', 'framer-motion 11.16'],
  ['Drag & Drop', '@hello-pangea/dnd 17'],
  ['Maps', 'react-leaflet 4.2'],
  ['3D', 'three.js 0.171'],
  ['PDF', 'jspdf 4.2 + html2canvas 1.4'],
  ['Database', 'PostgreSQL (Supabase)'],
  ['Backend Runtime', 'Deno (Base44 Backend Functions)'],
  ['Auth', 'Custom HMAC + PBKDF2 + Supabase Auth OTP + Google OAuth'],
  ['Payment', 'Stripe (installed, disabled)'],
  ['File Storage', 'Supabase Storage (public bucket)'],
  ['Supabase SDK', '@supabase/supabase-js 2.109'],
  ['Base44 SDK', '@base44/sdk 0.8.51'],
];

const ROUTES = [
  ['/', 'Welcome', 'Public'],
  ['/setup-database', 'SetupDatabase', 'Public'],
  ['/login', 'Login', 'Public'],
  ['/register', 'Register', 'Public'],
  ['/forgot-password', 'ForgotPassword', 'Public'],
  ['/reset-password', 'ResetPassword', 'Public'],
  ['/dashboard', 'Dashboard', 'Sarraaf'],
  ['/customers', 'Customers', 'Sarraaf'],
  ['/customers/:id', 'CustomerDetail', 'Sarraaf'],
  ['/dadogereft', 'Dadogereft', 'Sarraaf'],
  ['/trade', 'Trade', 'Sarraaf'],
  ['/transfers/:direction', 'Transfer', 'Sarraaf'],
  ['/cash', 'Cash', 'Sarraaf'],
  ['/bank', 'Bank', 'Sarraaf'],
  ['/currencies', 'Currencies', 'Sarraaf'],
  ['/reports', 'Reports', 'Sarraaf'],
  ['/profit-loss', 'ProfitLoss', 'Sarraaf'],
  ['/settings', 'Settings', 'Sarraaf'],
  ['/transfer-book', 'TransferBook', 'Sarraaf'],
  ['/journal', 'Journal', 'Sarraaf'],
  ['/general-ledger', 'GeneralLedger', 'Sarraaf'],
  ['/journal-entry', 'JournalEntry', 'Sarraaf'],
  ['/balance-sheet', 'BalanceSheet', 'Sarraaf'],
  ['/reconciliation', 'Reconciliation', 'Sarraaf'],
  ['/convert', 'CurrencyConvert', 'Sarraaf'],
  ['/online-products', 'OnlineProducts', 'Sarraaf'],
  ['/payment-gateway', 'PaymentGateway', 'Sarraaf'],
  ['/agents', 'Agents', 'Sarraaf'],
  ['/debtors', 'Debtors', 'Sarraaf'],
  ['/notifications', 'Notifications', 'Sarraaf'],
  ['/agency-network', 'AgencyNetwork', 'Sarraaf'],
  ['/chat', 'ChatGroups', 'Sarraaf'],
  ['/chat/group/:id', 'ChatGroupDetail', 'Sarraaf'],
  ['/sarraaf-market', 'SarraafMarket', 'Sarraaf'],
  ['/sarraaf-chat', 'SarraafChat', 'Sarraaf'],
  ['/backup', 'Backup', 'Sarraaf'],
  ['/support', 'SarraafSupport', 'Sarraaf'],
  ['/builder', 'BuilderPanel', 'Creator/Admin'],
  ['/main-settings', 'MainSettings', 'Creator/Admin'],
  ['/customer', 'CustomerHome', 'Customer'],
  ['/customer/wallet', 'CustomerWallet', 'Customer'],
  ['/customer/recharge', 'CustomerRecharge', 'Customer'],
  ['/customer/games', 'CustomerGames', 'Customer'],
  ['/customer/transfer', 'CustomerTransfer', 'Customer'],
  ['/customer/withdraw', 'CustomerWithdraw', 'Customer'],
  ['/customer/support', 'CustomerSupport', 'Customer'],
  ['/customer/account', 'CustomerAccount', 'Customer'],
  ['/customer/orders', 'CustomerOrders', 'Customer'],
  ['/customer/messages', 'CustomerMessages', 'Customer'],
  ['/customer/notifications', 'CustomerNotifications', 'Customer'],
  ['/customer/profile', 'CustomerProfile', 'Customer'],
  ['/customer/chat', 'CustomerChat', 'Customer'],
  ['/receipt', 'Receipt', 'Authenticated'],
];

const ENTITIES = [
  'User', 'SarraafProfile', 'Customer', 'Wallet', 'Transaction', 'Transfer',
  'Agent', 'Currency', 'BankAccount', 'BankGateway', 'Safe', 'OnlineProduct',
  'OnlineOrder', 'ChatGroup', 'GroupMember', 'GroupMessage', 'MessageReport',
  'WalletTransaction', 'WalletTopupRequest', 'WalletWithdrawalRequest',
  'WalletBan', 'CustomerTransferRequest', 'CustomerNotification', 'CustomerLink',
  'PaymentTransaction', 'PaymentRecord', 'AuditLog', 'AppSetting', 'FeatureSetting',
  'PricingPlan', 'PlanQuota', 'QuotaChangeLog', 'UserPermission', 'UserNotification',
  'UserFeedback', 'ErrorReport', 'SupportTicket', 'SupportMessage', 'Announcement',
  'Referral', 'AgencyLink', 'Seller', 'Package', 'RateSetting', 'TextLabel',
  'BackupRecord', 'BuilderAccess', 'CustomerChat', 'LedgerEntry',
];

const SUPABASE_TABLES = [
  'users', 'exchanges', 'customers', 'documents', 'transfers', 'conversions',
  'treasury_transactions', 'bank_accounts', 'bank_transactions', 'journal_entries',
  'ledger_entries', 'rates', 'idempotency_keys', 'employees', 'origins', 'safes',
  'rules', 'feature_settings', 'app_settings', 'audit_logs', 'wallet_transactions',
  'charge_orders', 'online_requests', 'online_products', 'wallets',
  'wallet_withdrawal_requests', 'wallet_topup_requests', 'wallet_bans',
  'customer_notifications', 'customer_transfer_requests', 'customer_links',
  'email_otps', 'user_notifications', 'user_permissions', 'user_feedback',
  'support_tickets', 'support_messages', 'error_reports', 'bank_gateways',
  'payment_transactions', 'chat_groups', 'chat_group_members', 'chat_messages',
  'message_reports', 'sellers', 'packages', 'pricing_plans', 'plan_quotas',
  'quota_change_logs', 'referrals', 'agency_links', 'backup_records',
  'rate_settings', 'text_labels',
];

const BASE44_DEPS = [
  ['@base44/sdk', '0.8.51', 'Base44 client SDK — auth, entities, integrations'],
  ['@base44/vite-plugin', '1.0.42', 'Vite plugin for Base44 platform'],
  ['src/api/base44Client.js', '—', 'Pre-initialized base44 client instance'],
  ['src/components/ProtectedRoute.jsx', '—', 'Auth guard using base44.auth.isAuthenticated()'],
  ['src/components/AdminRoute.jsx', '—', 'Admin route guard using base44 auth'],
  ['src/components/AppGate.jsx', '—', 'App-level gate with base44 auth context'],
  ['src/lib/AuthContext.jsx', '—', 'Auth context with base44.auth fallback'],
  ['src/components/ui/*', '—', 'shadcn/ui components (via @base44/vite-plugin)'],
  ['index.html', '—', 'Base44 runtime script injection in <head>'],
  ['vite.config.js', '—', 'Vite config with @base44/vite-plugin'],
  ['base44/functions/supabase/entry.ts', '—', 'Backend function (Deno runtime)'],
  ['base44/shared/supabase_schema.sql', '—', 'Database schema SQL'],
  ['base44/shared/rls_policies.sql', '—', 'RLS policies SQL'],
  ['base44/config.jsonc', '—', 'Base44 app configuration'],
  ['base44/entities/*.jsonc', '—', 'Entity schema definitions'],
  ['src/lib/seedBase44Entities.js', '—', 'Entity seeding utility'],
];

const SUPABASE_DEPS = [
  ['@supabase/supabase-js', '2.109.0', 'Supabase JavaScript client'],
  ['src/lib/supabaseClient.js', '—', 'Direct Supabase client (VITE_ env vars)'],
  ['src/lib/supabaseApi.js', '—', 'Supabase API layer (entity CRUD + field mapping)'],
  ['src/lib/supabaseDB.js', '—', 'Direct Supabase interaction module'],
  ['src/lib/supabaseAuth.js', '—', 'Supabase auth helpers'],
  ['base44/functions/supabase/entry.ts', '—', 'Backend function using service_role key'],
  ['VITE_SUPABASE_URL', '—', 'Frontend Supabase URL (public, safe)'],
  ['VITE_SUPABASE_KEY', '—', 'Frontend Supabase anon key (public, RLS-protected)'],
  ['SUPABASE_URL', '—', 'Backend Supabase URL (server-side)'],
  ['SUPABASE_KEY', '—', 'Backend Supabase anon key (server-side)'],
  ['SUPABASE_SERVICE_KEY', '—', 'Backend service role key (bypasses RLS)'],
  ['Tables (54+)', '—', 'See Supabase Structure section'],
  ['RLS Policies', '—', 'See RLS section — defense in depth'],
  ['Auth (OTP)', '—', 'Supabase built-in email OTP for verification'],
  ['Storage', '—', 'Public bucket for file uploads (receipts)'],
];

const FINANCIAL_LOGIC = [
  'Double-entry ledger: every transaction posts debit + credit lines',
  'Atomic document posting: documents + ledger_entries in single operation',
  'Idempotency: client_operation_id prevents duplicate operations',
  'Wallet operations: optimistic-lock balance updates (eq on current balance)',
  'Transfer posting: RPC post_transfer_transaction (atomic)',
  'Document reversal: RPC reverse_document_transaction',
  'Document edit: RPC edit_document_transaction (soft-delete old + insert new)',
  'Balances: SQL views (v_treasury_balances, v_bank_balances, v_customer_balances, etc.)',
  'Withdrawal: wallet deduction + withdrawal request + wallet_transaction',
  'Customer order: product price validation + wallet deduction + order creation',
];

const SECURITY_MODEL = [
  'HMAC-SHA256 stateless session tokens (12h TTL)',
  'PBKDF2 password hashing (100k iterations, SHA-256)',
  'Rate limiting: 5 failed logins in 15 min = lockout',
  'Tenant isolation: exchange_code scoping on all exchange-scoped tables',
  'RLS: defense in depth — anon key can only read public tables',
  'Service role: bypasses RLS (backend only, never exposed)',
  'Google OAuth: creates customer with placeholder mobile',
  'Audit logging: all login, CRUD, password change events',
  'No secrets in frontend: VITE_ vars are public, RLS-protected',
  'Idempotency keys: prevent duplicate financial operations',
];

function makeDoc() {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  doc.setFont('helvetica');
  doc.setTextColor(20, 20, 20);
  return { doc, y: MARGIN };
}

function addPageIfNeeded(state, h = LINE_H) {
  if (state.y + h > PAGE_H - MARGIN) {
    state.doc.addPage();
    state.y = MARGIN;
  }
}

function heading(state, text, size = 14) {
  addPageIfNeeded(state, 12);
  state.doc.setFontSize(size);
  state.doc.setFont('helvetica', 'bold');
  state.doc.setTextColor(235, 70, 56);
  state.doc.text(text, MARGIN, state.y);
  state.y += size * 0.5 + 3;
  state.doc.setTextColor(20, 20, 20);
}

function subheading(state, text, size = 11) {
  addPageIfNeeded(state, 10);
  state.doc.setFontSize(size);
  state.doc.setFont('helvetica', 'bold');
  state.doc.setTextColor(40, 40, 80);
  state.doc.text(text, MARGIN, state.y);
  state.y += size * 0.5 + 2.5;
  state.doc.setTextColor(20, 20, 20);
}

function para(state, text, size = 9, lh = LINE_H) {
  state.doc.setFontSize(size);
  state.doc.setFont('helvetica', 'normal');
  const lines = state.doc.splitTextToSize(text, MAX_W);
  for (const line of lines) {
    addPageIfNeeded(state, lh);
    state.doc.text(line, MARGIN, state.y);
    state.y += lh;
  }
}

function tableRows(state, rows, lh = SMALL_H) {
  state.doc.setFontSize(8);
  state.doc.setFont('helvetica', 'normal');
  for (const row of rows) {
    addPageIfNeeded(state, lh);
    const line = row.map((c, i) => String(c ?? '')).join('  |  ');
    const lines = state.doc.splitTextToSize(line, MAX_W);
    for (const l of lines) {
      addPageIfNeeded(state, lh);
      state.doc.text(l, MARGIN, state.y);
      state.y += lh;
    }
  }
}

function diagram(state, title, lines) {
  subheading(state, title);
  state.doc.setFontSize(7);
  state.doc.setFont('courier', 'normal');
  state.doc.setTextColor(10, 10, 10);
  for (const line of lines) {
    addPageIfNeeded(state, SMALL_H);
    const wrapped = state.doc.splitTextToSize(line, MAX_W);
    for (const w of wrapped) {
      addPageIfNeeded(state, SMALL_H);
      state.doc.text(w, MARGIN, state.y);
      state.y += SMALL_H;
    }
  }
  state.y += 2;
  state.doc.setTextColor(20, 20, 20);
}

function hr(state) {
  addPageIfNeeded(state, 3);
  state.doc.setDrawColor(200, 200, 200);
  state.doc.line(MARGIN, state.y, MARGIN + MAX_W, state.y);
  state.y += 4;
}

export function generateTripleBackupPdf() {
  const state = makeDoc();

  // ── Cover ──
  state.doc.setFillColor(235, 70, 56);
  state.doc.rect(0, 0, PAGE_W, 45, 'F');
  state.doc.setTextColor(255, 255, 255);
  state.doc.setFontSize(20);
  state.doc.setFont('helvetica', 'bold');
  state.doc.text(PROJECT.name, MARGIN, 25);
  state.doc.setFontSize(12);
  state.doc.setFont('helvetica', 'normal');
  state.doc.text('Emergency Backup — Full Architecture & Documentation', MARGIN, 33);
  state.doc.setFontSize(9);
  state.doc.text(`Version: ${PROJECT.version}`, MARGIN, 40);
  state.y = 55;
  state.doc.setTextColor(20, 20, 20);

  para(state, `Date: ${PROJECT.date}`);
  para(state, `Domain: ${PROJECT.domain}`);
  para(state, `Description: ${PROJECT.description}`);
  para(state, '');
  para(state, 'هشدار: این PDF از داده‌های استاتیک پروژه تولید شده است. موارد زیر نیازمند بررسی دستی هستند:');
  para(state, '- تعداد دقیق رکوردهای جداول (داده پویا — نیازمند بررسی)');
  para(state, '- وضعیت استقرار RPCها در Supabase (نیازمند بررسی)');
  para(state, '- سیاست‌های دقیق Storage (نیازمند بررسی)');
  para(state, '- متغیرهای محیطی فعال (نیازمند بررسی)');
  hr(state);

  // ── Table of Contents ──
  heading(state, 'Table of Contents');
  para(state, '1. Project Overview & Tech Stack');
  para(state, '2. Architecture Diagram');
  para(state, '3. Login & Authentication Flow');
  para(state, '4. Data Flow Diagram');
  para(state, '5. Database Schema & Relationships');
  para(state, '6. RLS & Security Diagram');
  para(state, '7. Financial Logic Diagram');
  para(state, '8. File Dependency Map');
  para(state, '9. Base44 Dependencies');
  para(state, '10. Supabase Dependencies');
  para(state, '11. Migration from Base44');
  para(state, '12. Rebuild from Scratch');
  para(state, '13. Frontend -> API -> Backend -> Database');
  para(state, '14. Routes (React Router)');
  para(state, '15. Entities');
  para(state, '16. Security Model');
  para(state, '17. Financial Logic');
  para(state, '18. PWA & Offline');
  para(state, '19. Environment Variables (no secrets)');
  para(state, '20. Build & Deployment');
  hr(state);

  // ── 1. Overview ──
  heading(state, '1. Project Overview & Tech Stack');
  para(state, `Project: ${PROJECT.name}`);
  para(state, `Status: In Development (Emergency Snapshot)`);
  tableRows(state, STACK);
  hr(state);

  // ── 2. Architecture ──
  diagram(state, '2. Architecture Diagram', [
    '┌─────────────────────────────────────────────┐',
    '│                 FRONTEND (React)               │',
    '│  ┌─────────┐  ┌──────────┐  ┌────────────┐  │',
    '│  │ Welcome  │  │ Sarraaf   │  │ Customer   │  │',
    '│  │ (Public) │  │ Panel     │  │ Panel      │  │',
    '│  └────┬─────┘  └─────┬────┘  └─────┬──────┘  │',
    '│       │              │              │         │',
    '│  ┌────▼──────────────▼──────────────▼──────┐ │',
    '│  │     AuthContext + ProtectedRoute          │ │',
    '│  │     (HMAC token + role check)             │ │',
    '│  └────────────────┬──────────────────────────┘ │',
    '│                   │                             │',
    '│  ┌────────────────▼──────────────────────────┐ │',
    '│  │     supabaseApi.js (Entity CRUD)          │ │',
    '│  │     offlineQueue.js (Offline-first)        │ │',
    '│  └────────────────┬──────────────────────────┘ │',
    '└───────────────────┼─────────────────────────────┘',
    '                    │',
    '┌───────────────────▼─────────────────────────────┐',
    '│           BACKEND (Base44 Deno Function)         │',
    '│  ┌──────────────────────────────────────────┐   │',
    '│  │  supabase/entry.ts (Single function)     │   │',
    '│  │  - Auth: HMAC + PBKDF2 + Google OAuth    │   │',
    '│  │  - CRUD: tenant-scoped (exchange_code)   │   │',
    '│  │  - Ledger: postDocument, postTransfer     │   │',
    '│  │  - Wallet: withdrawal, orders             │   │',
    '│  │  - Support: tickets, feedback             │   │',
    '│  └────────────────┬─────────────────────────┘   │',
    '│                   │                              │',
    '│  Uses: SUPABASE_SERVICE_KEY (bypasses RLS)     │',
    '└───────────────────┼──────────────────────────────┘',
    '                    │',
    '┌───────────────────▼─────────────────────────────┐',
    '│           SUPABASE (PostgreSQL)                  │',
    '│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │',
    '│  │users │ │exchan│ │custo │ │docum │ │ledger│ │',
    '│  │      │ │ges   │ │mers  │ │ents  │ │_entr │ │',
    '│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ │',
    '│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │',
    '│  │wallet│ │trans │ │bank  │ │chat  │ │audit │ │',
    '│  │_txn  │ │fers  │ │_acct │ │group │ │_logs │ │',
    '│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ │',
    '│  + 54 tables, 9 views, RLS policies             │',
    '│  + Storage bucket (public)                      │',
    '│  + Auth (email OTP)                             │',
    '└─────────────────────────────────────────────────┘',
  ]);
  hr(state);

  // ── 3. Login Flow ──
  diagram(state, '3. Login & Authentication Flow', [
    '                    ┌─────────────┐',
    '                    │  User Opens │',
    '                    │  App        │',
    '                    └──────┬──────┘',
    '                           │',
    '              ┌────────────▼────────────┐',
    '              │  AuthContext checks:    │',
    '              │  1. base44.auth.me()    │',
    '              │  2. HMAC token (local)  │',
    '              │  3. Local test mode     │',
    '              └────────────┬────────────┘',
    '                           │',
    '              ┌────────────▼────────────┐',
    '              │  Authenticated?         │',
    '              └──────┬───────┬──────────┘',
    '                 YES │       │ NO',
    '    ┌────────────────┘       └──────────────┐',
    '    │                                       │',
    '    ▼                                       ▼',
    '  ┌─────────────┐              ┌─────────────────┐',
    '  │ Role Check  │              │  Login Page     │',
    '  │ creator?    │              │  - Exchange     │',
    '  │ admin?      │              │  - Customer     │',
    '  │ sarraaf?    │              │  - Google OAuth  │',
    '  │ employee?   │              └────────┬────────┘',
    '  │ customer?   │                       │',
    '  └──┬────┬─────┘                       │',
    '     │    │              ┌──────────────▼──────┐',
    '     │    │              │  Backend: login     │',
    '     │    │              │  - Verify password  │',
    '     │    │              │  - Rate limit check │',
    '     │    │              │  - Issue HMAC token │',
    '     │    │              │  - Resolve exchange │',
    '     │    │              └──────────────┬──────┘',
    '     │    │                             │',
    '     ▼    ▼                             ▼',
    '  ┌────────┐ ┌────────┐     ┌─────────────────┐',
    '  │Builder  │ │Sarraaf │     │  Customer Panel │',
    '  │Panel    │ │Panel   │     │  /customer/*     │',
    '  │/builder │ │/dashboard    └─────────────────┘',
    '  └────────┘ └────────┘',
  ]);
  hr(state);

  // ── 4. Data Flow ──
  diagram(state, '4. Data Flow Diagram', [
    '  ┌──────────┐     ┌──────────────┐     ┌──────────┐',
    '  │  User     │────▶│  React       │────▶│  React   │',
    '  │  Action   │     │  Component    │     │  Query   │',
    '  │           │     │  (useState)   │     │  (useSarraaf)│',
    '  └──────────┘     └──────────────┘     └────┬─────┘',
    '                                               │',
    '                              ┌────────────────▼──────────┐',
    '                              │  supabaseApi.js           │',
    '                              │  callSupabase(action, data)│',
    '                              │  - Field mapping          │',
    '                              │  - Auth token injection   │',
    '                              └────────────────┬──────────┘',
    '                                               │',
    '                              ┌────────────────▼──────────┐',
    '                              │  Backend Function (Deno)  │',
    '                              │  base44.functions.invoke  │',
    '                              │  - Session verification   │',
    '                              │  - Tenant scoping         │',
    '                              │  - Amount validation      │',
    '                              └────────────────┬──────────┘',
    '                                               │',
    '                              ┌────────────────▼──────────┐',
    '                              │  Supabase (service_role) │',
    '                              │  - Insert/Update/Select   │',
    '                              │  - RPC (atomic ops)       │',
    '                              │  - Views (balances)       │',
    '                              └───────────────────────────┘',
  ]);
  hr(state);

  // ── 5. Database Schema ──
  heading(state, '5. Database Schema & Relationships');
  para(state, 'Tables (54+):');
  tableRows(state, SUPABASE_TABLES.map(t => [t]));
  para(state, '');
  diagram(state, 'Key Relationships', [
    'users (id) ──┬── exchanges (owner_user_id)',
    '              ├── customers (user_id)',
    '              └── wallets (user_id)',
    '',
    'exchanges (exchange_code) ──┬── documents',
    '                             ├── transfers',
    '                             ├── customers',
    '                             ├── rates',
    '                             ├── bank_accounts',
    '                             ├── safes',
    '                             └── all tenant-scoped tables',
    '',
    'documents (id) ──── ledger_entries (document_id)',
    'documents ──── transfers (transfer_id)',
    '',
    'wallets (id) ──── wallet_transactions (wallet_id)',
    'wallets ──── charge_orders (wallet_id)',
    'wallets ──── wallet_withdrawal_requests (wallet_id)',
    '',
    'chat_groups (id) ──── chat_group_members',
    'chat_groups ──── chat_messages',
    'chat_messages ──── message_reports',
  ]);
  hr(state);

  // ── 6. RLS & Security ──
  diagram(state, '6. RLS & Security Diagram', [
    '  ┌────────────────────────────────────────────────┐',
    '  │              SUPABASE RLS LAYER                 │',
    '  │                                                │',
    '  │  ┌────────────┐  ┌────────────┐  ┌──────────┐ │',
    '  │  │ anon key   │  │ authed key │  │ service  │ │',
    '  │  │ (frontend) │  │ (authed)   │  │ role     │ │',
    '  │  └──────┬─────┘  └──────┬─────┘  └────┬─────┘ │',
    '  │         │               │              │       │',
    '  │         ▼               ▼              ▼       │',
    '  │  ┌──────────┐   ┌──────────┐   ┌────────────┐ │',
    '  │  │ READ ONLY│   │ READ ONLY│   │ FULL ACCESS│ │',
    '  │  │ 5 public  │   │ 5 public │   │ (bypasses  │ │',
    '  │  │ tables    │   │ tables   │   │  RLS)      │ │',
    '  │  └──────────┘   └──────────┘   └────────────┘ │',
    '  │                                                │',
    '  │  Public (read-only): rules, feature_settings,  │',
    '  │    pricing_plans, online_products              │',
    '  │                                                │',
    '  │  All other tables: DENY ALL for anon/authed   │',
    '  │  (no policy = deny; service_role bypasses)     │',
    '  └────────────────────────────────────────────────┘',
    '',
    '  Application Security:',
    '  - HMAC-SHA256 tokens (12h TTL, signed with SERVICE_KEY)',
    '  - PBKDF2 password hashing (100k iterations)',
    '  - Rate limiting (5 fails / 15 min = lockout)',
    '  - Tenant isolation (exchange_code scoping)',
    '  - Audit logging (all CRUD + auth events)',
  ]);
  hr(state);

  // ── 7. Financial Logic ──
  diagram(state, '7. Financial Logic Diagram', [
    '  ┌──────────────────────────────────────────────────┐',
    '  │           DOUBLE-ENTRY LEDGER                    │',
    '  │                                                  │',
    '  │  Every transaction:                              │',
    '  │  ┌──────────┐    ┌──────────────┐                │',
    '  │  │ Document │───▶│ Ledger Lines │                │',
    '  │  │ (header) │    │ (debit+credit)│               │',
    '  │  └──────────┘    └──────────────┘                │',
    '  │                                                  │',
    '  │  Balance check: sum(debit) = sum(credit) per cur │',
    '  │                                                  │',
    '  │  Flow:                                           │',
    '  │  1. User submits (dadogereft/transfer/etc)       │',
    '  │  2. postDocument action                           │',
    '  │  3. Validate double-entry balance                │',
    '  │  4. Idempotency check (client_operation_id)      │',
    '  │  5. Generate doc_number (DOC-000001)             │',
    '  │  6. Insert document header                       │',
    '  │  7. Insert ledger_entries (debit + credit)        │',
    '  │  8. If lines fail → rollback document            │',
    '  │  9. Record idempotency key                        │',
    '  │  10. Audit log                                    │',
    '  │                                                  │',
    '  │  Wallet Operations:                              │',
    '  │  - Read wallet.balance                           │',
    '  │  - Check newBalance >= 0                         │',
    '  │  - UPDATE ... WHERE balance = currentBalance     │',
    '  │    (optimistic lock prevents concurrent overspend)│',
    '  └──────────────────────────────────────────────────┘',
  ]);
  hr(state);

  // ── 8. File Dependency ──
  diagram(state, '8. File Dependency Map', [
    '  src/main.jsx',
    '    └── src/App.jsx (Router + Providers)',
    '         ├── src/lib/AuthContext.jsx',
    '         ├── src/lib/i18n.jsx (Language Provider)',
    '         ├── src/lib/UpgradeContext.jsx',
    '         ├── src/components/AppGate.jsx',
    '         ├── src/components/ProtectedRoute.jsx',
    '         ├── src/components/AdminRoute.jsx',
    '         ├── src/components/sarraaf/Layout.jsx',
    '         ├── src/components/CustomerLayout.jsx',
    '         ├── src/pages/* (50+ pages)',
    '         └── src/lib/supabaseApi.js',
    '              ├── src/lib/supabaseClient.js',
    '              ├── src/lib/offlineQueue.js',
    '              └── src/lib/useSarraaf.js',
    '',
    '  src/lib/useSarraaf.js (React Query hooks)',
    '    └── src/lib/supabaseApi.js (callSupabase)',
    '',
    '  base44/functions/supabase/entry.ts (backend)',
    '  base44/shared/supabase_schema.sql (DDL)',
    '  base44/shared/rls_policies.sql (RLS)',
    '  base44/entities/*.jsonc (schemas)',
    '',
    '  Key shared libraries:',
    '    src/lib/rbac.js (role-based access control)',
    '    src/lib/ledgerApi.js (double-entry helpers)',
    '    src/lib/builderAccess.js (builder panel access)',
    '    src/lib/creatorAuth.js (creator role)',
    '    src/lib/features.js (feature catalog)',
    '    src/lib/permissions.js (permission system)',
  ]);
  hr(state);

  // ── 9. Base44 Dependencies ──
  heading(state, '9. Base44 Dependencies');
  para(state, 'Files and components that depend on Base44 platform:');
  tableRows(state, BASE44_DEPS);
  para(state, '');
  para(state, 'Migration notes:');
  para(state, '- base44.auth.* → Replace with Supabase Auth or custom JWT');
  para(state, '- base44.entities.* → Replace with supabaseApi.js (already done)');
  para(state, '- base44.functions.invoke → Replace with direct Supabase calls or Edge Functions');
  para(state, '- base44.integrations.Core.* → Replace with direct API calls');
  para(state, '- @base44/vite-plugin → Remove from vite.config.js');
  para(state,('- index.html <head> → Remove Base44 runtime script injection'));
  hr(state);

  // ── 10. Supabase Dependencies ──
  heading(state, '10. Supabase Dependencies');
  para(state, 'Real Supabase connections, tables, and services:');
  tableRows(state, SUPABASE_DEPS);
  para(state, '');
  para(state, 'Tables (54+): ' + SUPABASE_TABLES.join(', '));
  para(state, '');
  para(state, 'Views: v_treasury_balances, v_bank_balances, v_customer_balances, v_wallet_balances, v_agent_balances, v_profit_loss, v_currency_balances, v_exchange_summary, v_transactions');
  para(state, '');
  para(state, 'RPC Functions: post_transfer_transaction, reverse_document_transaction, edit_document_transaction, get_account_balance');
  hr(state);

  // ── 11. Migration from Base44 ──
  heading(state, '11. Migration from Base44');
  para(state, 'Step 1: Replace base44.auth with Supabase Auth or custom JWT');
  para(state, 'Step 2: Replace base44.entities with supabaseApi.js (already done)');
  para(state, 'Step 3: Replace base44.functions.invoke with direct Supabase calls');
  para(state, 'Step 4: Replace base44.integrations with direct API implementations');
  para(state, 'Step 5: Remove @base44/vite-plugin from vite.config.js');
  para(state, 'Step 6: Remove Base44 runtime script from index.html <head>');
  para(state, 'Step 7: Deploy backend function as Supabase Edge Function');
  para(state, 'Step 8: Set environment variables (SUPABASE_URL, SUPABASE_SERVICE_KEY)');
  para(state, 'Step 9: Test all CRUD operations via supabaseApi.js');
  para(state, 'Step 10: Verify RLS policies are active');
  hr(state);

  // ── 12. Rebuild from Scratch ──
  heading(state, '12. Rebuild from Scratch');
  para(state, 'Step 1: Create new Vite + React project');
  para(state, 'Step 2: Install dependencies (see package.json)');
  para(state, 'Step 3: Set up Tailwind CSS + shadcn/ui');
  para(state, 'Step 4: Create Supabase project + run schema SQL');
  para(state, 'Step 5: Apply RLS policies SQL');
  para(state, 'Step 6: Create backend function (copy entry.ts)');
  para(state, 'Step 7: Set secrets (SUPABASE_URL, SUPABASE_SERVICE_KEY, CREATOR_EMAIL, CREATOR_PASSWORD)');
  para(state, 'Step 8: Copy source files (src/*)');
  para(state, 'Step 9: Update routing (App.jsx)');
  para(state, 'Step 10: Test auth + CRUD + financial operations');
  hr(state);

  // ── 13. Frontend -> API -> Backend -> Database ──
  diagram(state, '13. Frontend -> API -> Backend -> Database', [
    '  FRONTEND                    API LAYER              BACKEND              DATABASE',
    '  ┌────────┐                 ┌──────────┐          ┌────────┐          ┌────────┐',
    '  │ React  │  useSarraaf()   │ supabase │  invoke  │ Deno   │  query   │ Supa-  │',
    '  │ Page   │────────────────▶│ Api.js   │─────────▶│ Func   │─────────▶│ base   │',
    '  │        │                 │          │          │        │          │ PG     │',
    '  │ useSt- │                 │ callSu-  │          │ entry  │          │        │',
    '  │ ate()  │                 │ pabase() │          │ .ts    │          │ 54+    │',
    '  └────────┘                 └──────────┘          └────────┘          │ tables │',
    '       ▲                           │                     │             │        │',
    '       │                           │                     │             │ 9 views│',
    '       │    Response (JSON)        │                     │             │        │',
    '       │◀──────────────────────────┘◀────────────────────┘◀────────────│ RLS    │',
    '                                                                       └────────┘',
    '',
    '  Token flow:',
    '  localStorage (auth_token) → callSupabase() → entry.ts verifyToken() → service_role query',
  ]);
  hr(state);

  // ── 14. Routes ──
  heading(state, '14. Routes (React Router)');
  tableRows(state, ROUTES);
  hr(state);

  // ── 15. Entities ──
  heading(state, '15. Entities');
  para(state, 'Entity schemas defined in base44/entities/*.jsonc:');
  tableRows(state, ENTITIES.map(e => [e]));
  hr(state);

  // ── 16. Security Model ──
  heading(state, '16. Security Model');
  for (const item of SECURITY_MODEL) para(state, '- ' + item);
  hr(state);

  // ── 17. Financial Logic ──
  heading(state, '17. Financial Logic');
  for (const item of FINANCIAL_LOGIC) para(state, '- ' + item);
  hr(state);

  // ── 18. PWA & Offline ──
  heading(state, '18. PWA & Offline');
  para(state, '- Service Worker: public/sw.js (needs update for full PWA)');
  para(state, '- Manifest: public/manifest.json');
  para(state, '- Offline Queue: src/lib/offlineQueue.js (queues writes, syncs on reconnect)');
  para(state, '- Cache: localStorage-based caching for offline reads');
  para(state, '- Sync Status: src/components/SyncIndicator.jsx');
  para(state, '- Keep Alive: src/lib/useKeepAlive.js (prevents Supabase inactivity pause)');
  hr(state);

  // ── 19. Environment Variables ──
  heading(state, '19. Environment Variables (no secrets)');
  para(state, 'Frontend (public, safe — RLS protected):');
  para(state, '  VITE_SUPABASE_URL — Supabase project URL');
  para(state, '  VITE_SUPABASE_KEY — Supabase anon key (public, RLS-protected)');
  para(state, '');
  para(state, 'Backend (server-side, never exposed):');
  para(state, '  SUPABASE_URL — Supabase project URL');
  para(state, '  SUPABASE_KEY — Supabase anon key');
  para(state, '  SUPABASE_SERVICE_KEY — Service role key (bypasses RLS)');
  para(state, '  CREATOR_EMAIL — Creator account email');
  para(state, '  CREATOR_PASSWORD — Creator account password');
  para(state, '  BASE44_APP_ID — Base44 app ID (for SDK fallback)');
  para(state, '');
  para(state, 'NOTE: All secrets are set via Base44 Secrets dashboard, not in code.');
  hr(state);

  // ── 20. Build & Deployment ──
  heading(state, '20. Build & Deployment');
  para(state, 'Build: vite build (Vite + React)');
  para(state, 'Deploy: Base44 platform (auto-deploy on push)');
  para(state, 'Backend: Deno runtime (base44/functions/supabase/entry.ts)');
  para(state, 'Database: Supabase PostgreSQL (managed)');
  para(state, 'Storage: Supabase Storage (public bucket)');
  para(state, 'Mobile: Base44 native build (iOS/Android)');
  para(state, 'Custom Domain: Configure in Base44 dashboard');
  hr(state);

  // ── Footer ──
  state.doc.addPage();
  state.y = PAGE_H / 2 - 20;
  state.doc.setFontSize(10);
  state.doc.setFont('helvetica', 'italic');
  state.doc.setTextColor(100, 100, 100);
  para(state, 'This PDF was generated as an emergency backup snapshot.');
  para(state, `Generated: ${PROJECT.date}`);
  para(state, `Project: ${PROJECT.name}`);
  para(state, `Version: ${PROJECT.version}`);
  para(state, '');
  para(state, 'No secrets, passwords, or API keys are included in this document.');
  para(state, 'Use the ZIP backup for source code and the Supabase backup for database structure.');

  const filename = `sarraaf-emergency-backup-${new Date().toISOString().slice(0, 10)}.pdf`;
  state.doc.save(filename);
  return filename;
}