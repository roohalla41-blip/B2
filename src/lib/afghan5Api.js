// afghan5Api.js — خرید بسته از افغان۵ با کیف پول حساب صراف
//
// مدیر نشانی نمایشی حساب افغان۵ و قیمت بسته‌ها را دستی تعیین می‌کند.
// کاربران با موجودی کیف پول سفارش می‌دهند؛ مدیر خرید را در افغان۵ انجام و وضعیت را ثبت می‌کند.

import { createSupabaseEntity } from './supabaseApi';

const sbProduct = createSupabaseEntity('OnlineProduct');
const sbOrder = createSupabaseEntity('OnlineOrder');
const sbWallet = createSupabaseEntity('Wallet');
const sbWalletTx = createSupabaseEntity('WalletTransaction');
const sbSetting = createSupabaseEntity('AppSetting');
const sbNotification = createSupabaseEntity('UserNotification');

export const AFGHAN5_SERVICE_KEY = 'afghan5';
export const AFGHAN5_DEFAULT_CURRENCY = 'AFN';
export const AFGHAN5_SETTING_KEY = 'afghan5_account_url';

// ── Settings: afghan5 display URL ──
export async function loadAfghan5Url() {
  const items = await sbSetting.filter({ key: AFGHAN5_SETTING_KEY });
  return items[0] || null;
}

export async function saveAfghan5Url(url) {
  const existing = await loadAfghan5Url();
  if (existing) {
    return await sbSetting.update(existing.id, { value: url });
  }
  return await sbSetting.create({ key: AFGHAN5_SETTING_KEY, value: url });
}

// ── Service (category) ──
export async function ensureAfghan5Service() {
  const items = await sbProduct.filter({ key: AFGHAN5_SERVICE_KEY, level: 'category' });
  if (items[0]) return items[0];
  return await sbProduct.create({
    key: AFGHAN5_SERVICE_KEY,
    name: 'افغان۵',
    icon: '🌐',
    level: 'category',
    description: 'خرید بسته از افغان۵ با موجودی کیف پول',
    enabled: true,
    display_order: 0,
    account_fields: [
      { key: 'phone', label: 'شماره تلفن', required: true, placeholder: 'شماره تلفن مقصد' },
    ],
  });
}

