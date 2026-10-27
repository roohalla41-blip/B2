import React, { useState, useEffect } from 'react';
import { getPendingCount, onSyncStatusChange, isSyncing } from '@/lib/offlineQueue';
import { Wifi, WifiOff, Cloud, CloudOff, Loader2, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

export default function ConnectionStatus({ compact }) {
  const { lang } = useLanguage();
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [serverConnected, setServerConnected] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingSync, setPendingSync] = useState(0);
  const [syncing, setSyncing] = useState(isSyncing());
  const [justSynced, setJustSynced] = useState(false);

  const checkServer = async () => {
    setServerConnected(typeof navigator !== 'undefined' ? navigator.onLine : true);
  };

  useEffect(() => {
    const handleOnline = () => { setOnline(true); checkServer(); };
    const handleOffline = () => { setOnline(false); setServerConnected(false); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    checkServer();
    const interval = setInterval(checkServer, 30000);
    setPendingSync(getPendingCount());

    // Subscribe to sync status changes
    const unsub = onSyncStatusChange(({ syncing: s, pending }) => {
      setSyncing(s);
      setPendingSync(pending);
      if (!s && pending === 0 && justSynced === false) {
        setJustSynced(true);
        setTimeout(() => setJustSynced(false), 3000);
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
      unsub();
    };
  }, []);

  const isFullyOnline = online && serverConnected === true;
  const isChecking = serverConnected === null;

  const label = syncing
    ? (lang === 'english' ? 'Syncing...' : 'در حال همگام‌سازی...')
    : justSynced
    ? (lang === 'english' ? 'Synced' : 'همگام‌سازی کامل')
    : isChecking
    ? (lang === 'english' ? 'Checking...' : 'در حال بررسی...')
    : isFullyOnline
    ? (lang === 'english' ? 'Online' : 'آنلاین')
    : (lang === 'english' ? 'Offline' : 'آفلاین');

  const icon = syncing
    ? <RefreshCw className={`${compact ? "w-3.5 h-3.5" : "w-4 h-4"} animate-spin`} />
    : justSynced
    ? <CheckCircle2 className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
    : isChecking
    ? <Loader2 className={`${compact ? "w-3.5 h-3.5" : "w-4 h-4"} animate-spin`} />
    : isFullyOnline
    ? (compact ? <Wifi className="w-3.5 h-3.5" /> : <Cloud className="w-4 h-4" />)
    : (compact ? <WifiOff className="w-3.5 h-3.5" /> : <CloudOff className="w-4 h-4" />);

  const colorClass = syncing
    ? 'bg-primary/10 text-primary'
    : justSynced
    ? 'bg-success/10 text-success'
    : isFullyOnline
    ? 'bg-success/10 text-success'
    : 'bg-destructive/10 text-destructive';

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${colorClass}`}>
        {icon}
        <span>{label}</span>
        {!isFullyOnline && !syncing && pendingSync > 0 && (
          <span className="bg-warning/20 text-warning px-1.5 rounded-full text-[10px]">{pendingSync}</span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border ${colorClass} ${
      syncing ? 'border-primary/20' : justSynced ? 'border-success/20' : isFullyOnline ? 'border-success/20' : 'border-destructive/20'
    }`}>
      {icon}
      <span>{label}</span>
      {!isFullyOnline && !syncing && pendingSync > 0 && (
        <span className="bg-warning/20 text-warning px-1.5 rounded-full text-[10px]">
          {pendingSync} {lang === 'english' ? 'pending' : 'در انتظار'}
        </span>
      )}
    </div>
  );
}