-- ============================================================
-- supabase-seller-system.sql
-- سیستم فروشندگان حساب صراف — جداول، RLS و RPC
-- اجرا در Supabase SQL Editor
-- ============================================================

-- ── ۱. جدول پروفایل فروشندگان ──
CREATE TABLE IF NOT EXISTS seller_profiles (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  phone TEXT,
  exchange_code TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended')),
  commission_rate NUMERIC DEFAULT 50,
  total_orders INTEGER DEFAULT 0,
  total_sales NUMERIC DEFAULT 0,
  total_commission NUMERIC DEFAULT 0,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seller_profiles_user_id ON seller_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_status ON seller_profiles(status);

-- ── ۲. جدول سفارشات فروشندگان ──
CREATE TABLE IF NOT EXISTS seller_orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_code TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL,
  customer_name TEXT,
  phone_number TEXT NOT NULL,
  product_key TEXT,
  product_name TEXT NOT NULL,
  operator_key TEXT,
  operator_name TEXT,
  package_type TEXT DEFAULT 'credit',
  base_price NUMERIC DEFAULT 0,
  sale_price NUMERIC DEFAULT 0,
  creator_share NUMERIC DEFAULT 0,
  seller_share NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'AFN',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'failed', 'disputed')),
  seller_id TEXT,
  seller_name TEXT,
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  tracking_ref TEXT,
  failure_reason TEXT,
  markup_amount NUMERIC DEFAULT 0,
  markup_percent NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seller_orders_status ON seller_orders(status);
CREATE INDEX IF NOT EXISTS idx_seller_orders_customer ON seller_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_seller_orders_seller ON seller_orders(seller_id);

-- ── ۳. جدول رویدادهای سفارش (append-only) ──
CREATE TABLE IF NOT EXISTS seller_order_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id TEXT NOT NULL,
  order_code TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'assigned', 'in_progress', 'completed', 'failed', 'released', 'disputed')),
  actor_id TEXT,
  actor_name TEXT,
  actor_role TEXT,
  details TEXT,
  previous_status TEXT,
  new_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seller_events_order ON seller_order_events(order_id);

-- ── ۴. جدول تسویه ماهانه (مرحله بعد) ──
CREATE TABLE IF NOT EXISTS seller_settlements (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  seller_id TEXT NOT NULL,
  seller_name TEXT,
  period_month TEXT NOT NULL,
  total_orders INTEGER DEFAULT 0,
  successful_orders INTEGER DEFAULT 0,
  failed_orders INTEGER DEFAULT 0,
  total_sales NUMERIC DEFAULT 0,
  total_base_cost NUMERIC DEFAULT 0,
  creator_share NUMERIC DEFAULT 0,
  seller_share NUMERIC DEFAULT 0,
  refunded_amount NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  remaining_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
  payment_method TEXT,
  payment_ref TEXT,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE seller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_settlements ENABLE ROW LEVEL SECURITY;

-- ── seller_profiles: خواندن ──
-- سازنده/مدیر همه را می‌بیند؛ فروشنده فقط پروفایل خودش را
CREATE POLICY seller_profiles_read ON seller_profiles FOR SELECT
  USING (
    auth.jwt() ->> 'role' IN ('creator', 'admin')
    OR user_id = (auth.jwt() ->> 'sub')
  );

CREATE POLICY seller_profiles_write ON seller_profiles FOR ALL
  USING (auth.jwt() ->> 'role' IN ('creator', 'admin'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('creator', 'admin'));

-- ── seller_orders: خواندن ──
-- مشتری سفارش‌های خودش، فروشنده سفارش‌های تخصیص‌یافته، سازنده/مدیر همه
CREATE POLICY seller_orders_read ON seller_orders FOR SELECT
  USING (
    auth.jwt() ->> 'role' IN ('creator', 'admin')
    OR customer_id = (auth.jwt() ->> 'sub')
    OR seller_id = (auth.jwt() ->> 'sub')
  );

-- مشتری می‌تواند سفارش بسازد
CREATE POLICY seller_orders_insert ON seller_orders FOR INSERT
  WITH CHECK (customer_id = (auth.jwt() ->> 'sub') OR auth.jwt() ->> 'role' IN ('creator', 'admin'));

-- فروشنده می‌تواند سفارش خودش را به‌روزرسانی کند (تغییر وضعیت)
CREATE POLICY seller_orders_update ON seller_orders FOR UPDATE
  USING (
    seller_id = (auth.jwt() ->> 'sub')
    OR auth.jwt() ->> 'role' IN ('creator', 'admin')
  );

-- ── seller_order_events: append-only ──
CREATE POLICY seller_events_read ON seller_order_events FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('creator', 'admin'));

CREATE POLICY seller_events_insert ON seller_order_events FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- RPC: پذیرش اتمی سفارش
-- فقط اولین فروشنده‌ای که قبول می‌زند موفق می‌شود
-- ============================================================
CREATE OR REPLACE FUNCTION accept_seller_order(
  p_order_id BIGINT,
  p_seller_id TEXT,
  p_seller_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_updated INTEGER;
BEGIN
  -- قفل ردیف و بررسی وضعیت
  SELECT * INTO v_order
  FROM seller_orders
  WHERE id = p_order_id AND status = 'pending' AND seller_id IS NULL
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_already_taken_or_not_found');
  END IF;

  -- تخصیص اتمی
  UPDATE seller_orders
  SET seller_id = p_seller_id,
      seller_name = p_seller_name,
      status = 'assigned',
      accepted_at = now(),
      updated_at = now()
  WHERE id = p_order_id AND status = 'pending' AND seller_id IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'concurrent_accept_failed');
  END IF;

  -- ثبت رویداد
  INSERT INTO seller_order_events (order_id, order_code, event_type, actor_id, actor_name, previous_status, new_status)
  VALUES (p_order_id::TEXT, v_order.order_code, 'assigned', p_seller_id, p_seller_name, 'pending', 'assigned');

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id);
END;
$$;

-- ============================================================
-- داده‌های نمونه آزمایشی
-- ============================================================
INSERT INTO seller_profiles (user_id, user_name, phone, status, commission_rate)
SELECT 'demo-seller-1', 'فروشنده نمونه ۱', '0799000001', 'approved', 50
WHERE NOT EXISTS (SELECT 1 FROM seller_profiles WHERE user_id = 'demo-seller-1');

INSERT INTO seller_profiles (user_id, user_name, phone, status, commission_rate)
SELECT 'demo-seller-2', 'فروشنده نمونه ۲', '0799000002', 'approved', 50
WHERE NOT EXISTS (SELECT 1 FROM seller_profiles WHERE user_id = 'demo-seller-2');

-- محصولات نمونه
-- (محصولات از جدول online_products موجود استفاده می‌شوند)
