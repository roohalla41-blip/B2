import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import {
  loadNotifications, markNotificationRead, markAllNotificationsRead,
} from '@/lib/notificationsMockData';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bell, Package, Landmark, Wallet, ArrowRightLeft, MessageSquare,
  Megaphone, ShieldCheck, Info, ArrowRight, RefreshCw, Search, X, CheckCheck,
} from 'lucide-react';

const TYPE_META = {
  order: { label: 'سفارش', icon: Package, color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' },
  account: { label: 'حساب', icon: Landmark, color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400' },
  wallet: { label: 'کیف پول', icon: Wallet, color: 'bg-success/15 text-success' },
  transaction: { label: 'تراکنش', icon: ArrowRightLeft, color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400' },
  message: { label: 'پیام', icon: MessageSquare, color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' },
  announcement: { label: 'اطلاعیه', icon: Megaphone, color: 'bg-pink-100 text-pink-700 dark:bg-pink-950/30 dark:text-pink-400' },
  security: { label: 'امنیت', icon: ShieldCheck, color: 'bg-destructive/15 text-destructive' },
  general: { label: 'عمومی', icon: Info, color: 'bg-muted text-muted-foreground' },
};

const READ_FILTERS = [
  { value: 'all', label: 'همه' },
  { value: 'unread', label: 'خوانده‌نشده' },
  { value: 'read', label: 'خوانده‌شده' },
];

const TYPE_FILTERS = [
  { value: 'all', label: 'همه نوع‌ها' },
  { value: 'order', label: 'سفارش' },
  { value: 'account', label: 'حساب' },
  { value: 'wallet', label: 'کیف پول' },
  { value: 'transaction', label: 'تراکنش' },
  { value: 'message', label: 'پیام' },
  { value: 'security', label: 'امنیت' },
  { value: 'announcement', label: 'اطلاعیه' },
];

export default function CustomerNotifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id;
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [readFilter, setReadFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [markingAll, setMarkingAll] = useState(false);

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(false);
    try {
      const list = await loadNotifications(userId);
      setNotifications(list);
    } catch (e) {
      setError(true);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (readFilter === 'unread' && n.read) return false;
      if (readFilter === 'read' && !n.read) return false;
      if (typeFilter !== 'all' && n.type !== typeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const meta = TYPE_META[n.type] || TYPE_META.general;
        const haystack = `${n.title || ''} ${n.body || ''} ${meta.label}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [notifications, readFilter, typeFilter, search]);

  const hasActiveFilters = search || readFilter !== 'all' || typeFilter !== 'all';

  const clearAllFilters = () => {
    setSearch('');
    setReadFilter('all');
    setTypeFilter('all');
  };

  const handleOpenNotification = async (notif) => {
    if (!notif.read) {
      await markNotificationRead(notif.id);
      setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, read: true } : n));
    }
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    await markAllNotificationsRead(userId);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setMarkingAll(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-8 w-full rounded-lg" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-bold text-foreground">اعلان‌ها</h1>
        <Card>
          <CardContent className="p-8 text-center space-y-!4">
            <p className="text-sm text-muted-foreground">دریافت اطلاعات با مشکل مواجه شد.</p>
            <Button onClick={loadData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 ml-2" />
              تلاش مجدد
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 relative">
            <Bell className="w-5 h-5 text-primary" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-foreground">اعلان‌ها</h1>
            <p className="text-xs text-muted-foreground">اطلاعیه‌ها و اعلان‌های حساب شما</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate('/customer')}>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Summary & Mark All Read */}
      <Card className="shadow-sm">
        <CardContent className="p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground">اعلان‌های خوانده‌نشده</p>
            <p className={`text-sm font-bold ${unreadCount > 0 ? 'text-primary' : 'text-muted-foreground'}`}>{unreadCount}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0 || markingAll}
            className="text-xs"
          >
            {markingAll ? <RefreshCw className="w-3.5 h-3.5 ml-1.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5 ml-1.5" />}
            همه را خوانده‌شده کن
          </Button>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="جستجو در اعلان‌ها..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-xs pr-9"
        />
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
          {READ_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setReadFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-all ${
                readFilter === f.value ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-all ${
                typeFilter === f.value ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button onClick={clearAllFilters} className="text-[10px] text-destructive flex items-center gap-1">
          <X className="w-3 h-3" />
          پاک کردن فیلترها
        </button>
      )}

      {/* Notifications List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            {notifications.length === 0
              ? 'در حال حاضر اعلان جدیدی برای شما وجود ندارد.'
              : 'اعلانی با این فیلترها یافت نشد'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((notif) => {
            const meta = TYPE_META[notif.type] || TYPE_META.general;
            const TypeIcon = meta.icon;
            const date = new Date(notif.timestamp);
            return (
              <Card
                key={notif.id}
                className={`shadow-sm cursor-pointer hover:shadow-md transition-shadow ${!notif.read ? 'border-primary/30 bg-primary/5' : ''}`}
                onClick={() => handleOpenNotification(notif)}
              >
                <CardContent className="p-3 flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${meta.color}`}>
                    <TypeIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-xs truncate ${!notif.read ? 'font-bold text-foreground' : 'font-medium text-foreground'}`}>
                        {notif.title}
                      </p>
                      {!notif.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{notif.body}</p>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className={`text-[8px] px-1.5 py-0.5 rounded ${meta.color}`}>{meta.label}</span>
                      <span className="text-[9px] text-muted-foreground">
                        {date.toLocaleDateString('fa-IR')} {date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {notif.link && (
                      <p className="text-[9px] text-primary mt-1 flex items-center gap-0.5">
                        مشاهده جزئیات
                        <ArrowRight className="w-2.5 h-2.5" />
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}