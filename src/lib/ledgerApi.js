// ledgerApi.js — Direct Supabase financial operations (no Base44 backend function)
//
// تمام عملیات مالی مستقیماً از طریق کلاینت Supabase انجام می‌شوند.
// tenant isolation از طریق RLS policies (x-app-token header) تأمین می‌شود.
// عملیات اتمیک از طریق توابع RPC موجود در Supabase انجام می‌شوند.

import { supabase } from './supabaseClient';
import { getExchangeCode, listTransactions } from './supabaseApi';

// ─ـ Helper: get current user from session ──
function getSessionUser() {
  try {
    const userStr = localStorage.getItem('auth_user');
    if (userStr) return JSON.parse(userStr);
  } catch { /* ignore */ }
  return null;
}

function getSessionUserId() {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    let b64 = parts[0].replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const payload = JSON.parse(atob(b64));
    return payload.uid ? String(payload.uid) : null;
  } catch { return null; }
}

// ── Post Document (document + ledger lines) — direct Supabase ──
export async function postDocument({ doc_type, currency, amount, fee, related_type, related_id, related_name, description, lines, transfer_id, client_operation_id, exchange_code }) {
  try {
    const ec = exchange_code || getExchangeCode();
    const userId = getSessionUserId();
    const user = getSessionUser();
    const userName = user?.full_name || user?.name || '';

    // Generate doc number
    const docNumber = `DOC-${Date.now().toString(36).toUpperCase()}`;

    // Insert document
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({
        doc_number: docNumber,
        doc_type,
        currency,
        amount: Number(amount),
        fee: Number(fee) || 0,
        related_type: related_type || null,
        related_id: related_id || null,
        related_name: related_name || null,
        description: description || '',
        transfer_id: transfer_id || null,
        exchange_code: ec,
        registered_by: userName,
        registered_by_user_id: userId,
        client_operation_id: client_operation_id || null,
      })
      .select()
      .single();

    if (docError) throw new Error(docError.message || 'postDocument_insert_failed');
    if (!doc) throw new Error('postDocument_no_result');

    // Insert ledger entries
    if (lines && lines.length > 0) {
      const ledgerEntries = lines.map((line, idx) => ({
        document_id: doc.id,
        exchange_code: ec,
        account_type: line.account_type || 'cash',
        account_id: line.account_id || '',
        account_name: line.account_name || '',
        currency: line.currency || currency,
        debit: Number(line.debit) || 0,
        credit: Number(line.credit) || 0,
        description: line.description || '',
        line_no: line.line_no || (idx + 1),
        rate: line.rate || null,
      }));

      const { error: ledgerError } = await supabase
        .from('ledger_entries')
        .insert(ledgerEntries);

      if (ledgerError) {
        // Best-effort rollback: delete the document
        await supabase.from('documents').delete().eq('id', doc.id);
        throw new Error(ledgerError.message || 'postDocument_ledger_failed');
      }
    }

    return { id: doc.id, doc_number: doc.doc_number };
  } catch (err) {
    throw new Error(err.message || 'postDocument_failed');
  }
}

// ── Post Transfer (via Supabase RPC) ──
export async function postTransfer({ direction, sender_name, sender_phone, receiver_name, receiver_phone, destination, origin, amount, currency, rate, fee, fee_currency, description, client_operation_id, exchange_code }) {
  try {
    const ec = exchange_code || getExchangeCode();
    const userId = getSessionUserId();
    const user = getSessionUser();
    const userName = user?.full_name || user?.name || '';

    // Try the RPC function first (atomic)
    const { data, error } = await supabase.rpc('post_transfer_transaction', {
      p_direction: direction,
      p_sender_name: sender_name || '',
      p_sender_phone: sender_phone || '',
      p_receiver_name: receiver_name || '',
      p_receiver_phone: receiver_phone || '',
      p_destination: destination || '',
      p_origin: origin || '',
      p_amount: Number(amount),
      p_currency: currency || 'AFN',
      p_rate: rate ? Number(rate) : null,
      p_fee: Number(fee) || 0,
      p_fee_currency: fee_currency || null,
      p_description: description || '',
      p_exchange_code: ec,
      p_user_id: userId,
      p_user_name: userName,
      p_client_operation_id: client_operation_id || null,
    });

    if (error) {
      // Fallback: direct insert if RPC doesn't exist
      if (error.message?.includes('Could not find the function') || error.code === '42883') {
        return await postTransferDirect({ direction, sender_name, sender_phone, receiver_name, receiver_phone, destination, origin, amount, currency, rate, fee, fee_currency, description, client_operation_id, exchange_code: ec, userId, userName });
      }
      throw new Error(error.message || 'postTransfer_failed');
    }

    return data || { success: true };
  } catch (err) {
    throw new Error(err.message || 'postTransfer_failed');
  }
}

