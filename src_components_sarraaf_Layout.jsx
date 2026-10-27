import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useFeatures, useSarraafProfile } from '@/lib/useSarraaf';
import { visibleNavItems } from '@/lib/features';
import { shouldExpirePaidPlan } from '@/lib/permissions';
import { supabase } from '@/lib/supabaseClient';
import { useUpgrade } from '@/lib/UpgradeContext';
import { usePaidSystemEnabled } from '@/lib/usePaidSystem';
import SyncIndicator from '@/components/SyncIndicator';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, ArrowLeftRight, Repeat, Send, Download,
  Banknote, Landmark, Coins, FileText, TrendingUp, Settings, Shield,
  Network, Share2, BookOpen, BookCopy, ScrollText, ArrowRightLeft,
  ShoppingBag, Search, MoreVertical, X, MessageSquare, Wallet, Bell,
  Store, MessageSquareMore, DatabaseBackup, Copy, Headphones, CreditCard,
  Bot
} from 'lucide-react';
import { getAllowedNavItems, isManagementRole } from '@/lib/rbac';
import { isReadOnlyMode, getTrialDaysRemaining, getPlanDisplay } from '@/lib/permissions';
import ExchangeMark from '@/components/ExchangeMark';
import TermsGate from '@/components/TermsGate';
import ForceUpdateGate from '@/components/ForceUpdateGate';
import { useHardwareBack } from '@/hooks/useHardwareBack';
import PullToRefresh from '@/components/PullToRefresh';
import WorkspaceNavigation from '@/components/sarraaf/WorkspaceNavigation';
import WorkspaceHeader from '@/components/sarraaf/WorkspaceHeader';
import PwaInstallPrompt from '@/components/PwaInstallPrompt';
import { Receipt, Scale, FileSearch } from 'lucide-react';

const NAV_ITEMS = [
  { featureKey: 'dashboard', label: 'داشبورد', path: '/dashboard', icon: LayoutDashboard, order: 0 },
  { featureKey: 'customers', label: 'مشتریان', path: '/customers', icon: Users, order: 1 },
  { featureKey: 'dadogereft', label: 'داد و گرفت', path: '/dadogereft', icon: ArrowLeftRight, order: 2 },
  { featureKey: 'trade', label: 'خرید/فروش', path: '/trade', icon: Repeat, order: 3 },
  { featureKey: 'transfer_send', label: 'حواله ارسال', path: '/transfers/send', icon: Send, order: 4 },
  { featureKey: 'transfer_receive', label: 'حواله دریافت', path: '/transfers/receive', icon: Download, order: 5 },
  { featureKey: 'cash', label: 'صندوق', path: '/cash', icon: Banknote, order: 6 },
  { featureKey: 'bank', label: 'بانک', path: '/bank', icon: Landmark, order: 7 },
  { featureKey: 'currencies', label: 'ارز و نرخ', path: '/currencies', icon: Coins, order: 8 },
  { featureKey: 'reports', label: 'گزارش‌ها', path: '/reports', icon: FileText, order: 9 },
  { featureKey: 'profit_loss', label: 'سود و زیان', path: '/profit-loss', icon: TrendingUp, order: 10 },
  { featureKey: 'debtors', label: 'بدهکاران', path: '/debtors', icon: Wallet, order: 12 },
  { featureKey: 'agents', label: 'نمایندگی‌ها', path: '/agents', icon: Network, order: 13 },
  { featureKey: 'agency_network', label: 'شبکه نمایندگی', path: '/agency-network', icon: Share2, order: 14 },
  { featureKey: 'transfer_book', label: 'دفتر حواله', path: '/transfer-book', icon: BookOpen, order: 15 },
  { featureKey: 'journal', label: 'دفتر روزنامه', path: '/journal', icon: BookCopy, order: 16 },
  { featureKey: 'general_ledger', label: 'دفتر کل', path: '/general-ledger', icon: ScrollText, order: 17 },
  { featureKey: 'convert', label: 'تبدیل ارز', path: '/convert', icon: ArrowRightLeft, order: 18 },
  { featureKey: 'online_products', label: 'محصولات آنلاین', path: '/online-products', icon: ShoppingBag, order: 19 },
  { featureKey: 'payment_gateway', label: 'درگاه پرداخت', path: '/payment-gateway', icon: CreditCard, order: 19.5 },
  { featureKey: 'settings', label: 'تنظیمات', path: '/settings', icon: Settings, order: 11 },
  { featureKey: 'sarraaf_market', label: 'بازار نرخ', path: '/sarraaf-market', icon: Store, order: 20 },
  { featureKey: 'sarraaf_chat', label: 'چت صراف‌ها', path: '/sarraaf-chat', icon: MessageSquareMore, order: 21 },
  { featureKey: 'chat_groups', label: 'چت و گروه‌ها', path: '/chat', icon: MessageSquare, order: 22 },
  { featureKey: 'backup', label: 'بکاپ و بازیابی', path: '/backup', icon: DatabaseBackup, order: 23 },
  { featureKey: 'support', label: 'پشتیبانی آنلاین', path: '/support', icon: Headphones, order: 24 },
  { featureKey: 'assistant', label: 'دستیار هوشمند', path: '/assistant', icon: Bot, order: 25 },
];

