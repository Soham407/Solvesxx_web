-- ============================================================================
-- RLS Policies: daily_checklists, checklist_responses
-- Both tables have RLS enabled but no policies in the live DB.
-- Without these: guards see an empty checklist and all response inserts fail.
-- ============================================================================

-- ============================================================================
-- DAILY CHECKLISTS (templates — not personal data)
-- All authenticated users need SELECT so Security, Housekeeping, and
-- Maintenance staff can load their department's template.
-- Only admins/managers can create or modify templates.
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view checklists" ON daily_checklists;
CREATE POLICY "Authenticated users can view checklists" ON daily_checklists FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage checklists" ON daily_checklists;
CREATE POLICY "Admins can manage checklists" ON daily_checklists FOR ALL
TO authenticated
USING (get_user_role()::TEXT IN ('admin', 'super_admin', 'society_manager'))
WITH CHECK (get_user_role()::TEXT IN ('admin', 'super_admin', 'society_manager'));

-- ============================================================================
-- CHECKLIST RESPONSES (personal — one row per guard per checklist per day)
-- Guards read and insert only their own rows via employee_id → users join.
-- Supervisors and admins need SELECT for reporting/compliance views.
-- ============================================================================

DROP POLICY IF EXISTS "Guards can view their own checklist responses" ON checklist_responses;
CREATE POLICY "Guards can view their own checklist responses" ON checklist_responses FOR SELECT
TO authenticated
USING (
  employee_id IN (
    SELECT employee_id FROM users WHERE id = auth.uid() AND employee_id IS NOT NULL
  )
);

DROP POLICY IF EXISTS "Guards can submit checklist responses" ON checklist_responses;
CREATE POLICY "Guards can submit checklist responses" ON checklist_responses FOR INSERT
TO authenticated
WITH CHECK (
  employee_id IN (
    SELECT employee_id FROM users WHERE id = auth.uid() AND employee_id IS NOT NULL
  )
);

DROP POLICY IF EXISTS "Guards can update their own checklist responses" ON checklist_responses;
CREATE POLICY "Guards can update their own checklist responses" ON checklist_responses FOR UPDATE
TO authenticated
USING (
  employee_id IN (
    SELECT employee_id FROM users WHERE id = auth.uid() AND employee_id IS NOT NULL
  )
)
WITH CHECK (
  employee_id IN (
    SELECT employee_id FROM users WHERE id = auth.uid() AND employee_id IS NOT NULL
  )
);

DROP POLICY IF EXISTS "Supervisors can view all checklist responses" ON checklist_responses;
CREATE POLICY "Supervisors can view all checklist responses" ON checklist_responses FOR SELECT
TO authenticated
USING (get_user_role()::TEXT IN ('admin', 'super_admin', 'security_supervisor', 'society_manager'));

DROP POLICY IF EXISTS "Admins can manage checklist responses" ON checklist_responses;
CREATE POLICY "Admins can manage checklist responses" ON checklist_responses FOR ALL
TO authenticated
USING (get_user_role()::TEXT IN ('admin', 'super_admin'))
WITH CHECK (get_user_role()::TEXT IN ('admin', 'super_admin'));
