# Supabase Structure — حساب صراف

## Connection
- **URL:** Set via `VITE_SUPABASE_URL` (frontend) / `SUPABASE_URL` (backend)
- **Anon Key:** `VITE_SUPABASE_KEY` (public, RLS-protected)
- **Service Key:** `SUPABASE_SERVICE_KEY` (server-side, bypasses RLS)

## Tables (54+)
users, exchanges, customers, documents, transfers, conversions,
treasury_transactions, bank_accounts, bank_transactions, journal_entries,
ledger_entries, rates, idempotency_keys, employees, origins, safes,
rules, feature_settings, app_settings, audit_logs, wallet_transactions,
charge_orders, online_requests, online_products, wallets,
wallet_withdrawal_requests, wallet_topup_requests, wallet_bans,
customer_notifications, customer_transfer_requests, customer_links,
email_otps, user_notifications, user_permissions, user_feedback,
support_tickets, support_messages, error_reports, bank_gateways,
payment_transactions, chat_groups, chat_group_members, chat_messages,
message_reports, sellers, packages, pricing_plans, plan_quotas,
quota_change_logs, referrals, agency_links, backup_records,
rate_settings, text_labels

## Views (9)
- v_treasury_balances
- v_bank_balances
- v_customer_balances
- v_wallet_balances
- v_agent_balances
- v_profit_loss
- v_currency_balances
- v_exchange_summary
- v_transactions

## RPC Functions (4)
- `post_transfer_transaction` — Atomic transfer posting
- `reverse_document_transaction` — Document reversal
- `edit_document_transaction` — Document edit (soft-delete + insert)
- `get_account_balance` — Single account balance query

## RLS Policies
- **Public (read-only):** rules, feature_settings, pricing_plans, online_products
- **Tenant-scoped:** All other tables — DENY ALL for anon/authenticated
- **Service Role:** Bypasses RLS (backend only)

## Auth Structure
- Custom HMAC-SHA256 session tokens (12h TTL)
- PBKDF2 password hashing (100k iterations, SHA-256)
- Rate limiting (5 fails / 15 min = lockout)
- Google OAuth: creates customer with placeholder mobile
- Supabase Auth OTP: email verification only

## Storage
- **Bucket:** public (publicly readable)
- **Path:** receipts/<timestamp>_<filename>
- **Used for:** Receipt uploads

## Environment Variables (names only)
- Frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`
- Backend: `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_KEY`
- Creator: `CREATOR_EMAIL`, `CREATOR_PASSWORD`

## Notes
- Schema SQL: `base44/shared/supabase_schema.sql`
- RLS SQL: `base44/shared/rls_policies.sql`
- No secrets are included in this document.
