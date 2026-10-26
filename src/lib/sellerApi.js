// sellerApi.js — لایه دسترسی داده‌های سیستم فروشندگان
//
// اولویت: اتصال مستقیم به Supabase (با RLS)
// در صورت نبود جداول: fallback به localStorage با برچسب آزمایشی
//
// توجه: بک‌اند فانکشن به دلیل اتمام اعتبار Integration غیرفعال است.
// پذیرش اتمی از طریق UPDATE شرطی Supabase انجام می‌شود.

import { supabase } from './supabaseClient';

const LS_KEY = 'seller_system_data';
const USE_MOCK_KEY = 'seller_use_mock';

// ── محصولات نمونه آزمایشی ──
export const SAMPLE_PRODUCTS = [
  { key: 'awcc_credit_50', name: 'شارژ ۵۰ افغانی AWCC', operator_key: 'awcc', operator_name: 'AWCC', package_type: 'credit', base_price: 50, currency: 'AFN' },
  { key: 'awcc_credit_100', name: 'شارژ ۱۰۰ افغانی AWCC', operator_key: 'awcc', operator_name: 'AWCC', package_type: 'credit', base_price: 100, currency: 'AFN' },
  { key: 'etisalat_credit_50', name: 'شارژ ۵۰ افغانی Etisalat', operator_key: 'etisalat', operator_name: 'Etisalat', package_type: 'credit', base_price: 50, currency: 'AFN' },
  { key: 'roshan_credit_100', name: 'شارژ ۱۰۰ افغانی Roshan', operator_key: 'roshan', operator_name: 'Roshan', package_type: 'credit', base_price: 100, currency: 'AFN' },
  { key: 'awcc_net_1gb', name: 'بسته اینترنت ۱GB AWCC', operator_key: 'awcc', operator_name: 'AWCC', package_type: 'internet', base_price: 150, currency: 'AFN' },
  { key: 'etisalat_net_2gb', name: 'بسته اینترنت ۲GB Etisalat', operator_key: 'etisalat', operator_name: 'Etisalat', package_type: 'internet', base_price: 250, currency: 'AFN' },
  { key: 'roshan_net_5gb', name: 'بسته اینترنت ۵GB Roshan', operator_key: 'roshan', operator_name: 'Roshan', package_type: 'internet', base_price: 350, currency: 'AFN' },
  { key: 'salam_net_10gb', name: 'بسته اینترنت ۱۰GB Salam', operator_key: 'salam', operator_name: 'Salam', package_type: 'internet', base_price: 500, currency: 'AFN' },
];

// ── تنظیمات پیش‌فرض قیمت‌گذاری ──
export const DEFAULT_MARKUP = {
  amount: 10,
  percent: 0,
  creator_share_percent: 50,
  seller_share_percent: 50,
};

// ── بررسی وضعیت اتصال Supabase ──
let _supabaseAvailable = null;

async function checkSupabaseTables() {
  if (_supabaseAvailable !== null) return _supabaseAvailable;
  try {
    const { error } = await supabase.from('seller_profiles').select('id').limit(1);
    _supabaseAvailable = !error;
    return _supabaseAvailable;
  } catch {
    _supabaseAvailable = false;
    return false;
  }
}

export function isMockMode() {
  try { return localStorage.getItem(USE_MOCK_KEY) === '1'; } catch { return false; }
}

export function setMockMode(enabled) {
  try {
    if (enabled) localStorage.setItem(USE_MOCK_KEY, '1');
    else localStorage.removeItem(USE_MOCK_KEY);
  } catch { /* ignore */ }
}

// ── داده‌های محلی (fallback) ──
function getLocalData() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { profiles: [], orders: [], events: [], settings: DEFAULT_MARKUP };
}

