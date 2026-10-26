// dashboardStats.js — محاسبات خلاصه داشبورد از داده‌های واقعی برنامه (بدون هیچ عدد فرضی)
import { formatNumber } from '@/lib/sarraaf';

const dayKey = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
};

function addTo(map, currency, value) {
  map[currency] = (map[currency] || 0) + (Number(value) || 0);
}

export function totalsByCurrency(txs, types, date) {
  const out = {};
  for (const t of txs || []) {
    if (!types.includes(t.type)) continue;
    if (date && t.date !== date) continue;
    addTo(out, t.currency || 'AFN', t.amount);
  }
  return out;
}

export function balancesByCurrency(rows, field) {
  const out = {};
  for (const r of rows || []) addTo(out, r.currency || 'AFN', r[field]);
  return out;
}

function orderedEntries(map) {
  return Object.entries(map)
    .filter(([, v]) => v !== 0)
    .sort(([a], [b]) => (a === 'AFN' ? -1 : b === 'AFN' ? 1 : a.localeCompare(b)));
}

function trendFor(txs, types, currency) {
  if (!currency) return null;
  const today = totalsByCurrency(txs, types, dayKey(0))[currency] || 0;
  const yesterday = totalsByCurrency(txs, types, dayKey(-1))[currency] || 0;
  if (!yesterday) return null;
  return ((today - yesterday) / yesterday) * 100;
}

function moneyCard(key, label, map, names, extra = {}) {
  const [first, ...rest] = orderedEntries(map);
  const unitOf = (code) => names[code] || code;
  return {
    key,
    label,
    main: { value: formatNumber(first ? first[1] : 0), unit: unitOf(first ? first[0] : 'AFN') },
    others: rest.slice(0, 2).map(([c, v]) => ({ value: formatNumber(v), unit: unitOf(c) })),
    footer: [],
    trend: null,
    mainCurrency: first ? first[0] : null,
    ...extra,
  };
}

export function buildSummaryCards({ txs, customers, treasuryBalances, bankBalances, debtorCount, currencies, loading }) {
  const names = {};
  for (const c of currencies || []) names[c.code] = c.name;

  const sentTypes = ['transfer_send'];
  const receivedTypes = ['transfer_receive'];
  const accountCount = new Set((bankBalances || []).map(r => r.bank_id ?? r.bank_name)).size;
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const newCustomers = (customers || []).filter(c => new Date(c.created_date || c.created_at) >= weekAgo).length;

  const sent = moneyCard('sent', 'مجموع ارسال‌ها', totalsByCurrency(txs, sentTypes), names, {
    footer: [`تعداد تراکنش: ${formatNumber((txs || []).filter(t => sentTypes.includes(t.type)).length)}`],
  });
  sent.trend = trendFor(txs, sentTypes, sent.mainCurrency);
  const received = moneyCard('received', 'مجموع دریافت‌ها', totalsByCurrency(txs, receivedTypes), names, {
    footer: [`تعداد تراکنش: ${formatNumber((txs || []).filter(t => receivedTypes.includes(t.type)).length)}`],
  });
  received.trend = trendFor(txs, receivedTypes, received.mainCurrency);

  const cards = [
    moneyCard('bank', 'موجودی بانک', balancesByCurrency(bankBalances, 'current_balance'), names, {
      footer: [`حساب‌های فعال: ${formatNumber(accountCount)}`],
    }),
    moneyCard('treasury', 'موجودی صندوق', balancesByCurrency(treasuryBalances, 'balance'), names),
    {
      key: 'customers',
      label: 'مشتریان فعال',
      main: { value: formatNumber((customers || []).length), unit: 'مشتری' },
      others: [],
      footer: [`جدید در ۷ روز اخیر: ${formatNumber(newCustomers)}`, `بدهکاران: ${formatNumber(debtorCount)}`],
      trend: null,
    },
    sent,
    received,
  ];

  return cards.map(card => (loading[card.key]
    ? { ...card, main: { value: '...', unit: '' }, others: [], footer: [], trend: null }
    : card));
}