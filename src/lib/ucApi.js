// ucApi.js — UC پابجی موبایل: بسته‌ها، شارژ کیف پول، و سفارش‌ها
//
// نرخ‌ها از ucbama.com استخراج شده و با ۳٪ افزایش قیمت فروش محاسبه می‌شوند.
// بارگذاری رسید از Supabase Storage انجام می‌شود (بدون Base44 credits).

import { createSupabaseEntity } from './supabaseApi';
import { supabase } from './supabaseClient';

const sbProduct = createSupabaseEntity('OnlineProduct');
const sbOrder = createSupabaseEntity('OnlineOrder');
const sbTopup = createSupabaseEntity('WalletTopupRequest');
const sbWallet = createSupabaseEntity('Wallet');
const sbWalletTx = createSupabaseEntity('WalletTransaction');
const sbNotification = createSupabaseEntity('UserNotification');

export const UC_SERVICE_KEY = 'pubg_uc';
export const UC_CURRENCY = 'IRT'; // تومان
export const UC_MARKUP_PERCENT = 3;
export const UC_ICON_URL = 'https://media.base44.com/images/public/6a60eae221cd7c451bd6387c/a642dd073_generated_aa900220.png';

// ── بسته‌های واقعی از ucbama.com (قیمت به تومان) ──
export const UC_PACKAGES_SEED = [
  { name: '60 UC',   amount: '60',   base_price: 246000,   display_order: 1 },
  { name: '120 UC',  amount: '120',  base_price: 491000,   display_order: 2 },
  { name: '180 UC',  amount: '180',  base_price: 725000,   display_order: 3 },
  { name: '325 UC',  amount: '325',  base_price: 1214000,  display_order: 4 },
  { name: '660 UC',  amount: '660',  base_price: 2457000,  display_order: 5 },
  { name: '720 UC',  amount: '720',  base_price: 2688000,  display_order: 6 },
  { name: '1800 UC', amount: '1800', base_price: 6156000,  display_order: 7 },
  { name: '2460 UC', amount: '2460', base_price: 8670000,  display_order: 8 },
  { name: '3850 UC', amount: '3850', base_price: 12138000, display_order: 9 },
  { name: '5650 UC', amount: '5650', base_price: 18352000, display_order: 10 },
  { name: '8100 UC', amount: '8100', base_price: 24565000, display_order: 11 },
  { name: '8760 UC', amount: '8760', base_price: 26877000, display_order: 12 },
];

export function applyMarkup(basePrice) {
  return Math.round(basePrice * (1 + UC_MARKUP_PERCENT / 100));
}

// ── Service (category) ──
export async function loadUCService() {
  const items = await sbProduct.filter({ key: UC_SERVICE_KEY, level: 'category' });
  return items[0] || null;
}

export async function ensureUCService() {
  let svc = await loadUCService();
  if (!svc) {
    svc = await sbProduct.create({
      key: UC_SERVICE_KEY,
      name: 'UC پابجی موبایل',
      icon: '🎮',
      level: 'category',
      description: 'خرید UC پابجی موبایل — تحویل ۱ تا ۱۰ دقیقه',
      enabled: true,
      display_order: 0,
      account_fields: [
        { key: 'player_id', label: 'آیدی اکانت پابجی', required: true, placeholder: 'آیدی اکانت' },
        { key: 'player_name', label: 'اسم اکانت', required: true, placeholder: 'اسم پروفایل' },
      ],
    });
  }
  return svc;
}

// ── Seed packages from ucbama.com + 3% markup ──
export async function seedUCPackages() {
  await ensureUCService();
  const existing = await loadUCPackages();
  const existingNames = new Set((existing || []).map(p => p.name));
  const created = [];
  for (const seed of UC_PACKAGES_SEED) {
    if (existingNames.has(seed.name)) continue;
    const price = applyMarkup(seed.base_price);
    const pkg = await sbProduct.create({
      key: `uc_${seed.amount}`,
      name: seed.name,
      parent_key: UC_SERVICE_KEY,
      level: 'product',
      price,
      original_price: seed.base_price,
      currency: UC_CURRENCY,
      amount: seed.amount,
      enabled: true,
      display_order: seed.display_order,
    });
    created.push(pkg);
  }
  return created;
}

