/**
 * لایه داده شارژ و اینترنت مشتری — مبتنی بر offlineDB
 *
 * اپراتورها و بسته‌ها از دیتابیس واقعی (OnlineProduct) خوانده می‌شوند.
 * کیف پول‌ها از دیتابیس واقعی (Wallet) خوانده می‌شوند.
 * درخواست‌ها به عنوان OnlineOrder ثبت می‌شوند.
 */

import { supabaseDB as offlineDB } from './supabaseDB';

const DEFAULT_RECHARGE_AMOUNTS = [50, 100, 200, 300, 500, 1000];

export async function loadOperators() {
  let products = [];
  try {
    products = await offlineDB.OnlineProduct.list('display_order', 200);
  } catch {
    // ignore
  }
  return (products || [])
    .filter((p) => p.level === 'category' && p.parent_key === 'recharge_operators' && p.enabled !== false)
    .map((p) => ({
      code: p.key,
      name: p.name,
      country: p.description || 'afghanistan',
      color: 'from-blue-500 to-blue-600',
    }));
}

export async function loadRechargeAmounts() {
  return [...DEFAULT_RECHARGE_AMOUNTS];
}

export async function loadPackages(operatorCode) {
  let products = [];
  try {
    products = await offlineDB.OnlineProduct.list('display_order', 200);
  } catch {
    // ignore
  }
  let result = (products || []).filter((p) => p.level === 'product' && p.enabled !== false);
  if (operatorCode) {
    result = result.filter((p) => p.parent_key === operatorCode);
  }
  return result.map((p) => ({
    id: p.id,
    operator: p.parent_key || '',
    operator_name: p.name || '',
    name: p.name || '',
    volume: p.amount || '',
    duration: p.description || '',
    price: p.price || 0,
    currency: p.currency || 'AFN',
    is_active: p.enabled !== false,
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
      service_type: o.category_key || '',
      operator: o.product_key || '',
      operator_name: o.product_name || '',
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
    product_key: payload.operator || '',
    product_name: payload.operator_name || payload.package_name || '',
    category_key: payload.service_type || 'mobile_recharge',
    fields: {
      mobile: payload.mobile,
      package_name: payload.package_name || '',
      package_volume: payload.package_volume || '',
      package_duration: payload.package_duration || '',
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
    await offlineDB.WalletTransaction.create({
      wallet_id: wallet.id,
      user_id: payload.user_id,
      type: 'debit',
      amount,
      currency,
      reason: 'recharge_order',
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