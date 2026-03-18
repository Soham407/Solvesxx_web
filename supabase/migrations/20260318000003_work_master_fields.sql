-- Add estimated_duration_minutes and priority to work_master table
ALTER TABLE work_master
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';

-- priority values: 'low' | 'medium' | 'high'
COMMENT ON COLUMN work_master.priority IS 'Task priority: low, medium, or high';
COMMENT ON COLUMN work_master.estimated_duration_minutes IS 'Estimated time to complete the task in minutes';
