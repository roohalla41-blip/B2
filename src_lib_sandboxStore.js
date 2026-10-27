// ============================================================
// sandboxStore.js — لایهٔ دادهٔ کاملاً محلی برای محیط آزمایشی
// هیچ تماسی با Supabase، Base44 entities یا Integration ندارد.
// فضای نام جداگانه در localStorage؛ مستقل از auth_user/auth_token.
// ============================================================

const STORAGE_KEY = 'sandbox_experimental_v1';
const SESSION_KEY = 'sandbox_session_v1';

const DEFAULT_SERVICES = [
  { key: 'recharge_awcc', name: 'شارژ AWCC ۱۰۰ افغانی', amount: 100, category: 'recharge' },
  { key: 'recharge_roshan', name: 'شارژ Roshan ۲۰۰ افغانی', amount: 200, category: 'recharge' },
  { key: 'uc_60', name: '۶۰ UC پابجی موبایل', amount: 90, category: 'games' },
  { key: 'uc_325', name: '۳۲۵ UC پابجی موبایل', amount: 450, category: 'games' },
  { key: 'imo_100', name: '۱۰۰ الماس IMO', amount: 120, category: 'games' },
  { key: 'net_5gb', name: 'بسته اینترنت ۵ گیگابایت', amount: 250, category: 'internet' },
];

const DEFAULT_STATE = {
  settings: {
    min_credit_for_seller_request: 500,
    dispute_window_hours: 4,
    seller_credit_limit: 5000,
  },
  identities: {
    customer: {
      id: 'demo-customer',
      name: 'مشتری آزمایشی',
      phone: '0700000000',
      role: 'customer',
      balance: 0,
    },
    seller: {
      id: 'demo-seller',
      name: 'فروشنده آزمایشی',
      phone: '0700000001',
      role: 'seller',
      balance: 0,
    },
  },
  accounts: [], // { id, username, password, role, name, phone, balance, created_at }
  seller_requests: [],
  sellers: [], // { id, code, name, status, credit_limit, approved_at }
  orders: [],
  order_events: [],
  wallet_ledger: [], // { id, user_id, type: credit|debit, amount, seller_code, date, description, receipt_ref, order_id? }
  wallet_topup_requests: [], // { id, user_id, user_name, amount, receipt_ref, description, status: pending|approved|rejected, created_at, reviewed_at, reviewed_by, processed }
  disputes: [],
  dispute_messages: [],
  dispute_events: [],
};

// ── نشست آزمایشی ──
export function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setSession(account) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(account)); } catch { /* ignore */ }
}

export function clearSession() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

// ─ـ مدیریت حساب‌های آزمایشی ──
export function createAccount({ username, password, role, name, phone }) {
  const s = load();
  if (s.accounts.find(a => a.username === username)) {
    return { ok: false, error: 'این نام کاربری قبلاً ثبت شده' };
  }
  const account = {
    id: uid('ACC'), username, password, role, name: name || username,
    phone: phone || '', balance: 0,
    created_at: nowISO(),
  };
  s.accounts.push(account);
  save(s);
  return { ok: true, state: s, account };
}

export function loginAccount(username, password) {
  const s = load();
  const acc = s.accounts.find(a => a.username === username && a.password === password);
  if (!acc) return { ok: false, error: 'نام کاربری یا رمز عبور اشتباه است' };
  const session = { id: acc.id, username: acc.username, role: acc.role, name: acc.name, phone: acc.phone, balance: acc.balance };
  setSession(session);
  return { ok: true, session };
}

export function logoutAccount() {
  clearSession();
}

export function deleteAccount(account_id) {
  const s = load();
  s.accounts = s.accounts.filter(a => a.id !== account_id);
  save(s);
  return { ok: true, state: s };
}

export function updateAccountBalance(account_id, amount) {
  const s = load();
  const acc = s.accounts.find(a => a.id === account_id);
  if (!acc) return { ok: false, error: 'حساب یافت نشد' };
  acc.balance += amount;
  save(s);
  // به‌روزرسانی نشست اگر همین حساب است
  const session = getSession();
  if (session && session.id === account_id) {
    session.balance = acc.balance;
    setSession(session);
  }
  return { ok: true, state: s };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(DEFAULT_STATE), ...parsed,
      settings: { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) },
      identities: { ...DEFAULT_STATE.identities, ...(parsed.identities || {}) },
    };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function save(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore quota */ }
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function nowISO() { return new Date().toISOString(); }

