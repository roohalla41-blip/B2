/**
 * لایه داده خدمات بازی مشتری — مبتنی بر offlineDB
 *
 * خدمات و بسته‌ها از دیتابیس واقعی (OnlineProduct) خوانده می‌شوند.
 * کیف پول‌ها از دیتابیس واقعی (Wallet) خوانده می‌شوند.
 * درخواست‌ها به عنوان OnlineOrder ثبت می‌شوند.
 */

import { supabaseDB as offlineDB } from './supabaseDB';

export async function loadServices() {
  let products = [];
  try {
    products = await offlineDB.OnlineProduct.list('display_order', 200);
  } catch {
    // ignore
  }
  return (products || [])
    .filter((p) => p.level === 'category' && p.enabled !== false)
    .map((p) => ({
      id: p.id,
      code: p.key,
      name: p.name,
      product_type: p.description || '',
      description: p.description || '',
      icon: p.icon || '🎮',
      icon_url: p.image || p.icon || '',
      is_active: p.enabled !== false,
      account_fields: p.account_fields || [],
    }));
}

export async function loadPackages(serviceCode) {
  let products = [];
  try {
    products = await offlineDB.OnlineProduct.list('display_order', 200);
  } catch {
    // ignore
  }
  let result = (products || []).filter((p) => p.level === 'product' && p.enabled !== false);
  if (serviceCode) {
    result = result.filter((p) => p.parent_key === serviceCode);
  }
  return result.map((p) => ({
    id: p.id,
    service_code: p.parent_key || '',
    name: p.name,
    amount: p.amount || '',
    price: p.price || 0,
    original_price: p.original_price || 0,
    currency: p.currency || 'AFN',
    is_active: p.enabled !== false,
    image: p.image || '',
    badge: p.badge || '',
  }));
}

export async function loadWallets(userId) {
  if (!userId) return [];
  let wallets = [];
  try {
    wallets = await offlineDB.Wallet.filter({ user_id: userId });
  } catch {
    // ignore
  }
  return (wallets || []).map((w) => ({
    id: w.id,
    currency: w.currency || 'AFN',
    balance: w.balance || 0,
    status: 'active',
  }));
}

export async function loadMyRequests(userId) {
  if (!userId) return [];
  let orders = [];
  try {
    orders = await offlineDB.OnlineOrder.filter({ created_by_id: userId });
  } catch {
    // ignore
  }
  return (orders || [])
    .sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''))
    .map((o) => ({
      id: o.id,
      request_number: o.id,
      user_id: userId,
      service_code: o.category_key || '',
      service_name: o.product_name || '',
      package_name: o.product_name || '',
      amount: o.total || 0,
      wallet_currency: o.currency || 'AFN',
      status: o.status || 'pending',
      created_date: o.created_date,
    }));
}

export async function submitRequest(payload) {
  const amount = payload.amount || 0;
  const currency = payload.wallet_currency || 'AFN';

  // Deduct from wallet before creating the order
  const wallets = await offlineDB.Wallet.filter({ user_id: payload.user_id });
  const wallet = (wallets || []).find(w => w.currency === currency);
  if (!wallet) throw new Error('wallet_not_found');
  if ((wallet.balance || 0) < amount) throw new Error('insufficient_balance');

  const newBalance = (wallet.balance || 0) - amount;
  await offlineDB.Wallet.update(wallet.id, { balance: newBalance });

  const newOrder = await offlineDB.OnlineOrder.create({
    product_key: payload.service_code || '',
    product_name: payload.service_name || payload.package_name || '',
    category_key: payload.service_code || '',
    fields: payload.account_info || {},
    total: amount,
    currency,
    payment_method: 'wallet',
    wallet_id: wallet.id,
    status: 'pending',
    notes: payload.description || '',
  });

  // Audit trail
  try {
    await offlineDB.WalletTransaction.create({
      wallet_id: wallet.id,
      user_id: payload.user_id,
      type: 'debit',
      amount,
      currency,
      reason: 'games_order',
      actor_name: payload.user_name || 'مشتری',
      timestamp: new Date().toISOString(),
      status: 'completed',
    });
  } catch { /* non-critical */ }

  return {
    id: newOrder.id,
    request_number: newOrder.id,
    ...payload,
    status: 'pending',
    created_date: newOrder.created_date,
  };
}

export function loadDraft() {
  try {
    const raw = localStorage.getItem('games_draft');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveDraft(draft) {
  try {
    localStorage.setItem('games_draft', JSON.stringify(draft));
  } catch {
    // ignore
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem('games_draft');
  } catch {
    // ignore
  }
}