// emergencyBackupPdf.js — Comprehensive PDF generator for project rebuild
// Uses jsPDF to create a full technical blueprint of the project.

import { jsPDF } from 'jspdf';

const PAGE_W = 210; // A4 width mm
const PAGE_H = 297; // A4 height mm
const MARGIN = 15;
const MAX_W = PAGE_W - MARGIN * 2;
const LINE_H = 5;

// ── Static project data ──
const PROJECT_INFO = {
  name: 'Hesab Sarraf (حساب صراف)',
  version: '1.0.0',
  domain: 'https://motherapp.base44.app',
  description: 'Comprehensive exchange management system for currency exchange, customer accounting, transfers, and financial reporting.',
};

const TECH_STACK = [
  ['Frontend Framework', 'React 18.2 + Vite 6.1'],
  ['Language', 'JavaScript (JSX) + TypeScript (backend Deno)'],
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
  ['Auth', 'Custom HMAC tokens + PBKDF2 + Supabase Auth OTP + Google OAuth (Structure A)'],
  ['Payment', 'Stripe (installed, disabled)'],
  ['File Storage', 'Supabase Storage (public bucket)'],
  ['Base44 SDK', '@base44/sdk ^0.8.57'],
  ['Base44 Vite Plugin', '@base44/vite-plugin ^1.0.47'],
  ['Supabase JS', '@supabase/supabase-js ^2.109.0'],
  ['Source Files', '400+ frontend files (src/ + base44/ + public/)'],
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
  ['/online-products/wallet', 'SarraafWallet', 'Sarraaf'],
  ['/online-products/recharge', 'SarraafRecharge', 'Sarraaf'],
  ['/online-products/games', 'SarraafGames', 'Sarraaf'],
  ['/agents', 'Agents', 'Sarraaf'],
  ['/debtors', 'Debtors', 'Sarraaf'],
  ['/notifications', 'Notifications', 'Sarraaf'],
  ['/agency-network', 'AgencyNetwork', 'Sarraaf'],
  ['/agency', 'AgencyChooser', 'Sarraaf'],
  ['/chat', 'ChatGroups', 'Sarraaf'],
  ['/chat/group/:id', 'ChatGroupDetail', 'Sarraaf'],
  ['/sarraaf-market', 'SarraafMarket', 'Sarraaf'],
  ['/sarraaf-chat', 'SarraafChat', 'Sarraaf'],
  ['/backup', 'Backup', 'Sarraaf'],
  ['/support', 'SarraafSupport', 'Sarraaf'],
  ['/builder', 'BuilderPanel', 'Creator Only'],
  ['/main-settings', 'MainSettings', 'Creator Only'],
  ['/customer', 'CustomerHome', 'Customer'],
  ['/customer/wallet', 'CustomerWallet', 'Customer'],
  ['/customer/recharge', 'CustomerRecharge', 'Customer'],
  ['/customer/afghan5', 'CustomerAfghan5', 'Customer'],
  ['/customer/shop', 'CustomerShop', 'Customer'],
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
  ['/seller', 'SellerPanel', 'Authenticated'],
  ['/receipt', 'Receipt', 'Authenticated'],
  ['/assistant', 'Assistant', 'Sarraaf'],
];

