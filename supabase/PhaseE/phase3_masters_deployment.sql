-- ============================================
-- PHASE 3: OPERATIONAL MASTERS & AUTOMATED ALERTS
-- SQL Deployment Script
-- ============================================

-- Enable pg_cron extension (run as superuser)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================
-- 1. INACTIVITY MONITOR FUNCTION
-- ============================================

-- Function to detect guards inactive for >30 minutes
CREATE OR REPLACE FUNCTION detect_inactive_guards()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inactive_guard RECORD;
  supervisor RECORD;
  guard_name TEXT;
BEGIN
  -- Find guards who haven't moved in 30+ minutes
  FOR inactive_guard IN
    SELECT 
      g.id as guard_id,
      g.employee_id,
      g.assigned_location_id,
      gt.latitude,
      gt.longitude,
      gt.tracked_at,
      e.first_name,
      e.last_name
    FROM security_guards g
    JOIN employees e ON e.id = g.employee_id
    JOIN LATERAL (
      SELECT latitude, longitude, tracked_at
      FROM gps_tracking
      WHERE employee_id = g.employee_id
      ORDER BY tracked_at DESC
      LIMIT 1
    ) gt ON true
    WHERE g.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM panic_alerts pa
      WHERE pa.guard_id = g.id
      AND pa.alert_type = 'inactivity'
      AND pa.alert_time > NOW() - INTERVAL '1 hour'
      AND pa.is_resolved = false
    )
    AND gt.tracked_at < NOW() - INTERVAL '30 minutes'
  LOOP
    guard_name := COALESCE(inactive_guard.first_name || ' ' || inactive_guard.last_name, 'Unknown Guard');
    
    -- Create panic alert
    INSERT INTO panic_alerts (
      guard_id,
      alert_type,
      description,
      latitude,
      longitude,
      location_id,
      is_resolved,
      alert_time
    ) VALUES (
      inactive_guard.guard_id,
      'inactivity',
      'Guard has been stationary for more than 30 minutes. Last movement: ' || inactive_guard.tracked_at,
      inactive_guard.latitude,
      inactive_guard.longitude,
      inactive_guard.assigned_location_id,
      false,
      NOW()
    );
    
    -- Log the alert
    RAISE NOTICE 'Inactivity alert created for guard: % (ID: %)', guard_name, inactive_guard.guard_id;
  END LOOP;
END;
$$;

-- ============================================
-- 2. CHECKLIST REMINDER FUNCTION
-- ============================================

-- Function to send reminders for incomplete checklists
CREATE OR REPLACE FUNCTION send_checklist_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  incomplete_checklist RECORD;
  guard_phone TEXT;
BEGIN
  -- Find checklists not completed by 9 AM
  FOR incomplete_checklist IN
    SELECT 
      dc.id as checklist_id,
      dc.checklist_name,
      e.id as employee_id,
      e.first_name,
      e.last_name,
      e.mobile,
      sg.id as guard_id
    FROM daily_checklists dc
    CROSS JOIN security_guards sg
    JOIN employees e ON e.id = sg.employee_id
    WHERE dc.is_active = true
    AND sg.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM checklist_responses cr
      WHERE cr.checklist_id = dc.id
      AND cr.employee_id = e.id
      AND cr.response_date = CURRENT_DATE
      AND cr.is_complete = true
    )
    AND EXTRACT(HOUR FROM CURRENT_TIME) >= 9
  LOOP
    -- Here you would integrate with SMS service
    -- For now, we log the reminder
    RAISE NOTICE 'Checklist reminder: % should complete "%" checklist',
      incomplete_checklist.first_name || ' ' || incomplete_checklist.last_name,
      incomplete_checklist.checklist_name;
    
    -- You can also create a notification record
    INSERT INTO notifications (
      user_id,
      title,
      body,
      type,
      is_read,
      created_at
    )
    SELECT 
      u.id,
      'Checklist Reminder',
      'Please complete your daily checklist: ' || incomplete_checklist.checklist_name,
      'checklist_reminder',
      false,
      NOW()
    FROM users u
    WHERE u.employee_id = incomplete_checklist.employee_id;
  END LOOP;
END;
$$;

-- ============================================
-- 3. SCHEDULED JOBS (pg_cron)
-- ============================================

-- Schedule inactivity check every 15 minutes
-- SELECT cron.schedule('check-guard-inactivity', '*/15 * * * *', 'SELECT detect_inactive_guards();');

-- Schedule checklist reminders daily at 9:00 AM
-- SELECT cron.schedule('checklist-reminders', '0 9 * * *', 'SELECT send_checklist_reminders();');

