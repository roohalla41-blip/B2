import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { isCreatorUser } from '@/lib/creatorAuth';
import * as store from '@/lib/sandboxStore';

const SandboxContext = createContext(null);

export function SandboxProvider({ children }) {
  const { user } = useAuth();
  const isCreator = isCreatorUser(user);
  const [state, setState] = useState(() => store.getState());
  const [session, setSessionState] = useState(() => store.getSession());
  const [activeRole, setActiveRole] = useState(null);

  const refresh = useCallback(() => {
    setState(store.getState());
    setSessionState(store.getSession());
  }, []);

  const canAccess = !!isCreator;

  useEffect(() => { refresh(); }, [refresh]);

  const value = {
    canAccess,
    isCreator,
    state,
    session,
    activeRole,
    setActiveRole,
    refresh,
    actions: {
      reset: () => { store.resetSandbox(); refresh(); },
      updateSettings: (p) => { store.updateSettings(p); refresh(); },
      topUp: (data) => { store.topUpWallet(data); refresh(); },
      submitSellerRequest: (data) => { const r = store.submitSellerRequest(data); refresh(); return r; },
      reviewSellerRequest: (id, decision, name, opts) => { const r = store.reviewSellerRequest(id, decision, name, opts); refresh(); return r; },
      createOrder: (data) => { const r = store.createOrder(data); refresh(); return r; },
      acceptOrder: (id, seller) => { const r = store.acceptOrder(id, seller); refresh(); return r; },
      completeOrder: (id, seller, extra) => { const r = store.completeOrder(id, seller, extra); refresh(); return r; },
      reportProblem: (id, customer, msg) => { const r = store.reportProblem(id, customer, msg); refresh(); return r; },
      addDisputeMessage: (id, sender, msg) => { store.addDisputeMessage(id, sender, msg); refresh(); },
      resolveDispute: (id, res, reason, name) => { const r = store.resolveDispute(id, res, reason, name); refresh(); return r; },
      // حساب‌های آزمایشی
      createAccount: (data) => { const r = store.createAccount(data); refresh(); return r; },
      login: (username, password) => { const r = store.loginAccount(username, password); if (r.ok) setSessionState(r.session); return r; },
      logout: () => { store.logoutAccount(); setSessionState(null); setActiveRole(null); },
      deleteAccount: (id) => { const r = store.deleteAccount(id); refresh(); return r; },
      updateAccountBalance: (id, amount) => { const r = store.updateAccountBalance(id, amount); refresh(); return r; },
      submitTopupRequest: (data) => { const r = store.submitTopupRequest(data); refresh(); return r; },
      reviewTopupRequest: (id, decision, name, opts) => { const r = store.reviewTopupRequest(id, decision, name, opts); refresh(); return r; },
    },
  };

  return <SandboxContext.Provider value={value}>{children}</SandboxContext.Provider>;
}

export function useSandbox() {
  const ctx = useContext(SandboxContext);
  if (!ctx) throw new Error('useSandbox must be used within SandboxProvider');
  return ctx;
}