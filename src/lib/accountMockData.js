/**
 * لایه داده حساب مشتری با صرافی — مبتنی بر offlineDB
 *
 * تراکنش‌ها و موجودی‌ها از دیتابیس واقعی خوانده می‌شوند.
 */

import { supabaseDB as offlineDB } from './supabaseDB';

export async function loadAccountProfile(user) {
  if (!user) return null;
  let exchangeName = '';
  let exchangeCode = '';
  // Try to get exchange info from user's exchange_code or from exchanges table
  try {
    if (user.exchange_code) {
      const data = await offlineDB.SarraafProfile.filter({ code: user.exchange_code }, '-created_date', 1);
      if (data && data.length > 0) {
        exchangeName = data[0].name || data[0].exchange_name || '';
        exchangeCode = data[0].code || data[0].exchange_code || '';
      }
    }
  } catch { /* ignore */ }
  return {
    customer_name: user.full_name || '',
    customer_code: user.id ? String(user.id) : '',
    exchange_name: exchangeName || user.exchange_name || '',
    exchange_code: exchangeCode || user.exchange_code || '',
    account_status: user.status || 'active',
    last_updated: new Date().toISOString(),
  };
}

export async function loadAccountBalances(userId) {
  if (!userId) return [];
  let wallets = [];
  try {
    wallets = await offlineDB.Wallet.filter({ user_id: userId });
  } catch {
    // ignore
  }
  return (wallets || []).map((w) => {
    const balance = w.balance || 0;
    return {
      currency: w.currency || 'AFN',
      balance,
      receivable: balance > 0 ? balance : 0,
      payable: balance < 0 ? Math.abs(balance) : 0,
      total_in: 0,
      total_out: 0,
      status: balance > 0 ? 'creditor' : balance < 0 ? 'debtor' : 'no_activity',
    };
  });
}

export async function loadTransactions(userId) {
  if (!userId) return [];
  let txns = [];
  try {
    txns = await offlineDB.WalletTransaction.filter({ user_id: userId });
  } catch {
    // ignore
  }
  return (txns || [])
    .sort((a, b) => (b.timestamp || b.created_date || '').localeCompare(a.timestamp || a.created_date || ''))
    .map((t) => ({
      id: t.id,
      doc_no: t.id,
      date: t.timestamp || t.created_date || '',
      type: t.type === 'credit' ? 'receive' : (t.reason === 'order_payment' ? 'pay' : 'withdraw'),
      type_label: t.reason || (t.type === 'credit' ? 'دریافت' : 'پرداخت'),
      currency: t.currency || 'AFN',
      direction: t.type === 'credit' ? 'in' : 'out',
      amount: t.amount || 0,
      balance_before: t.balance_before || 0,
      balance_after: t.balance_after || 0,
      sender_name: t.actor_name || '',
      receiver_name: '',
      description: t.reason || '',
      status: 'completed',
      counterparty: t.actor_name || '',
    }));
}