function genSellerCode(sellers) {
  const n = (sellers?.length || 0) + 1;
  return `V-${String(n).padStart(3, '0')}`;
}

// ── اعمال ──
export function resetSandbox() {
  save(structuredClone(DEFAULT_STATE));
}

export function getState() { return load(); }

export function updateSettings(partial) {
  const s = load();
  s.settings = { ...s.settings, ...partial };
  save(s);
  return s;
}

export function topUpWallet({ user_id, amount, seller_code, description, receipt_ref }) {
  const s = load();
  const id = uid('TX');
  const entry = {
    id, user_id, type: 'credit', amount: Number(amount),
    seller_code: seller_code || null, date: nowISO(),
    description: description || 'افزایش موجودی آزمایشی', receipt_ref: receipt_ref || '',
  };
  s.wallet_ledger.push(entry);
  if (s.identities.customer.id === user_id) s.identities.customer.balance += entry.amount;
  if (s.identities.seller.id === user_id) s.identities.seller.balance += entry.amount;
  save(s);
  return s;
}

export function getBalance(user_id) {
  const s = load();
  if (s.identities.customer.id === user_id) return s.identities.customer.balance;
  if (s.identities.seller.id === user_id) return s.identities.seller.balance;
  const acc = s.accounts.find(a => a.id === user_id);
  return acc ? acc.balance : 0;
}

// ── درخواست افزایش موجودی با رسید ──
export function submitTopupRequest({ user_id, user_name, amount, receipt_ref, description }) {
  const s = load();
  const amt = Number(amount);
  if (!amt || amt <= 0) return { ok: false, error: 'مبلغ نامعتبر است' };
  if (!receipt_ref || !receipt_ref.trim()) return { ok: false, error: 'ارسال رسید الزامی است' };
  const req = {
    id: uid('TR'), user_id, user_name, amount: amt,
    receipt_ref: receipt_ref.trim(), description: description || '',
    status: 'pending', created_at: nowISO(),
    reviewed_at: null, reviewed_by: null, processed: false,
  };
  s.wallet_topup_requests.push(req);
  save(s);
  return { ok: true, state: s };
}

// ─ـ بررسی درخواست افزایش موجودی توسط مدیر (idempotent) ──
// decision: 'approved' | 'rejected'
// opts: { corrected_amount?: number, reject_reason?: string }
export function reviewTopupRequest(request_id, decision, admin_name, opts = {}) {
  const s = load();
  const req = s.wallet_topup_requests.find(r => r.id === request_id);
  if (!req) return { ok: false, error: 'درخواست یافت نشد' };
  if (req.status !== 'pending') return { ok: false, error: 'این درخواست قبلاً بررسی شده' };
  req.status = decision;
  req.reviewed_at = nowISO(); req.reviewed_by = admin_name;
  if (decision === 'approved') {
    const finalAmount = opts.corrected_amount ? Number(opts.corrected_amount) : req.amount;
    req.original_amount = req.amount;
    req.approved_amount = finalAmount;
    req.reject_reason = null;
    if (!req.processed) {
      req.processed = true;
      const acc = s.accounts.find(a => a.id === req.user_id);
      if (acc) {
        acc.balance += finalAmount;
        const session = getSession();
        if (session && session.id === req.user_id) {
          session.balance = acc.balance;
          setSession(session);
        }
      }
      if (s.identities.customer.id === req.user_id) s.identities.customer.balance += finalAmount;
      if (s.identities.seller.id === req.user_id) s.identities.seller.balance += finalAmount;
      s.wallet_ledger.push({
        id: uid('TX'), user_id: req.user_id, type: 'credit', amount: finalAmount,
        seller_code: null, date: nowISO(),
        description: `افزایش موجودی — تأیید مدیر (${req.receipt_ref})`,
        receipt_ref: req.receipt_ref,
      });
    }
  } else if (decision === 'rejected') {
    req.reject_reason = opts.reject_reason || 'بدون توضیح';
  }
  save(s);
  return { ok: true, state: s };
}

export function submitSellerRequest({ user_id, user_name, reason }) {
  const s = load();
  const balance = getBalance(user_id);
  const req = {
    id: uid('SR'), user_id, user_name, reason: reason || '',
    balance_at_request: balance, status: 'pending', created_at: nowISO(),
  };
  s.seller_requests.push(req);
  save(s);
  return { ok: true, state: s };
}

