-- Add Storekeeper and Site Supervisor roles
-- These roles exist in SCOPE.md but were missing from the platform

INSERT INTO public.roles (role_name, role_display_name, description, is_active)
VALUES
  ('storekeeper', 'Storekeeper', 'Manages physical stock, material receipt, issue, and returns.', true),
  ('site_supervisor', 'Site Supervisor', 'On-ground supervisor at a deployment site. Manages service acknowledgment and staff.', true)
ON CONFLICT (role_name) DO NOTHING;
