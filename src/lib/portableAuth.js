// portableAuth.js — Platform-independent authentication layer
//
// This module is the SINGLE entry point for all auth operations.
// It abstracts away the underlying provider (Supabase Auth, custom HMAC,
// or future platform) so the rest of the app never imports a provider SDK
// directly.
//
// Design rules:
//   1. No Base44 SDK imports — fully portable.
//   2. No service-role keys in the browser — admin ops go through RPC.
//   3. Legacy users are NEVER deleted or overwritten — passwords are
//      migrated lazily after successful login.
//   4. All tokens are stored in localStorage with a versioned key prefix
//      so a future migration can invalidate them cleanly.
//
// Usage:
//   import { auth } from '@/lib/portableAuth';
//   const result = await auth.login(identifier, password);
//   const me = await auth.me();
//   await auth.logout();

import { supabase } from './supabaseClient';
import { getSupabaseConfig } from './supabaseConfig';
import { applyCreatorRole } from './creatorAuth';
import { setAppTokenHeader } from './supabaseDirectAuth';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const TOKEN_VERSION = 'v1';

// ── Token helpers ──
function storeToken(token) {
  if (!token) return;
  try { localStorage.setItem(TOKEN_KEY, token); } catch { /* ignore */ }
}

function storeUser(user) {
  if (!user) return;
  // Creator's user data is never persisted to localStorage (security).
  if (user.role === 'creator') return;
  try { localStorage.setItem(USER_KEY, JSON.stringify(user)); } catch { /* ignore */ }
}

function clearStoredAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch { /* ignore */ }
}