// ── Default packages with real market prices (AWCC + Etisalat + Roshan + ATOMA + Salam) ──
export const AFGHAN5_DEFAULT_PACKAGES = [
  // AWCC — Afghan Wireless (افغان بیسیم) — ۱۰٪ تخفیف اعمال شده
  { name: 'روزانه ۱۱۰ مگابایت', price: 9, currency: 'AFN', amount: '110MB', description: 'AWCC — بسته روزانه، اعتبار ۱ روز', display_order: 1 },
  { name: 'روزانه ۴۵۰ مگابایت', price: 27, currency: 'AFN', amount: '450MB', description: 'AWCC — بسته روزانه، اعتبار ۱ روز', display_order: 2 },
  { name: 'روزانه ۱ گیگابایت', price: 45, currency: 'AFN', amount: '1GB', description: 'AWCC — بسته روزانه، اعتبار ۱ روز', display_order: 3 },
  { name: 'روزانه ۳ گیگابایت', price: 81, currency: 'AFN', amount: '3GB', description: 'AWCC — بسته روزانه، اعتبار ۱ روز', display_order: 4 },
  { name: 'هفته‌وار ۱.۵ گیگابایت', price: 99, currency: 'AFN', amount: '1.5GB', description: 'AWCC — بسته هفتگی، اعتبار ۷ روز', display_order: 10 },
  { name: 'هفته‌وار ۳ گیگابایت', price: 179, currency: 'AFN', amount: '3GB', description: 'AWCC — بسته هفتگی، اعتبار ۷ روز', display_order: 11 },
  { name: 'ماهانه ۱ گیگابایت', price: 86, currency: 'AFN', amount: '1GB', description: 'AWCC — بسته ماهانه، اعتبار ۳۰ روز', display_order: 20 },
  { name: 'ماهانه ۲ گیگابایت', price: 162, currency: 'AFN', amount: '2GB', description: 'AWCC — بسته ماهانه، اعتبار ۳۰ روز', display_order: 21 },
  { name: 'ماهانه ۵ گیگابایت', price: 315, currency: 'AFN', amount: '5GB', description: 'AWCC — بسته ماهانه، اعتبار ۳۰ روز', display_order: 22 },
  { name: 'ماهانه ۸ گیگابایت', price: 450, currency: 'AFN', amount: '8GB', description: 'AWCC — بسته ماهانه، اعتبار ۳۰ روز', display_order: 23 },
  { name: 'ماهانه ۱۳ گیگابایت', price: 540, currency: 'AFN', amount: '13GB', description: 'AWCC — بسته ماهانه، اعتبار ۳۰ روز', display_order: 24 },
  { name: 'ماهانه ۲۶ گیگابایت', price: 629, currency: 'AFN', amount: '26GB', description: 'AWCC — بسته ماهانه + ۵۰٪ شبانه، اعتبار ۳۰ روز', display_order: 25 },
  { name: 'ماهانه ۴۶ گیگابایت', price: 989, currency: 'AFN', amount: '46GB', description: 'AWCC — بسته ماهانه + ۵۰٪ شبانه، اعتبار ۳۰ روز', display_order: 26 },
  { name: 'ماهانه ۱۰۰ گیگابایت', price: 2700, currency: 'AFN', amount: '100GB', description: 'AWCC — بسته ماهانه، اعتبار ۳۰ روز', display_order: 27 },
  // Etisalat (اتصالات) — ۱۰٪ تخفیف
  { name: 'اتصالات — روزانه ۱ گیگ', price: 54, currency: 'AFN', amount: '1GB', description: 'Etisalat — بسته روزانه، اعتبار ۱ روز', display_order: 30 },
  { name: 'اتصالات — هفته‌وار ۲ گیگ', price: 135, currency: 'AFN', amount: '2GB', description: 'Etisalat — بسته هفتگی، اعتبار ۷ روز', display_order: 31 },
  { name: 'اتصالات — ماهانه ۵ گیگ', price: 342, currency: 'AFN', amount: '5GB', description: 'Etisalat — بسته ماهانه، اعتبار ۳۰ روز', display_order: 32 },
  { name: 'اتصالات — ماهانه ۱۰ گیگ', price: 495, currency: 'AFN', amount: '10GB', description: 'Etisalat — بسته ماهانه، اعتبار ۳۰ روز', display_order: 33 },
  { name: 'اتصالات — ماهانه ۲۰ گیگ', price: 855, currency: 'AFN', amount: '20GB', description: 'Etisalat — بسته ماهانه، اعتبار ۳۰ روز', display_order: 34 },
  // Roshan (روشن) — ۱۰٪ تخفیف
  { name: 'روشن — روزانه ۱ گیگ', price: 50, currency: 'AFN', amount: '1GB', description: 'Roshan — بسته روزانه، اعتبار ۱ روز', display_order: 40 },
  { name: 'روشن — هفته‌وار ۲ گیگ', price: 126, currency: 'AFN', amount: '2GB', description: 'Roshan — بسته هفتگی، اعتبار ۷ روز', display_order: 41 },
  { name: 'روشن — ماهانه ۵ گیگ', price: 324, currency: 'AFN', amount: '5GB', description: 'Roshan — بسته ماهانه، اعتبار ۳۰ روز', display_order: 42 },
  { name: 'روشن — ماهانه ۱۰ گیگ', price: 522, currency: 'AFN', amount: '10GB', description: 'Roshan — بسته ماهانه، اعتبار ۳۰ روز', display_order: 43 },
  { name: 'روشن — ماهانه ۲۵ گیگ', price: 1080, currency: 'AFN', amount: '25GB', description: 'Roshan — بسته ماهانه، اعتبار ۳۰ روز', display_order: 44 },
  // ATOMA (اتوما) — ۱۰٪ تخفیف
  { name: 'اتوما — ساعتی ۱ گیگ', price: 23, currency: 'AFN', amount: '1GB', description: 'ATOMA — بسته ساعتی، اعتبار ۱ ساعت', display_order: 50 },
  { name: 'اتوما — روزانه ۱ گیگ', price: 45, currency: 'AFN', amount: '1GB', description: 'ATOMA — بسته روزانه، اعتبار ۱ روز', display_order: 51 },
  { name: 'اتوما — ماهانه ۵ گیگ', price: 315, currency: 'AFN', amount: '5GB', description: 'ATOMA — بسته ماهانه، اعتبار ۳۰ روز', display_order: 52 },
  { name: 'اتوما — ماهانه ۳۵ گیگ', price: 1440, currency: 'AFN', amount: '35GB', description: 'ATOMA — بسته ماهانه، اعتبار ۳۰ روز', display_order: 53 },
  // Salam (سلام) — ۱۰٪ تخفیف
  { name: 'سلام — روزانه ۱ گیگ', price: 45, currency: 'AFN', amount: '1GB', description: 'Salam — بسته روزانه، اعتبار ۱ روز', display_order: 60 },
  { name: 'سلام — هفته‌وار ۲ گیگ', price: 117, currency: 'AFN', amount: '2GB', description: 'Salam — بسته هفتگی، اعتبار ۷ روز', display_order: 61 },
  { name: 'سلام — ماهانه ۵ گیگ', price: 306, currency: 'AFN', amount: '5GB', description: 'Salam — بسته ماهانه، اعتبار ۳۰ روز', display_order: 62 },
  { name: 'سلام — ماهانه ۱۰ گیگ', price: 504, currency: 'AFN', amount: '10GB', description: 'Salam — بسته ماهانه، اعتبار ۳۰ روز', display_order: 63 },
];

