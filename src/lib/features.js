// features.js — feature catalog and helpers
export const FEATURE_CATALOG = [
  // Primary (6 main dashboard icons)
  { feature_key: 'dashboard', name: 'داشبورد', icon: 'LayoutDashboard', location: 'nav', display_order: 0, critical: true, is_primary: true },
  { feature_key: 'customers', name: 'مشتریان', icon: 'Users', location: 'nav', display_order: 1, critical: false, is_primary: true },
  { feature_key: 'transfers', name: 'حواله', icon: 'Send', location: 'nav', display_order: 2, critical: false, is_primary: true },
  { feature_key: 'convert', name: 'تبدیل ارز', icon: 'ArrowRightLeft', location: 'nav', display_order: 3, critical: false, is_primary: true },
  { feature_key: 'reports', name: 'گزارش‌ها', icon: 'FileText', location: 'nav', display_order: 4, critical: false, is_primary: true },
  { feature_key: 'cash', name: 'صندوق', icon: 'Banknote', location: 'nav', display_order: 5, critical: false, is_primary: true },
  // Secondary
  { feature_key: 'sarraaf_market', name: 'بازار نرخ صراف‌ها', icon: 'Store', location: 'nav', display_order: 6, critical: false, is_primary: true },
  { feature_key: 'sarraaf_chat', name: 'چت صراف‌ها', icon: 'MessageSquareMore', location: 'nav', display_order: 7, critical: false, is_primary: true },
  { feature_key: 'dadogereft', name: 'داد و گرفت', icon: 'ArrowLeftRight', location: 'nav', display_order: 8, critical: false },
  { feature_key: 'trade', name: 'خرید / فروش', icon: 'Repeat', location: 'nav', display_order: 9, critical: false },
  { feature_key: 'bank', name: 'بانک', icon: 'Landmark', location: 'nav', display_order: 10, critical: false },
  { feature_key: 'currencies', name: 'ارز و نرخ', icon: 'Coins', location: 'nav', display_order: 11, critical: false },
  { feature_key: 'profit_loss', name: 'سود و زیان', icon: 'TrendingUp', location: 'nav', display_order: 12, critical: false },
  { feature_key: 'debtors', name: 'بدهکاران', icon: 'Wallet', location: 'nav', display_order: 13, critical: false },
  { feature_key: 'agents', name: 'نمایندگی‌ها', icon: 'Network', location: 'nav', display_order: 14, critical: false },
  { feature_key: 'agency_network', name: 'شبکه نمایندگی', icon: 'Share2', location: 'nav', display_order: 15, critical: false },
  { feature_key: 'transfer_book', name: 'دفتر حواله', icon: 'BookOpen', location: 'nav', display_order: 16, critical: false },
  { feature_key: 'journal', name: 'دفتر روزنامه', icon: 'BookCopy', location: 'nav', display_order: 17, critical: false },
  { feature_key: 'general_ledger', name: 'دفتر کل', icon: 'ScrollText', location: 'nav', display_order: 18, critical: false },
  { feature_key: 'balance_sheet', name: 'ترازنامه', icon: 'Scale', location: 'nav', display_order: 19, critical: false, default_status: 'updating', default_message: 'بخش بدهی‌ها و سرمایه هنوز نیازمند تکمیل و تطبیق حسابداری است.' },
  { feature_key: 'reconciliation', name: 'مغایرت‌گیری', icon: 'FileSearch', location: 'nav', display_order: 20, critical: false },
  { feature_key: 'online_products', name: 'محصولات آنلاین', icon: 'ShoppingBag', location: 'nav', display_order: 21, critical: false },
  { feature_key: 'mobile_recharge', name: 'شارژ و بسته اینترنت', icon: 'Smartphone', location: 'action', display_order: 21.25, critical: false, default_status: 'updating', default_message: 'ثبت سفارش مستقیم و تأیید انجام شارژ هنوز کامل و ایمن نشده است.' },
  { feature_key: 'pubg_uc', name: 'UC پابجی موبایل', icon: 'Gamepad2', location: 'nav', display_order: 21.5, critical: false, default_status: 'updating', default_message: 'اتصال تأمین‌کننده و تحویل خودکار سفارش هنوز تأیید نشده است.' },
  { feature_key: 'payment_gateway', name: 'درگاه پرداخت', icon: 'CreditCard', location: 'nav', display_order: 22, critical: false, default_status: 'updating', default_message: 'درگاه بانکی در حال راه‌اندازی است.' },
  { feature_key: 'bank_gateway', name: 'درگاه بانکی', icon: 'Landmark', location: 'nav', display_order: 22.5, critical: false, default_status: 'updating', default_message: 'درگاه بانکی در حال راه‌اندازی است.' },
  { feature_key: 'chat_groups', name: 'چت و گروه‌ها', icon: 'MessageSquare', location: 'nav', display_order: 23, critical: false },
  { feature_key: 'payment_card', name: 'پرداخت کارت به کارت', icon: 'CreditCard', location: 'action', display_order: 30, critical: false, default_status: 'updating', default_message: 'کارت به کارت در حال راه‌اندازی است.' },
  { feature_key: 'payment_bank', name: 'پرداخت بانکی (درگاه)', icon: 'Landmark', location: 'action', display_order: 31, critical: false, default_status: 'updating', default_message: 'اتصال به ارائه‌دهندهٔ پرداخت واقعی هنوز فعال نشده است.' },
  { feature_key: 'payment_paypal', name: 'پرداخت پی‌پل', icon: 'Globe', location: 'action', display_order: 32, critical: false, default_status: 'updating', default_message: 'پی‌پل در حال راه‌اندازی است.' },
  { feature_key: 'payment_crypto', name: 'پرداخت ارز دیجیتال', icon: 'Bitcoin', location: 'action', display_order: 33, critical: false, default_status: 'updating', default_message: 'ارز دیجیتال در حال راه‌اندازی است.' },
  { feature_key: 'backup', name: 'بکاپ و بازیابی', icon: 'DatabaseBackup', location: 'nav', display_order: 26, critical: false },
  { feature_key: 'support', name: 'پشتیبانی آنلاین', icon: 'Headphones', location: 'nav', display_order: 27, critical: false },
  { feature_key: 'assistant', name: 'دستیار هوشمند', icon: 'Bot', location: 'nav', display_order: 27.5, critical: false, default_status: 'active' },
  { feature_key: 'settings', name: 'تنظیمات', icon: 'Settings', location: 'nav', display_order: 24, critical: true },
  { feature_key: 'main_settings', name: 'تنظیمات اصلی', icon: 'Shield', location: 'nav', display_order: 25, critical: true },
];

