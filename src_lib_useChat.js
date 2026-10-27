// useChat.js — React Query hooks for chat groups and messages
// Uses Supabase via createSupabaseEntity (no IndexedDB)
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createSupabaseEntity, getExchangeCode, isCreatorOrAdmin } from './supabaseApi';
import { trackOp, finishOp } from './syncStatus';
import { isInTrialPeriod } from './permissions';
import { getMemberRole, getExpiryDate, isMessageExpired, getMessageCooldown, sortGroups } from './chat';

// Direct Supabase entity instances
const sbGroups = createSupabaseEntity('ChatGroup');
const sbMembers = createSupabaseEntity('GroupMember');
const sbMessages = createSupabaseEntity('GroupMessage');
const sbReports = createSupabaseEntity('MessageReport');

// ── Queries ──
export function useChatGroups(type) {
  return useQuery({
    queryKey: ['chatGroups', type],
    queryFn: async () => {
      const list = await sbGroups.list('-created_date', 200);
      let filtered = list.filter(g => g.status !== 'archived');
      // ── Tenant isolation: only show own groups, public groups, and system groups ──
      if (!isCreatorOrAdmin()) {
        const ec = getExchangeCode();
        filtered = filtered.filter(g =>
          !g.exchange_code || g.exchange_code === ec || g.creator_managed === true
        );
      }
      if (type) {
        filtered = filtered.filter(g => g.type === type || g.creator_managed === true);
      }
      return sortGroups(filtered);
    },
  });
}

export function useChatGroup(groupId) {
  return useQuery({
    queryKey: ['chatGroup', groupId],
    queryFn: async () => {
      if (!groupId) return null;
      return await sbGroups.get(groupId);
    },
    enabled: !!groupId,
  });
}

export function useGroupMembers(groupId) {
  return useQuery({
    queryKey: ['groupMembers', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const list = await sbMembers.filter({ group_id: Number(groupId) });
      return list.filter(m => m.status !== 'blocked' && m.status !== 'rejected');
    },
    enabled: !!groupId,
  });
}

export function usePendingMembers(groupId) {
  return useQuery({
    queryKey: ['pendingMembers', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const list = await sbMembers.filter({ group_id: Number(groupId), status: 'pending' });
      return list;
    },
    enabled: !!groupId,
  });
}

export function useGroupMessages(groupId) {
  return useQuery({
    queryKey: ['groupMessages', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const list = await sbMessages.filter({ group_id: Number(groupId) });
      return list
        .filter(m => m.status !== 'deleted' && !isMessageExpired(m))
        .sort((a, b) => new Date(a.created_date || 0) - new Date(b.created_date || 0));
    },
    enabled: !!groupId,
  });
}

export function useMessageReports() {
  return useQuery({
    queryKey: ['messageReports'],
    queryFn: async () => {
      const list = await sbReports.list('-created_date', 200);
      return list.filter(r => r.status === 'pending');
    },
  });
}

export function useIsGroupMember(groupId, userId) {
  return useQuery({
    queryKey: ['isGroupMember', groupId, userId],
    queryFn: async () => {
      if (!groupId || !userId) return false;
      const list = await sbMembers.filter({ group_id: Number(groupId), user_id: String(userId) });
      return list.some(m => m.status === 'active');
    },
    enabled: !!groupId && !!userId,
  });
}

// ── Mutations ──
export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      // Block group creation during the free trial period
      if (isInTrialPeriod(data._profile)) {
        throw new Error('در دوره آزمایشی یک‌ماهه، ساخت گروه غیرفعال است. پس از ارتقا به طرح پولی، امکان ساخت گروه فراهم می‌شود.');
      }
      trackOp();
      try {
        const group = await sbGroups.create(data);
        // Auto-add creator as admin member
        await sbMembers.create({
          group_id: Number(group.id),
          group_name: data.name,
          user_id: String(data.creator_id),
          user_name: data.creator_name,
          user_role: data.creator_role || 'sarraaf_verified',
          role: 'admin',
          status: 'active',
          joined_at: new Date().toISOString(),
        });
        return group;
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['chatGroups'] });
      }
    },
  });
}

