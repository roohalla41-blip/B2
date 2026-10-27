// useSarraaf.js — React Query hooks and mutations
// Financial operations go directly to Supabase via ledgerApi (no localStorage).
// Non-financial data (customers, agents, currencies) still uses offlineDB.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { syncPendingWrites, getPendingCount } from './offlineQueue';
import { createSupabaseEntity } from './supabaseApi';
import { generateUniqueInviteCode } from './referralSystem';
import { trackOp, finishOp } from './syncStatus';
import { postDocument, postTransfer, reverseDocument, editDocument, getBalances, listDocuments } from './ledgerApi';
import { getMyExchange, listTransactions } from './supabaseApi';

// Direct Supabase entity instances (no localStorage cache — always reads from server)
const sbTransfers = createSupabaseEntity('Transfer');
const sbCustomers = createSupabaseEntity('Customer');
const sbAgents = createSupabaseEntity('Agent');
const sbCurrencies = createSupabaseEntity('Currency');
const sbBankAccounts = createSupabaseEntity('BankAccount');
const sbSafes = createSupabaseEntity('Safe');
const sbRateSettings = createSupabaseEntity('RateSetting');
const sbFeatures = createSupabaseEntity('FeatureSetting');
const sbSarraafProfile = createSupabaseEntity('SarraafProfile');

// ── Queries ──
export function useTransactions(filters = {}) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      const list = await listTransactions({}, '-id', 500);
      let filtered = list;
      if (filters.customer_id) filtered = filtered.filter(t => String(t.customer_id) === String(filters.customer_id));
      if (filters.currency) filtered = filtered.filter(t => t.currency === filters.currency);
      if (filters.type) filtered = filtered.filter(t => t.type === filters.type);
      if (filters.from) filtered = filtered.filter(t => (t.date || t.created_date || '') >= filters.from);
      if (filters.to) filtered = filtered.filter(t => (t.date || t.created_date || '') <= filters.to);
      return filtered;
    },
  });
}

export function useTransfers(filters = {}) {
  return useQuery({
    queryKey: ['transfers', filters],
    queryFn: async () => {
      const list = await sbTransfers.list('-created_date', 500);
      let filtered = list;
      if (filters.direction) filtered = filtered.filter(t => t.direction === filters.direction);
      if (filters.status) filtered = filtered.filter(t => t.status === filters.status);
      return filtered;
    },
  });
}

export function useCustomers(search = '') {
  return useQuery({
    queryKey: ['customers', search],
    queryFn: async () => {
      const list = await sbCustomers.list('-created_date', 500);
      if (!search) return list;
      const s = search.toLowerCase();
      return list.filter(c =>
        (c.name || '').toLowerCase().includes(s) ||
        (c.phone || '').includes(s) ||
        (c.code || '').toLowerCase().includes(s)
      );
    },
  });
}

export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: () => sbAgents.list('-created_date', 500),
  });
}

export function useCurrencies() {
  return useQuery({
    queryKey: ['currencies'],
    queryFn: () => sbCurrencies.list('sort_order', 50),
  });
}

export function useBankAccounts() {
  return useQuery({
    queryKey: ['bankAccounts'],
    queryFn: () => sbBankAccounts.list('display_order', 50),
  });
}

export function useSafes() {
  return useQuery({
    queryKey: ['safes'],
    queryFn: () => sbSafes.list('display_order', 50),
  });
}

export function useCreateSafe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      trackOp();
      try {
        return await sbSafes.create(data);
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['safes'] });
      }
    },
  });
}

export function useUpdateSafe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      trackOp();
      try {
        return await sbSafes.update(id, data);
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['safes'] });
      }
    },
  });
}

export function useRateSettings() {
  return useQuery({
    queryKey: ['rateSettings'],
    queryFn: async () => {
      const list = await sbRateSettings.list('-created_date', 50);
      const obj = {};
      for (const r of list) obj[r.key] = r.value;
      return obj;
    },
  });
}

export function useFeatures() {
  return useQuery({
    queryKey: ['features'],
    queryFn: () => sbFeatures.list('display_order', 50),
  });
}

export function useSarraafProfile(userId) {
  return useQuery({
    queryKey: ['sarraafProfile', userId],
    queryFn: async () => {
      if (!userId) return null;
      return await getMyExchange();
    },
    enabled: !!userId,
  });
}

