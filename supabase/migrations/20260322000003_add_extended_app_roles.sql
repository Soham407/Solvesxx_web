-- ============================================
-- Migration: add_extended_app_roles
-- Description: Align user_role enum and roles master data with app RBAC roles
-- ============================================

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'storekeeper';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'site_supervisor';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'ac_technician';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'pest_control_technician';
