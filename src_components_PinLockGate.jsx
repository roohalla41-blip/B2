import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import AppLock from '@/components/AppLock';
import { shouldShowLock, markAppHidden, markUnlocked } from '@/lib/pinLock';

// Idle activity tracking — resets the "last unlock" timer on user interaction
// so the lock only triggers after IDLE_TIMEOUT_MS of true inactivity.
const ACTIVITY_EVENTS = ['mousedown', 'touchstart', 'keydown', 'scroll'];

export default function PinLockGate({ children }) {
  const { isAuthenticated } = useAuth();
  const [locked, setLocked] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const activityTimer = useRef(null);

  // ── On mount: check if lock should show ──
  useEffect(() => {
    if (isAuthenticated && shouldShowLock()) {
      setLocked(true);
    } else if (isAuthenticated) {
      markUnlocked();
    }
    setInitialized(true);
  }, [isAuthenticated]);

  // ── Visibility change: lock when app goes to background ──
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        markAppHidden();
      } else if (document.visibilityState === 'visible') {
        if (shouldShowLock()) {
          setLocked(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated]);

  // ── Idle timeout: track user activity ──
  useEffect(() => {
    if (!isAuthenticated || locked) return;

    const resetIdle = () => {
      if (activityTimer.current) clearTimeout(activityTimer.current);
      // Only mark activity if not locked — avoids resetting timer during lock
      activityTimer.current = setTimeout(() => {
        if (shouldShowLock()) {
          setLocked(true);
        }
      }, 5 * 60 * 1000); // 5 minutes idle
    };

    ACTIVITY_EVENTS.forEach((evt) =>
      document.addEventListener(evt, resetIdle, { passive: true })
    );
    resetIdle();

    return () => {
      ACTIVITY_EVENTS.forEach((evt) =>
        document.removeEventListener(evt, resetIdle)
      );
      if (activityTimer.current) clearTimeout(activityTimer.current);
    };
  }, [isAuthenticated, locked]);

  const handleUnlock = () => {
    markUnlocked();
    setLocked(false);
  };

  const handleForgotPin = () => {
    // Clear session and redirect to login — user must re-authenticate with account password
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    } catch { /* ignore */ }
    window.location.href = '/login';
  };

  // Show lock screen
  if (initialized && locked && isAuthenticated) {
    return <AppLock onUnlock={handleUnlock} onForgotPin={handleForgotPin} />;
  }

  return children;
}