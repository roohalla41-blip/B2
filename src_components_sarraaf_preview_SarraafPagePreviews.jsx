import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DEFAULT_CURRENCIES } from '@/lib/defaultCurrencies';
import {
  Users, Send, ArrowLeftRight, ArrowRightLeft, FileText, Banknote, Store,
  Landmark, Coins, TrendingUp, TrendingDown, Wallet, Network, Share2,
  BookCopy, ScrollText, Scale, FileSearch, ShoppingBag, Settings, Repeat,
  Receipt, Handshake, Bell, Headphones, DatabaseBackup, MessageSquare,
  MessageSquareMore, CreditCard, ChevronLeft, ChevronDown, Plus, Minus,
  ArrowUpRight, ArrowDownRight, Search, Check, Smartphone, Tablet, Monitor,
  LayoutDashboard, BookOpen, X, Coins as CoinsIcon,
} from 'lucide-react';

const toPersian = (n) => String(n || 0).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

// ── Real routes from src/components/sarraaf/Layout.jsx NAV_ITEMS ──
export const SARRAAF_PAGES = [
  { key: 'dashboard',      label: 'داشبورد',         path: '/dashboard',       icon: LayoutDashboard, group: 'اصلی' },
  { key: 'customers',      label: 'مشتریان',         path: '/customers',       icon: Users,           group: 'اصلی' },
  { key: 'dadogereft',     label: 'داد و گرفت',      path: '/dadogereft',       icon: Handshake,        group: 'اصلی' },
  { key: 'trade',          label: 'خرید/فروش',       path: '/trade',            icon: Repeat,           group: 'اصلی' },
  { key: 'cash',           label: 'صندوق',           path: '/cash',             icon: Banknote,         group: 'اصلی' },
  { key: 'bank',           label: 'بانک',             path: '/bank',             icon: Landmark,         group: 'اصلی' },
  { key: 'receipt',        label: 'دریافت',          path: '/receipt',          icon: Receipt,          group: 'اصلی' },
  { key: 'transfer_send',  label: 'حواله ارسال',      path: '/transfers/send',   icon: Send,             group: 'حواله' },
  { key: 'transfer_receive', label: 'حواله دریافت',   path: '/transfers/receive', icon: ArrowDownRight,  group: 'حواله' },
  { key: 'transfer_book',  label: 'دفتر حواله',       path: '/transfer-book',    icon: BookOpen,         group: 'حواله' },
  { key: 'reports',        label: 'گزارش‌ها',         path: '/reports',          icon: FileText,         group: 'حسابداری' },
  { key: 'profit_loss',    label: 'سود و زیان',       path: '/profit-loss',      icon: TrendingUp,       group: 'حسابداری' },
  { key: 'debtors',        label: 'بدهکاران',         path: '/debtors',          icon: Wallet,           group: 'حسابداری' },
  { key: 'journal',        label: 'دفتر روزنامه',     path: '/journal',           icon: BookCopy,        group: 'حسابداری' },
  { key: 'general_ledger', label: 'دفتر کل',          path: '/general-ledger',   icon: ScrollText,       group: 'حسابداری' },
  { key: 'balance_sheet',  label: 'ترازنامه',         path: '/balance-sheet',    icon: Scale,            group: 'حسابداری' },
  { key: 'reconciliation', label: 'مغایرت‌گیری',      path: '/reconciliation',    icon: FileSearch,      group: 'حسابداری' },
  { key: 'currencies',     label: 'ارز و نرخ',         path: '/currencies',       icon: Coins,            group: 'بازار و نرخ' },
  { key: 'sarraaf_market', label: 'بازار نرخ',         path: '/sarraaf-market',   icon: Store,            group: 'بازار و نرخ' },
  { key: 'convert',        label: 'تبدیل ارز',          path: '/convert',          icon: ArrowRightLeft,  group: 'بازار و نرخ' },
  { key: 'agents',         label: 'نمایندگی‌ها',        path: '/agents',           icon: Network,          group: 'کسب‌وکار' },
  { key: 'agency_network', label: 'شبکه نمایندگی',     path: '/agency-network',    icon: Share2,          group: 'کسب‌وکار' },
  { key: 'online_products', label: 'محصولات آنلاین',   path: '/online-products',   icon: ShoppingBag,    group: 'کسب‌وکار' },
  { key: 'payment_gateway', label: 'درگاه پرداخت',      path: '/payment-gateway',   icon: CreditCard,     group: 'کسب‌وکار' },
  { key: 'sarraaf_chat',   label: 'چت صراف‌ها',         path: '/sarraaf-chat',      icon: MessageSquareMore, group: 'کسب‌وکار' },
  { key: 'chat_groups',    label: 'چت و گروه‌ها',       path: '/chat',             icon: MessageSquare,   group: 'کسب‌وکار' },
  { key: 'settings',       label: 'تنظیمات',            path: '/settings',         icon: Settings,        group: 'سیستم' },
  { key: 'backup',         label: 'بکاپ و بازیابی',     path: '/backup',           icon: DatabaseBackup,  group: 'سیستم' },
  { key: 'support',        label: 'پشتیبانی آنلاین',    path: '/support',          icon: Headphones,     group: 'سیستم' },
  { key: 'notifications',  label: 'اعلان‌ها',           path: '/notifications',    icon: Bell,            group: 'سیستم' },
];

