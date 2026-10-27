import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { loadNotifications } from '@/lib/notificationsMockData';
import {
  Home, Wallet, Smartphone, Gamepad2, Send, Landmark,
  Package, MessageSquare, Coins, LogOut, Bell, LifeBuoy, MoreHorizontal, X, Globe, Store
} from 'lucide-react';
import ExchangeMark from '@/components/ExchangeMark';
import TermsGate from '@/components/TermsGate';
import ForceUpdateGate from '@/components/ForceUpdateGate';
import { useHardwareBack } from '@/hooks/useHardwareBack';
import PullToRefresh from '@/components/PullToRefresh';
import PwaInstallPrompt from '@/components/PwaInstallPrompt';

const NAV_ITEMS = [
  { path: '/customer', label: 'خانه', icon: Home, exact: true },
  { path: '/customer/wallet', label: 'کیف پول', icon: Wallet },
  { path: '/customer/recharge', label: 'شارژ', icon: Smartphone },
  { path: '/customer/afghan5', label: 'افغان۵', icon: Globe },
  { path: '/customer/shop', label: 'فروشگاه', icon: Store },
  { path: '/customer/games', label: 'بازی‌ها', icon: Gamepad2 },
  { path: '/customer/transfer', label: 'ارسال پول', icon: Send },
  { path: '/customer/account', label: 'حساب من', icon: Landmark },
  { path: '/customer/orders', label: 'سفارش‌ها', icon: Package },
  { path: '/customer/messages', label: 'پیام‌ها', icon: MessageSquare },
  { path: '/customer/support', label: 'پشتیبانی', icon: LifeBuoy },
];

export default function CustomerLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);

  // Tab stack preservation — remembers last visited child path per bottom tab
  const [tabStack, setTabStack] = useState({});

  // Android hardware back button — closes drawer if open, else navigates back
  useHardwareBack(() => setMoreOpen(false), moreOpen);

  // Track current path for the active bottom tab
  useEffect(() => {
    const activeTab = NAV_ITEMS.find(b =>
      location.pathname === b.path || location.pathname.startsWith(b.path + '/')
    );
    if (activeTab) {
      setTabStack(prev => ({ ...prev, [activeTab.path]: location.pathname }));
    }
  }, [location.pathname]);

  const handleTabClick = (item) => {
    const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
    if (isActive && location.pathname === item.path) return; // already at root
    if (isActive) {
      navigate(item.path); // re-selecting active tab → reset to root
    } else {
      navigate(tabStack[item.path] || item.path); // switch tab → remembered path or root
    }
  };

  useEffect(() => {
    let mounted = true;
    loadNotifications(user?.id).then((list) => {
      if (mounted) setUnreadCount(list.filter((n) => !n.read).length);
    }).catch((err) => console.error('Failed to load notifications:', err.message));
    return () => { mounted = false; };
  }, [location.pathname]);

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname === item.path || location.pathname.startsWith(item.path + '/');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderNavButton = (item) => {
    const Icon = item.icon;
    const active = isActive(item);
    return (
      <button
      key={item.path}
      onClick={() => handleTabClick(item)}
      className={`flex flex-col items-center gap-1 px-2 pt-2 pb-1 rounded-lg transition-colors min-w-0 flex-1 min-h-[44px] ${
          active
            ? 'text-primary bg-primary/10'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        }`}
      >
        <Icon className="w-5 h-5 shrink-0" />
        <span className="text-xs font-medium truncate">{item.label}</span>
      </button>
    );
  };

  return (
    <TermsGate role="customer">
    <ForceUpdateGate>
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header
        className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border shadow-sm"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="shrink-0">
              <ExchangeMark size="sm" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm text-foreground truncate">{user?.full_name || 'پنل مشتری'}</p>
              <p className="text-xs text-muted-foreground truncate">حساب صراف</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 relative" onClick={() => navigate('/customer/notifications')}>
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[15px] h-[15px] px-1 rounded-full bg-destructive text-destructive-foreground text-xs font-bold">
                  {unreadCount}
                </span>
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Desktop Layout */}
      <div className="max-w-5xl mx-auto flex gap-4 px-4 py-4">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-44 shrink-0">
          <nav className="sticky top-20 space-y-1 bg-card border border-border rounded-xl p-2">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon className="w-4.5 h-4.5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 pb-36 md:pb-16">
          <PullToRefresh>
            <Outlet />
          </PullToRefresh>
        </main>
      </div>

      {/* Mobile Bottom Navigation — 4 items + More button */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur border-t border-border shadow-lg md:hidden">
        <div
          className="flex items-stretch justify-around px-1 py-1"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {NAV_ITEMS.slice(0, 4).map(renderNavButton)}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center gap-1 px-2 pt-2 pb-1 rounded-lg transition-colors min-w-0 flex-1 ${
              moreOpen
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <MoreHorizontal className="w-5 h-5 shrink-0" />
            <span className="text-xs font-medium truncate">بیشتر</span>
          </button>
        </div>
      </nav>

      {/* More Menu Drawer */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setMoreOpen(false)}>
          <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl shadow-xl p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm">بیشتر</h3>
              <Button size="sm" variant="ghost" onClick={() => setMoreOpen(false)} className="h-7 w-7 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {NAV_ITEMS.slice(4).map(item => {
                const Icon = item.icon;
                const active = isActive(item);
                return (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); setMoreOpen(false); }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-colors ${
                      active ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </button>
                );
              })}
              <button
                onClick={handleLogout}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/5 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-xs font-medium">خروج</span>
              </button>
            </div>
          </div>
        </div>
      )}
      <PwaInstallPrompt />
    </div>
    </ForceUpdateGate>
    </TermsGate>
  );
}