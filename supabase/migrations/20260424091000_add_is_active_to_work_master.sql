-- ============================================
-- Migration: add_is_active_to_work_master
-- Description: Add is_active column to work_master for soft-deletion support
-- ============================================

ALTER TABLE public.work_master 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing rows to be active
UPDATE public.work_master SET is_active = true WHERE is_active IS NULL;

COMMENT ON COLUMN public.work_master.is_active IS 'Soft-delete flag for work master items';