// ── Financial Mutations (direct to Supabase via ledgerApi) ──

export function usePostDocument() {
  const qc = useQueryClient();
  return useMutation({
    onMutate: async (params) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await qc.cancelQueries({ queryKey: ['transactions'] });

      // Snapshot all transaction queries for rollback
      const queryCache = qc.getQueryCache();
      const txQueries = queryCache.findAll({ queryKey: ['transactions'] });
      const snapshots = txQueries.map(q => ({
        queryKey: q.queryKey,
        data: q.state.data,
      }));

      // Build the optimistic transaction from params
      const optimisticTx = {
        id: `temp-${Date.now()}`,
        type: params.doc_type,
        currency: params.currency,
        amount: params.amount,
        fee: params.fee || 0,
        related_type: params.related_type || null,
        related_id: params.related_id || null,
        related_name: params.related_name || '',
        description: params.description || '',
        date: new Date().toISOString().split('T')[0],
        created_date: new Date().toISOString(),
        sync_status: 'pending',
      };

      // Optimistically prepend the transaction to every transactions query
      txQueries.forEach(q => {
        qc.setQueryData(q.queryKey, (old) => {
          if (!old) return [optimisticTx];
          return [optimisticTx, ...old];
        });
      });

      return { snapshots };
    },
    onError: (_err, _params, context) => {
      // Roll back all transaction queries to their snapshots on error
      if (context?.snapshots) {
        for (const snap of context.snapshots) {
          qc.setQueryData(snap.queryKey, snap.data);
        }
      }
    },
    onSettled: () => {
      finishOp();
      // Always refetch after error or success to ensure server truth
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['documents'] });
      qc.invalidateQueries({ queryKey: ['balances'] });
    },
    mutationFn: async (params) => {
      trackOp();
      const result = await postDocument(params);
      return result;
    },
  });
}

export function useCreateTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params) => {
      trackOp();
      try {
        const result = await postTransfer(params);
        qc.invalidateQueries({ queryKey: ['transfers'] });
        qc.invalidateQueries({ queryKey: ['transactions'] });
        qc.invalidateQueries({ queryKey: ['balances'] });
        return result;
      } finally {
        finishOp();
      }
    },
  });
}

export function useExecuteTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ transfer, payCurrency, payAmount, payCounter }) => {
      if (transfer.status === 'paid' || transfer.status === 'cancelled') {
        throw new Error('این حواله قبلاً اجرا شده است');
      }
      trackOp();
      try {
        // Update transfer status via direct CRUD
        await sbTransfers.update(transfer.id, {
          status: 'paid',
          executed_date: new Date().toISOString(),
          paid_amount: payAmount,
          paid_currency: payCurrency,
          pay_counter: payCounter,
        });
        qc.invalidateQueries({ queryKey: ['transfers'] });
        qc.invalidateQueries({ queryKey: ['transactions'] });
        qc.invalidateQueries({ queryKey: ['balances'] });
      } finally {
        finishOp();
      }
    },
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      trackOp();
      try {
        return await sbCustomers.create(data);
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['customers'] });
      }
    },
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      trackOp();
      try {
        return await sbCustomers.update(id, data);
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['customers'] });
      }
    },
  });
}

export function useCreateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      trackOp();
      try {
        return await sbAgents.create(data);
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['agents'] });
      }
    },
  });
}

export function useUpdateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      trackOp();
      try {
        return await sbAgents.update(id, data);
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['agents'] });
      }
    },
  });
}

export function useCreateCurrency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      trackOp();
      try {
        return await sbCurrencies.create(data);
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['currencies'] });
      }
    },
  });
}

export function useUpdateCurrency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      trackOp();
      try {
        return await sbCurrencies.update(id, data);
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['currencies'] });
      }
    },
  });
}

export function useCreateBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      trackOp();
      try {
        return await sbBankAccounts.create(data);
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['bankAccounts'] });
      }
    },
  });
}

