// chat.js — Helpers for chat groups, roles, and subscription tiers
import { Shield, BadgeCheck, Coins, User, AlertCircle } from 'lucide-react';
import React from 'react';

// ── Subscription Tier ──
// Returns: 'trial' | 'basic' | 'paid' | 'expired'
// همهٔ صرافان دسترسی نامحدود دارند — tier همیشه 'paid' است.
export function getSarraafTier(profile) {
  if (!profile) return 'paid';
  if (profile.status === 'suspended') return 'expired';
  return 'paid';
}

export function canAccessPrivateGroups(profile, userRole) {
  if (userRole === 'creator' || userRole === 'admin') return true;
  return getSarraafTier(profile) === 'paid';
}

export function canCreatePrivateGroup(profile, userRole) {
  if (userRole === 'creator' || userRole === 'admin') return true;
  return getSarraafTier(profile) === 'paid';
}

// ── Group Creation Permission ──
// همهٔ صرافان می‌توانند گروه ایجاد کنند (حداکثر ۱ گروه).
export function canCreateGroup(profile, userRole) {
  if (userRole === 'creator' || userRole === 'admin') return true;
  return true;
}

// ── Group Limits ──
// هر صراف نهایتاً ۱ گروه می‌تواند ایجاد کند. ادمین/سازنده نامحدود.
export function getMaxGroups(profile, userRole) {
  if (userRole === 'creator' || userRole === 'admin') return 999;
  return 1;
}

export function getMaxMembers(profile, userRole) {
  if (userRole === 'creator' || userRole === 'admin') return 999999;
  return 10000;
}

// ── Group Sorting ──
// Creator-managed groups first, then by member_count descending
export function sortGroups(groups) {
  if (!groups || groups.length === 0) return [];
  return [...groups].sort((a, b) => {
    // Creator-managed groups always first
    if (a.creator_managed && !b.creator_managed) return -1;
    if (!a.creator_managed && b.creator_managed) return 1;
    // Within same category, sort by member_count descending
    const aCount = a.member_count || 0;
    const bCount = b.member_count || 0;
    if (bCount !== aCount) return bCount - aCount;
    // Fallback: newest first
    return new Date(b.created_date || 0) - new Date(a.created_date || 0);
  });
}

// ── Message Rate Limiting ──
// Returns cooldown in seconds: sarraaf=60s, customer=300s, creator/admin=0
export function getMessageCooldown(userRole, profile) {
  if (userRole === 'creator' || userRole === 'admin') return 0;
  if (userRole === 'customer') return 300; // 5 minutes
  // sarraaf
  return 60; // 1 minute
}

export function formatCooldown(seconds) {
  if (seconds <= 0) return '';
  if (seconds < 60) return `${seconds} ثانیه`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m} دقیقه و ${s} ثانیه` : `${m} دقیقه`;
}

// ── Creator-Managed Groups ──
// Groups created by the creator are visible to all users and managed by the creator
export function isCreatorManagedGroup(group) {
  if (!group) return false;
  return group.creator_managed === true;
}

export function isGroupCreator(group, user) {
  if (!group || !user) return false;
  return group.creator_id === user.id;
}

// ── Role Display ──
// Returns { label, color, bg, icon } for a user based on their role + profile
export function getRoleDisplay(userRole, profile) {
  if (userRole === 'admin' || userRole === 'creator') {
    return { label: 'مدیر سیستم', color: 'text-red-600', bg: 'bg-red-50', icon: Shield };
  }
  if (userRole === 'customer') {
    return { label: 'مشتری', color: 'text-green-600', bg: 'bg-green-50', icon: User };
  }
  // sarraaf — check tier
  const tier = getSarraafTier(profile);
  if (tier === 'paid') {
    return { label: 'صراف تأییدشده', color: 'text-blue-600', bg: 'bg-blue-50', icon: BadgeCheck };
  }
  if (tier === 'expired') {
    return { label: 'صراف منقضی', color: 'text-orange-600', bg: 'bg-orange-50', icon: AlertCircle };
  }
  if (tier === 'basic') {
    return { label: 'صراف', color: 'text-indigo-600', bg: 'bg-indigo-50', icon: Coins };
  }
  return { label: 'صراف آزمایشی', color: 'text-gray-600', bg: 'bg-gray-50', icon: Coins };
}

// Map system role + profile to a storage role string for GroupMember
export function getMemberRole(userRole, profile) {
  if (userRole === 'admin' || userRole === 'creator') return 'admin';
  if (userRole === 'customer') return 'customer';
  const tier = getSarraafTier(profile);
  if (tier === 'paid') return 'sarraaf_verified';
  return 'sarraaf';
}

// ── Message TTL ──
export const TTL_OPTIONS = [
  { key: '24h', label: '۲۴ ساعت', hours: 24 },
  { key: '48h', label: '۴۸ ساعت', hours: 48 },
  { key: '7d', label: '۷ روز', hours: 168 },
  { key: '30d', label: '۳۰ روز', hours: 720 },
  { key: 'never', label: 'بدون حذف', hours: 0 },
];

export function getTtlHours(key) {
  const opt = TTL_OPTIONS.find(o => o.key === key);
  return opt ? opt.hours : 0;
}

export function getExpiryDate(ttlKey) {
  const hours = getTtlHours(ttlKey);
  if (!hours) return null;
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

// Check if a message has expired
export function isMessageExpired(msg) {
  if (!msg.expires_at) return false;
  return new Date(msg.expires_at) < new Date();
}

// ── Group Type Display ──
export function getGroupTypeDisplay(type) {
  if (type === 'private') {
    return { label: 'خصوصی', color: 'text-purple-600', bg: 'bg-purple-50' };
  }
  return { label: 'عمومی', color: 'text-green-600', bg: 'bg-green-50' };
}