const BOTTOM_NAV = [
  { featureKey: 'dashboard', label: 'خانه', path: '/dashboard', icon: LayoutDashboard },
  { featureKey: 'customers', label: 'مشتریان', path: '/customers', icon: Users },
  { featureKey: 'trade', label: 'خرید/فروش', path: '/trade', icon: Repeat },
  { featureKey: 'transfer_book', label: 'حواله', path: '/transfer-book', icon: BookOpen },
  { featureKey: 'settings', label: 'تنظیمات', path: '/settings', icon: Settings },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: features } = useFeatures();
  const { data: profile } = useSarraafProfile(user?.id);
  const { data: paidSystemEnabled } = usePaidSystemEnabled();
  const [moreOpen, setMoreOpen] = useState(false);
  const { openUpgrade } = useUpgrade();

  // Tab stack preservation — remembers last visited child path per bottom tab
  const [tabStack, setTabStack] = useState({});

  // Android hardware back button — closes drawer if open, else navigates back
  useHardwareBack(() => setMoreOpen(false), moreOpen);

  // Track current path for the active bottom tab
  useEffect(() => {
    const activeTab = BOTTOM_NAV.find(b =>
      location.pathname === b.path || location.pathname.startsWith(b.path + '/')
    );
    if (activeTab) {
      setTabStack(prev => ({ ...prev, [activeTab.featureKey]: location.pathname }));
    }
  }, [location.pathname]);

  const handleTabClick = (item) => {
    const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
    if (isActive && location.pathname === item.path) return; // already at root
    if (isActive) {
      navigate(item.path); // re-selecting active tab → reset to root
    } else {
      navigate(tabStack[item.featureKey] || item.path); // switch tab → remembered path or root
    }
  };

  const userRole = user?.role || 'user';
  const featureFiltered = visibleNavItems(features || [], NAV_ITEMS, profile || user, paidSystemEnabled);
  const items = getAllowedNavItems(userRole, featureFiltered);
  const desktopItems = [...items, ...getAllowedNavItems(userRole, visibleNavItems(features || [], [
    { featureKey: 'receipt', label: 'دریافت', path: '/receipt', icon: Receipt },
    { featureKey: 'balance_sheet', label: 'ترازنامه', path: '/balance-sheet', icon: Scale },
    { featureKey: 'reconciliation', label: 'مغایرت‌گیری', path: '/reconciliation', icon: FileSearch },
  ], profile || user, paidSystemEnabled))];
  const bottomItems = items.filter(i => BOTTOM_NAV.some(b => b.featureKey === i.featureKey));
  const bottomPaths = new Set(BOTTOM_NAV.map(b => b.featureKey));
  const moreItems = items.filter(i => !bottomPaths.has(i.featureKey));

  // Auto-expire paid plan if end date has passed (skip when paid system is disabled)
  useEffect(() => {
    if (!profile) return;
    if (paidSystemEnabled === false) return; // no expiration when paid system is off
    if (shouldExpirePaidPlan(profile)) {
      import('@/lib/supabaseApi').then(({ createSupabaseEntity }) => {
        const sbSarraafProfile = createSupabaseEntity('SarraafProfile');
        sbSarraafProfile.update(profile.id, { plan: 'free', payment_status: 'expired' })
          .catch((err) => console.error('Failed to expire paid plan:', err.message));
      }).catch(() => {});
    }
  }, [profile?.id, profile?.plan, profile?.paid_end_date, paidSystemEnabled]);

  const handleLogout = () => {
    logout();
  };

  const readOnly = isReadOnlyMode(profile);
  const planDisplay = getPlanDisplay(profile);

  return (
    <TermsGate role={userRole}>
    <ForceUpdateGate>
    <div className="min-h-screen bg-background flex">
      {/* Structured workspace navigation; mobile navigation below is unchanged. */}
      <aside className="hidden md:flex w-56 lg:w-60 xl:w-64 sticky top-0 h-screen flex-col bg-slate-800 text-slate-100 shrink-0 print:hidden">
        {/* Brand header */}
        <div className="px-4 py-4 border-b border-white/10 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md">
            <ArrowLeftRight className="w-5 h-5 text-white" strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">حساب صراف</p>
            <p className="text-[11px] text-slate-400 truncate">{profile?.exchange_name || 'مدیریت صرافی'}</p>
          </div>
        </div>
        {/* Navigation */}
        <WorkspaceNavigation key={location.pathname} items={desktopItems} />
        {/* Sidebar footer */}
        <div className="px-3 py-2 border-t border-white/10 flex items-center justify-between gap-2">
          <SyncIndicator compact />
        </div>
        <Link to="/support" className="mx-3 mb-3 flex items-center gap-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 px-3 py-2.5 text-xs text-slate-300 hover:text-white transition-colors">
          <Headphones className="w-4 h-4 shrink-0" />
          <span>پشتیبانی آنلاین</span>
        </Link>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <WorkspaceHeader items={desktopItems} user={user} profile={profile} paidSystemEnabled={paidSystemEnabled} openUpgrade={openUpgrade} onLogout={handleLogout} />
        {/* Mobile Header — clean, minimal: identity + hamburger */}
        <header
          className="md:hidden sticky top-0 z-30 bg-card border-b"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="flex items-center justify-between gap-2 px-4 py-3">
            {/* Exchange identity */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="shrink-0">
                <ExchangeMark size="sm" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate leading-tight">{profile?.exchange_name || profile?.name || 'حساب صراف'}</p>
                {(profile?.code || profile?.exchange_code) && (
                  <div className="flex items-center gap-1">
                    <p className="text-xs text-muted-foreground tracking-wider truncate" dir="ltr">{profile.code || profile.exchange_code}</p>
                    <button
                      onClick={() => navigator.clipboard?.writeText(profile.code)}
                      className="p-0.5 rounded text-muted-foreground hover:text-primary transition-colors shrink-0"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Sync indicator + Notifications + Hamburger menu */}
            <div className="flex items-center gap-1 shrink-0">
              <SyncIndicator compact />
              <Link to="/notifications" className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
                <Bell className="w-5 h-5" />
              </Link>
              <button
                onClick={() => setMoreOpen(true)}
                className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 min-w-0 overflow-y-auto pb-20 md:pb-8">
          <div className="sarraaf-workspace w-full mx-auto p-3 md:p-5 xl:px-7 xl:py-6">
            {readOnly && (
              <div className="mb-3 rounded-xl border border-orange-300 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-700 p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-orange-500 text-white flex items-center justify-center shrink-0 font-bold">!</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-orange-800 dark:text-orange-200">دوره آزمایشی شما به پایان رسیده است</p>
                  <p className="text-[11px] text-orange-700 dark:text-orange-300">دسترسی نوشتن غیرفعال است. داده‌های خود را مشاهده می‌کنید اما برای ادامه فعالیت نیاز به ارتقا دارید.</p>
                </div>
                {paidSystemEnabled !== false && (
                  <button onClick={() => openUpgrade()} className="shrink-0 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium">
                    ارتقا
                  </button>
                )}
              </div>
            )}
            <PullToRefresh>
              <Outlet />
            </PullToRefresh>
          </div>
        </main>
        {/* Desktop footer bar */}
        <footer className="hidden md:flex items-center justify-between border-t border-border bg-card px-6 py-2.5 text-xs text-muted-foreground print:hidden">
          <div className="flex items-center gap-4">
            <Link to="/support" className="hover:text-primary transition-colors">راهنمای استفاده</Link>
            <Link to="/support" className="hover:text-primary transition-colors">پشتیبانی</Link>
            <Link to="/settings" className="hover:text-primary transition-colors">تنظیمات</Link>
          </div>
          <span className="hidden lg:inline">امنیت اولویت ماست. تمامی تراکنش‌ها با بالاترین سطح امنیت انجام می‌شود.</span>
        </footer>
      </div>

      {/* Mobile Bottom Nav — 5 tabs */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-card border-t flex items-center justify-around px-1 pt-1 pb-0 safe-bottom"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {bottomItems.map(item => {
          const Icon = item.icon;
          const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <button
              key={item.featureKey}
              onClick={() => handleTabClick(item)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-2 pt-1 pb-1 rounded-lg flex-1 min-h-[44px] transition-colors',
                active ? 'text-primary bg-primary/10' : 'text-muted-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Hamburger Menu Drawer */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setMoreOpen(false)}>
          <div className="absolute top-0 left-0 bottom-0 w-72 bg-card shadow-xl overflow-y-auto scrollbar-thin" onClick={e => e.stopPropagation()}>
            {/* Drawer header with identity */}
            <div className="p-4 border-b bg-gradient-to-l from-primary to-primary/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="shrink-0">
                    <ExchangeMark size="sm" dark />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{profile?.exchange_name || profile?.name || 'حساب صراف'}</p>
                    {(profile?.code || profile?.exchange_code) && (
                      <p className="text-xs text-white/70 tracking-wider truncate" dir="ltr">{profile.code || profile.exchange_code}</p>
                    )}
                  </div>
                </div>
                <button onClick={() => setMoreOpen(false)} className="p-1.5 rounded-lg text-white/80 hover:bg-white/10">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* All nav items */}
            <nav className="p-2">
              {moreItems.map(item => {
                const Icon = item.icon;
                const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                return (
                  <Link
                    key={item.featureKey}
                    to={item.path}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                      active ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted'
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Management actions */}
            <div className="p-2 border-t mt-2 space-y-1">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-xs text-muted-foreground">همگام‌سازی</span>
                <SyncIndicator compact />
              </div>
              <Link to="/online-products" onClick={() => setMoreOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                <ShoppingBag className="w-4 h-4 shrink-0" />
                <span>محصولات آنلاین</span>
              </Link>
              <Link to="/notifications" onClick={() => setMoreOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20">
                <Bell className="w-4 h-4 shrink-0" />
                <span>اعلان‌ها</span>
              </Link>
              {paidSystemEnabled !== false && (
                <button onClick={() => { setMoreOpen(false); openUpgrade(); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20">
                  <Crown className="w-4 h-4 shrink-0" />
                  <span>ارتقا به نسخه پولی</span>
                </button>
              )}
              {userRole === 'creator' && (
                <>
                  <Link to="/builder" onClick={() => setMoreOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20">
                    <Shield className="w-4 h-4 shrink-0" />
                    <span>پنل سازنده</span>
                  </Link>
                  <Link to="/main-settings" onClick={() => setMoreOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                    <Settings className="w-4 h-4 shrink-0" />
                    <span>تنظیمات اصلی</span>
                  </Link>
                </>
              )}
              <button onClick={() => { setMoreOpen(false); handleLogout(); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10">
                <X className="w-4 h-4 shrink-0" />
                <span>خروج</span>
              </button>
            </div>
          </div>
        </div>
      )}
      <PwaInstallPrompt />
    </div>
    </ForceUpdateGate>
    </TermsGate>
  );
}