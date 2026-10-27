// auditLogger.js — لاگ امنیتی پیشرفته با اطلاعات دستگاه و نسخه برنامه
import { offlineDB as db } from './offlineQueue';

const LOCAL_LOG_KEY = 'audit_log_local';
const MAX_LOCAL_LOGS = 200;

function getLocalLog() {
  try { return JSON.parse(localStorage.getItem(LOCAL_LOG_KEY) || '[]'); } catch { return []; }
}
function setLocalLog(log) {
  try {
    if (log.length > MAX_LOCAL_LOGS) log = log.slice(0, MAX_LOCAL_LOGS);
    localStorage.setItem(LOCAL_LOG_KEY, JSON.stringify(log));
  } catch { /* ignore */ }
}

function getDeviceInfo() {
  if (typeof navigator === 'undefined') return { device: 'unknown', platform: 'unknown' };
  const ua = navigator.userAgent;
  let device = 'Desktop';
  let platform = 'Web';
  if (/Android/i.test(ua)) { device = 'Android'; platform = 'Mobile'; }
  else if (/iPhone|iPad|iPod/i.test(ua)) { device = 'iOS'; platform = 'Mobile'; }
  return { device: `${platform}/${device}`, platform: ua };
}

function genId() {
  return `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Log an audit event
export async function logAudit({ userId, userName, userRole, action, entityType, entityId, description, status, appVersion }) {
  const { device, platform } = getDeviceInfo();
  const entry = {
    id: genId(),
    user_id: userId || '',
    user_name: userName || '',
    user_role: userRole || '',
    action: action || 'unknown',
    entity_type: entityType || '',
    entity_id: entityId || '',
    description: description || '',
    status: status || 'success',
    ip_address: '', // Can't get real IP client-side
    device,
    app_version: appVersion || '1.0.0',
    created_date: new Date().toISOString(),
  };

  // Save to local log
  const log = getLocalLog();
  log.unshift(entry);
  setLocalLog(log);

  // Also try to save to offlineDB if AuditLog entity exists
  try {
    await db.AuditLog.create(entry);
  } catch {
    // Fallback to local only
  }

  return entry;
}

// Get audit logs (local + offlineDB)
export async function getAuditLogs(filters = {}) {
  let logs = [];
  // Get from offlineDB first
  try {
    const dbLogs = await db.AuditLog.list('-created_date', 200);
    logs = dbLogs || [];
  } catch {
    // Fallback to local
    logs = getLocalLog();
  }

  // Apply filters
  if (filters.userId) logs = logs.filter(l => l.user_id === filters.userId);
  if (filters.action) logs = logs.filter(l => l.action === filters.action);
  if (filters.entityType) logs = logs.filter(l => l.entity_type === filters.entityType);
  if (filters.status) logs = logs.filter(l => l.status === filters.status);

  return logs;
}

// Get local-only audit logs (for offline)
export function getLocalAuditLogs(limit = 50) {
  return getLocalLog().slice(0, limit);
}

// Clear old local logs
export function clearOldLocalLogs(daysToKeep = 30) {
  const log = getLocalLog();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysToKeep);
  const filtered = log.filter(l => new Date(l.created_date) > cutoff);
  setLocalLog(filtered);
  return log.length - filtered.length;
}

// Predefined audit actions
export const AUDIT_ACTIONS = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  LOGIN_FAILED: 'login_failed',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  SOFT_DELETE: 'soft_delete',
  RESTORE: 'restore',
  EXPORT: 'export',
  PRINT: 'print',
  SETTINGS_CHANGE: 'settings_change',
  PERMISSION_CHANGE: 'permission_change',
  PLAN_ACTIVATION: 'plan_activation',
  PLAN_EXPIRY: 'plan_expiry',
  PASSWORD_CHANGE: 'password_change',
  OTP_REQUEST: 'otp_request',
  OTP_VERIFY: 'otp_verify',
  OTP_FAILED: 'otp_failed',
  BACKUP_CREATE: 'backup_create',
  BACKUP_RESTORE: 'backup_restore',
};