export const CRITICAL_FEATURES = FEATURE_CATALOG.filter(f => f.critical).map(f => f.feature_key);

// Capabilities known to be unavailable or unsafe for live transactions until completed.
// These are code-level guardrails: existing Supabase records and user data are untouched.
export const FORCED_UPDATING_FEATURES = {
  payment_gateway: 'اتصال به درگاه پرداخت واقعی هنوز فعال نیست؛ فعلاً پرداخت آنلاین انجام ندهید.',
  bank_gateway: 'اتصال به ارائه‌دهندهٔ بانکی واقعی هنوز فعال نیست.',
  payment_card: 'پرداخت کارت‌به‌کارت هنوز آمادهٔ استفادهٔ زنده نیست.',
  payment_bank: 'اتصال به ارائه‌دهندهٔ پرداخت واقعی هنوز فعال نیست.',
  payment_paypal: 'اتصال پی‌پل هنوز آمادهٔ استفاده نیست.',
  payment_crypto: 'پرداخت ارز دیجیتال هنوز آمادهٔ استفادهٔ زنده نیست.',
  balance_sheet: 'بخش بدهی‌ها و سرمایهٔ ترازنامه هنوز نیازمند تکمیل و تطبیق حسابداری است.',
  mobile_recharge: 'ثبت سفارش مستقیم و تأیید انجام شارژ هنوز کامل و ایمن نشده است.',
  pubg_uc: 'اتصال تأمین‌کننده و تحویل خودکار سفارش هنوز تأیید نشده است.',
};

