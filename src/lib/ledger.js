// ledger.js — double-entry document builders and ledger engine
import { nextDocumentNo, stampDocumentNo, nextTransferNo, todayJalali } from './sarraaf';

// ── Builders: each returns an array of Transaction lines ──

// Dadogereft (receive/pay)
export function buildDadogereft({ customer_id, type, currency, amount, counter_type, counter_id, description }) {
  const docDate = new Date().toISOString().split('T')[0];
  const isReceive = type === 'receive';
  // receive: customer credit, counter debit
  // pay: customer debit, counter credit
  return [
    {
      date: docDate,
      type: 'dadogereft',
      customer_id,
      currency,
      amount,
      customer_side: isReceive ? 'credit' : 'debit',
      counter_type,
      counter_id,
      counter_side: isReceive ? 'debit' : 'credit',
      description: description || (isReceive ? 'دریافت از مشتری' : 'پرداخت به مشتری'),
    },
  ];
}

// Trade (buy/sell)
export function buildTrade({ customer_id, mode, tradeCurrency, settleCurrency, amount, rate, counter_type, counter_id, fee, fee_currency, description }) {
  const docDate = new Date().toISOString().split('T')[0];
  const isBuy = mode === 'buy';
  // buy: sarraaf buys from customer → customer debit tradeCurrency, customer credit settleCurrency
  // sell: sarraaf sells to customer → customer credit tradeCurrency, customer debit settleCurrency
  const settleAmount = amount * rate;
  const txType = isBuy ? 'buy' : 'sell';
  const lines = [
    {
      date: docDate,
      type: txType,
      customer_id,
      currency: tradeCurrency,
      amount,
      customer_side: isBuy ? 'debit' : 'credit',
      counter_type,
      counter_id,
      counter_side: isBuy ? 'credit' : 'debit',
      pair_currency: settleCurrency,
      pair_amount: settleAmount,
      rate,
      description: description || (isBuy ? `خرید ${tradeCurrency}` : `فروش ${tradeCurrency}`),
    },
  ];
  // Fee line — double-sided: customer debit + fee income credit
  if (fee && fee > 0) {
    lines.push({
      date: docDate,
      type: txType,
      customer_id,
      currency: fee_currency || settleCurrency,
      amount: fee,
      customer_side: 'debit',
      counter_type: 'none',
      counter_side: 'none',
      description: `کارمزد ${isBuy ? 'خرید' : 'فروش'}`,
    });
    // Balancing line: credit fee income account
    lines.push({
      date: docDate,
      type: txType,
      customer_id,
      currency: fee_currency || settleCurrency,
      amount: fee,
      customer_side: 'none',
      counter_type: 'fee',
      counter_side: 'credit',
      description: `سود کارمزد ${isBuy ? 'خرید' : 'فروش'}`,
    });
  }
  return lines;
}

// Internal transfer (cash ↔ bank)
export function buildInternalTransfer({ fromType, fromId, toType, toId, currency, amount, description }) {
  const docDate = new Date().toISOString().split('T')[0];
  // Same account → single-line balance adjustment (add balance to itself)
  if (fromType === toType && fromId === toId) {
    return [
      {
        date: docDate,
        type: 'internal_transfer',
        currency,
        amount,
        customer_side: 'none',
        counter_type: toType,
        counter_id: toId,
        counter_side: 'debit',
        description: description || 'افزایش موجودی صندوق',
      },
    ];
  }
  return [
    {
      date: docDate,
      type: 'internal_transfer',
      currency,
      amount,
      customer_side: 'none',
      counter_type: fromType,
      counter_id: fromId,
      counter_side: 'credit',
      description: description || 'انتقال داخلی - مبدأ',
    },
    {
      date: docDate,
      type: 'internal_transfer',
      currency,
      amount,
      customer_side: 'none',
      counter_type: toType,
      counter_id: toId,
      counter_side: 'debit',
      description: description || 'انتقال داخلی - مقصد',
    },
  ];
}

