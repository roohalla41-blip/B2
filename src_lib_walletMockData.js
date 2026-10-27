/**
 * لایه داده کیف پول — از طریق بک‌اند امن (HMAC-signed)
 */

import { createSupabaseEntity } from './supabaseApi';

const FALLBACK_RATES = [
  { currency: 'AFN', buy_rate: 1, sell_rate: 1 },
  { currency: 'USD', buy_rate: 72.5, sell_rate: 73.0 },
  { currency: 'IRT', buy_rate: 7250, sell_rate: 7300 },
  { currency: 'USDT', buy_rate: 72.5, sell_rate: 73.2 },
];

export async function loadWallets(userId) {
  if (!userId) return [];
  const sb = createSupabaseEntity('Wallet');
  const data = await sb.filter({ user_id: userId }, 'id', 200);
  return (data || []).map((w) => ({
    id: w.id,
    currency: w.currency || 'AFN',
    balance: w.balance || 0,
    status: 'active',
    created_date: w.created_date,
  }));
}

export async function loadTransactions(userId) {
  if (!userId) return [];
  const sb = createSupabaseEntity('WalletTransaction');
  const data = await sb.filter({ user_id: userId }, '-id', 200);
  return (data || []).map((t) => ({
    id: t.id,
    doc_number: t.id,
    type: t.type === 'credit' ? 'receive' : (t.reason === 'order_payment' ? 'pay' : 'withdraw'),
    currency: t.currency || 'AFN',
    amount: t.amount || 0,
    balance_before: t.balance_before || 0,
    balance_after: t.balance_after || 0,
    description: t.reason || '',
    sender: t.actor_name || '',
    receiver: '',
    status: 'completed',
    created_date: t.created_date,
  }));
}

export async function loadRates() {
  const sb = createSupabaseEntity('RateSetting');
  const data = await sb.filter({}, 'sort_order', 100);
  if (data && data.length > 0) {
    return data.map((c) => ({
      currency: c.code || c.currency,
      buy_rate: c.buy_rate || 1,
      sell_rate: c.sell_rate || 1,
    }));
  }
  return FALLBACK_RATES.map((r) => ({ ...r }));
}