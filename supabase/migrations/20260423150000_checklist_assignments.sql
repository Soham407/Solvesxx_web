-- ============================================================================
-- checklist_assignments: per-guard checklist assignment table
-- Replaces the department-level lookup in useGuardChecklist.
-- A guard can be assigned multiple checklists; each is tracked independently.
-- ============================================================================

CREATE TABLE IF NOT EXISTS checklist_assignments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checklist_id UUID NOT NULL REFERENCES daily_checklists(id) ON DELETE CASCADE,
  employee_id  UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  assigned_by  UUID REFERENCES auth.users(id),
  assigned_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (checklist_id, employee_id)
);

ALTER TABLE checklist_assignments ENABLE ROW LEVEL SECURITY;

-- Guards can read their own assignments
DROP POLICY IF EXISTS "Guards can view their own checklist assignments" ON checklist_assignments;
CREATE POLICY "Guards can view their own checklist assignments" ON checklist_assignments FOR SELECT
TO authenticated
USING (
  employee_id IN (
    SELECT employee_id FROM users WHERE id = auth.uid() AND employee_id IS NOT NULL
  )
);

-- Supervisors/admins can view all assignments (for reporting)
DROP POLICY IF EXISTS "Supervisors can view all checklist assignments" ON checklist_assignments;
CREATE POLICY "Supervisors can view all checklist assignments" ON checklist_assignments FOR SELECT
TO authenticated
USING (get_user_role()::TEXT IN ('admin', 'super_admin', 'security_supervisor', 'society_manager'));

-- Admins manage all assignments (insert/update/delete)
DROP POLICY IF EXISTS "Admins can manage checklist assignments" ON checklist_assignments;
CREATE POLICY "Admins can manage checklist assignments" ON checklist_assignments FOR ALL
TO authenticated
USING (get_user_role()::TEXT IN ('admin', 'super_admin', 'society_manager'))
WITH CHECK (get_user_role()::TEXT IN ('admin', 'super_admin', 'society_manager'));