// Transfer send
export async function buildTransferSend({ customer_id, sender_name, sender_phone, receiver_name, receiver_phone, destination, currency, amount, rate, fee, fee_currency, agent_id, agent_route, description }) {
  const docDate = new Date().toISOString().split('T')[0];
  const transferNo = await nextTransferNo('send');
  const docNo = await nextDocumentNo('DV');
  const total = amount + (fee || 0);
  const lines = [
    {
      date: docDate,
      type: 'transfer_send',
      customer_id,
      currency,
      amount,
      customer_side: 'debit',
      counter_type: 'agent',
      counter_id: agent_id,
      counter_side: 'credit',
      transfer_no: transferNo,
      description: description || `حواله ارسال - ${receiver_name}`,
    },
  ];
  if (fee && fee > 0) {
    lines.push({
      date: docDate,
      type: 'transfer_send',
      customer_id,
      currency: fee_currency || currency,
      amount: fee,
      customer_side: 'debit',
      counter_type: 'none',
      counter_side: 'none',
      description: 'کارمزد حواله',
    });
    // Balancing line: credit fee income account
    lines.push({
      date: docDate,
      type: 'transfer_send',
      customer_id,
      currency: fee_currency || currency,
      amount: fee,
      customer_side: 'none',
      counter_type: 'fee',
      counter_side: 'credit',
      description: 'سود کارمزد حواله ارسال',
    });
  }
  const stamped = stampDocumentNo(lines, docNo);
  return { lines: stamped, transfer: {
    direction: 'send', document_no: docNo, customer_id, sender_name, sender_phone,
    receiver_name, receiver_phone, destination, currency, amount, rate, fee,
    fee_currency, total, agent_id, agent_route, transfer_no: transferNo,
    status: 'registered', description,
  }};
}

// Transfer receive
export async function buildTransferReceive({ customer_id, sender_name, sender_phone, receiver_name, receiver_phone, destination, currency, amount, rate, fee, fee_currency, agent_id, agent_route, description }) {
  const docDate = new Date().toISOString().split('T')[0];
  const transferNo = await nextTransferNo('receive');
  const docNo = await nextDocumentNo('DV');
  const total = amount + (fee || 0);
  const lines = [
    {
      date: docDate,
      type: 'transfer_receive',
      customer_id,
      currency,
      amount,
      customer_side: 'credit',
      counter_type: 'agent',
      counter_id: agent_id,
      counter_side: 'debit',
      transfer_no: transferNo,
      description: description || `حواله دریافت - ${receiver_name}`,
    },
  ];
  if (fee && fee > 0) {
    lines.push({
      date: docDate,
      type: 'transfer_receive',
      customer_id,
      currency: fee_currency || currency,
      amount: fee,
      customer_side: 'credit',
      counter_type: 'none',
      counter_side: 'none',
      description: 'کارمزد حواله',
    });
    // Balancing line: debit fee income account
    lines.push({
      date: docDate,
      type: 'transfer_receive',
      customer_id,
      currency: fee_currency || currency,
      amount: fee,
      customer_side: 'none',
      counter_type: 'fee',
      counter_side: 'debit',
      description: 'سود کارمزد حواله دریافت',
    });
  }
  const stamped = stampDocumentNo(lines, docNo);
  return { lines: stamped, transfer: {
    direction: 'receive', document_no: docNo, customer_id, sender_name, sender_phone,
    receiver_name, receiver_phone, destination, currency, amount, rate, fee,
    fee_currency, total, agent_id, agent_route, transfer_no: transferNo,
    status: 'registered', description,
  }};
}

// Transfer execute
export async function buildTransferExecute(transfer, payCurrency, payAmount, payCounter) {
  const docDate = new Date().toISOString().split('T')[0];
  const docNo = await nextDocumentNo('DV');
  const lines = [
    {
      date: docDate,
      type: 'transfer_execute',
      customer_id: transfer.customer_id,
      currency: transfer.currency,
      amount: transfer.amount,
      customer_side: transfer.direction === 'send' ? 'credit' : 'debit',
      counter_type: payCounter || 'cash',
      counter_side: transfer.direction === 'send' ? 'debit' : 'credit',
      transfer_no: transfer.transfer_no,
      description: `اجرای حواله ${transfer.transfer_no}`,
    },
  ];
  return stampDocumentNo(lines, docNo);
}

// Convert currency (wallet-style)
export function buildConvert({ customer_id, fromCurrency, fromAmount, toCurrency, toAmount, rate, description }) {
  const docDate = new Date().toISOString().split('T')[0];
  return [
    {
      date: docDate,
      type: 'convert',
      customer_id,
      currency: fromCurrency,
      amount: fromAmount,
      customer_side: 'debit',
      counter_type: 'none',
      counter_side: 'none',
      pair_currency: toCurrency,
      pair_amount: toAmount,
      rate,
      description: description || `تبدیل ${fromCurrency} به ${toCurrency}`,
    },
    {
      date: docDate,
      type: 'convert',
      customer_id,
      currency: toCurrency,
      amount: toAmount,
      customer_side: 'credit',
      counter_type: 'none',
      counter_side: 'none',
      pair_currency: fromCurrency,
      pair_amount: fromAmount,
      rate,
      description: description || `تبدیل ${fromCurrency} به ${toCurrency}`,
    },
  ];
}

