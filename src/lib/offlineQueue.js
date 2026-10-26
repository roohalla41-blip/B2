// offlineQueue.js — Offline-First data layer wrapping supabaseApi (createSupabaseEntity)
//
// معماری:
// - تمام عملیات نوشتن ابتدا در localStorage ذخیره می‌شوند.
// - اگر آنلاین باشیم، بلافاصله به سرور ارسال می‌شوند.
// - اگر آفلاین باشیم یا خطا بدهند، در صف همگام‌سازی (pending writes) می‌مانند.
// - هنگام اتصال مجدد، صف به‌صورت خودکار پردازش می‌شود.
// - هر عملیات یک client_operation_id دارد تا از ثبت تکراری جلوگیری شود.

import { createSupabaseEntity } from './supabaseApi';
import { isLocalTestMode } from './localTestMode';
import { setPendingCount, setSyncing } from './syncStatus';
import { isOfflineQueueFull } from './offlineLimits';
import { isCreatorUser } from './creatorAuth';

const QUEUE_KEY = 'pending_writes_v2';
const CACHE_PREFIX = 'cache_v2_';
const CACHE_TENANT_KEY = 'cache_tenant_sig';

// ── Local-only mode check (local test mode OR locally-registered user) ──
//   Determines whether to use local cache only (no server calls).
//   Note: An auth_token (HMAC from Supabase backend) does NOT trigger local-only mode.
//   The token is sent with each request so the backend can authenticate the user.
function isLocalOnlyMode() {
  try {
    // Local test mode: always use local cache, never call server
    if (isLocalTestMode()) return true;
    // Only locally-registered or cached-credential users use local cache exclusively
    const raw = localStorage.getItem('auth_user');
    if (raw) {
      const u = JSON.parse(raw);
      // Creator always uses server mode — never local-only
      if (isCreatorUser(u)) return false;
      // isLocal = locally registered user; isOffline = cached-credential login
      if (u?.isLocal || u?.isOffline) return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ── UUID ──
function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ── Cache helpers (tenant-scoped by exchange_code or user_id) ──
// Shared entities use a global cache (not tenant-scoped) so all users see the same data.
const SHARED_ENTITIES = new Set(['ChatGroup', 'GroupMember', 'GroupMessage', 'MessageReport']);

// ── Tenant signature — validates that cache belongs to the current user ──
// Prevents cross-tenant data leakage when exchange_code is manually changed in localStorage.
function computeTenantSignature(userId, exchangeCode) {
  const data = `${userId || ''}::${exchangeCode || ''}`;
  let hash = 5381;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) + hash) + data.charCodeAt(i);
  }
  return `tsig_${Math.abs(hash).toString(36)}`;
}

// Called on login — stores the authenticated user's tenant signature
export function setCacheTenant(user) {
  try {
    const sig = computeTenantSignature(user?.id, user?.exchange_code);
    localStorage.setItem(CACHE_TENANT_KEY, sig);
  } catch {
    // ignore
  }
}

// Validates that the current authenticated user matches the cache's tenant.
// If mismatch (e.g. exchange_code was manually changed), clears all cache data.
function validateCacheTenant() {
  try {
    const raw = localStorage.getItem('auth_user') || localStorage.getItem('sdk_user_cache');
    if (!raw) return false;
    const user = JSON.parse(raw);
    const currentSig = computeTenantSignature(user?.id, user?.exchange_code);
    const storedSig = localStorage.getItem(CACHE_TENANT_KEY);
    if (currentSig === storedSig) return true;

    // Mismatch — clear all cache data (but not the tenant sig itself)
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(CACHE_PREFIX) || key === QUEUE_KEY)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    // Set new sig so future calls don't re-trigger
    localStorage.setItem(CACHE_TENANT_KEY, currentSig);
    notifyListeners();
    return false;
  } catch {
    return false;
  }
}

function getTenantKey() {
  try {
    // Validate that cache belongs to the current authenticated user.
    // If mismatch (e.g. exchange_code manually changed), cache is cleared.
    if (!validateCacheTenant()) return '';
    const raw = localStorage.getItem('auth_user') || localStorage.getItem('sdk_user_cache');
    if (!raw) return '';
    const user = JSON.parse(raw);
    return user?.exchange_code || user?.id || '';
  } catch {
    return '';
  }
}

function cacheKey(entity) {
  if (SHARED_ENTITIES.has(entity)) {
    return `${CACHE_PREFIX}${entity}_shared`;
  }
  const t = getTenantKey();
  return t ? `${CACHE_PREFIX}${entity}_${t}` : `${CACHE_PREFIX}${entity}`;
}

