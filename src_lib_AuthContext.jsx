import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { isLocalTestMode } from '@/lib/localTestMode';
import { applyCreatorRole } from '@/lib/creatorAuth';
import { directGetMe } from '@/lib/directAuth';
import { setAppTokenHeader } from '@/lib/supabaseDirectAuth';
import { callSupabase } from '@/lib/supabaseApi';
import { clearAllCache, setCacheTenant } from '@/lib/offlineQueue';

// NOTE: base44.auth is a conditional dependency — it only works inside
// the Base44 platform. In standalone mode the import resolves but the
// calls throw, which is caught by the try/catch below and the app falls
// through to the HMAC token path. This keeps the app working in both
// environments without code changes.

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      // ── Base44 platform session (conditional — no-op in standalone) ──
      // Skipped when a custom HMAC token exists (e.g. after Google login
      // callback stores an HMAC token — we don't want the Base44 platform
      // session to override the Supabase user record).
      const hasCustomToken = typeof localStorage !== 'undefined' && !!localStorage.getItem('auth_token');
      if (!hasCustomToken) {
        try {
          const isBase44Authed = await base44.auth.isAuthenticated();
          if (isBase44Authed) {
            const me = await base44.auth.me();
            if (me) {
              const base44User = {
                id: String(me.id || ''),
                full_name: me.full_name || me.email || '',
                name: me.full_name || me.email || '',
                email: me.email || '',
                role: me.role === 'admin' ? 'creator' : 'sarraaf',
                account_type: me.role === 'admin' ? 'admin' : 'sarraaf',
                status: 'active',
              };
              const finalUser = applyCreatorRole(base44User);
              if (finalUser.role !== 'creator') {
                localStorage.setItem('auth_user', JSON.stringify(finalUser));
              }
              setCacheTenant(finalUser);
              setUser(finalUser);
              setIsAuthenticated(true);
              setIsLoadingAuth(false);
              setAuthChecked(true);
              return;
            }
          }
        } catch {
          // Base44 auth not available — fall through to custom auth (standalone mode)
        }
      }

      // ── Custom auth (HMAC token from supabase backend) ──
      if (typeof localStorage !== 'undefined') {
        const customToken = localStorage.getItem('auth_token');
        const customUser = localStorage.getItem('auth_user');

        // اگر توکن وجود دارد اما اطلاعات کاربر نه (مثلاً نشست سازنده)،
        // اطلاعات کاربر را از بک‌اند دریافت می‌کنیم — بدون ذخیره در localStorage.
        if (customToken && !customUser) {
          try {
            const me = await directGetMe(customToken);
            if (me) {
              const finalUser = applyCreatorRole(me);
              // If token was reissued with exchange_code, update it
              if (me._reissued_token) {
                localStorage.setItem('auth_token', me._reissued_token);
                delete finalUser._reissued_token;
              }
              // اطلاعات سازنده هرگز در localStorage ذخیره نمی‌شود
              if (finalUser.role !== 'creator') {
                localStorage.setItem('auth_user', JSON.stringify(finalUser));
              }
              setCacheTenant(finalUser);
              setUser(finalUser);
              setIsAuthenticated(true);
              setIsLoadingAuth(false);
              setAuthChecked(true);
              return;
            }
          } catch {
            // توکن ممکن است منقضی شده باشد — ادامه به ورود
          }
        }

        if (customToken && customUser) {
          try {
            // Ensure the x-app-token header is set on the Supabase client
            // so RLS policies can read it for data requests.
            setAppTokenHeader(customToken);
            const parsed = JSON.parse(customUser);
            const finalUser = applyCreatorRole(parsed);
            // اگر کاربر سازنده است، اطلاعات او را از localStorage پاک می‌کنیم
            if (finalUser.role === 'creator') {
              localStorage.removeItem('auth_user');
            } else if (finalUser.role !== parsed.role) {
              localStorage.setItem('auth_user', JSON.stringify(finalUser));
            }
            setCacheTenant(finalUser);
            setUser(finalUser);
            setIsAuthenticated(true);
            setIsLoadingAuth(false);
            setAuthChecked(true);
            return;
          } catch {
            // corrupt storage — fall through to login
          }
        }
      }

      // ── Local test mode: no API calls, show login page immediately ──
      if (isLocalTestMode()) {
        setIsLoadingAuth(false);
        setAuthChecked(true);
        setAuthError(null);
        return;
      }

      // ── No HMAC token: show login page ──
      setIsLoadingAuth(false);
      setAuthChecked(true);
      setAuthError(null);
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingAuth(false);
    }
  };

  const logout = async (shouldRedirect = true) => {
    // Record logout audit via secured backend
    try {
      const token = localStorage.getItem('auth_token');
      if (token && !token.startsWith('local_token_')) {
        await callSupabase('logout').catch(() => {});
      }
    } catch { /* ignore */ }

    // Clear local state
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        try { clearAllCache(); } catch { /* ignore cache errors */ }
      }
    } catch { /* ignore storage errors */ }

    try {
      setUser(null);
      setIsAuthenticated(false);
      setAuthChecked(true);
    } catch { /* ignore state errors */ }

    // Clear Base44 platform session — without this, the platform session
    // stays alive and the user gets re-authenticated on next page load.
    try {
      await base44.auth.logout();
    } catch { /* standalone mode — no platform session to clear */ }

    // Hard redirect LAST — guarantees navigation after state is cleared
    if (shouldRedirect) {
      window.location.replace('/login');
    }
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      authChecked,
      logout,
      navigateToLogin,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};