// ── Post Transfer (direct fallback) ──
async function postTransferDirect({ direction, sender_name, sender_phone, receiver_name, receiver_phone, destination, origin, amount, currency, rate, fee, fee_currency, description, client_operation_id, exchange_code, userId, userName }) {
  const transferNumber = `TRF-${Date.now().toString(36).toUpperCase()}`;

  const { data: transfer, error: transferError } = await supabase
    .from('transfers')
    .insert({
      transfer_number: transferNumber,
      direction,
      sender_name: sender_name || '',
      sender_phone: sender_phone || '',
      receiver_name: receiver_name || '',
      receiver_phone: receiver_phone || '',
      destination: destination || '',
      origin: origin || '',
      amount: Number(amount),
      currency: currency || 'AFN',
      rate: rate ? Number(rate) : null,
      fee: Number(fee) || 0,
      fee_currency: fee_currency || null,
      description: description || '',
      exchange_code,
      registered_by: userName,
      registered_by_user_id: userId,
      client_operation_id: client_operation_id || null,
      status: 'done',
    })
    .select()
    .single();

  if (transferError) throw new Error(transferError.message || 'postTransfer_insert_failed');
  return { id: transfer.id, transfer_number: transfer.transfer_number };
}

// ── Reverse Document (via Supabase RPC) ──
export async function reverseDocument(document_id, reason, exchange_code) {
  try {
    const { data, error } = await supabase.rpc('reverse_document_transaction', {
      p_document_id: document_id,
      p_reason: reason || '',
      p_exchange_code: exchange_code || getExchangeCode(),
    });

    if (error) {
      // Fallback: soft-delete document directly
      if (error.message?.includes('Could not find the function') || error.code === '42883') {
        const { error: updateError } = await supabase
          .from('documents')
          .update({ deleted: true, deleted_date: new Date().toISOString() })
          .eq('id', document_id);
        if (updateError) throw new Error(updateError.message || 'reverseDocument_failed');
        return { success: true };
      }
      throw new Error(error.message || 'reverseDocument_failed');
    }

    return data || { success: true };
  } catch (err) {
    throw new Error(err.message || 'reverseDocument_failed');
  }
}

// ── Edit Document (via Supabase RPC) ──
export async function editDocument({ document_id, description, amount, currency, edit_note, new_lines, exchange_code }) {
  try {
    const { data, error } = await supabase.rpc('edit_document_transaction', {
      p_document_id: document_id,
      p_description: description || '',
      p_amount: amount ? Number(amount) : null,
      p_currency: currency || null,
      p_edit_note: edit_note || '',
      p_new_lines: new_lines || [],
      p_exchange_code: exchange_code || getExchangeCode(),
    });

    if (error) {
      // Fallback: direct update
      if (error.message?.includes('Could not find the function') || error.code === '42883') {
        const updates = {};
        if (description !== undefined) updates.description = description;
        if (amount !== undefined) updates.amount = Number(amount);
        if (currency !== undefined) updates.currency = currency;
        updates.edited = true;
        updates.edited_date = new Date().toISOString();
        updates.edit_note = edit_note || '';

        const { error: updateError } = await supabase
          .from('documents')
          .update(updates)
          .eq('id', document_id);
        if (updateError) throw new Error(updateError.message || 'editDocument_failed');
        return { success: true };
      }
      throw new Error(error.message || 'editDocument_failed');
    }

    return data || { success: true };
  } catch (err) {
    throw new Error(err.message || 'editDocument_failed');
  }
}

// ── Get Balances (from SQL views, direct query) ──
const VIEW_MAP = {
  treasury: 'v_treasury_balances',
  bank: 'v_bank_balances',
  customer: 'v_customer_balances',
  wallet: 'v_wallet_balances',
  agent: 'v_agent_balances',
  profit_loss: 'v_profit_loss',
  currency: 'v_currency_balances',
  exchange_summary: 'v_exchange_summary',
};

export async function getBalances(balance_type, params = {}) {
  try {
    const view = VIEW_MAP[balance_type];
    if (!view) throw new Error('invalid_balance_type');

    const ec = getExchangeCode();
    let query = supabase.from(view).select('*');

    // Filter by exchange_code if the view has it
    if (ec) {
      query = query.eq('exchange_code', ec);
    }

    // Apply additional filters
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        query = query.eq(key, value);
      }
    }

    const { data, error } = await query.limit(500);
    if (error) throw new Error(error.message || 'getBalances_failed');
    return data || [];
  } catch (err) {
    throw new Error(err.message || 'getBalances_failed');
  }
}

// ── List Documents (with ledger lines) ──
export async function listDocuments(filters = {}, sort, limit) {
  return listTransactions(filters, sort, limit);
}

