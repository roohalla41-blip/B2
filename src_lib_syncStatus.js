// syncStatus.js — online/offline + pending writes store
// Integrates with offlineQueue.js for real pending count

const listeners = new Set();
let state = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  pendingCount: 0,
  syncing: false,
  lastSync: null,
};

function emit() {
  for (const fn of listeners) fn(state);
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    state = { ...state, isOnline: true };
    emit();
  });

  window.addEventListener('offline', () => {
    state = { ...state, isOnline: false };
    emit();
  });

  // Load pending count from localStorage on startup
  try {
    const q = JSON.parse(localStorage.getItem('pending_writes_v2') || '[]');
    state.pendingCount = q.length;
  } catch {
    // ignore
  }
}

export function subscribe(fn) {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
}

export function getState() {
  return state;
}

export function setPendingCount(count) {
  state = { ...state, pendingCount: count };
  emit();
}

export function setSyncing(syncing) {
  state = { ...state, syncing };
  if (!syncing) {
    state = { ...state, lastSync: new Date().toISOString() };
  }
  emit();
}

export function trackOp() {
  // Called when a mutation starts — no-op, just for compatibility
}

export function finishOp() {
  // Called when a mutation finishes — refresh pending count from queue
  try {
    const q = JSON.parse(localStorage.getItem('pending_writes_v2') || '[]');
    state = { ...state, pendingCount: q.length };
    emit();
  } catch {
    // ignore
  }
}

export function markSynced() {
  state = { ...state, pendingCount: 0, lastSync: new Date().toISOString() };
  emit();
}