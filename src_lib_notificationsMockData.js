/**
 * لایه داده اعلان‌های مشتری — از طریق بک‌اند امن (HMAC-signed)
 */

import { createSupabaseEntity } from './supabaseApi';

export async function loadNotifications(userId) {
  if (!userId) return [];
  const sb = createSupabaseEntity('CustomerNotification');
  const data = await sb.filter({ customer_user_id: userId }, '-id', 200);
  return (data || []).map((n) => ({
    id: n.id,
    type: n.kind || 'general',
    title: n.title || '',
    body: n.message || '',
    read: n.read || false,
    link: '',
    timestamp: n.created_date,
  }));
}

export async function markNotificationRead(id) {
  if (!id) return;
  const sb = createSupabaseEntity('CustomerNotification');
  await sb.update(id, { read: true });
}

export async function markAllNotificationsRead(userId) {
  if (!userId) return;
  // Server-side: update all unread notifications for this user
  const sb = createSupabaseEntity('CustomerNotification');
  const unread = await sb.filter({ customer_user_id: userId, read: false }, '-id', 500);
  for (const n of (unread || [])) {
    await sb.update(n.id, { read: true });
  }
}