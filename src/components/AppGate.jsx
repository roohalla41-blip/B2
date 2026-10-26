import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import WelcomeSplash from '@/components/WelcomeSplash';
import PinLockGate from '@/components/PinLockGate';
import { seedBase44Entities } from '@/lib/seedBase44Entities';
import { useKeepAlive } from '@/lib/useKeepAlive';

export default function AppGate({ children }) {
  const { isLoadingAuth, isLoadingPublicSettings } = useAuth();
  const loading = isLoadingAuth || isLoadingPublicSettings;
  const [showSplash, setShowSplash] = useState(true);

  useKeepAlive();

  useEffect(() => {
    seedBase44Entities();
  }, []);

  useEffect(() => {
    if (!loading) {
      // give splash a moment to finish its counter if it hasn't
      const t = setTimeout(() => setShowSplash(false), 300);
      return () => clearTimeout(t);
    }
  }, [loading]);

  if (showSplash && loading) {
    return <WelcomeSplash onDone={() => setShowSplash(false)} />;
  }

  return <PinLockGate>{children}</PinLockGate>;
}