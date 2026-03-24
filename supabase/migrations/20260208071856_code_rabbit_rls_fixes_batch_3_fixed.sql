
-- 1. Update Insert Job Photos policy
DROP POLICY IF EXISTS "Insert Job Photos" ON job_photos;
CREATE POLICY "Insert Job Photos" ON job_photos 
    FOR INSERT TO authenticated 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM job_sessions js
            WHERE js.id = job_photos.job_session_id
            AND (
                js.technician_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
                OR get_user_role() IN ('admin', 'company_hod', 'society_manager')
            )
        )
    );

-- 2. Update Insert Job Materials policy
DROP POLICY IF EXISTS "Insert Job Materials" ON job_materials_used;
CREATE POLICY "Insert Job Materials" ON job_materials_used 
    FOR INSERT TO authenticated 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM job_sessions js
            WHERE js.id = job_materials_used.job_session_id
            AND (
                js.technician_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
                OR get_user_role() IN ('admin', 'company_hod', 'society_manager')
            )
        )
    );
;
