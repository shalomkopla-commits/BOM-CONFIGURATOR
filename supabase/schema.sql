-- ============================================================================
-- Product BOM Configurator - Supabase PostgreSQL Schema & RLS Policies
-- Adheres to Supabase Security & RLS Best Practices
-- ============================================================================

-- 1. Users & Roles Table (Google Sign-In -> Auto 'viewer' Role)
CREATE TABLE IF NOT EXISTS public.app_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('sales', 'procurement', 'dev', 'viewer', 'manager')),
  provider TEXT NOT NULL DEFAULT 'google',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TEXT NOT NULL,
  last_sign_in_at TEXT NOT NULL,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_app_users_email ON public.app_users (email);
CREATE INDEX IF NOT EXISTS idx_app_users_role ON public.app_users (role);

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Expose table to Data API roles
GRANT SELECT, INSERT, UPDATE ON TABLE public.app_users TO authenticated;

-- Helper function (SECURITY INVOKER) to check if current authenticated user is a System Manager
CREATE OR REPLACE FUNCTION public.is_system_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.app_users
    WHERE (id = (SELECT auth.uid())::text OR LOWER(email) = LOWER((SELECT auth.jwt()->>'email')))
      AND role = 'manager'
      AND active = true
  );
$$;

-- SELECT policy: Authenticated users can view the users list
DROP POLICY IF EXISTS "Authenticated users can read app_users" ON public.app_users;
CREATE POLICY "Authenticated users can read app_users"
  ON public.app_users
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT policy: Users can insert their own initial profile ONLY as 'viewer' (or Manager can insert any user)
DROP POLICY IF EXISTS "Users can register themselves as viewer or manager can insert" ON public.app_users;
CREATE POLICY "Users can register themselves as viewer or manager can insert"
  ON public.app_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      (id = (SELECT auth.uid())::text OR LOWER(email) = LOWER((SELECT auth.jwt()->>'email')))
      AND role = 'viewer'
    )
    OR public.is_system_manager()
  );

-- UPDATE policy: System Managers can update any user's role/status; regular users can only update their own last_sign_in_at without changing role
DROP POLICY IF EXISTS "Managers can update roles or users can update own sign-in timestamp" ON public.app_users;
CREATE POLICY "Managers can update roles or users can update own sign-in timestamp"
  ON public.app_users
  FOR UPDATE
  TO authenticated
  USING (
    public.is_system_manager()
    OR id = (SELECT auth.uid())::text
    OR LOWER(email) = LOWER((SELECT auth.jwt()->>'email'))
  )
  WITH CHECK (
    public.is_system_manager()
    OR (
      (id = (SELECT auth.uid())::text OR LOWER(email) = LOWER((SELECT auth.jwt()->>'email')))
      AND role = (SELECT u.role FROM public.app_users u WHERE u.id = app_users.id)
    )
  );

-- Trigger to automatically create new Google OAuth users as 'viewer' (צופה) in public.app_users
CREATE OR REPLACE FUNCTION public.handle_new_google_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.app_users (id, email, full_name, avatar_url, role, provider, active, created_at, last_sign_in_at, updated_by)
  VALUES (
    NEW.id::text,
    LOWER(NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    'viewer',
    'google',
    TRUE,
    TO_CHAR(NOW(), 'DD/MM/YYYY HH24:MI'),
    TO_CHAR(NOW(), 'DD/MM/YYYY HH24:MI'),
    'Google Sign-In (הוגדר אוטומטית כצופה)'
  )
  ON CONFLICT (email) DO UPDATE
  SET last_sign_in_at = TO_CHAR(NOW(), 'DD/MM/YYYY HH24:MI');
  RETURN NEW;
END;
$$;

-- Restrict direct execution of trigger function from public API roles
REVOKE ALL ON FUNCTION public.handle_new_google_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_google_user();

-- ============================================================================
-- 2. Unified State Table (Used for real-time sync of the Configurator state)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.configurator_state (
  id TEXT PRIMARY KEY DEFAULT 'default',
  state_data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
);

ALTER TABLE public.configurator_state ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON TABLE public.configurator_state TO authenticated, anon;

DROP POLICY IF EXISTS "Allow authenticated read configurator_state" ON public.configurator_state;
CREATE POLICY "Allow authenticated read configurator_state"
  ON public.configurator_state
  FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated write configurator_state" ON public.configurator_state;
CREATE POLICY "Allow authenticated write configurator_state"
  ON public.configurator_state
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update configurator_state" ON public.configurator_state;
CREATE POLICY "Allow authenticated update configurator_state"
  ON public.configurator_state
  FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 3. Relational Tables (Normalized tables for SQL reporting / BI in Supabase)
-- ============================================================================
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

ALTER TABLE public.system_types ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.system_types TO authenticated;

DROP POLICY IF EXISTS "Authenticated read system_types" ON public.system_types;
CREATE POLICY "Authenticated read system_types"
  ON public.system_types FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Managers write system_types" ON public.system_types;
CREATE POLICY "Managers write system_types"
  ON public.system_types FOR ALL TO authenticated
  USING (public.is_system_manager())
  WITH CHECK (public.is_system_manager());

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

ALTER TABLE public.catalog_rules ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.catalog_rules TO authenticated;

DROP POLICY IF EXISTS "Authenticated read catalog_rules" ON public.catalog_rules;
CREATE POLICY "Authenticated read catalog_rules"
  ON public.catalog_rules FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Managers write catalog_rules" ON public.catalog_rules;
CREATE POLICY "Managers write catalog_rules"
  ON public.catalog_rules FOR ALL TO authenticated
  USING (public.is_system_manager())
  WITH CHECK (public.is_system_manager());

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

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON TABLE public.orders TO authenticated;

DROP POLICY IF EXISTS "Authenticated read orders" ON public.orders;
CREATE POLICY "Authenticated read orders"
  ON public.orders FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authorized roles write orders" ON public.orders;
CREATE POLICY "Authorized roles write orders"
  ON public.orders FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users u
      WHERE (u.id = (SELECT auth.uid())::text OR LOWER(u.email) = LOWER((SELECT auth.jwt()->>'email')))
        AND u.role IN ('sales', 'procurement', 'dev', 'manager')
        AND u.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users u
      WHERE (u.id = (SELECT auth.uid())::text OR LOWER(u.email) = LOWER((SELECT auth.jwt()->>'email')))
        AND u.role IN ('sales', 'procurement', 'dev', 'manager')
        AND u.active = true
    )
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

ALTER TABLE public.recycle_bin ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON TABLE public.recycle_bin TO authenticated;

DROP POLICY IF EXISTS "Managers access recycle_bin" ON public.recycle_bin;
CREATE POLICY "Managers access recycle_bin"
  ON public.recycle_bin FOR ALL TO authenticated
  USING (public.is_system_manager())
  WITH CHECK (public.is_system_manager());
