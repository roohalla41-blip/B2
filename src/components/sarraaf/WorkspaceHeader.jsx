import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Bell, Moon, Sun, Calendar, Settings } from 'lucide-react';
import { useTheme } from 'next-themes';
import ExchangeMark from '@/components/ExchangeMark';
import SyncIndicator from '@/components/SyncIndicator';
import WorkspaceAccountMenu from '@/components/sarraaf/WorkspaceAccountMenu';

function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function WorkspaceHeader({ items, user, profile, paidSystemEnabled, openUpgrade, onLogout }) {
  const [search, setSearch] = useState('');
  const { theme, setTheme } = useTheme();
  const now = useNow();
  const matches = search.trim() ? items.filter(item => item.label.includes(search.trim())).slice(0, 8) : [];
  const dateStr = new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const timeStr = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(now);

  return (
    <header className="hidden md:flex sticky top-0 z-30 items-center justify-between gap-3 border-b border-border bg-card px-4 lg:px-6 py-2.5 print:hidden">
      {/* Right (start in RTL): Date & Time */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span className="tabular-nums" dir="ltr">{dateStr}</span>
          <span className="text-border">|</span>
          <span className="tabular-nums" dir="ltr">{timeStr}</span>
        </div>
        <ExchangeMark size="sm" />
      </div>

      {/* Center: Search */}
      <div className="relative flex-1 max-w-md min-w-0">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={event => setSearch(event.target.value)}
          onKeyDown={event => { if (event.key === 'Escape') setSearch(''); }}
          placeholder="جستجوی مشتری، حواله، تراکنش..."
          aria-label="جستجوی بخش‌های برنامه"
          className="w-full rounded-lg border border-input bg-muted/40 py-2 pr-9 pl-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
        />
        {search.trim() && (
          <div className="absolute top-full mt-2 inset-x-0 rounded-lg border border-border bg-popover p-1 shadow-card-hover z-50">
            {matches.length
              ? matches.map(item => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.featureKey} to={item.path} onClick={() => setSearch('')} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent">
                      <Icon className="w-4 h-4" />{item.label}
                    </Link>
                  );
                })
              : <p className="p-3 text-xs text-muted-foreground">بخشی یافت نشد</p>}
          </div>
        )}
      </div>

      {/* Left (end in RTL): Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="hidden xl:block"><SyncIndicator compact /></span>
        <Link to="/settings" aria-label="تنظیمات" title="تنظیمات" className="p-2 rounded-lg hover:bg-muted transition-colors">
          <Settings className="w-5 h-5 text-muted-foreground" />
        </Link>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="تغییر تم"
          title="تغییر تم"
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          {theme === 'dark'
            ? <Sun className="w-5 h-5 text-muted-foreground" />
            : <Moon className="w-5 h-5 text-muted-foreground" />}
        </button>
        <Link to="/notifications" aria-label="اعلان‌ها" title="اعلان‌ها" className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
        </Link>
        <WorkspaceAccountMenu
          user={user}
          profile={profile}
          settingsItem={items.find(item => item.featureKey === 'settings')}
          paidSystemEnabled={paidSystemEnabled}
          openUpgrade={openUpgrade}
          onLogout={onLogout}
        />
      </div>
    </header>
  );
}