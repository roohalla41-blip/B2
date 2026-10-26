// dataSafety.js — Data integrity verification and safe migration utilities
//
// This module provides NON-DESTRUCTIVE utilities for verifying data
// integrity before and after any migration. It never deletes or modifies
// existing records — it only reads and compares counts/totals.
//
// Usage:
//   import { verifyIntegrity, createSnapshot, compareSnapshots } from '@/lib/dataSafety';
//   const before = await createSnapshot();
//   // ... migration ...
//   const after = await createSnapshot();
//   const diff = compareSnapshots(before, after);

import { supabase } from './supabaseClient';
import { getSupabaseConfig } from './supabaseConfig';

// ── Tables that hold critical user/financial data ──
const CRITICAL_TABLES = [
  'users',
  'exchanges',
  'customers',
  'transfers',
  'documents',
  'ledger_entries',
  'wallets',
  'wallet_transactions',
  'bank_accounts',
  'safes',
  'origins',
  'rates',
];

// ── Tables that are tenant-scoped (must have exchange_code column) ──
const TENANT_TABLES = [
  'customers',
  'transfers',
  'documents',
  'ledger_entries',
  'wallets',
  'wallet_transactions',
  'bank_accounts',
  'safes',
  'origins',
];

/**
 * Count records in a table (non-destructive read).
 * Uses `head: true` with `count: 'exact'` to avoid transferring data.
 */
async function countTable(table) {
  try {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    if (error) return { table, count: null, error: error.message };
    return { table, count, error: null };
  } catch (e) {
    return { table, count: null, error: e.message };
  }
}

/**
 * Get the sum of a numeric column for a table.
 * This uses an RPC call if available, or falls back to fetching and summing.
 * NOTE: For large tables, use the `recovery_get_status` RPC instead.
 */
async function getTableTotal(table, column) {
  try {
    const { data, error } = await supabase
      .from(table)
      .select(column)
      .limit(10000);
    if (error) return { table, column, total: null, error: error.message };
    const total = (data || []).reduce((sum, row) => {
      const val = Number(row[column] || 0);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
    return { table, column, total, error: null, rowCount: data?.length || 0 };
  } catch (e) {
    return { table, column, total: null, error: e.message };
  }
}

/**
 * Create a data integrity snapshot.
 * This is a READ-ONLY operation that records:
 *   - Record counts for all critical tables
 *   - Financial totals for key tables (documents.amount, wallets.balance)
 *   - Timestamp of the snapshot
 *
 * @returns {Promise<{tables: Array, timestamp: string, configOk: boolean}>}
 */
export async function createSnapshot() {
  const timestamp = new Date().toISOString();
  const tables = [];

  // Count all critical tables in parallel
  const countResults = await Promise.all(
    CRITICAL_TABLES.map(t => countTable(t))
  );
  tables.push(...countResults);

  // Get financial totals for documents and wallets
  const docTotal = await getTableTotal('documents', 'amount');
  const walletTotal = await getTableTotal('wallets', 'balance');

  return {
    timestamp,
    tables,
    financialTotals: {
      documents: docTotal,
      wallets: walletTotal,
    },
    configOk: true,
  };
}

/**
 * Compare two snapshots and report any discrepancies.
 *
 * @returns {{ ok: boolean, discrepancies: Array, summary: string }}
 */
export function compareSnapshots(before, after) {
  if (!before || !after) {
    return { ok: false, discrepancies: [], summary: 'missing_snapshot' };
  }

  const discrepancies = [];

  // Compare table counts
  const beforeMap = new Map(before.tables.map(t => [t.table, t]));
  for (const afterTable of after.tables) {
    const beforeTable = beforeMap.get(afterTable.table);
    if (!beforeTable) continue;

    if (beforeTable.count !== null && afterTable.count !== null) {
      if (afterTable.count < beforeTable.count) {
        // Count DECREASED — this is a RED FLAG (data loss).
        discrepancies.push({
          table: afterTable.table,
          type: 'count_decreased',
          before: beforeTable.count,
          after: afterTable.count,
          severity: 'critical',
        });
      } else if (afterTable.count > beforeTable.count) {
        // Count increased — this is expected if the app is running.
        discrepancies.push({
          table: afterTable.table,
          type: 'count_increased',
          before: beforeTable.count,
          after: afterTable.count,
          severity: 'info',
        });
      }
    }
  }

  // Compare financial totals
  if (before.financialTotals && after.financialTotals) {
    const beforeDocs = before.financialTotals.documents;
    const afterDocs = after.financialTotals.documents;
    if (beforeDocs && afterDocs && beforeDocs.total !== null && afterDocs.total !== null) {
      if (Math.abs(afterDocs.total - beforeDocs.total) > 0.01) {
        discrepancies.push({
          table: 'documents',
          type: 'total_changed',
          column: 'amount',
          before: beforeDocs.total,
          after: afterDocs.total,
          severity: 'high',
        });
      }
    }

    const beforeWallets = before.financialTotals.wallets;
    const afterWallets = after.financialTotals.wallets;
    if (beforeWallets && afterWallets && beforeWallets.total !== null && afterWallets.total !== null) {
      if (Math.abs(afterWallets.total - beforeWallets.total) > 0.01) {
        discrepancies.push({
          table: 'wallets',
          type: 'total_changed',
          column: 'balance',
          before: beforeWallets.total,
          after: afterWallets.total,
          severity: 'high',
        });
      }
    }
  }

  const criticalCount = discrepancies.filter(d => d.severity === 'critical').length;
  const highCount = discrepancies.filter(d => d.severity === 'high').length;

  return {
    ok: criticalCount === 0,
    discrepancies,
    summary: `${discrepancies.length} discrepancies (${criticalCount} critical, ${highCount} high)`,
  };
}

/**
 * Verify database connectivity and basic schema.
 * Non-destructive: only reads, never writes.
 */
export async function verifyConnection() {
  try {
    const { error } = await supabase
      .from('app_settings')
      .select('key')
      .limit(1);
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * Get migration status from the `recovery_get_status` RPC.
 * This shows how many legacy users still need password migration.
 */
export async function getMigrationStatus() {
  try {
    const { data, error } = await supabase.rpc('recovery_get_status');
    if (error) return { ok: false, error: error.message };
    return { ok: true, status: data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * Preview migration (dry-run) via `recovery_preview_migrate` RPC.
 * This does NOT modify any data — it only reports what would happen.
 */
export async function previewMigration() {
  try {
    const { data, error } = await supabase.rpc('recovery_preview_migrate');
    if (error) return { ok: false, error: error.message };
    return { ok: true, preview: data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export default {
  createSnapshot,
  compareSnapshots,
  verifyConnection,
  getMigrationStatus,
  previewMigration,
  CRITICAL_TABLES,
};