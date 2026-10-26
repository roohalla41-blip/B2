// sarraaf.js — utility functions for the sarraaf panel
import { offlineDB } from './offlineQueue';

// ── Persian digits ──
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
export function toPersianDigits(v) {
  if (v === null || v === undefined) return '';
  return String(v).replace(/\d/g, d => FA_DIGITS[+d]);
}
export function toEnglishDigits(v) {
  if (!v) return '';
  return String(v)
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
}

// ── Number formatting ──
export function formatNumber(n, decimals = 0) {
  if (n === null || n === undefined || isNaN(n)) return '۰';
  const num = Number(n);
  const fixed = decimals > 0 ? num.toFixed(decimals) : Math.round(num).toString();
  const [int, dec] = fixed.split('.');
  const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
  return toPersianDigits(dec ? `${formatted}.${dec}` : formatted);
}

export function formatAmount(n, currency = '', decimals = 0) {
  const num = formatNumber(n, decimals);
  return currency ? `${num} ${currency}` : num;
}

// ── Jalali date ──
const J_MONTHS = ['حمل', 'ثور', 'جوزا', 'سرطان', 'اسد', 'سنبله', 'میزان', 'عقرب', 'قوس', 'جدی', 'دلو', 'حوت'];
const J_DAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

function gregorianToJalali(gy, gm, gd) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy;
  if (gy > 1600) {
    jy = 979;
    gy -= 1600;
  } else {
    jy = 0;
    gy -= 621;
  }
  const gy2 = (gm > 6) ? (gy + 1) : gy;
  let days = (365 * gy) + (Math.floor((gy2 + 3) / 4)) - (Math.floor((gy2 + 99) / 100)) + (Math.floor((gy2 + 399) / 400)) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * (Math.floor(days / 12053));
  days %= 12053;
  jy += 4 * (Math.floor(days / 1461));
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
  return [jy, jm, jd];
}

