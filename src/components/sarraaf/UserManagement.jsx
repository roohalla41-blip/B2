import React, { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAllSarraafProfiles, useAllCustomers, useAllCustomerUsers, useAllTransactions, useAllMessages, useAllCustomerNotifications, useActivatePaidPlan, useExpirePaidPlan, useUpdateSarraafProfile } from '@/lib/useAdmin';
import { getPlanStatus, getPlanDisplay } from '@/lib/permissions';
import { useAuth } from '@/lib/AuthContext';
import { callSupabase, createSupabaseEntity } from '@/lib/supabaseApi';
import { RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Search, Crown, Clock, UserX, UserCheck, Users, Activity, MessageSquare, Store, UserPlus, KeyRound, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { generateUniqueInviteCode } from '@/lib/referralSystem';
import { creatorCreateExchange } from '@/lib/directAuth';
import { formatUserIdentifier } from '@/lib/utils';
import InviteCodeManager from './InviteCodeManager';

// ── Sync users from Supabase server — reads directly from Supabase tables ──
// Creates SarraafProfile for sarraaf users and Customer for customer users
// that exist on the server but don't have local records yet.
export async function syncUsersFromServer() {
  const { supabase } = await import('@/lib/supabaseClient');
  const [usersRes, exchangesRes] = await Promise.all([
    supabase.from('users').select('*').order('created_at', { ascending: false }).limit(500),
    supabase.from('exchanges').select('*').order('created_at', { ascending: false }).limit(500),
  ]);
  if (usersRes.error) throw new Error(usersRes.error.message || 'خطا در خواندن جدول کاربران');
  if (exchangesRes.error) throw new Error(exchangesRes.error.message || 'خطا در خواندن جدول صرافی‌ها');
  const users = usersRes.data || [];
  const exchanges = exchangesRes.data || [];

  // Read existing records from Supabase (not offlineDB) so the list stays in sync
  const sbSarraafProfile = createSupabaseEntity('SarraafProfile');
  const sbCustomer = createSupabaseEntity('Customer');
  const existingProfiles = await sbSarraafProfile.list('-created_date', 500);
  const existingCustomers = await sbCustomer.list('-created_date', 500);
  const profileUserIds = new Set(existingProfiles.map(p => String(p.user_id || '')));
  const profileEmails = new Set(existingProfiles.map(p => (p.email || '').toLowerCase()).filter(Boolean));
  const customerPhones = new Set(existingCustomers.map(c => (c.phone || '').trim()));

  let created = 0;

  // 1) Sync from Supabase users table
  for (const u of users) {
    const uid = String(u.id || '');
    const role = u.role || '';
    const email = (u.email || '').toLowerCase();
    // Sarraaf users — create SarraafProfile in Supabase if missing (also check by email for Gmail users)
    if ((role === 'exchange' || role === 'sarraaf') && !profileUserIds.has(uid) && !(email && profileEmails.has(email))) {
      const ex = exchanges.find(e => String(e.user_id || '') === uid) || exchanges.find(e => e.exchange_name && u.full_name && u.full_name.includes(e.exchange_name));
      try {
        const inviteCode = await generateUniqueInviteCode('SR');
        await sbSarraafProfile.create({
          code: ex?.exchange_code || `EX-${uid.slice(-5)}`,
          user_id: uid,
          email: u.email || '',
          name: u.full_name || u.username || 'صراف',
          phone: u.mobile || '',
          plan: 'free',
          quota_limit: 100,
          quota_used: 0,
          payment_status: 'none',
          status: u.status === 'suspended' ? 'suspended' : 'active',
          last_login: u.last_login || u.created_date || new Date().toISOString(),
          referral_enabled: true,
          referral_code: inviteCode,
        });
        created++;
      } catch { /* ignore individual failures */ }
    }
    // Customer users — create Customer in Supabase if missing
    // Detect the sarraaf's exchange_code from the user's created_by_id
    if (role === 'customer' && u.mobile && !customerPhones.has(u.mobile.trim())) {
      try {
        // Find the sarraaf who created this customer (by created_by_id → exchange)
        let customerExchangeCode = '';
        if (u.created_by_id) {
          const exMatch = exchanges.find(e => String(e.user_id || '') === String(u.created_by_id));
          if (exMatch?.exchange_code) customerExchangeCode = exMatch.exchange_code;
        }
        await sbCustomer.create({
          name: u.full_name || 'مشتری',
          phone: u.mobile,
          code: `CUS-${uid.slice(-6)}`,
          status: u.status === 'active' ? 'active' : 'inactive',
          customer_type: 'permanent',
          exchange_code: customerExchangeCode || undefined,
          notes: `همگام‌سازی از سرور — ${new Date().toLocaleDateString('fa-IR')}`,
        });
        created++;
      } catch { /* ignore individual failures */ }
    }
  }

  return { created };
}

function toFa(n) {
  return Number(n || 0).toLocaleString('fa-IR');
}

// ── Merge customers from users table and customers table, deduplicated ──
// Stable identity: phone (normalized) → email (normalized) → fallback to table-id.
// Matching records are merged: missing fields are filled from the other source.
export function mergeCustomers(tableCustomers = [], userCustomers = []) {
  const merged = [];
  const phoneMap = new Map();
  const emailMap = new Map();
  const norm = (s) => (s || '').trim().toLowerCase();

  for (const c of [...tableCustomers, ...userCustomers]) {
    const phone = norm(c.phone);
    const email = norm(c.email);

    let idx = -1;
    if (phone && phoneMap.has(phone)) idx = phoneMap.get(phone);
    else if (email && emailMap.has(email)) idx = emailMap.get(email);

    if (idx >= 0) {
      const ex = merged[idx];
      if (!ex.exchange_code && c.exchange_code) ex.exchange_code = c.exchange_code;
      if (!ex.created_by_id && c.created_by_id) ex.created_by_id = c.created_by_id;
      if (!ex.email && c.email) ex.email = c.email;
      if (!ex.username && c.username) ex.username = c.username;
    } else {
      merged.push({ ...c });
      const i = merged.length - 1;
      if (phone) phoneMap.set(phone, i);
      if (email) emailMap.set(email, i);
    }
  }

  return merged;
}

// ── Build sarraaf → customers map (deduplicated per sarraaf) ──
// A customer is linked to a sarraaf via exchange_code (→ sarraaf.code)
// or created_by_id (→ sarraaf.user_id). Each customer appears at most once
// per sarraaf entry.
export function buildSarraafCustomersMap(customers = []) {
  const map = {};
  for (const c of customers) {
    const ec = c.exchange_code || '';
    const cb = c.created_by_id || '';
    if (ec) {
      if (!map[ec]) map[ec] = [];
      if (!map[ec].some(x => x.id === c.id)) map[ec].push(c);
    }
    if (cb) {
      if (!map[cb]) map[cb] = [];
      if (!map[cb].some(x => x.id === c.id)) map[cb].push(c);
    }
  }
  return map;
}

export default function UserManagement() {
  const { user } = useAuth();
  const { data: profiles, isLoading: loadingSarraaf, error: sarraafErr } = useAllSarraafProfiles();
  const { data: customersFromTable, isLoading: loadingCustomer, error: customerErr } = useAllCustomers();
  const { data: customerUsers, isLoading: loadingCustomerUsers, error: customerUsersErr } = useAllCustomerUsers();

  // ادغام مشتریان از جدول users و customers (بدون تکرار)
  const customers = useMemo(
    () => mergeCustomers(customersFromTable, customerUsers),
    [customersFromTable, customerUsers]
  );
  const customerError = customerUsersErr || customerErr;
  const { data: transactions } = useAllTransactions();
  const { data: messages } = useAllMessages();
  const { data: customerNotifications } = useAllCustomerNotifications();
  const activateMut = useActivatePaidPlan();
  const expireMut = useExpirePaidPlan();
  const updateMut = useUpdateSarraafProfile();

  const [tab, setTab] = useState('sarraaf');
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [expandedSarraaf, setExpandedSarraaf] = useState(null);
  const [editProfile, setEditProfile] = useState(null);
  const [planForm, setPlanForm] = useState({ plan: 'pro', startDate: '', endDate: '', durationMonths: 1 });
  const [syncing, setSyncing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ exchange_name: '', full_name: '', mobile: '', username: '', password: '', email: '', country: '', city: '' });
  const [showReset, setShowReset] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetPreview, setResetPreview] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetDone, setResetDone] = useState(null);
  const qc = useQueryClient();

  // Build usage stats map: user_id OR exchange_code → { txCount, msgCount, custCount }
  const usageMap = useMemo(() => {
    const map = {};
    // Transactions keyed by user_id
    for (const tx of (transactions || [])) {
      const uid = tx.created_by_id || tx.customer_id || '';
      if (uid) {
        if (!map[uid]) map[uid] = { txCount: 0, msgCount: 0, custCount: 0 };
        map[uid].txCount++;
      }
    }
    // Group messages keyed by sender_id (user_id)
    for (const msg of (messages || [])) {
      const uid = msg.sender_id || '';
      if (uid) {
        if (!map[uid]) map[uid] = { txCount: 0, msgCount: 0, custCount: 0 };
        map[uid].msgCount++;
      }
    }
    // Customer notifications (SMS) keyed by exchange_code
    for (const notif of (customerNotifications || [])) {
      const ec = notif.exchange_code || '';
      if (ec) {
        if (!map[ec]) map[ec] = { txCount: 0, msgCount: 0, custCount: 0 };
        map[ec].msgCount++;
      }
    }
    // Customers keyed by exchange_code
    for (const c of (customers || [])) {
      const ec = c.exchange_code || '';
      if (ec) {
        if (!map[ec]) map[ec] = { txCount: 0, msgCount: 0, custCount: 0 };
        map[ec].custCount++;
      }
    }
    return map;
  }, [transactions, messages, customerNotifications, customers]);

  const filteredSarraaf = useMemo(() => {
    let list = profiles || [];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(p =>
        (p.name || '').toLowerCase().includes(s) ||
        (p.code || '').toLowerCase().includes(s) ||
        (p.phone || '').includes(s)
      );
    }
    if (filterPlan !== 'all') {
      list = list.filter(p => getPlanStatus(p) === filterPlan);
    }
    return list;
  }, [profiles, search, filterPlan]);

  // Only independent customer-panel accounts (not registered under a sarraaf)
  const independentCustomers = useMemo(() => {
    const list = customers || [];
    return list.filter(c => !c.exchange_code && !c.created_by_id);
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    let list = independentCustomers;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(c =>
        (c.name || '').toLowerCase().includes(s) ||
        (c.phone || '').includes(s) ||
        (c.code || '').toLowerCase().includes(s)
      );
    }
    return list;
  }, [independentCustomers, search]);

  const openActivate = (profile) => {
    setEditProfile(profile);
    const today = new Date().toISOString().slice(0, 10);
    const end = new Date();
    end.setFullYear(end.getFullYear() + 1);
    end.setDate(end.getDate() - 1);
    setPlanForm({ plan: 'pro', startDate: today, endDate: end.toISOString().slice(0, 10), durationMonths: 12 });
  };

  const handleDurationChange = (months) => {
    const start = new Date(planForm.startDate || new Date().toISOString().slice(0, 10));
    const end = new Date(start);
    end.setMonth(end.getMonth() + months);
    end.setDate(end.getDate() - 1);
    setPlanForm({ ...planForm, durationMonths: months, endDate: end.toISOString().slice(0, 10) });
  };

  const handleActivate = async () => {
    if (!editProfile) return;
    try {
      await activateMut.mutateAsync({
        profile: editProfile,
        plan: planForm.plan,
        startDate: planForm.startDate,
        endDate: planForm.endDate,
        confirmedByName: user?.full_name || user?.email || 'مدیر سیستم',
      });
      toast({ title: 'فعال شد', description: 'نسخه پولی برای کاربر فعال شد' });
      setEditProfile(null);
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  const handleExpire = async (profile) => {
    if (!confirm(`پایان اعتبار نسخه پولی ${profile.name}؟`)) return;
    try {
      await expireMut.mutateAsync({
        profile,
        sentByName: user?.full_name || user?.email || 'مدیر سیستم',
      });
      toast({ title: 'منقضی شد', description: 'حساب کاربر به نسخه رایگان بازگشت' });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  const handleToggleStatus = async (profile) => {
    try {
      await updateMut.mutateAsync({
        id: profile.id,
        data: { status: profile.status === 'active' ? 'suspended' : 'active' },
      });
      toast({ title: 'تغییر وضعیت', description: profile.status === 'active' ? 'حساب معلق شد' : 'حساب فعال شد' });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  const handleCreateSarraaf = async () => {
    const f = createForm;
    if (!f.exchange_name || !f.full_name || !f.mobile || !f.username || !f.password) {
      toast({ title: 'خطا', description: 'نام صرافی، نام مسئول، موبایل، نام کاربری و رمز عبور الزامی است', variant: 'destructive' });
      return;
    }
    if (f.password.length < 8) {
      toast({ title: 'خطا', description: 'رمز عبور باید حداقل ۸ کاراکتر باشد', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const res = await creatorCreateExchange(f);
      if (!res?.success) {
        const msgs = {
          missing_fields: 'لطفاً تمام فیلدهای ضروری را پر کنید',
          mobile_exists: 'این شماره موبایل قبلاً ثبت شده است',
          username_exists: 'این نام کاربری قبلاً استفاده شده است',
          email_exists: 'این ایمیل قبلاً ثبت شده است',
          unauthorized: 'فقط سازنده می‌تواند حساب جدید ایجاد کند',
        };
        toast({ title: 'خطا', description: msgs[res?.error] || res?.error || 'خطا در ایجاد حساب', variant: 'destructive' });
        return;
      }
      // Create SarraafProfile in Supabase (direct, no Base44 SDK)
      try {
        const sbSarraaf = createSupabaseEntity('SarraafProfile');
        await sbSarraaf.create({
          code: res.exchange?.exchange_code || `EX-${Date.now()}`,
          user_id: String(res.user.id || ''),
          email: f.email || '',
          exchange_name: f.exchange_name,
          name: f.full_name,
          phone: f.mobile,
          plan: 'free',
          quota_limit: 100,
          quota_used: 0,
          payment_status: 'none',
          status: 'active',
          last_login: new Date().toISOString(),
          referral_enabled: true,
          referral_code: res.exchange?.referral_code || '',
        });
      } catch { /* non-critical */ }
      toast({ title: 'حساب ایجاد شد', description: `صراف ${f.exchange_name} با موفقیت ایجاد شد. کد صرافی: ${res.exchange?.exchange_code || ''}` });
      setCreateForm({ exchange_name: '', full_name: '', mobile: '', username: '', password: '', email: '', country: '', city: '' });
      setShowCreate(false);
      qc.invalidateQueries({ queryKey: ['allSarraafProfiles'] });
    } catch (err) {
      toast({ title: 'خطا', description: err.message || 'خطا در ایجاد حساب', variant: 'destructive' });
    }
    setCreating(false);
  };

  const handleSyncFromServer = async () => {
    setSyncing(true);
    try {
      const result = await syncUsersFromServer();
      toast({ title: 'همگام‌سازی شد', description: `${toFa(result.created)} کاربر جدید از سرور اضافه شد` });
      qc.invalidateQueries({ queryKey: ['allSarraafProfiles'] });
      qc.invalidateQueries({ queryKey: ['allCustomersAdmin'] });
    } catch (err) {
      toast({ title: 'خطا', description: err.message || 'همگام‌سازی ناموفق بود', variant: 'destructive' });
    }
    setSyncing(false);
  };

  const openResetDialog = () => {
    setResetPassword('');
    setResetPreview(null);
    setResetDone(null);
    setShowReset(true);
  };

  const handleResetPreview = async () => {
    setResetLoading(true);
    setResetDone(null);
    try {
      const res = await callSupabase('bulkResetLegacyPasswords', { dry_run: true, reset_all: true });
      if (!res?.success) {
        toast({ title: 'خطا', description: res?.message || res?.error || 'پیش‌نمایش ناموفق بود', variant: 'destructive' });
      } else {
        setResetPreview({ count: res.count, users: res.users || [] });
      }
    } catch (err) {
      toast({ title: 'خطا', description: err.message || 'پیش‌نمایش ناموفق بود', variant: 'destructive' });
    }
    setResetLoading(false);
  };

  const handleResetConfirm = async () => {
    if (!resetPassword || resetPassword.length < 6) {
      toast({ title: 'خطا', description: 'رمز پیش‌فرض باید حداقل ۶ کاراکتر باشد', variant: 'destructive' });
      return;
    }
    const count = resetPreview?.count || 0;
    if (count === 0) {
      toast({ title: 'اطلاع', description: 'کاربر قدیمی‌ای برای بازنشانی یافت نشد' });
      return;
    }
    if (!confirm(`بازنشانی رمز ${toFa(count)} کاربر قدیمی با رمز جدید؟ این عملیات قابل بازگشت نیست.`)) return;
    setResetLoading(true);
    try {
      const res = await callSupabase('bulkResetLegacyPasswords', { default_password: resetPassword, dry_run: false, reset_all: true });
      if (!res?.success) {
        toast({ title: 'خطا', description: res?.message || res?.error || 'بازنشانی ناموفق بود', variant: 'destructive' });
      } else {
        setResetDone({ count: res.count, users: res.users || [] });
        setResetPreview(null);
        toast({ title: 'بازنشانی شد', description: `${toFa(res.count)} کاربر با موفقیت بازنشانی شدند` });
      }
    } catch (err) {
      toast({ title: 'خطا', description: err.message || 'بازنشانی ناموفق بود', variant: 'destructive' });
    }
    setResetLoading(false);
  };

  const planBadge = (p) => {
    const d = getPlanDisplay(p);
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${d.bg} ${d.color}`}>
        {d.icon} {d.label}
      </span>
    );
  };

  // Customers registered under each sarraaf (deduplicated per sarraaf)
  const sarraafCustomersMap = useMemo(
    () => buildSarraafCustomersMap(customers),
    [customers]
  );

  const isLoading = loadingSarraaf || loadingCustomer || loadingCustomerUsers;

  return (
    <div>
      <InviteCodeManager />
      <Card>
        <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Crown className="w-4 h-4" />
            مدیریت کاربران و اشتراک
          </h3>
          <div className="flex gap-1.5">
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <UserPlus className="w-3.5 h-3.5" />
              صراف جدید
            </Button>
            <Button size="sm" variant="outline" onClick={handleSyncFromServer} disabled={syncing}>
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'در حال همگام‌سازی...' : 'همگام‌سازی'}
            </Button>
            <Button size="sm" variant="outline" onClick={openResetDialog}>
              <KeyRound className="w-3.5 h-3.5" />
              بازنشانی رمز قدیمی‌ها
            </Button>
          </div>
        </div>

        {/* Tab switcher: Sarraaf / Customer */}
        <div className="flex gap-1 p-1 rounded-xl bg-muted mb-3">
          <button
            onClick={() => setTab('sarraaf')}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${tab === 'sarraaf' ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}
          >
            <Store className="w-3.5 h-3.5" />
            صراف‌ها ({toFa((profiles || []).length)})
          </button>
          <button
            onClick={() => setTab('customer')}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${tab === 'customer' ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}
          >
            <Users className="w-3.5 h-3.5" />
            مشتریان ({toFa(independentCustomers.length)})
          </button>
        </div>

        {(sarraafErr || customerError) && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs space-y-1 mb-3">
            <p className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> خطا در بارگذاری داده‌ها</p>
            {sarraafErr && <p>صراف‌ها: {sarraafErr.message}</p>}
            {customerError && <p>مشتریان: {customerError.message}</p>}
            <p className="text-[10px] mt-1">اگر جدول یا مجوز لازم در Supabase وجود ندارد، این خطا نمایش داده می‌شود. داده‌های موجود دست‌نخورده باقی می‌مانند.</p>
          </div>
        )}

        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="جستجو نام / کد / تلفن"
              className="pr-8"
            />
          </div>
          {tab === 'sarraaf' && (
            <Select value={filterPlan} onValueChange={setFilterPlan}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه</SelectItem>
                <SelectItem value="free">رایگان</SelectItem>
                <SelectItem value="paid_active">پولی فعال</SelectItem>
                <SelectItem value="paid_expired">منقضی‌شده</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {isLoading ? (
          <p className="text-xs text-muted-foreground">در حال بارگذاری...</p>
        ) : tab === 'sarraaf' ? (
          filteredSarraaf.length === 0 ? (
            <p className="text-xs text-muted-foreground">صرافی یافت نشد</p>
          ) : (
            <div className="space-y-2">
              {filteredSarraaf.map(p => {
                const usage = usageMap[p.user_id] || usageMap[p.code] || { txCount: 0, msgCount: 0, custCount: 0 };
                return (
                  <div key={p.id} className="p-3 rounded-lg border space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div
                          className="flex items-center gap-2 flex-wrap cursor-pointer"
                          onClick={() => setExpandedSarraaf(expandedSarraaf === p.id ? null : p.id)}
                        >
                          {(() => {
                            const sc = sarraafCustomersMap[p.code] || sarraafCustomersMap[p.user_id] || [];
                            return sc.length > 0 ? (
                              expandedSarraaf === p.id
                                ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                                : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                            ) : null;
                          })()}
                          <span className="text-sm font-medium truncate">{p.name}</span>
                          {planBadge(p)}
                          {p.status === 'suspended' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600">معلق</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[10px] text-muted-foreground">
                          <span>کد: {p.code}</span>
                          {p.phone && <span>تلفن: {p.phone}</span>}
                          {p.exchange_name && <span>صرافی: {p.exchange_name}</span>}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-[10px] text-muted-foreground">
                          <span>سهمیه: {toFa(p.quota_used)} / {toFa(p.quota_limit)}</span>
                          {p.paid_start_date && <span>شروع: {p.paid_start_date}</span>}
                          {p.paid_end_date && <span>پایان: {p.paid_end_date}</span>}
                          {p.last_login && <span>آخرین ورود: {new Date(p.last_login).toLocaleDateString('fa-IR')}</span>}
                        </div>
                        {/* Usage stats */}
                        <div className="flex gap-2 mt-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-600">
                            <Users className="w-3 h-3" />
                            {toFa(usage.custCount)} مشتری
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                            <Activity className="w-3 h-3" />
                            {toFa(usage.txCount)} تراکنش
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">
                            <MessageSquare className="w-3 h-3" />
                            {toFa(usage.msgCount)} پیام
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => openActivate(p)}>
                        <Crown className="w-3 h-3" />
                        ارتقا به پولی
                      </Button>
                      {getPlanStatus(p) !== 'free' && (
                        <Button size="sm" variant="ghost" onClick={() => handleExpire(p)}>
                          <Clock className="w-3 h-3" />
                          پایان اعتبار
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => handleToggleStatus(p)}>
                        {p.status === 'active' ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                        {p.status === 'active' ? 'تعلیق' : 'فعال‌سازی'}
                      </Button>
                    </div>
                    {expandedSarraaf === p.id && (() => {
                      const sc = sarraafCustomersMap[p.code] || sarraafCustomersMap[p.user_id] || [];
                      if (sc.length === 0) {
                        return <p className="text-[10px] text-muted-foreground pr-5">مشتری ثبت‌شده‌ای وجود ندارد</p>;
                      }
                      return (
                        <div className="space-y-1 pr-5 border-r border-border/50">
                          <p className="text-[10px] text-muted-foreground font-medium">{toFa(sc.length)} مشتری ثبت‌شده</p>
                          {sc.map(c => (
                            <div key={c.id} className="flex items-center gap-2 text-[10px] py-0.5">
                              <Users className="w-3 h-3 text-muted-foreground" />
                              <span className="font-medium truncate">{c.name}</span>
                              {c.phone && <span className="text-muted-foreground">{c.phone}</span>}
                              {c.status === 'inactive' && (
                                <span className="px-1 py-0.5 rounded-full bg-red-50 text-red-600">غیرفعال</span>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <>
          {/* Customer stats summary */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-blue-50 text-blue-600">
              <Users className="w-3 h-3" />
              کل: {toFa(customers.length)}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-green-50 text-green-600">
              <Users className="w-3 h-3" />
              مستقل: {toFa(independentCustomers.length)}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary">
              <Store className="w-3 h-3" />
              زیر صراف‌ها: {toFa(customers.length - independentCustomers.length)}
            </span>
          </div>
          {/* Customer list */}
          {filteredCustomers.length === 0 ? (
            <p className="text-xs text-muted-foreground">مشتری یافت نشد</p>
          ) : (
            <div className="space-y-2">
              {filteredCustomers.map(c => {
                const usage = usageMap[c.id] || { txCount: 0, msgCount: 0 };
                return (
                  <div key={c.id} className="p-3 rounded-lg border space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">{c.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">مشتری</span>
                          {c.status === 'inactive' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600">غیرفعال</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[10px] text-muted-foreground">
                          <span>کد: {c.code || '—'}</span>
                          {c.phone && <span>تلفن: {c.phone}</span>}
                          {c.customer_type && <span>نوع: {c.customer_type === 'permanent' ? 'ثابت' : c.customer_type === 'temporary' ? 'موقت' : 'متفرقه'}</span>}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-[10px] text-muted-foreground">
                          {c.created_date && <span>ثبت‌نام: {new Date(c.created_date).toLocaleDateString('fa-IR')}</span>}
                          {c.last_login
                            ? <span>آخرین ورود: {new Date(c.last_login).toLocaleDateString('fa-IR')}</span>
                            : <span className="text-amber-600">آخرین ورود: ثبت نشده</span>}
                          {c.email && <span>ایمیل: {c.email}</span>}
                        </div>
                        {/* Usage stats */}
                        <div className="flex gap-2 mt-1.5">
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                            <Activity className="w-3 h-3" />
                            {toFa(usage.txCount)} تراکنش
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">
                            <MessageSquare className="w-3 h-3" />
                            {toFa(usage.msgCount)} پیام
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </>
        )}
      </CardContent>

      <Dialog open={!!editProfile} onOpenChange={() => setEditProfile(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>فعال‌سازی نسخه پولی — {editProfile?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>نوع پلن</Label>
              <Select value={planForm.plan} onValueChange={v => setPlanForm({ ...planForm, plan: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">پایه</SelectItem>
                  <SelectItem value="pro">حرفه‌ای</SelectItem>
                  <SelectItem value="special">ویژه</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>تاریخ شروع</Label>
                <Input type="date" value={planForm.startDate} onChange={e => setPlanForm({ ...planForm, startDate: e.target.value })} />
              </div>
              <div>
                <Label>تاریخ پایان</Label>
                <Input type="date" value={planForm.endDate} onChange={e => setPlanForm({ ...planForm, endDate: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>مدت اشتراک</Label>
              <Select value={String(planForm.durationMonths)} onValueChange={v => handleDurationChange(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">یک ساله</SelectItem>
                  <SelectItem value="6">شش ماهه</SelectItem>
                  <SelectItem value="3">سه ماهه</SelectItem>
                  <SelectItem value="1">یک ماهه</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProfile(null)}>انصراف</Button>
            <Button onClick={handleActivate} disabled={activateMut.isPending}>
              {activateMut.isPending ? 'در حال فعال‌سازی...' : 'فعال‌سازی نسخه پولی'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Sarraaf Dialog */}
      <Dialog open={showCreate} onOpenChange={() => setShowCreate(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>ایجاد حساب صراف جدید</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>نام صرافی <span className="text-destructive">*</span></Label>
              <Input value={createForm.exchange_name} onChange={e => setCreateForm({ ...createForm, exchange_name: e.target.value })} placeholder="نام صرافی" />
            </div>
            <div>
              <Label>نام و نام خانوادگی مسئول <span className="text-destructive">*</span></Label>
              <Input value={createForm.full_name} onChange={e => setCreateForm({ ...createForm, full_name: e.target.value })} placeholder="نام و نام خانوادگی" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>شماره موبایل <span className="text-destructive">*</span></Label>
                <Input value={createForm.mobile} onChange={e => setCreateForm({ ...createForm, mobile: e.target.value })} placeholder="07XXXXXXXX" inputMode="numeric" />
              </div>
              <div>
                <Label>نام کاربری <span className="text-destructive">*</span></Label>
                <Input value={createForm.username} onChange={e => setCreateForm({ ...createForm, username: e.target.value })} placeholder="نام کاربری یکتا" />
              </div>
            </div>
            <div>
              <Label>رمز عبور <span className="text-destructive">*</span></Label>
              <Input type="text" value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} placeholder="حداقل ۸ کاراکتر" />
            </div>
            <div>
              <Label>ایمیل (اختیاری)</Label>
              <Input type="email" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} placeholder="email@gmail.com" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>کشور</Label>
                <Input value={createForm.country} onChange={e => setCreateForm({ ...createForm, country: e.target.value })} placeholder="کشور" />
              </div>
              <div>
                <Label>شهر</Label>
                <Input value={createForm.city} onChange={e => setCreateForm({ ...createForm, city: e.target.value })} placeholder="شهر" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground bg-primary/5 p-2 rounded-lg">
              این حساب بدون نیاز به تأیید ایمیل ایجاد می‌شود. کد صرافی و کد دعوت به‌صورت خودکار تولید می‌شوند.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>انصراف</Button>
            <Button onClick={handleCreateSarraaf} disabled={creating}>
              {creating ? 'در حال ایجاد...' : 'ایجاد حساب'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Reset Legacy Passwords Dialog */}
      <Dialog open={showReset} onOpenChange={setShowReset}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-4 h-4" />
              بازنشانی گروهی رمز کاربران قدیمی
            </DialogTitle>
          </DialogHeader>
          {resetDone ? (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-green-50 text-green-800 text-sm">
                <p className="font-bold">{toFa(resetDone.count)} کاربر با موفقیت بازنشانی شدند.</p>
                <p className="text-xs mt-1">این کاربران اکنون می‌توانند با رمز جدید وارد شوند و سپس رمز خود را تغییر دهند.</p>
              </div>
              {resetDone.users.length > 0 && (
                <div className="max-h-48 overflow-auto space-y-1">
                  {resetDone.users.map(u => (
                    <div key={u.id} className="text-xs px-2 py-1 rounded bg-muted/40 flex items-center justify-between">
                      <span>{formatUserIdentifier(u)}</span>
                      <span className="text-muted-foreground">#{u.id}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground bg-amber-50 text-amber-800 p-2 rounded-lg">
                این عملیات رمز همه‌ی کاربران (به‌جز حساب سازنده) را به رمز پیش‌فرض جدید تغییر می‌دهد. کاربران پس از آن می‌توانند با رمز جدید وارد شوند و سپس رمز خود را تغییر دهند. ابتدا پیش‌نمایش بگیرید، سپس تأیید کنید.
              </p>
              <div>
                <Label>رمز پیش‌فرض جدید <span className="text-destructive">*</span></Label>
                <Input
                  type="text"
                  value={resetPassword}
                  onChange={e => setResetPassword(e.target.value)}
                  placeholder="حداقل ۶ کاراکتر"
                />
              </div>
              <Button variant="outline" className="w-full" onClick={handleResetPreview} disabled={resetLoading || !resetPassword || resetPassword.length < 6}>
                {resetLoading ? 'در حال بررسی...' : 'پیش‌نمایش کاربران قدیمی'}
              </Button>
              {resetPreview && (
                <div className="space-y-2">
                  <div className="p-2 rounded-lg bg-muted/40 text-sm">
                    <span className="font-bold">{toFa(resetPreview.count)}</span> کاربر قدیمی یافت شد
                  </div>
                  {resetPreview.count > 0 && (
                    <div className="max-h-40 overflow-auto space-y-1">
                      {resetPreview.users.map(u => (
                        <div key={u.id} className="text-xs px-2 py-1 rounded bg-muted/40 flex items-center justify-between">
                          <span>{formatUserIdentifier(u)}</span>
                          <span className="text-muted-foreground">#{u.id}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button className="w-full" onClick={handleResetConfirm} disabled={resetLoading || resetPreview.count === 0}>
                    {resetLoading ? 'در حال بازنشانی...' : `تأیید و بازنشانی ${toFa(resetPreview.count)} کاربر`}
                  </Button>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReset(false)}>بستن</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
    </div>
  );
}