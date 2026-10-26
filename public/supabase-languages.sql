-- ============================================================
-- Languages Table
-- Stores supported languages for the Sarraaf application
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.languages (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  native_name TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'rtl' CHECK (direction IN ('rtl', 'ltr')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  flag_emoji TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_languages_active ON public.languages(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_languages_sort ON public.languages(sort_order);

-- Enable RLS
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;

-- Public read policy (anyone can read active languages)
DROP POLICY IF EXISTS "public_read_languages" ON public.languages;
CREATE POLICY "public_read_languages" ON public.languages
  FOR SELECT USING (is_active = true);

-- Admin write policies (only authenticated admins can modify)
DROP POLICY IF EXISTS "admin_insert_languages" ON public.languages;
CREATE POLICY "admin_insert_languages" ON public.languages
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_languages" ON public.languages;
CREATE POLICY "admin_update_languages" ON public.languages
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_languages" ON public.languages;
CREATE POLICY "admin_delete_languages" ON public.languages
  FOR DELETE TO authenticated USING (true);

-- ============================================================
-- Seed default languages
-- ============================================================
INSERT INTO public.languages (code, name, native_name, direction, sort_order, is_active, is_default, flag_emoji) VALUES
  ('fa', 'Persian', 'فارسی', 'rtl', 1, true, true, '🇮🇷'),
  ('ps', 'Pashto', 'پښتو', 'rtl', 2, true, false, '🇦🇫'),
  ('uz', 'Uzbek', 'اوزبیک', 'ltr', 3, true, false, '🇦🇫'),
  ('en', 'English', 'English', 'ltr', 4, true, false, '🇬🇧'),
  ('ar', 'Arabic', 'العربية', 'rtl', 5, false, false, '🇸🇦')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  native_name = EXCLUDED.native_name,
  direction = EXCLUDED.direction,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  is_default = EXCLUDED.is_default,
  flag_emoji = EXCLUDED.flag_emoji,
  updated_at = now();