export function formatDate(dateStr, withTime = false) {
  if (!dateStr) return '';
  // Date-only values (YYYY-MM-DD) are parsed as UTC by JS, which shifts the day
  // in non-UTC timezones. Parse them as local so the calendar day is preserved.
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(String(dateStr).trim());
  const d = new Date(isDateOnly ? `${dateStr}T00:00:00` : dateStr);
  if (isNaN(d.getTime())) return '';
  const [jy, jm, jd] = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const datePart = `${toPersianDigits(jy)}/${toPersianDigits(String(jm).padStart(2, '0'))}/${toPersianDigits(String(jd).padStart(2, '0'))}`;
  if (!withTime) return datePart;
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${datePart} - ${toPersianDigits(h)}:${toPersianDigits(m)}`;
}

export function todayJalali() {
  const now = new Date();
  const [jy, jm, jd] = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
}

// ── Document numbers ──
export async function nextDocumentNo(prefix = 'DV') {
  const txs = await offlineDB.Transaction.list('-created_date', 500);
  let max = 0;
  for (const t of txs) {
    if (t.document_no) {
      const m = t.document_no.match(/(\d+)$/);
      if (m) max = Math.max(max, parseInt(m[1]));
    }
  }
  return `${prefix}-${String(max + 1).padStart(5, '0')}`;
}

export function stampDocumentNo(lines, docNo) {
  return lines.map(l => ({ ...l, document_no: docNo }));
}

export async function nextTransferNo(direction) {
  const prefix = direction === 'send' ? 'S' : 'R';
  const txs = await offlineDB.Transfer.list('-created_date', 500);
  let max = 0;
  for (const t of txs) {
    if (t.transfer_no) {
      const m = t.transfer_no.match(/(\d+)$/);
      if (m) max = Math.max(max, parseInt(m[1]));
    }
  }
  return `${prefix}-${String(max + 1).padStart(4, '0')}`;
}

// ── Sarraaf code ──
export async function nextSarraafCode() {
  const profiles = await offlineDB.SarraafProfile.list('-created_date', 500);
  let max = 0;
  for (const p of profiles) {
    if (p.code) {
      const m = p.code.match(/(\d+)$/);
      if (m) max = Math.max(max, parseInt(m[1]));
    }
  }
  return `SRF-${String(max + 1).padStart(5, '0')}`;
}

// ── Balance calculations ──
export function customerBalances(txs, customerId) {
  const balances = {};
  const filtered = txs.filter(t => t.customer_id === customerId && !t.deleted);
  for (const t of filtered) {
    const cur = t.currency || 'AFN';
    if (!balances[cur]) balances[cur] = 0;
    if (t.customer_side === 'credit') balances[cur] += t.amount || 0;
    else if (t.customer_side === 'debit') balances[cur] -= t.amount || 0;
  }
  return balances;
}

export function cashBalances(txs) {
  const balances = {};
  const filtered = txs.filter(t => t.counter_type === 'cash' && !t.deleted);
  for (const t of filtered) {
    const cur = t.currency || 'AFN';
    if (!balances[cur]) balances[cur] = 0;
    if (t.counter_side === 'debit') balances[cur] += t.amount || 0;
    else if (t.counter_side === 'credit') balances[cur] -= t.amount || 0;
  }
  return balances;
}

export function bankBalances(txs, bankId) {
  const balances = {};
  const filtered = txs.filter(t => t.counter_type === 'bank' && (!bankId || t.counter_id === bankId) && !t.deleted);
  for (const t of filtered) {
    const cur = t.currency || 'AFN';
    if (!balances[cur]) balances[cur] = 0;
    if (t.counter_side === 'debit') balances[cur] += t.amount || 0;
    else if (t.counter_side === 'credit') balances[cur] -= t.amount || 0;
  }
  return balances;
}

export function agentBalances(txs, agentId) {
  const balances = {};
  const filtered = txs.filter(t => t.counter_type === 'agent' && (!agentId || t.counter_id === agentId) && !t.deleted);
  for (const t of filtered) {
    const cur = t.currency || 'AFN';
    if (!balances[cur]) balances[cur] = 0;
    if (t.counter_side === 'debit') balances[cur] += t.amount || 0;
    else if (t.counter_side === 'credit') balances[cur] -= t.amount || 0;
  }
  return balances;
}

export function accountBalances(txs) {
  const cash = cashBalances(txs);
  const bank = {};
  for (const t of txs) {
    if (t.deleted) continue;
    if (t.counter_type === 'bank') {
      const key = t.counter_id || '_all';
      const cur = t.currency || 'AFN';
      if (!bank[key]) bank[key] = {};
      if (!bank[key][cur]) bank[key][cur] = 0;
      if (t.counter_side === 'debit') bank[key][cur] += t.amount || 0;
      else if (t.counter_side === 'credit') bank[key][cur] -= t.amount || 0;
    }
  }
  return { cash, bank };
}

// ── Quota ──
export function checkQuota(profile) {
  if (!profile) return { unlimited: true, remaining: Infinity, used: 0, limit: 0 };
  return {
    unlimited: profile.plan === 'special',
    used: profile.quota_used || 0,
    limit: profile.quota_limit || 0,
    remaining: Math.max(0, (profile.quota_limit || 0) - (profile.quota_used || 0)),
  };
}

// ── Labels ──
export const TX_TYPE_LABELS = {
  dadogereft: 'داد و گرفت',
  buy: 'خرید',
  sell: 'فروش',
  transfer_send: 'حواله ارسال',
  transfer_receive: 'حواله دریافت',
  transfer_execute: 'اجرای حواله',
  internal_transfer: 'انتقال داخلی',
  open_balance: 'افتتاح حساب',
  convert: 'تبدیل ارز',
  manual: 'سند دستی',
};

export const TRANSFER_STATUS_LABELS = {
  registered: 'ثبت‌شده',
  pending: 'در انتظار پرداخت',
  paid: 'پرداخت‌شده',
  cancelled: 'لغو‌شده',
};

export const CUSTOMER_TYPE_LABELS = {
  permanent: 'دائمی',
  temporary: 'موقت',
  misc: 'متفرقه',
};