// Open balance
export function buildOpenBalance({ customer_id, currency, amount, side, description }) {
  const docDate = new Date().toISOString().split('T')[0];
  return [
    {
      date: docDate,
      type: 'open_balance',
      customer_id,
      currency,
      amount,
      customer_side: side,
      counter_type: 'none',
      counter_side: 'none',
      description: description || 'افتتاح حساب',
    },
  ];
}

// Manual voucher
export function buildManualVoucher(lines) {
  const docDate = new Date().toISOString().split('T')[0];
  return lines.map(l => ({
    date: docDate,
    type: 'manual',
    customer_id: l.customer_id,
    currency: l.currency,
    amount: l.amount,
    customer_side: l.customer_side || (l.account_type === 'customer' ? l.side : 'none'),
    counter_type: l.counter_type || (l.account_type === 'cash' ? 'cash' : l.account_type === 'bank' ? 'bank' : l.account_type === 'agent' ? 'agent' : 'none'),
    counter_id: l.counter_id,
    counter_side: l.counter_side || (l.account_type !== 'customer' ? l.side : 'none'),
    description: l.description || 'سند دستی',
  }));
}

// ── Ledger engine ──

// Trial balance in base currency
export function trialBalanceBase(txs, rateSettings, currencies) {
  const balances = {};
  for (const t of txs) {
    if (t.deleted) continue;
    const cur = t.currency || 'AFN';
    if (!balances[cur]) balances[cur] = { debit: 0, credit: 0 };
    if (t.customer_side === 'debit') balances[cur].debit += t.amount || 0;
    if (t.customer_side === 'credit') balances[cur].credit += t.amount || 0;
    if (t.counter_side === 'debit') balances[cur].debit += t.amount || 0;
    if (t.counter_side === 'credit') balances[cur].credit += t.amount || 0;
  }
  let totalDebit = 0, totalCredit = 0;
  for (const [cur, b] of Object.entries(balances)) {
    if (cur === 'AFN') {
      totalDebit += b.debit;
      totalCredit += b.credit;
    } else {
      const rate = currencies?.find(c => c.code === cur);
      const usdAfn = parseFloat(rateSettings?.usd_afn || '0');
      const afnToman = parseFloat(rateSettings?.afn_toman || '0');
      let afnRate = 1;
      if (cur === 'USD') afnRate = usdAfn;
      else if (cur === 'IRT') afnRate = afnToman > 0 ? 1 / afnToman : 0;
      else afnRate = rate?.daily_rate || rate?.sell_rate || 0;
      totalDebit += b.debit * afnRate;
      totalCredit += b.credit * afnRate;
    }
  }
  return { balances, totalDebit, totalCredit, isBalanced: Math.abs(totalDebit - totalCredit) < 1 };
}

// Document-level balance
export function documentBaseBalances(lines) {
  const byCurrency = {};
  for (const l of lines) {
    const cur = l.currency || 'AFN';
    if (!byCurrency[cur]) byCurrency[cur] = { debit: 0, credit: 0 };
    if (l.customer_side === 'debit' || l.counter_side === 'debit') byCurrency[cur].debit += l.amount || 0;
    if (l.customer_side === 'credit' || l.counter_side === 'credit') byCurrency[cur].credit += l.amount || 0;
  }
  return byCurrency;
}

