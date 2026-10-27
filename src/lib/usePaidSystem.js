// usePaidSystem.js — Global toggle for the paid plan system
// When disabled, all users get full access (no plan restrictions, no upgrade prompts).
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createSupabaseEntity } from './supabaseApi';

const SETTING_KEY = 'paid_system_enabled';
const sbAppSettings = createSupabaseEntity('AppSetting');

export function usePaidSystemEnabled() {
  return useQuery({
    queryKey: ['paidSystemEnabled'],
    queryFn: async () => {
      try {
        const rows = await sbAppSettings.filter({ key: SETTING_KEY }, null, 1);
        if (!rows || rows.length === 0) return true; // default: enabled
        const val = rows[0].value;
        if (val === 'true' || val === true) return true;
        if (val === 'false' || val === false) return false;
        return true;
      } catch {
        return true; // fail-open: don't block users on errors
      }
    },
    staleTime: 30_000,
  });
}

export function useTogglePaidSystem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (enabled) => {
      const rows = await sbAppSettings.filter({ key: SETTING_KEY }, null, 1);
      const value = enabled ? 'true' : 'false';
      if (rows && rows.length > 0) {
        return sbAppSettings.update(rows[0].id, { value });
      }
      return sbAppSettings.create({ key: SETTING_KEY, value });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['paidSystemEnabled'] });
      qc.invalidateQueries({ queryKey: ['features'] });
    },
  });
}