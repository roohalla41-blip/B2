// base44Client.js — Compatibility stub (no Base44 SDK)
//
// This file previously imported @base44/sdk. It now exports a no-op
// proxy that safely ignores all calls. The app uses portableAuth.js
// and supabaseClient.js directly.
//
// This stub exists ONLY for backward compatibility with AuthContext.jsx
// and will be removed once AuthContext is fully migrated.

const noopAsync = async () => false;
const noopAuth = {
  isAuthenticated: noopAsync,
  me: noopAsync,
  logout: noopAsync,
  loginViaEmailPassword: noopAsync,
  loginWithProvider: noopAsync,
  register: noopAsync,
  redirectToLogin: noopAsync,
};

export const base44 = {
  auth: noopAuth,
  entities: new Proxy({}, { get: () => () => Promise.resolve([]) }),
  functions: { invoke: noopAsync },
  analytics: { track: noopAsync },
  integrations: { Core: {} },
  users: { inviteUser: noopAsync },
  asServiceRole: { connectors: { getConnection: noopAsync } },
};

export default base44;