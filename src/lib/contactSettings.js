// contactSettings.js — مدیریت لینک‌های ارتباطی قابل تنظیم
import { createSupabaseEntity } from './supabaseApi';

const sbAppSettings = createSupabaseEntity('AppSetting');

const DEFAULT_CONTACTS = [
  { type: 'whatsapp', label: 'واتساپ', value: '', icon: 'MessageCircle', sort_order: 0, is_active: true },
  { type: 'telegram', label: 'تلگرام', value: 'https://t.me/ExchangeRateAgainstAfghani', icon: 'Send', sort_order: 1, is_active: true },
  { type: 'email', label: 'ایمیل', value: 'roohalla41@gmail.com', icon: 'Mail', sort_order: 2, is_active: true },
  { type: 'phone', label: 'تلفن', value: '09129215785', icon: 'Phone', sort_order: 3, is_active: true },
  { type: 'website', label: 'وب‌سایت', value: '', icon: 'Globe', sort_order: 4, is_active: true },
  { type: 'instagram', label: 'اینستاگرام', value: '', icon: 'Instagram', sort_order: 5, is_active: false },
  { type: 'facebook', label: 'فیسبوک', value: '', icon: 'Facebook', sort_order: 6, is_active: false },
];

const SETTING_KEY = 'contact_settings';

function mergeContacts(contacts) {
  if (!Array.isArray(contacts)) return null;
  const merged = DEFAULT_CONTACTS.map((def) => {
    const found = contacts.find((c) => c?.type === def.type);
    const item = found ? { ...def, ...found } : { ...def };
    // If a saved active channel is blank, restore its built-in support destination.
    // Users can intentionally hide a channel by switching is_active off.
    if (found && !String(item.value || '').trim() && found.is_active !== false && def.value) {
      item.value = def.value;
    }
    return item;
  });
  const knownTypes = new Set(DEFAULT_CONTACTS.map((c) => c.type));
  const extras = contacts.filter((c) => c?.type && !knownTypes.has(c.type));
  return [...merged, ...extras].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

function parseSavedContacts(value) {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.contacts)) return parsed.contacts;
  } catch (err) {
    console.warn('[contactSettings] Could not parse saved contacts:', err);
  }
  return null;
}

async function readSavedContacts() {
  try {
    const rows = await sbAppSettings.filter({ key: SETTING_KEY });
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const saved = parseSavedContacts(rows[0]?.value);
    return mergeContacts(saved);
  } catch (err) {
    console.warn('[contactSettings] Could not read saved settings:', err);
    return null;
  }
}

export async function getContactSettings() {
  // First try the legacy public endpoint, when it exists in this deployment.
  try {
    const res = await fetch('/functions/supabase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getPublicContactSettings' }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success && Array.isArray(data.contacts) && data.contacts.length > 0) {
      return mergeContacts(data.contacts) || DEFAULT_CONTACTS.map((c) => ({ ...c }));
    }
    console.warn('[contactSettings] Public endpoint unavailable or returned no contacts.');
  } catch (err) {
    console.warn('[contactSettings] Public endpoint request failed:', err);
  }

  // GitHub builds may not include the old /functions/supabase route.
  // Recover the existing AppSetting record before using safe defaults.
  const saved = await readSavedContacts();
  if (saved && saved.length > 0) return saved;

  // Never return an empty list: otherwise the creator sees only the title/save button
  // and the welcome page hides all contact icons.
  return DEFAULT_CONTACTS.map((c) => ({ ...c }));
}

export async function saveContactSettings(contacts) {
  const jsonValue = JSON.stringify({ contacts, updated_at: new Date().toISOString() });
  const existing = await sbAppSettings.filter({ key: SETTING_KEY });
  if (existing && existing.length > 0) {
    await sbAppSettings.update(existing[0].id, { value: jsonValue });
    return existing[0].id;
  }
  const created = await sbAppSettings.create({ key: SETTING_KEY, value: jsonValue });
  return created?.id;
}

export async function updateContact(type, updates) {
  const contacts = await getContactSettings();
  const idx = contacts.findIndex((c) => c.type === type);
  if (idx === -1) return;
  contacts[idx] = { ...contacts[idx], ...updates };
  await saveContactSettings(contacts);
}

export function getContactUrl(type, value) {
  if (!value) return '#';
  const v = value.trim();
  switch (type) {
    case 'whatsapp':
      return v.startsWith('http') ? v : `https://wa.me/${v.replace(/[^0-9]/g, '')}`;
    case 'telegram':
      return v.startsWith('http') ? v : (v.startsWith('@') ? `https://t.me/${v.slice(1)}` : `https://t.me/${v}`);
    case 'email':
      return `mailto:${v}`;
    case 'phone':
      return `tel:${v}`;
    case 'website':
      return v.startsWith('http') ? v : `https://${v}`;
    case 'instagram':
      return v.startsWith('http') ? v : `https://instagram.com/${v.replace('@', '')}`;
    case 'facebook':
      return v.startsWith('http') ? v : `https://facebook.com/${v}`;
    default:
      return v;
  }
}

export function getActiveContacts(contacts) {
  return (contacts || []).filter((c) => c.is_active && c.value);
}
