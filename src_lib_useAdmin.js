// useAdmin.js — React Query hooks for admin/builder panel operations
// All operations go directly to Supabase via createSupabaseEntity (no IndexedDB).
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createSupabaseEntity, listAllExchanges, extendTrial, bulkExtendTrial } from './supabaseApi';
import { supabase } from './supabaseClient';
import { trackOp, finishOp } from './syncStatus';

// Direct Supabase entity instances
const sbSarraafProfile = createSupabaseEntity('SarraafProfile');
const sbCustomer = createSupabaseEntity('Customer');
const sbTransaction = createSupabaseEntity('Transaction');
const sbGroupMessage = createSupabaseEntity('GroupMessage');
const sbCustomerNotification = createSupabaseEntity('CustomerNotification');
const sbUserNotification = createSupabaseEntity('UserNotification');
const sbUserPermission = createSupabaseEntity('UserPermission');
const sbPlanQuota = createSupabaseEntity('PlanQuota');
const sbPaymentRecord = createSupabaseEntity('PaymentRecord');
const sbFeatureSetting = createSupabaseEntity('FeatureSetting');
const sbAppSetting = createSupabaseEntity('AppSetting');

// ── Queries ──
export function useAllSarraafProfiles() {
  return useQuery({
    queryKey: ['allSarraafProfiles'],
    queryFn: () => sbSarraafProfile.list('-created_date', 500),
  });
}

export function useAllCustomers() {
  return useQuery({
    queryKey: ['allCustomersAdmin'],
    queryFn: async () => {
      const all = [];
      let offset = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .order('created_at', { ascending: false })
          .range(offset, offset + pageSize - 1);
        if (error) throw new Error(error.message || 'خطا در خواندن مشتریان');
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < pageSize) break;
        offset += pageSize;
      }
      return all.map(r => {
        const m = { ...r };
        if (m.id !== undefined && m.id !== null) m.id = String(m.id);
        if (m.created_at) m.created_date = m.created_at;
        if (m.updated_at) m.updated_date = m.updated_at;
        return m;
      });
    },
  });
}

// ─ـ فهرست مشتریان از جدول users (نقش customer) ──
// مستقیماً از جدول users با فیلتر role='customer' خوانده می‌شود
// تا حتی قبل از همگام‌سازی با جدول customers، مشتریان نمایش داده شوند.
export function useAllCustomerUsers() {
  return useQuery({
    queryKey: ['allCustomerUsersAdmin'],
    queryFn: async () => {
      const all = [];
      let offset = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, username, mobile, email, role, status, created_at, last_login, exchange_code, created_by_id')
          .eq('role', 'customer')
          .order('created_at', { ascending: false })
          .range(offset, offset + pageSize - 1);
        if (error) throw new Error(error.message || 'خطا در خواندن مشتریان');
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < pageSize) break;
        offset += pageSize;
      }
      return all.map(u => ({
        id: String(u.id),
        name: u.full_name || u.username || 'مشتری',
        phone: u.mobile || '',
        email: u.email || '',
        username: u.username || '',
        code: `CUS-${String(u.id).slice(-6)}`,
        exchange_code: u.exchange_code || '',
        created_by_id: u.created_by_id ? String(u.created_by_id) : '',
        status: u.status === 'active' ? 'active' : 'inactive',
        created_date: u.created_at,
        last_login: u.last_login || '',
      }));
    },
  });
}

export function useAllTransactions() {
  return useQuery({
    queryKey: ['allTransactionsAdmin'],
    queryFn: () => sbTransaction.list('-created_date', 1000),
  });
}

export function useAllMessages() {
  return useQuery({
    queryKey: ['allMessagesAdmin'],
    queryFn: () => sbGroupMessage.list('-created_date', 1000),
  });
}

export function useAllCustomerNotifications() {
  return useQuery({
    queryKey: ['allCustomerNotificationsAdmin'],
    queryFn: () => sbCustomerNotification.list('-created_date', 1000),
  });
}

export function useUserNotifications(targetUserId) {
  return useQuery({
    queryKey: ['userNotifications', targetUserId],
    queryFn: async () => {
      const list = await sbUserNotification.list('-created_date', 200);
      if (!targetUserId) return list;
      return list.filter(n => n.target_user_id === targetUserId || n.target_role === 'all');
    },
  });
}

export function useAllNotifications() {
  return useQuery({
    queryKey: ['allNotifications'],
    queryFn: () => sbUserNotification.list('-created_date', 200),
  });
}

export function useUserPermissions(userId) {
  return useQuery({
    queryKey: ['userPermissions', userId],
    queryFn: async () => {
      if (!userId) return [];
      return await sbUserPermission.filter({ user_id: userId });
    },
    enabled: !!userId,
  });
}

export function useAllPermissions() {
  return useQuery({
    queryKey: ['allPermissions'],
    queryFn: () => sbUserPermission.list('-created_date', 500),
  });
}

export function usePlanQuotas() {
  return useQuery({
    queryKey: ['planQuotas'],
    queryFn: () => sbPlanQuota.list('-created_date', 200),
  });
}

export function usePaymentRecords() {
  return useQuery({
    queryKey: ['paymentRecords'],
    queryFn: () => sbPaymentRecord.list('-created_date', 200),
  });
}

// ── Queries: Exchange Trial Management ──
export function useListExchanges() {
  return useQuery({
    queryKey: ['allExchanges'],
    queryFn: () => listAllExchanges(),
  });
}