export function useJoinGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ group, user, userRole, profile }) => {
      trackOp();
      try {
        const memberRole = getMemberRole(userRole, profile);
        const member = await sbMembers.create({
          group_id: Number(group.id),
          group_name: group.name,
          user_id: String(user.id),
          user_name: user.full_name || user.email,
          user_role: memberRole,
          role: 'member',
          status: group.type === 'private' ? 'pending' : 'active',
          joined_at: new Date().toISOString(),
        });
        if (group.type !== 'private') {
          await sbGroups.update(group.id, { member_count: (group.member_count || 0) + 1 });
        }
        return member;
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['groupMembers'] });
        qc.invalidateQueries({ queryKey: ['isGroupMember'] });
        qc.invalidateQueries({ queryKey: ['chatGroups'] });
      }
    },
  });
}

export function useUpdateMemberStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, groupId, currentCount }) => {
      trackOp();
      try {
        const updated = await sbMembers.update(id, { status, joined_at: status === 'active' ? new Date().toISOString() : undefined });
        if (status === 'active' && groupId) {
          await sbGroups.update(groupId, { member_count: (currentCount || 0) + 1 });
        }
        return updated;
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['groupMembers'] });
        qc.invalidateQueries({ queryKey: ['pendingMembers'] });
        qc.invalidateQueries({ queryKey: ['chatGroups'] });
      }
    },
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, groupId, currentCount }) => {
      trackOp();
      try {
        const removed = await sbMembers.delete(id);
        if (groupId) {
          await sbGroups.update(groupId, { member_count: Math.max(0, (currentCount || 1) - 1) });
        }
        return removed;
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['groupMembers'] });
        qc.invalidateQueries({ queryKey: ['chatGroups'] });
      }
    },
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    onMutate: async ({ group, user, userRole, profile, message, ttlKey }) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await qc.cancelQueries({ queryKey: ['groupMessages', String(group.id)] });

      // Snapshot the current cache for rollback
      const queryKey = ['groupMessages', String(group.id)];
      const previousMessages = qc.getQueryData(queryKey);

      // Build the optimistic message
      const memberRole = getMemberRole(userRole, profile);
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        group_id: Number(group.id),
        sender_id: String(user.id),
        sender_name: user.full_name || user.email,
        sender_role: memberRole,
        message,
        sync_status: 'pending',
        status: 'active',
        expires_at: getExpiryDate(ttlKey),
        created_date: new Date().toISOString(),
      };

      // Optimistically add the message to the cache
      qc.setQueryData(queryKey, (old) => {
        if (!old) return [optimisticMessage];
        return [...old, optimisticMessage];
      });

      // Return context with rollback info
      return { queryKey, previousMessages };
    },
    onError: (_err, _vars, context) => {
      // Roll back the cache to the snapshot on error
      if (context?.queryKey && context.previousMessages !== undefined) {
        qc.setQueryData(context.queryKey, context.previousMessages);
      }
    },
    onSettled: () => {
      finishOp();
      // Always refetch after error or success to ensure server truth
      qc.invalidateQueries({ queryKey: ['groupMessages'] });
    },
    mutationFn: async ({ group, user, userRole, profile, message, ttlKey }) => {
      trackOp();
      const cooldown = getMessageCooldown(userRole, profile);
      if (cooldown > 0) {
        const allMessages = await sbMessages.filter({ sender_id: String(user.id) });
        const active = (allMessages || []).filter(m => m.status !== 'deleted');
        active.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
        if (active.length > 0) {
          const lastMsgTime = new Date(active[0].created_date || 0).getTime();
          const elapsed = Math.floor((Date.now() - lastMsgTime) / 1000);
          if (elapsed < cooldown) {
            const remaining = cooldown - elapsed;
            throw new Error(`rate_limited:${remaining}`);
          }
        }
      }

      const memberRole = getMemberRole(userRole, profile);
      return await sbMessages.create({
        group_id: Number(group.id),
        sender_id: String(user.id),
        sender_name: user.full_name || user.email,
        sender_role: memberRole,
        message,
        sync_status: 'pending',
        status: 'active',
        expires_at: getExpiryDate(ttlKey),
      });
    },
  });
}

