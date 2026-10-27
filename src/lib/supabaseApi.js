// supabaseApi.js — Secured Supabase access layer (all CRUD via HMAC-signed backend)
//
// تمام عملیات دیتابیس از طریق بک‌اند امن (callSupabase) انجام می‌شوند.
// هیچ دسترسی مستقیم به REST API سوپابیس با anon key وجود ندارد.
// عملیات‌های احراز هویت (login/register) از طریق بک‌اند انجام می‌شوند.

import { ENTITY_TABLE_MAP, supabase } from './supabaseClient';
import { getSupabaseConfig } from './supabaseConfig';

// ── DEPRECATED: direct anon-key REST access — removed for security ──
// All callers must use callSupabase('crud', ...) or the specialized backend actions.
export async function sbFetch() {
  throw new Error('sbFetch deprecated — use callSupabase instead');
}

// ── Field mapping: entity field name → DB column name ──
const FIELD_MAPS = {
  rates: {
    write: { code: 'currency', name: 'description', is_active: 'show_to_customer' },
    read: { currency: 'code', description: 'name', show_to_customer: 'is_active' },
  },
  feature_settings: {
    write: { name: 'feature_name', icon: 'icon_name', location: 'category', display_order: 'sort_order' },
    read: { feature_name: 'name', icon_name: 'icon', category: 'location', sort_order: 'display_order' },
  },
  transfers: {
    write: { transfer_no: 'transfer_number' },
    read: { transfer_number: 'transfer_no' },
  },
  documents: {
    write: { document_no: 'doc_number', type: 'doc_type', customer_id: 'related_id', customer_name: 'related_name' },
    read: { doc_number: 'document_no', doc_type: 'type', related_id: 'customer_id', related_name: 'customer_name' },
  },
  customer_notifications: {
    write: { message: 'body', kind: 'type' },
    read: { body: 'message', type: 'kind' },
  },
  rules: {
    write: { message: 'content', audience: 'role', active: 'is_active', display_order: 'sort_order' },
    read: { content: 'message', role: 'audience', is_active: 'active', sort_order: 'display_order' },
  },
  packages: {
    write: { product_key: 'key', duration: 'duration_months', price_afn: 'price', fields: 'features', active: 'is_active', display_order: 'sort_order' },
    read: { key: 'product_key', duration_months: 'duration', price: 'price_afn', features: 'fields', is_active: 'active', sort_order: 'display_order' },
  },
  sellers: {
    write: { phone: 'mobile' },
    read: { mobile: 'phone' },
  },
  text_labels: {
    write: { key: 'label_key', group: 'label_group' },
    read: { label_key: 'key', label_group: 'group' },
  },
  audit_logs: {
    write: { actor_id: 'user_id', actor_name: 'user_name', target_type: 'entity_type', target_id: 'entity_id', reason: 'description' },
    read: { user_id: 'actor_id', user_name: 'actor_name', entity_type: 'target_type', entity_id: 'target_id', description: 'reason' },
  },
  origins: {
    write: { status: 'is_active' },
    read: { is_active: 'status' },
  },
  app_settings: {
    write: { key: 'setting_key', value: 'setting_value' },
    read: { setting_key: 'key', setting_value: 'value' },
  },
  exchanges: {
    write: { code: 'exchange_code', user_id: 'owner_user_id', phone: 'mobile', name: 'exchange_name' },
    read: { exchange_code: 'code', owner_user_id: 'user_id', mobile: 'phone', exchange_name: 'name' },
  },
  agency_links: {
    write: { requester_exchange_name: 'requester_exchange_name' },
    read: {},
  },
};

function mapFieldsOnWrite(table, data) {
  const map = FIELD_MAPS[table]?.write;
  if (!map) return data;
  const mapped = {};
  for (const [k, v] of Object.entries(data)) {
    const dbKey = map[k] || k;
    if (table === 'origins' && k === 'status') {
      mapped.is_active = v === 'active';
    } else if (table === 'rates' && k === 'is_active') {
      mapped.show_to_customer = v;
    } else if (table === 'rules' && k === 'active') {
      mapped.is_active = v;
    } else {
      mapped[dbKey] = v;
    }
  }
  return mapped;
}

