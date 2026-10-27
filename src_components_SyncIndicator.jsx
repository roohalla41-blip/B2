import React, { useState, useEffect } from 'react';
import { subscribe, getState } from '@/lib/syncStatus';
import { syncPendingWrites } from '@/lib/offlineQueue';
import { CloudOff, Cloud, Loader2, RefreshCw } from 'lucide-react';

export default function SyncIndicator({ compact = false }) {
  const [state, setState] = useState(getState());

  useEffect(() => {
    return subscribe(setState);
  }, []);

  const iconClass = "w-3.5 h-3.5";
  const wrapClass = "flex items-center gap-1.5 text-xs";

  if (state.syncing) {
    return (
      <div className={compact ? "w-7 h-7 rounded-lg bg-sky-500/90 flex items-center justify-center text-white" : wrapClass + " text-warning"}>
        <Loader2 className={iconClass + " animate-spin"} />
        {!compact && <span>در حال همگام‌سازی...</span>}
      </div>
    );
  }

  if (state.pendingCount > 0) {
    return (
      <button
        onClick={() => syncPendingWrites()}
        className={compact ? "w-7 h-7 rounded-lg bg-amber-500/90 hover:bg-amber-500 flex items-center justify-center text-white transition-colors" : wrapClass + " text-warning hover:text-warning/80"}
      >
        <RefreshCw className={iconClass} />
        {!compact && <span>{state.pendingCount} در انتظار همگام‌سازی</span>}
      </button>
    );
  }

  if (!state.isOnline) {
    return (
      <div className={compact ? "w-7 h-7 rounded-lg bg-rose-500/90 flex items-center justify-center text-white" : wrapClass + " text-destructive"}>
        <CloudOff className={iconClass} />
        {!compact && <span>آفلاین</span>}
      </div>
    );
  }

  return (
    <div className={compact ? "w-7 h-7 rounded-lg bg-emerald-500/90 flex items-center justify-center text-white" : wrapClass + " text-success"}>
      <Cloud className={iconClass} />
      {!compact && <span>آنلاین</span>}
    </div>
  );
}