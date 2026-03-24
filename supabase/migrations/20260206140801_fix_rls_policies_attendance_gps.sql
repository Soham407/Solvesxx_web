-- ============================================
-- Fix #5e: Fix RLS policies for attendance_logs and gps_tracking
-- ============================================

-- === ATTENDANCE LOGS ===
DROP POLICY IF EXISTS "Guards can view their own attendance" ON attendance_logs;
DROP POLICY IF EXISTS "Guards can clock in/out" ON attendance_logs;
DROP POLICY IF EXISTS "Guards can update their own attendance" ON attendance_logs;
DROP POLICY IF EXISTS "Admins can view all attendance" ON attendance_logs;

-- Employees can view their own attendance
CREATE POLICY "Employees can view their own attendance"
ON attendance_logs FOR SELECT
USING (employee_id = get_employee_id());

-- Employees can insert their own attendance
CREATE POLICY "Employees can clock in"
ON attendance_logs FOR INSERT
WITH CHECK (employee_id = get_employee_id());

-- Employees can update their own attendance (clock out)
CREATE POLICY "Employees can update their own attendance"
ON attendance_logs FOR UPDATE
USING (employee_id = get_employee_id())
WITH CHECK (employee_id = get_employee_id());

-- Supervisors and managers can view all attendance
CREATE POLICY "Supervisors can view all attendance"
ON attendance_logs FOR SELECT
USING (
  has_role('admin') OR 
  has_role('security_supervisor') OR 
  has_role('society_manager')
);

-- === GPS TRACKING ===
DROP POLICY IF EXISTS "Guards can insert their own GPS data" ON gps_tracking;
DROP POLICY IF EXISTS "Guards can view their own GPS history" ON gps_tracking;
DROP POLICY IF EXISTS "Supervisors can view all GPS data" ON gps_tracking;

-- Guards can insert their own GPS data (using guard_id since FK references security_guards)
CREATE POLICY "Guards can insert their own GPS data"
ON gps_tracking FOR INSERT
WITH CHECK (employee_id = get_guard_id());

-- Guards can view their own GPS history
CREATE POLICY "Guards can view their own GPS history"
ON gps_tracking FOR SELECT
USING (employee_id = get_guard_id());

-- Supervisors and managers can view all GPS data
CREATE POLICY "Supervisors can view all GPS data"
ON gps_tracking FOR SELECT
USING (
  has_role('admin') OR 
  has_role('security_supervisor') OR 
  has_role('society_manager')
);;
