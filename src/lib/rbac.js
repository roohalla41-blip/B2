// ============================================================
// rbac.js — سیستم متمرکز کنترل دسترسی مبتنی بر نقش (RBAC)
// قابل انتقال به هر پلتفرم — وابسته به Base44 نیست
// ============================================================

// ── تعریف نقش‌ها و سلسله‌مراتب ──
export const ROLES = {
  creator: { level: 100, label: 'سازنده سیستم', panel: 'builder' },
  admin: { level: 80, label: 'مدیر صرافی', panel: 'sarraaf' },
  sarraaf: { level: 50, label: 'صراف', panel: 'sarraaf' },
  employee: { level: 30, label: 'کارمند صراف', panel: 'sarraaf' },
  customer: { level: 10, label: 'مشتری', panel: 'customer' },
  user: { level: 0, label: 'کاربر عادی', panel: 'public' },
};

export const ROLE_LEVELS = Object.fromEntries(
  Object.entries(ROLES).map(([k, v]) => [k, v.level])
);

export function getRoleLevel(role) {
  return ROLE_LEVELS[role] ?? 0;
}

export function getRoleLabel(role) {
  return ROLES[role]?.label || 'کاربر';
}

export function getRolePanel(role) {
  return ROLES[role]?.panel || 'public';
}

// ── نگاشت نقش بک‌اند → فرانت‌اند ──
// بک‌اند از 'exchange' استفاده می‌کند، فرانت‌اند از 'sarraaf'.
// این تابع نقش‌ها را به‌صورت مرکزی و یکسان نگاشت می‌کند.
export function normalizeRole(role) {
  if (role === 'exchange') return 'sarraaf';
  return role;
}

// مسیر خانه هر نقش
export const HOME_BY_ROLE = {
  creator: '/builder',
  admin: '/dashboard',
  sarraaf: '/dashboard',
  employee: '/dashboard',
  customer: '/customer',
  user: '/',
};

// ── ماتریس دسترسی به مسیرها (Routes) ──
// هر مسیر: نقش‌های مجاز برای دسترسی
// اگر مسیری در این لیست نباشد، پیش‌فرض برای همه نقش‌های احراز‌هویت‌شده باز است
export const ROUTE_PERMISSIONS = {
  // ── پنل سازنده (فقط creator) ──
  '/builder': ['creator'],
  '/main-settings': ['creator'],

  // ── پنل صراف — مدیریت (admin + creator + sarraaf) ──
  '/currencies': ['creator', 'admin', 'sarraaf'],
  '/agents': ['creator', 'admin', 'sarraaf'],
  '/agency-network': ['creator', 'admin', 'sarraaf'],
  '/backup': ['creator', 'admin', 'sarraaf'],
  '/balance-sheet': ['creator', 'admin', 'sarraaf'],
  '/reconciliation': ['creator', 'admin', 'sarraaf'],
  '/journal': ['creator', 'admin', 'sarraaf'],
  '/general-ledger': ['creator', 'admin', 'sarraaf'],
  '/journal-entry': ['creator', 'admin', 'sarraaf'],
  '/profit-loss': ['creator', 'admin', 'sarraaf'],
  '/debtors': ['creator', 'admin', 'sarraaf'],

  // ── پنل صراف — عملیاتی (admin + creator + sarraaf) ──
  '/dashboard': ['creator', 'admin', 'sarraaf', 'employee'],
  '/customers': ['creator', 'admin', 'sarraaf', 'employee'],
  '/dadogereft': ['creator', 'admin', 'sarraaf', 'employee'],
  '/trade': ['creator', 'admin', 'sarraaf', 'employee'],
  '/transfers/send': ['creator', 'admin', 'sarraaf', 'employee'],
  '/transfers/receive': ['creator', 'admin', 'sarraaf', 'employee'],
  '/cash': ['creator', 'admin', 'sarraaf', 'employee'],
  '/bank': ['creator', 'admin', 'sarraaf', 'employee'],
  '/reports': ['creator', 'admin', 'sarraaf', 'employee'],
  '/transfer-book': ['creator', 'admin', 'sarraaf', 'employee'],
  '/convert': ['creator', 'admin', 'sarraaf', 'employee'],
  '/support': ['creator', 'admin', 'sarraaf', 'employee'],
  '/assistant': ['creator', 'admin', 'sarraaf', 'employee'],

  // ── پنل صراف — اجتماعی/بازار (admin + creator + sarraaf) ──
  '/sarraaf-market': ['creator', 'admin', 'sarraaf'],
  '/sarraaf-chat': ['creator', 'admin', 'sarraaf'],
  '/chat': ['creator', 'admin', 'sarraaf'],
  '/agency': ['creator', 'admin', 'sarraaf'],

  // ── تنظیمات ──
  '/settings': ['creator', 'admin', 'sarraaf', 'employee'],
  '/notifications': ['creator', 'admin', 'sarraaf', 'employee'],

  // ── محصولات آنلاین ──
  '/online-products': ['creator', 'admin', 'sarraaf'],
  '/online-products/wallet': ['creator', 'admin', 'sarraaf'],
  '/online-products/recharge': ['creator', 'admin', 'sarraaf'],
  '/online-products/games': ['creator', 'admin', 'sarraaf'],

  // ── درگاه پرداخت ──
  '/payment-gateway': ['creator', 'admin', 'sarraaf'],

  // ── رسید (همه نقش‌های احراز‌هویت‌شده) ──
  '/receipt': ['creator', 'admin', 'sarraaf', 'employee', 'customer'],
};

