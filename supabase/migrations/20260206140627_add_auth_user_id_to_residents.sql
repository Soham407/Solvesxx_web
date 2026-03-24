-- ============================================
-- Fix #2: Add auth_user_id to residents table
-- This enables mapping between auth.users and residents
-- ============================================

-- Add auth_user_id column to residents
ALTER TABLE residents 
ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_residents_auth_user_id 
ON residents(auth_user_id);

-- Comment for documentation
COMMENT ON COLUMN residents.auth_user_id IS 'Links resident to Supabase auth.users for authentication';;