// ── Mutations: Plan Management ──
export function useUpdateSarraafProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      trackOp();
      try {
        return await sbSarraafProfile.update(id, data);
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['allSarraafProfiles'] });
        qc.invalidateQueries({ queryKey: ['sarraafProfile'] });
      }
    },
  });
}

export function useActivatePaidPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ profile, plan, startDate, endDate, confirmedByName }) => {
      trackOp();
      try {
        const updates = {
          plan,
          payment_status: 'paid',
          paid_start_date: startDate,
          paid_end_date: endDate,
          quota_start_date: startDate,
          quota_end_date: endDate,
          status: 'active',
        };
        const result = await sbSarraafProfile.update(profile.id, updates);
        await sbPaymentRecord.create({
          user_id: profile.user_id,
          user_name: profile.name,
          sarraaf_profile_id: profile.id,
          plan,
          payment_status: 'confirmed',
          purchase_date: new Date().toISOString(),
          start_date: startDate,
          end_date: endDate,
          is_active: true,
          confirmed_by_name: confirmedByName,
        });
        await sbUserNotification.create({
          target_user_id: profile.user_id,
          target_user_name: profile.name,
          target_role: 'sarraaf',
          title: 'فعال‌سازی نسخه پولی',
          message: `حساب شما به نسخه پولی (پلن ${plan}) ارتقا یافت. اعتبار از ${startDate} تا ${endDate} معتبر است.`,
          kind: 'paid_activated',
          read: false,
          sent_by_name: confirmedByName,
        });
        return result;
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['allSarraafProfiles'] });
        qc.invalidateQueries({ queryKey: ['paymentRecords'] });
        qc.invalidateQueries({ queryKey: ['userNotifications'] });
      }
    },
  });
}

export function useExpirePaidPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ profile, reason, sentByName }) => {
      trackOp();
      try {
        const updates = {
          plan: 'free',
          payment_status: 'expired',
        };
        const result = await sbSarraafProfile.update(profile.id, updates);
        await sbUserNotification.create({
          target_user_id: profile.user_id,
          target_user_name: profile.name,
          target_role: 'sarraaf',
          title: 'پایان اعتبار نسخه پولی',
          message: reason || 'اعتبار نسخه پولی شما به پایان رسید. حساب شما به نسخه رایگان بازگشت. برای تمدید با پشتیبانی تماس بگیرید.',
          kind: 'paid_expired',
          read: false,
          sent_by_name: sentByName,
        });
        return result;
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['allSarraafProfiles'] });
        qc.invalidateQueries({ queryKey: ['userNotifications'] });
      }
    },
  });
}

// ── Mutations: Extend Trial ──
export function useExtendTrial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (exchangeId) => {
      trackOp();
      try {
        return await extendTrial(exchangeId);
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['allExchanges'] });
        qc.invalidateQueries({ queryKey: ['sarraafProfile'] });
        qc.invalidateQueries({ queryKey: ['userNotifications'] });
      }
    },
  });
}

// ── Mutations: Bulk Extend Trial (reset ALL exchanges) ──
export function useBulkExtendTrial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      trackOp();
      try {
        return await bulkExtendTrial();
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['allExchanges'] });
        qc.invalidateQueries({ queryKey: ['sarraafProfile'] });
        qc.invalidateQueries({ queryKey: ['userNotifications'] });
      }
    },
  });
}

// ── Mutations: Feature Management ──
export function useUpdateFeaturePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, free_enabled, paid_enabled }) => {
      trackOp();
      try {
        return await sbFeatureSetting.update(id, { free_enabled, paid_enabled });
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['features'] });
      }
    },
  });
}

export function useCreateFeature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      trackOp();
      try {
        return await sbFeatureSetting.create(data);
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['features'] });
      }
    },
  });
}

// ── Mutations: Notifications ──
export function useSendNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ targetUserId, targetUserName, targetRole, title, message, kind, sentByName, actionUrl, actionLabel }) => {
      trackOp();
      try {
        return await sbUserNotification.create({
          target_user_id: targetUserId || '',
          target_user_name: targetUserName || '',
          target_role: targetRole || 'all',
          title,
          message,
          kind: kind || 'custom',
          action_url: actionUrl || '',
          action_label: actionLabel || '',
          read: false,
          sent_by_name: sentByName,
        });
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['allNotifications'] });
        qc.invalidateQueries({ queryKey: ['userNotifications'] });
      }
    },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      trackOp();
      try {
        return await sbUserNotification.delete(id);
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['allNotifications'] });
        qc.invalidateQueries({ queryKey: ['userNotifications'] });
      }
    },
  });
}

// ── Mutations: Permissions ──
export function useUpdatePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      trackOp();
      try {
        return await sbUserPermission.update(id, data);
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['userPermissions'] });
        qc.invalidateQueries({ queryKey: ['allPermissions'] });
      }
    },
  });
}

export function useCreatePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      trackOp();
      try {
        return await sbUserPermission.create(data);
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['userPermissions'] });
        qc.invalidateQueries({ queryKey: ['allPermissions'] });
      }
    },
  });
}

// ── Mutations: Plan Quotas ──
export function useUpdatePlanQuota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      trackOp();
      try {
        return await sbPlanQuota.update(id, data);
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['planQuotas'] });
      }
    },
  });
}

export function useCreatePlanQuota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      trackOp();
      try {
        return await sbPlanQuota.create(data);
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['planQuotas'] });
      }
    },
  });
}

// ── Mutations: Payment Records ──
export function useUpdatePaymentRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      trackOp();
      try {
        return await sbPaymentRecord.update(id, data);
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['paymentRecords'] });
      }
    },
  });
}