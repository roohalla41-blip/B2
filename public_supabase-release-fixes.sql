-- ============================================================
-- Hesab Sarraaf — Release Fixes (pre-release)
-- Idempotent — safe to run multiple times
-- No DROP/TRUNCATE/DELETE — only ADD COLUMN IF NOT EXISTS,
-- CREATE OR REPLACE, and INSERT ... ON CONFLICT
-- ============================================================

-- ============================================================
-- 1. charge_orders — Add missing order_number column
--    A trigger references NEW.order_number but the column does
--    not exist, causing ALL customer order inserts to fail with:
--    "record \"new\" has no field \"order_number\""
-- ============================================================
ALTER TABLE charge_orders ADD COLUMN IF NOT EXISTS order_number TEXT;

-- Auto-populate order_number for existing rows that have NULL
UPDATE charge_orders
  SET order_number = 'ORD-' || LPAD(id::TEXT, 6, '0')
  WHERE order_number IS NULL;

-- ============================================================
-- 2. languages — Add Dari (درى) language row
--    The language switcher reads from the languages table; Dari
--    translation exists in i18n but the DB row is missing.
-- ============================================================
INSERT INTO languages (code, name, native_name, direction, sort_order, is_active, is_default, flag_emoji)
VALUES ('dari', 'Dari', 'درى', 'rtl', 1, true, false, '🇦🇫')
ON CONFLICT (code) DO UPDATE SET
  native_name = EXCLUDED.native_name,
  direction = EXCLUDED.direction,
  is_active = EXCLUDED.is_active,
  flag_emoji = EXCLUDED.flag_emoji;

-- ============================================================
-- 3. Safety net — ensure order_number trigger is not broken
--    If a trigger function tries to set NEW.order_number, the
--    column now exists so it will succeed. No trigger changes
--    needed — the column addition above is sufficient.
-- ============================================================