const FOLDER_STRUCTURE = `src/ (269 files total)
  App.jsx                          - Router & route definitions (57 routes)
  main.jsx                         - Entry point
  index.css                        - Tailwind + design tokens (Vazirmatn font)
  api/base44Client.js              - Base44 SDK client (appId, token)
  components/
    ui/                            - shadcn/ui components (40+ files)
    sarraaf/                       - Sarraaf panel components (30+ files)
      SarraafLogo.jsx              - Brand logo component
      AppIconDownloader.jsx        - App icon SVG/PNG generator
      EmergencyBackup.jsx          - Emergency backup v1 component
      EmergencyBackupV2.jsx        - Emergency backup v2 component
      TripleBackup.jsx             - Triple backup (PDF+ZIP+SQL)
      ContactInfo.jsx              - Contact information display
      ContactBrandIcon.jsx         - Brand-colored contact icons
      CampaignBanner.jsx           - Campaign banner
      UsageBar.jsx                 - Plan usage bar
      Layout.jsx                   - Sarraaf panel layout
      Pieces.jsx                   - Reusable page components
      Fields.jsx                   - Form fields
      SupportPanel.jsx             - Support panel
      VersionManager.jsx           - Version manager
      SystemOverview.jsx           - System overview
      UserManagement.jsx           - User management
      ContactSettingsManager.jsx   - Contact settings
      SqlMigrationHelper.jsx       - SQL migration helper
      EmergencyBackupV2.jsx        - Emergency backup v2
      PermissionManager.jsx       - Permission manager
      TripleBackup.jsx             - Triple backup
      PlanFeatureManager.jsx       - Plan feature manager
      CoCreatorManager.jsx         - Co-creator manager
      NotificationManager.jsx     - Notification manager
      ChatManagement.jsx           - Chat management
      PlanPricingManager.jsx       - Plan pricing manager
      WithdrawalManagement.jsx     - Withdrawal management
      PaidSystemToggle.jsx         - Paid system toggle
      BankGatewayManager.jsx       - Bank gateway manager
      InviteCodeManager.jsx        - Invite code manager
      ReferralManager.jsx          - Referral manager
      ReferralCard.jsx             - Referral card
      BackupUpgradeModal.jsx       - Backup upgrade modal
      PricingManager.jsx           - Pricing manager
      PriceEditDialog.jsx          - Price edit dialog
      LanguageSettings.jsx         - Language settings
      TermsManager.jsx             - Terms manager
      UpdatingNotice.jsx           - Updating notice
      FeedbackButton.jsx           - Feedback button
    customer/                      - Customer panel components
    chat/                          - Chat components
    ProtectedRoute.jsx             - Auth guard
    AdminRoute.jsx                 - Admin/creator guard
    AppGate.jsx                    - App-level gate
    ErrorBoundary.jsx
    Layout.jsx                     - (not used - Layout is in sarraaf/)
    ScrollToTop.jsx
    CustomerLayout.jsx
    TermsGate.jsx
    ExchangeMark.jsx
    BrandMark.jsx
    GoogleIcon.jsx
    SarraafLogo.jsx                - Sarraaf brand logo
    IconCard.jsx
    LanguageSwitcher.jsx
    SummaryCards.jsx
    SyncIndicator.jsx
    ConnectionStatus.jsx
    WelcomeSplash.jsx
    FeaturesManagement.jsx
    ForceUpdateGate.jsx
  lib/ (40+ files)
    AuthContext.jsx                - Auth provider (custom Supabase auth)
    supabaseClient.js              - Direct Supabase client + ENTITY_TABLE_MAP
    supabaseApi.js                 - CRUD proxy via Edge Function
    ledgerApi.js                   - Financial operations (postDocument, postTransfer, etc.)
    useSarraaf.js                  - React Query hooks for all data
    i18n.jsx                       - Language provider (fa, en, ps, ar, tr)
    features.js                    - Feature catalog
    rbac.js                        - Role-based access control
    creatorAuth.js                 - Creator authentication
    googleAuth.js                  - Google OAuth
    supabaseAuth.js                - Supabase Auth wrapper
    localAuth.js                   - Local auth fallback
    offlineQueue.js                - Offline write queue
    syncStatus.js                  - Sync status tracker
    referralSystem.js              - Referral code generation
    pricingService.js              - Pricing plans
    auditLogger.js                 - Audit logging
    backupService.js               - Backup service
    query-client.js                - React Query client
    utils.js                       - cn() utility
    utils/index.ts                - createPageUrl
  pages/
    Welcome.jsx, Login.jsx, Register.jsx, ForgotPassword.jsx, ResetPassword.jsx
    Dashboard.jsx, Customers.jsx, CustomerDetail.jsx, Dadogereft.jsx, Trade.jsx
    Transfer.jsx, Cash.jsx, Bank.jsx, Currencies.jsx, Reports.jsx, ProfitLoss.jsx
    Settings.jsx, MainSettings.jsx, Agents.jsx, Debtors.jsx, Notifications.jsx
    AgencyNetwork.jsx, AgencyChooser.jsx, ChatGroups.jsx, ChatGroupDetail.jsx
    SarraafMarket.jsx, SarraafChat.jsx, Backup.jsx, CustomerChat.jsx
    TransferBook.jsx, Journal.jsx, GeneralLedger.jsx, JournalEntry.jsx
    BalanceSheet.jsx, Reconciliation.jsx, CurrencyConvert.jsx
    OnlineProducts.jsx, PaymentGateway.jsx, Receipt.jsx, PageNotFound.jsx
    SetupDatabase.jsx, BuilderPanel.jsx, SarraafSupport.jsx
    sarraaf/SarraafWallet.jsx, SarraafRecharge.jsx, SarraafGames.jsx
    customer/CustomerHome.jsx, CustomerWallet.jsx, CustomerRecharge.jsx
    customer/CustomerGames.jsx, CustomerTransfer.jsx, CustomerWithdraw.jsx
    customer/CustomerSupport.jsx, CustomerAccount.jsx, CustomerOrders.jsx
    customer/CustomerMessages.jsx, CustomerNotifications.jsx, CustomerProfile.jsx
base44/
  entities/                       - Entity schema files (JSONC) - 30+ entities
  functions/supabase/entry.ts     - Backend function (Deno, ~2000 lines)
  shared/                         - SQL migration scripts
    supabase_schema.sql, ledger_migration.sql, profile_migration.sql
    fix_missing_schema.sql, seed_test_data.sql, etc.
  config.jsonc`;

