/**
 * لایه داده پروفایل مشتری — از طریق بک‌اند امن (HMAC-signed)
 */

import { createSupabaseEntity } from './supabaseApi';

export async function loadProfile(user) {
  if (!user) return null;

  let balances = [];
  try {
    const sb = createSupabaseEntity('Wallet');
    const data = await sb.filter({ user_id: user.id }, 'id', 100);
    balances = (data || []).map((w) => ({
      currency: w.currency || 'AFN',
      amount: w.balance || 0,
      label: currencyLabel(w.currency),
    }));
  } catch { /* non-critical */ }

  return {
    customer_name: user.full_name || '',
    username: user.username || '',
    customer_code: user.id ? String(user.id) : '',
    phone: user.mobile || user.phone || '',
    email: user.email || '',
    display_name: user.full_name || '',
    exchange_name: user.exchange_name || '',
    exchange_code: user.exchange_code || '',
    account_status: user.status || 'active',
    joined_date: user.created_date || new Date().toISOString(),
    balances,
    notification_settings: {
      in_app: true,
      orders: true,
      messages: true,
      general: false,
    },
  };
}

export async function saveProfile(userId, updates) {
  // Save editable fields to users table via backend crud
  try {
    const sb = createSupabaseEntity('User');
    const userFields = {};
    if (updates.customer_name) userFields.full_name = updates.customer_name;
    if (updates.phone) userFields.mobile = updates.phone;
    if (updates.email) userFields.email = updates.email;
    if (Object.keys(userFields).length > 0) {
      await sb.update(userId, userFields);
    }
  } catch { /* non-critical — profile update failed */ }
  // Save notification_settings locally per user
  try {
    const key = `notif_settings_${userId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '{}');
    const updated = { ...existing, ...updates.notification_settings };
    localStorage.setItem(key, JSON.stringify(updated));
    return { ...updates, notification_settings: updated };
  } catch {
    return null;
  }
}

export async function saveNotificationSettings(userId, settings) {
  try {
    const key = `notif_settings_${userId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '{}');
    const updated = { ...existing, ...settings };
    localStorage.setItem(key, JSON.stringify(updated));
    return updated;
  } catch {
    return null;
  }
}

function currencyLabel(code) {
  const labels = {
    AFN: 'افغانی',
    USD: 'دلار',
    IRT: 'تومان',
    USDT: 'تتر',
    EUR: 'یورو',
    PKR: 'روپیه',
  };
  return labels[code] || code;
}