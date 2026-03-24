-- ============================================================================
-- 5. VISITORS - Update Policy
-- ============================================================================

DROP POLICY IF EXISTS "Guards can update visitors" ON visitors;
CREATE POLICY "Guards can update visitors" ON visitors FOR UPDATE
USING (is_guard())
WITH CHECK (is_guard());

-- ============================================================================
-- 7. GPS TRACKING - Admin Restriction
-- ============================================================================

-- Note: get_guard_id() returns security_guards.id, which maps to the gps_tracking.employee_id column.
DROP POLICY IF EXISTS "Admins can manage gps_tracking" ON gps_tracking;
CREATE POLICY "Admins can manage gps_tracking" ON gps_tracking FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- ============================================================================
-- 10. TRIGGERS & BUSINESS LOGIC
-- ============================================================================

-- Function to prevent guards from modifying immutable visitor fields
CREATE OR REPLACE FUNCTION check_visitor_immutability()
RETURNS TRIGGER AS $$
BEGIN
    -- If the user is a guard and NOT an admin, enforce immutability
    IF is_guard() AND NOT is_admin() THEN
        IF OLD.flat_id IS DISTINCT FROM NEW.flat_id OR 
           OLD.visitor_name IS DISTINCT FROM NEW.visitor_name OR
           OLD.approved_by_resident IS DISTINCT FROM NEW.approved_by_resident OR
           OLD.resident_id IS DISTINCT FROM NEW.resident_id OR
           OLD.visitor_type IS DISTINCT FROM NEW.visitor_type THEN
            RAISE EXCEPTION 'Security Policy: Guards cannot modify immutable visitor fields (Name, Flat, Approval Status).';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply immutability trigger to visitors table
DROP TRIGGER IF EXISTS tr_visitor_immutability ON visitors;
CREATE TRIGGER tr_visitor_immutability
BEFORE UPDATE ON visitors
FOR EACH ROW
EXECUTE FUNCTION check_visitor_immutability();;