function cacheGet(entity) {
  try {
    const raw = localStorage.getItem(cacheKey(entity));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function cacheSet(entity, items) {
  try {
    localStorage.setItem(cacheKey(entity), JSON.stringify(items));
  } catch {
    // storage full
  }
}

function cacheUpsert(entity, item) {
  const items = cacheGet(entity);
  const idx = items.findIndex((x) => String(x.id) === String(item.id));
  if (idx !== -1) items[idx] = { ...items[idx], ...item };
  else items.unshift(item);
  cacheSet(entity, items);
}

function cacheRemove(entity, id) {
  cacheSet(entity, cacheGet(entity).filter((x) => String(x.id) !== String(id)));
}

function cacheReplaceTempId(entity, tempId, realItem) {
  const items = cacheGet(entity);
  const idx = items.findIndex((x) => String(x.id) === String(tempId));
  if (idx !== -1) {
    items[idx] = realItem;
    cacheSet(entity, items);
  } else {
    cacheUpsert(entity, realItem);
  }
}

// ── Queue helpers ──
function queueGet() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function queueSet(q) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {
    // ignore
  }
}

export function getPendingCount() {
  return queueGet().length;
}

function queueAdd(item) {
  const q = queueGet();
  q.push({ ...item, attempts: 0, added_at: new Date().toISOString(), client_operation_id: uuid() });
  queueSet(q);
  notifyListeners();
}

// ── Sync status listeners ──
const _listeners = new Set();
let _isSyncing = false;

export function onSyncStatusChange(cb) {
  _listeners.add(cb);
  cb({ syncing: _isSyncing, pending: getPendingCount() });
  return () => _listeners.delete(cb);
}

export function isSyncing() {
  return _isSyncing;
}

function notifyListeners() {
  const pending = getPendingCount();
  _listeners.forEach((cb) => cb({ syncing: _isSyncing, pending }));
  setPendingCount(pending);
  setSyncing(_isSyncing);
}

// ── Local sort/filter/limit ──
function applyLocalSort(items, sort) {
  if (!sort) return items;
  const desc = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort;
  const sorted = [...items].sort((a, b) => {
    const av = a[field]; const bv = b[field];
    if (av === undefined || av === null) return 1;
    if (bv === undefined || bv === null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') return av - bv;
    return String(av).localeCompare(String(bv));
  });
  return desc ? sorted.reverse() : sorted;
}

function applyLocalLimit(items, limit) {
  if (!limit) return items;
  return items.slice(0, Number(limit));
}

// ── Entity factory (wraps Supabase Edge Function with offline-first) ──
export function createOfflineEntity(entityName) {
  const sdkEntity = createSupabaseEntity(entityName);

  return {
    async list(sort, limit) {
      return this.filter({}, sort, limit);
    },

    async filter(filters, sort, limit) {
      // Local-only mode: always use local cache only
      if (isLocalOnlyMode()) {
        let local = cacheGet(entityName);
        if (filters && typeof filters === 'object') {
          local = local.filter((item) => {
            for (const [key, value] of Object.entries(filters)) {
              if (value !== undefined && value !== null && value !== '') {
                if (String(item[key]) !== String(value)) return false;
              }
            }
            return true;
          });
        }
        local = applyLocalSort(local, sort);
        return applyLocalLimit(local, limit);
      }

      // Online: try SDK first
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          const result = await sdkEntity.filter(filters || {}, sort, limit);
          if (result && Array.isArray(result)) {
            cacheSet(entityName, result);
          }
          return result || [];
        } catch (e) {
          // Fall back to local cache
        }
      }
      // Offline: return from local cache
      let local = cacheGet(entityName);
      if (filters && typeof filters === 'object') {
        local = local.filter((item) => {
          for (const [key, value] of Object.entries(filters)) {
            if (value !== undefined && value !== null && value !== '') {
              if (String(item[key]) !== String(value)) return false;
            }
          }
          return true;
        });
      }
      local = applyLocalSort(local, sort);
      return applyLocalLimit(local, limit);
    },

    async create(data) {
      // Always save to local cache first
      const tempId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const item = {
        ...data,
        id: tempId,
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
      };
      cacheUpsert(entityName, item);

      // Local-only mode: local only, no server calls
      if (isLocalOnlyMode()) {
        return item;
      }

      // Try online
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          const result = await sdkEntity.create(data);
          if (result) {
            cacheReplaceTempId(entityName, tempId, result);
            return result;
          }
        } catch (e) {
          // Queue for later sync — check limit first
          if (isOfflineQueueFull()) {
            cacheRemove(entityName, tempId);
            throw new Error('OFFLINE_QUEUE_LIMIT_REACHED');
          }
          queueAdd({ entity: entityName, operation: 'create', data, tempId });
          return item;
        }
      } else {
        // Offline: queue — check limit first
        if (isOfflineQueueFull()) {
          cacheRemove(entityName, tempId);
          throw new Error('OFFLINE_QUEUE_LIMIT_REACHED');
        }
        queueAdd({ entity: entityName, operation: 'create', data, tempId });
      }
      return item;
    },

    async bulkCreate(records) {
      if (!records || records.length === 0) return [];
      // Always save to local cache first
      const items = records.map((data) => {
        const tempId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        return {
          ...data,
          id: tempId,
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
        };
      });
      items.forEach((item) => cacheUpsert(entityName, item));

      // Local-only mode: local only, no server calls
      if (isLocalOnlyMode()) {
        return items;
      }

      // Try online
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          const result = await sdkEntity.bulkCreate(records);
          if (result && Array.isArray(result)) {
            items.forEach((item, i) => {
              if (result[i]) {
                cacheReplaceTempId(entityName, item.id, result[i]);
              }
            });
            return result;
          }
          return items;
        } catch (e) {
          // Queue for later sync — check limit first
          if (isOfflineQueueFull()) {
            items.forEach((it) => cacheRemove(entityName, it.id));
            throw new Error('OFFLINE_QUEUE_LIMIT_REACHED');
          }
          queueAdd({
            entity: entityName,
            operation: 'bulkCreate',
            data: records,
            tempIds: items.map((i) => i.id),
          });
          return items;
        }
      } else {
        // Offline: queue — check limit first
        if (isOfflineQueueFull()) {
          items.forEach((it) => cacheRemove(entityName, it.id));
          throw new Error('OFFLINE_QUEUE_LIMIT_REACHED');
        }
        queueAdd({
          entity: entityName,
          operation: 'bulkCreate',
          data: records,
          tempIds: items.map((i) => i.id),
        });
      }
      return items;
    },

    async update(id, updates) {
      // Update local cache first
      const items = cacheGet(entityName);
      const idx = items.findIndex((x) => String(x.id) === String(id));
      if (idx !== -1) {
        items[idx] = { ...items[idx], ...updates, updated_date: new Date().toISOString() };
        cacheSet(entityName, items);
      }

      // Local-only mode: local only, no server calls
      if (isLocalOnlyMode()) {
        return items[idx] || null;
      }

      // Try online
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          const result = await sdkEntity.update(id, updates);
          if (result) cacheUpsert(entityName, result);
          return result;
        } catch (e) {
          // Queue for later sync
          queueAdd({ entity: entityName, operation: 'update', id, data: updates });
          return items[idx] || null;
        }
      } else {
        queueAdd({ entity: entityName, operation: 'update', id, data: updates });
        return items[idx] || null;
      }
    },

    async delete(id) {
      // Remove from local cache
      cacheRemove(entityName, id);

      // Local-only mode: local only, no server calls
      if (isLocalOnlyMode()) {
        return;
      }

      // Try online
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          await sdkEntity.delete(id);
          return;
        } catch (e) {
          // Queue for later sync
          queueAdd({ entity: entityName, operation: 'delete', id });
        }
      } else {
        queueAdd({ entity: entityName, operation: 'delete', id });
      }
    },

    async get(id) {
      if (!id) return null;
      // Try local cache first
      const items = cacheGet(entityName);
      const found = items.find(x => String(x.id) === String(id));
      if (found) return found;

      // Local-only mode: only local cache
      if (isLocalOnlyMode()) return found || null;

      // Try online
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          const result = await sdkEntity.get(id);
          if (result) {
            cacheUpsert(entityName, result);
            return result;
          }
        } catch {
          // fall through
        }
      }
      return found || null;
    },
  };
}

