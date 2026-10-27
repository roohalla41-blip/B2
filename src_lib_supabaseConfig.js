// supabaseConfig.js — Centralized Supabase configuration
//
// This module provides a single source of truth for Supabase URL and anon key.
// It reads from window.__SUPABASE_CONFIG__ (injected by /public/runtime-config.js)
// with fallback to import.meta.env (for production builds that inject VITE_ vars).
//
// The anon key is PUBLIC by design — security comes from RLS, not key secrecy.

function readWindowConfig() {
  if (typeof window !== 'undefined' && window.__SUPABASE_CONFIG__) {
    return { url: window.__SUPABASE_CONFIG__.url, key: window.__SUPABASE_CONFIG__.key };
  }
  return { url: null, key: null };
}

function readEnvConfig() {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_KEY;
    if (url && key) return { url, key };
  } catch { /* not in Vite context */ }
  return { url: null, key: null };
}

function normalizeUrl(url) {
  if (!url) return '';
  return String(url).replace(/\/+$/, '').replace(/\/rest\/v1\/?$/i, '');
}

export function getSupabaseConfig() {
  // Try window config first (runtime-injected), then env vars (build-time)
  let { url, key } = readWindowConfig();
  if (!url || !key) {
    const env = readEnvConfig();
    url = url || env.url;
    key = key || env.key;
  }
  if (!url || !key) {
    throw new Error('Supabase config not available. Ensure /public/runtime-config.js is loaded.');
  }
  return { url: normalizeUrl(url), key };
}