-- ============================================================================
-- Product BOM Configurator - Supabase PostgreSQL Schema
-- Run this script in the Supabase SQL Editor to initialize your database.
-- ============================================================================

-- 1. Unified State Table (Used for instant real-time sync of the Configurator state)
CREATE TABLE IF NOT EXISTS public.configurator_state (
  id TEXT PRIMARY KEY DEFAULT 'default',
  state_data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
);

-- Enable Row Level Security (RLS) with public access for demo/app usage
ALTER TABLE public.configurator_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow full access to configurator_state" ON public.configurator_state;
CREATE POLICY "Allow full access to configurator_state"
  ON public.configurator_state
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 2. Relational Tables (Optional normalized tables for SQL reporting / BI in Supabase)
CREATE TABLE IF NOT EXISTS public.system_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  allowed_powers TEXT[] NOT NULL DEFAULT '{}',
  allowed_focals TEXT[] NOT NULL DEFAULT '{}',
  allowed_voltages TEXT[] NOT NULL DEFAULT '{}',
  allowed_envs TEXT[] NOT NULL DEFAULT '{}',
  allowed_usages TEXT[] NOT NULL DEFAULT '{}',
  power TEXT NOT NULL,
  voltage TEXT NOT NULL,
  channels INTEGER NOT NULL DEFAULT 1,
  psu_count INTEGER NOT NULL DEFAULT 1,
  focal TEXT NOT NULL,
  env TEXT NOT NULL,
  usage TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  custom_img TEXT,
  cat_qty JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.catalog_rules (
  sku TEXT NOT NULL,
  rev TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  parent_sku TEXT NOT NULL DEFAULT 'ROOT',
  match_power TEXT[] NOT NULL DEFAULT '{}',
  match_focal TEXT[] NOT NULL DEFAULT '{}',
  match_voltage TEXT[] NOT NULL DEFAULT '{}',
  match_env TEXT[] NOT NULL DEFAULT '{}',
  match_usage TEXT[] NOT NULL DEFAULT '{}',
  cost TEXT NOT NULL DEFAULT '$0',
  img_type TEXT NOT NULL DEFAULT 'optics',
  custom_img TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (sku, rev)
);

CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  customer TEXT NOT NULL,
  contact TEXT NOT NULL,
  email TEXT,
  system_type_id TEXT NOT NULL,
  system_name TEXT NOT NULL,
  delivery_date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  power TEXT NOT NULL,
  focal TEXT NOT NULL,
  voltage TEXT NOT NULL,
  env TEXT NOT NULL,
  usage TEXT NOT NULL,
  channels INTEGER NOT NULL DEFAULT 1,
  psu_count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL,
  locked BOOLEAN NOT NULL DEFAULT FALSE,
  bom JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.recycle_bin (
  recycle_id TEXT PRIMARY KEY,
  item_type TEXT NOT NULL CHECK (item_type IN ('assembly', 'system')),
  sku_or_id TEXT NOT NULL,
  rev TEXT,
  name TEXT NOT NULL,
  category_or_details TEXT,
  deleted_by TEXT NOT NULL,
  deleted_at TEXT NOT NULL,
  delete_reason TEXT NOT NULL,
  payload JSONB NOT NULL
);

-- 3. Users & Roles Table (Google Sign-In -> Auto 'viewer' Role)
CREATE TABLE IF NOT EXISTS public.app_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('sales', 'procurement', 'dev', 'viewer', 'manager')),
  provider TEXT NOT NULL DEFAULT 'google',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TEXT NOT NULL,
  last_sign_in_at TEXT NOT NULL
);

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow full access to app_users" ON public.app_users;
CREATE POLICY "Allow full access to app_users"
  ON public.app_users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger to automatically create new Google OAuth users as 'viewer' (צופה)
CREATE OR REPLACE FUNCTION public.handle_new_google_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.app_users (id, email, full_name, avatar_url, role, provider, active, created_at, last_sign_in_at)
  VALUES (
    NEW.id::text,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    'viewer',
    'google',
    TRUE,
    TO_CHAR(NOW(), 'DD/MM/YYYY HH24:MI'),
    TO_CHAR(NOW(), 'DD/MM/YYYY HH24:MI')
  )
  ON CONFLICT (email) DO UPDATE
  SET last_sign_in_at = TO_CHAR(NOW(), 'DD/MM/YYYY HH24:MI');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_google_user();


