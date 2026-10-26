// referralSystem.js — Invite code & referral reward system (offline-first, no Base44 Integration)
import { offlineDB } from './offlineQueue';

// ── Default referral configuration ──
export const DEFAULT_REFERRAL_CONFIG = {
  enabled: true,
  reward_type: 'quota',       // quota | credit | points | none
  reward_amount: 100,         // amount of reward per successful referral
  condition: 'email_verified', // email_verified | registration | first_transaction
  max_referrals_per_user: 50, // anti-abuse: max referrals per inviter
  prevent_self_referral: true,
  prevent_duplicate_invitee: true,
};

const CONFIG_KEY = 'referral_config';

// ── Generate a unique invite code ──
// Format: 2-char prefix (user type) + base36 timestamp + random suffix
export function generateInviteCode(prefix = 'SR') {
  const ts = Date.now().toString(36).toUpperCase().slice(-5);
  const rand = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `${prefix}${ts}${rand}`;
}

// ── Generate a unique code that doesn't collide with existing ones ──
export async function generateUniqueInviteCode(prefix = 'SR') {
  let attempts = 0;
  while (attempts < 10) {
    const code = generateInviteCode(prefix);
    const existing = await offlineDB.Referral.filter({ code });
    if (!existing || existing.length === 0) return code;
    attempts++;
  }
  // Fallback with longer random
  return `${prefix}${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).toUpperCase().slice(2, 7)}`;
}

// ── Get or create invite code for a user ──
export async function getOrCreateUserInviteCode(userId, userName, userType = 'sarraaf') {
  if (!userId) return null;

  // Check SarraafProfile for existing code
  const profiles = await offlineDB.SarraafProfile.filter({ user_id: userId });
  if (profiles && profiles.length > 0) {
    const profile = profiles[0];
    if (profile.referral_code) return profile.referral_code;
    // Generate new code
    const prefix = userType === 'customer' ? 'CU' : 'SR';
    const code = await generateUniqueInviteCode(prefix);
    await offlineDB.SarraafProfile.update(profile.id, {
      referral_code: code,
      referral_enabled: true,
    });
    return code;
  }

  // Fallback: generate code and store in AppSetting
  const prefix = userType === 'customer' ? 'CU' : 'SR';
  const code = await generateUniqueInviteCode(prefix);
  return code;
}

// ── Validate an invite code ──
// Returns { valid, inviter_id, inviter_name } or { valid: false }
export async function validateInviteCode(code) {
  if (!code) return { valid: false, reason: 'empty' };

  const upperCode = code.trim().toUpperCase();

  // Check SarraafProfile for matching referral_code
  const profiles = await offlineDB.SarraafProfile.list();
  const profile = profiles.find(p => p.referral_code?.toUpperCase() === upperCode);

  if (!profile) {
    return { valid: false, reason: 'not_found' };
  }

  if (profile.referral_enabled === false) {
    return { valid: false, reason: 'disabled' };
  }

  if (profile.status === 'suspended') {
    return { valid: false, reason: 'suspended' };
  }

  return {
    valid: true,
    inviter_id: profile.user_id || profile.id,
    inviter_name: profile.name || profile.exchange_name || '',
    inviter_code: profile.referral_code,
  };
}

// ── Get referral configuration from AppSetting ──
export async function getReferralConfig() {
  try {
    const settings = await offlineDB.AppSetting.filter({ key: CONFIG_KEY });
    if (settings && settings.length > 0 && settings[0].data) {
      return { ...DEFAULT_REFERRAL_CONFIG, ...settings[0].data };
    }
    return { ...DEFAULT_REFERRAL_CONFIG };
  } catch {
    return { ...DEFAULT_REFERRAL_CONFIG };
  }
}

// ── Update referral configuration ──
export async function updateReferralConfig(config) {
  const settings = await offlineDB.AppSetting.filter({ key: CONFIG_KEY });
  const merged = { ...DEFAULT_REFERRAL_CONFIG, ...config };
  if (settings && settings.length > 0) {
    await offlineDB.AppSetting.update(settings[0].id, {
      value: 'referral_config',
      data: merged,
    });
  } else {
    await offlineDB.AppSetting.create({
      key: CONFIG_KEY,
      value: 'referral_config',
      data: merged,
    });
  }
  return merged;
}

// ── Check anti-abuse rules ──
export async function checkAntiAbuse(inviterId, inviteeId, config) {
  if (config.prevent_self_referral && inviterId === inviteeId) {
    return { passed: false, reason: 'self_referral' };
  }

  if (config.prevent_duplicate_invitee) {
    const existing = await offlineDB.Referral.filter({ invitee_id: inviteeId });
    if (existing && existing.length > 0) {
      return { passed: false, reason: 'duplicate_invitee' };
    }
  }

  if (config.max_referrals_per_user > 0) {
    const inviterRefs = await offlineDB.Referral.filter({ inviter_id: inviterId });
    const activeCount = (inviterRefs || []).filter(r => r.status !== 'cancelled').length;
    if (activeCount >= config.max_referrals_per_user) {
      return { passed: false, reason: 'max_reached' };
    }
  }

  return { passed: true };
}

