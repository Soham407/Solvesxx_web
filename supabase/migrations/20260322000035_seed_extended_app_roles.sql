-- ============================================
-- Migration: seed_extended_app_roles
-- Description: Seed roles that depend on enum values added in the prior migration
-- ============================================

INSERT INTO public.roles (role_name, role_display_name, description, is_active)
VALUES
  ('storekeeper', 'Storekeeper', 'Manages physical stock, material receipt, issue, and returns.', true),
  ('site_supervisor', 'Site Supervisor', 'On-ground supervisor at a deployment site. Manages service acknowledgment and staff.', true),
  ('super_admin', 'Super Admin', 'Platform owner with unrestricted access across all modules and administration.', true),
  ('ac_technician', 'AC Technician', 'Specialized technician for AC installation, maintenance, and repair jobs.', true),
  ('pest_control_technician', 'Pest Control Technician', 'Specialized technician for pest control treatments, PPE compliance, and chemical handling.', true)
ON CONFLICT (role_name) DO UPDATE
SET
  role_display_name = EXCLUDED.role_display_name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;
