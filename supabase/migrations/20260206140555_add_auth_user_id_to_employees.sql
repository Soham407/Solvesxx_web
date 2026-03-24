-- ============================================
-- Fix #1: Add auth_user_id to employees table
-- This enables mapping between auth.users and employees
-- ============================================

-- Add auth_user_id column to employees
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_employees_auth_user_id 
ON employees(auth_user_id);

-- Comment for documentation
COMMENT ON COLUMN employees.auth_user_id IS 'Links employee to Supabase auth.users for authentication';;
