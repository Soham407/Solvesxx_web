-- Add Storekeeper and Site Supervisor roles
-- These roles exist in SCOPE.md but were missing from the platform

-- Add new role enum values if using enum (skip if roles table uses VARCHAR)
-- Inserting into roles master table
INSERT INTO roles (role_name, display_name, description, is_active)
VALUES
  ('storekeeper', 'Storekeeper', 'Manages physical stock, material receipt, issue, and returns.', true),
  ('site_supervisor', 'Site Supervisor', 'On-ground supervisor at a deployment site. Manages service acknowledgment and staff.', true)
ON CONFLICT (role_name) DO NOTHING;
