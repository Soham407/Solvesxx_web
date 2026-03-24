-- ============================================================
-- Super Admin platform alignment
-- Ensures the linked project matches the repo for PRD item 11.1
-- ============================================================

INSERT INTO public.roles (role_name, role_display_name, description, is_active)
VALUES (
  'super_admin',
  'Super Admin',
  'Platform owner with unrestricted access across all modules and administration.',
  true
)
ON CONFLICT (role_name) DO UPDATE
SET
  role_display_name = EXCLUDED.role_display_name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

UPDATE public.roles
SET permissions = '[]'::jsonb
WHERE permissions IS NULL OR jsonb_typeof(permissions) <> 'array';

UPDATE public.roles AS r
SET permissions = (
  SELECT to_jsonb(COALESCE(array_agg(permission ORDER BY permission), ARRAY[]::text[]))
  FROM (
    SELECT DISTINCT permission
    FROM (
      SELECT jsonb_array_elements_text(r.permissions) AS permission
      UNION ALL
      SELECT unnest(ARRAY[
        'platform.dashboard.view',
        'platform.admin_accounts.manage',
        'platform.rbac.manage',
        'platform.audit_logs.view',
        'platform.config.manage'
      ])
    ) merged
  ) deduped
)
WHERE r.role_name = 'super_admin';

UPDATE public.roles AS r
SET permissions = (
  SELECT to_jsonb(COALESCE(array_agg(permission ORDER BY permission), ARRAY[]::text[]))
  FROM (
    SELECT permission
    FROM jsonb_array_elements_text(r.permissions) AS permission
    WHERE permission <> ALL (ARRAY[
      'platform.dashboard.view',
      'platform.admin_accounts.manage',
      'platform.rbac.manage',
      'platform.audit_logs.view',
      'platform.config.manage'
    ])
  ) remaining
)
WHERE r.role_name = 'admin';

CREATE TABLE IF NOT EXISTS public.system_config (
  key varchar(100) PRIMARY KEY,
  value text NOT NULL,
  description text,
  updated_by uuid REFERENCES public.users(id),
  updated_at timestamptz DEFAULT timezone('utc', now())
);

ALTER TABLE public.system_config
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.system_config
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.users(id);

ALTER TABLE public.system_config
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc', now());

INSERT INTO public.system_config (key, value, description)
VALUES
  (
    'guard_inactivity_threshold_minutes',
    '30',
    'Minutes of guard GPS inactivity before an alert is triggered.'
  ),
  (
    'default_geo_fence_radius_meters',
    '50',
    'Fallback geo-fence radius, in meters, when a location has no explicit radius.'
  ),
  (
    'geo_breach_auto_punch_out_minutes',
    '5',
    'Minutes a guard may remain outside the geo-fence before automatic punch-out.'
  ),
  (
    'checklist_completion_alert_threshold_percent',
    '50',
    'Checklist completion percentage below which alerts should be raised.'
  )
ON CONFLICT (key) DO UPDATE
SET description = EXCLUDED.description;

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id text,
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  actor_role varchar(50),
  action text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  metadata jsonb,
  evidence_url text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'audit_logs'
      AND column_name = 'table_name'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'audit_logs'
      AND column_name = 'entity_type'
  ) THEN
    EXECUTE 'UPDATE public.audit_logs SET entity_type = COALESCE(entity_type, table_name)';
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'audit_logs'
      AND column_name = 'table_name'
  ) THEN
    EXECUTE 'ALTER TABLE public.audit_logs RENAME COLUMN table_name TO entity_type';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'audit_logs'
      AND column_name = 'record_id'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'audit_logs'
      AND column_name = 'entity_id'
  ) THEN
    EXECUTE 'UPDATE public.audit_logs SET entity_id = COALESCE(entity_id, record_id)';
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'audit_logs'
      AND column_name = 'record_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.audit_logs RENAME COLUMN record_id TO entity_id';
  END IF;
END $$;

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS entity_type text;

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS entity_id text;

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS actor_role varchar(50);

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS metadata jsonb;

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS evidence_url text;

ALTER TABLE public.audit_logs
  ALTER COLUMN entity_id DROP NOT NULL;

UPDATE public.audit_logs
SET entity_type = COALESCE(entity_type, 'system')
WHERE entity_type IS NULL;

ALTER TABLE public.audit_logs
  ALTER COLUMN entity_type SET NOT NULL;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_config_admin_full" ON public.system_config;
DROP POLICY IF EXISTS "system_config_read_all" ON public.system_config;
CREATE POLICY "system_config_super_admin_full" ON public.system_config
  FOR ALL TO authenticated
  USING (public.get_my_app_role() = 'super_admin')
  WITH CHECK (public.get_my_app_role() = 'super_admin');
CREATE POLICY "system_config_read_authenticated" ON public.system_config
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage roles" ON public.roles;
DROP POLICY IF EXISTS "All users can view roles" ON public.roles;
DROP POLICY IF EXISTS "roles_super_admin_full" ON public.roles;
DROP POLICY IF EXISTS "roles_read_all" ON public.roles;
CREATE POLICY "roles_super_admin_full" ON public.roles
  FOR ALL TO authenticated
  USING (public.get_my_app_role() = 'super_admin')
  WITH CHECK (public.get_my_app_role() = 'super_admin');
CREATE POLICY "roles_read_all" ON public.roles
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage users" ON public.users;
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "users_select_authenticated" ON public.users;
DROP POLICY IF EXISTS "users_super_admin_manage" ON public.users;
DROP POLICY IF EXISTS "users_admin_update_non_admin" ON public.users;
DROP POLICY IF EXISTS "users_admin_insert_non_admin" ON public.users;
CREATE POLICY "users_select_authenticated" ON public.users
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "users_super_admin_manage" ON public.users
  FOR ALL TO authenticated
  USING (public.get_my_app_role() = 'super_admin')
  WITH CHECK (public.get_my_app_role() = 'super_admin');
CREATE POLICY "users_admin_update_non_admin" ON public.users
  FOR UPDATE TO authenticated
  USING (
    public.get_my_app_role() = 'admin'
    AND COALESCE(
      (SELECT role_name::text FROM public.roles WHERE id = public.users.role_id),
      ''
    ) NOT IN ('admin', 'super_admin')
  )
  WITH CHECK (
    public.get_my_app_role() = 'admin'
    AND COALESCE(
      (SELECT role_name::text FROM public.roles WHERE id = public.users.role_id),
      ''
    ) NOT IN ('admin', 'super_admin')
  );
CREATE POLICY "users_admin_insert_non_admin" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_app_role() = 'admin'
    AND COALESCE(
      (SELECT role_name::text FROM public.roles WHERE id = public.users.role_id),
      ''
    ) NOT IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "audit_logs_super_admin_select" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_super_admin_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_super_admin_select" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.get_my_app_role() = 'super_admin');
CREATE POLICY "audit_logs_super_admin_insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_app_role() = 'super_admin'
    AND (actor_id IS NULL OR actor_id = auth.uid())
  );
