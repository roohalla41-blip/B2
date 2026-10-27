// توابع کمکی مشترک محیط آزمایشی
export const fmt = (n) => Number(n || 0).toLocaleString('fa-IR');
export const faDate = (iso) => iso ? new Date(iso).toLocaleString('fa-IR') : '-';

export function disputeWindowEnd(completedAtISO, hours) {
  if (!completedAtISO) return null;
  const d = new Date(completedAtISO);
  d.setHours(d.getHours() + (hours || 4));
  return d.toISOString();
}

export function isWindowExpired(completedAtISO, hours) {
  const end = disputeWindowEnd(completedAtISO, hours);
  if (!end) return false;
  return new Date() > new Date(end);
}

// دادهٔ فروشگاه آزمایشی — دسته‌بندی خدمات و قابلیت‌های قابل فروش در Sandbox
export const sandboxShopData = [
  { key: 'recharge_awcc', name: 'شارژ AWCC ۱۰۰ افغانی', amount: 100, category: 'recharge', operator: 'AWCC' },
  { key: 'recharge_roshan', name: 'شارژ Roshan ۲۰۰ افغانی', amount: 200, category: 'recharge', operator: 'Roshan' },
  { key: 'uc_60', name: '۶۰ UC پابجی موبایل', amount: 90, category: 'games', operator: 'PUBG' },
  { key: 'uc_325', name: '۳۲۵ UC پابجی موبایل', amount: 450, category: 'games', operator: 'PUBG' },
  { key: 'imo_100', name: '۱۰۰ الماس IMO', amount: 120, category: 'games', operator: 'IMO' },
  { key: 'net_5gb', name: 'بسته اینترنت ۵ گیگابایت', amount: 250, category: 'internet', operator: 'Etisalat' },
];

export const SHOP_CATEGORIES = [
  { key: 'recharge', label: 'شارژ موبایل', icon: '📱' },
  { key: 'games', label: 'بازی و سرگرمی', icon: '🎮' },
  { key: 'internet', label: 'بسته اینترنت', icon: '🌐' },
];