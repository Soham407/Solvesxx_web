-- ============================================
-- PHASE B MIGRATION 07: SERVICE REQUESTS
-- ============================================

CREATE TABLE service_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identification
    request_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Service type
    service_id UUID REFERENCES services(id),
    
    -- Asset link (optional)
    asset_id UUID REFERENCES assets(id),
    
    -- Location
    location_id UUID REFERENCES company_locations(id),
    society_id UUID REFERENCES societies(id),
    
    -- Request details
    title VARCHAR(200),
    description TEXT NOT NULL,
    priority service_priority DEFAULT 'normal',
    
    -- Requester
    requester_id UUID REFERENCES auth.users(id),
    requester_phone VARCHAR(20),
    
    -- Assignment
    assigned_to UUID REFERENCES employees(id),
    assigned_at TIMESTAMP WITH TIME ZONE,
    
    -- Scheduling
    scheduled_date DATE,
    scheduled_time TIME,
    estimated_duration_minutes INTEGER,
    
    -- Status tracking
    status service_request_status DEFAULT 'open',
    
    -- Completion
    completed_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    
    -- Linked maintenance schedule
    maintenance_schedule_id UUID REFERENCES maintenance_schedules(id),
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_service_requests_asset_id ON service_requests(asset_id);
CREATE INDEX idx_service_requests_status ON service_requests(status);
CREATE INDEX idx_service_requests_assigned_to ON service_requests(assigned_to);
CREATE INDEX idx_service_requests_society_id ON service_requests(society_id);
CREATE INDEX idx_service_requests_scheduled_date ON service_requests(scheduled_date);

-- Enable RLS
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "View Assigned or Own Requests" ON service_requests 
    FOR SELECT TO authenticated 
    USING (
        assigned_to IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
        OR requester_id = auth.uid()
        OR get_user_role() IN ('admin', 'company_hod', 'society_manager')
    );

CREATE POLICY "Create Service Requests" ON service_requests 
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Update Assigned Requests" ON service_requests 
    FOR UPDATE TO authenticated 
    USING (
        assigned_to IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
        OR get_user_role() IN ('admin', 'company_hod', 'society_manager')
    );;
