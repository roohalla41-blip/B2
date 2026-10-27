// pricingService.js — Plan pricing, discount campaigns, and quota checks
import { offlineDB as db } from './offlineQueue';

// ── Default plans ──
export const DEFAULT_PLANS = [
  {
    plan_key: 'basic',
    name: 'پایه',
    price: 500,
    currency: 'AFN',
    duration_months: 1,
    sort_order: 0,
    is_active: true,
    description: 'برای صراف‌های کوچک و در حال رشد',
    features: [
      'تا ۱۰۰ مشتری',
      '۲ کاربر/کارمند',
      '۲ نمایندگی',
      '۱۰۰ حواله در روز',
      'خروجی PDF و Excel',
    ],
  },
  {
    plan_key: 'pro',
    name: 'حرفه‌ای',
    price: 1500,
    currency: 'AFN',
    duration_months: 1,
    sort_order: 1,
    is_active: true,
    description: 'پرطرفدارترین پلن برای صرافی‌های فعال',
    features: [
      'تا ۵۰۰ مشتری',
      '۵ کاربر/کارمند',
      '۵ نمایندگی',
      'حواله نامحدود',
      'معامله آنلاین در بازار نرخ',
      'چت خصوصی صراف‌با‌صراف',
      'گزارش‌های پیشرفته',
    ],
  },
  {
    plan_key: 'special',
    name: 'ویژه',
    price: 3000,
    currency: 'AFN',
    duration_months: 1,
    sort_order: 2,
    is_active: true,
    description: 'بدون محدودیت، تمام قابلیت‌ها',
    features: [
      'مشتری نامحدود',
      'کاربر نامحدود',
      'نمایندگی نامحدود',
      'تمام قابلیت‌ها بدون سقف',
      'درگاه پرداخت آنلاین',
      'API دسترسی',
      'بکاپ‌گیری خودکار',
    ],
  },
];

// ── Default free-tier quotas ──
export const DEFAULT_FREE_QUOTAS = {
  customers: 50,
  employees: 1,
  agents: 1,
  daily_transfers: 20,
  monthly_transactions: 200,
  currencies: 3,
  bank_accounts: 2,
  debtors: 30,
  pdf_exports: 5,
  excel_exports: 1,
  excel_rows: 50,
  online_products: 5,
};

const SETTING_KEY = 'discount_campaign';

// ── Pricing Plans ──
export async function getAllPlans() {
  const list = await db.PricingPlan.list('sort_order', 20);
  if (!list || list.length === 0) {
    await db.PricingPlan.bulkCreate(DEFAULT_PLANS);
    return [...DEFAULT_PLANS].sort((a, b) => a.sort_order - b.sort_order);
  }
  return list.filter(p => p.is_active !== false);
}

export async function getPlanByKey(planKey) {
  const plans = await getAllPlans();
  return plans.find(p => p.plan_key === planKey) || null;
}

export async function updatePlan(id, data) {
  await db.PricingPlan.update(id, data);
}

export async function createPlan(data) {
  return await db.PricingPlan.create(data);
}

// ── Discount Campaign ──
export async function getDiscountCampaign() {
  const list = await db.AppSetting.filter({ key: SETTING_KEY });
  if (!list || list.length === 0) return null;
  const record = list[0];
  const data = record.data || {};
  if (!data.active) return null;
  const now = new Date();
  const end = data.end_date ? new Date(data.end_date) : null;
  if (end && end < now) {
    return { ...data, expired: true };
  }
  return data;
}

export async function startDiscountCampaign({ percent = 30, durationHours = 48 }) {
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + durationHours * 3600 * 1000);
  const campaign = {
    active: true,
    percent,
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
    duration_hours: durationHours,
  };
  const existing = await db.AppSetting.filter({ key: SETTING_KEY });
  if (existing && existing.length > 0) {
    await db.AppSetting.update(existing[0].id, { value: 'active', data: campaign });
  } else {
    await db.AppSetting.create({ key: SETTING_KEY, value: 'active', data: campaign });
  }
  // Send notification to all sarraaf users
  await db.UserNotification.create({
    target_role: 'sarraaf',
    target_user_id: '',
    target_user_name: '',
    title: 'کمپین تخفیف ویژه',
    message: `تخفیف ${percent}٪ روی تمام پلن‌های پولی تا ${durationHours} ساعت آینده! همین حالا ارتقا دهید.`,
    kind: 'custom',
    read: false,
    sent_by_name: 'سیستم',
  });
  return campaign;
}

export async function stopDiscountCampaign() {
  const existing = await db.AppSetting.filter({ key: SETTING_KEY });
  if (existing && existing.length > 0) {
    const data = existing[0].data || {};
    await db.AppSetting.update(existing[0].id, {
      value: 'inactive',
      data: { ...data, active: false },
    });
  }
}

// ── Price Calculation ──
export function calculateDiscountedPrice(originalPrice, campaign) {
  if (!campaign || campaign.expired || !campaign.active) {
    return { final: originalPrice, discounted: false, discountAmount: 0 };
  }
  const discountAmount = Math.round(originalPrice * (campaign.percent / 100));
  return {
    final: originalPrice - discountAmount,
    discounted: true,
    discountAmount,
    percent: campaign.percent,
  };
}