// Bottom nav prioritizing daily exchange accounting operations
export const PROPOSED_BOTTOM_NAV = [
  { key: 'dashboard',  label: 'داشبورد',   icon: LayoutDashboard },
  { key: 'trade',      label: 'خرید/فروش', icon: Repeat },
  { key: 'cash',       label: 'صندوق',     icon: Banknote },
  { key: 'customers',  label: 'مشتریان',   icon: Users },
  { key: 'transfer_book', label: 'حواله',  icon: BookOpen },
];

// ── Shared mock data ──
const MOCK_TXS = [
  { type: 'in',  label: 'واریز نقدی — احمد رضایی',     amount: '۵۰۰٬۰۰۰',     cur: 'AFN', time: '۱۰:۳۰' },
  { type: 'out', label: 'پرداخت — مریم کاظمی',         amount: '۱٬۲۰۰٬۰۰۰',   cur: 'AFN', time: '۰۹:۱۵' },
  { type: 'in',  label: 'فروش دلار',                   amount: '۵۰۰',       cur: 'USD', time: 'دیروز' },
  { type: 'out', label: 'هزینه جاری',                  amount: '۸۰٬۰۰۰',     cur: 'AFN', time: 'دیروز' },
  { type: 'in',  label: 'دریافت از بانک',               amount: '۲٬۰۰۰٬۰۰۰', cur: 'AFN', time: '۲ روز پیش' },
];

const MOCK_CUSTOMERS = [
  { name: 'احمد رضایی',  phone: '۰۷۹۹۱۲۳۴۵۶۷', balance: '+۵۰۰٬۰۰۰',  status: 'بدهکار',   positive: true },
  { name: 'مریم کاظمی',  phone: '۰۷۸۸۷۶۵۴۳۲۱', balance: '-۱٬۲۰۰٬۰۰۰', status: 'بستانکار', positive: false },
  { name: 'علی محمدی',   phone: '۰۷۰۰۱۲۳۴۵۶۷', balance: '۰',          status: 'تسویه',    positive: null },
  { name: 'فاطمه حسینی', phone: '۰۷۷۷۹۸۷۶۵۴۳', balance: '+۳۲۰٬۰۰۰',  status: 'بدهکار',   positive: true },
  { name: 'حسین کریمی',  phone: '۰۷۴۴۵۶۷۸۹۰',  balance: '-۸۵٬۰۰۰',  status: 'بستانکار', positive: false },
];

