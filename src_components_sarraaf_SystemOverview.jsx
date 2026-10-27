import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { pingSupabase, countTables, hasSupabaseSession } from '@/lib/supabaseHealth';
import {
  Database, CheckCircle2, XCircle, HardDrive, Table, Activity,
  Server, Cloud, AlertTriangle, Loader2, RefreshCw, Box, Clock
} from 'lucide-react';

// تمام موجودیت‌های سیستم برای شمارش رکوردها
const ALL_ENTITIES = [
  { name: 'Transaction', label: 'تراکنش‌ها', table: 'documents', icon: Activity },
  { name: 'Transfer', label: 'حواله‌ها', table: 'transfers', icon: Box },
  { name: 'Customer', label: 'مشتریان', table: 'customers', icon: Box },
  { name: 'Agent', label: 'نمایندگی‌ها', table: 'agents', icon: Box },
  { name: 'Currency', label: 'ارزها', table: 'currencies', icon: Box },
  { name: 'BankAccount', label: 'حساب‌های بانکی', table: 'bank_accounts', icon: Box },
  { name: 'RateSetting', label: 'تنظیمات نرخ', table: 'rate_settings', icon: Box },
  { name: 'FeatureSetting', label: 'تنظیمات بخش‌ها', table: 'feature_settings', icon: Box },
  { name: 'SarraafProfile', label: 'پروفایل صراف‌ها', table: 'exchanges', icon: Box },
  { name: 'AgencyLink', label: 'لینک‌های نمایندگی', table: 'agency_links', icon: Box },
  { name: 'AuditLog', label: 'لاگ‌های ممیزی', table: 'audit_logs', icon: Box },
  { name: 'ChatGroup', label: 'گروه‌های چت', table: 'chat_groups', icon: Box },
  { name: 'GroupMember', label: 'اعضای گروه', table: 'group_members', icon: Box },
  { name: 'GroupMessage', label: 'پیام‌های گروه', table: 'group_messages', icon: Box },
  { name: 'MessageReport', label: 'گزارش پیام‌ها', table: 'message_reports', icon: Box },
  { name: 'UserNotification', label: 'اعلان‌های کاربر', table: 'user_notifications', icon: Box },
  { name: 'UserPermission', label: 'مجوزهای کاربر', table: 'user_permissions', icon: Box },
  { name: 'PlanQuota', label: 'سهمیه پلن', table: 'plan_quotas', icon: Box },
  { name: 'PaymentRecord', label: 'رکوردهای پرداخت', table: 'payment_records', icon: Box },
  { name: 'Wallet', label: 'کیف پول‌ها', table: 'wallets', icon: Box },
  { name: 'WalletTransaction', label: 'تراکنش‌های کیف پول', table: 'wallet_transactions', icon: Box },
  { name: 'WalletTopupRequest', label: 'درخواست‌های شارژ', table: 'wallet_topup_requests', icon: Box },
  { name: 'WalletBan', label: 'مسدودی کیف پول', table: 'wallet_bans', icon: Box },
  { name: 'LedgerEntry', label: 'ثبت‌های دفتر کل', table: 'ledger_entries', icon: Box },
  { name: 'OnlineOrder', label: 'سفارش‌های آنلاین', table: 'charge_orders', icon: Box },
  { name: 'OnlineProduct', label: 'محصولات آنلاین', table: 'online_products', icon: Box },
  { name: 'Seller', label: 'فروشندگان', table: 'sellers', icon: Box },
  { name: 'Package', label: 'بسته‌ها', table: 'packages', icon: Box },
  { name: 'CustomerNotification', label: 'اعلان‌های مشتری', table: 'customer_notifications', icon: Box },
  { name: 'CustomerTransferRequest', label: 'درخواست حواله مشتری', table: 'customer_transfer_requests', icon: Box },
  { name: 'CustomerLink', label: 'لینک‌های مشتری', table: 'customer_links', icon: Box },
  { name: 'Announcement', label: 'اطلاعیه‌ها', table: 'announcements', icon: Box },
  { name: 'QuotaChangeLog', label: 'لاگ تغییر سهمیه', table: 'quota_change_logs', icon: Box },
  { name: 'PricingPlan', label: 'پلن‌های قیمت‌گذاری', table: 'pricing_plans', icon: Box },
  { name: 'AppSetting', label: 'تنظیمات برنامه', table: 'app_settings', icon: Box },
  { name: 'TextLabel', label: 'برچسب‌های متنی', table: 'text_labels', icon: Box },
  { name: 'BackupRecord', label: 'رکوردهای بکاپ', table: 'backup_records', icon: Box },
];