export function reviewSellerRequest(request_id, decision, creator_name, opts = {}) {
  const s = load();
  const req = s.seller_requests.find(r => r.id === request_id);
  if (!req) return { ok: false, error: 'درخواست یافت نشد' };
  req.status = decision; // approved | rejected
  req.reviewed_at = nowISO(); req.reviewed_by = creator_name;
  req.reject_reason = decision === 'rejected' ? (opts.reject_reason || 'بدون توضیح') : null;
  if (decision === 'approved') {
    const code = genSellerCode(s.sellers);
    s.sellers.push({
      id: req.user_id, code, name: req.user_name, status: 'active',
      credit_limit: s.settings.seller_credit_limit, approved_at: nowISO(),
      total_orders: 0, total_sales: 0,
    });
    // ارتقای نقش حساب به فروشنده
    const acc = s.accounts.find(a => a.id === req.user_id);
    if (acc) {
      acc.role = 'seller';
      const session = getSession();
      if (session && session.id === req.user_id) {
        session.role = 'seller';
        setSession(session);
      }
    }
  }
  save(s);
  return { ok: true, state: s };
}

export function createOrder({ customer_id, customer_name, service_key, phone, seller_id }) {
  const s = load();
  const svc = DEFAULT_SERVICES.find(x => x.key === service_key);
  if (!svc) return { ok: false, error: 'خدمت یافت نشد' };
  const balance = getBalance(customer_id);
  if (balance < svc.amount) return { ok: false, error: 'موجودی کافی نیست', balance, required: svc.amount };
  // بررسی فروشندهٔ مقصد
  let targetSeller = null;
  if (seller_id) {
    targetSeller = s.sellers.find(sl => sl.id === seller_id);
    if (!targetSeller) return { ok: false, error: 'فروشندهٔ انتخاب‌شده تأیید نشده است' };
    if (targetSeller.status !== 'active') return { ok: false, error: 'فروشندهٔ انتخاب‌شده فعال نیست' };
  }
  const idempotency = uid('WD');
  const order = {
    id: uid('ORD'), order_code: `EXP-${Date.now().toString(36).toUpperCase()}`,
    customer_id, customer_name, phone, service_key: svc.key, service_name: svc.name,
    amount: svc.amount, category: svc.category, status: 'pending',
    created_at: nowISO(), accepted_at: null, completed_at: null,
    seller_id: null, seller_code: null, seller_name: null,
    target_seller_id: seller_id || null, // فروشندهٔ مشخص انتخاب‌شده توسط مشتری
    receipt_ref: null, seller_notes: null,
  };
  // کسر از موجودی حساب واقعی مشتری
  const buyerAcc = s.accounts.find(a => a.id === customer_id);
  if (buyerAcc) buyerAcc.balance -= svc.amount;
  if (s.identities.customer.id === customer_id) s.identities.customer.balance -= svc.amount;
  s.wallet_ledger.push({
    id: idempotency, user_id: customer_id, type: 'debit', amount: svc.amount,
    seller_code: null, date: nowISO(), description: `کسر سفارش ${order.order_code}`,
    receipt_ref: '', order_id: order.id,
  });
  // اگر فروشندهٔ مشخص انتخاب شده، سفارش مستقیماً به او ارجاع می‌شود
  if (targetSeller) {
    order.seller_id = targetSeller.id; order.seller_code = targetSeller.code; order.seller_name = targetSeller.name;
    order.status = 'assigned'; order.accepted_at = nowISO();
    s.order_events.push({ id: uid('EV'), order_id: order.id, event_type: 'created', actor: customer_name, details: 'سفارش برای فروشندهٔ مشخص ثبت شد', created_at: nowISO(), previous_status: null, new_status: 'pending' });
    s.order_events.push({ id: uid('EV'), order_id: order.id, event_type: 'assigned', actor: 'سیستم', details: `ارجاع خودکار به فروشندهٔ ${targetSeller.code}`, created_at: nowISO(), previous_status: 'pending', new_status: 'assigned' });
  } else {
    s.order_events.push({ id: uid('EV'), order_id: order.id, event_type: 'created', actor: customer_name, details: 'سفارش ثبت شد', created_at: nowISO(), previous_status: null, new_status: 'pending' });
  }
  s.orders.push(order);
  save(s);
  return { ok: true, state: s, order };
}

