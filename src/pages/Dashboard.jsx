import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTransactions, useCustomers, useCustomerBalances, useSarraafProfile, useFeatures, useTreasuryBalances, useBankBalances, useCurrencies, useTransfers } from '@/lib/useSarraaf';
import { useAuth } from '@/lib/AuthContext';
import { formatNumber, TX_TYPE_LABELS } from '@/lib/sarraaf';
import { StatCard, EmptyState, LoadingState, TransactionRow } from '@/components/sarraaf/Pieces';
import FeatureGate from '@/components/FeatureGate';
import { getFeatureStatus, PREMIUM_FEATURE_KEYS } from '@/lib/features';
import { getPlanStatus, isPaidUser, getTrialDaysRemaining } from '@/lib/permissions';
import { useUpgrade } from '@/lib/UpgradeContext';
import { usePaidSystemEnabled } from '@/lib/usePaidSystem';
import { getAllowedDashboardLinks } from '@/lib/rbac';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users, Send, ArrowLeftRight, ArrowRightLeft, FileText, Banknote, Store, MessageSquareMore,
  Landmark, Coins, TrendingUp, TrendingDown, Wallet, Network, Share2, BookCopy,
  ScrollText, Scale, FileSearch, ShoppingBag, Settings, Repeat,
  Receipt, Handshake, ChevronLeft,
} from 'lucide-react';
import DashboardLinks from '@/components/sarraaf/DashboardLinks';
import DesktopDashboard from '@/components/sarraaf/DesktopDashboard';
import TreasuryBalanceCards from '@/components/sarraaf/dashboard/TreasuryBalanceCards';
import TodayTxSummary from '@/components/sarraaf/dashboard/TodayTxSummary';
import PendingTransfersList from '@/components/sarraaf/dashboard/PendingTransfersList';
import TreasuryBalanceV2 from '@/components/sarraaf/dashboard/v2/TreasuryBalanceV2';
import TodayTxSummaryV2 from '@/components/sarraaf/dashboard/v2/TodayTxSummaryV2';
import PendingTransfersV2 from '@/components/sarraaf/dashboard/v2/PendingTransfersV2';
import { useLayoutVersion } from '@/lib/LayoutVersionContext';


const PRIMARY_LINKS = [
  { label: 'مشتریان', path: '/customers', icon: Users, gradient: 'from-blue-500 to-blue-600' },
  { label: 'خرید/فروش', path: '/trade', icon: Repeat, gradient: 'from-violet-500 to-violet-600' },
  { label: 'داد و گرفت', path: '/dadogereft', icon: Handshake, gradient: 'from-teal-500 to-teal-600' },
  { label: 'صندوق', path: '/cash', icon: Banknote, gradient: 'from-emerald-500 to-emerald-600' },
  { label: 'بانک', path: '/bank', icon: Landmark, gradient: 'from-indigo-500 to-indigo-600' },
  { label: 'حواله', path: '/transfer-book', icon: Send, gradient: 'from-orange-500 to-orange-600' },
  { label: 'تبدیل ارز', path: '/convert', icon: ArrowRightLeft, gradient: 'from-cyan-500 to-cyan-600' },
  { label: 'دریافت', path: '/receipt', icon: Receipt, gradient: 'from-rose-500 to-rose-600' },
  { label: 'گزارش‌ها', path: '/reports', icon: FileText, gradient: 'from-amber-500 to-amber-600' },
];

