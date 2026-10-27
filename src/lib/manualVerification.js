// manualVerification.js — Manual email verification request for Sarraaf users
// who couldn't receive the email code after multiple attempts.
//
// تمام عملیات مستقیماً از طریق کلاینت Supabase انجام می‌شوند (بدون Base44).
// امنیت از طریق RLS policies (x-app-token header) تأمین می‌شود.

import { supabase } from './supabaseClient';

const TABLE = 'manual_verification_requests';
const SEND_COUNT_PREFIX = 'ev_send_count_';

export function getSendCount(email) {
  try {
    const key = SEND_COUNT_PREFIX + (email || '').toLowerCase().trim();
    return parseInt(localStorage.getItem(key) || '0', 10);
  } catch { return 0; }
}

export function incrementSendCount(email) {
  try {
    const key = SEND_COUNT_PREFIX + (email || '').toLowerCase().trim();
    const count = getSendCount(email) + 1;
    localStorage.setItem(key, String(count));
    return count;
  } catch { return 0; }
}

export function resetSendCount(email) {
  try {
    const key = SEND_COUNT_PREFIX + (email || '').toLowerCase().trim();
    localStorage.removeItem(key);
  } catch { /* ignore */ }
}

// ── Submit manual verification request ──
export async function submitManualRequest({ email, phone, username, exchange_name, reason }) {
  const trimmedEmail = (email || '').trim().toLowerCase();
  if (!trimmedEmail) return { success: false, error: 'invalid_email' };

  try {
    const { error } = await supabase.from(TABLE).insert({
      email: trimmedEmail,
      phone: phone || '',
      username: username || '',
      exchange_name: exchange_name || '',
      reason: reason || '',
      status: 'pending',
    });
    if (error) throw error;
    return { success: true };
  } catch (err) {
    return { success: false, error: 'request_failed', message: err.message };
  }
}

// ── Check if a manual request exists for this email ──
export async function checkManualRequestStatus(email) {
  const trimmedEmail = (email || '').trim().toLowerCase();
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('status')
      .eq('email', trimmedEmail)
      .order('created_at', { ascending: false })
      .limit(1);
    if (error || !data || data.length === 0) return { status: 'none' };
    return { status: data[0].status };
  } catch {
    return { status: 'none' };
  }
}

// ── Admin: approve manual request ──
// Note: Setting email_confirmed_at on auth.users requires service_role key.
// This operation needs a backend function. When integration credits are
// exhausted, this will fail with a clear error.
export async function approveManualVerification(email, reviewerName, reviewerId) {
  const trimmedEmail = (email || '').trim().toLowerCase();
  try {
    // Try calling the Supabase Edge Function (legacy-auth)
    const { getSupabaseConfig } = await import('./supabaseConfig');
    const cfg = getSupabaseConfig();
    const edgeRes = await fetch(`${cfg.url}/functions/v1/legacy-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approveManualVerification', email: trimmedEmail }),
    });
    const res = await edgeRes.json().catch(() => ({}));
    if (!res?.success) {
      return { success: false, error: res?.error || 'approve_failed' };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: 'approve_failed', message: err.message };
  }
}

export default {
  getSendCount,
  incrementSendCount,
  resetSendCount,
  submitManualRequest,
  checkManualRequestStatus,
  approveManualVerification,
};