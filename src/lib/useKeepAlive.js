// useKeepAlive.js — Supabase KeepAlive hook (direct, no backend function)
//
// هر ۶ روز یک‌بار، هنگام باز شدن برنامه، یک درخواست سبک به Supabase ارسال می‌کند
// تا Supabase در پلن رایگان به دلیل بی‌فعالتی متوقف نشود.
// مستقیماً از طریق کلاینت Supabase انجام می‌شود (بدون Base44).

import { useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

const KEEPALIVE_INTERVAL_MS = 6 * 24 * 60 * 60 * 1000; // 6 days
const STORAGE_KEY = 'keepalive_last_run';

export function useKeepAlive() {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const checkAndPing = async () => {
      try {
        const lastRun = localStorage.getItem(STORAGE_KEY);
        const now = Date.now();

        if (lastRun) {
          const lastTime = parseInt(lastRun, 10);
          if (!isNaN(lastTime) && (now - lastTime) < KEEPALIVE_INTERVAL_MS) {
            return;
          }
        }

        // Direct Supabase ping — lightweight count query
        const { error } = await supabase
          .from('app_settings')
          .select('key', { count: 'exact', head: true });
        if (!error) {
          localStorage.setItem(STORAGE_KEY, String(now));
        }
      } catch {
        // Silently fail — keepalive is non-critical
      }
    };

    const t = setTimeout(checkAndPing, 5000);
    return () => clearTimeout(t);
  }, []);
}