// محاسبه فضای مصرفی localStorage
function getStorageInfo() {
  let total = 0;
  const breakdown = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key) || '';
    const size = new Blob([value]).size;
    total += size;
    breakdown.push({ key, size });
  }
  breakdown.sort((a, b) => b.size - a.size);
  return { total, breakdown };
}

function formatBytes(bytes) {
  if (bytes === 0) return '۰ بایت';
  if (bytes < 1024) return `${bytes.toLocaleString('fa-IR')} بایت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).toLocaleString('fa-IR')} کیلوبایت`;
  return `${(bytes / (1024 * 1024)).toFixed(2).toLocaleString('fa-IR')} مگابایت`;
}

function toFaNum(n) {
  return Number(n || 0).toLocaleString('fa-IR');
}

export default function SystemOverview() {
  const [connectionStatus, setConnectionStatus] = useState('checking'); // checking | connected | disconnected
  const [connectionError, setConnectionError] = useState(null);
  const [authMode, setAuthMode] = useState('local'); // local | supabase
  const [syncPending, setSyncPending] = useState(0);
  const [entityCounts, setEntityCounts] = useState({});
  const [storageInfo, setStorageInfo] = useState({ total: 0, breakdown: [] });
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      // 1. تست اتصال — مستقیم به Supabase (بدون توابع Base44)
      const ping = await pingSupabase();
      if (!cancelled) {
        setConnectionStatus(ping.connected ? 'connected' : 'disconnected');
        setConnectionError(ping.error);
      }

      // 1b. بررسی وضعیت احراز هویت — نشست Supabase Auth یا توکن قدیمی
      const hasSession = await hasSupabaseSession();
      if (!cancelled) {
        const hasToken = !!localStorage.getItem('auth_token');
        setAuthMode(hasSession || hasToken ? 'supabase' : 'local');
      }

      // 1c. تعداد عملیات در انتظار همگام‌سازی
      try {
        const { getPendingCount } = await import('@/lib/offlineQueue');
        if (!cancelled) setSyncPending(getPendingCount());
      } catch {
        if (!cancelled) setSyncPending(0);
      }

      // 2. شمارش رکوردهای هر جدول — مستقیم از Supabase (فقط count، بدون بارگذاری رکوردها)
      const counts = await countTables(ALL_ENTITIES.map(e => ({ name: e.name, table: e.table || e.name })));
      if (!cancelled) setEntityCounts(counts);

      // 3. فضای ذخیره‌سازی
      if (!cancelled) setStorageInfo(getStorageInfo());

      if (!cancelled) setLoading(false);
    }

    loadData();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const totalRecords = Object.values(entityCounts).reduce((a, b) => a + b, 0);
  const topStorageItems = storageInfo.breakdown.slice(0, 10);

  return (
    <div className="space-y-4">
      {/* نوار ابزار */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          نمای کلی سیستم
        </h3>
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          disabled={loading}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          به‌روزرسانی
        </button>
      </div>

      {/* وضعیت اپلیکیشن */}
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-green-900">اتصال به Supabase</p>
              <p className="text-xs text-green-700 mt-1">
                تمام داده‌ها به‌صورت آنلاین در Supabase ذخیره و پردازش می‌شوند.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* وضعیت اتصال Supabase */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                connectionStatus === 'connected' ? 'bg-green-100' :
                connectionStatus === 'disconnected' ? 'bg-red-100' : 'bg-muted'
              }`}>
                {connectionStatus === 'checking' ? (
                  <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                ) : connectionStatus === 'connected' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold">اتصال به Supabase</p>
                <p className="text-xs text-muted-foreground">
                  {connectionStatus === 'connected' ? 'برقرار است ✓' :
                   connectionStatus === 'disconnected' ? 'قطع شده' :
                   'در حال بررسی...'}
                </p>
                {connectionError && (
                  <p className="text-[10px] text-red-500 mt-0.5">{connectionError}</p>
                )}
              </div>
            </div>
            <div className="text-left">
              <p className="text-xs text-muted-foreground">پلن</p>
              <p className="text-sm font-bold text-green-600">رایگان (Free Tier)</p>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-2 text-center">
            <div>
              <Cloud className="w-4 h-4 mx-auto text-green-500 mb-1" />
              <p className="text-[10px] text-muted-foreground">دیتابیس</p>
              <p className={`text-xs font-bold ${connectionStatus === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                {connectionStatus === 'connected' ? 'آنلاین' : 'آفلاین'}
              </p>
            </div>
            <div>
              <Server className="w-4 h-4 mx-auto text-blue-500 mb-1" />
              <p className="text-[10px] text-muted-foreground">احراز هویت</p>
              <p className={`text-xs font-bold ${authMode === 'supabase' ? 'text-green-600' : 'text-blue-600'}`}>
                {authMode === 'supabase' ? 'آنلاین' : 'محلی'}
              </p>
            </div>
            <div>
              <Clock className="w-4 h-4 mx-auto text-amber-500 mb-1" />
              <p className="text-[10px] text-muted-foreground">در انتظار همگام‌سازی</p>
              <p className={`text-xs font-bold ${syncPending > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {toFaNum(syncPending)} عملیات
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* فضای ذخیره‌سازی */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <HardDrive className="w-4 h-4 text-blue-500" />
            <h4 className="text-sm font-bold">فضای ذخیره‌سازی محلی</h4>
          </div>

          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">فضای مصرف‌شده</span>
            <span className="text-sm font-bold text-blue-600">{formatBytes(storageInfo.total)}</span>
          </div>

          <div className="w-full h-2 rounded-full bg-muted overflow-hidden mb-1">
            <div
              className="h-full bg-gradient-to-l from-blue-500 to-blue-400 rounded-full transition-all"
              style={{ width: `${Math.min(100, (storageInfo.total / (5 * 1024 * 1024)) * 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground text-left">از ۵ مگابایت localStorage</p>

          {/* جدول بزرگترین مصرف‌کننده‌ها */}
          {topStorageItems.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground mb-1">بزرگ‌ترین داده‌های ذخیره‌شده:</p>
              {topStorageItems.map(item => (
                <div key={item.key} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-muted/40">
                  <span className="truncate max-w-[60%] text-muted-foreground" dir="ltr">{item.key}</span>
                  <span className="font-medium text-blue-600">{formatBytes(item.size)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* آمار رکوردها */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Table className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-bold">آمار رکوردها</h4>
            </div>
            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">
              مجموع: {toFaNum(totalRecords)} رکورد
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {ALL_ENTITIES.map(entity => {
              const count = entityCounts[entity.name] || 0;
              return (
                <div
                  key={entity.name}
                  className={`flex items-center justify-between p-2 rounded-lg border ${
                    count > 0 ? 'border-green-200 bg-green-50/30' : 'border-muted bg-muted/20'
                  }`}
                >
                  <span className="text-xs text-muted-foreground truncate">{entity.label}</span>
                  <span className={`text-xs font-bold ${count > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {toFaNum(count)}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}