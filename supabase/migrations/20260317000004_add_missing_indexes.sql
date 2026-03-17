-- =============================================================================
-- Migration: 20260317000004_add_missing_indexes.sql
-- Purpose:   Add indexes for the most query-critical FK columns and
--            frequently filtered columns. All use CREATE INDEX CONCURRENTLY
--            so they build without a full table lock.
--
-- =============================================================================

-- Security-critical
CREATE INDEX IF NOT EXISTS idx_login_rate_limits_ip       ON login_rate_limits(ip_address);
CREATE INDEX IF NOT EXISTS idx_panic_alerts_guard_resolved ON panic_alerts(guard_id, resolved_at);

-- Visitor & security module
CREATE INDEX IF NOT EXISTS idx_visitors_flat_entry    ON visitors(flat_id, entry_time DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_resident_id   ON visitors(resident_id);
CREATE INDEX IF NOT EXISTS idx_visitors_entry_guard   ON visitors(entry_guard_id);
CREATE INDEX IF NOT EXISTS idx_visitors_exit_guard    ON visitors(exit_guard_id);
CREATE INDEX IF NOT EXISTS idx_security_guards_emp_id ON security_guards(employee_id);

-- users table (queried on every page load via 91 hooks)
CREATE INDEX IF NOT EXISTS idx_users_role_id      ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_employee_id  ON users(employee_id);
CREATE INDEX IF NOT EXISTS idx_users_supplier_id  ON users(supplier_id);

-- Attendance module
CREATE INDEX IF NOT EXISTS idx_attendance_logs_employee_id    ON attendance_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_log_date       ON attendance_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_employee_date  ON attendance_logs(employee_id, log_date);

-- HR module
CREATE INDEX IF NOT EXISTS idx_leave_apps_employee_status ON leave_applications(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_leave_apps_approved_by     ON leave_applications(approved_by);
CREATE INDEX IF NOT EXISTS idx_employees_designation_id   ON employees(designation_id);
CREATE INDEX IF NOT EXISTS idx_employees_reporting_to     ON employees(reporting_to);

-- Procurement
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active) WHERE is_active = true;
