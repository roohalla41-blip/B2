// UsageBar.jsx — Thin progress bar showing quota usage (green/yellow/red)
import React from 'react';
import { formatNumber } from '@/lib/sarraaf';

export default function UsageBar({ label, used, limit, unit }) {
  if (limit < 0 || limit === Infinity) return null;
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const color = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-green-500';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {formatNumber(used)} / {formatNumber(limit)}
          {unit && <span className="text-muted-foreground mr-1">{unit}</span>}
        </span>
      </div>
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}