// Compute profit
export function computeProfit(txs, rateSettings, currencies) {
  let totalFee = 0;
  let totalRateDiff = 0;
  for (const t of txs) {
    // Skip deleted or cancelled transactions
    if (t.deleted || t.cancelled) continue;

    // Fees
    if (t.fee && t.fee > 0) {
      const feeAfn = t.fee_currency === 'AFN' ? t.fee :
        t.fee_currency === 'USD' ? t.fee * parseFloat(rateSettings?.usd_afn || '0') :
        t.fee_currency === 'IRT' ? (parseFloat(rateSettings?.afn_toman || '1') > 0 ? t.fee / parseFloat(rateSettings?.afn_toman || '1') : 0) :
        t.fee;
      totalFee += feeAfn;
    }
    // Rate difference for trades (directional — loss is negative)
    // buy: profit = (dailyRate - rate) * amount  → bought below market = profit
    // sell: profit = (rate - dailyRate) * amount → sold above market = profit
    if (t.type === 'buy' || t.type === 'sell') {
      const cur = currencies?.find(c => c.code === t.currency);
      if (cur && t.pair_amount && t.rate) {
        const dailyRate = cur.daily_rate || cur.sell_rate || 0;
        if (dailyRate > 0) {
          const diff = (t.type === 'buy' ? (dailyRate - t.rate) : (t.rate - dailyRate)) * (t.amount || 0);
          const diffAfn = t.pair_currency === 'AFN' || !t.pair_currency ? diff :
            t.pair_currency === 'USD' ? diff * parseFloat(rateSettings?.usd_afn || '0') :
            t.pair_currency === 'IRT' ? (parseFloat(rateSettings?.afn_toman || '1') > 0 ? diff / parseFloat(rateSettings?.afn_toman || '1') : 0) :
            diff;
          totalRateDiff += diffAfn;
        }
      }
    }
  }
  return { totalFee, totalRateDiff, total: totalFee + totalRateDiff };
}

// Compute detailed profit breakdown
export function computeProfitDetailed(txs, rateSettings, currencies) {
  const byType = {};
  const byCurrency = {};
  const lineItems = [];
  let totalFee = 0;
  let totalRateDiff = 0;

  const toAfn = (amount, currency) => {
    if (!amount) return 0;
    if (currency === 'AFN') return amount;
    if (currency === 'USD') return amount * parseFloat(rateSettings?.usd_afn || '0');
    if (currency === 'IRT') {
      const afnToman = parseFloat(rateSettings?.afn_toman || '0');
      return afnToman > 0 ? amount / afnToman : 0;
    }
    const cur = currencies?.find(c => c.code === currency);
    return amount * (cur?.daily_rate || cur?.sell_rate || 0);
  };

  for (const t of txs) {
    // Skip deleted or cancelled transactions
    if (t.deleted || t.cancelled) continue;

    let feeAfn = 0;
    let rateDiffAfn = 0;

    // Fees
    if (t.fee && t.fee > 0) {
      feeAfn = toAfn(t.fee, t.fee_currency || t.currency || 'AFN');
      totalFee += feeAfn;
    }

    // Rate difference for trades (directional — loss is negative)
    // buy: profit = (dailyRate - rate) * amount  → bought below market = profit
    // sell: profit = (rate - dailyRate) * amount → sold above market = profit
    if (t.type === 'buy' || t.type === 'sell') {
      const cur = currencies?.find(c => c.code === t.currency);
      if (cur && t.pair_amount && t.rate) {
        const dailyRate = cur.daily_rate || cur.sell_rate || 0;
        if (dailyRate > 0) {
          const diff = (t.type === 'buy' ? (dailyRate - t.rate) : (t.rate - dailyRate)) * (t.amount || 0);
          rateDiffAfn = toAfn(diff, t.pair_currency || 'AFN');
          totalRateDiff += rateDiffAfn;
        }
      }
    }

    const lineProfit = feeAfn + rateDiffAfn;
    if (lineProfit !== 0 || feeAfn > 0) {
      const typeKey = t.type || 'other';
      if (!byType[typeKey]) byType[typeKey] = { fee: 0, rateDiff: 0, count: 0 };
      byType[typeKey].fee += feeAfn;
      byType[typeKey].rateDiff += rateDiffAfn;
      byType[typeKey].count++;

      const curKey = t.currency || 'AFN';
      if (!byCurrency[curKey]) byCurrency[curKey] = { fee: 0, rateDiff: 0, count: 0 };
      byCurrency[curKey].fee += feeAfn;
      byCurrency[curKey].rateDiff += rateDiffAfn;
      byCurrency[curKey].count++;

      lineItems.push({
        id: t.id,
        date: t.date,
        document_no: t.document_no || '',
        type: t.type,
        customer_name: t.customer_name || '',
        currency: t.currency,
        amount: t.amount || 0,
        rate: t.rate || 0,
        fee: t.fee || 0,
        fee_currency: t.fee_currency || '',
        feeAfn,
        rateDiffAfn,
        profit: lineProfit,
        description: t.description || '',
      });
    }
  }

  lineItems.sort((a, b) => b.profit - a.profit);

  return {
    totalFee,
    totalRateDiff,
    total: totalFee + totalRateDiff,
    byType,
    byCurrency,
    lineItems,
  };
}

// Group transactions by document_no
export function groupByDocument(txs) {
  const groups = {};
  for (const t of txs) {
    const key = t.document_no || t.id;
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  }
  return groups;
}