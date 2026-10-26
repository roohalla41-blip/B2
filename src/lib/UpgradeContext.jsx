// UpgradeContext.jsx — global upgrade modal accessible from anywhere
import React, { createContext, useContext, useState, useCallback } from 'react';
import UpgradeModal from '@/components/sarraaf/UpgradeModal';
import { useSarraafProfile } from '@/lib/useSarraaf';
import { useAuth } from '@/lib/AuthContext';
import { usePaidSystemEnabled } from '@/lib/usePaidSystem';

const UpgradeContext = createContext(null);

export function UpgradeProvider({ children }) {
  const { user } = useAuth();
  const { data: profile } = useSarraafProfile(user?.id);
  const { data: paidSystemEnabled } = usePaidSystemEnabled();
  const [open, setOpen] = useState(false);
  const [featureHint, setFeatureHint] = useState(null);

  const openUpgrade = useCallback((hint = null) => {
    // If paid system is disabled, everyone has full access — no upgrade needed
    if (paidSystemEnabled === false) return;
    setFeatureHint(hint);
    setOpen(true);
  }, [paidSystemEnabled]);

  const closeUpgrade = useCallback(() => {
    setOpen(false);
    setFeatureHint(null);
  }, []);

  return (
    <UpgradeContext.Provider value={{ openUpgrade, closeUpgrade }}>
      {children}
      {open && profile && paidSystemEnabled !== false && (
        <UpgradeModal
          open={open}
          onClose={closeUpgrade}
          profile={profile}
          featureHint={featureHint}
        />
      )}
    </UpgradeContext.Provider>
  );
}

export function useUpgrade() {
  const ctx = useContext(UpgradeContext);
  if (!ctx) return { openUpgrade: () => {}, closeUpgrade: () => {} };
  return ctx;
}