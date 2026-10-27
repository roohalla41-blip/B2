// rateHistory.js — تاریخچه نرخ ارز برای گزارش نوسان
// داده‌ها در offlineDB.RateSetting (Supabase-backed) با key/value ذخیره می‌شوند
import { offlineDB as db } from './offlineQueue';

// Record a rate change
export async function recordRateChange({ currency, oldBuyRate, oldSellRate, newBuyRate, newSellRate, changedBy }) {
  try {
    const entry = {
      currency,
      old_buy_rate: oldBuyRate ?? 0,
      old_sell_rate: oldSellRate ?? 0,
      new_buy_rate: newBuyRate ?? 0,
      new_sell_rate: newSellRate ?? 0,
      buy_diff: (newBuyRate ?? 0) - (oldBuyRate ?? 0),
      sell_diff: (newSellRate ?? 0) - (oldSellRate ?? 0),
      changed_by: changedBy || '—',
      recorded_at: new Date().toISOString(),
    };
    const created = await db.RateSetting.create({
      key: `rate_history_${currency}_${Date.now()}`,
      value: JSON.stringify(entry),
      updated_at: new Date().toISOString(),
      updated_by_name: changedBy || '—',
    });
    return { ...entry, id: created?.id };
  } catch {
    return null;
  }
}

// Get rate history for a currency
export async function getRateHistory(currency, limit = 50) {
  try {
    const all = await db.RateSetting.list('-created_date', limit || 200);
    const filtered = all.filter(e => {
      if (!e.key || !e.key.startsWith('rate_history_')) return false;
      if (currency) return e.key.startsWith(`rate_history_${currency}_`);
      return true;
    });
    return filtered.map(e => {
      try { return { ...JSON.parse(e.value), id: e.id }; } catch { return null; }
    }).filter(Boolean).slice(0, limit);
  } catch {
    return [];
  }
}

// Get all currencies that have history
export async function getCurrenciesWithHistory() {
  try {
    const all = await db.RateSetting.list('-created_date', 200);
    const currencies = [...new Set(
      all
        .filter(e => e.key && e.key.startsWith('rate_history_'))
        .map(e => {
          const parts = e.key.split('_'); // rate_history_<currency>_<timestamp>
          return parts.length >= 4 ? parts[2] : null;
        })
        .filter(Boolean)
    )];
    return currencies;
  } catch {
    return [];
  }
}

// Get rate trend (up/down/stable) for a currency
export async function getRateTrend(currency) {
  const history = await getRateHistory(currency, 10);
  if (history.length < 2) return { trend: 'stable', change: 0, percent: 0 };
  const latest = history[0];
  const previous = history[history.length - 1];
  const change = (latest.new_buy_rate || 0) - (previous.new_buy_rate || 0);
  const percent = previous.new_buy_rate > 0 ? (change / previous.new_buy_rate) * 100 : 0;
  return {
    trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
    change,
    percent,
  };
}