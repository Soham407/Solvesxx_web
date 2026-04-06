-- ============================================================
-- Migration: Platform master system_config permission truth
-- Purpose:
--   Align system_config RLS with the platform permission model
--   so users granted platform.config.manage can read/write config.
-- ============================================================

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_config_admin_full" ON public.system_config;
DROP POLICY IF EXISTS "system_config_super_admin_full" ON public.system_config;
DROP POLICY IF EXISTS "system_config_permission_manage" ON public.system_config;

CREATE POLICY "system_config_permission_manage"
  ON public.system_config
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      JOIN public.roles r
        ON r.id = u.role_id
      WHERE u.id = auth.uid()
        AND (
          (
            jsonb_typeof(COALESCE(r.permissions, '[]'::jsonb)) = 'array'
            AND COALESCE(r.permissions, '[]'::jsonb) @> '["platform.config.manage"]'::jsonb
          )
          OR (
            jsonb_typeof(COALESCE(r.permissions, '{}'::jsonb)) = 'object'
            AND COALESCE(r.permissions ->> 'platform.config.manage', 'false') = 'true'
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      JOIN public.roles r
        ON r.id = u.role_id
      WHERE u.id = auth.uid()
        AND (
          (
            jsonb_typeof(COALESCE(r.permissions, '[]'::jsonb)) = 'array'
            AND COALESCE(r.permissions, '[]'::jsonb) @> '["platform.config.manage"]'::jsonb
          )
          OR (
            jsonb_typeof(COALESCE(r.permissions, '{}'::jsonb)) = 'object'
            AND COALESCE(r.permissions ->> 'platform.config.manage', 'false') = 'true'
          )
        )
    )
  );
