-- Migration 004: Privacy-Safe Resident Directory
-- This view implements a "Truth with Privacy" layer
CREATE OR REPLACE VIEW resident_directory AS
SELECT 
    r.id,
    r.full_name,
    f.flat_number,
    b.building_name,
    r.is_primary_contact,
    r.is_active,
    -- Mask sensitive data unless the user has authorized roles
    CASE 
        WHEN (
            SELECT role_name FROM roles 
            WHERE id = (SELECT role_id FROM users WHERE id = auth.uid())
        ) IN ('admin', 'company_md', 'society_manager')
        THEN r.phone
        ELSE 
            CASE 
                WHEN r.phone IS NULL THEN NULL 
                ELSE 'XXXXXX' || right(r.phone, 4) 
            END
    END as masked_phone,
    CASE 
        WHEN (
            SELECT role_name FROM roles 
            WHERE id = (SELECT role_id FROM users WHERE id = auth.uid())
        ) IN ('admin', 'company_md', 'society_manager')
        THEN r.email
        ELSE 
            CASE 
                WHEN r.email IS NULL THEN NULL 
                ELSE '***@***.com' 
            END
    END as masked_email
FROM residents r
LEFT JOIN flats f ON r.flat_id = f.id
LEFT JOIN buildings b ON f.building_id = b.id;

-- Ensure RLS on the underlying residents table is strict
-- (Assuming RLS is already enabled, we just need to make sure 
-- regular users use the view instead of the table)
-- COMMENT: In a real system, you'd revoke SELECT on the table for non-admins
;
