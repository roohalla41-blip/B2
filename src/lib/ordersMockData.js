/**
 * لایه داده سفارش‌های مشتری — از طریق بک‌اند امن (HMAC-signed)
 */

import { createSupabaseEntity } from './supabaseApi';

export async function loadOrdersProfile(user) {
  return {
    customer_name: user?.full_name || 'مشتری',
    customer_code: user?.id ? String(user.id) : '',
    exchange_name: user?.exchange_name || '',
  };
}

export async function loadOrders(userId) {
  if (!userId) return [];
  const sb = createSupabaseEntity('OnlineOrder');
  const data = await sb.filter({ created_by_id: userId }, '-id', 200);
  return (data || []).map((o) => ({
    id: o.id,
    tracking_number: o.tracking_no || o.id,
    title: o.product_name || 'سفارش',
    service_type: o.product_key || 'other',
    service_type_label: o.product_name || '',
    status: o.status || 'new',
    currency: o.currency || 'AFN',
    amount: o.total || 0,
    description: o.description || '',
    created_date: o.created_date,
  }));
}