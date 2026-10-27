// useCustomer.js — React Query hooks for the customer panel
// Reads wallets/orders/transfers from the server via callSupabase (SQL Views).
// No offlineDB / localStorage for customer data — server is the source of truth.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createSupabaseEntity } from './supabaseApi';
import { trackOp, finishOp } from './syncStatus';
import { useAuth } from '@/lib/AuthContext';

// Direct Supabase entity instances (server reads only)
const sbWallets = createSupabaseEntity('Wallet');
const sbWalletTx = createSupabaseEntity('WalletTransaction');
const sbOrders = createSupabaseEntity('OnlineOrder');
const sbTransfers = createSupabaseEntity('CustomerTransferRequest');
const sbNotifications = createSupabaseEntity('CustomerNotification');
const sbProducts = createSupabaseEntity('OnlineProduct');
const sbAnnouncements = createSupabaseEntity('Announcement');

// ── Wallet ──
export function useWallets() {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: ['wallets', userId],
    queryFn: async () => {
      if (!userId) return [];
      const list = await sbWallets.filter({ user_id: userId });
      return list || [];
    },
    enabled: !!userId,
  });
}

export function useWalletTransactions() {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: ['walletTransactions', userId],
    queryFn: async () => {
      if (!userId) return [];
      const list = await sbWalletTx.filter({ user_id: userId });
      return (list || []).sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''));
    },
    enabled: !!userId,
  });
}

export function useTopupWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ walletId, userId, amount, currency, reason, actorName }) => {
      trackOp();
      try {
        return await sbWalletTx.create({
          wallet_id: walletId,
          user_id: userId,
          type: 'credit',
          amount,
          currency,
          reason: reason || 'manual_topup',
          actor_name: actorName || 'مشتری',
        });
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['walletTransactions'] });
        qc.invalidateQueries({ queryKey: ['wallets'] });
      }
    },
  });
}

// ── Online Orders (recharge, games, transfers) ──
export function useCustomerOrders() {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: ['customerOrders', userId],
    queryFn: async () => {
      if (!userId) return [];
      const list = await sbOrders.filter({ created_by_id: userId });
      return (list || []).sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''));
    },
    enabled: !!userId,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      trackOp();
      try {
        return await sbOrders.create(data);
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['customerOrders'] });
      }
    },
  });
}

// ── Customer Transfer Requests ──
export function useCustomerTransfers() {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: ['customerTransfers', userId],
    queryFn: async () => {
      if (!userId) return [];
      const list = await sbTransfers.filter({ user_id: String(userId) });
      return (list || []).sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''));
    },
    enabled: !!userId,
  });
}

export function useCreateCustomerTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      trackOp();
      try {
        return await sbTransfers.create(data);
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['customerTransfers'] });
      }
    },
  });
}

// ── Customer Notifications ──
export function useCustomerNotifications() {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: ['customerNotifications', userId],
    queryFn: async () => {
      if (!userId) return [];
      const list = await sbNotifications.filter({ customer_user_id: String(userId) });
      return (list || []).sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''));
    },
    enabled: !!userId,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => {
      trackOp();
      try {
        return await sbNotifications.update(id, { read: true });
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['customerNotifications'] });
      }
    },
  });
}

// ── Announcements (public) ──
export function useAnnouncements() {
  return useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const list = await sbAnnouncements.list('-created_date', 20);
      return (list || []).filter(a => a.status === 'active');
    },
  });
}

// ── Products (recharge packages, game cards) ──
export function useOnlineProducts(type) {
  return useQuery({
    queryKey: ['onlineProducts', type],
    queryFn: async () => {
      const list = await sbProducts.list('display_order', 200);
      if (type) return (list || []).filter(p => p.level === type && p.enabled !== false);
      return (list || []).filter(p => p.enabled !== false);
    },
  });
}

// ── Sync ──
export function useSyncNow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      qc.invalidateQueries();
    },
  });
}