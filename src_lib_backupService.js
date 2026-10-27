// backupService.js — Manual & automatic backup + restore logic
import { offlineDB as db } from './offlineQueue';

// Entities included in every backup
const BACKUP_ENTITIES = [
  'Customer',
  'Transfer',
  'Transaction',
  'BankAccount',
  'Currency',
  'Agent',
  'RateSetting',
  'AgencyLink',
];

const BACKUP_ADDON_KEY = 'backup_addon';
const FREE_MONTHLY_LIMIT = 3;

// ── Check if user has purchased the paid backup add-on ──
export async function hasBackupAddon(userId) {
  if (!userId) return false;
  try {
    const records = await db.AppSetting.filter({ key: BACKUP_ADDON_KEY });
    if (!records || records.length === 0) return false;
    const rec = records[0];
    const data = rec.data || {};
    if (!data.active) return false;
    if (data.user_id !== userId) return false;
    if (data.end_date) {
      const end = new Date(data.end_date);
      if (end < new Date()) return false;
    }
    return true;
  } catch {
    return false;
  }
}

// ── Activate backup add-on ──
export async function activateBackupAddon({ userId, userName, durationMonths = 12 }) {
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + durationMonths * 30 * 24 * 3600 * 1000);
  const payload = {
    key: BACKUP_ADDON_KEY,
    value: 'active',
    data: {
      active: true,
      user_id: userId,
      user_name: userName || '',
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      duration_months: durationMonths,
    },
  };
  const existing = await db.AppSetting.filter({ key: BACKUP_ADDON_KEY });
  if (existing && existing.length > 0) {
    await db.AppSetting.update(existing[0].id, payload);
    return existing[0].id;
  }
  const created = await db.AppSetting.create(payload);
  return created?.id;
}

// ── Get monthly backup count for a user ──
export async function getMonthlyBackupCount(userId) {
  const all = await db.BackupRecord.list('-created_date', 200);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return (all || []).filter(r => {
    if (r.type === 'restore') return false;
    const d = r.created_date ? new Date(r.created_date) : null;
    return d && d >= monthStart && (!r.user_id || r.user_id === userId);
  }).length;
}

// ── Check if free user can backup ──
export async function canBackup(userId, hasAddon) {
  if (hasAddon) return { allowed: true, remaining: Infinity, limit: Infinity };
  const count = await getMonthlyBackupCount(userId);
  const remaining = Math.max(0, FREE_MONTHLY_LIMIT - count);
  return { allowed: remaining > 0, remaining, limit: FREE_MONTHLY_LIMIT };
}

// ── Collect all backup data from offlineDB ──
export async function collectBackupData() {
  const data = {};
  const counts = {};
  for (const entity of BACKUP_ENTITIES) {
    try {
      const items = await db[entity].list('-created_date', 5000);
      data[entity] = items || [];
      counts[entity] = (items || []).length;
    } catch {
      data[entity] = [];
      counts[entity] = 0;
    }
  }
  return { data, counts };
}

// ── Generate Excel-compatible CSV backup ──
function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    const json = JSON.stringify(value).replace(/"/g, '""');
    return `"${json}"`;
  }
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

function generateCsvBackup(data, counts, backupDate) {
  let csv = `# Sarraaf Backup\n# Date: ${backupDate.toISOString()}\n# Total: ${Object.values(counts).reduce((a, b) => a + b, 0)}\n\n`;

  for (const entity of BACKUP_ENTITIES) {
    const items = data[entity] || [];
    csv += `## ${entity} (${counts[entity] || 0})\n`;
    if (items.length === 0) {
      csv += '(no records)\n\n';
      continue;
    }
    const fields = Object.keys(items[0]).filter(f => f !== 'created_by_id');
    csv += fields.join(',') + '\n';
    for (const item of items) {
      csv += fields.map(f => escapeCsv(item[f])).join(',') + '\n';
    }
    csv += '\n';
  }

  return new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
}