// ── Process a referral: create the referral record ──
// Called during registration when an invite code is provided
export async function processReferral(inviteCode, inviteeId, inviteeName, inviteeType) {
  const config = await getReferralConfig();

  if (!config.enabled) {
    return { success: false, reason: 'system_disabled' };
  }

  const validation = await validateInviteCode(inviteCode);
  if (!validation.valid) {
    return { success: false, reason: validation.reason };
  }

  // Anti-abuse check
  const abuseCheck = await checkAntiAbuse(validation.inviter_id, inviteeId, config);
  if (!abuseCheck.passed) {
    return { success: false, reason: abuseCheck.reason };
  }

  // Check if referral already exists for this invitee (idempotency)
  const existing = await offlineDB.Referral.filter({ invitee_id: inviteeId });
  if (existing && existing.length > 0) {
    return { success: false, reason: 'already_referred' };
  }

  // Create referral record
  const referral = await offlineDB.Referral.create({
    inviter_id: validation.inviter_id,
    inviter_name: validation.inviter_name,
    inviter_code: validation.inviter_code,
    invitee_id: inviteeId,
    invitee_name: inviteeName || '',
    invitee_type: inviteeType || 'sarraaf',
    code: inviteCode.trim().toUpperCase(),
    status: 'pending',
    reward_type: config.reward_type,
    reward_amount: config.reward_amount,
    reward_given: false,
  });

  return { success: true, referral };
}

// ── Check if reward condition is met ──
export function isRewardConditionMet(referral, config) {
  if (!referral || referral.status === 'cancelled') return false;

  switch (config.condition) {
    case 'registration':
      // Reward immediately upon registration
      return true;
    case 'email_verified':
      // Reward when invitee's email is verified (status = verified)
      return referral.status === 'verified' || referral.status === 'completed';
    case 'first_transaction':
      // Reward when invitee has completed at least one transaction
      return referral.status === 'completed';
    default:
      return false;
  }
}

// ── Award reward to inviter (idempotent) ──
export async function awardReward(referralId) {
  const referral = await offlineDB.Referral.get(referralId);
  if (!referral) return { success: false, reason: 'not_found' };

  // Idempotency: if reward already given, don't give again
  if (referral.reward_given) {
    return { success: false, reason: 'already_rewarded' };
  }

  if (referral.status === 'cancelled') {
    return { success: false, reason: 'cancelled' };
  }

  const config = await getReferralConfig();
  const conditionMet = isRewardConditionMet(referral, config);
  if (!conditionMet) {
    return { success: false, reason: 'condition_not_met' };
  }

  // Award the reward based on type
  if (referral.reward_type === 'quota') {
    // Add quota to inviter's SarraafProfile
    const profiles = await offlineDB.SarraafProfile.filter({ user_id: referral.inviter_id });
    if (profiles && profiles.length > 0) {
      const profile = profiles[0];
      await offlineDB.SarraafProfile.update(profile.id, {
        referral_count: (profile.referral_count || 0) + 1,
        paid_referral_count: (profile.paid_referral_count || 0) + 1,
        referral_bonus_quota: (profile.referral_bonus_quota || 0) + (referral.reward_amount || 0),
        quota_limit: (profile.quota_limit || 0) + (referral.reward_amount || 0),
      });
    }
  }

  // Mark referral as rewarded
  await offlineDB.Referral.update(referralId, {
    status: 'rewarded',
    reward_given: true,
    reward_date: new Date().toISOString(),
  });

  return { success: true };
}

// ── Mark a referral as verified (e.g., when invitee verifies email) ──
export async function markReferralVerified(inviteeId) {
  const refs = await offlineDB.Referral.filter({ invitee_id: inviteeId });
  if (!refs || refs.length === 0) return;

  for (const r of refs) {
    if (r.status === 'pending') {
      await offlineDB.Referral.update(r.id, {
        status: 'verified',
        verified_date: new Date().toISOString(),
      });
      // Auto-award if condition is email_verified
      const config = await getReferralConfig();
      if (config.condition === 'email_verified' && config.enabled) {
        await awardReward(r.id);
      }
    }
  }
}

// ── Cancel a referral ──
export async function cancelReferral(referralId, reason = '') {
  const referral = await offlineDB.Referral.get(referralId);
  if (!referral) return { success: false, reason: 'not_found' };

  // If reward already given, cannot cancel
  if (referral.reward_given) {
    return { success: false, reason: 'already_rewarded' };
  }

  await offlineDB.Referral.update(referralId, {
    status: 'cancelled',
    cancelled_date: new Date().toISOString(),
    cancel_reason: reason,
  });

  return { success: true };
}

// ── Get referral history for a user (as inviter) ──
export async function getReferralHistory(userId) {
  const refs = await offlineDB.Referral.filter({ inviter_id: userId });
  return (refs || []).sort((a, b) => {
    const da = a.created_date || '';
    const db = b.created_date || '';
    return db.localeCompare(da);
  });
}

// ── Get referral stats for a user ──
export async function getReferralStats(userId) {
  const history = await getReferralHistory(userId);
  return {
    total: history.length,
    pending: history.filter(r => r.status === 'pending').length,
    verified: history.filter(r => r.status === 'verified').length,
    rewarded: history.filter(r => r.reward_given).length,
    cancelled: history.filter(r => r.status === 'cancelled').length,
    total_reward: history
      .filter(r => r.reward_given)
      .reduce((sum, r) => sum + (r.reward_amount || 0), 0),
  };
}