// ── Message Cooldown Hook ──
export function useMessageCooldown(groupId, userId, userRole, profile) {
  const [remaining, setRemaining] = useState(0);
  const cooldown = getMessageCooldown(userRole, profile);

  useEffect(() => {
    if (!userId || cooldown <= 0) {
      setRemaining(0);
      return;
    }
    let cancelled = false;

    const check = async () => {
      const allMessages = await sbMessages.filter({ sender_id: String(userId) });
      const active = (allMessages || []).filter(m => m.status !== 'deleted');
      active.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
      if (active.length > 0) {
        const lastMsgTime = new Date(active[0].created_date || 0).getTime();
        const elapsed = Math.floor((Date.now() - lastMsgTime) / 1000);
        const rem = Math.max(0, cooldown - elapsed);
        if (!cancelled) setRemaining(rem);
      } else {
        if (!cancelled) setRemaining(0);
      }
    };

    check();
    const interval = setInterval(check, 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [userId, cooldown, groupId]);

  return remaining;
}

export function useDeleteMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      trackOp();
      try {
        return await sbMessages.update(id, { status: 'deleted' });
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['groupMessages'] });
      }
    },
  });
}

export function useReportMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ message, reporter, reason }) => {
      trackOp();
      try {
        return await sbReports.create({
          message_id: Number(message.id),
          group_id: Number(message.group_id),
          reporter_id: String(reporter.id),
          reporter_name: reporter.full_name || reporter.email,
          sender_id: String(message.sender_id),
          sender_name: message.sender_name,
          reason,
          status: 'pending',
        });
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['messageReports'] });
      }
    },
  });
}

export function useResolveReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }) => {
      trackOp();
      try {
        return await sbReports.update(id, { status });
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['messageReports'] });
      }
    },
  });
}

// ── Update/Delete Group ──
export function useUpdateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      trackOp();
      try {
        return await sbGroups.update(id, data);
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['chatGroups'] });
        qc.invalidateQueries({ queryKey: ['chatGroup'] });
      }
    },
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      trackOp();
      try {
        // Remove all members for this group
        const members = await sbMembers.filter({ group_id: Number(id) });
        for (const m of members) {
          await sbMembers.delete(m.id);
        }
        // Remove all messages for this group
        const messages = await sbMessages.filter({ group_id: Number(id) });
        for (const msg of messages) {
          await sbMessages.delete(msg.id);
        }
        return await sbGroups.delete(id);
      } finally {
        finishOp();
        qc.invalidateQueries({ queryKey: ['chatGroups'] });
        qc.invalidateQueries({ queryKey: ['groupMembers'] });
        qc.invalidateQueries({ queryKey: ['groupMessages'] });
      }
    },
  });
}

// ── Seed Default Groups ──
export async function seedDefaultGroups(creator) {
  const existing = await sbGroups.list('-created_date', 200);
  const now = new Date().toISOString();
  const defaults = [
    {
      name: 'بازار ارز — نرخ روز',
      description: 'گروه عمومی برای اعلام نرخ روزانه ارزها و بحث‌های بازار',
      type: 'public',
      rules: 'احترام متقابل — عدم ارسال پیام‌های تبلیغاتی',
      status: 'active',
      member_count: 1,
    },
    {
      name: 'انجمن صرافان',
      description: 'گروه خصوصی صرافان برای تبادل اطلاعات و همکاری',
      type: 'private',
      rules: 'فقط صرافان. محرمانگی اطلاعات الزامی است.',
      status: 'active',
      member_count: 1,
    },
  ];

  const created = [];
  for (const def of defaults) {
    if (existing.some(g => g.name === def.name)) continue;
    const group = await sbGroups.create({
      ...def,
      creator_id: String(creator.id),
      creator_name: creator.full_name || creator.email || 'مدیر سیستم',
      creator_managed: true,
    });
    await sbMembers.create({
      group_id: Number(group.id),
      group_name: def.name,
      user_id: String(creator.id),
      user_name: creator.full_name || creator.email || 'مدیر سیستم',
      user_role: 'admin',
      role: 'admin',
      status: 'active',
      joined_at: now,
    });
    created.push(group);
  }
  return created;
}