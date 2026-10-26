import React, { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, Wallet } from 'lucide-react';
import { formatNumber } from '@/lib/sarraaf';

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#06b6d4'];

export default function DashboardCharts({ type, transactions, treasuryBalances, isLoading }) {
  // ── Line chart: transactions per day (last 7 days) ──
  const lineData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = (transactions || []).filter(t => t.date === dateStr).length;
      days.push({
        date: new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'short' }).format(d),
        count,
      });
    }
    return days;
  }, [transactions]);

  // ── Donut chart: treasury balances by currency ──
  const donutData = useMemo(() => {
    return (treasuryBalances || [])
      .map((b, i) => ({
        name: b.currency || '—',
        value: Math.abs(b.balance || 0),
        color: CHART_COLORS[i % CHART_COLORS.length],
      }))
      .filter(d => d.value > 0);
  }, [treasuryBalances]);

  if (type === 'line') {
    return (
      <section className="rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <h2 className="text-sm font-semibold">روند معاملات ۷ روز اخیر</h2>
        </div>
        {isLoading ? (
          <div className="h-44 flex items-center justify-center text-muted-foreground text-sm">در حال بارگذاری...</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={lineData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                labelStyle={{ fontSize: 11 }}
              />
              <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ r: 3, fill: '#6366f1' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>
    );
  }

  if (type === 'donut') {
    return (
      <section className="rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center">
            <Wallet className="w-4 h-4 text-purple-600" />
          </div>
          <h2 className="text-sm font-semibold">وضعیت حساب‌ها</h2>
        </div>
        {isLoading || !donutData.length ? (
          <div className="h-44 flex items-center justify-center text-muted-foreground text-sm">در حال بارگذاری...</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={donutData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
              >
                {donutData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                formatter={(v) => formatNumber(v)}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </section>
    );
  }

  return null;
}