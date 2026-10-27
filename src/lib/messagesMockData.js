/**
 * لایه داده پیام‌رسانی مشتری — مبتنی بر offlineDB
 *
 * گفتگوها از دیتابیس واقعی خوانده می‌شوند.
 * هیچ پیام خودکار یا پاسخ جعلی ایجاد نمی‌شود.
 */

import { supabaseDB as offlineDB } from './supabaseDB';

export async function loadMessagesProfile(user) {
  if (!user) return null;
  return {
    customer_name: user.full_name || '',
    customer_code: '',
    exchange_name: '',
  };
}

export async function loadConversations(userId) {
  if (!userId) return [];
  // Conversations are based on direct chat groups where the user is a member
  let groups = [];
  try {
    groups = await offlineDB.ChatGroup.filter({ type: 'sarraaf_direct' });
  } catch {
    // ignore
  }
  if (!groups || groups.length === 0) return [];

  // Filter to groups where user is a member
  let memberships = [];
  try {
    memberships = await offlineDB.GroupMember.filter({ user_id: userId });
  } catch {
    // ignore
  }
  const memberGroupIds = new Set((memberships || []).map((m) => m.group_id));
  const userGroups = groups.filter((g) => memberGroupIds.has(g.id));

  // Load last message for each group
  const conversations = [];
  for (const g of userGroups) {
    let messages = [];
    try {
      messages = await offlineDB.GroupMessage.filter({ group_id: g.id });
    } catch {
      // ignore
    }
    const active = (messages || []).filter((m) => m.status !== 'deleted');
    active.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
    const lastMsg = active[0];
    const unread = active.filter((m) => m.sender_id !== userId && m.status !== 'read').length;

    conversations.push({
      id: g.id,
      name: g.name || 'گفتگو',
      avatar: g.image || null,
      role: 'exchange',
      status: 'active',
      unread_count: unread,
      last_message: lastMsg?.message || '',
      last_message_time: lastMsg?.created_date || g.created_date || '',
      messages: active.map((m) => ({
        id: m.id,
        sender: m.sender_id === userId ? 'customer' : 'exchange',
        sender_name: m.sender_name || '',
        content: m.message || '',
        timestamp: m.created_date || '',
        status: m.status === 'read' ? 'read' : 'delivered',
      })),
    });
  }
  return conversations.sort((a, b) => new Date(b.last_message_time || 0) - new Date(a.last_message_time || 0));
}

export async function sendMessage(conversationId, text, senderName, userId) {
  if (!conversationId || !text || !userId) return null;
  const newMessage = await offlineDB.GroupMessage.create({
    group_id: conversationId,
    sender_id: userId,
    sender_name: senderName || 'مشتری',
    sender_role: 'customer',
    message: text,
    status: 'active',
    sync_status: 'pending',
  });
  return { message: newMessage, reply: null };
}

export async function markConversationRead(conversationId, userId) {
  if (!conversationId || !userId) return;
  let messages = [];
  try {
    messages = await offlineDB.GroupMessage.filter({ group_id: conversationId });
  } catch {
    return;
  }
  const unread = (messages || []).filter((m) => m.sender_id !== userId && m.status !== 'read' && m.status !== 'deleted');
  for (const m of unread) {
    await offlineDB.GroupMessage.update(m.id, { status: 'read' });
  }
}