// ── Sync engine — process pending writes when back online ──
const MAX_RETRY = 5;

export async function syncPendingWrites() {
  if (_isSyncing) return;
  if (isLocalOnlyMode()) return;
  const queue = queueGet();
  if (queue.length === 0) return;

  _isSyncing = true;
  notifyListeners();

  const failed = [];

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    const sdkEntity = createSupabaseEntity(item.entity);
    if (!sdkEntity) { continue; }

    try {
      if (item.operation === 'create') {
        // Include client_operation_id in data for idempotency (used by Supabase backend)
        const dataWithId = { ...item.data, client_operation_id: item.client_operation_id };
        const result = await sdkEntity.create(dataWithId);
        if (result) cacheReplaceTempId(item.entity, item.tempId, result);
      } else if (item.operation === 'bulkCreate') {
        // Include client_operation_id in each record for idempotency
        const dataWithId = item.data.map(r => ({ ...r, client_operation_id: item.client_operation_id }));
        const result = await sdkEntity.bulkCreate(dataWithId);
        if (result && Array.isArray(result)) {
          (item.tempIds || []).forEach((tid, j) => {
            if (result[j]) cacheReplaceTempId(item.entity, tid, result[j]);
          });
        }
      } else if (item.operation === 'update') {
        await sdkEntity.update(item.id, item.data);
      } else if (item.operation === 'delete') {
        await sdkEntity.delete(item.id);
      }
      // Success — don't add to failed
    } catch (e) {
      const attempts = (item.attempts || 0) + 1;
      if (attempts < MAX_RETRY) {
        failed.push({ ...item, attempts });
      }
    }
  }

  queueSet(failed);
  _isSyncing = false;
  notifyListeners();

  // Notify via toast if items were synced
  if (queue.length > 0 && failed.length < queue.length) {
    try {
      const { toast } = await import('@/components/ui/use-toast');
      toast({
        title: 'همگام‌سازی شد',
        description: `${queue.length - failed.length} عملیات با موفقیت همگام شد.`,
      });
    } catch {
      // toast not available
    }
  }
}

