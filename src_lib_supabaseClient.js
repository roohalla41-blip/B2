// supabaseClient.js — Direct Supabase client (no Base44 dependency)
//
// این کلاینت مستقیماً به Supabase متصل می‌شود و هیچ وابستگی به Base44 ندارد.
// از anon key (SUPABASE_KEY) استفاده می‌کند که در فرانت‌اند امن است.
// برای عملیات‌های مدیریتی (admin) از بک‌اند فانکشن استفاده می‌شود.
//
// Environment variables:
//   VITE_SUPABASE_URL  — آدرس پروژه Supabase
//   VITE_SUPABASE_KEY  — anon key (public)

import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './supabaseConfig';

// ── Custom fetch that injects the x-app-token header on every request ──
// Supabase JS v2 does NOT support global.headers as a function — only a static
// object.  A custom fetch is the correct way to send a dynamic header (the
// HMAC session token from localStorage) so RLS policies can read it.
function createAppFetch() {
  return async (url, options = {}) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        const headers = new Headers(options.headers || {});
        headers.set('x-app-token', token);
        options = { ...options, headers };
      }
    } catch { /* ignore */ }
    return fetch(url, options);
  };
}

// Lazy-initialize using centralized config (window.__SUPABASE_CONFIG__ + env fallback)
let _client = null;
let _configError = null;

function resolveConfig() {
  try {
    return getSupabaseConfig();
  } catch (e) {
    _configError = e;
    return null;
  }
}

export const supabase = new Proxy(
  {},
  {
    get(_target, prop) {
      if (!_client) {
        const cfg = resolveConfig();
        if (!cfg) {
          throw _configError || new Error('Supabase client not configured.');
        }
        _client = createClient(cfg.url, cfg.key, {
          auth: {
            persistSession: true,
            storageKey: 'supabase_auth_session',
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
          global: {
            fetch: createAppFetch(),
          },
        });
      }
      return _client[prop];
    },
  }
);

export function getSupabaseClient() {
  if (!_client) {
    const cfg = resolveConfig();
    if (!cfg) return null;
    _client = createClient(cfg.url, cfg.key, {
      auth: {
        persistSession: true,
        storageKey: 'supabase_auth_session',
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: {
        fetch: createAppFetch(),
      },
    });
  }
  return _client;
}

// نقشه‌ی نگاشت نام موجودیت Base44 → نام جدول Supabase
// این نقشه برای مهاجرت تدریجی استفاده می‌شود.
export const ENTITY_TABLE_MAP = {
  // موجودیت‌هایی که معادل مستقیم دارند
  Customer: 'customers',
  Transfer: 'transfers',
  Agent: 'origins',
  Currency: 'rates',
  BankAccount: 'bank_accounts',
  RateSetting: 'app_settings',
  FeatureSetting: 'feature_settings',
  SarraafProfile: 'exchanges',
  Safe: 'safes',
  AuditLog: 'audit_logs',
  AppSetting: 'app_settings',
  WalletTransaction: 'wallet_transactions',
  LedgerEntry: 'ledger_entries',
  OnlineOrder: 'charge_orders',
  Transaction: 'documents', // نیاز به تطبیق مدل داده
  Announcement: 'rules',

  // موجودیت‌هایی که معادل ندارند (نیاز به ایجاد جدول)
  AgencyLink: 'agency_links',
  ChatGroup: 'chat_groups',
  GroupMember: 'chat_group_members',
  GroupMessage: 'chat_messages',
  MessageReport: 'message_reports',
  UserNotification: 'user_notifications',
  UserPermission: 'user_permissions',
  PlanQuota: 'plan_quotas',
  PaymentRecord: 'payment_records',
  Wallet: 'wallets',
  WalletTopupRequest: 'wallet_topup_requests',
  WalletBan: 'wallet_bans',
  OnlineProduct: 'online_products',
  Seller: 'sellers',
  Package: 'packages',
  CustomerNotification: 'customer_notifications',
  CustomerTransferRequest: 'customer_transfer_requests',
  CustomerLink: 'customer_links',
  QuotaChangeLog: 'quota_change_logs',
  PricingPlan: 'pricing_plans',
  TextLabel: 'text_labels',
  BackupRecord: 'backup_records',
  // Support system
  SupportTicket: 'support_tickets',
  SupportMessage: 'support_messages',
  ErrorReport: 'error_reports',
  UserFeedback: 'user_feedback',
  // Payment gateway
  BankGateway: 'bank_gateways',
  PaymentTransaction: 'payment_transactions',
  // Wallet
  WalletWithdrawalRequest: 'wallet_withdrawal_requests',
  // Referral
  Referral: 'referrals',
  // Recharge orders (afghanfive manual flow)
  RechargeOrder: 'recharge_orders',
};

export default supabase;