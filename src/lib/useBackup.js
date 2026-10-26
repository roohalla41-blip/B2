// useBackup.js — React Query hooks for backup operations
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { offlineDB } from './offlineQueue';
import { trackOp, finishOp } from './syncStatus';
import {
  createManualBackup,
  restoreFromBackupFile,
  getBackupHistory,
  hasBackupAddon,
  activateBackupAddon,
  canBackup,
  createLocalBackup,
  getLocalBackups,
  restoreFromLocalBackup,
  deleteLocalBackup,
} from './backupService';

export function useBackupLimit(userId, hasAddon) {
  return useQuery({
    queryKey: ['backupLimit', userId, hasAddon],
    queryFn: () => canBackup(userId, hasAddon),
    enabled: !!userId,
  });
}

export function useBackupHistory(userId) {
  return useQuery({
    queryKey: ['backupHistory', userId],
    queryFn: () => getBackupHistory(userId),
    enabled: !!userId,
  });
}

export function useBackupAddon(userId) {
  return useQuery({
    queryKey: ['backupAddon', userId],
    queryFn: () => hasBackupAddon(userId),
    enabled: !!userId,
  });
}

export function useCreateBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, userName }) => {
      trackOp();
      try {
        return await createManualBackup({ userId, userName });
      } finally {
        finishOp();
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['backupHistory', vars.userId] });
    },
  });
}

export function useRestoreBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, userId, userName }) => {
      trackOp();
      try {
        return await restoreFromBackupFile(file, { userId, userName });
      } finally {
        finishOp();
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['backupHistory', vars.userId] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['transfers'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useLocalBackups() {
  return useQuery({
    queryKey: ['localBackups'],
    queryFn: () => getLocalBackups(),
  });
}

export function useCreateLocalBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, userName }) => {
      trackOp();
      try {
        return await createLocalBackup({ userId, userName });
      } finally {
        finishOp();
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['localBackups'] });
    },
  });
}

export function useRestoreLocalBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ backupId, userId, userName }) => {
      trackOp();
      try {
        return await restoreFromLocalBackup(backupId, { userId, userName });
      } finally {
        finishOp();
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['backupHistory', vars.userId] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['transfers'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useDeleteLocalBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (backupId) => deleteLocalBackup(backupId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['localBackups'] });
    },
  });
}

export function useActivateBackupAddon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, userName, durationMonths }) => {
      trackOp();
      try {
        return await activateBackupAddon({ userId, userName, durationMonths });
      } finally {
        finishOp();
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['backupAddon', vars.userId] });
    },
  });
}