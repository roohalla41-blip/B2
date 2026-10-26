// supabaseHealth.js — بررسی مستقیم اتصال Supabase (بدون توابع Base44)
//
// این ماژول فقط با کلاینت مستقیم Supabase کار می‌کند و به Integration credits
// یا توابع بک‌اند Base44 وابسته نیست.

import { supabase } from '@/lib/supabaseClient';

// پینگ سبک: اگر سرور Supabase هر پاسخ HTTP معتبری بدهد (حتی «دسترسی ممنوع» به‌خاطر RLS)،
// یعنی اتصال برقرار است. فقط خطای شبکه، کلید نامعتبر یا خطای ۵xx به‌معنی قطع‌بودن است.
export async function pingSupabase() {
  const started = Date.now();
  try {
    const res = await supabase.from('app_settings').select('*', { count: 'exact', head: true });
    const latency = Date.now() - started;
    const message = res.error?.message || '';
    const badKey = /invalid api key/i.test(message);
    const connected = res.status > 0 && res.status < 500 && !badKey;
    return {
      connected,
      status: res.status,
      latency,
      error: connected ? null : (badKey ? 'کلید Supabase نامعتبر است' : (message || 'خطای اتصال')),
    };
  } catch (e) {
    return { connected: false, status: 0, latency: Date.now() - started, error: e?.message || 'خطای شبکه' };
  }
}

// شمارش رکوردهای چند جدول به‌صورت مستقیم (فقط count، بدون دریافت رکورد)
export async function countTables(entities) {
  const results = await Promise.allSettled(
    entities.map(async (e) => {
      const { count, error } = await supabase.from(e.table).select('*', { count: 'exact', head: true });
      return [e.name, error ? 0 : (count || 0)];
    })
  );
  const counts = {};
  results.forEach((r, i) => {
    counts[entities[i].name] = r.status === 'fulfilled' ? r.value[1] : 0;
  });
  return counts;
}

// آیا نشست Supabase Auth فعال است؟
export async function hasSupabaseSession() {
  try {
    const { data } = await supabase.auth.getSession();
    return !!data?.session;
  } catch {
    return false;
  }
}