// ── Generate PDF summary ──
async function generatePdfSummary(counts, backupDate, fileSize) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a5' });
  const pageWidth = 148;
  let y = 20;

  doc.setFontSize(16);
  doc.text('Backup Summary', pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(10);
  doc.text(`Date: ${backupDate.toLocaleString('en-GB')}`, 14, y);
  y += 7;
  doc.text(`File Size: ${(fileSize / 1024).toFixed(1)} KB`, 14, y);
  y += 7;
  doc.text(`Total Records: ${Object.values(counts).reduce((a, b) => a + b, 0)}`, 14, y);
  y += 10;

  doc.setFontSize(12);
  doc.text('Record Breakdown:', 14, y);
  y += 7;
  doc.setFontSize(10);
  for (const [entity, count] of Object.entries(counts)) {
    doc.text(`${entity}: ${count}`, 18, y);
    y += 6;
  }

  y += 5;
  doc.setFontSize(8);
  doc.text('Generated by Sarraaf App', pageWidth / 2, y, { align: 'center' });

  return doc.output('blob');
}

// ── Download a blob as a file ──
function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ── Create a manual backup (Excel CSV + PDF summary) ──
export async function createManualBackup({ userId, userName }) {
  const backupDate = new Date();
  const { data, counts } = await collectBackupData();

  const dateStr = backupDate.toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const csvName = `backup-${dateStr}.csv`;
  const pdfName = `backup-summary-${dateStr}.pdf`;

  const csvBlob = generateCsvBackup(data, counts, backupDate);
  downloadBlob(csvBlob, csvName);
  const pdfBlob = await generatePdfSummary(counts, backupDate, csvBlob.size);
  downloadBlob(pdfBlob, pdfName);

  // Record in BackupRecord
  const record = await db.BackupRecord.create({
    user_id: userId || '',
    user_name: userName || '',
    type: 'manual',
    status: 'success',
    file_name: csvName,
    size_bytes: csvBlob.size,
    record_counts: counts,
    entity_types: BACKUP_ENTITIES,
    notes: 'بکاپ دستی - دانلود فایل Excel',
  });

  return { record, counts, fileSize: csvBlob.size };
}

