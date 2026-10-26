// walletWithdrawal.js — قابلیت برداشت از کیف پول مشتری
// داده‌ها در offlineDB.WalletWithdrawalRequest ذخیره می‌شوند (Supabase-backed)
import { offlineDB as db } from './offlineQueue';
import { trackOp, finishOp } from './syncStatus';

// ── In-memory mutex for wallet operations (prevents race conditions / double-spend) ──
const _walletLocks = new Map();
function getWalletLock(walletId) {
  if (!_walletLocks.has(walletId)) {
    _walletLocks.set(walletId, { locked: false, queue: [] });
  }
  return _walletLocks.get(walletId);
}
async function withWalletLock(walletId, fn) {
  const lock = getWalletLock(walletId);
  return new Promise((resolve, reject) => {
    const run = async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (e) {
        reject(e);
      } finally {
        lock.locked = false;
        if (lock.queue.length > 0) {
          const next = lock.queue.shift();
          lock.locked = true;
          next();
        }
      }
    };
    if (lock.locked) {
      lock.queue.push(run);
    } else {
      lock.locked = true;
      run();
    }
  });
}

// Create a withdrawal request
export async function createWithdrawalRequest({ userId, walletId, amount, currency, method, destination, description }) {
  // Check wallet balance
  const wallet = await getWallet(walletId);
  if (!wallet) return { success: false, error: 'wallet_not_found' };
  if ((wallet.balance || 0) < amount) return { success: false, error: 'insufficient_balance' };

  const request = await db.WalletWithdrawalRequest.create({
    user_id: userId,
    wallet_id: walletId,
    amount,
    currency: currency || wallet.currency || 'AFN',
    method: method || 'bank_transfer',
    destination: destination || '',
    description: description || '',
    status: 'pending',
  });

  // Record in WalletTransaction
  try {
    trackOp();
    await db.WalletTransaction.create({
      wallet_id: walletId,
      user_id: userId,
      type: 'debit',
      amount,
      currency: request.currency,
      reason: 'withdrawal_request',
      actor_name: 'مشتری',
      timestamp: new Date().toISOString(),
      status: 'pending',
    });
    finishOp();
  } catch {
    finishOp();
  }

  return { success: true, request };
}

// Get withdrawal requests for a user
export async function getUserWithdrawals(userId) {
  if (!userId) return [];
  return db.WalletWithdrawalRequest.filter({ user_id: userId }, '-created_date', 200);
}

// Get all withdrawal requests (admin)
export async function getAllWithdrawals() {
  return db.WalletWithdrawalRequest.list('-created_date', 500);
}

// Approve a withdrawal request (admin)
// Uses wallet-level mutex + re-check to prevent race conditions / double-spend
export async function approveWithdrawal(requestId, { reviewerId, reviewerName }) {
  // Re-check status outside lock first (fast rejection for already-processed)
  const preReq = await db.WalletWithdrawalRequest.get(requestId);
  if (!preReq) return { success: false, error: 'not_found' };
  if (preReq.status !== 'pending') return { success: false, error: 'already_processed' };

  const walletId = preReq.wallet_id;
  const amount = preReq.amount;

  // Serialize wallet operations to prevent double-spend
  return withWalletLock(walletId, async () => {
    // Re-read inside lock — another concurrent approve may have already deducted
    const req = await db.WalletWithdrawalRequest.get(requestId);
    if (!req) return { success: false, error: 'not_found' };
    if (req.status !== 'pending') return { success: false, error: 'already_processed' };

    // Re-read wallet balance inside lock to get the latest value
    const wallet = await getWallet(req.wallet_id);
    if (!wallet) return { success: false, error: 'wallet_not_found' };

    const currentBalance = Number(wallet.balance || 0);
    if (currentBalance < amount) {
      return { success: false, error: 'insufficient_balance' };
    }

    const newBalance = currentBalance - amount;
    try {
      await db.Wallet.update(wallet.id, { balance: newBalance });
    } catch (e) {
      return { success: false, error: 'wallet_update_failed', detail: e.message };
    }

    // Only if wallet deduction succeeded, mark withdrawal as approved
    const updated = await db.WalletWithdrawalRequest.update(requestId, {
      status: 'approved',
      review_date: new Date().toISOString(),
      reviewer_id: reviewerId,
      reviewer_name: reviewerName,
    });

    return { success: true, request: updated };
  });
}

// Reject a withdrawal request (admin)
export async function rejectWithdrawal(requestId, { reviewerId, reviewerName, reason }) {
  const req = await db.WalletWithdrawalRequest.get(requestId);
  if (!req) return { success: false, error: 'not_found' };
  if (req.status !== 'pending') return { success: false, error: 'already_processed' };

  const updated = await db.WalletWithdrawalRequest.update(requestId, {
    status: 'rejected',
    review_date: new Date().toISOString(),
    reviewer_id: reviewerId,
    reviewer_name: reviewerName,
    reject_reason: reason || '',
  });

  return { success: true, request: updated };
}

// Helper: get wallet by id
async function getWallet(walletId) {
  try {
    return await db.Wallet.get(walletId);
  } catch {
    return null;
  }
}

export const WITHDRAWAL_METHODS = [
  { value: 'bank_transfer', label: 'انتقال بانکی' },
  { value: 'cash', label: 'نقدی' },
  { value: 'agent', label: 'نمایندگی' },
];

export const WITHDRAWAL_STATUSES = [
  { value: 'pending', label: 'در انتظار' },
  { value: 'approved', label: 'تأییدشده' },
  { value: 'rejected', label: 'ردشده' },
  { value: 'completed', label: 'تکمیل‌شده' },
];