function saveLocalData(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

function seedLocalData() {
  const data = getLocalData();
  if (data.profiles.length === 0) {
    data.profiles = [
      { id: 'sp-1', user_id: 'demo-seller-1', user_name: 'فروشنده نمونه ۱', phone: '0799000001', status: 'approved', commission_rate: 50, total_orders: 0, total_sales: 0, total_commission: 0, created_at: new Date().toISOString() },
      { id: 'sp-2', user_id: 'demo-seller-2', user_name: 'فروشنده نمونه ۲', phone: '0799000002', status: 'approved', commission_rate: 50, total_orders: 0, total_sales: 0, total_commission: 0, created_at: new Date().toISOString() },
    ];
    saveLocalData(data);
  }
  return data;
}

// ── تولید کد سفارش ──
export function generateOrderCode() {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `SEL-${ymd}-${rand}`;
}

// ── محاسبه قیمت ──
export function calculatePricing(basePrice, markup, commissionRate = 50) {
  const markupAmount = markup.amount || 0;
  const markupPercent = markup.percent || 0;
  const markupFromPercent = Math.round(basePrice * markupPercent / 100);
  const totalMarkup = markupAmount + markupFromPercent;
  const salePrice = basePrice + totalMarkup;
  const creatorShare = Math.round(totalMarkup * (100 - commissionRate) / 100);
  const sellerShare = Math.round(totalMarkup * commissionRate / 100);
  return { base_price: basePrice, sale_price: salePrice, creator_share: creatorShare, seller_share: sellerShare, markup_amount: totalMarkup, markup_percent: markupPercent };
}

// ════════════════════════════════════════════
// PROFILES
// ════════════════════════════════════════════

export async function loadSellerProfiles() {
  const useSb = await checkSupabaseTables();
  if (useSb && !isMockMode()) {
    const { data, error } = await supabase.from('seller_profiles').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  }
  return seedLocalData().profiles;
}

export async function loadApprovedSellers() {
  const all = await loadSellerProfiles();
  return all.filter(p => p.status === 'approved');
}

export async function updateSellerStatus(profileId, status, notes) {
  const useSb = await checkSupabaseTables();
  if (useSb && !isMockMode()) {
    const updates = { status, updated_at: new Date().toISOString() };
    if (status === 'approved') updates.approved_at = new Date().toISOString();
    if (notes !== undefined) updates.notes = notes;
    const { data, error } = await supabase.from('seller_profiles').update(updates).eq('id', profileId).select().single();
    if (error) throw new Error(error.message);
    return data;
  }
  const local = getLocalData();
  const p = local.profiles.find(x => String(x.id) === String(profileId));
  if (p) {
    p.status = status;
    if (status === 'approved') p.approved_at = new Date().toISOString();
    if (notes !== undefined) p.notes = notes;
    saveLocalData(local);
  }
  return p;
}

export async function createSellerProfile(data) {
  const useSb = await checkSupabaseTables();
  if (useSb && !isMockMode()) {
    const { data: result, error } = await supabase.from('seller_profiles').insert(data).select().single();
    if (error) throw new Error(error.message);
    return result;
  }
  const local = getLocalData();
  const rec = { ...data, id: `sp-${Date.now()}`, status: data.status || 'pending', total_orders: 0, total_sales: 0, total_commission: 0, created_at: new Date().toISOString() };
  local.profiles.push(rec);
  saveLocalData(local);
  return rec;
}

// ════════════════════════════════════════════
// ORDERS
// ════════════════════════════════════════════

export async function createSellerOrder(payload) {
  const orderCode = generateOrderCode();
  const pricing = calculatePricing(payload.base_price, payload.markup || DEFAULT_MARKUP, payload.commission_rate || 50);

  const order = {
    order_code: orderCode,
    customer_id: payload.customer_id,
    customer_name: payload.customer_name || '',
    phone_number: payload.phone_number,
    product_key: payload.product_key || '',
    product_name: payload.product_name,
    operator_key: payload.operator_key || '',
    operator_name: payload.operator_name || '',
    package_type: payload.package_type || 'credit',
    base_price: pricing.base_price,
    sale_price: pricing.sale_price,
    creator_share: pricing.creator_share,
    seller_share: pricing.seller_share,
    currency: payload.currency || 'AFN',
    status: 'pending',
    markup_amount: pricing.markup_amount,
    markup_percent: pricing.markup_percent,
  };

  const useSb = await checkSupabaseTables();
  if (useSb && !isMockMode()) {
    const { data, error } = await supabase.from('seller_orders').insert(order).select().single();
    if (error) throw new Error(error.message);
    // ثبت رویداد
    try {
      await supabase.from('seller_order_events').insert({
        order_id: String(data.id), order_code: orderCode, event_type: 'created',
        actor_id: payload.customer_id, actor_name: payload.customer_name || '', actor_role: 'customer',
        previous_status: '', new_status: 'pending',
      });
    } catch { /* non-critical */ }
    return data;
  }

  const local = getLocalData();
  const rec = { ...order, id: `so-${Date.now()}`, created_at: new Date().toISOString() };
  local.orders.push(rec);
  local.events.push({ id: `ev-${Date.now()}`, order_id: rec.id, order_code: orderCode, event_type: 'created', actor_id: payload.customer_id, actor_name: payload.customer_name || '', actor_role: 'customer', previous_status: '', new_status: 'pending', created_at: new Date().toISOString() });
  saveLocalData(local);
  return rec;
}

export async function loadAvailableOrders() {
  const useSb = await checkSupabaseTables();
  if (useSb && !isMockMode()) {
    const { data, error } = await supabase.from('seller_orders').select('*').eq('status', 'pending').order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
  }
  return getLocalData().orders.filter(o => o.status === 'pending');
}

export async function loadSellerOrders(sellerId) {
  const useSb = await checkSupabaseTables();
  if (useSb && !isMockMode()) {
    const { data, error } = await supabase.from('seller_orders').select('*').eq('seller_id', sellerId).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  }
  return getLocalData().orders.filter(o => o.seller_id === sellerId);
}

export async function loadCustomerOrders(customerId) {
  const useSb = await checkSupabaseTables();
  if (useSb && !isMockMode()) {
    const { data, error } = await supabase.from('seller_orders').select('*').eq('customer_id', customerId).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  }
  return getLocalData().orders.filter(o => o.customer_id === customerId);
}

export async function loadAllOrders() {
  const useSb = await checkSupabaseTables();
  if (useSb && !isMockMode()) {
    const { data, error } = await supabase.from('seller_orders').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  }
  return getLocalData().orders;
}

// ── پذیرش اتمی سفارش ──
// اگر RPC موجود باشد از آن استفاده می‌کنیم؛ در غیر این صورت UPDATE شرطی
export async function acceptOrder(orderId, sellerId, sellerName) {
  const useSb = await checkSupabaseTables();
  if (useSb && !isMockMode()) {
    // تلاش با RPC
    try {
      const { data: rpcResult, error: rpcErr } = await supabase.rpc('accept_seller_order', {
        p_order_id: Number(orderId),
        p_seller_id: sellerId,
        p_seller_name: sellerName,
      });
      if (!rpcErr && rpcResult?.success) return { success: true, orderId };
      if (!rpcErr && rpcResult) return rpcResult;
    } catch { /* RPC ممکن است موجود نباشد — ادامه با UPDATE شرطی */ }

    // UPDATE شرطی اتمی — فقط اگر seller_id خالی و وضعیت pending باشد
    const { data, error } = await supabase
      .from('seller_orders')
      .update({
        seller_id: sellerId,
        seller_name: sellerName,
        status: 'assigned',
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .is('seller_id', null)
      .eq('status', 'pending')
      .select()
      .single();

    if (error) throw new Error(error.message);
    if (!data) return { success: false, error: 'order_already_taken' };

    // ثبت رویداد
    try {
      await supabase.from('seller_order_events').insert({
        order_id: String(orderId), order_code: data.order_code, event_type: 'assigned',
        actor_id: sellerId, actor_name: sellerName, actor_role: 'seller',
        previous_status: 'pending', new_status: 'assigned',
      });
    } catch { /* non-critical */ }
    return { success: true, orderId };
  }

  // حالت محلی — اتمی در سطح JS
  const local = getLocalData();
  const order = local.orders.find(o => String(o.id) === String(orderId));
  if (!order || order.status !== 'pending' || order.seller_id) {
    return { success: false, error: 'order_already_taken' };
  }
  order.seller_id = sellerId;
  order.seller_name = sellerName;
  order.status = 'assigned';
  order.accepted_at = new Date().toISOString();
  local.events.push({ id: `ev-${Date.now()}`, order_id: order.id, order_code: order.order_code, event_type: 'assigned', actor_id: sellerId, actor_name: sellerName, actor_role: 'seller', previous_status: 'pending', new_status: 'assigned', created_at: new Date().toISOString() });
  saveLocalData(local);
  return { success: true, orderId };
}

// ── به‌روزرسانی وضعیت سفارش توسط فروشنده ──
export async function updateOrderStatus(orderId, newStatus, sellerId, sellerName, extra = {}) {
  const useSb = await checkSupabaseTables();
  if (useSb && !isMockMode()) {
    const updates = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === 'completed') updates.completed_at = new Date().toISOString();
    if (newStatus === 'completed') updates.tracking_ref = extra.tracking_ref || '';
    if (newStatus === 'failed') updates.failure_reason = extra.failure_reason || '';

    const { data, error } = await supabase
      .from('seller_orders')
      .update(updates)
      .eq('id', orderId)
      .eq('seller_id', sellerId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    if (!data) return { success: false, error: 'not_authorized_or_not_found' };

    const eventType = newStatus === 'in_progress' ? 'in_progress' : newStatus === 'completed' ? 'completed' : newStatus === 'failed' ? 'failed' : 'released';
    try {
      await supabase.from('seller_order_events').insert({
        order_id: String(orderId), order_code: data.order_code, event_type: eventType,
        actor_id: sellerId, actor_name: sellerName, actor_role: 'seller',
        previous_status: data.status, new_status: newStatus, details: extra.tracking_ref || extra.failure_reason || '',
      });
    } catch { /* non-critical */ }
    return { success: true, order: data };
  }

  const local = getLocalData();
  const order = local.orders.find(o => String(o.id) === String(orderId));
  if (!order || order.seller_id !== sellerId) return { success: false, error: 'not_authorized' };
  const prevStatus = order.status;
  order.status = newStatus;
  if (newStatus === 'completed') { order.completed_at = new Date().toISOString(); if (extra.tracking_ref) order.tracking_ref = extra.tracking_ref; }
  if (newStatus === 'failed' && extra.failure_reason) order.failure_reason = extra.failure_reason;
  local.events.push({ id: `ev-${Date.now()}`, order_id: order.id, order_code: order.order_code, event_type: newStatus === 'in_progress' ? 'in_progress' : newStatus, actor_id: sellerId, actor_name: sellerName, actor_role: 'seller', previous_status: prevStatus, new_status: newStatus, details: extra.tracking_ref || extra.failure_reason || '', created_at: new Date().toISOString() });
  saveLocalData(local);
  return { success: true, order };
}

// ── آزادسازی سفارش توسط سازنده ──
export async function releaseOrder(orderId, actorId, actorName, reason) {
  const useSb = await checkSupabaseTables();
  if (useSb && !isMockMode()) {
    const { data, error } = await supabase
      .from('seller_orders')
      .update({ seller_id: null, seller_name: null, status: 'pending', accepted_at: null, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    try {
      await supabase.from('seller_order_events').insert({
        order_id: String(orderId), order_code: data?.order_code, event_type: 'released',
        actor_id: actorId, actor_name: actorName, actor_role: 'creator',
        details: reason, previous_status: 'assigned', new_status: 'pending',
      });
    } catch { /* non-critical */ }
    return { success: true };
  }
  const local = getLocalData();
  const order = local.orders.find(o => String(o.id) === String(orderId));
  if (order) { order.seller_id = null; order.seller_name = null; order.status = 'pending'; order.accepted_at = null; }
  local.events.push({ id: `ev-${Date.now()}`, order_id: order?.id, order_code: order?.order_code, event_type: 'released', actor_id: actorId, actor_name: actorName, actor_role: 'creator', details: reason, created_at: new Date().toISOString() });
  saveLocalData(local);
  return { success: true };
}

// ── رویدادهای سفارش ──
export async function loadOrderEvents(orderId) {
  const useSb = await checkSupabaseTables();
  if (useSb && !isMockMode()) {
    const { data, error } = await supabase.from('seller_order_events').select('*').eq('order_id', String(orderId)).order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
  }
  return getLocalData().events.filter(e => String(e.order_id) === String(orderId));
}

// ── تنظیمات قیمت‌گذاری ──
export async function loadPricingSettings() {
  const useSb = await checkSupabaseTables();
  if (useSb && !isMockMode()) {
    const { data, error } = await supabase.from('app_settings').select('*').eq('setting_key', 'seller_markup').maybeSingle();
    if (error) throw new Error(error.message);
    if (data?.setting_value) {
      try { return { ...DEFAULT_MARKUP, ...JSON.parse(data.setting_value) }; } catch { /* ignore */ }
    }
  }
  return getLocalData().settings || DEFAULT_MARKUP;
}

export async function savePricingSettings(settings) {
  const useSb = await checkSupabaseTables();
  if (useSb && !isMockMode()) {
    const { error } = await supabase.from('app_settings').upsert({
      setting_key: 'seller_markup',
      setting_value: JSON.stringify(settings),
    }, { onConflict: 'setting_key' });
    if (error) throw new Error(error.message);
    return settings;
  }
  const local = getLocalData();
  local.settings = settings;
  saveLocalData(local);
  return settings;
}

// ── بررسی دسترسی فروشنده ──
export async function checkSellerAccess(userId) {
  const profiles = await loadSellerProfiles();
  const profile = profiles.find(p => p.user_id === userId);
  if (!profile) return { isSeller: false, profile: null };
  return { isSeller: profile.status === 'approved', profile };
}