const SECURITY_MODEL = `SECURITY MODEL
===============

1. AUTHENTICATION
   - Custom HMAC-SHA256 signed session tokens (stateless, no sessions table)
   - Token payload: {uid, r (role), ec (exchange_code), exp} signed with app_auth_secret
   - app_auth_secret is a database table (NOT exposed to client — never use SUPABASE_SERVICE_KEY in frontend)
   - Session TTL: 12 hours (43200000 ms)
   - Passwords: PBKDF2 (100k iterations, SHA-256)
     Format: pbkdf2$<base64-salt>$<base64-hash>
     Legacy plaintext passwords auto-upgraded on next login
   - Google OAuth: email-based, auto-creates customer account if new
   - Supabase Auth OTP: email verification (4-hour rate limit per email)
   - STRUCTURE A (current): Google OAuth via Base44 platform
   - STRUCTURE B (planned): Google OAuth via Supabase directly (not yet implemented)
   - Rate Limiting: 5 failed login attempts in 15 min = lockout

2. AUTHORIZATION (Roles)
   - creator: Full access to all data, builder panel, user management
   - exchange: Tenant-scoped access (exchange_code isolation)
   - customer: Self-scoped only (own wallets, orders, notifications)
   - employee: Inherits exchange role

3. TENANT ISOLATION
   - Every CRUD call scoped by exchange_code (exchange role)
   - Creator gets 'CREATOR' as default exchange_code
   - Customer sees only own data (filtered by user_id / mobile)
   - exchange_code never accepted from client body (server-derived only)

4. ROW LEVEL SECURITY (RLS)
   - Enabled on all tables
   - Policies per table (see database schema section)
   - Service role bypasses RLS (used in backend function)

5. ANTI-SPOOF
   - user_id, exchange_code derived from verified session only
   - Never accepted from client request body
   - numericUserId() guards against non-numeric Base44 UUIDs

6. AUDIT LOGGING
   - All login/logout/create/update/delete actions logged
   - Stored in audit_logs table
   - Never blocks request on audit failure

7. IDEMPOTENCY
   - client_operation_id prevents duplicate writes
   - Uses idempotency_keys table with UNIQUE constraint
   - Atomic claim via INSERT ON CONFLICT DO NOTHING

8. AMOUNT VALIDATION
   - Server-side validation for financial fields
   - Positive amounts: transfers, conversions, rates
   - Non-negative: documents, journal entries, ledger entries`;

const BASE44_DEPS = `BASE44 DEPENDENCIES
===================

1. @base44/vite-plugin (v1.0.47)
    Location: vite.config.js
   Purpose: Build-time plugin for HMR, navigation, analytics, visual edit
   Critical: YES - Build will fail without it
   Replacement: Standard Vite config (remove plugin, add manual HMR)
   Independence: Can be replaced with standard Vite + React plugin

2. @base44/sdk (v0.8.57)
    Location: src/api/base44Client.js, src/lib/app-params.js
    Purpose: SDK client for auth, entities, integrations
    Critical: PARTIAL - Only used for creator auth fallback + integrations
    Usage in frontend: base44Client.js creates client with appId/token
    Usage in backend: createClientFromRequest(req) in entry.ts
   Replacement:
     - Frontend: Remove base44Client.js, use supabaseClient.js directly
     - Backend: Remove createClientFromRequest, use HMAC tokens only
   Independence: 95% of app works without it (only creator auth fallback needs it)

3. Backend Functions (Deno runtime)
   Location: base44/functions/supabase/entry.ts
   Purpose: All API logic, auth, CRUD, financial operations
   Critical: YES - Entire app depends on this
   Hosting: Base44 platform (https://motherapp.base44.app/functions/supabase)
   Replacement: Deploy to Deno Deploy, Vercel Edge, or Cloudflare Workers
   Independence: Code is standard Deno + @supabase/supabase-js
     Only dependency: createClientFromRequest from @base44/sdk (for creator auth)
     Can be removed by using HMAC tokens exclusively

4. Entity Schemas (base44/entities/*.jsonc)
   Purpose: Define data structure in Base44 dashboard
   Critical: NO - Not used at runtime (data is in Supabase)
   Replacement: SQL schema (already exists in base44/shared/*.sql)
   Independence: Already independent - Supabase is source of truth

5. Hosting & Deploy
   Current: Base44 platform (motherapp.base44.app)
   Replacement: Vercel, Netlify, or any static hosting for frontend
                Deno Deploy / Cloudflare Workers for backend

6. Integrations (InvokeLLM, SendEmail, UploadFile, etc.)
   Accessed via: base44.integrations.Core.*
   Used for: AI features, email, file uploads
   Replacement:
     - InvokeLLM: Use OpenAI/Anthropic API directly
     - SendEmail: Use Resend, SendGrid, or Supabase email
     - UploadPrivateFile: Use Supabase Storage directly
     - UploadPublicFile: Use Supabase Storage (public bucket)

7. Analytics
   Accessed via: base44.analytics.track()
   Replacement: Google Analytics, Plausible, or custom endpoint

SEPARATION PLAN
===============
Step 1: Remove @base44/vite-plugin from vite.config.js
Step 2: Replace base44Client.js with direct supabaseClient.js usage
Step 3: Remove createClientFromRequest from entry.ts (use HMAC tokens only)
Step 4: Deploy frontend to Vercel/Netlify
Step 5: Deploy backend (entry.ts) to Deno Deploy
Step 6: Point frontend to new backend URL
Step 7: Remove base44/entities/ (already in SQL schema)
Result: Fully independent app`;