// ── Time Remaining (for countdown) ──
export function getTimeRemaining(endDateStr) {
  if (!endDateStr) return null;
  const total = new Date(endDateStr).getTime() - new Date().getTime();
  if (total <= 0) return { hours: 0, minutes: 0, seconds: 0, expired: true };
  const hours = Math.floor(total / (1000 * 60 * 60));
  const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((total % (1000 * 60)) / 1000);
  return { hours, minutes, seconds, expired: false };
}

// ── Quota Defaults for Free Plan ──
export function getFreeQuota(key) {
  return DEFAULT_FREE_QUOTAS[key] ?? -1;
}

// ── Product Price Calculation (for PricingManager / PriceEditDialog) ──
export function computeFinalPrice(basePrice, pricingMode, pricingPercent) {
  const base = Number(basePrice) || 0;
  const pct = Number(pricingPercent) || 0;
  if (pricingMode === 'markup') {
    return Math.round(base * (1 + pct / 100));
  }
  if (pricingMode === 'discount') {
    return Math.round(base * (1 - pct / 100));
  }
  return base;
}

// ── Digital Products (for PricingManager) ──
const PRODUCTS_KEY = 'pricing_products_v2';
const HISTORY_KEY = 'pricing_history_v2';

const DEFAULT_CATEGORIES = [
  { key: 'recharge', name: 'شارژ' },
  { key: 'internet', name: 'اینترنت' },
  { key: 'games', name: 'بازی‌ها' },
  { key: 'transfer', name: 'حواله' },
  { key: 'custom', name: 'سایر' },
];

const DEFAULT_PRODUCTS = [
  { id: 'p1', name: 'شارژ افغانستان', category: 'recharge', category_name: 'شارژ', service_name: 'AWCC', product_type: 'Service', base_price: 100, currency: 'AFN', pricing_mode: 'markup', pricing_percent: 5, is_active: true, description: 'شارژ مستقیم' },
  { id: 'p2', name: 'بسته اینترنت هفتگی', category: 'internet', category_name: 'اینترنت', service_name: 'Roshan', product_type: 'Service', base_price: 250, currency: 'AFN', pricing_mode: 'markup', pricing_percent: 8, is_active: true, description: 'بسته هفتگی' },
  { id: 'p3', name: 'UC پابجی', category: 'games', category_name: 'بازی‌ها', service_name: 'PUBG', product_type: 'Game', base_price: 500, currency: 'AFN', pricing_mode: 'markup', pricing_percent: 10, is_active: true, description: 'یوسی پابجی' },
];

function productsGet() {
  try {
    const raw = localStorage.getItem(PRODUCTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function productsSet(items) {
  try { localStorage.setItem(PRODUCTS_KEY, JSON.stringify(items)); } catch { /* ignore */ }
}

function historyGet() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function historySet(items) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(items)); } catch { /* ignore */ }
}

export function seedProducts() {
  const existing = productsGet();
  if (!existing || existing.length === 0) {
    productsSet(DEFAULT_PRODUCTS);
  }
}

export function getAllProducts() {
  seedProducts();
  const items = productsGet();
  return items.map(p => ({
    ...p,
    final_price: computeFinalPrice(p.base_price, p.pricing_mode, p.pricing_percent),
  }));
}

export function getCategories() {
  return DEFAULT_CATEGORIES;
}

export function updateProduct(id, data, changedBy) {
  const items = productsGet();
  const idx = items.findIndex(p => p.id === id);
  if (idx === -1) return;
  const old = items[idx];
  const oldFinal = computeFinalPrice(old.base_price, old.pricing_mode, old.pricing_percent);
  const updated = { ...old, ...data };
  const newFinal = computeFinalPrice(updated.base_price, updated.pricing_mode, updated.pricing_percent);
  items[idx] = updated;
  productsSet(items);
  // Record history if price changed
  if (oldFinal !== newFinal) {
    const hist = historyGet();
    hist.unshift({
      id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      product_id: id,
      old_final_price: oldFinal,
      new_final_price: newFinal,
      old_percent: old.pricing_percent,
      new_percent: updated.pricing_percent,
      old_mode: old.pricing_mode,
      new_mode: updated.pricing_mode,
      changed_by: changedBy || '—',
      timestamp: new Date().toISOString(),
    });
    historySet(hist);
  }
}

export function deleteProduct(id) {
  productsSet(productsGet().filter(p => p.id !== id));
}

export function toggleProductActive(id, changedBy) {
  const items = productsGet();
  const idx = items.findIndex(p => p.id === id);
  if (idx === -1) return;
  items[idx].is_active = !items[idx].is_active;
  productsSet(items);
}

export function addProduct(data) {
  const items = productsGet();
  const product = {
    ...data,
    id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    base_price: Number(data.base_price) || 0,
    pricing_percent: Number(data.pricing_percent) || 0,
    final_price: computeFinalPrice(Number(data.base_price) || 0, data.pricing_mode, Number(data.pricing_percent) || 0),
  };
  items.unshift(product);
  productsSet(items);
}

export function getChangeHistory(productId) {
  const hist = historyGet();
  return hist.filter(h => h.product_id === productId);
}

// ── Convenience wrapper for customer-facing components ──
export function getFinalPrice(product) {
  if (!product) return 0;
  if (product.final_price != null) return product.final_price;
  return computeFinalPrice(product.base_price, product.pricing_mode, product.pricing_percent);
}