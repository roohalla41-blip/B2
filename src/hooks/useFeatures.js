import { useState, useEffect, useCallback } from 'react';
import { offlineDB as db } from '@/lib/offlineQueue';

// تعریف قابلیت‌ها — ۱۲ آیکون اصلی پنل صراف + پنل مشتری
export const FEATURE_DEFINITIONS = [
  { feature_key: 'dashboard', feature_name: 'داشبورد', icon_name: 'LayoutDashboard', sort_order: 0, is_primary: true, status: 'active' },
  { feature_key: 'customers', feature_name: 'مشتریان', icon_name: 'Users', sort_order: 1, is_primary: true, status: 'active' },
  { feature_key: 'transfers', feature_name: 'حواله', icon_name: 'Send', sort_order: 2, is_primary: true, status: 'active' },
  { feature_key: 'convert', feature_name: 'تبدیل ارز', icon_name: 'ArrowRightLeft', sort_order: 3, is_primary: true, status: 'active' },
  { feature_key: 'reports', feature_name: 'گزارش‌ها', icon_name: 'FileText', sort_order: 4, is_primary: true, status: 'active' },
  { feature_key: 'cash', feature_name: 'صندوق', icon_name: 'Banknote', sort_order: 5, is_primary: true, status: 'active' },
  { feature_key: 'sarraaf_market', feature_name: 'بازار نرخ صراف‌ها', icon_name: 'Store', sort_order: 6, is_primary: true, status: 'active' },
  { feature_key: 'sarraaf_chat', feature_name: 'چت صراف‌ها', icon_name: 'MessageSquareMore', sort_order: 7, is_primary: true, status: 'active' },
  { feature_key: 'dadogereft', feature_name: 'داد و گرفت', icon_name: 'ArrowLeftRight', sort_order: 8, status: 'active' },
  { feature_key: 'trade', feature_name: 'خرید / فروش', icon_name: 'Repeat', sort_order: 9, status: 'active' },
  { feature_key: 'bank', feature_name: 'بانک', icon_name: 'Landmark', sort_order: 10, status: 'active' },
  { feature_key: 'currencies', feature_name: 'ارز و نرخ', icon_name: 'Coins', sort_order: 11, status: 'active' },
  { feature_key: 'profit_loss', feature_name: 'سود و زیان', icon_name: 'TrendingUp', sort_order: 12, status: 'active' },
  { feature_key: 'debtors', feature_name: 'بدهکاران', icon_name: 'Wallet', sort_order: 13, status: 'active' },
  { feature_key: 'agents', feature_name: 'نمایندگی‌ها', icon_name: 'Network', sort_order: 14, status: 'active' },
  { feature_key: 'agency_network', feature_name: 'شبکه نمایندگی', icon_name: 'Share2', sort_order: 15, status: 'active' },
  { feature_key: 'transfer_book', feature_name: 'دفتر حواله', icon_name: 'BookOpen', sort_order: 16, status: 'active' },
  { feature_key: 'journal', feature_name: 'دفتر روزنامه', icon_name: 'BookCopy', sort_order: 17, status: 'active' },
  { feature_key: 'general_ledger', feature_name: 'دفتر کل', icon_name: 'ScrollText', sort_order: 18, status: 'active' },
  { feature_key: 'balance_sheet', feature_name: 'ترازنامه', icon_name: 'Scale', sort_order: 19, status: 'updating', message: 'بخش بدهی و سرمایه ترازنامه در حال تکمیل است.' },
  { feature_key: 'reconciliation', feature_name: 'مغایرت‌گیری', icon_name: 'FileSearch', sort_order: 20, status: 'active' },
  { feature_key: 'online_products', feature_name: 'محصولات آنلاین', icon_name: 'ShoppingBag', sort_order: 21, status: 'active' },
  { feature_key: 'payment_gateway', feature_name: 'درگاه پرداخت', icon_name: 'CreditCard', sort_order: 22, status: 'updating', message: 'درگاه بانکی در حال راه‌اندازی است.' },
  { feature_key: 'chat_groups', feature_name: 'چت و گروه‌ها', icon_name: 'MessageSquare', sort_order: 23, status: 'active' },
  { feature_key: 'settings', feature_name: 'تنظیمات', icon_name: 'Settings', sort_order: 24, status: 'active' },
  { feature_key: 'main_settings', feature_name: 'تنظیمات اصلی', icon_name: 'Shield', sort_order: 25, status: 'active' },
];

export function useFeatures() {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFeatures = useCallback(async () => {
    try {
      const data = await db.FeatureSetting.list('sort_order', 50);
      if (!data || data.length === 0) {
        await db.FeatureSetting.bulkCreate(
          FEATURE_DEFINITIONS.map((f) => ({
            ...f,
            status: f.status || 'active',
            message: f.message || '',
            is_primary: f.is_primary || false,
          }))
        );
        const seeded = await db.FeatureSetting.list('sort_order', 50);
        setFeatures(seeded || []);
      } else {
        setFeatures(data);
      }
    } catch {
      setFeatures([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFeatures();
  }, [loadFeatures]);

  const getFeature = useCallback(
    (key) => features.find((f) => f.feature_key === key),
    [features]
  );

  const isFeatureActive = useCallback(
    (key) => {
      const f = features.find((x) => x.feature_key === key);
      return f ? f.status === 'active' : true;
    },
    [features]
  );

  const toggleFeature = useCallback(
    async (key, newStatus) => {
      const f = features.find((x) => x.feature_key === key);
      if (!f) return;
      try {
        await db.FeatureSetting.update(f.id, { status: newStatus });
        setFeatures((prev) =>
          prev.map((x) => (x.feature_key === key ? { ...x, status: newStatus } : x))
        );
      } catch {
        // ignore
      }
    },
    [features]
  );

  const renameFeature = useCallback(
    async (key, newName) => {
      const f = features.find((x) => x.feature_key === key);
      if (!f) return;
      try {
        await db.FeatureSetting.update(f.id, { feature_name: newName });
        setFeatures((prev) =>
          prev.map((x) => (x.feature_key === key ? { ...x, feature_name: newName } : x))
        );
      } catch {
        // ignore
      }
    },
    [features]
  );

  const reorderFeature = useCallback(
    async (key, newOrder) => {
      const f = features.find((x) => x.feature_key === key);
      if (!f) return;
      try {
        await db.FeatureSetting.update(f.id, { sort_order: newOrder });
        setFeatures((prev) =>
          prev.map((x) => (x.feature_key === key ? { ...x, sort_order: newOrder } : x))
        );
      } catch {
        // ignore
      }
    },
    [features]
  );

  return { features, loading, getFeature, isFeatureActive, toggleFeature, renameFeature, reorderFeature, reload: loadFeatures };
}