const FINANCIAL_LOGIC = `FINANCIAL LOGIC
===============

1. DOUBLE-ENTRY LEDGER
   - Every financial operation creates a Document + Ledger Entries
   - Document: header (doc_number, type, amount, currency, fee)
   - Ledger Entries: individual debit/credit lines per account
   - Balance validation: sum(debit) = sum(credit) per currency
   - Tolerance: 0.01

2. ACCOUNT TYPES
   - cash: Treasury safes (per currency)
   - bank: Bank accounts
   - customer: Customer balances
   - wallet: Digital wallets
   - agent: Agent/representative balances
   - fee: Fee/commission income
   - suspense: Temporary accounts

3. DOCUMENT TYPES
   - dadogereft: Customer payment in/out
   - buy: Buy currency from customer
   - sell: Sell currency to customer
   - transfer_send / transfer_receive: Transfer operations
   - internal_transfer: Cash/bank transfers
   - open_balance: Opening balance
   - convert: Currency conversion
   - manual: Manual adjustment

4. RPC FUNCTIONS (PostgreSQL)
   - post_transfer_transaction: Atomic transfer + document + lines
   - reverse_document_transaction: Soft-delete + reversal entries
   - edit_document_transaction: Replace lines with new ones
   - get_account_balance: Single account balance query

5. SQL VIEWS (balances)
   - v_treasury_balances: Cash/safe balances per exchange
   - v_bank_balances: Bank account balances
   - v_customer_balances: Customer debit/credit balances
   - v_wallet_balances: Digital wallet balances
   - v_agent_balances: Agent balances
   - v_profit_loss: Profit & loss summary
   - v_currency_balances: Per-currency balances
   - v_exchange_summary: Exchange-level summary

6. IDEMPOTENCY
   - client_operation_id prevents duplicate financial operations
   - Atomic claim via idempotency_keys table

7. SAFE LIMITS
   - Max 4 safes per exchange
   - Amount validation (positive/non-negative checks)
   - Tenant isolation on all financial tables`;

const RECONSTRUCTION_GUIDE = `RECONSTRUCTION GUIDE
=====================

PREREQUISITES:
- Access to existing Supabase project (URL + keys)
- This PDF document
- Development environment (Node.js, Deno)

STEP 1: VERIFY SUPABASE
1.1. Connect to existing Supabase project
1.2. Run: SELECT * FROM information_schema.tables WHERE table_schema='public';
1.3. Compare table list with Section: Database Schema
1.4. DO NOT modify any existing tables or data
1.5. If tables are missing, run SQL scripts from base44/shared/

STEP 2: REBUILD BACKEND
2.1. Create a new Deno project
2.2. Copy entry.ts logic (documented in this PDF)
2.3. Set environment variables:
     - SUPABASE_URL (from Supabase dashboard)
     - SUPABASE_KEY (anon key, public)
     - SUPABASE_SERVICE_KEY (service role key, secret)
     - BASE44_APP_ID (only if keeping creator auth fallback)
2.4. Deploy to Deno Deploy / Cloudflare Workers
2.5. Test: POST /getDatabaseSchema (should return schema)

STEP 3: REBUILD AUTHENTICATION
3.1. Implement HMAC-SHA256 token signing (see Security Model)
3.2. Implement PBKDF2 password hashing
3.3. Implement rate limiting via audit_logs
3.4. Implement Google OAuth flow
3.5. Implement email OTP via Supabase Auth
3.6. Test: login, register, change password

STEP 4: REBUILD API LAYER
4.1. Implement CRUD with tenant isolation
4.2. Implement safeInsert/safeUpdate (auto-strip unknown columns)
4.3. Implement idempotency via client_operation_id
4.4. Implement amount validation
4.5. Test: create/update/delete on each table

STEP 5: REBUILD FINANCIAL LOGIC
5.1. Implement postDocument (atomic document + ledger lines)
5.2. Implement postTransfer (RPC: post_transfer_transaction)
5.3. Implement reverseDocument (RPC: reverse_document_transaction)
5.4. Implement editDocument (RPC: edit_document_transaction)
5.5. Implement getBalances (query SQL views)
5.6. Test: post, reverse, edit, balance queries

STEP 6: REBUILD FRONTEND
6.1. Create Vite + React project
6.2. Install all dependencies (see Technology Stack)
6.3. Copy src/ directory structure (see Folder Structure)
6.4. Configure Tailwind + shadcn/ui
6.5. Configure React Router (see Routes)
6.6. Connect to new backend API
6.7. Test: all pages render, data loads

STEP 7: REBUILD PAGES & COMPONENTS
7.1. Recreate all pages (see Routes section)
7.2. Recreate all components (see Folder Structure)
7.3. Wire up forms, tables, dialogs
7.4. Test: full user flows

STEP 8: CONNECT FINANCIAL FLOWS
8.1. Wire up useSarraaf.js hooks
8.2. Wire up ledgerApi.js functions
8.3. Test: buy, sell, transfer, dadogereft, convert

STEP 9: TEST EVERYTHING
9.1. Test all user roles (creator, exchange, customer)
9.2. Test all financial operations
9.3. Test all CRUD operations
9.4. Verify balances match
9.5. Test error handling

STEP 10: FINAL VERIFICATION
10.1. Compare database schema with this PDF
10.2. Compare routes with this PDF
10.3. Compare security model with this PDF
10.4. Verify no data was lost or modified
10.5. Document any deviations

CRITICAL RULES:
- NEVER delete existing tables or data
- NEVER modify RLS policies without understanding impact
- ALWAYS backup before any schema changes
- ALWAYS test with a copy first
- NEVER store secrets in the PDF or frontend code`;

