-- ============================================
-- PHASE B MIGRATION 08: JOB SESSIONS
-- ============================================

CREATE TABLE job_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Link to request
    service_request_id UUID REFERENCES service_requests(id) NOT NULL,
    
    -- Technician
    technician_id UUID REFERENCES employees(id) NOT NULL,
    
    -- Time tracking
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    
    -- GPS at start
    start_latitude DECIMAL(10, 8),
    start_longitude DECIMAL(11, 8),
    
    -- GPS at end
    end_latitude DECIMAL(10, 8),
    end_longitude DECIMAL(11, 8),
    
    -- Status
    status job_session_status DEFAULT 'started',
    
    -- Notes
    work_performed TEXT,
    remarks TEXT,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_job_sessions_service_request_id ON job_sessions(service_request_id);
CREATE INDEX idx_job_sessions_technician_id ON job_sessions(technician_id);
CREATE INDEX idx_job_sessions_status ON job_sessions(status);

-- Enable RLS
ALTER TABLE job_sessions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "View Own Sessions" ON job_sessions 
    FOR SELECT TO authenticated 
    USING (
        technician_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
        OR get_user_role() IN ('admin', 'company_hod', 'society_manager')
    );

CREATE POLICY "Create Sessions" ON job_sessions 
    FOR INSERT TO authenticated 
    WITH CHECK (
        technician_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
        OR get_user_role() IN ('admin', 'company_hod', 'society_manager')
    );

CREATE POLICY "Update Own Sessions" ON job_sessions 
    FOR UPDATE TO authenticated 
    USING (
        technician_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
        OR get_user_role() IN ('admin', 'company_hod', 'society_manager')
    );

-- ============================================
-- JOB PHOTOS TABLE
-- ============================================

CREATE TABLE job_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Link
    job_session_id UUID REFERENCES job_sessions(id) ON DELETE CASCADE NOT NULL,
    
    -- Photo details
    photo_type VARCHAR(20) NOT NULL, -- 'before', 'after', 'part_replaced', 'issue'
    photo_url TEXT NOT NULL,
    caption TEXT,
    
    -- GPS at capture
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Timestamp
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE job_photos ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "View Job Photos" ON job_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert Job Photos" ON job_photos FOR INSERT TO authenticated WITH CHECK (true);;
