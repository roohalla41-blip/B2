// defaultCurrencies.js — Single source of truth for default currency list
// All currencies managed in one structure. Admin can add/toggle but these are seeded on first launch.

export const DEFAULT_CURRENCIES = [
  // ── Fiat currencies ──
  { code: 'AFN',  name: 'افغانی',           symbol: '؋',   type: 'fiat',   buy_rate: 1,       sell_rate: 1,       daily_rate: 1,       decimals: 2, sort_order: 0,  is_active: true, is_system: true  },
  { code: 'USD',  name: 'دلار آمریکا',      symbol: '$',   type: 'fiat',   buy_rate: 70,      sell_rate: 71,      daily_rate: 70.5,    decimals: 2, sort_order: 1,  is_active: true, is_system: true  },
  { code: 'IRT',  name: 'تومان',            symbol: 'ت',   type: 'fiat',   buy_rate: 0.045,   sell_rate: 0.046,   daily_rate: 0.0455,  decimals: 0, sort_order: 2,  is_active: true, is_system: false },
  { code: 'EUR',  name: 'یورو',             symbol: '€',   type: 'fiat',   buy_rate: 75,      sell_rate: 76,      daily_rate: 75.5,    decimals: 2, sort_order: 3,  is_active: true, is_system: false },
  { code: 'AED',  name: 'درهم امارات',      symbol: 'د.إ', type: 'fiat',   buy_rate: 19,      sell_rate: 19.5,    daily_rate: 19.2,    decimals: 2, sort_order: 4,  is_active: true, is_system: false },
  { code: 'TRY',  name: 'لیر ترکیه',       symbol: '₺',   type: 'fiat',   buy_rate: 2.05,    sell_rate: 2.1,     daily_rate: 2.07,    decimals: 2, sort_order: 5,  is_active: true, is_system: false },
  { code: 'PKR',  name: 'روپیه پاکستان',     symbol: '₨',   type: 'fiat',   buy_rate: 0.25,    sell_rate: 0.26,    daily_rate: 0.255,   decimals: 2, sort_order: 6,  is_active: true, is_system: false },
  { code: 'INR',  name: 'روپیه هند',         symbol: '₹',   type: 'fiat',   buy_rate: 0.84,    sell_rate: 0.85,    daily_rate: 0.845,   decimals: 2, sort_order: 7,  is_active: true, is_system: false },
  { code: 'SAR',  name: 'ریال سعودی',       symbol: '﷼',   type: 'fiat',   buy_rate: 18.67,   sell_rate: 18.8,    daily_rate: 18.73,   decimals: 2, sort_order: 8,  is_active: true, is_system: false },
  { code: 'CAD',  name: 'دلار کانادا',      symbol: 'C$',  type: 'fiat',   buy_rate: 51,      sell_rate: 52,      daily_rate: 51.5,    decimals: 2, sort_order: 9,  is_active: true, is_system: false },
  { code: 'GBP',  name: 'پوند انگلیس',      symbol: '£',   type: 'fiat',   buy_rate: 88,      sell_rate: 89,      daily_rate: 88.5,    decimals: 2, sort_order: 10, is_active: true, is_system: false },
  { code: 'CNY',  name: 'یوان چین',         symbol: '¥',   type: 'fiat',   buy_rate: 9.6,     sell_rate: 9.7,     daily_rate: 9.65,    decimals: 2, sort_order: 11, is_active: true, is_system: false },
  { code: 'QAR',  name: 'ریال قطر',         symbol: '﷼',   type: 'fiat',   buy_rate: 19.2,    sell_rate: 19.3,    daily_rate: 19.25,   decimals: 2, sort_order: 12, is_active: true, is_system: false },
  { code: 'RUB',  name: 'روبل روسیه',        symbol: '₽',   type: 'fiat',   buy_rate: 0.75,    sell_rate: 0.76,    daily_rate: 0.755,   decimals: 2, sort_order: 13, is_active: true, is_system: false },
  { code: 'AUD',  name: 'دلار استرالیا',     symbol: 'A$',  type: 'fiat',   buy_rate: 47,      sell_rate: 48,      daily_rate: 47.5,    decimals: 2, sort_order: 14, is_active: true, is_system: false },
  { code: 'CHF',  name: 'فرانک سوئیس',       symbol: 'Fr',  type: 'fiat',   buy_rate: 78,      sell_rate: 79,      daily_rate: 78.5,    decimals: 2, sort_order: 15, is_active: true, is_system: false },
  // ── Crypto assets ──
  { code: 'USDT', name: 'تتر',              symbol: '₮',   type: 'crypto', buy_rate: 70,      sell_rate: 71,      daily_rate: 70.5,    decimals: 6, sort_order: 16, is_active: true, is_system: false },
  { code: 'USDC', name: 'یو‌اس‌دی‌سی',       symbol: '$',   type: 'crypto', buy_rate: 70,      sell_rate: 71,      daily_rate: 70.5,    decimals: 6, sort_order: 17, is_active: true, is_system: false },
  { code: 'BTC',  name: 'بیت‌کوین',          symbol: '₿',   type: 'crypto', buy_rate: 0,       sell_rate: 0,       daily_rate: 0,       decimals: 8, sort_order: 18, is_active: true, is_system: false },
  { code: 'ETH',  name: 'اتریوم',           symbol: 'Ξ',   type: 'crypto', buy_rate: 0,       sell_rate: 0,       daily_rate: 0,       decimals: 8, sort_order: 19, is_active: true, is_system: false },
];

// IRT (Toman) is 1/10 of IRR (Rial). All internal calculations use IRT directly as Toman.
export const IRT_TO_IRR_MULTIPLIER = 10;