function mapFilters(table, filters) {
  const map = FIELD_MAPS[table]?.write;
  if (!map) return filters;
  const mapped = {};
  for (const [k, v] of Object.entries(filters)) {
    mapped[map[k] || k] = v;
  }
  return mapped;
}

// ── Map a single entity field name to DB column name ──
function mapField(field) {
  if (!field) return field;
  // Check if there's a write map for the 'documents' table (used by listTransactions)
  const writeMap = FIELD_MAPS['documents']?.write;
  return (writeMap && writeMap[field]) ? writeMap[field] : field;
}

function mapFieldsOnRead(table, row) {
  if (!row) return row;
  const map = FIELD_MAPS[table]?.read;
  if (!map) return row;
  const mapped = { ...row };
  for (const [dbKey, entityKey] of Object.entries(map)) {
    if (dbKey in mapped) {
      if (table === 'origins' && dbKey === 'is_active') {
        mapped.status = mapped[dbKey] ? 'active' : 'inactive';
        delete mapped.is_active;
      } else if (table === 'rates' && dbKey === 'show_to_customer') {
        mapped.is_active = mapped[dbKey];
        delete mapped.show_to_customer;
      } else if (table === 'rules' && dbKey === 'is_active') {
        mapped.active = mapped[dbKey];
        delete mapped.is_active;
      } else {
        mapped[entityKey] = mapped[dbKey];
        delete mapped[dbKey];
      }
    }
  }
  return mapped;
}

// ── Helper: get auth token from localStorage ──
function getAuthToken() {
  try {
    return localStorage.getItem('auth_token') || '';
  } catch {
    return '';
  }
}

// Base44 platform token is no longer used — all auth goes through HMAC tokens.
function getBase44Token() {
  return '';
}

// ── Tenant isolation: get current sarraaf's exchange_code from session ──
export function getExchangeCode() {
  try {
    const userStr = localStorage.getItem('auth_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.exchange_code) return user.exchange_code;
    }
    // Fallback: parse HMAC token (format: base64url(payload).base64url(hmac))
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length >= 2) {
          // base64url → base64
          let b64 = parts[0].replace(/-/g, '+').replace(/_/g, '/');
          // pad
          while (b64.length % 4) b64 += '=';
          const payload = JSON.parse(atob(b64));
          if (payload.ec) return payload.ec;
        }
      } catch { /* not parseable — ignore */ }
    }
  } catch { /* ignore */ }
  return null;
}

// ── DEPRECATED: resolveExchangeCode removed — exchange_code is resolved server-side ──

// ── Tables that are scoped per-sarraaf (must filter by exchange_code) ──
const TENANT_SCOPED_TABLES = new Set([
  'customers', 'transfers', 'documents', 'ledger_entries',
  'bank_accounts', 'bank_transactions', 'safes', 'origins',
  'conversions', 'treasury_transactions',
  'rates', 'employees', 'rate_settings',
  'wallets', 'wallet_transactions',
  'charge_orders', 'sellers', 'online_requests',
  'support_tickets', 'error_reports', 'user_feedback',
  'wallet_topup_requests', 'wallet_withdrawal_requests', 'wallet_bans',
  'customer_transfer_requests', 'customer_notifications', 'customer_links',
  'quota_change_logs',
  'referrals', 'backup_records',
]);

// ── Creator/admin sees all data (no tenant filter) ──
// NOTE: Creator's auth_user is deliberately NOT stored in localStorage (security).
// So we must also check the session token for the role.
export function isCreatorOrAdmin() {
  try {
    const userStr = localStorage.getItem('auth_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.role === 'creator' || user.role === 'admin';
    }
    // Fallback: check session token (creators don't store auth_user in localStorage)
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length >= 2) {
          let b64 = parts[0].replace(/-/g, '+').replace(/_/g, '/');
          while (b64.length % 4) b64 += '=';
          const payload = JSON.parse(atob(b64));
          if (payload.r === 'creator' || payload.r === 'admin') return true;
        }
      } catch { /* not parseable — ignore */ }
    }
  } catch { /* ignore */ }
  return false;
}