// ── Apply 10% discount to all existing packages in DB ──
export async function applyDiscountToExistingPackages(discountPercent = 10) {
  const packages = await loadAfghan5Packages();
  const factor = (100 - discountPercent) / 100;
  let updated = 0;
  for (const pkg of packages || []) {
    if (pkg.price == null) continue;
    const newPrice = Math.round(pkg.price * factor);
    if (newPrice !== pkg.price) {
      await sbProduct.update(pkg.id, { price: newPrice });
      updated++;
    }
  }
  return { updated, total: (packages || []).length };
}

// ── Seed default packages (skips names that already exist) ──
export async function seedDefaultAfghan5Packages() {
  const existing = await loadAfghan5Packages();
  const existingNames = new Set((existing || []).map(p => p.name));
  const toCreate = AFGHAN5_DEFAULT_PACKAGES.filter(p => !existingNames.has(p.name));
  const created = [];
  for (const pkg of toCreate) {
    try {
      const rec = await createAfghan5Package({ ...pkg, enabled: true });
      created.push(rec);
    } catch { /* skip on error */ }
  }
  return { created: created.length, skipped: existingNames.size };
}

// ── Packages ──
export async function loadAfghan5Packages() {
  return await sbProduct.filter({ parent_key: AFGHAN5_SERVICE_KEY, level: 'product' }, 'display_order', 200);
}

export async function createAfghan5Package(data) {
  return await sbProduct.create({
    ...data,
    parent_key: AFGHAN5_SERVICE_KEY,
    level: 'product',
    enabled: data.enabled !== false,
  });
}

export async function updateAfghan5Package(id, data) {
  return await sbProduct.update(id, data);
}

export async function deleteAfghan5Package(id) {
  await sbProduct.delete(id);
}

// ── Customer: submit order (atomic wallet deduction) ──
export async function submitAfghan5Order(payload) {
  const amount = payload.amount || 0;
  const currency = payload.currency || AFGHAN5_DEFAULT_CURRENCY;

  // Find wallet and check balance
  const wallets = await sbWallet.filter({ user_id: payload.user_id });
  const wallet = (wallets || []).find(w => w.currency === currency);
  if (!wallet) throw new Error('wallet_not_found');
  if ((wallet.balance || 0) < amount) throw new Error('insufficient_balance');

  // Deduct from wallet
  const newBalance = (wallet.balance || 0) - amount;
  await sbWallet.update(wallet.id, { balance: newBalance });

  // Create order
  const order = await sbOrder.create({
    product_key: AFGHAN5_SERVICE_KEY,
    product_name: payload.package_name || '',
    category_key: AFGHAN5_SERVICE_KEY,
    fields: {
      phone: payload.phone || '',
      package_name: payload.package_name || '',
      package_description: payload.package_description || '',
    },
    total: amount,
    currency,
    payment_method: 'wallet',
    wallet_id: wallet.id,
    status: 'pending',
    notes: payload.description || '',
  });

  // Audit trail
  try {
    await sbWalletTx.create({
      wallet_id: wallet.id,
      user_id: payload.user_id,
      type: 'debit',
      amount,
      currency,
      reason: 'afghan5_order',
      actor_name: payload.user_name || 'مشتری',
      status: 'completed',
    });
  } catch { /* non-critical */ }

  return order;
}