// ── Parse CSV backup file ──
function parseCsvBackup(text) {
  const lines = text.replace(/^\ufeff/, '').split('\n');
  const data = {};
  const counts = {};
  let currentEntity = null;
  let fields = null;

  for (let line of lines) {
    line = line.trimEnd();
    if (!line) continue;
    if (line.startsWith('#')) continue;
    if (line.startsWith('## ')) {
      // New entity section
      const match = line.match(/^## (\w+)\s*\((\d+)\)/);
      if (match) {
        currentEntity = match[1];
        data[currentEntity] = [];
        counts[currentEntity] = 0;
        fields = null;
      }
      continue;
    }
    if (line === '(no records)') continue;
    if (!currentEntity) continue;

    if (!fields) {
      fields = line.split(',').map(f => f.trim());
      continue;
    }

    // Parse CSV row (handle quoted fields with commas)
    const row = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        row.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    row.push(current);

    // Map to object
    const item = {};
    fields.forEach((f, i) => {
      let val = row[i] || '';
      // Try parsing JSON objects
      if (val.startsWith('{') || val.startsWith('[')) {
        try { val = JSON.parse(val); } catch { /* keep string */ }
      }
      item[f] = val;
    });
    data[currentEntity].push(item);
    counts[currentEntity]++;
  }

  return { data, counts };
}

// ── Restore from a CSV/Excel backup file ──
export async function restoreFromBackupFile(file, { userId, userName }) {
  const text = await file.text();
  let parsed;
  try {
    parsed = parseCsvBackup(text);
  } catch (e) {
    throw new Error('فایل بکاپ نامعتبر است: ' + e.message);
  }

  if (!parsed.data || Object.keys(parsed.data).length === 0) {
    throw new Error('هیچ داده‌ای در فایل بکاپ یافت نشد');
  }

  const counts = {};
  for (const entity of BACKUP_ENTITIES) {
    const items = parsed.data[entity];
    if (!items || !Array.isArray(items)) {
      counts[entity] = 0;
      continue;
    }
    const clean = items.map(({ id, created_date, updated_date, ...rest }) => rest);
    if (clean.length > 0) {
      try {
        await db[entity].bulkCreate(clean);
      } catch {
        // continue even if one entity fails
      }
    }
    counts[entity] = clean.length;
  }

  await db.BackupRecord.create({
    user_id: userId || '',
    user_name: userName || '',
    type: 'restore',
    status: 'success',
    file_name: file.name,
    size_bytes: file.size,
    record_counts: counts,
    entity_types: BACKUP_ENTITIES,
    restore_date: new Date().toISOString(),
    notes: 'بازیابی از فایل بکاپ Excel',
  });

  return counts;
}

// ── Get backup history for a user ──
export async function getBackupHistory(userId) {
  const all = await db.BackupRecord.list('-created_date', 100);
  if (!userId) return all || [];
  return (all || []).filter(r => r.user_id === userId || !r.user_id);
}

// ── Delete old backups beyond retention limit ──
export async function pruneOldBackups(userId, maxKeep = 30) {
  const records = await getBackupHistory(userId);
  const toDelete = records.slice(maxKeep);
  for (const rec of toDelete) {
    try { await db.BackupRecord.delete(rec.id); } catch { /* ignore */ }
  }
  return toDelete.length;
}

// ── Local-only backup (phone storage, no server) ──
const LOCAL_BACKUPS_KEY = 'local_backups_v1';
const MAX_LOCAL_BACKUPS = 20;

function getLocalBackupsRaw() {
  try {
    const raw = localStorage.getItem(LOCAL_BACKUPS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalBackupsRaw(list) {
  try {
    localStorage.setItem(LOCAL_BACKUPS_KEY, JSON.stringify(list));
  } catch {
    // storage full
  }
}

// Create a local-only backup: saves data in phone localStorage + downloads CSV/PDF
export async function createLocalBackup({ userId, userName }) {
  const backupDate = new Date();
  const { data, counts } = await collectBackupData();

  const dateStr = backupDate.toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const csvName = `local-backup-${dateStr}.csv`;
  const pdfName = `local-backup-summary-${dateStr}.pdf`;

  const csvBlob = generateCsvBackup(data, counts, backupDate);
  downloadBlob(csvBlob, csvName);
  const pdfBlob = await generatePdfSummary(counts, backupDate, csvBlob.size);
  downloadBlob(pdfBlob, pdfName);

  // Save metadata + data in phone storage (NOT server)
  const backups = getLocalBackupsRaw();
  backups.unshift({
    id: `local_${Date.now()}`,
    type: 'local',
    status: 'success',
    file_name: csvName,
    size_bytes: csvBlob.size,
    record_counts: counts,
    entity_types: BACKUP_ENTITIES,
    created_date: backupDate.toISOString(),
    user_id: userId || '',
    user_name: userName || '',
    notes: 'بکاپ محلی - ذخیره در حافظه گوشی',
    data, // full data stored locally
  });

  // Prune old local backups
  if (backups.length > MAX_LOCAL_BACKUPS) {
    backups.splice(MAX_LOCAL_BACKUPS);
  }
  setLocalBackupsRaw(backups);

  return { counts, fileSize: csvBlob.size, isLocal: true };
}

// Get local backups from phone storage
export function getLocalBackups() {
  return getLocalBackupsRaw().map(({ data, ...meta }) => meta);
}

// Restore from a local backup by id
export async function restoreFromLocalBackup(backupId, { userId, userName }) {
  const backups = getLocalBackupsRaw();
  const backup = backups.find(b => b.id === backupId);
  if (!backup || !backup.data) {
    throw new Error('بکاپ محلی یافت نشد');
  }

  const counts = {};
  for (const entity of BACKUP_ENTITIES) {
    const items = backup.data[entity];
    if (!items || !Array.isArray(items)) {
      counts[entity] = 0;
      continue;
    }
    const clean = items.map(({ id, created_date, updated_date, ...rest }) => rest);
    if (clean.length > 0) {
      try {
        await db[entity].bulkCreate(clean);
      } catch { /* continue */ }
    }
    counts[entity] = clean.length;
  }

  return counts;
}

// Delete a local backup
export function deleteLocalBackup(backupId) {
  const backups = getLocalBackupsRaw().filter(b => b.id !== backupId);
  setLocalBackupsRaw(backups);
}

export { FREE_MONTHLY_LIMIT, BACKUP_ENTITIES, MAX_LOCAL_BACKUPS };