const FEATURE_ALIASES = {
  transfer_send: 'transfers',
  transfer_receive: 'transfers',
};

function canonicalFeatureKey(key) {
  return FEATURE_ALIASES[key] || key;
}

function getFeatureRecord(features, key) {
  const canonicalKey = canonicalFeatureKey(key);
  return (features || []).find(f => f.feature_key === key)
    || (features || []).find(f => f.feature_key === canonicalKey);
}

function getCatalogRecord(key) {
  const canonicalKey = canonicalFeatureKey(key);
  return FEATURE_CATALOG.find(f => f.feature_key === key)
    || FEATURE_CATALOG.find(f => f.feature_key === canonicalKey);
}

export function getFeatureMessage(features, key) {
  if (FORCED_UPDATING_FEATURES[key]) return FORCED_UPDATING_FEATURES[key];
  const f = getFeatureRecord(features, key);
  return f?.message || getCatalogRecord(key)?.default_message
    || 'این بخش در حال به‌روزرسانی است و پس از تکمیل بررسی دوباره فعال خواهد شد.';
}

// Paid (premium) feature keys — gated by the 30-day trial.
// After the trial expires these icons lock; all other icons stay open.
export const PREMIUM_FEATURE_KEYS = [
  'journal',
  'general_ledger',
  'balance_sheet',
  'reconciliation',
  'profit_loss',
  'agents',
  'agency_network',
];

export function isFeatureEnabled(features, key) {
  // Keep incomplete items visible with an update notice rather than hiding them.
  if (FORCED_UPDATING_FEATURES[key]) return true;
  const canonicalKey = canonicalFeatureKey(key);
  const f = getFeatureRecord(features, key);
  if (!f) return true; // Keep visible if there is no DB row; status labels are code-defined.
  if (CRITICAL_FEATURES.includes(canonicalKey)) return true; // Critical accounting/system icons remain visible.
  if (f.status === 'disabled') return false;
  return f.enabled !== false;
}

export function getFeatureStatus(features, key) {
  if (FORCED_UPDATING_FEATURES[key]) return 'updating';
  const canonicalKey = canonicalFeatureKey(key);
  const f = getFeatureRecord(features, key);
  if (CRITICAL_FEATURES.includes(canonicalKey)) return 'active';
  return f?.status || getCatalogRecord(key)?.default_status || 'active';
}

export function isFeatureUpdating(features, key) {
  return getFeatureStatus(features, key) === 'updating';
}

export function visibleNavItems(features, allItems, profile, paidSystemEnabled = true) {
  return allItems
    .filter(item => isFeatureEnabled(features, item.featureKey))
    .filter(item => {
      // Forced update notices must remain visible regardless of plan flags.
      if (FORCED_UPDATING_FEATURES[item.featureKey]) return true;
      if (paidSystemEnabled === false) return true;
      const f = getFeatureRecord(features, item.featureKey);
      if (!f) return true;
      const plan = profile?.plan || 'free';
      const paidEnd = profile?.paid_end_date || profile?.quota_end_date;
      let isPaid = false;
      if (plan !== 'free' && paidEnd) {
        isPaid = new Date(paidEnd) >= new Date();
      } else if (plan !== 'free' && !paidEnd) {
        isPaid = true;
      }
      if (isPaid) return f.paid_enabled !== false;
      return f.free_enabled !== false;
    })
    .map(item => ({
      ...item,
      featureStatus: getFeatureStatus(features || [], item.featureKey),
      featureMessage: getFeatureMessage(features || [], item.featureKey),
    }))
    .sort((a, b) => {
      const fa = getFeatureRecord(features, a.featureKey);
      const fb = getFeatureRecord(features, b.featureKey);
      return (fa?.display_order ?? a.order) - (fb?.display_order ?? b.order);
    });
}