export function useCreateRateSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value, updated_by_name }) => {
      trackOp();
      try {
        const list = await sbRateSettings.filter({ key });
        if (list?.length > 0) {
          return await sbRateSettings.update(list[0].id, {
            value: String(value),
            updated_at: new Date().toISOString(),
            updated_by_name,
          });
        }
        return await sbRateSettings.create({
          key,
          value: String(value),
          updated_at: new Date().toISOString(),
          updated_by_name,
        });
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['rateSettings'] });
      }
    },
  });
}

export function useToggleFeature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, enabled }) => {
      trackOp();
      try {
        return await sbFeatures.update(id, { enabled });
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['features'] });
      }
    },
  });
}

export function useSoftDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note, userName }) => {
      trackOp();
      try {
        const result = await reverseDocument(id, note || 'حذف توسط ' + (userName || ''));
        qc.invalidateQueries({ queryKey: ['transactions'] });
        qc.invalidateQueries({ queryKey: ['documents'] });
        qc.invalidateQueries({ queryKey: ['balances'] });
        return result;
      } finally {
        finishOp();
      }
    },
  });
}

export function useRestoreTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => {
      trackOp();
      try {
        // Reverse the reversal by calling reverseDocument again
        const result = await reverseDocument(id, 'بازیابی');
        qc.invalidateQueries({ queryKey: ['transactions'] });
        qc.invalidateQueries({ queryKey: ['documents'] });
        qc.invalidateQueries({ queryKey: ['balances'] });
        return result;
      } finally {
        finishOp();
      }
    },
  });
}

export function useEditTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data, new_lines }) => {
      trackOp();
      try {
        const result = await editDocument({
          document_id: id,
          description: data.description,
          amount: data.amount,
          currency: data.currency,
          edit_note: data.edit_note || '',
          new_lines: new_lines || [],
        });
        qc.invalidateQueries({ queryKey: ['transactions'] });
        qc.invalidateQueries({ queryKey: ['documents'] });
        qc.invalidateQueries({ queryKey: ['balances'] });
        return result;
      } finally {
        finishOp();
      }
    },
  });
}

// ── Balance Queries (from SQL views, never cached) ──
export function useTreasuryBalances() {
  return useQuery({
    queryKey: ['balances', 'treasury'],
    queryFn: () => getBalances('treasury'),
  });
}

export function useBankBalances() {
  return useQuery({
    queryKey: ['balances', 'bank'],
    queryFn: () => getBalances('bank'),
  });
}

export function useCustomerBalances() {
  return useQuery({
    queryKey: ['balances', 'customer'],
    queryFn: () => getBalances('customer'),
  });
}

export function useAgentBalances() {
  return useQuery({
    queryKey: ['balances', 'agent'],
    queryFn: () => getBalances('agent'),
  });
}

export function useProfitLoss() {
  return useQuery({
    queryKey: ['balances', 'profit_loss'],
    queryFn: () => getBalances('profit_loss'),
  });
}

export function useCurrencyBalances() {
  return useQuery({
    queryKey: ['balances', 'currency'],
    queryFn: () => getBalances('currency'),
  });
}

export function useExchangeSummary() {
  return useQuery({
    queryKey: ['balances', 'exchange_summary'],
    queryFn: () => getBalances('exchange_summary'),
  });
}

// ── Documents Query (with ledger lines) ──
export function useDocuments(filters = {}, sort, limit) {
  return useQuery({
    queryKey: ['documents', filters, sort, limit],
    queryFn: () => listDocuments(filters, sort, limit),
  });
}

export function useToggleReferral() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ profileId, enabled }) => {
      trackOp();
      try {
        const existing = await sbSarraafProfile.get(profileId);
        const code = enabled
          ? (existing?.referral_code || await generateUniqueInviteCode('SR'))
          : undefined;
        return await sbSarraafProfile.update(profileId, {
          referral_enabled: enabled,
          referral_code: enabled ? code : '',
        });
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['sarraafProfile'] });
      }
    },
  });
}

// ── Update sarraaf profile (exchange record) ──
export function useUpdateSarraafProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ profileId, data }) => {
      trackOp();
      try {
        return await sbSarraafProfile.update(profileId, data);
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['sarraafProfile'] });
      }
    },
  });
}

// ── Manual sync trigger (for UI buttons) ──
export function useSyncNow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await syncPendingWrites();
      qc.invalidateQueries();
      return getPendingCount();
    },
  });
}