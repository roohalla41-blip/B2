// googleAuth.js — Google OAuth via Supabase (native, APK-compatible)
//
// ورود با گوگل از طریق Supabase OAuth انجام می‌شود.
// این روش در WebView اندروید (APK) کار می‌کند، برخلاف
// base44.auth.loginWithProvider که در WebView شکست می‌خورد.
//
// جریان:
// 1. loginWithProvider → supabase.auth.signInWithOAuth (همان WebView)
// 2. پس از احراز هویت گوگل، سوپابیس کد را تبادل می‌کند
// 3. handleGoogleCallback → توکن access را از نشست سوپابیس می‌گیرد
//    و آن را به بک‌اند googleOAuthCallback می‌فرستد
// 4. بک‌اند توکن را تأیید کرده و توکن HMAC صادر می‌کند

import { supabase } from './supabaseClient';
import { getSupabaseConfig } from './supabaseConfig';

/**
 * Initiate Google OAuth login via Supabase.
 * Redirects to Google in the same WebView. After auth, user comes
 * back to /login?google_cb=1.
 *
 * Returns { ok: true } on redirect, or { ok: false, error: '...' }
 * if the provider is disabled or the OAuth call fails.
 */
export async function loginWithProvider(returnTo = '/dashboard') {
  const redirectTo = `${window.location.origin}/login?google_cb=1&return_to=${encodeURIComponent(returnTo)}`;
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) {
      return { ok: false, error: mapGoogleError(error) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: mapGoogleError(e) };
  }
}

/**
 * Map Supabase/Google OAuth errors to a Persian message.
 */
function mapGoogleError(err) {
  const msg = (err?.message || err?.toString() || '').toLowerCase();
  if (msg.includes('provider is not enabled') || msg.includes('unsupported provider')) {
    return 'provider_disabled';
  }
  if (msg.includes('mismatchingstate') || msg.includes('state mismatch')) {
    return 'state_mismatch';
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'network_error';
  }
  return 'unknown';
}

/**
 * Alias for loginWithProvider — initiates Google login.
 */
export async function initiateGoogleLogin(returnTo = '/dashboard') {
  return loginWithProvider(returnTo);
}

/**
 * Initiate Google OAuth for account linking (password recovery).
 * Stores the mobile for later use, then redirects to Google.
 */
export function initiateGoogleLink(mobile, returnTo = '/forgot-password') {
  localStorage.setItem('google_link_mobile', mobile);
  const redirectTo = `${window.location.origin}${returnTo}${returnTo.includes('?') ? '&' : '?'}google_link=1`;
  supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
}

/**
 * Wait for the supabase client to finish exchanging the OAuth code.
 * After the redirect, the code exchange is async — poll until the
 * session is available.
 */
async function waitForSession(maxAttempts = 10, intervalMs = 500) {
  for (let i = 0; i < maxAttempts; i++) {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) return data.session;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return null;
}

/**
 * Handle Google OAuth callback after Supabase redirects back.
 * Gets the access_token from the Supabase session, sends it to the
 * backend googleOAuthCallback action which verifies it and issues
 * an HMAC session token.
 *
 * @returns {{ linked: true, user: object } | { error: string } | null}
 */
export async function handleGoogleCallback() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const isLink = urlParams.get('google_link') === '1';

    // ── Check for OAuth error in redirect URL ──
    // Supabase redirects back with ?error=...&error_description=... on failure
    const redirectError = urlParams.get('error');
    if (redirectError) {
      const desc = urlParams.get('error_description') || '';
      const lowDesc = desc.toLowerCase();
      if (lowDesc.includes('provider') || lowDesc.includes('disabled')) {
        return { error: 'provider_disabled' };
      }
      if (lowDesc.includes('mismatch') || lowDesc.includes('state')) {
        return { error: 'state_mismatch' };
      }
      return { error: 'oauth_redirect_error', detail: desc };
    }

    // Clean the URL of error params to avoid stale state
    if (redirectError) {
      urlParams.delete('error');
      urlParams.delete('error_description');
      urlParams.delete('error_code');
      const cleanSearch = urlParams.toString();
      window.history.replaceState({}, '', window.location.pathname + (cleanSearch ? `?${cleanSearch}` : ''));
    }

    // Wait for the supabase client to exchange the code
    const session = await waitForSession();
    if (!session) return null;

    const access_token = session.access_token;
    const { data: userData } = await supabase.auth.getUser();
    const googleEmail = userData?.user?.email;
    if (!googleEmail) return null;
    const googleName = userData?.user?.user_metadata?.full_name || '';

    // ── Account linking (password recovery) ──
    if (isLink) {
      const mobile = localStorage.getItem('google_link_mobile') || '';
      if (!mobile) return { error: 'missing_mobile' };
      // Link Google email to the user's account via Edge Function
      try {
        const cfg = getSupabaseConfig();
        const edgeRes = await fetch(`${cfg.url}/functions/v1/legacy-auth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'linkGoogleAccount', mobile, google_email: googleEmail, access_token }),
        });
        const res = await edgeRes.json().catch(() => ({}));
        if (res?.success) {
          localStorage.removeItem('google_link_mobile');
          return { linked: true };
        }
        return { error: res?.error || 'unknown' };
      } catch (e) {
        return { error: 'unknown' };
      }
    }

    // ── Login: send access_token to Edge Function for verification + user profile ──
    try {
      const cfg = getSupabaseConfig();
      const edgeRes = await fetch(`${cfg.url}/functions/v1/legacy-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'googleLogin', access_token }),
      });
      const res = await edgeRes.json().catch(() => ({}));

      if (res?.success && res?.user) {
        localStorage.setItem('auth_token', access_token);
        if (res.user.role !== 'creator') {
          localStorage.setItem('auth_user', JSON.stringify(res.user));
        }
        return { linked: true, user: res.user };
      }
      if (res?.error === 'user_not_found') {
        return { error: 'user_not_found', google_email: googleEmail, google_name: googleName };
      }
      return { error: res?.error || 'unknown' };
    } catch (e) {
      console.error('Edge Function error:', e);
      return { error: 'unknown' };
    }
  } catch (e) {
    console.error('Google callback error:', e);
    return null;
  }
}