// ── Auto-sync on reconnect + periodic check ──
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    setTimeout(() => {
      if (getPendingCount() > 0) {
        syncPendingWrites();
      }
    }, 1000);
  });

  // Periodic check every 30s
  setInterval(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine && getPendingCount() > 0) {
      syncPendingWrites();
    }
  }, 30000);
}

// ── Clear all cached data (called on logout to prevent data leakage between accounts) ──
export function clearAllCache() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(CACHE_PREFIX) || key === QUEUE_KEY || key === CACHE_TENANT_KEY)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    notifyListeners();
  } catch {
    // ignore
  }
}

// ── Entity instances ──
export const offlineDB = {
  // Sarraaf panel
  Transaction: createOfflineEntity('Transaction'),
  Transfer: createOfflineEntity('Transfer'),
  Customer: createOfflineEntity('Customer'),
  Agent: createOfflineEntity('Agent'),
  Currency: createOfflineEntity('Currency'),
  BankAccount: createOfflineEntity('BankAccount'),
  RateSetting: createOfflineEntity('RateSetting'),
  FeatureSetting: createOfflineEntity('FeatureSetting'),
  SarraafProfile: createOfflineEntity('SarraafProfile'),
  AgencyLink: createOfflineEntity('AgencyLink'),
  AuditLog: createOfflineEntity('AuditLog'),
  ChatGroup: createOfflineEntity('ChatGroup'),
  GroupMember: createOfflineEntity('GroupMember'),
  GroupMessage: createOfflineEntity('GroupMessage'),
  MessageReport: createOfflineEntity('MessageReport'),
  UserNotification: createOfflineEntity('UserNotification'),
  UserPermission: createOfflineEntity('UserPermission'),
  PlanQuota: createOfflineEntity('PlanQuota'),
  PaymentRecord: createOfflineEntity('PaymentRecord'),
  // Wallet & financial
  Wallet: createOfflineEntity('Wallet'),
  WalletTransaction: createOfflineEntity('WalletTransaction'),
  WalletTopupRequest: createOfflineEntity('WalletTopupRequest'),
  WalletWithdrawalRequest: createOfflineEntity('WalletWithdrawalRequest'),
  WalletBan: createOfflineEntity('WalletBan'),
  LedgerEntry: createOfflineEntity('LedgerEntry'),
  // Online products & orders
  OnlineOrder: createOfflineEntity('OnlineOrder'),
  OnlineProduct: createOfflineEntity('OnlineProduct'),
  Seller: createOfflineEntity('Seller'),
  Package: createOfflineEntity('Package'),
  // Customer-facing
  CustomerNotification: createOfflineEntity('CustomerNotification'),
  CustomerTransferRequest: createOfflineEntity('CustomerTransferRequest'),
  CustomerLink: createOfflineEntity('CustomerLink'),
  Announcement: createOfflineEntity('Announcement'),
  QuotaChangeLog: createOfflineEntity('QuotaChangeLog'),
  PricingPlan: createOfflineEntity('PricingPlan'),
  AppSetting: createOfflineEntity('AppSetting'),
  TextLabel: createOfflineEntity('TextLabel'),
  BackupRecord: createOfflineEntity('BackupRecord'),
  // Referral system
  Referral: createOfflineEntity('Referral'),
  // Payment gateway
  BankGateway: createOfflineEntity('BankGateway'),
  PaymentTransaction: createOfflineEntity('PaymentTransaction'),
  // Support system
  SupportTicket: createOfflineEntity('SupportTicket'),
  SupportMessage: createOfflineEntity('SupportMessage'),
  ErrorReport: createOfflineEntity('ErrorReport'),
  UserFeedback: createOfflineEntity('UserFeedback'),
};