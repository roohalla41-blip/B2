// supabaseAuth.js — Direct Supabase Auth (no Base44 dependency)
//
// این ماژول احراز هویت مستقیم Supabase را فراهم می‌کند.
// هنوز جایگزین AuthContext نشده — فقط آماده‌سازی برای مهاجرت بعدی.
//
// نکات:
// - ثبت‌نام و ورود با ایمیل/رمز از طریق Supabase Auth انجام می‌شود.
// - Google Login از طریق Supabase Auth OAuth انجام می‌شود.
// - OTP (تأیید ایمیل) خودکار توسط Supabase Auth مدیریت می‌شود.
// - نشست (session) به‌صورت خودکار در localStorage ذخیره و تمدید می‌شود.

import { supabase } from './supabaseClient';

// ── ثبت‌نام با ایمیل و رمز عبور ──
export async function signUpWithEmail(email, password, metadata = {}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata, // اطلاعات اضافی کاربر (full_name, role, etc.)
    },
  });
  return { data, error };
}

// ── ورود با ایمیل و رمز عبور ──
export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

// ── ورود با گوگل (OAuth) ──
export async function signInWithGoogle(returnTo = '/login') {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}${returnTo}`,
    },
  });
  return { data, error };
}

// ── خروج ──
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

// ── دریافت کاربر فعلی ──
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
}

// ── دریافت نشست فعلی ──
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
}

// ─ـ گوش دادن به تغییرات وضعیت احراز هویت ──
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

// ── بازنشانی رمز عبور (ارسال ایمیل) ──
export async function resetPassword(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  return { data, error };
}

// ── به‌روزرسانی رمز عبور (پس از کلیک روی لینک ایمیل) ──
export async function updatePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  return { data, error };
}

// ── ارسال مجدد ایمیل تأیید (OTP) ──
export async function resendVerificationEmail(email) {
  const { data, error } = await supabase.auth.resend({
    type: 'signup',
    email,
  });
  return { data, error };
}

// ── تأیید کد OTP (۶ رقمی) ──
export async function verifyOtp(email, token, type = 'signup') {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type,
  });
  return { data, error };
}

// ── بررسی اینکه آیا کاربر وارد شده است ──
export async function isAuthenticated() {
  const { session } = await getSession();
  return !!session;
}

export default {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  getCurrentUser,
  getSession,
  onAuthStateChange,
  resetPassword,
  updatePassword,
  resendVerificationEmail,
  verifyOtp,
  isAuthenticated,
};