-- ============================================
-- PHASE B MIGRATION 06: MAINTENANCE SCHEDULES
-- ============================================

CREATE TABLE maintenance_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Asset link
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE NOT NULL,
    
    -- Task details
    task_name VARCHAR(200) NOT NULL,
    task_description TEXT,
    
    -- Scheduling
    frequency maintenance_frequency NOT NULL,
    custom_interval_days INTEGER,
    
    -- Tracking
    last_performed_date DATE,
    next_due_date DATE NOT NULL,
    
    -- Assignment
    assigned_to_role UUID REFERENCES roles(id),
    assigned_to_employee UUID REFERENCES employees(id),
    
    -- Notification settings
    reminder_days_before INTEGER DEFAULT 3,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_maintenance_schedules_asset_id ON maintenance_schedules(asset_id);
CREATE INDEX idx_maintenance_schedules_next_due_date ON maintenance_schedules(next_due_date);

-- Enable RLS
ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "View Maintenance Schedules" ON maintenance_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage Maintenance Schedules" ON maintenance_schedules FOR ALL TO authenticated USING (get_user_role() IN ('admin', 'company_hod', 'society_manager'));;