// ── Reusable bits ──
function PageTitle({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary" strokeWidth={2} />
      </div>
      <div>
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
        {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

function TxRow({ tx }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.type === 'in' ? 'bg-success/10' : 'bg-destructive/10'}`}>
          {tx.type === 'in' ? <ArrowDownRight className="w-4 h-4 text-success" /> : <ArrowUpRight className="w-4 h-4 text-destructive" />}
        </div>
        <div>
          <p className="text-[11px] font-medium text-foreground leading-tight">{tx.label}</p>
          <p className="text-[9px] text-muted-foreground">{tx.time}</p>
        </div>
      </div>
      <p className={`text-[11px] font-bold ${tx.type === 'in' ? 'text-success' : 'text-destructive'}`}>
        {tx.type === 'in' ? '+' : '−'}{tx.amount} <span className="text-[9px] opacity-60">{tx.cur}</span>
      </p>
    </div>
  );
}

function StatTile({ label, value, icon: Icon, tone = 'default' }) {
  const toneClass = {
    default: 'text-foreground',
    success: 'text-success',
    danger:  'text-destructive',
    primary: 'text-primary',
  }[tone];
  return (
    <div className="rounded-xl border border-border bg-card p-2.5 text-center shadow-card">
      <Icon className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
      <p className={`text-sm font-bold ${toneClass}`}>{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}

// ══════════════════════════════════════
// PAGE PREVIEWS
// ══════════════════════════════════════

function DashboardPage() {
  return (
    <div className="space-y-3">
      <PageTitle icon={LayoutDashboard} title="داشبورد" subtitle="خلاصه عملیات امروز" />

      {/* ۱. خلاصهٔ مالی */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-4 text-white shadow-card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] opacity-70">موجودی کل (معادل افغانی)</p>
            <p className="text-2xl font-bold tracking-tight">{toPersian('۴٬۵۰۰٬۰۰۰')}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 rounded-lg bg-white/10 p-2">
            <div className="flex items-center gap-1 mb-0.5">
              <ArrowDownRight className="w-3 h-3 text-emerald-400" />
              <p className="text-[9px] opacity-70">ورودی امروز</p>
            </div>
            <p className="text-sm font-bold text-emerald-400">{toPersian('۲٬۷۰۰٬۰۰۰')}</p>
          </div>
          <div className="flex-1 rounded-lg bg-white/10 p-2">
            <div className="flex items-center gap-1 mb-0.5">
              <ArrowUpRight className="w-3 h-3 text-red-400" />
              <p className="text-[9px] opacity-70">خروجی امروز</p>
            </div>
            <p className="text-sm font-bold text-red-400">{toPersian('۱٬۲۸۰٬۰۰۰')}</p>
          </div>
        </div>
      </div>

      {/* ۲. آمار فشرده */}
      <div className="grid grid-cols-3 gap-2">
        <StatTile label="معاملات امروز" value={toPersian(12)} icon={ArrowLeftRight} />
        <StatTile label="مشتریان" value={toPersian(87)} icon={Users} />
        <StatTile label="بدهکاران" value={toPersian(14)} icon={TrendingDown} tone="danger" />
      </div>

      {/* ۳. عملیات سریع */}
      <div>
        <h4 className="text-[11px] font-bold text-muted-foreground mb-1.5">عملیات سریع</h4>
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: Repeat, label: 'خرید/فروش', color: 'text-violet-600 bg-violet-50' },
            { icon: Send, label: 'حواله', color: 'text-orange-600 bg-orange-50' },
            { icon: Banknote, label: 'صندوق', color: 'text-emerald-600 bg-emerald-50' },
            { icon: Users, label: 'مشتری', color: 'text-blue-600 bg-blue-50' },
          ].map((q, i) => {
            const Icon = q.icon;
            return (
              <button key={i} className="flex flex-col items-center gap-1.5">
                <div className={`w-11 h-11 rounded-xl ${q.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" strokeWidth={2} />
                </div>
                <span className="text-[9px] font-medium text-foreground">{q.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ۴. فعالیت‌های اخیر */}
      <div>
        <h4 className="text-[11px] font-bold text-muted-foreground mb-1.5">فعالیت‌های اخیر</h4>
        <Card className="shadow-card"><CardContent className="p-2">
          {MOCK_TXS.map((tx, i) => <TxRow key={i} tx={tx} />)}
        </CardContent></Card>
      </div>
    </div>
  );
}

function CustomersPage() {
  return (
    <div className="space-y-3">
      <PageTitle icon={Users} title="مشتریان" subtitle={toPersian(87) + ' مشتری'} />
      <div className="flex items-center gap-1.5 rounded-lg bg-muted px-2 py-2">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input placeholder="جستجوی نام یا تلفن..." className="flex-1 bg-transparent text-[11px] outline-none" />
        <Button size="sm" variant="ghost" className="h-7 px-2"><Plus className="w-4 h-4" /></Button>
      </div>
      <Card className="shadow-card"><CardContent className="p-0">
        {MOCK_CUSTOMERS.map((c, i) => (
          <div key={i} className={`flex items-center justify-between px-3 py-2.5 ${i < MOCK_CUSTOMERS.length - 1 ? 'border-b border-border' : ''}`}>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                {c.name.charAt(0)}
              </div>
              <div>
                <p className="text-[11px] font-medium text-foreground">{c.name}</p>
                <p className="text-[9px] text-muted-foreground" dir="ltr">{c.phone}</p>
              </div>
            </div>
            <div className="text-left">
              <p className={`text-[11px] font-bold ${c.positive === true ? 'text-success' : c.positive === false ? 'text-destructive' : 'text-muted-foreground'}`}>{c.balance}</p>
              <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${c.positive === true ? 'bg-success/10 text-success' : c.positive === false ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>{c.status}</span>
            </div>
          </div>
        ))}
      </CardContent></Card>
    </div>
  );
}

function TradePage() {
  return (
    <div className="space-y-3">
      <PageTitle icon={Repeat} title="خرید / فروش ارز" subtitle="ثبت معامله جدید" />
      <div className="grid grid-cols-2 gap-2">
        <button className="rounded-xl border-2 border-success bg-success/5 p-3 text-center">
          <ArrowDownRight className="w-6 h-6 text-success mx-auto mb-1" />
          <span className="text-xs font-bold text-success">خرید ارز</span>
        </button>
        <button className="rounded-xl border-2 border-destructive bg-destructive/5 p-3 text-center">
          <ArrowUpRight className="w-6 h-6 text-destructive mx-auto mb-1" />
          <span className="text-xs font-bold text-destructive">فروش ارز</span>
        </button>
      </div>
      <Card className="shadow-card"><CardContent className="p-3 space-y-2">
        <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">ارز</span><span className="font-medium">دلار آمریکا (USD)</span></div>
        <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">نرخ خرید</span><span className="font-bold text-success">۷۰ افغانی</span></div>
        <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">نرخ فروش</span><span className="font-bold text-destructive">۷۱ افغانی</span></div>
        <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">مقدار</span><span className="font-bold">۵۰۰ دلار</span></div>
      </CardContent></Card>
    </div>
  );
}

function DadogereftPage() {
  return (
    <div className="space-y-3">
      <PageTitle icon={Handshake} title="داد و گرفت" subtitle="مطالبات متقابل" />
      <div className="grid grid-cols-2 gap-2">
        <StatTile label="بدهکار به من" value={toPersian(14)} icon={TrendingUp} tone="success" />
        <StatTile label="بستانکار من" value={toPersian(6)} icon={TrendingDown} tone="danger" />
      </div>
      <Card className="shadow-card"><CardContent className="p-0">
        {MOCK_CUSTOMERS.slice(0, 4).map((c, i) => (
          <div key={i} className={`flex items-center justify-between px-3 py-2.5 ${i < 3 ? 'border-b border-border' : ''}`}>
            <span className="text-[11px] font-medium">{c.name}</span>
            <span className={`text-[11px] font-bold ${c.positive ? 'text-success' : 'text-destructive'}`}>{c.balance}</span>
          </div>
        ))}
      </CardContent></Card>
    </div>
  );
}

function CashPage() {
  const [cur, setCur] = useState('AFN');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [dialog, setDialog] = useState(null); // null | 'in' | 'out'
  const [curOpen, setCurOpen] = useState(false);

  const currency = DEFAULT_CURRENCIES.find(c => c.code === cur) || DEFAULT_CURRENCIES[0];

  const [txs, setTxs] = useState([
    { type: 'in',  label: 'افتتاح صندوق اصلی',     amount: '۵٬۰۰۰٬۰۰۰', cur: 'AFN', time: 'دیروز' },
    { type: 'out', label: 'پرداخت نقدی — احمد',     amount: '۱٬۲۰۰٬۰۰۰', cur: 'AFN', time: '۱۰:۳۰' },
    { type: 'in',  label: 'فروش دلار',             amount: '۵۰۰',       cur: 'USD', time: '۰۹:۱۵' },
    { type: 'out', label: 'انتقال به بانک کابل نو',  amount: '۲٬۰۰۰٬۰۰۰', cur: 'AFN', time: 'دیروز' },
    { type: 'in',  label: 'دریافت از بانک عزیزی',    amount: '۸۵۰',       cur: 'EUR', time: '۲ روز پیش' },
  ]);

  const [balances, setBalances] = useState({ AFN: 5000000, USD: 2300, EUR: 850, IRT: 45000000 });
  const [todayIn, setTodayIn]   = useState({ AFN: 2700000, USD: 1200,  EUR: 300, IRT: 0 });
  const [todayOut, setTodayOut] = useState({ AFN: 1280000, USD: 800,   EUR: 150, IRT: 0 });

  const fmt = (n) => toPersian(Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

  const handleSubmit = () => {
    const val = Number(amount);
    if (!val || val <= 0) return;
    const label = desc || (dialog === 'in' ? 'واریز نقدی' : 'برداشت نقدی');
    const newTx = { type: dialog, label, amount: fmt(val), cur, time: 'اکنون' };
    setTxs([newTx, ...txs]);
    if (dialog === 'in') {
      setBalances(b => ({ ...b, [cur]: (b[cur] || 0) + val }));
      setTodayIn(t => ({ ...t, [cur]: (t[cur] || 0) + val }));
    } else {
      setBalances(b => ({ ...b, [cur]: (b[cur] || 0) - val }));
      setTodayOut(t => ({ ...t, [cur]: (t[cur] || 0) + val }));
    }
    setAmount(''); setDesc(''); setDialog(null);
  };

  const openDialog = (mode) => { setDialog(mode); setAmount(''); setDesc(''); };

  const filteredTxs = txs.filter(t => t.cur === cur).slice(0, 6);

  return (
    <div className="space-y-2.5">
      {/* Currency dropdown selector */}
      <div className="relative">
        <button
          onClick={() => setCurOpen(!curOpen)}
          className="w-full flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2.5"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
              <Coins className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-bold text-foreground">{currency.name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground" dir="ltr">{currency.code} {currency.symbol}</span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${curOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>
        {curOpen && (
          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-card-hover max-h-56 overflow-y-auto scrollbar-thin">
            {DEFAULT_CURRENCIES.map(c => {
              const code = c.code;
              const active = code === cur;
              return (
                <button
                  key={code}
                  onClick={() => { setCur(code); setCurOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2 ${active ? 'bg-primary/10' : 'hover:bg-muted'}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <Coins className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-xs font-medium">{c?.name}</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground" dir="ltr">{c?.code} {c?.symbol}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Balance card — green */}
      <div className="rounded-2xl bg-emerald-500 p-4 text-white shadow-card">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-[10px] opacity-80">موجودی صندوق — {currency.name}</p>
            <p className="text-2xl font-bold tracking-tight mt-0.5">{fmt(balances[cur] || 0)}</p>
            <p className="text-[10px] opacity-70 mt-0.5" dir="ltr">{currency.code} {currency.symbol}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={() => openDialog('in')} className="flex-1 rounded-xl border border-white/30 bg-white/5 py-2 flex items-center justify-center gap-1.5">
            <Plus className="w-4 h-4" />
            <span className="text-[11px] font-medium">افزودن وجه</span>
          </button>
          <button onClick={() => openDialog('out')} className="flex-1 rounded-xl border border-white/30 bg-white/5 py-2 flex items-center justify-center gap-1.5">
            <Minus className="w-4 h-4" />
            <span className="text-[11px] font-medium">برداشت وجه</span>
          </button>
        </div>
      </div>

      {/* Today in/out */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border bg-card p-3 shadow-card">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-6 h-6 rounded-lg bg-success/10 flex items-center justify-center">
              <ArrowDownRight className="w-3.5 h-3.5 text-success" />
            </div>
            <span className="text-[10px] text-muted-foreground">ورودی امروز</span>
          </div>
          <p className="text-sm font-bold text-success">{fmt(todayIn[cur] || 0)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 shadow-card">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-6 h-6 rounded-lg bg-destructive/10 flex items-center justify-center">
              <ArrowUpRight className="w-3.5 h-3.5 text-destructive" />
            </div>
            <span className="text-[10px] text-muted-foreground">خروجی امروز</span>
          </div>
          <p className="text-sm font-bold text-destructive">{fmt(todayOut[cur] || 0)}</p>
        </div>
      </div>

      {/* Transaction list */}
      <div>
        <h4 className="text-[11px] font-bold text-muted-foreground mb-1.5">گردش صندوق — {currency.name}</h4>
        <Card className="shadow-card"><CardContent className="p-2">
          {filteredTxs.length > 0 ? (
            filteredTxs.map((tx, i) => <TxRow key={i} tx={tx} />)
          ) : (
            <p className="text-[10px] text-muted-foreground text-center py-3">گردشی ثبت نشده</p>
          )}
        </CardContent></Card>
      </div>

      {/* Inline operation sheet */}
      {dialog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setDialog(null)}>
          <div className="bg-card w-full max-w-sm rounded-t-2xl p-3 space-y-2" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold">{dialog === 'in' ? 'افزودن وجه' : 'برداشت وجه'}</h3>
              <button onClick={() => setDialog(null)} className="p-1"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-muted px-2 py-1.5">
              <Coins className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-medium">{currency.name}</span>
              <span className="text-[9px] text-muted-foreground mr-auto" dir="ltr">{currency.code} {currency.symbol}</span>
            </div>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="مبلغ" className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-xs" />
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="توضیحات (اختیاری)" className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-xs" />
            <button onClick={handleSubmit} disabled={!amount || Number(amount) <= 0} className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-xs font-medium disabled:opacity-50">ثبت</button>
          </div>
        </div>
      )}
    </div>
  );
}

function BankPage() {
  return (
    <div className="space-y-3">
      <PageTitle icon={Landmark} title="بانک‌ها" subtitle="موجودی حساب‌های بانکی" />
      <div className="grid grid-cols-2 gap-2">
        <StatTile label="موجودی کل" value={toPersian(12500000)} icon={Wallet} tone="primary" />
        <StatTile label="حساب‌ها" value={toPersian(5)} icon={Landmark} />
      </div>
      {['بانک کابل نو', 'بانک عزیزی', 'بانک بین‌المللی'].map((b, i) => (
        <Card key={i} className="shadow-card"><CardContent className="p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold">{b}</span>
            <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">AFN</span>
          </div>
          <p className="text-sm font-bold text-foreground">{toPersian([3500000, 2800000, 6200000][i])} افغانی</p>
        </CardContent></Card>
      ))}
    </div>
  );
}

function TransferPage() {
  return (
    <div className="space-y-3">
      <PageTitle icon={Send} title="حواله" subtitle="ارسال و دریافت حواله" />
      <div className="grid grid-cols-2 gap-2">
        <button className="rounded-xl border-2 border-primary bg-primary/5 p-3 text-center">
          <Send className="w-6 h-6 text-primary mx-auto mb-1" />
          <span className="text-xs font-bold">ارسال حواله</span>
        </button>
        <button className="rounded-xl border-2 border-primary bg-primary/5 p-3 text-center">
          <ArrowDownRight className="w-6 h-6 text-primary mx-auto mb-1" />
          <span className="text-xs font-bold">دریافت حواله</span>
        </button>
      </div>
      <Card className="shadow-card"><CardContent className="p-0">
        {MOCK_TXS.slice(0, 4).map((tx, i) => <TxRow key={i} tx={tx} />)}
      </CardContent></Card>
    </div>
  );
}

function ReportsPage() {
  return (
    <div className="space-y-3">
      <PageTitle icon={FileText} title="گزارش‌ها" subtitle="گزارش‌های مالی و عملیاتی" />
      {['گزارش روزانه', 'گزارش ماهانه', 'گزارش مشتریان', 'گزارش حواله‌ها', 'گزارش ارزی'].map((r, i) => (
        <button key={i} className="w-full flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5 shadow-card hover:border-primary/30">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-[11px] font-medium">{r}</span>
          </div>
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </button>
      ))}
    </div>
  );
}

function CurrenciesPage() {
  return (
    <div className="space-y-3">
      <PageTitle icon={Coins} title="ارز و نرخ" subtitle="مدیریت نرخ ارزها" />
      <Card className="shadow-card"><CardContent className="p-0">
        {DEFAULT_CURRENCIES.slice(0, 8).map((c, i) => (
          <div key={c.code} className={`flex items-center justify-between px-3 py-2 ${i < 7 ? 'border-b border-border' : ''}`}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold w-6 text-center">{c.symbol}</span>
              <div>
                <p className="text-[11px] font-medium">{c.name}</p>
                <p className="text-[8px] text-muted-foreground">{c.code}</p>
              </div>
            </div>
            <div className="text-left">
              <p className="text-[10px] font-bold text-success">خرید: {toPersian(c.buy_rate)}</p>
              <p className="text-[10px] font-bold text-destructive">فروش: {toPersian(c.sell_rate)}</p>
            </div>
          </div>
        ))}
      </CardContent></Card>
    </div>
  );
}

function GenericPage({ page }) {
  const Icon = page.icon;
  return (
    <div className="space-y-3">
      <PageTitle icon={Icon} title={page.label} subtitle="پیش‌نمایش نمونه" />
      <Card className="shadow-card"><CardContent className="p-4 text-center">
        <Icon className="w-12 h-12 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">این صفحه در پیش‌نمایش به‌صورت نمونه نمایش داده می‌شود.</p>
        <p className="text-[10px] text-muted-foreground mt-1">مسیر واقعی: {page.path}</p>
      </CardContent></Card>
    </div>
  );
}

// ── Page renderer ──
export function renderPage(pageKey) {
  const page = SARRAAF_PAGES.find(p => p.key === pageKey);
  if (!page) return null;
  switch (pageKey) {
    case 'dashboard':      return <DashboardPage />;
    case 'customers':      return <CustomersPage />;
    case 'trade':          return <TradePage />;
    case 'dadogereft':     return <DadogereftPage />;
    case 'cash':           return <CashPage />;
    case 'bank':           return <BankPage />;
    case 'transfer_send':
    case 'transfer_receive':
    case 'transfer_book':  return <TransferPage />;
    case 'reports':        return <ReportsPage />;
    case 'currencies':     return <CurrenciesPage />;
    case 'sarraaf_market': return <CurrenciesPage />;
    case 'convert':        return <TradePage />;
    default:               return <GenericPage page={page} />;
  }
}