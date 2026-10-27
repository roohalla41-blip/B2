import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { offlineDB } from '@/lib/offlineQueue';
import { PageHeader, EmptyState, LoadingState } from '@/components/sarraaf/Pieces';
import { Bell, CheckCheck, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await offlineDB.UserNotification.list('-created_date', 100);
        const mine = list.filter(n =>
          n.target_user_id === user?.id ||
          n.target_role === 'all' ||
          n.target_role === user?.role
        );
        if (!cancelled) setNotifications(mine);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const markRead = async (id) => {
    try {
      await offlineDB.UserNotification.update(id, { read: true });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch {
      // ignore
    }
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    for (const n of unread) {
      await offlineDB.UserNotification.update(n.id, { read: true });
    }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast({ title: 'همه خوانده شد' });
  };

  const kindLabel = (kind) => {
    const map = {
      paid_purchase: 'خرید نسخه پولی',
      paid_activated: 'فعال شدن نسخه پولی',
      paid_expired: 'پایان اعتبار',
      general: 'اطلاعیه',
      account_limitation: 'محدودیت حساب',
      feature_toggle: 'تغییر قابلیت',
      app_update: 'آپدیت برنامه',
      custom: 'پیام',
    };
    return map[kind] || 'پیام';
  };

  return (
    <>
      <PageHeader
        title="اعلان‌ها"
        icon={Bell}
        actions={
          notifications.some(n => !n.read) ? (
            <Button size="sm" variant="ghost" onClick={markAllRead}>
              <CheckCheck className="w-4 h-4" />
              خواندن همه
            </Button>
          ) : undefined
        }
      />

      {loading ? <LoadingState /> : notifications.length === 0 ? (
        <EmptyState icon={Bell} title="اعلانی نیست" description="پیام جدیدی وجود ندارد" />
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`p-3 rounded-xl border ${n.read ? 'bg-background' : 'bg-primary/5 border-primary/20'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {kindLabel(n.kind)}
                    </span>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
                  {n.sent_by_name && (
                    <p className="text-[10px] text-muted-foreground mt-1">از: {n.sent_by_name}</p>
                  )}
                  {n.action_url && (
                    <a
                      href={n.action_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {n.action_label || 'مشاهده لینک'}
                      <ExternalLink className="w-3 h-3 opacity-70" />
                    </a>
                  )}
                </div>
                {!n.read && (
                  <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>
                    <CheckCheck className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}