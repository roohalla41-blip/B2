// versionManager.js — مدیریت نسخه برنامه و آپدیت‌ها
import { createSupabaseEntity } from './supabaseApi';

const sbAppSettings = createSupabaseEntity('AppSetting');
const sbNotifications = createSupabaseEntity('UserNotification');

export const APP_VERSION = '1.0.1';
export const VERSION_CHECK_INTERVAL = 3600000; // 1 hour

const LOCAL_KEY = 'app_version_ack';
const SETTING_KEY = 'app_version_info';

// Get current published version info from AppSetting
export async function getCurrentVersionInfo() {
  try {
    const list = await sbAppSettings.filter({ key: SETTING_KEY });
    if (!list || list.length === 0) {
      return {
        version: APP_VERSION,
        release_notes: 'نسخه اولیه',
        download_url: '',
        is_mandatory: false,
        is_active: true,
        release_date: new Date().toISOString(),
      };
    }
    const rec = list[0];
    let data = null;
    try { data = rec.value ? JSON.parse(rec.value) : null; } catch { data = null; }
    return data || {
      version: APP_VERSION,
      release_notes: '',
      download_url: '',
      is_mandatory: false,
      is_active: true,
      release_date: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[versionManager] getCurrentVersionInfo() failed:', err.message);
    return {
      version: APP_VERSION,
      release_notes: '',
      download_url: '',
      is_mandatory: false,
      is_active: true,
      release_date: new Date().toISOString(),
    };
  }
}

// Publish a new version (admin only)
export async function publishVersion({ version, releaseNotes, downloadUrl, isMandatory }) {
  const jsonValue = JSON.stringify({
    version,
    release_notes: releaseNotes || '',
    download_url: downloadUrl || '',
    is_mandatory: isMandatory || false,
    is_active: true,
    release_date: new Date().toISOString(),
  });
  const existing = await sbAppSettings.filter({ key: SETTING_KEY });
  if (existing && existing.length > 0) {
    await sbAppSettings.update(existing[0].id, { value: jsonValue });
    // Send notification to all users about new version (non-blocking)
    try {
      await sbNotifications.create({
        target_role: 'all',
        target_user_id: '',
        target_user_name: '',
        title: 'نسخه جدید منتشر شد',
        message: `نسخه ${version} آماده دانلود است.${isMandatory ? ' این آپدیت الزامی است.' : ''}`,
        kind: 'app_update',
        action_url: downloadUrl || '',
        action_label: 'دانلود آپدیت',
        read: false,
        sent_by_name: 'سیستم',
      });
    } catch (notifErr) {
      console.warn('[versionManager] notification not sent:', notifErr?.message);
    }
    return existing[0].id;
  }
  const created = await sbAppSettings.create({ key: SETTING_KEY, value: jsonValue });
  return created?.id;
}

// Check if user needs to see update notification
export async function checkForUpdates() {
  const info = await getCurrentVersionInfo();
  const acknowledged = getAcknowledgedVersion();

  if (info.version === APP_VERSION) {
    return { needsUpdate: false, info };
  }

  if (info.version === acknowledged) {
    return { needsUpdate: false, info };
  }

  return {
    needsUpdate: true,
    isMandatory: info.is_mandatory,
    info,
  };
}

// Acknowledge that user has seen the update notification
export function acknowledgeVersion(version) {
  try {
    localStorage.setItem(LOCAL_KEY, version);
  } catch {
    // ignore
  }
}

export function getAcknowledgedVersion() {
  try {
    return localStorage.getItem(LOCAL_KEY) || '';
  } catch {
    return '';
  }
}

// Get version history (all published versions)
export async function getVersionHistory() {
  try {
    const list = await sbAppSettings.filter({ key: SETTING_KEY });
    if (!list || list.length === 0) return [];
    const rec = list[0];
    let data = null;
    try { data = rec.value ? JSON.parse(rec.value) : null; } catch { data = null; }
    return [{
      version: data?.version || '',
      release_notes: data?.release_notes || '',
      release_date: data?.release_date || rec.created_date,
      is_mandatory: data?.is_mandatory || false,
    }];
  } catch {
    return [];
  }
}

// Check if current version is outdated
export function isOutdated(currentVersion, latestVersion) {
  if (!currentVersion || !latestVersion) return false;
  const parseVer = (v) => v.split('.').map(n => parseInt(n) || 0);
  const [c1, c2, c3] = parseVer(currentVersion);
  const [l1, l2, l3] = parseVer(latestVersion);
  if (l1 > c1) return true;
  if (l1 === c1 && l2 > c2) return true;
  if (l1 === c1 && l2 === c2 && l3 > c3) return true;
  return false;
}