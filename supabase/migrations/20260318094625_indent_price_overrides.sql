ALTER TABLE indent_items
  ADD COLUMN IF NOT EXISTS override_approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS override_reason TEXT,
  ADD COLUMN IF NOT EXISTS override_approved_at TIMESTAMPTZ;;