-- Schedule daily compliance check at 8:00 AM
-- SELECT cron.schedule('daily-compliance-check', '0 8 * * *', 'SELECT process_overdue_alerts();');

-- ============================================
-- 4. NOTIFICATIONS TABLE (if not exists)
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT DEFAULT 'general',
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can mark own notifications as read
CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- 5. SERVICE-SPECIFIC TABLES
-- ============================================

-- Ensure services table has service_code column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'services' AND column_name = 'service_code'
  ) THEN
    ALTER TABLE services ADD COLUMN service_code TEXT UNIQUE;
  END IF;
END $$;

-- Update existing services with codes if null
UPDATE services SET service_code = 
  CASE 
    WHEN service_name ILIKE '%pest%' THEN 'PST-CON'
    WHEN service_name ILIKE '%print%' THEN 'PRN-ADV'
    WHEN service_name ILIKE '%ac%' OR service_name ILIKE '%air%' THEN 'AC-SVC'
    WHEN service_name ILIKE '%plant%' OR service_name ILIKE '%garden%' THEN 'PLT-OPS'
    WHEN service_name ILIKE '%security%' THEN 'SEC-OPS'
    ELSE 'SVC-' || SUBSTRING(id::text, 1, 6)
  END
WHERE service_code IS NULL;

-- ============================================
-- 6. VENDOR-WISE-SERVICES TABLE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_vendor_services_supplier 
ON vendor_wise_services(supplier_id) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_vendor_services_service 
ON vendor_wise_services(service_id) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_vendor_services_preferred 
ON vendor_wise_services(supplier_id, service_id) 
WHERE is_active = true AND is_preferred = true;

-- ============================================
-- 7. SERVICE-WISE-WORK TABLE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_service_work_service 
ON services_wise_work(service_id) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_service_work_work 
ON services_wise_work(work_id) 
WHERE is_active = true;

-- ============================================
-- 8. VIEWS FOR MASTER DATA
-- ============================================

-- View for vendor-service mappings with full details
CREATE OR REPLACE VIEW vendor_service_details AS
SELECT 
  vws.id,
  vws.supplier_id,
  vws.service_id,
  vws.vendor_rate,
  vws.response_time_sla,
  vws.is_preferred,
  s.supplier_name,
  s.supplier_code,
  s.mobile as supplier_mobile,
  svc.service_name,
  svc.service_code,
  svc.service_category,
  vws.created_at,
  vws.updated_at
FROM vendor_wise_services vws
JOIN suppliers s ON s.id = vws.supplier_id
JOIN services svc ON svc.id = vws.service_id
WHERE vws.is_active = true;

-- View for service-work mappings
CREATE OR REPLACE VIEW service_work_details AS
SELECT 
  sw.id,
  sw.service_id,
  sw.work_id,
  sw.is_active,
  svc.service_name,
  svc.service_code,
  wm.work_name,
  wm.work_code,
  wm.standard_time_minutes,
  wm.skill_level_required,
  sw.created_at
FROM services_wise_work sw
JOIN services svc ON svc.id = sw.service_id
JOIN work_master wm ON wm.id = sw.work_id
WHERE sw.is_active = true;

-- ============================================
-- 9. FUNCTION TO GET SERVICE BY CODE
-- ============================================

CREATE OR REPLACE FUNCTION get_service_by_code(service_code_param TEXT)
RETURNS TABLE (
  id UUID,
  service_code TEXT,
  service_name TEXT,
  service_category TEXT,
  description TEXT
)
LANGUAGE SQL
STABLE
AS $$
  SELECT id, service_code, service_name, service_category, description
  FROM services
  WHERE service_code = service_code_param
  AND is_active = true;
$$;

-- ============================================
-- DEPLOYMENT NOTES
-- ============================================
/*

To deploy these changes:

1. Run this SQL script in Supabase SQL Editor

2. Enable pg_cron extension (requires superuser):
   - Go to Database → Extensions
   - Enable pg_cron

3. Schedule the jobs:
   SELECT cron.schedule('check-guard-inactivity', '*/15 * * * *', 'SELECT detect_inactive_guards();');
   SELECT cron.schedule('checklist-reminders', '0 9 * * *', 'SELECT send_checklist_reminders();');
   SELECT cron.schedule('daily-compliance-check', '0 8 * * *', 'SELECT process_overdue_alerts();');

4. To unschedule jobs if needed:
   SELECT cron.unschedule('check-guard-inactivity');
   SELECT cron.unschedule('checklist-reminders');
   SELECT cron.unschedule('daily-compliance-check');

5. Verify jobs:
   SELECT * FROM cron.job;

*/
