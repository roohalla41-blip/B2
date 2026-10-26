import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'sarraaf_layout_version';
const CURRENT_VERSION = 'v1';
const NEW_VERSION = 'v2';

const LayoutVersionContext = createContext(null);

export function LayoutVersionProvider({ children }) {
  const [version, setVersion] = useState(CURRENT_VERSION);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === NEW_VERSION) setVersion(NEW_VERSION);
    } catch {}
  }, []);

  const switchTo = useCallback((v) => {
    setVersion(v);
    try { localStorage.setItem(STORAGE_KEY, v); } catch {}
  }, []);

  const value = {
    version,
    isV2: version === NEW_VERSION,
    switchToV1: () => switchTo(CURRENT_VERSION),
    switchToV2: () => switchTo(NEW_VERSION),
  };

  return (
    <LayoutVersionContext.Provider value={value}>
      {children}
    </LayoutVersionContext.Provider>
  );
}

export function useLayoutVersion() {
  const ctx = useContext(LayoutVersionContext);
  if (!ctx) return { version: CURRENT_VERSION, isV2: false, switchToV1: () => {}, switchToV2: () => {} };
  return ctx;
}