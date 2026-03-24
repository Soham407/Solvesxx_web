-- Plantation & Feedback System Extensions
-- Phase 2: Operational Data Completion

-- 1. Horticulture Zones
CREATE TABLE IF NOT EXISTS horticulture_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
    zone_name VARCHAR(100) NOT NULL,
    area_sqft DECIMAL(10, 2),
    health_status VARCHAR(50) DEFAULT 'healthy', -- healthy, needs_attention, being_maintained, dormant
    description TEXT,
    last_maintained_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Horticulture Tasks (Scheduling)
CREATE TABLE IF NOT EXISTS horticulture_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id UUID REFERENCES horticulture_zones(id) ON DELETE CASCADE,
    task_type VARCHAR(100) NOT NULL, -- Pruning, Manure, Watering, Sowing, Weeding
    frequency VARCHAR(50) NOT NULL, -- Daily, Weekly, Monthly, Quarterly, Seasonal
    assigned_to UUID REFERENCES employees(id),
    priority VARCHAR(20) DEFAULT 'Normal', -- High, Normal
    status VARCHAR(50) DEFAULT 'Scheduled', -- Scheduled, In Progress, Completed, Overdue
    next_due_date DATE,
    last_completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Service Feedback (Resident Feedback Engine)
CREATE TABLE IF NOT EXISTS service_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE,
    society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
    resident_id UUID REFERENCES residents(id) ON DELETE CASCADE,
    score INTEGER CHECK (score >= 1 AND score <= 5),
    comments TEXT,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. View for Vendor Scorecards
-- Links service requests to suppliers via the services mapping
CREATE OR REPLACE VIEW vendor_scorecards AS
SELECT 
    s.id as supplier_id,
    s.supplier_name,
    vws.service_type,
    COUNT(sf.id) as total_feedbacks,
    COALESCE(AVG(sf.score), 0)::DECIMAL(3,2) as average_rating,
    COUNT(CASE WHEN sf.score <= 2 THEN 1 END) as critical_feedbacks,
    CASE 
        WHEN AVG(sf.score) >= 4.5 THEN 'Incentivize'
        WHEN AVG(sf.score) <= 2.5 THEN 'Warning'
        ELSE 'Standard'
    END as performance_status
FROM suppliers s
LEFT JOIN vendor_wise_services vws ON s.id = vws.supplier_id
LEFT JOIN services sv ON sv.service_name = vws.service_type
LEFT JOIN service_requests sr ON sr.service_id = sv.id
LEFT JOIN service_feedback sf ON sf.service_request_id = sr.id
GROUP BY s.id, s.supplier_name, vws.service_type;

-- 5. Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop triggers if they already exist to avoid errors during re-runs
DROP TRIGGER IF EXISTS update_horticulture_zones_updated_at ON horticulture_zones;
CREATE TRIGGER update_horticulture_zones_updated_at
    BEFORE UPDATE ON horticulture_zones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_horticulture_tasks_updated_at ON horticulture_tasks;
CREATE TRIGGER update_horticulture_tasks_updated_at
    BEFORE UPDATE ON horticulture_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. RLS Policies
ALTER TABLE horticulture_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE horticulture_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_feedback ENABLE ROW LEVEL SECURITY;

-- Horticulture Zones Policies
DROP POLICY IF EXISTS "Allow authenticated read for horticulture_zones" ON horticulture_zones;
CREATE POLICY "Allow authenticated read for horticulture_zones" 
ON horticulture_zones FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow admin manage for horticulture_zones" ON horticulture_zones;
CREATE POLICY "Allow admin manage for horticulture_zones" 
ON horticulture_zones FOR ALL TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM users 
        JOIN roles ON users.role_id = roles.id
        WHERE users.id = auth.uid() 
        AND roles.role_name IN ('admin', 'society_manager')
    )
);

-- Horticulture Tasks Policies
DROP POLICY IF EXISTS "Allow authenticated read for horticulture_tasks" ON horticulture_tasks;
CREATE POLICY "Allow authenticated read for horticulture_tasks" 
ON horticulture_tasks FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow admin manage for horticulture_tasks" ON horticulture_tasks;
CREATE POLICY "Allow admin manage for horticulture_tasks" 
ON horticulture_tasks FOR ALL TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM users 
        JOIN roles ON users.role_id = roles.id
        WHERE users.id = auth.uid() 
        AND roles.role_name IN ('admin', 'society_manager')
    )
);

-- Service Feedback Policies
DROP POLICY IF EXISTS "Allow authenticated read for service_feedback" ON service_feedback;
CREATE POLICY "Allow authenticated read for service_feedback" 
ON service_feedback FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow residents to insert feedback" ON service_feedback;
CREATE POLICY "Allow residents to insert feedback" 
ON service_feedback FOR INSERT TO authenticated 
WITH CHECK (true);

-- 7. Seed Data
DO $$
DECLARE
    v_society_id UUID;
    v_employee_id UUID;
    v_resident_id UUID;
    v_supplier_id UUID;
    v_request_id UUID;
BEGIN
    SELECT id INTO v_society_id FROM societies LIMIT 1;
    SELECT id INTO v_employee_id FROM employees LIMIT 1;
    SELECT id INTO v_resident_id FROM residents LIMIT 1;
    
    IF v_society_id IS NOT NULL THEN
        -- Zones
        INSERT INTO horticulture_zones (society_id, zone_name, area_sqft, health_status, description)
        VALUES 
        (v_society_id, 'Main Lawn', 5000, 'healthy', 'Front entrance lawn'),
        (v_society_id, 'Wing A Terrace', 1200, 'needs_attention', 'Terrace garden with pots'),
        (v_society_id, 'Clubhouse Perimeter', 800, 'healthy', 'Perimeter flower beds')
        ON CONFLICT DO NOTHING;

        -- Tasks
        INSERT INTO horticulture_tasks (zone_id, task_type, frequency, assigned_to, priority, status, next_due_date)
        SELECT id, 'Watering', 'Daily', v_employee_id, 'High', 'Scheduled', CURRENT_DATE + 1
        FROM horticulture_zones WHERE zone_name = 'Main Lawn'
        ON CONFLICT DO NOTHING;

        INSERT INTO horticulture_tasks (zone_id, task_type, frequency, assigned_to, priority, status, next_due_date)
        SELECT id, 'Pruning', 'Monthly', v_employee_id, 'Normal', 'Scheduled', CURRENT_DATE + 5
        FROM horticulture_zones WHERE zone_name = 'Wing A Terrace'
        ON CONFLICT DO NOTHING;
        
        -- Mapping services to suppliers
        INSERT INTO suppliers (supplier_name, contact_person, is_active)
        VALUES ('Green thumb Ventures', 'John Gardener', true)
        ON CONFLICT DO NOTHING;
        
        SELECT id INTO v_supplier_id FROM suppliers WHERE supplier_name = 'Green thumb Ventures' LIMIT 1;
        
        IF v_supplier_id IS NOT NULL THEN
            INSERT INTO vendor_wise_services (supplier_id, service_type, is_active)
            VALUES (v_supplier_id, 'Pest Control', true)
            ON CONFLICT DO NOTHING;
        END IF;

        -- Feedback
        SELECT id INTO v_request_id FROM service_requests LIMIT 1;
        
        IF v_request_id IS NOT NULL AND v_resident_id IS NOT NULL THEN
            INSERT INTO service_feedback (service_request_id, society_id, resident_id, score, comments)
            VALUES (v_request_id, v_society_id, v_resident_id, 5, 'Excellent service, very thorough!')
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
END $$;
;
