import React from 'react';
import { getRoleDisplay } from '@/lib/chat';

export default function RoleBadge({ userRole, profile, size = 'sm' }) {
  const display = getRoleDisplay(userRole, profile);
  const Icon = display.icon;
  const sizes = {
    sm: { badge: 'text-[9px] px-1.5 py-0.5', icon: 'w-2.5 h-2.5' },
    md: { badge: 'text-[10px] px-2 py-0.5', icon: 'w-3 h-3' },
  };
  const s = sizes[size] || sizes.sm;

  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full font-medium ${display.bg} ${display.color} ${s.badge}`}>
      <Icon className={s.icon} />
      {display.label}
    </span>
  );
}