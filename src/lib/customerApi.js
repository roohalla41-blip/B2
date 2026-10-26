// customerApi.js — Direct Supabase customer operations (no Base44 backend function)
//
// تمام عملیات کیف پول و سفارش مستقیماً از طریق کلاینت Supabase انجام می‌شوند.
// tenant isolation از طریق RLS policies (x-app-token header) تأمین می‌شود.

import { supabase } from './supabaseClient';
import { createSupabaseEntity, getExchangeCode, isCreatorOrAdmin } from './supabaseApi';

function getUserId() {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;
    const payload = JSON.parse(atob(token));
    return payload.uid ? String(payload.uid) : null;
  } catch { return null; }
}

function getSessionUser() {
  try {
    const userStr = localStorage.getItem('auth_user');
    if (userStr) return JSON.parse(userStr);
  } catch { /* ignore */ }
  return null;
}

// ── Wallet ──
export async function getCustomerWallets() {
  const userId = getUserId();
  if (!userId) return [];
  const sb = createSupabaseEntity('Wallet');
  const items = await sb.filter({ user_id: userId }, 'id', 200);
  return (items || []).map((w) => ({
    id: w.id,
    currency: w.currency || 'AFN',
    balance: w.balance || 0,
    owner_type: w.owner_type || 'customer',
  }));
}

// ── Withdrawal — direct insert ──
export async function createWithdrawalRequest({ walletId, amount, method, destination, description }) {
  try {
    const userId = getUserId();
    if (!userId) throw new Error('not_authenticated');

    // Check wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, balance, currency')
      .eq('id', walletId)
      .maybeSingle();

    if (walletError) throw new Error(walletError.message);
    if (!wallet) throw new Error('wallet_not_found');
    if (Number(wallet.balance) < Number(amount)) throw new Error('insufficient_balance');

    // Insert withdrawal request
    const { data, error } = await supabase
      .from('wallet_withdrawal_requests')
      .insert({
        wallet_id: walletId,
        user_id: userId,
        amount: Number(amount),
        currency: wallet.currency || 'AFN',
        method: method || 'bank_transfer',
        destination: destination || '',
        description: description || '',
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { id: data.id, status: 'pending' };
  } catch (err) {
    const msgs = {
      insufficient_balance: 'موجودی کیف پول کافی نیست',
      wallet_not_found: 'کیف پول یافت نشد',
      concurrent_modification: 'تراکنش همزمان انجام شد — دوباره تلاش کنید',
    };
    throw new Error(msgs[err.message] || err.message || 'خطا در ثبت درخواست برداشت');
  }
}

// ── Customer Order (recharge / games) — direct insert ──
export async function submitCustomerOrder({ productId, walletId, accountFields, description, orderType, amount: directAmount }) {
  try {
    const userId = getUserId();
    if (!userId) throw new Error('not_authenticated');

    let amount = directAmount;
    let productName = '';
    let productKey = '';

    // If productId provided, get product info
    if (productId) {
      const { data: product, error: prodError } = await supabase
        .from('online_products')
        .select('id, name, key, price')
        .eq('id', productId)
        .maybeSingle();
      if (prodError) throw new Error(prodError.message);
      if (!product) throw new Error('product_not_found');
      productName = product.name || '';
      productKey = product.key || '';
      amount = amount || product.price;
    }

    if (!amount || Number(amount) <= 0) throw new Error('invalid_product_price');

    // Check wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, balance, currency')
      .eq('id', walletId)
      .maybeSingle();

    if (walletError) throw new Error(walletError.message);
    if (!wallet) throw new Error('wallet_not_found');
    if (Number(wallet.balance) < Number(amount)) throw new Error('insufficient_balance');

    // Insert order
    const { data, error } = await supabase
      .from('charge_orders')
      .insert({
        product_key: productKey,
        product_name: productName,
        wallet_id: walletId,
        user_id: userId,
        amount: Number(amount),
        currency: wallet.currency || 'AFN',
        account_fields: accountFields || {},
        description: description || '',
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { id: data.id, status: 'pending' };
  } catch (err) {
    const msgs = {
      insufficient_balance: 'موجودی کیف پول کافی نیست',
      wallet_not_found: 'کیف پول یافت نشد',
      product_not_found: 'محصول یافت نشد یا غیرفعال است',
      invalid_product_price: 'قیمت محصول نامعتبر است',
      concurrent_modification: 'تراکنش همزمان انجام شد — دوباره تلاش کنید',
    };
    throw new Error(msgs[err.message] || err.message || 'خطا در ثبت سفارش');
  }
}

// ── Customer Transfer — direct insert ──
export async function submitCustomerTransfer({ walletId, amount, currency, receiverName, receiverPhone, destination, description }) {
  try {
    const userId = getUserId();
    if (!userId) throw new Error('not_authenticated');

    // Check wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, balance, currency')
      .eq('id', walletId)
      .maybeSingle();

    if (walletError) throw new Error(walletError.message);
    if (!wallet) throw new Error('wallet_not_found');
    if (Number(wallet.balance) < Number(amount)) throw new Error('insufficient_balance');

    // Insert transfer request
    const { data, error } = await supabase
      .from('customer_transfer_requests')
      .insert({
        wallet_id: walletId,
        user_id: userId,
        amount: Number(amount),
        currency: currency || wallet.currency || 'AFN',
        receiver_name: receiverName || '',
        receiver_phone: receiverPhone || '',
        destination: destination || '',
        description: description || '',
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { id: data.id, status: 'pending' };
  } catch (err) {
    const msgs = {
      insufficient_balance: 'موجودی کیف پول کافی نیست',
      wallet_not_found: 'کیف پول یافت نشد',
      concurrent_modification: 'تراکنش همزمان انجام شد — دوباره تلاش کنید',
    };
    throw new Error(msgs[err.message] || err.message || 'خطا در ثبت حواله');
  }
}

// ── Admin: list / approve / reject withdrawals ──
export async function listWithdrawals() {
  try {
    const { data, error } = await supabase
      .from('wallet_withdrawal_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message || 'listWithdrawals_failed');
    return data || [];
  } catch (err) {
    throw new Error(err.message || 'listWithdrawals_failed');
  }
}

export async function approveWithdrawal(requestId) {
  try {
    const { data: req, error: reqError } = await supabase
      .from('wallet_withdrawal_requests')
      .select('id, wallet_id, amount, status')
      .eq('id', requestId)
      .maybeSingle();
    if (reqError) throw new Error(reqError.message);
    if (!req) throw new Error('request_not_found');

    // Update withdrawal request status
    const { error: updateError } = await supabase
      .from('wallet_withdrawal_requests')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', requestId);
    if (updateError) throw new Error(updateError.message);

    // Deduct from wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('id', req.wallet_id)
      .maybeSingle();
    if (walletError) throw new Error(walletError.message);
    if (wallet) {
      const newBalance = Number(wallet.balance) - Number(req.amount);
      const { error: walletUpdateError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('id', req.wallet_id);
      if (walletUpdateError) throw new Error(walletUpdateError.message);
    }

    return { success: true };
  } catch (err) {
    throw new Error(err.message || 'approveWithdrawal_failed');
  }
}

export async function rejectWithdrawal(requestId, reason) {
  try {
    const { error } = await supabase
      .from('wallet_withdrawal_requests')
      .update({ status: 'rejected', rejection_reason: reason || '' })
      .eq('id', requestId);
    if (error) throw new Error(error.message || 'rejectWithdrawal_failed');
    return { success: true };
  } catch (err) {
    throw new Error(err.message || 'rejectWithdrawal_failed');
  }
}