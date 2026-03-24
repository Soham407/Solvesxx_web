-- Rename existing columns to match hook interface
ALTER TABLE audit_logs RENAME COLUMN table_name TO entity_type;
ALTER TABLE audit_logs RENAME COLUMN record_id TO entity_id;

-- Add missing columns
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS actor_role VARCHAR(50),
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;;