const SECONDARY_LINKS = [
  { label: 'بازار نرخ', path: '/sarraaf-market', icon: Store, gradient: 'from-cyan-500 to-cyan-600' },
  { label: 'محصولات آنلاین', path: '/online-products', icon: ShoppingBag, gradient: 'from-pink-500 to-pink-600' },
  { label: 'چت صراف‌ها', path: '/sarraaf-chat', icon: MessageSquareMore, gradient: 'from-teal-500 to-teal-600' },
  { label: 'ارز و نرخ', path: '/currencies', icon: Coins, gradient: 'from-amber-500 to-amber-600' },
  { label: 'سود و زیان', path: '/profit-loss', icon: TrendingUp, gradient: 'from-green-500 to-green-600' },
  { label: 'بدهکاران', path: '/debtors', icon: Wallet, gradient: 'from-red-500 to-red-600' },
  { label: 'نمایندگی‌ها', path: '/agents', icon: Network, gradient: 'from-cyan-500 to-cyan-600' },
  { label: 'شبکه نمایندگی', path: '/agency-network', icon: Share2, gradient: 'from-blue-500 to-blue-600' },
  { label: 'دفتر روزنامه', path: '/journal', icon: BookCopy, gradient: 'from-slate-500 to-slate-600' },
  { label: 'دفتر کل', path: '/general-ledger', icon: ScrollText, gradient: 'from-gray-500 to-gray-600' },
  { label: 'ترازنامه', path: '/balance-sheet', icon: Scale, gradient: 'from-stone-500 to-stone-600' },
  { label: 'مغایرت‌گیری', path: '/reconciliation', icon: FileSearch, gradient: 'from-neutral-500 to-neutral-600' },
  { label: 'تنظیمات', path: '/settings', icon: Settings, gradient: 'from-slate-500 to-slate-600' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useSarraafProfile(user?.id);
  const { data: txs, isLoading: txLoading } = useTransactions();
  const { data: customers, isLoading: custLoading } = useCustomers();
  const { data: customerBalances, isLoading: balLoading } = useCustomerBalances();
  const { data: features } = useFeatures();
  const { data: treasuryBalances, isLoading: treasuryLoading } = useTreasuryBalances();
  const { data: bankBalances, isLoading: bankLoading } = useBankBalances();
  const { data: currencies, isLoading: curLoading } = useCurrencies();
  const { data: transfers, isLoading: transfersLoading } = useTransfers({ status: 'pending' });
  const { isV2 } = useLayoutVersion();
  const { openUpgrade } = useUpgrade();
  const { data: paidSystemEnabled } = usePaidSystemEnabled();

  const userRole = user?.role || 'user';
  const isTrial = userRole === 'sarraaf' && profile && getTrialDaysRemaining(profile) > 0;
  const isPaidActive = userRole === 'sarraaf' && profile && isPaidUser(profile);
  // Trial expired = sarraaf on free plan, not in trial, not paid
  const trialExpired = userRole === 'sarraaf' && profile && getPlanStatus(profile) === 'free' && !isTrial && !isPaidActive;
  const primaryLinks = userRole === 'sarraaf'
    ? PRIMARY_LINKS
    : getAllowedDashboardLinks(userRole, PRIMARY_LINKS);
  const secondaryLinks = userRole === 'sarraaf'
    ? SECONDARY_LINKS
    : getAllowedDashboardLinks(userRole, SECONDARY_LINKS);
  const trialDaysRemaining = isTrial ? getTrialDaysRemaining(profile) : 0;

  const today = new Date().toISOString().split('T')[0];
  const todayCount = (txs || []).filter(t => t.date === today).length;

  const isFree = !profile || getPlanStatus(profile) === 'free';
  const showUpgradeUI = isFree && paidSystemEnabled !== false && !isTrial;
  const custCount = customers?.length || 0;

  const debtorStats = useMemo(() => {
    if (!customers || !customerBalances) return { debtors: 0, creditors: 0, net: 0 };
    let debtors = 0, creditors = 0, net = 0;
    for (const c of customers) {
      const balRow = customerBalances.find(b => String(b.customer_id) === String(c.id));
      if (!balRow) continue;
      const bal = balRow.net_balance || 0;
      if (Math.abs(bal) < 0.01) continue;
      net += bal;
      if (bal > 0) debtors++;
      else creditors++;
    }
    return { debtors, creditors, net };
  }, [customers, customerBalances]);
  const todayTransferCount = (txs || []).filter(t => t.date === today && t.type === 'transfer').length;
  const monthTxCount = (txs || []).filter(t => {
    const d = new Date(t.date || t.created_date);
    return d && d.getMonth() === new Date().getMonth();
  }).length;

  const plan = { isTrial, trialDaysRemaining, showUpgradeUI, paidSystemEnabled, openUpgrade, custCount, todayTransferCount, monthTxCount };

  const renderLink = (link, isSecondary = false, desktop = false) => {
    const featureKey = link.path.replace('/', '').replace(/-/g, '_');
    const status = getFeatureStatus(features || [], featureKey);
    const isUpdating = status === 'updating';
    const Icon = link.icon;
    const isPaidFeature = PREMIUM_FEATURE_KEYS.includes(featureKey);
    // Show a live countdown badge on paid features during the trial
    const showTrialBadge = isTrial && isPaidFeature;

    return (
      <Link
        key={link.path}
        to={link.path}
        onClick={(e) => e.stopPropagation()}
        className={`${desktop ? 'flex items-center gap-2 p-2 min-h-10 text-right' : 'flex flex-col items-center gap-1 p-1.5'} rounded-lg bg-card border transition-colors relative group ${showTrialBadge ? 'border-purple-300 dark:border-purple-800 ring-1 ring-purple-200 dark:ring-purple-900/50' : 'border-border hover:border-primary/30 hover:shadow-card-hover'}`}
      >
        <div className={`w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br ${link.gradient} flex items-center justify-center shadow-sm ${isUpdating ? 'opacity-50' : ''} group-hover:scale-105 transition-transform`}>
          <Icon className="w-4 h-4 text-white" strokeWidth={2.2} />
        </div>
        <span className={desktop ? 'text-sm font-medium text-foreground' : 'text-[9px] font-medium text-center leading-tight text-foreground'}>{link.label}</span>
        {isUpdating && (
          <span className="absolute -top-1 -left-1 px-1 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[8px] font-bold">
            به‌روزرسانی
          </span>
        )}
        {showTrialBadge && (
          <span className="absolute -top-1.5 -left-1.5 px-1 py-0.5 rounded-full bg-purple-500 text-white text-[8px] font-bold shadow-sm whitespace-nowrap">
            {toPersian(trialDaysRemaining)} روز
          </span>
        )}
      </Link>
    );
  };

  return (
    <FeatureGate featureKey="dashboard">
      {/* Desktop / tablet (md and up) */}
      <div className="hidden md:block">
        <DesktopDashboard
          profile={profile}
          currencies={currencies}
          curLoading={curLoading}
          txs={txs}
          txLoading={txLoading}
          customers={customers}
          custLoading={custLoading}
          treasuryBalances={treasuryBalances}
          treasuryLoading={treasuryLoading}
          bankBalances={bankBalances}
          bankLoading={bankLoading}
          debtorCount={debtorStats.debtors}
          plan={plan}
        />
      </div>

      {/* Mobile: Professional dashboard summary */}
      <div className="md:hidden space-y-3 mb-3">
        {isV2 ? (
          <>
            <TreasuryBalanceV2 treasuryBalances={treasuryBalances} isLoading={treasuryLoading} />
            <TodayTxSummaryV2 txs={txs} isLoading={txLoading} />
            <PendingTransfersV2 transfers={transfers} isLoading={transfersLoading} />
          </>
        ) : (
          <>
            <TreasuryBalanceCards treasuryBalances={treasuryBalances} isLoading={treasuryLoading} />
            <TodayTxSummary txs={txs} isLoading={txLoading} />
            <PendingTransfersList transfers={transfers} isLoading={transfersLoading} />
          </>
        )}
      </div>

      {/* Mobile: Quick links */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-foreground">دسترسی سریع</h3>
        </div>
        <DashboardLinks
          allLinks={[...primaryLinks, ...secondaryLinks]}
          renderLink={renderLink}
        />
      </div>

      {/* Mobile: Recent transactions */}
      <div className="md:hidden flex items-center justify-between mb-2.5 mt-4">
        <h3 className="text-sm font-bold text-foreground">تراکنش‌های اخیر</h3>
        <Link to="/reports" className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-primary transition-colors">
          مشاهده همه <ChevronLeft className="w-3.5 h-3.5" />
        </Link>
      </div>
      <Card className="md:hidden shadow-card">
        <CardContent className="p-2">
          {txLoading ? (
            <LoadingState />
          ) : (txs || []).length === 0 ? (
            <EmptyState icon={FileText} title="تراکنشی ثبت نشده" description="اولین عملیات خود را انجام دهید" />
          ) : (
            <div className="grid grid-cols-1 gap-1">
              {(txs || []).slice(0, 10).map(tx => (
                <TransactionRow key={tx.id} tx={tx} labels={TX_TYPE_LABELS} onClick={() => navigate(`/receipt?type=tx&id=${tx.id}`)} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </FeatureGate>
    );
    }

    function toPersian(n) {
    return String(n || 0).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
    }