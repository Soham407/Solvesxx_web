-- ============================================
-- PHASE A FINAL PATCH: MISSING FEATURES
-- Safe execution with IF NOT EXISTS checks
-- ============================================

-- 1. Push Tokens (For Firebase FCM)
CREATE TABLE IF NOT EXISTS push_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    token TEXT NOT NULL,
    token_type VARCHAR(20) DEFAULT 'fcm', -- 'fcm' or 'sms'
    device_type VARCHAR(50), -- 'web', 'android', 'ios'
    last_used TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, token)
);

-- 2. Notification Logs (Audit Trail)
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    channel VARCHAR(20) NOT NULL, -- 'fcm', 'sms'
    recipient_phone VARCHAR(20),
    status VARCHAR(20) NOT NULL, -- 'sent', 'failed'
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Emergency Contacts
CREATE TABLE IF NOT EXISTS emergency_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_name VARCHAR(100) NOT NULL,
    contact_type VARCHAR(50) NOT NULL, -- police, ambulance, fire, lift_support
    phone_number VARCHAR(20) NOT NULL,
    priority INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    society_id UUID REFERENCES societies(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Behavior Tickets (If not already created)
DO $$ BEGIN
    CREATE TYPE behavior_category AS ENUM (
        'sleeping_on_duty', 'rudeness', 'absence', 
        'uniform_issue', 'unauthorized_entry', 'late_arrival', 
        'mobile_use', 'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS employee_behavior_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number VARCHAR(50) UNIQUE,
    employee_id UUID REFERENCES employees(id) NOT NULL,
    category behavior_category NOT NULL,
    severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high'
    reported_by UUID REFERENCES employees(id),
    description TEXT,
    evidence_urls JSONB, -- Array of photo URLs
    status VARCHAR(20) DEFAULT 'open',
    resolution TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Holidays Table
CREATE TABLE IF NOT EXISTS holidays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    holiday_name VARCHAR(200) NOT NULL,
    holiday_date DATE NOT NULL,
    holiday_type VARCHAR(50) DEFAULT 'national', -- 'national', 'regional', 'company_off'
    payroll_impact VARCHAR(50) DEFAULT 'standard_off', -- 'public_holiday_pay', 'standard_off'
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(holiday_date, year)
);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_behavior_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Push Tokens: Users can only manage their own tokens
DROP POLICY IF EXISTS "Users manage own tokens" ON push_tokens;
CREATE POLICY "Users manage own tokens" ON push_tokens 
    FOR ALL USING (auth.uid() = user_id);

-- Notification Logs: Admins/Supervisors can view all, users can view their own
DROP POLICY IF EXISTS "Users view own notification logs" ON notification_logs;
CREATE POLICY "Users view own notification logs" ON notification_logs 
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all notification logs" ON notification_logs;
CREATE POLICY "Admins view all notification logs" ON notification_logs 
    FOR SELECT USING (has_role('admin') OR has_role('society_manager'));

-- Emergency Contacts: Everyone can view, only admins can manage
DROP POLICY IF EXISTS "Everyone views emergency contacts" ON emergency_contacts;
CREATE POLICY "Everyone views emergency contacts" ON emergency_contacts 
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage emergency contacts" ON emergency_contacts;
CREATE POLICY "Admins manage emergency contacts" ON emergency_contacts 
    FOR ALL USING (has_role('admin') OR has_role('society_manager'));

-- Employee Behavior Tickets: Managers can create/view, admins manage all
DROP POLICY IF EXISTS "Supervisors create behavior tickets" ON employee_behavior_tickets;
CREATE POLICY "Supervisors create behavior tickets" ON employee_behavior_tickets 
    FOR INSERT WITH CHECK (
        has_role('admin') OR has_role('society_manager') OR has_role('security_supervisor')
    );

DROP POLICY IF EXISTS "Supervisors view behavior tickets" ON employee_behavior_tickets;
CREATE POLICY "Supervisors view behavior tickets" ON employee_behavior_tickets 
    FOR SELECT USING (
        has_role('admin') OR has_role('society_manager') OR has_role('security_supervisor') OR has_role('company_hod')
    );

DROP POLICY IF EXISTS "Admins manage behavior tickets" ON employee_behavior_tickets;
CREATE POLICY "Admins manage behavior tickets" ON employee_behavior_tickets 
    FOR ALL USING (has_role('admin'));

-- Holidays: Everyone can view, admins can manage
DROP POLICY IF EXISTS "Everyone views holidays" ON holidays;
CREATE POLICY "Everyone views holidays" ON holidays 
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage holidays" ON holidays;
CREATE POLICY "Admins manage holidays" ON holidays 
    FOR ALL USING (has_role('admin'));

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Create sequence for ticket numbers
CREATE SEQUENCE IF NOT EXISTS behavior_ticket_seq START 1000;

-- Auto-generate ticket number
CREATE OR REPLACE FUNCTION generate_behavior_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ticket_number IS NULL THEN
        NEW.ticket_number := 'TKT-B-' || LPAD(NEXTVAL('behavior_ticket_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger
DROP TRIGGER IF EXISTS tr_generate_behavior_ticket_number ON employee_behavior_tickets;
CREATE TRIGGER tr_generate_behavior_ticket_number
    BEFORE INSERT ON employee_behavior_tickets
    FOR EACH ROW
    EXECUTE FUNCTION generate_behavior_ticket_number();

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_society_id ON emergency_contacts(society_id);
CREATE INDEX IF NOT EXISTS idx_behavior_tickets_employee_id ON employee_behavior_tickets(employee_id);
CREATE INDEX IF NOT EXISTS idx_behavior_tickets_status ON employee_behavior_tickets(status);
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(holiday_date);
CREATE INDEX IF NOT EXISTS idx_holidays_year ON holidays(year);;