// ── Packages ──
export async function loadUCPackages() {
  return await sbProduct.filter({ parent_key: UC_SERVICE_KEY, level: 'product' }, 'display_order', 200);
}

export async function createUCPackage(data) {
  return await sbProduct.create({
    ...data,
    parent_key: UC_SERVICE_KEY,
    level: 'product',
    enabled: data.enabled !== false,
  });
}

export async function updateUCPackage(id, data) {
  return await sbProduct.update(id, data);
}

export async function deleteUCPackage(id) {
  await sbProduct.delete(id);
}

// ── Receipt upload (Supabase Storage — no Base44 credits needed) ──
export async function uploadReceipt(file, userId) {
  const ext = (file.name || '').split('.').pop() || 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('uc-receipts')
    .upload(path, file, { upsert: false, contentType: file.type || 'image/jpeg' });
  if (error) throw new Error(error.message || 'خطا در بارگذاری رسید. مطمئن شوید bucket با نام uc-receipts در Supabase ایجاد شده است.');
  const { data: urlData } = supabase.storage.from('uc-receipts').getPublicUrl(path);
  return urlData.publicUrl;
}

// ── Notification helper ──
async function sendOrderNotification(order, status, reviewerName) {
  const pkgName = order.product_name || 'UC';
  const time = new Date().toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' });
  let title, message, kind;
  if (status === 'completed') {
    title = `بسته ${pkgName} با موفقیت فعال شد`;
    message = `سفارش ${pkgName} شما با موفقیت تحویل داده شد. زمان تأیید: ${time}`;
    kind = 'paid_activated';
  } else if (status === 'approved') {
    title = `سفارش ${pkgName} تأیید شد`;
    message = `سفارش ${pkgName} شما تأیید شد و در حال پردازش است. زمان: ${time}`;
    kind = 'general';
  } else {
    title = `سفارش ${pkgName} رد شد`;
    message = `متأسفانه سفارش ${pkgName} شما رد شد. زمان: ${time}`;
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

async function sendTopupNotification(request, status, reviewerName) {
  const amt = Number(request.amount || 0).toLocaleString('fa-IR');
  const time = new Date().toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' });
  let title, message;
  if (status === 'approved') {
    title = 'شارژ کیف پول تأیید شد';
    message = `مبلغ ${amt} ${request.currency || ''} به کیف پول شما اضافه شد. زمان: ${time}`;
  } else {
    title = 'درخواست شارژ رد شد';
    message = `درخواست شارژ ${amt} ${request.currency || ''} رد شد. زمان: ${time}`;
  }
  try {
    await sbNotification.create({
      target_user_id: request.user_id,
      target_role: 'customer',
      title,
      message,
      kind: status === 'approved' ? 'paid_activated' : 'account_limitation',
      sent_by_name: reviewerName,
      read: false,
    });
  } catch { /* non-critical */ }
}

// ── Customer: submit topup request ──
export async function submitUCTopup(payload) {
  return await sbTopup.create({
    user_id: payload.user_id,
    user_name: payload.user_name,
    amount: payload.amount,
    currency: payload.currency || 'AFN',
    method: 'card_to_card',
    receipt_url: payload.receipt_url || '',
    sender_name: payload.sender_name || payload.user_name || '',
    card_last4: payload.card_last4 || '',
    transaction_time: new Date().toISOString(),
    description: payload.description || '',
    status: 'pending',
  });
}

// ── Customer: submit UC order ──
// payment_method: 'wallet' (deduct on approval) or 'card_to_card' (manual with receipt)
export async function submitUCOrder(payload) {
  return await sbOrder.create({
    product_key: UC_SERVICE_KEY,
    product_name: payload.product_name || payload.package_name || '',
    category_key: UC_SERVICE_KEY,
    fields: payload.account_info || {},
    total: payload.amount || 0,
    currency: payload.currency || UC_CURRENCY,
    payment_method: payload.payment_method || 'wallet',
    wallet_id: payload.wallet_id || '',
    receipt_url: payload.receipt_url || '',
    status: 'pending',
    notes: payload.description || '',
  });
}

export async function loadMyUCOrders(userId) {
  return await sbOrder.filter({ category_key: UC_SERVICE_KEY, created_by_id: userId }, '-created_date', 100);
}

export async function loadMyTopups(userId) {
  return await sbTopup.filter({ created_by_id: userId }, '-created_date', 100);
}

// ── Creator: load all ──
export async function loadAllTopupRequests() {
  return await sbTopup.list('-created_date', 500);
}

export async function loadAllUCOrders() {
  return await sbOrder.filter({ category_key: UC_SERVICE_KEY }, '-created_date', 500);
}

// ── Creator: approve topup → add to wallet + notify ──
export async function approveTopup(request, reviewerId, reviewerName) {
  if (request.status !== 'pending') throw new Error('این درخواست قبلاً بررسی شده است');
  await sbTopup.update(request.id, {
    status: 'approved',
    reviewer_id: reviewerId,
    reviewer_name: reviewerName,
    review_date: new Date().toISOString(),
  });
  const wallets = await sbWallet.filter({ user_id: request.user_id, currency: request.currency });
  if (wallets.length > 0) {
    const wallet = wallets[0];
    const newBalance = (wallet.balance || 0) + (request.amount || 0);
    await sbWallet.update(wallet.id, { balance: newBalance });
    try {
      await sbWalletTx.create({
        wallet_id: wallet.id,
        user_id: request.user_id,
        type: 'credit',
        amount: request.amount,
        currency: request.currency,
        reason: 'uc_topup',
        actor_name: reviewerName,
        status: 'completed',
      });
    } catch { /* non-critical */ }
  }
  await sendTopupNotification(request, 'approved', reviewerName);
}

export async function rejectTopup(request, reason, reviewerId, reviewerName) {
  await sbTopup.update(request.id, {
    status: 'rejected',
    reject_reason: reason,
    reviewer_id: reviewerId,
    reviewer_name: reviewerName,
    review_date: new Date().toISOString(),
  });
  await sendTopupNotification(request, 'rejected', reviewerName);
}

// ── Creator: approve UC order ──
// For wallet: deduct from wallet. For card_to_card: no deduction (already paid manually).
// Sends in-app notification to customer.
export async function approveUCOrder(order, reviewerId, reviewerName) {
  if (order.status !== 'pending') throw new Error('این سفارش قبلاً بررسی شده است');
  if (order.payment_method === 'wallet') {
    const wallets = await sbWallet.filter({ user_id: order.created_by_id, currency: order.currency });
    if (wallets.length > 0) {
      const wallet = wallets[0];
      const newBalance = (wallet.balance || 0) - (order.total || 0);
      await sbWallet.update(wallet.id, { balance: newBalance });
      try {
        await sbWalletTx.create({
          wallet_id: wallet.id,
          user_id: order.created_by_id,
          type: 'debit',
          amount: order.total,
          currency: order.currency,
          reason: 'uc_order',
          actor_name: reviewerName,
          status: 'completed',
        });
      } catch { /* non-critical */ }
    }
  }
  await sbOrder.update(order.id, {
    status: 'approved',
    seller_name: reviewerName,
  });
  await sendOrderNotification(order, 'approved', reviewerName);
}

export async function rejectUCOrder(order, reason, reviewerId, reviewerName) {
  await sbOrder.update(order.id, {
    status: 'rejected',
    notes: `رد شده: ${reason}`,
  });
  await sendOrderNotification(order, 'rejected', reviewerName);
}

export async function completeUCOrder(order, reviewerId, reviewerName) {
  await sbOrder.update(order.id, {
    status: 'completed',
    fulfillment_date: new Date().toISOString(),
    seller_name: reviewerName,
  });
  await sendOrderNotification(order, 'completed', reviewerName);
}