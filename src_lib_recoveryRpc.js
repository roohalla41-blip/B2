// recoveryRpc.js — بازیابی حساب‌ها از طریق RPCهای امن Supabase
//
// تمام عملیات بازیابی (وضعیت، پیش‌نمایش، بازیابی، پیوند سازنده)
// مستقیماً از طریق RPCهای دیتابیس انجام می‌شوند.
// هیچ وابستگی به Edge Function، Base44 integrations یا service-role key ندارد.

import { supabase } from './supabaseClient';

// ── وضعیت بازیابی ──
export async function getRecoveryStatus() {
  const { data, error } = await supabase.rpc('recovery_get_status');
  if (error) return { success: false, error: error.message };
  return data || { success: false, error: 'empty_response' };
}

// ── پیش‌نمایش بازیابی (فقط خواندنی) ──
export async function previewRecovery() {
  const { data, error } = await supabase.rpc('recovery_preview_migrate');
  if (error) return { success: false, error: error.message };
  return data || { success: false, error: 'empty_response' };
}

// ── بازیابی کاربران (هش کردن رمزهای متن‌ساده) ──
export async function migrateUsers() {
  const { data, error } = await supabase.rpc('recovery_migrate_users');
  if (error) return { success: false, error: error.message };
  return data || { success: false, error: 'empty_response' };
}

// ── پیوند حساب سازنده ──
export async function linkCreator(email, password) {
  const { data, error } = await supabase.rpc('recovery_link_creator', {
    p_email: email,
    p_password: password,
  });
  if (error) return { success: false, error: error.message };
  return data || { success: false, error: 'empty_response' };
}

export default {
  getRecoveryStatus,
  previewRecovery,
  migrateUsers,
  linkCreator,
};