export function acceptOrder(order_id, seller) {
  const s = load();
  const order = s.orders.find(o => o.id === order_id);
  if (!order) return { ok: false, error: 'سفارش یافت نشد' };
  if (order.status !== 'pending') return { ok: false, error: 'سفارش قبلاً پذیرفته شده' };
  const sellerProfile = s.sellers.find(sl => sl.id === seller.id);
  if (!sellerProfile) return { ok: false, error: 'فروشندهٔ تأییدشده نیستید' };
  order.seller_id = seller.id; order.seller_code = sellerProfile.code; order.seller_name = sellerProfile.name;
  order.status = 'assigned'; order.accepted_at = nowISO();
  s.order_events.push({ id: uid('EV'), order_id, event_type: 'assigned', actor: seller.name, details: `فروشنده ${sellerProfile.code} قبول کرد`, created_at: nowISO(), previous_status: 'pending', new_status: 'assigned' });
  save(s);
  return { ok: true, state: s };
}

export function completeOrder(order_id, seller, { receipt_ref, notes }) {
  const s = load();
  const order = s.orders.find(o => o.id === order_id);
  if (!order) return { ok: false, error: 'سفارش یافت نشد' };
  if (order.seller_id !== seller.id) return { ok: false, error: 'این سفارش به شما تعلق ندارد' };
  if (order.status !== 'assigned') return { ok: false, error: 'وضعیت سفارش مناسب نیست' };
  order.status = 'completed'; order.completed_at = nowISO();
  order.receipt_ref = receipt_ref || 'رسید نمونه'; order.seller_notes = notes || '';
  const sp = s.sellers.find(sl => sl.id === seller.id);
  if (sp) { sp.total_orders += 1; sp.total_sales += order.amount; }
  s.order_events.push({ id: uid('EV'), order_id, event_type: 'completed', actor: seller.name, details: 'انجام ثبت شد', created_at: nowISO(), previous_status: 'assigned', new_status: 'completed' });
  save(s);
  return { ok: true, state: s };
}

export function reportProblem(order_id, customer, message) {
  const s = load();
  const order = s.orders.find(o => o.id === order_id);
  if (!order) return { ok: false, error: 'سفارش یافت نشد' };
  if (order.customer_id !== customer.id) return { ok: false, error: 'این سفارش متعلق به شما نیست' };
  if (order.status !== 'completed') return { ok: false, error: 'فروشنده هنوز انجام را تأیید نکرده' };
  const dispute = {
    id: uid('DSP'), order_id, order_code: order.order_code,
    customer_id: customer.id, customer_name: customer.name,
    seller_id: order.seller_id, seller_code: order.seller_code, seller_name: order.seller_name,
    service_name: order.service_name, amount: order.amount,
    status: 'open', created_at: nowISO(), resolved_at: null,
    resolution: null, resolution_reason: null, resolved_by: null,
  };
  s.disputes.push(dispute);
  s.dispute_messages.push({ id: uid('DM'), dispute_id: dispute.id, sender_id: customer.id, sender_name: customer.name, sender_role: 'customer', message, created_at: nowISO() });
  s.dispute_events.push({ id: uid('DE'), dispute_id: dispute.id, event_type: 'opened', actor: customer.name, details: message, created_at: nowISO() });
  save(s);
  return { ok: true, state: s };
}

export function addDisputeMessage(dispute_id, sender, message) {
  const s = load();
  s.dispute_messages.push({ id: uid('DM'), dispute_id, sender_id: sender.id, sender_name: sender.name, sender_role: sender.role || 'creator', message, created_at: nowISO() });
  save(s);
  return s;
}

export function resolveDispute(dispute_id, resolution, reason, creator_name) {
  const s = load();
  const d = s.disputes.find(x => x.id === dispute_id);
  if (!d) return { ok: false, error: 'پرونده یافت نشد' };
  d.status = 'resolved'; d.resolution = resolution; d.resolution_reason = reason;
  d.resolved_at = nowISO(); d.resolved_by = creator_name;
  s.dispute_events.push({ id: uid('DE'), dispute_id, event_type: 'resolved', actor: creator_name, details: `${resolution}: ${reason}`, created_at: nowISO() });
  save(s);
  return { ok: true, state: s };
}

export { DEFAULT_SERVICES, DEFAULT_STATE };