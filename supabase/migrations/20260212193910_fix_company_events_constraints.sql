-- Drop NOT NULL on event_name as we migrate to title
ALTER TABLE company_events ALTER COLUMN event_name DROP NOT NULL;

-- Ensure all columns from previous attempt are there
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_events' AND column_name='event_code') THEN
        ALTER TABLE company_events ADD COLUMN event_code VARCHAR(50) UNIQUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_events' AND column_name='category') THEN
        ALTER TABLE company_events ADD COLUMN category VARCHAR(50);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_events' AND column_name='event_time') THEN
        ALTER TABLE company_events ADD COLUMN event_time TIME;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_events' AND column_name='venue') THEN
        ALTER TABLE company_events ADD COLUMN venue VARCHAR(200);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_events' AND column_name='attendees') THEN
        ALTER TABLE company_events ADD COLUMN attendees TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_events' AND column_name='status') THEN
        ALTER TABLE company_events ADD COLUMN status VARCHAR(20) DEFAULT 'Scheduled';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_events' AND column_name='title') THEN
        ALTER TABLE company_events ADD COLUMN title VARCHAR(200);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_events' AND column_name='is_active') THEN
        ALTER TABLE company_events ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_events' AND column_name='updated_at') THEN
        ALTER TABLE company_events ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_events' AND column_name='created_by') THEN
        ALTER TABLE company_events ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Seed data with both title and event_name to be safe
INSERT INTO company_events (event_code, title, event_name, category, event_date, event_time, venue, attendees, status)
VALUES 
('EVT-801', 'Quarterly Society AGM', 'Quarterly Society AGM', 'Meeting', CURRENT_DATE + INTERVAL '2 days', '18:00:00', 'Main Clubhouse', 'All Residents', 'Scheduled'),
('EVT-802', 'Fire Safety Drill', 'Fire Safety Drill', 'Emergency Drill', CURRENT_DATE + INTERVAL '7 days', '11:00:00', 'Towers A, B, C', 'All Staff', 'Scheduled'),
('EVT-803', 'Security Protocols Refresh', 'Security Protocols Refresh', 'Training', CURRENT_DATE - INTERVAL '12 days', '14:00:00', 'Conference Room', 'Security Personnel', 'Completed'),
('EVT-804', 'Monthly Staff Welfare', 'Monthly Staff Welfare', 'Social', CURRENT_DATE + INTERVAL '15 days', '16:00:00', 'Cafeteria', 'Management & Staff', 'Scheduled')
ON CONFLICT (event_code) DO NOTHING;
;
