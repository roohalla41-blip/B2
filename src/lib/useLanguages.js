// useLanguages.js — Load languages directly from Supabase (no Base44)
//
// مستقیماً از جدول languages در Supabase خوانده می‌شود.
// در صورت خطا، از لیست زبان‌های پیش‌فرض استفاده می‌شود.

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { LANGUAGES } from '@/lib/i18n';

const CODE_TO_LANG_KEY = {
  fa: 'farsi',
  ps: 'pashto',
  uz: 'uzbek',
  en: 'english',
  ar: 'arabic',
  tr: 'turkish',
  dari: 'dari',
};

export function useLanguages() {
  const [languages, setLanguages] = useState(LANGUAGES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('languages')
          .select('code, name, native_name, direction, sort_order, is_active, flag_emoji')
          .eq('is_active', true)
          .order('sort_order')
          .limit(50);
        if (cancelled || error || !data || data.length === 0) return;
        const mapped = data.map((r) => ({
          code: CODE_TO_LANG_KEY[r.code] || r.code,
          name: r.native_name || r.name,
          flag: r.flag_emoji || '🌐',
          direction: r.direction || 'rtl',
        }));
        if (!cancelled && mapped.length > 0) {
          setLanguages(mapped);
        }
      } catch {
        // fallback to hardcoded LANGUAGES
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { languages, loading };
}