// ── Balance helpers ──
export function fetchTreasuryBalances() { return getBalances('treasury'); }
export function fetchBankBalances() { return getBalances('bank'); }
export function fetchCustomerBalances() { return getBalances('customer'); }
export function fetchWalletBalances() { return getBalances('wallet'); }
export function fetchAgentBalances() { return getBalances('agent'); }
export function fetchProfitLoss() { return getBalances('profit_loss'); }
export function fetchCurrencyBalances() { return getBalances('currency'); }
export function fetchExchangeSummary() { return getBalances('exchange_summary'); }

// ── Line builders (construct ledger lines for common operations) ──

export function buildBuyLines({ customer_id, customer_name, currency, amount, paid_amount, paid_currency, fee, fee_currency }) {
  const lines = [
    { account_type: 'cash', account_id: paid_currency, account_name: 'صندوق', currency: paid_currency, debit: Number(paid_amount), credit: 0, description: `دریافت ${paid_currency} از صندوق`, line_no: 1 },
    { account_type: 'customer', account_id: String(customer_id), account_name: customer_name, currency: paid_currency, debit: 0, credit: Number(paid_amount), description: `بستانکاری ${customer_name}`, line_no: 2 },
    { account_type: 'cash', account_id: currency, account_name: 'صندوق', currency, debit: Number(amount), credit: 0, description: `دریافت ${currency} در صندوق`, line_no: 3 },
    { account_type: 'customer', account_id: String(customer_id), account_name: customer_name, currency, debit: 0, credit: Number(amount), description: `بدهکاری ${customer_name}`, line_no: 4 },
  ];
  if (fee && Number(fee) > 0) {
    lines.push(
      { account_type: 'fee', account_id: String(customer_id), account_name: 'کارمزد', currency: fee_currency || paid_currency, debit: Number(fee), credit: 0, description: 'کارمزد خرید', line_no: 5 },
      { account_type: 'customer', account_id: String(customer_id), account_name: customer_name, currency: fee_currency || paid_currency, debit: 0, credit: Number(fee), description: 'کارمزد از مشتری', line_no: 6 },
    );
  }
  return lines;
}

export function buildSellLines({ customer_id, customer_name, currency, amount, received_amount, received_currency, fee, fee_currency }) {
  const lines = [
    { account_type: 'customer', account_id: String(customer_id), account_name: customer_name, currency: received_currency, debit: Number(received_amount), credit: 0, description: `بدهکاری ${customer_name}`, line_no: 1 },
    { account_type: 'cash', account_id: received_currency, account_name: 'صندوق', currency: received_currency, debit: 0, credit: Number(received_amount), description: `پرداخت ${received_currency} از صندوق`, line_no: 2 },
    { account_type: 'customer', account_id: String(customer_id), account_name: customer_name, currency, debit: 0, credit: Number(amount), description: `بستانکاری ${customer_name}`, line_no: 3 },
    { account_type: 'cash', account_id: currency, account_name: 'صندوق', currency, debit: 0, credit: Number(amount), description: `تحویل ${currency} از صندوق`, line_no: 4 },
  ];
  if (fee && Number(fee) > 0) {
    lines.push(
      { account_type: 'customer', account_id: String(customer_id), account_name: customer_name, currency: fee_currency || received_currency, debit: Number(fee), credit: 0, description: 'کارمزد به عهده مشتری', line_no: 5 },
      { account_type: 'fee', account_id: String(customer_id), account_name: 'کارمزد', currency: fee_currency || received_currency, debit: 0, credit: Number(fee), description: 'سود کارمزد صراف', line_no: 6 },
    );
  }
  return lines;
}

export function buildDadogereftLines({ customer_id, customer_name, direction, currency, amount, counter_type, counter_id }) {
  const isIn = direction === 'in' || direction === 'receive';
  const cashAccount = counter_type === 'bank' ? 'bank' : 'cash';
  const lines = isIn ? [
    { account_type: cashAccount, account_id: counter_id ? String(counter_id) : currency, account_name: counter_type === 'bank' ? 'بانک' : 'صندوق', currency, debit: Number(amount), credit: 0, description: `دریافت از ${customer_name}`, line_no: 1 },
    { account_type: 'customer', account_id: String(customer_id), account_name: customer_name, currency, debit: 0, credit: Number(amount), description: `بستانکاری ${customer_name}`, line_no: 2 },
  ] : [
    { account_type: 'customer', account_id: String(customer_id), account_name: customer_name, currency, debit: Number(amount), credit: 0, description: `بدهکاری ${customer_name}`, line_no: 1 },
    { account_type: cashAccount, account_id: counter_id ? String(counter_id) : currency, account_name: counter_type === 'bank' ? 'بانک' : 'صندوق', currency, debit: 0, credit: Number(amount), description: `پرداخت به ${customer_name}`, line_no: 2 },
  ];
  return lines;
}

