// usePricing.js — React Query hooks for plan pricing and discount campaigns
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { offlineDB } from './offlineQueue';
import { trackOp, finishOp } from './syncStatus';
import {
  getAllPlans,
  updatePlan,
  createPlan,
  getDiscountCampaign,
  startDiscountCampaign,
  stopDiscountCampaign,
} from './pricingService';

// ── Queries ──
export function usePricingPlans() {
  return useQuery({
    queryKey: ['pricingPlans'],
    queryFn: () => getAllPlans(),
  });
}

export function useDiscountCampaign() {
  return useQuery({
    queryKey: ['discountCampaign'],
    queryFn: () => getDiscountCampaign(),
    // Poll every 30s to keep countdown fresh
    refetchInterval: 30000,
  });
}

export function usePlanQuotas() {
  return useQuery({
    queryKey: ['planQuotas'],
    queryFn: () => offlineDB.PlanQuota.list('-created_date', 200),
  });
}

// ── Mutations ──
export function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      trackOp();
      try {
        return await updatePlan(id, data);
      } finally {
        finishOp();
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pricingPlans'] }),
  });
}

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      trackOp();
      try {
        return await createPlan(data);
      } finally {
        finishOp();
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pricingPlans'] }),
  });
}

export function useStartCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ percent, durationHours }) => {
      trackOp();
      try {
        return await startDiscountCampaign({ percent, durationHours });
      } finally {
        finishOp();
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['discountCampaign'] });
      qc.invalidateQueries({ queryKey: ['userNotifications'] });
    },
  });
}

export function useStopCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      trackOp();
      try {
        return await stopDiscountCampaign();
      } finally {
        finishOp();
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['discountCampaign'] }),
  });
}