const AI_PROMPT = `PROMPT FOR EMERGENCY PROJECT REBUILD
===================================

You are an expert software engineer tasked with rebuilding a production application called "Hesab Sarraf" (حساب صراف) - a comprehensive currency exchange management system.

CONTEXT:
- The original app was built on Base44 platform but needs to be rebuilt independently
- The database (Supabase/PostgreSQL) is intact and contains real user data
- This PDF contains the complete technical blueprint of the project
- Your job is to rebuild the application code, NOT modify the database

INSTRUCTIONS:

1. REVIEW THIS DOCUMENT
   - Read every section carefully
   - Understand the architecture, security model, and financial logic
   - Note all Base44 dependencies and their replacements

2. VERIFY SUPABASE
   - Connect to the Supabase project (URL will be provided separately)
   - Run schema queries to verify tables match this document
   - DO NOT create, modify, or delete any tables
   - DO NOT modify any existing data
   - Report any schema discrepancies

3. REBUILD BACKEND FIRST
   - Implement the backend function (entry.ts) using Deno
   - Use @supabase/supabase-js directly (no @base44/sdk)
   - Implement all actions listed in this document
   - Deploy to Deno Deploy or equivalent

4. REBUILD FRONTEND
   - Use Vite + React 18 + Tailwind CSS + shadcn/ui
   - Follow the folder structure in this document
   - Implement all routes from the Routes section
   - Connect to your new backend API

5. PRESERVE DATA INTEGRITY
   - All user data must remain intact
   - All financial records must remain accurate
   - All RLS policies must be maintained
   - All tenant isolation must work correctly

6. SECURITY REQUIREMENTS
   - Implement HMAC-SHA256 session tokens
   - Implement PBKDF2 password hashing (100k iterations)
   - Implement rate limiting (5 fails / 15 min lockout)
   - Implement tenant isolation per exchange_code
   - Never trust client-supplied user_id or exchange_code

7. TESTING
   - Test all user roles: creator, exchange, customer
   - Test all financial operations: buy, sell, transfer, convert
   - Test all CRUD operations
   - Verify balances are correct
   - Test error handling and edge cases

8. BEFORE ANY DESTRUCTIVE ACTION
   - Always backup the database first
   - Always test on a copy
   - Never run ALTER/DROP without verification
   - Never modify RLS without understanding the impact

SECRETS NEEDED (provide separately, never in code):
- SUPABASE_URL
- SUPABASE_KEY (anon, public)
- SUPABASE_SERVICE_KEY (service role, secret)
- BASE44_APP_ID (only if keeping creator auth fallback)

START HERE:
1. Read this entire document
2. Ask for the Supabase URL and keys
3. Verify the database schema
4. Begin rebuilding from backend to frontend
5. Test thoroughly before deploying`;

// ── PDF helpers ──
function newPage(doc, y) {
  doc.addPage();
  return 20;
}

function addText(doc, text, x, y, fontSize = 9) {
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(text, MAX_W);
  for (const line of lines) {
    if (y > PAGE_H - 20) {
      y = newPage(doc, y);
    }
    doc.text(line, x, y);
    y += LINE_H;
  }
  return y;
}