function getStoredToken() {
  try { return localStorage.getItem(TOKEN_KEY) || null; } catch { return null; }
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ── Normalize user from RPC response ──
function normalizeUser(user, exchange) {
  if (!user) return null;
  const u = { ...user };
  if (u.id !== undefined && u.id !== null) u.id = String(u.id);
  delete u.password;
  if (exchange) {
    if (!u.exchange_code) u.exchange_code = exchange.exchange_code || '';
    if (!u.exchange_name) u.exchange_name = exchange.exchange_name || '';
  }
  if (u.role === 'exchange') u.role = 'sarraaf';
  if (u.created_at) u.created_date = u.created_at;
  if (u.updated_at) u.updated_date = u.updated_at;
  return u;
}

// ════════════════════════════════════════════════════════════
// PUBLIC API
// ════════════════════════════════════════════════════════════

export const auth = {
  /**
   * Login with identifier (email/mobile/username) + password.
   * Calls the `legacy_login` RPC which returns an HMAC session token.
   * Password migration to pbkdf2 happens silently after login.
   *
   * @returns {{ ok: boolean, user?: object, token?: string, error?: string }}
   */
  async login(identifier, password) {
    if (!identifier || !password) {
      return { ok: false, error: 'missing_credentials' };
    }

    const { data, error } = await supabase.rpc('legacy_login', {
      p_identifier: identifier,
      p_password: password,
    });

    if (error) {
      return { ok: false, error: 'rpc_error', message: error.message };
    }
    if (!data || !data.success) {
      return { ok: false, error: data?.error || 'login_failed' };
    }

    // Set the x-app-token header so RLS policies can read the session.
    setAppTokenHeader(data.token);
    storeToken(data.token);

    const normalized = normalizeUser(data.user, data.exchange);
    const finalUser = applyCreatorRole(normalized);
    storeUser(finalUser);

    // Silent password migration (non-blocking, never breaks login).
    import('./legacyMigration')
      .then(({ migratePasswordAfterLogin }) =>
        migratePasswordAfterLogin(identifier, password, data.token)
      )
      .catch(() => {});

    return {
      ok: true,
      user: finalUser,
      token: data.token,
      is_default_password: password === '12345678',
    };
  },

  /**
   * Verify the current session token via `legacy_verify` RPC.
   * Returns the user object or null if the session is invalid/expired.
   */
  async me() {
    const token = getStoredToken();
    if (!token) {
      // Fall back to stored user (for offline / cached sessions).
      return getStoredUser();
    }

    const { data, error } = await supabase.rpc('legacy_verify', {
      p_token: token,
    });

    if (error || !data || !data.success) {
      // Token might be expired — clear it and fall back to cached user.
      clearStoredAuth();
      return null;
    }

    setAppTokenHeader(token);
    const normalized = normalizeUser(data.user, data.exchange);
    const finalUser = applyCreatorRole(normalized);
    storeUser(finalUser);
    return finalUser;
  },

  /**
   * Check if a session token exists (does NOT verify it server-side).
   * Use `me()` for verified session checks.
   */
  hasSession() {
    return !!getStoredToken();
  },

  /**
   * Get the cached user from localStorage (no RPC call).
   */
  getCachedUser() {
    return getStoredUser();
  },

  /**
   * Register a new customer account via `register_customer` RPC.
   */
  async registerCustomer({ full_name, mobile, username, password, email }) {
    const { data, error } = await supabase.rpc('register_customer', {
      p_full_name: full_name,
      p_mobile: mobile,
      p_username: username,
      p_password: password,
      p_email: email || null,
    });

    if (error) {
      return { ok: false, error: error.message || 'rpc_error' };
    }
    if (!data || !data.success) {
      return { ok: false, error: data?.error || 'register_failed' };
    }

    setAppTokenHeader(data.token);
    storeToken(data.token);
    const normalized = normalizeUser(data.user);
    storeUser(normalized);

    return { ok: true, user: normalized, token: data.token };
  },

  /**
   * Register a new exchange (sarraaf) account via `register_exchange` RPC.
   */
  async registerExchange({ exchange_name, full_name, mobile, username, password, email, country, city, exchange_code }) {
    const { data, error } = await supabase.rpc('register_exchange', {
      p_exchange_name: exchange_name,
      p_full_name: full_name,
      p_mobile: mobile,
      p_username: username,
      p_password: password,
      p_email: email || null,
      p_country: country || null,
      p_city: city || null,
      p_exchange_code: exchange_code || null,
    });

    if (error) {
      return { ok: false, error: error.message || 'rpc_error' };
    }
    if (!data || !data.success) {
      return { ok: false, error: data?.error || 'register_failed' };
    }

    setAppTokenHeader(data.token);
    storeToken(data.token);
    const normalized = normalizeUser(data.user, data.exchange);
    storeUser(normalized);

    return { ok: true, user: normalized, exchange: data.exchange, token: data.token };
  },

  /**
   * Change password via `legacy_change_password` RPC.
   */
  async changePassword(oldPassword, newPassword) {
    const token = getStoredToken();
    if (!token) return { ok: false, error: 'no_session' };

    const { data, error } = await supabase.rpc('legacy_change_password', {
      p_token: token,
      p_old_password: oldPassword,
      p_new_password: newPassword,
    });

    if (error) {
      return { ok: false, error: 'rpc_error', message: error.message };
    }
    if (!data || !data.success) {
      return { ok: false, error: data?.error || 'change_password_failed' };
    }
    return { ok: true };
  },

  /**
   * Logout: clear local session + sign out from Supabase Auth (if active).
   */
  async logout() {
    try {
      await supabase.auth.signOut();
    } catch { /* ignore */ }
    clearStoredAuth();
  },

  /**
   * Initiate Google OAuth login via Supabase Auth.
   * After redirect, the callback handler verifies the access token.
   */
  async loginWithGoogle(returnTo = '/dashboard') {
    const redirectTo = `${window.location.origin}/login?google_cb=1&return_to=${encodeURIComponent(returnTo)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  },

  /**
   * Handle Google OAuth callback after Supabase redirects back.
   * Verifies the access token via the Edge Function and stores the session.
   */
  async handleGoogleCallback() {
    const session = await waitForSession();
    if (!session) return null;

    const access_token = session.access_token;
    const { data: userData } = await supabase.auth.getUser();
    const googleEmail = userData?.user?.email;
    if (!googleEmail) return null;

    try {
      const cfg = getSupabaseConfig();
      const edgeRes = await fetch(`${cfg.url}/functions/v1/legacy-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'googleLogin', access_token }),
      });
      const res = await edgeRes.json().catch(() => ({}));

      if (res?.success && res?.user) {
        storeToken(access_token);
        const normalized = normalizeUser(res.user);
        const finalUser = applyCreatorRole(normalized);
        storeUser(finalUser);
        setAppTokenHeader(access_token);
        return { ok: true, user: finalUser };
      }
      return { ok: false, error: res?.error || 'google_login_failed' };
    } catch {
      return { ok: false, error: 'google_callback_error' };
    }
  },
};

// ── Helper: wait for Supabase to finish OAuth code exchange ──
async function waitForSession(maxAttempts = 10, intervalMs = 500) {
  for (let i = 0; i < maxAttempts; i++) {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) return data.session;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return null;
}

export default auth;