// ── آیتم‌های منوی پنل صراف بر اساس نقش ──
// creator: همه + builder + main-settings
// admin: همه به جز builder/main-settings
// sarraaf: عملیاتی + اجتماعی، بدون مدیریت
// employee: عملیاتی محدود
export const SARRAAF_NAV_BY_ROLE = {
  creator: [
    'dashboard', 'customers', 'dadogereft', 'trade', 'transfer_send', 'transfer_receive',
    'cash', 'bank', 'currencies', 'reports', 'profit_loss', 'debtors', 'agents',
    'agency_network', 'transfer_book', 'journal', 'general_ledger', 'convert',
    'online_products', 'payment_gateway', 'settings', 'sarraaf_market', 'sarraaf_chat',
    'chat_groups', 'backup', 'support', 'assistant', 'notifications',
  ],
  admin: [
    'dashboard', 'customers', 'dadogereft', 'trade', 'transfer_send', 'transfer_receive',
    'cash', 'bank', 'currencies', 'reports', 'profit_loss', 'debtors', 'agents',
    'agency_network', 'transfer_book', 'journal', 'general_ledger', 'convert',
    'online_products', 'payment_gateway', 'settings', 'sarraaf_market', 'sarraaf_chat',
    'chat_groups', 'backup', 'support', 'assistant', 'notifications',
  ],
  sarraaf: [
    'dashboard', 'customers', 'dadogereft', 'trade', 'transfer_send', 'transfer_receive',
    'cash', 'bank', 'currencies', 'reports', 'profit_loss', 'debtors', 'agents',
    'agency_network', 'transfer_book', 'journal', 'general_ledger', 'convert',
    'online_products', 'payment_gateway', 'settings', 'sarraaf_market', 'sarraaf_chat',
    'chat_groups', 'backup', 'support', 'assistant', 'notifications',
  ],
  employee: [
    'dashboard', 'customers', 'dadogereft', 'trade', 'transfer_send', 'transfer_receive',
    'cash', 'reports', 'transfer_book', 'convert', 'support', 'assistant', 'notifications',
  ],
};

// ── کارت‌های داشبورد پنل صراف بر اساس نقش ──
export const SARRAAF_DASHBOARD_LINKS_BY_ROLE = {
  creator: 'all',
  admin: 'all',
  sarraaf: 'all',
  employee: [
    'customers', 'trade', 'dadogereft', 'cash', 'transfer_book', 'convert', 'reports',
  ],
};

