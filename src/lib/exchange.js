// exchange.js — currency rates and conversion (offline-first, no Base44 Integration)
import { offlineDB } from './offlineQueue';

let _currencies = null;
let _rateSettings = null;

export async function loadCurrencies(force = false) {
  if (_currencies && !force) return _currencies;
  _currencies = await offlineDB.Currency.list('sort_order', 100);
  return _currencies;
}

export async function loadRateSettings(force = false) {
  if (_rateSettings && !force) return _rateSettings;
  const list = await offlineDB.RateSetting.list('-created_date', 50);
  _rateSettings = {};
  for (const r of list) _rateSettings[r.key] = r.value;
  return _rateSettings;
}

export async function getRate(currency) {
  const cs = await loadCurrencies();
  return cs.find(c => c.code === currency);
}

export async function getRateSetting(key) {
  const rs = await loadRateSettings();
  return parseFloat(rs[key] || '0');
}

// Convert any amount to AFN using rate settings + currency rates
export async function toAfn(amount, currency) {
  if (!amount || !currency) return 0;
  if (currency === 'AFN') return amount;
  if (currency === 'USD') {
    const usdAfn = await getRateSetting('usd_afn');
    return amount * (usdAfn || 0);
  }
  if (currency === 'IRT') {
    // IRT = Toman. 1 AFN ≈ X Toman via afn_toman setting
    const afnToman = await getRateSetting('afn_toman');
    if (!afnToman) return 0;
    return amount / (afnToman || 1);
  }
  const rate = await getRate(currency);
  if (rate && rate.daily_rate) return amount * rate.daily_rate;
  if (rate && rate.sell_rate) return amount * rate.sell_rate;
  return 0;
}

export async function convertCurrency(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return amount;
  const afn = await toAfn(amount, fromCurrency);
  if (toCurrency === 'AFN') return afn;
  if (toCurrency === 'USD') {
    const usdAfn = await getRateSetting('usd_afn');
    return afn / (usdAfn || 1);
  }
  if (toCurrency === 'IRT') {
    const afnToman = await getRateSetting('afn_toman');
    return afn * (afnToman || 1);
  }
  const rate = await getRate(toCurrency);
  if (rate && rate.buy_rate) return afn / rate.buy_rate;
  return 0;
}

// Suggest a rate for trade operations
export function suggestRate(currencies, tradeCurrency, side) {
  const c = currencies.find(cur => cur.code === tradeCurrency);
  if (!c) return 0;
  return side === 'buy' ? c.buy_rate : c.sell_rate;
}

// Equivalent amount in base currency for trial balance
export function equivalentAmount(tx, rateSettings, currencies) {
  if (!tx || !tx.amount) return 0;
  const cur = tx.currency;
  if (cur === 'AFN') return tx.amount;
  if (cur === 'USD') {
    const usdAfn = parseFloat(rateSettings?.usd_afn || '0');
    return tx.amount * usdAfn;
  }
  if (cur === 'IRT') {
    const afnToman = parseFloat(rateSettings?.afn_toman || '0');
    if (!afnToman) return 0;
    return tx.amount / afnToman;
  }
  const rate = currencies?.find(c => c.code === cur);
  return tx.amount * (rate?.daily_rate || rate?.sell_rate || 0);
}