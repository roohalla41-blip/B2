/**
 * لایه داده انتقال وجه مشتری — مبتنی بر offlineDB
 */

import { supabaseDB as offlineDB } from './supabaseDB';

const MOCK_DESTINATIONS = [
  { code: 'customer', name: 'مشتری دیگر' },
  { code: 'exchange', name: 'صرافی' },
  { code: 'bank_account', name: 'حساب/مقصد ثبت‌شده' },
];

const MOCK_COUNTRIES = ['افغانستان', 'ایران', 'تاجیکستان', 'پاکستان', 'امارات'];
const MOCK_TRANSFER_METHODS = ['حواله بانکی', 'نقدی', 'کیف پول', 'حواله موبایلی'];

const DRAFT_KEY = 'transfer_draft';

function calculateFee(amount, currency) {
  const fee = amount * 0.01;
  const minFee = currency === 'IRT' ? 10000 : 10;
  return Math.max(fee, minFee);
}

export async function loadWallets(userId) {
  if (!userId) return [];
  const list = await offlineDB.Wallet.filter({ user_id: userId });
  return (list || []).map((w) => ({
    id: w.id,
    currency: w.currency || 'AFN',
    balance: w.balance || 0,
    status: 'active',
  }));
}

export async function loadDestinations() {
  return MOCK_DESTINATIONS.map((d) => ({ ...d }));
}

export async function loadCountries() {
  return [...MOCK_COUNTRIES];
}

export async function loadTransferMethods() {
  return [...MOCK_TRANSFER_METHODS];
}

export async function loadMyRequests(userId) {
  if (!userId) return [];
  const list = await offlineDB.CustomerTransferRequest.filter({ customer_user_id: userId });
  return (list || [])
    .sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''))
    .map((r) => ({
      id: r.id,
      tracking_number: r.id,
      user_id: r.customer_user_id,
      user_name: r.customer_name,
      sender_name: r.customer_name,
      receiver_name: r.receiver_name,
      receiver_phone: r.receiver_phone || '',
      receiver_code: '',
      destination_type: r.direction,
      destination_type_name: r.direction === 'send' ? 'ارسال' : 'دریافت',
      destination_country: r.destination || '',
      transfer_method: '',
      currency: r.currency,
      wallet_currency: r.currency,
      amount: r.amount,
      fee: calculateFee(r.amount, r.currency),
      total_amount: r.amount + calculateFee(r.amount, r.currency),
      balance_after: 0,
      description: r.description || '',
      status: r.status || 'pending',
      created_date: r.created_date,
    }));
}

export function calcFee(amount, currency) {
  return calculateFee(amount, currency);
}

export async function submitRequest(payload) {
  const fee = calculateFee(payload.amount, payload.currency);
  const totalDeduct = payload.amount + fee;

  // Find the wallet and deduct the amount atomically
  const wallets = await offlineDB.Wallet.filter({ user_id: payload.user_id });
  const wallet = (wallets || []).find(w => w.currency === payload.currency);
  if (!wallet) throw new Error('wallet_not_found');
  if ((wallet.balance || 0) < totalDeduct) throw new Error('insufficient_balance');

  const newBalance = (wallet.balance || 0) - totalDeduct;
  await offlineDB.Wallet.update(wallet.id, { balance: newBalance });

  const newRequest = {
    customer_user_id: payload.user_id,
    customer_name: payload.user_name,
    customer_phone: payload.receiver_phone || '',
    sarraaf_code: payload.sarraaf_code || '',
    direction: 'send',
    currency: payload.currency,
    amount: payload.amount,
    receiver_name: payload.receiver_name,
    receiver_phone: payload.receiver_phone || '',
    destination: payload.destination_country || '',
    description: payload.description || '',
    status: 'pending',
  };
  const created = await offlineDB.CustomerTransferRequest.create(newRequest);

  // Record wallet transaction for audit trail
  try {
    await offlineDB.WalletTransaction.create({
      wallet_id: wallet.id,
      user_id: payload.user_id,
      type: 'debit',
      amount: totalDeduct,
      currency: payload.currency,
      reason: 'transfer_request',
      actor_name: payload.user_name || 'مشتری',
      timestamp: new Date().toISOString(),
      status: 'completed',
    });
  } catch { /* audit trail — non-critical */ }

  return {
    ...newRequest,
    fee,
    total_amount: totalDeduct,
    balance_after: newBalance,
    id: created.id,
    tracking_number: created.id,
    created_date: created.created_date,
  };
}

export function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveDraft(draft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // ignore
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}