export function buildTransferLines({ from_type, from_id, to_type, to_id, currency, amount, rate, pair_currency, pair_amount }) {
  const lines = [];
  if (pair_currency && pair_amount && pair_currency !== currency) {
    lines.push(
      { account_type: from_type, account_id: String(from_id), account_name: from_type === 'bank' ? 'بانک' : 'صندوق', currency, debit: 0, credit: Number(amount), description: `خروج ${currency} از ${from_type}`, line_no: 1, rate: rate || null },
      { account_type: to_type, account_id: String(to_id), account_name: to_type === 'bank' ? 'بانک' : 'صندوق', currency: pair_currency, debit: Number(pair_amount), credit: 0, description: `ورود ${pair_currency} به ${to_type}`, line_no: 2, rate: rate || null },
    );
  } else {
    lines.push(
      { account_type: from_type, account_id: String(from_id), account_name: from_type === 'bank' ? 'بانک' : 'صندوق', currency, debit: 0, credit: Number(amount), description: `خروج از ${from_type}`, line_no: 1 },
      { account_type: to_type, account_id: String(to_id), account_name: to_type === 'bank' ? 'بانک' : 'صندوق', currency, debit: Number(amount), credit: 0, description: `ورود به ${to_type}`, line_no: 2 },
    );
  }
  return lines;
}

export function buildConversionLines({ from_currency, from_amount, to_currency, to_amount, rate }) {
  return [
    { account_type: 'cash', account_id: from_currency, account_name: 'صندوق', currency: from_currency, debit: 0, credit: Number(from_amount), description: `خروج ${from_currency} از صندوق`, line_no: 1, rate: rate || null },
    { account_type: 'cash', account_id: to_currency, account_name: 'صندوق', currency: to_currency, debit: Number(to_amount), credit: 0, description: `ورود ${to_currency} به صندوق`, line_no: 2, rate: rate || null },
  ];
}

export function buildWalletTopupLines({ wallet_id, wallet_owner, currency, amount }) {
  return [
    { account_type: 'cash', account_id: currency, account_name: 'صندوق', currency, debit: 0, credit: Number(amount), description: 'کاهش صندوق — شارژ کیف پول', line_no: 1 },
    { account_type: 'wallet', account_id: String(wallet_id), account_name: wallet_owner === 'exchange' ? 'کیف پول صراف' : 'کیف پول مشتری', currency, debit: Number(amount), credit: 0, description: 'افزایش موجودی کیف پول', line_no: 2 },
  ];
}

export function buildWalletWithdrawLines({ wallet_id, wallet_owner, currency, amount }) {
  return [
    { account_type: 'wallet', account_id: String(wallet_id), account_name: wallet_owner === 'exchange' ? 'کیف پول صراف' : 'کیف پول مشتری', currency, debit: 0, credit: Number(amount), description: 'کاهش موجودی کیف پول', line_no: 1 },
    { account_type: 'cash', account_id: currency, account_name: 'صندوق', currency, debit: Number(amount), credit: 0, description: 'افزایش صندوق — برداشت از کیف پول', line_no: 2 },
  ];
}

export function buildWalletTransferLines({ from_wallet_id, to_wallet_id, currency, amount }) {
  return [
    { account_type: 'wallet', account_id: String(from_wallet_id), account_name: 'کیف پول مبدأ', currency, debit: 0, credit: Number(amount), description: 'کاهش کیف پول مبدأ', line_no: 1 },
    { account_type: 'wallet', account_id: String(to_wallet_id), account_name: 'کیف پول مقصد', currency, debit: Number(amount), credit: 0, description: 'افزایش کیف پول مقصد', line_no: 2 },
  ];
}

export function buildOpeningBalanceLines({ customer_id, customer_name, currency, amount }) {
  return [
    { account_type: 'customer', account_id: String(customer_id), account_name: customer_name, currency, debit: Number(amount), credit: 0, description: 'موجودی افتتاحیه — بدهکاری', line_no: 1 },
    { account_type: 'suspense', account_id: '', account_name: 'موجودی افتتاحیه', currency, debit: 0, credit: Number(amount), description: 'بستانکاری موقت افتتاحیه', line_no: 2 },
  ];
}

export default {
  postDocument, postTransfer, reverseDocument, editDocument,
  getBalances, listDocuments,
  fetchTreasuryBalances, fetchBankBalances, fetchCustomerBalances,
  fetchWalletBalances, fetchAgentBalances, fetchProfitLoss,
  fetchCurrencyBalances, fetchExchangeSummary,
  buildBuyLines, buildSellLines, buildDadogereftLines,
  buildTransferLines, buildConversionLines,
  buildWalletTopupLines, buildWalletWithdrawLines, buildWalletTransferLines,
  buildOpeningBalanceLines,
};