// ── آیتم‌های منوی پنل مشتری ──
export const CUSTOMER_NAV = [
  'home', 'wallet', 'recharge', 'games', 'transfer', 'account',
  'orders', 'messages', 'support', 'notifications', 'profile',
];

// ── منوی تنظیمات پنل صراف بر اساس نقش ──
export const SETTINGS_MENU_BY_ROLE = {
  creator: [
    { label: 'مدیریت ارزها', path: '/currencies' },
    { label: 'محصولات آنلاین', path: '/online-products' },
    { label: 'اعلان‌ها', path: '/notifications' },
    { label: 'بکاپ و بازیابی', path: '/backup' },
  ],
  admin: [
    { label: 'مدیریت ارزها', path: '/currencies' },
    { label: 'محصولات آنلاین', path: '/online-products' },
    { label: 'اعلان‌ها', path: '/notifications' },
    { label: 'بکاپ و بازیابی', path: '/backup' },
  ],
  sarraaf: [
    { label: 'مدیریت ارزها', path: '/currencies' },
    { label: 'محصولات آنلاین', path: '/online-products' },
    { label: 'اعلان‌ها', path: '/notifications' },
    { label: 'بکاپ و بازیابی', path: '/backup' },
  ],
  employee: [
    { label: 'اعلان‌ها', path: '/notifications' },
  ],
};

// ── توابع کمکی ──

// آیا کاربر با این نقش به این مسیر دسترسی دارد؟
export function canAccessRoute(role, path) {
  // تطبیق دقیق
  if (ROUTE_PERMISSIONS[path]) {
    return ROUTE_PERMISSIONS[path].includes(role);
  }
  // تطبیق پیشوند (مثلاً /transfers/send -> /transfers)
  const prefix = '/' + path.split('/')[1];
  if (ROUTE_PERMISSIONS[prefix]) {
    return ROUTE_PERMISSIONS[prefix].includes(role);
  }
  // مسیرهای پنل مشتری
  if (path.startsWith('/customer')) {
    return role === 'customer';
  }
  // مسیرهای عمومی (بدون احراز هویت)
  if (['/', '/login', '/register', '/forgot-password', '/reset-password', '/setup-database'].includes(path)) {
    return true;
  }
  // پیش‌فرض: مسیر ناشناخته — دسترسی مجاز نیست
  return false;
}

// آیا نقش کاربر بالاتر یا مساوی نقش هدف است؟
export function hasMinimumRole(userRole, requiredRole) {
  return getRoleLevel(userRole) >= getRoleLevel(requiredRole);
}

// آیا کاربر نقش مدیریتی دارد؟
export function isManagementRole(role) {
  return ['creator', 'admin'].includes(role);
}

// آیا کاربر نقش پنل صراف دارد؟
export function isSarraafRole(role) {
  return ['creator', 'admin', 'sarraaf', 'employee'].includes(role);
}

// آیا کاربر نقش مشتری دارد؟
export function isCustomerRole(role) {
  return role === 'customer';
}

// لیست آیتم‌های منوی مجاز برای نقش
export function getAllowedNavItems(role, allItems) {
  const allowedKeys = SARRAAF_NAV_BY_ROLE[role] || [];
  if (role === 'creator' || role === 'admin') {
    // creator و admin به همه آیتم‌ها دسترسی دارند
    return allItems;
  }
  return allItems.filter(item => allowedKeys.includes(item.featureKey));
}

// لیست کارت‌های داشبورد مجاز برای نقش
export function getAllowedDashboardLinks(role, allLinks) {
  const allowed = SARRAAF_DASHBOARD_LINKS_BY_ROLE[role];
  if (allowed === 'all') return allLinks;
  return allLinks.filter(link => {
    const key = link.path.replace('/', '').replace(/-/g, '_');
    return allowed.includes(key);
  });
}

// لیست منوی تنظیمات مجاز برای نقش
export function getAllowedSettingsMenu(role) {
  return SETTINGS_MENU_BY_ROLE[role] || [];
}