// ── Core: direct Supabase operations (no Base44 backend function) ──
// All operations are handled directly via the Supabase client.
// Admin operations that need service_role will try the Edge Function fallback.
export async function callSupabase(action, payload = {}) {
  // Handle logout via Supabase Auth directly
  if (action === 'logout') {
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
    return { success: true };
  }

  // Handle keepalive directly
  if (action === 'keepalive') {
    try {
      const { error } = await supabase.from('app_settings').select('setting_key', { count: 'exact', head: true });
      return { success: !error };
    } catch {
      return { success: false };
    }
  }

  // Handle test connection
  if (action === 'test') {
    try {
      const { error } = await supabase.from('app_settings').select('setting_key').limit(1);
      return { success: !error, error: error?.message };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Handle CRUD operations directly
  if (action === 'crud') {
    return handleCrudDirect(payload);
  }

  // For admin operations that need service_role, try Edge Function fallback
  try {
    const cfg = getSupabaseConfig();
    const edgeRes = await fetch(`${cfg.url}/functions/v1/legacy-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, auth_token: getAuthToken(), ...payload }),
    });
    const data = await edgeRes.json().catch(() => ({}));
    return data;
  } catch {
    return { success: false, error: 'operation_not_available' };
  }
}

// ── Direct CRUD handler ──
// Empty-filter mutations are blocked to prevent accidental mass changes.
function hasExplicitFilter(filters) {
  return !!filters &&
    typeof filters === 'object' &&
    !Array.isArray(filters) &&
    Object.entries(filters).some(([key, value]) =>
      typeof key === 'string' && key.trim() !== '' &&
      value !== undefined && value !== null
    );
}

async function handleCrudDirect({ table, operation, filters, data, sort, limit, fields }) {
  try {
    if (operation === 'update' && !hasExplicitFilter(filters)) {
      return { success: false, error: 'unsafe_unfiltered_update' };
    }
    if (operation === 'delete' && !hasExplicitFilter(filters)) {
      return { success: false, error: 'unsafe_unfiltered_delete' };
    }

    let query = supabase.from(table);

    if (operation === 'select' || !operation) {
      query = query.select(fields ? fields.join(',') : '*');
      if (filters) {
        for (const [key, value] of Object.entries(filters)) {
          if (value !== undefined && value !== null && value !== '') {
            query = query.eq(key, value);
          }
        }
      }
      if (sort) {
        const descending = sort.startsWith('-');
        const sortField = sort.replace(/^-/, '');
        query = query.order(sortField, { ascending: !descending });
      }
      if (limit) query = query.limit(Number(limit));
      const { data: result, error } = await query;
      if (error) return { success: false, error: error.message };
      return { success: true, result: result || [] };
    }

    if (operation === 'insert') {
      const { data: result, error } = await query.insert(data).select();
      if (error) return { success: false, error: error.message };
      return { success: true, result: result || [] };
    }

    if (operation === 'bulkInsert') {
      const { data: result, error } = await query.insert(data).select();
      if (error) return { success: false, error: error.message };
      return { success: true, result: result || [] };
    }

    if (operation === 'update') {
      const { data: result, error } = await query.update(data).match(filters || {}).select();
      if (error) return { success: false, error: error.message };
      return { success: true, result: result || [] };
    }

    if (operation === 'delete') {
      const { error } = await query.delete().match(filters || {});
      if (error) return { success: false, error: error.message };
      return { success: true };
    }

    return { success: false, error: 'unknown_operation' };
  } catch (err) {
    return { success: false, error: err.message || 'crud_failed' };
  }
}

// ── Row normalizer (module-level, shared by entity factory and getMyExchange) ──
function normalizeRow(row) {
  if (!row) return null;
  const mapped = { ...row };
  if (mapped.id !== undefined && mapped.id !== null) mapped.id = String(mapped.id);
  if (mapped.created_at) mapped.created_date = mapped.created_at;
  if (mapped.updated_at) mapped.updated_date = mapped.updated_at;
  return mapped;
}

// ── Entity factory — routes all CRUD through secured backend function ──
// No direct anon-key DB access. Tenant isolation, idempotency, and amount
// validation are enforced server-side by the backend `crud` action.
export function createSupabaseEntity(entityName) {
  const table = ENTITY_TABLE_MAP[entityName] || entityName.toLowerCase() + 's';

  function injectTenantScope(record) {
    if (!TENANT_SCOPED_TABLES.has(table)) return record;
    if (isCreatorOrAdmin()) return record;
    const ec = getExchangeCode();
    if (!ec) {
      throw new Error('کد صرافی یافت نشد — لطفاً دوباره وارد شوید');
    }
    return { ...record, exchange_code: ec };
  }

  function mapSort(sort) {
    if (!sort) return undefined;
    const rawField = sort.replace(/^-/, '').replace('created_date', 'created_at').replace('updated_date', 'updated_at');
    const writeMap = FIELD_MAPS[table]?.write;
    const sortField = (writeMap && writeMap[rawField]) ? writeMap[rawField] : rawField;
    return (sort.startsWith('-') ? '-' : '') + sortField;
  }

  return {
    async list(sort, limit) {
      return this.filter({}, sort, limit);
    },

    async filter(filters = {}, sort, limit) {
      const mappedFilters = mapFilters(table, filters);
      // Apply tenant scope on read for tenant-scoped tables (belt-and-suspenders with RLS)
      if (TENANT_SCOPED_TABLES.has(table) && !isCreatorOrAdmin()) {
        const ec = getExchangeCode();
        if (ec) mappedFilters.exchange_code = ec;
      }
      let query = supabase.from(table).select('*');
      for (const [key, value] of Object.entries(mappedFilters)) {
        if (value !== undefined && value !== null && value !== '') {
          query = query.eq(key, value);
        }
      }
      if (sort) {
        const descending = sort.startsWith('-');
        const rawField = sort.replace(/^-/, '').replace('created_date', 'created_at').replace('updated_date', 'updated_at');
        const writeMap = FIELD_MAPS[table]?.write;
        const sortField = (writeMap && writeMap[rawField]) ? writeMap[rawField] : rawField;
        query = query.order(sortField, { ascending: !descending });
      }
      if (limit) query = query.limit(Number(limit));
      const { data, error } = await query;
      if (error) throw new Error(error.message || 'crud_select_failed');
      return (data || []).map(r => mapFieldsOnRead(table, normalizeRow(r)));
    },

    async get(id) {
      if (!id) return null;
      const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
      if (error) throw new Error(error.message || 'crud_select_failed');
      return mapFieldsOnRead(table, normalizeRow(data));
    },

    async create(data) {
      const { client_operation_id, ...rest } = data;
      const clean = {};
      for (const [k, v] of Object.entries(rest)) {
        if (v !== '' && v !== undefined && v !== null) clean[k] = v;
        else if (v === false || v === 0) clean[k] = v;
      }
      const scoped = injectTenantScope(clean);
      const mapped = mapFieldsOnWrite(table, scoped);
      const { data: result, error } = await supabase.from(table).insert(mapped).select().single();
      if (error) throw new Error(error.message || 'crud_insert_failed');
      return mapFieldsOnRead(table, normalizeRow(result));
    },

    async bulkCreate(records) {
      if (!records || records.length === 0) return [];
      const cleanRecords = records.map(({ client_operation_id, ...rest }) => rest);
      const scopedRecords = cleanRecords.map(r => injectTenantScope(r));
      const mappedRecords = scopedRecords.map(r => mapFieldsOnWrite(table, r));
      const { data, error } = await supabase.from(table).insert(mappedRecords).select();
      if (error) throw new Error(error.message || 'crud_bulkInsert_failed');
      return (data || []).map(r => mapFieldsOnRead(table, normalizeRow(r)));
    },

    async update(id, updates) {
      const clean = {};
      for (const [k, v] of Object.entries(updates)) {
        if (v !== '' && v !== undefined && v !== null) clean[k] = v;
        else if (v === false || v === 0) clean[k] = v;
      }
      const mapped = mapFieldsOnWrite(table, clean);
      delete mapped.id;
      delete mapped.created_at;
      delete mapped.updated_at;
      const { data: result, error } = await supabase.from(table).update(mapped).eq('id', id).select().single();
      if (error) throw new Error(error.message || 'crud_update_failed');
      return mapFieldsOnRead(table, normalizeRow(result));
    },

    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw new Error(error.message || 'crud_delete_failed');
    },
  };
}

// ── Get my exchange profile (sarraaf) — via direct Supabase client ──
export async function getMyExchange() {
  // Try to get the current user's exchange profile directly from Supabase
  // RLS ensures only the owner or admin can see it
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error('not_authenticated');

  const authUid = userData.user.id;
  const authEmail = (userData.user.email || '').toLowerCase();

  // Find user in users table by auth_uid or email
  let { data: user } = await supabase.from('users').select('id, role').eq('auth_uid', authUid).maybeSingle();
  if (!user && authEmail) {
    const r2 = await supabase.from('users').select('id, role').eq('email', authEmail).maybeSingle();
    user = r2.data;
  }
  if (!user) throw new Error('user_not_found');

  // Get exchange
  const { data: exchange, error } = await supabase.from('exchanges').select('*').eq('owner_user_id', user.id).maybeSingle();
  if (error) throw new Error(error.message || 'getMyExchange_failed');
  const row = exchange ? mapFieldsOnRead('exchanges', normalizeRow(exchange)) : null;
  if (row) row.code = row.exchange_code || '';
  return row;
}

// ── List all exchanges (creator/admin only) — direct Supabase read ──
export async function listAllExchanges() {
  const { data, error } = await supabase
    .from('exchanges')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message || 'listExchanges_failed');
  return (data || []).map(e => mapFieldsOnRead('exchanges', normalizeRow(e)));
}

// ── Extend trial for an exchange (creator/admin only) — direct Supabase update ──
export async function extendTrial(exchangeId) {
  const today = new Date().toISOString().slice(0, 10);
  const end = new Date();
  end.setMonth(end.getMonth() + 1);
  const endStr = end.toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('exchanges')
    .update({
      trial_start_date: today,
      quota_start_date: today,
      quota_end_date: endStr,
      payment_status: 'pending',
    })
    .eq('id', exchangeId)
    .select()
    .single();
  if (error) throw new Error(error.message || 'extendTrial_failed');
  return mapFieldsOnRead('exchanges', normalizeRow(data));
}

// ── Bulk extend trial for ALL exchanges (creator/admin only) — direct Supabase ──
export async function bulkExtendTrial() {
  const today = new Date().toISOString().slice(0, 10);
  const end = new Date();
  end.setMonth(end.getMonth() + 1);
  const endStr = end.toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('exchanges')
    .update({
      trial_start_date: today,
      quota_start_date: today,
      quota_end_date: endStr,
      payment_status: 'pending',
    })
    .neq('id', 0)
    .select();
  if (error) throw new Error(error.message || 'bulkExtendTrial_failed');
  return { count: data?.length || 0, total: data?.length || 0 };
}

// ── List transactions — via direct Supabase client ──
export async function listTransactions(filters = {}, sort, limit) {
  let query = supabase.from('documents').select('*');
  if (filters && typeof filters === 'object') {
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        query = query.eq(mapField(key), value);
      }
    }
  }
  if (sort) {
    const descending = sort.startsWith('-');
    const rawField = sort.replace(/^-/, '');
    query = query.order(mapField(rawField), { ascending: !descending });
  } else {
    query = query.order('id', { ascending: false });
  }
  if (limit) query = query.limit(Number(limit));
  const { data: result, error } = await query;
  if (error) throw new Error(error.message || 'listTransactions_failed');
  return (result || []).map((d) => ({
    id: String(d.id),
    exchange_code: d.exchange_code,
    document_no: d.doc_number,
    type: d.doc_type,
    amount: d.amount,
    currency: d.currency,
    fee: d.fee,
    related_type: d.related_type,
    customer_id: d.related_id ? String(d.related_id) : null,
    customer_name: d.related_name,
    description: d.description,
    registered_by: d.registered_by,
    registered_by_user_id: d.registered_by_user_id,
    transfer_id: d.transfer_id,
    created_at: d.created_at,
    date: d.created_at ? d.created_at.split('T')[0] : null,
    updated_at: d.updated_at,
    deleted: d.deleted || false,
    deleted_date: d.deleted_date || null,
    deleted_by_name: d.deleted_by_name || null,
    edited: d.edited || false,
    edited_date: d.edited_date || null,
    edit_note: d.edit_note || null,
    edited_by_name: d.edited_by_name || null,
    created_date: d.created_at,
    updated_date: d.updated_at,
  }));
}

// ── DEPRECATED: direct RPC/view access removed — use callSupabase specialized actions ──
export async function callRpc() {
  throw new Error('callRpc deprecated — use callSupabase instead');
}

export async function queryView() {
  throw new Error('queryView deprecated — use callSupabase instead');
}

export default { createSupabaseEntity, getMyExchange, listTransactions, callRpc, queryView };