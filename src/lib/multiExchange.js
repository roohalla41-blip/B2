// multiExchange.js — اتصال یک کاربر به چند صرافی و مدیریت دسترسی
import { offlineDB as db } from './offlineQueue';

const LINKS_KEY = 'user_exchange_links';

function getLinksRaw() {
  try { return JSON.parse(localStorage.getItem(LINKS_KEY) || '[]'); } catch { return []; }
}
function saveLinksRaw(list) {
  try { localStorage.setItem(LINKS_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

function genId() {
  return `link_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

// Link a user to an exchange (by exchange code)
export async function linkUserToExchange({ userId, userName, exchangeCode, exchangeName, linkedBy, role }) {
  const links = getLinksRaw();
  // Check if already linked
  const existing = links.find(l =>
    l.user_id === userId && l.exchange_code === exchangeCode
  );
  if (existing) {
    if (existing.status === 'blocked') return { success: false, error: 'blocked' };
    if (existing.status === 'active') return { success: false, error: 'already_linked' };
    // Reactivate pending
    existing.status = 'active';
    existing.linked_date = new Date().toISOString();
    saveLinksRaw(links);
    return { success: true, link: existing };
  }

  const link = {
    id: genId(),
    user_id: userId,
    user_name: userName || '',
    exchange_code: exchangeCode,
    exchange_name: exchangeName || '',
    role: role || 'employee',
    status: 'pending', // pending, active, blocked
    linked_by: linkedBy || '',
    linked_date: new Date().toISOString(),
    permissions: {},
  };
  links.push(link);
  saveLinksRaw(links);
  return { success: true, link };
}

// Get all exchanges a user is linked to
export function getUserExchanges(userId) {
  const links = getLinksRaw();
  return links.filter(l => l.user_id === userId && l.status !== 'blocked');
}

// Get all users linked to an exchange
export function getExchangeUsers(exchangeCode) {
  const links = getLinksRaw();
  return links.filter(l => l.exchange_code === exchangeCode && l.status !== 'blocked');
}

// Update link status (approve/block/remove)
export function updateLinkStatus(linkId, status) {
  const links = getLinksRaw();
  const idx = links.findIndex(l => l.id === linkId);
  if (idx === -1) return { success: false, error: 'not_found' };
  links[idx].status = status;
  if (status === 'active') {
    links[idx].activated_date = new Date().toISOString();
  }
  saveLinksRaw(links);
  return { success: true, link: links[idx] };
}

// Update link permissions
export function updateLinkPermissions(linkId, permissions) {
  const links = getLinksRaw();
  const idx = links.findIndex(l => l.id === linkId);
  if (idx === -1) return { success: false, error: 'not_found' };
  links[idx].permissions = { ...links[idx].permissions, ...permissions };
  saveLinksRaw(links);
  return { success: true, link: links[idx] };
}

// Remove a link (unlink user from exchange)
export function removeLink(linkId) {
  const links = getLinksRaw();
  const filtered = links.filter(l => l.id !== linkId);
  saveLinksRaw(filtered);
  return { success: true };
}

// Find exchange by code
export async function findExchangeByCode(code) {
  try {
    const profiles = await db.SarraafProfile.list('-created_date', 500);
    return profiles.find(p => p.code === code);
  } catch {
    return null;
  }
}

// Request to join an exchange (by customer/employee)
export async function requestJoinExchange({ userId, userName, exchangeCode, role }) {
  const exchange = await findExchangeByCode(exchangeCode);
  if (!exchange) return { success: false, error: 'exchange_not_found' };

  return linkUserToExchange({
    userId,
    userName,
    exchangeCode,
    exchangeName: exchange.exchange_name || exchange.name,
    linkedBy: userId, // self-request
    role: role || 'employee',
  });
}

// Get active exchange code for current user (primary)
export function getPrimaryExchange(userId) {
  const exchanges = getUserExchanges(userId);
  const active = exchanges.find(e => e.status === 'active');
  return active || exchanges[0] || null;
}