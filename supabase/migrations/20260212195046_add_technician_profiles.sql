-- Create technician_profiles table
CREATE TABLE IF NOT EXISTS technician_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE UNIQUE NOT NULL,
    skills TEXT[] DEFAULT '{}',
    certifications TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE technician_profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "View Technician Profiles" ON technician_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage Technician Profiles" ON technician_profiles FOR ALL TO authenticated USING (get_user_role() IN ('admin', 'company_hod'));

-- Auto-update updated_at
CREATE TRIGGER trigger_technician_profiles_updated_at
    BEFORE UPDATE ON technician_profiles
    FOR EACH ROW EXECUTE FUNCTION update_phase_b_updated_at();

-- Add some seed data for technicians
DO $$
DECLARE
    v_emp_id UUID;
BEGIN
    FOR v_emp_id IN SELECT id FROM employees LIMIT 3
    LOOP
        INSERT INTO technician_profiles (employee_id, skills, certifications)
        VALUES (
            v_emp_id, 
            ARRAY['Centralized Plant', 'Split AC', 'Gas Charging'],
            ARRAY['HVAC Cert v1', 'Safety Diploma']
        )
        ON CONFLICT (employee_id) DO NOTHING;
    END LOOP;
END $$;
;