export async function loadMyAfghan5Orders(userId) {
  return await sbOrder.filter({ category_key: AFGHAN5_SERVICE_KEY, created_by_id: userId }, '-created_date', 100);
}

export async function loadAllAfghan5Orders() {
  return await sbOrder.filter({ category_key: AFGHAN5_SERVICE_KEY }, '-created_date', 500);
}

// ── Notification helper ──
async function sendOrderNotification(order, status, reviewerName) {
  const pkgName = order.product_name || 'بسته افغان۵';
  const time = new Date().toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' });
  let title, message, kind;
  if (status === 'completed') {
    title = `بسته ${pkgName} تحویل شد`;
    message = `سفارش ${pkgName} شما با موفقیت در افغان۵ انجام شد. زمان: ${time}`;
    kind = 'paid_activated';
  } else if (status === 'approved') {
    title = `سفارش ${pkgName} در حال انجام است`;
    message = `سفارش ${pkgName} شما تأیید شد و در حال خرید از افغان۵ است. زمان: ${time}`;
    kind = 'general';
  } else {
    title = `سفارش ${pkgName} رد شد`;
    message = `متأسفانه سفارش ${pkgName} رد شد و مبلغ به کیف پول شما بازگردانده شد. زمان: ${time}`;
    kind = 'account_limitation';
  }
  try {
    await sbNotification.create({
      target_user_id: order.created_by_id,
      target_role: 'customer',
      title,
      message,
      kind,
      sent_by_name: reviewerName,
      read: false,
    });
  } catch { /* non-critical */ }
}

// ── Creator: approve order (start purchasing on afghan5) ──
export async function approveAfghan5Order(order, reviewerId, reviewerName) {
  if (order.status !== 'pending') throw new Error('این سفارش قبلاً بررسی شده است');
  await sbOrder.update(order.id, {
    status: 'approved',
    seller_id: reviewerId,
    seller_name: reviewerName,
  });
  await sendOrderNotification(order, 'approved', reviewerName);
}

// ── Creator: complete order (purchase done, tracking number recorded) ──
export async function completeAfghan5Order(order, trackingNo, reviewerId, reviewerName) {
  if (order.status === 'completed') throw new Error('این سفارش قبلاً تکمیل شده است');
  await sbOrder.update(order.id, {
    status: 'completed',
    tracking_no: trackingNo,
    fulfillment_date: new Date().toISOString(),
    seller_name: reviewerName,
  });
  await sendOrderNotification(order, 'completed', reviewerName);
}

// ── Creator: reject order (refund wallet) ──
export async function rejectAfghan5Order(order, reason, reviewerId, reviewerName) {
  if (order.status === 'rejected') throw new Error('این سفارش قبلاً رد شده است');
  // Refund wallet
  const wallets = await sbWallet.filter({ user_id: order.created_by_id, currency: order.currency });
  if (wallets.length > 0) {
    const wallet = wallets[0];
    const newBalance = (wallet.balance || 0) + (order.total || 0);
    await sbWallet.update(wallet.id, { balance: newBalance });
    try {
      await sbWalletTx.create({
        wallet_id: wallet.id,
        user_id: order.created_by_id,
        type: 'credit',
        amount: order.total,
        currency: order.currency,
        reason: 'afghan5_refund',
        actor_name: reviewerName,
        status: 'completed',
      });
    } catch { /* non-critical */ }
  }
  await sbOrder.update(order.id, {
    status: 'rejected',
    notes: `رد شده: ${reason}`,
  });
  await sendOrderNotification(order, 'rejected', reviewerName);
}