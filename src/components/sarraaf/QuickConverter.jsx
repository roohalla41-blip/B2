import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/lib/sarraaf';

const SELECT_CLASS = 'rounded-lg border border-input bg-transparent px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring';

export default function QuickConverter({ currencies }) {
  const navigate = useNavigate();
  const list = (currencies || []).filter(c => c.is_active !== false);
  const codes = ['AFN', ...list.map(c => c.code).filter(code => code !== 'AFN')];
  const [amount, setAmount] = useState('');
  const [from, setFrom] = useState('AFN');
  const [to, setTo] = useState('');
  const target = to || codes[1] || 'AFN';

  // نرخ‌ها فقط از مقادیر ثبت‌شده توسط صراف خوانده می‌شود؛ صراف ارز مبدأ را می‌خرد و ارز مقصد را می‌فروشد
  const rateOf = (code, side) => (code === 'AFN' ? 1 : Number(list.find(c => c.code === code)?.[side]) || 0);
  const amt = parseFloat(amount) || 0;
  const give = rateOf(from, 'buy_rate');
  const get = rateOf(target, 'sell_rate');
  const noRate = amt > 0 && from !== target && (!give || !get);
  const result = amt > 0 && !noRate ? (from === target ? amt : (amt * give) / get) : 0;

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-card">
      <h2 className="text-sm font-semibold mb-3">تبدیل ارز سریع</h2>
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="مبلغ" className="flex-1 min-w-0 rounded-lg border border-input bg-transparent px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-ring" />
          <select value={from} onChange={e => setFrom(e.target.value)} className={SELECT_CLASS}>
            {codes.map(code => <option key={code} value={code}>{code}</option>)}
          </select>
        </div>
        <div className="flex justify-center"><ArrowDownUp className="w-4 h-4 text-muted-foreground" /></div>
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm tabular-nums font-semibold">
            {formatNumber(result, 2)}
          </div>
          <select value={target} onChange={e => setTo(e.target.value)} className={SELECT_CLASS}>
            {codes.map(code => <option key={code} value={code}>{code}</option>)}
          </select>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          {noRate ? 'نرخ این ارز در سیستم ثبت نشده است' : 'بر اساس نرخ‌های ثبت‌شده توسط صراف'}
        </p>
        <Button className="w-full" onClick={() => navigate('/convert')}>تبدیل</Button>
      </div>
    </section>
  );
}