function addHeader(doc, text, y) {
  y += 4;
  if (y > PAGE_H - 40) y = newPage(doc, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(50, 50, 120);
  doc.text(text, MARGIN, y);
  doc.setTextColor(0, 0, 0);
  y += 3;
  doc.setDrawColor(200, 200, 220);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 5;
  return y;
}

function addSubHeader(doc, text, y) {
  y += 3;
  if (y > PAGE_H - 30) y = newPage(doc, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 80);
  doc.text(text, MARGIN, y);
  doc.setTextColor(0, 0, 0);
  y += 5;
  return y;
}

function addMono(doc, text, y, fontSize = 7.5) {
  doc.setFont('courier', 'normal');
  const lines = doc.splitTextToSize(text, MAX_W);
  for (const line of lines) {
    if (y > PAGE_H - 20) y = newPage(doc, y);
    doc.setFontSize(fontSize);
    doc.text(line, MARGIN, y);
    y += 4;
  }
  doc.setFont('helvetica', 'normal');
  return y;
}

function addTable(doc, headers, rows, y, colWidths) {
  const rowH = 5;
  const cw = colWidths || headers.map(() => MAX_W / headers.length);

  // Header
  if (y > PAGE_H - 40) y = newPage(doc, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  let x = MARGIN;
  for (let i = 0; i < headers.length; i++) {
    doc.setFillColor(220, 220, 240);
    doc.rect(x, y - 4, cw[i], rowH, 'F');
    doc.text(headers[i], x + 1, y);
    x += cw[i];
  }
  y += rowH;
  doc.setFont('helvetica', 'normal');

  // Rows
  for (const row of rows) {
    if (y > PAGE_H - 20) {
      y = newPage(doc, y);
      // Repeat header
      doc.setFont('helvetica', 'bold');
      x = MARGIN;
      for (let i = 0; i < headers.length; i++) {
        doc.setFillColor(220, 220, 240);
        doc.rect(x, y - 4, cw[i], rowH, 'F');
        doc.text(headers[i], x + 1, y);
        x += cw[i];
      }
      y += rowH;
      doc.setFont('helvetica', 'normal');
    }
    x = MARGIN;
    for (let i = 0; i < row.length; i++) {
      const txt = String(row[i] || '').substring(0, 60);
      doc.text(txt, x + 1, y);
      x += cw[i];
    }
    y += rowH;
  }
  return y + 2;
}

// ── Main PDF generator ──
export function generateEmergencyPdf(schema) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const now = new Date();
  const timestamp = now.toISOString();
  const localTime = now.toLocaleString('en-GB', { timeZone: 'Asia/Tehran' });

  let y = 20;

  // ── PAGE 1: Title ──
  doc.setFillColor(30, 30, 80);
  doc.rect(0, 0, PAGE_W, 60, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('EMERGENCY PROJECT BACKUP', PAGE_W / 2, 25, { align: 'center' });
  doc.setFontSize(14);
  doc.text(PROJECT_INFO.name, PAGE_W / 2, 35, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Complete Technical Blueprint for Project Rebuild', PAGE_W / 2, 45, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  y = 75;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('PROJECT INFORMATION', MARGIN, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const infoLines = [
    ['Project Name', PROJECT_INFO.name],
    ['Version', PROJECT_INFO.version],
    ['Domain', PROJECT_INFO.domain],
    ['Backup Generated', timestamp],
    ['Local Time (Tehran)', localTime],
    ['Description', PROJECT_INFO.description],
  ];
  for (const [k, v] of infoLines) {
    doc.setFont('helvetica', 'bold');
    doc.text(k + ':', MARGIN, y);
    doc.setFont('helvetica', 'normal');
    doc.text(v, MARGIN + 45, y);
    y += 5;
  }

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('DOCUMENT CONTENTS', MARGIN, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const sections = [
    '1. Technology Stack',
    '2. System Architecture Map',
    '3. Folder Structure',
    '4. React Router Routes',
    '5. Database Schema (Live from Supabase)',
    '6. Security Model',
    '7. Base44 Dependencies & Separation Plan',
    '8. Financial Logic',
    '9. External Dependencies',
    '10. Reconstruction Guide',
    '11. AI Prompt for Emergency Rebuild',
    '12. Project Status Snapshot',
  ];
  for (const s of sections) {
    doc.text(s, MARGIN + 5, y);
    y += 5;
  }

  // ── SECTION 1: Technology Stack ──
  y = addHeader(doc, '1. TECHNOLOGY STACK', 20);
  const techRows = TECH_STACK.map(([k, v]) => [k, v]);
  y = addTable(doc, ['Component', 'Technology / Version'], techRows, y, [60, MAX_W - 60]);

  y = addSubHeader(doc, 'package.json (key dependencies)', y);
  y = addMono(doc, `@base44/sdk ^0.8.57, @base44/vite-plugin ^1.0.47
@supabase/supabase-js ^2.109.0, react ^18.2.0, react-dom ^18.2.0
react-router-dom ^6.26.0, @tanstack/react-query ^5.84.1
tailwindcss ^3.4.17, tailwindcss-animate ^1.0.7
@radix-ui/* (all components), lucide-react ^0.475.0
recharts ^2.15.4, framer-motion ^11.16.4
react-hook-form ^7.54.2, zod ^3.24.2, date-fns ^3.6.0
jspdf ^4.2.1, html2canvas ^1.4.1, three ^0.171.0
react-leaflet ^4.2.1, @hello-pangea/dnd ^17.0.0
vite ^6.1.0, @vitejs/plugin-react ^4.3.4
@stripe/react-stripe-js ^3.0.0, @stripe/stripe-js ^5.2.0
canvas-confetti ^1.9.4, sonner ^2.0.1, vaul ^1.1.2
cmdk ^1.0.0, input-otp ^1.4.2, react-resizable-panels ^2.1.7
archiver ^7.0.1, pg ^8.23.1, playwright ^1.63.0
react-markdown ^9.0.1, react-quill ^2.0.0, lodash ^4.17.21
next-themes ^0.4.4, react-hot-toast ^2.6.0, moment ^2.30.1`, y);

  // ── SECTION 2: Architecture Map ──
  y = addHeader(doc, '2. SYSTEM ARCHITECTURE MAP', y);
  y = addMono(doc, `
+--------------------------+
|     FRONTEND (React)     |
|  Vite + Tailwind + shadcn|
|  React Router + Query     |
+------------+-------------+
             |
             v
+--------------------------+
|   API LAYER (fetch)      |
|  src/lib/supabaseApi.js  |
|  src/lib/ledgerApi.js    |
|  src/lib/useSarraaf.js   |
+------------+-------------+
             |
             v
+--------------------------+
|  BACKEND FUNCTION (Deno)  |
|  base44/functions/supabase|
|  /entry.ts (~2000 lines) |
|  Actions: login, crud,   |
|  postDocument, etc.      |
+------------+-------------+
             |
             v
+--------------------------+
|    SUPABASE (PostgreSQL) |
|  Tables + Views + RPC    |
|  RLS + Storage + Auth    |
+--------------------------+

DATA FLOW:
  User Action (React)
    -> useSarraaf hook (React Query)
      -> callSupabase(action, payload)
        -> POST /functions/supabase
          -> entry.ts (Deno)
            -> Supabase Client (service role)
              -> PostgreSQL

AUTH FLOW:
  Login -> entry.ts -> verifyPassword (PBKDF2)
    -> signToken (HMAC-SHA256) -> return to frontend
    -> stored in localStorage as 'auth_token'
    -> sent with every request as 'auth_token'

TENANT ISOLATION:
  exchange role -> filter by exchange_code
  customer role -> filter by user_id / mobile
  creator role -> full access (all exchanges)

FINANCIAL FLOW:
  User form -> usePostDocument mutation
    -> postDocument (ledgerApi.js)
      -> callSupabase('postDocument', {...})
        -> entry.ts: validates double-entry balance
          -> inserts document + ledger_entries atomically
            -> balances available via SQL views`, y);

  // ── SECTION 3: Folder Structure ──
  y = addHeader(doc, '3. FOLDER STRUCTURE', y);
  y = addMono(doc, FOLDER_STRUCTURE, y);

  // ── SECTION 4: Routes ──
  y = addHeader(doc, '4. REACT ROUTER ROUTES', y);
  const routeRows = ROUTES.map(([path, component, access]) => [path, component, access]);
  y = addTable(doc, ['Path', 'Component', 'Access Level'], routeRows, y, [55, 55, MAX_W - 110]);

  // ── SECTION 5: Database Schema ──
  y = addHeader(doc, '5. DATABASE SCHEMA (LIVE FROM SUPABASE)', y);

  if (schema) {
    y = addSubHeader(doc, `Tables: ${schema.tables?.length || 0} | Views: ${schema.views?.length || 0} | Functions: ${schema.functions?.length || 0} | Policies: ${schema.policies?.length || 0}`, y);

    // Group columns by table
    const tableCols = {};
    for (const col of (schema.columns || [])) {
      if (!tableCols[col.table_name]) tableCols[col.table_name] = [];
      tableCols[col.table_name].push(col);
    }

    y = addSubHeader(doc, 'TABLES & COLUMNS', y);
    for (const table of (schema.tables || [])) {
      const tn = table.table_name;
      const count = schema.tableCounts?.[tn] ?? '?';
      const cols = tableCols[tn] || [];
      y = addSubHeader(doc, `${tn} (${count} rows, type: ${table.table_type})`, y);
      const colRows = cols.map(c => [
        c.column_name,
        c.data_type,
        c.is_nullable === 'YES' ? 'NULL' : 'NOT NULL',
        (c.column_default || '').substring(0, 30),
      ]);
      if (colRows.length > 0) {
        y = addTable(doc, ['Column', 'Type', 'Nullable', 'Default'], colRows, y, [45, 40, 25, MAX_W - 110]);
      } else {
        y = addText(doc, '(no columns found)', MARGIN + 5, y, 8);
      }
    }

    // Views
    if (schema.views?.length > 0) {
      y = addSubHeader(doc, 'VIEWS', y);
      for (const v of schema.views) {
        y = addSubHeader(doc, v.table_name, y);
        const def = (v.definition || '').substring(0, 500);
        y = addMono(doc, def, y, 7);
      }
    }

    // Functions
    if (schema.functions?.length > 0) {
      y = addSubHeader(doc, 'FUNCTIONS / RPC', y);
      const fnRows = schema.functions.map(f => [f.routine_name, f.routine_type || '', (f.data_type || '').substring(0, 20)]);
      y = addTable(doc, ['Name', 'Type', 'Returns'], fnRows, y, [70, 35, MAX_W - 105]);
    }

    // Indexes
    if (schema.indexes?.length > 0) {
      y = addSubHeader(doc, 'INDEXES', y);
      const idxRows = schema.indexes.map(i => [i.tablename, i.indexname, (i.indexdef || '').substring(0, 80)]);
      y = addTable(doc, ['Table', 'Index Name', 'Definition'], idxRows, y, [35, 45, MAX_W - 80]);
    }

    // RLS Policies
    if (schema.policies?.length > 0) {
      y = addSubHeader(doc, 'RLS POLICIES', y);
      const polRows = schema.policies.map(p => [p.tablename, p.policyname, p.cmd, (p.qual || '').substring(0, 50)]);
      y = addTable(doc, ['Table', 'Policy', 'Command', 'Using (qual)'], polRows, y, [35, 45, 20, MAX_W - 100]);
    }

    // Constraints
    if (schema.constraints?.length > 0) {
      y = addSubHeader(doc, 'CONSTRAINTS', y);
      const conRows = schema.constraints.map(c => [c.table_name, c.constraint_name, c.constraint_type]);
      y = addTable(doc, ['Table', 'Constraint', 'Type'], conRows, y, [50, 60, MAX_W - 110]);
    }
  } else {
    y = addText(doc, 'Database schema could not be retrieved. Run getDatabaseSchema action to populate this section.', MARGIN, y, 10);
  }

  // ── SECTION 6: Security Model ──
  y = addHeader(doc, '6. SECURITY MODEL', y);
  y = addMono(doc, SECURITY_MODEL, y);

  // ── SECTION 7: Base44 Dependencies ──
  y = addHeader(doc, '7. BASE44 DEPENDENCIES & SEPARATION PLAN', y);
  y = addMono(doc, BASE44_DEPS, y);

  // ── SECTION 8: Financial Logic ──
  y = addHeader(doc, '8. FINANCIAL LOGIC', y);
  y = addMono(doc, FINANCIAL_LOGIC, y);

  // ── SECTION 9: External Dependencies ──
  y = addHeader(doc, '9. EXTERNAL DEPENDENCIES', y);
  const extDeps = [
    ['Supabase (PostgreSQL)', 'Database, Storage, Auth OTP', 'SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_KEY', 'Critical - primary data store'],
    ['Google OAuth', 'Google login for sarraaf & customers', 'Google Client ID (in frontend)', 'Optional - password login works without it'],
    ['Stripe', 'Online payment gateway', 'Stripe API keys (not configured)', 'Disabled - not in use'],
    ['Base44 Platform', 'Hosting, build, deploy, SDK', 'BASE44_APP_ID', 'Can be replaced - see Separation Plan'],
  ];
  y = addTable(doc, ['Service', 'Usage', 'Secrets Needed', 'Status'], extDeps, y, [40, 50, 45, MAX_W - 135]);

  // ── SECTION 10: Reconstruction Guide ──
  y = addHeader(doc, '10. RECONSTRUCTION GUIDE', y);
  y = addMono(doc, RECONSTRUCTION_GUIDE, y);

  // ── SECTION 11: AI Prompt ──
  y = addHeader(doc, '11. AI PROMPT FOR EMERGENCY REBUILD', y);
  y = addMono(doc, AI_PROMPT, y);

  // ── SECTION 12: Project Status ──
  y = addHeader(doc, '12. PROJECT STATUS SNAPSHOT', y);
  const statusRows = [
    ['Backup Timestamp', timestamp],
    ['Local Time (Tehran)', localTime],
    ['Frontend Pages', String(ROUTES.length)],
    ['Database Tables', String(schema?.tables?.length || 'N/A')],
    ['Database Views', String(schema?.views?.length || 'N/A')],
    ['Database Functions', String(schema?.functions?.length || 'N/A')],
    ['RLS Policies', String(schema?.policies?.length || 'N/A')],
    ['Indexes', String(schema?.indexes?.length || 'N/A')],
    ['Constraints', String(schema?.constraints?.length || 'N/A')],
    ['Backend Actions', 'login, registerCustomer, registerExchange, googleLogin, linkGoogleAccount, auth_signup, auth_verifyOtp, auth_resend, auth_recover, auth_updateUser, auth_signOut, logout, changePassword, listUsers, listExchanges, createExchange, crud, uploadFile, createPaymentIntent, verifyPayment, listGateways, saveGateway, toggleGateway, listPaymentTransactions, support_createTicket, support_listTickets, support_updateTicketStatus, support_addMessage, support_listMessages, support_reportError, support_listErrors, support_submitFeedback, support_listFeedback, postDocument, postTransfer, reverseDocument, editDocument, getBalances, listDocuments, getMyExchange, listTransactions, getDatabaseSchema'],
    ['Auth Structure', 'Structure A (current): Google OAuth via Base44 platform + HMAC + PBKDF2'],
    ['Backup Before Change', 'Structure A snapshot saved — rollback point established'],
    ['Connected Services', 'Supabase, Base44 (hosting)'],
    ['Base44 Dependencies', '@base44/sdk, @base44/vite-plugin (see Section 7)'],
    ['Known Issues', 'See long_term_project_summary in conversation context'],
    ['Payment Gateway', 'Disabled (feature in "updating" status)'],
    ['Auth Methods', 'Password (PBKDF2), Google OAuth, Email OTP'],
  ];
  y = addTable(doc, ['Property', 'Value'], statusRows, y, [50, MAX_W - 50]);

  // ── Footer on every page ──
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Hesab Sarraf Emergency Backup | Generated: ${timestamp} | Page ${i} of ${pageCount}`, MARGIN, PAGE_H - 8);
    doc.setTextColor(0, 0, 0);
  }

  // ── Save ──
  const filename = `emergency-backup-${now.toISOString().split('T')[0]}-${now.getHours()}${now.getMinutes()}.pdf`;
  doc.save(filename);
  return filename;
}