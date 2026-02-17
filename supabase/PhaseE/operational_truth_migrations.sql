-- ============================================================================
-- Phase E: Operational Truth - Database Migrations Bundle
-- ============================================================================
-- Purpose: Convert placeholder UI into operational truth with database-level
--          enforcement using PostgreSQL constraints, RLS, and RPCs.
-- 
-- Execution Order: Run migrations in sequence (001 -> 005)
-- Rollback: Each migration includes a rollback section at the bottom
-- ============================================================================

-- ============================================================================
-- Migration 001: Delivery Truth Engine
-- ============================================================================
-- Purpose: Create material arrival logging system with mandatory photo evidence
-- Tables: material_arrival_logs
-- RPCs: log_material_arrival
-- ============================================================================

BEGIN;

-- Create material arrival logs table
CREATE TABLE IF NOT EXISTS material_arrival_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    vehicle_number TEXT NOT NULL CHECK (length(vehicle_number) >= 4),
    arrival_photo_url TEXT NOT NULL, -- MANDATORY
    arrival_signature_url TEXT, -- Optional for Phase 1
    logged_by UUID NOT NULL REFERENCES users(id),
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    gate_location TEXT,
    notes TEXT,
    
    -- Audit trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS Policies
ALTER TABLE material_arrival_logs ENABLE ROW LEVEL SECURITY;

-- Only delivery_boy and security_guard can create logs
CREATE POLICY "delivery_boy_can_log_arrivals"
ON material_arrival_logs FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('delivery_boy', 'security_guard')
    )
);

-- All authenticated users can view logs
CREATE POLICY "all_can_view_arrival_logs"
ON material_arrival_logs FOR SELECT
TO authenticated
USING (true);

-- Create indexes for performance
CREATE INDEX idx_material_arrival_po ON material_arrival_logs(po_id);
CREATE INDEX idx_material_arrival_logged_by ON material_arrival_logs(logged_by);
CREATE INDEX idx_material_arrival_logged_at ON material_arrival_logs(logged_at DESC);

-- RPC: Log material arrival with validation
CREATE OR REPLACE FUNCTION log_material_arrival(
    p_po_id UUID,
    p_vehicle_number TEXT,
    p_arrival_photo_url TEXT,
    p_arrival_signature_url TEXT DEFAULT NULL,
    p_gate_location TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_log_id UUID;
    v_user_role TEXT;
BEGIN
    -- Verify user role
    SELECT role INTO v_user_role
    FROM users
    WHERE id = auth.uid();
    
    IF v_user_role NOT IN ('delivery_boy', 'security_guard') THEN
        RAISE EXCEPTION 'Unauthorized: Only delivery_boy or security_guard can log arrivals';
    END IF;
    
    -- Verify PO exists
    IF NOT EXISTS (SELECT 1 FROM purchase_orders WHERE id = p_po_id) THEN
        RAISE EXCEPTION 'Invalid PO ID: %', p_po_id;
    END IF;
    
    -- Validate photo URL (must be from Supabase Storage)
    IF p_arrival_photo_url IS NULL OR p_arrival_photo_url = '' THEN
        RAISE EXCEPTION 'Arrival photo is mandatory';
    END IF;
    
    IF NOT p_arrival_photo_url LIKE '%/storage/v1/object/%' THEN
        RAISE EXCEPTION 'Invalid photo URL: Must be from Supabase Storage';
    END IF;
    
    -- Insert log
    INSERT INTO material_arrival_logs (
        po_id,
        vehicle_number,
        arrival_photo_url,
        arrival_signature_url,
        logged_by,
        gate_location,
        notes
    ) VALUES (
        p_po_id,
        p_vehicle_number,
        p_arrival_photo_url,
        p_arrival_signature_url,
        auth.uid(),
        p_gate_location,
        p_notes
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION log_material_arrival TO authenticated;

COMMIT;

-- Rollback for Migration 001
-- DROP FUNCTION IF EXISTS log_material_arrival;
-- DROP TABLE IF EXISTS material_arrival_logs CASCADE;

-- ============================================================================
-- Migration 002: Service Evidence Enforcement
-- ============================================================================
-- Purpose: Enforce before/after photo requirement for service completion
-- Tables: service_requests (add columns)
-- RPCs: start_service_task, complete_service_task
-- ============================================================================

BEGIN;

-- Add evidence columns to service_requests table
ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS before_photo_url TEXT,
ADD COLUMN IF NOT EXISTS after_photo_url TEXT,
ADD COLUMN IF NOT EXISTS completion_signature_url TEXT,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completion_notes TEXT;

-- Create CHECK constraint: Cannot mark as 'completed' without after_photo
ALTER TABLE service_requests
DROP CONSTRAINT IF EXISTS service_completion_requires_photo;

ALTER TABLE service_requests
ADD CONSTRAINT service_completion_requires_photo
CHECK (
    (status != 'completed') OR 
    (status = 'completed' AND after_photo_url IS NOT NULL)
);

-- RPC: Complete service task with evidence validation
CREATE OR REPLACE FUNCTION complete_service_task(
    p_request_id UUID,
    p_after_photo_url TEXT,
    p_completion_signature_url TEXT DEFAULT NULL,
    p_completion_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_status TEXT;
    v_assigned_to UUID;
BEGIN
    -- Fetch current status and assigned technician
    SELECT status, assigned_to
    INTO v_current_status, v_assigned_to
    FROM service_requests
    WHERE id = p_request_id;
    
    -- Verify request exists
    IF v_current_status IS NULL THEN
        RAISE EXCEPTION 'Service request not found: %', p_request_id;
    END IF;
    
    -- Verify user is assigned to this task
    IF v_assigned_to != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: You are not assigned to this task';
    END IF;
    
    -- Validate after photo
    IF p_after_photo_url IS NULL OR p_after_photo_url = '' THEN
        RAISE EXCEPTION 'After photo is mandatory for task completion';
    END IF;
    
    IF NOT p_after_photo_url LIKE '%/storage/v1/object/%' THEN
        RAISE EXCEPTION 'Invalid photo URL: Must be from Supabase Storage';
    END IF;
    
    -- Update service request
    UPDATE service_requests
    SET 
        status = 'completed',
        after_photo_url = p_after_photo_url,
        completion_signature_url = p_completion_signature_url,
        completion_notes = p_completion_notes,
        completed_at = now(),
        updated_at = now()
    WHERE id = p_request_id;
    
    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION complete_service_task TO authenticated;

-- RPC: Start service task (capture before photo)
CREATE OR REPLACE FUNCTION start_service_task(
    p_request_id UUID,
    p_before_photo_url TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Validate before photo
    IF p_before_photo_url IS NULL OR p_before_photo_url = '' THEN
        RAISE EXCEPTION 'Before photo is mandatory to start task';
    END IF;
    
    IF NOT p_before_photo_url LIKE '%/storage/v1/object/%' THEN
        RAISE EXCEPTION 'Invalid photo URL: Must be from Supabase Storage';
    END IF;
    
    -- Update service request
    UPDATE service_requests
    SET 
        status = 'in_progress',
        before_photo_url = p_before_photo_url,
        started_at = now(),
        updated_at = now()
    WHERE id = p_request_id
    AND assigned_to = auth.uid();
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Service request not found or not assigned to you';
    END IF;
    
    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION start_service_task TO authenticated;

COMMIT;

-- Rollback for Migration 002
-- DROP FUNCTION IF EXISTS start_service_task;
-- DROP FUNCTION IF EXISTS complete_service_task;
-- ALTER TABLE service_requests DROP CONSTRAINT IF EXISTS service_completion_requires_photo;
-- ALTER TABLE service_requests DROP COLUMN IF EXISTS before_photo_url;
-- ALTER TABLE service_requests DROP COLUMN IF EXISTS after_photo_url;
-- ALTER TABLE service_requests DROP COLUMN IF EXISTS completion_signature_url;
-- ALTER TABLE service_requests DROP COLUMN IF EXISTS started_at;
-- ALTER TABLE service_requests DROP COLUMN IF EXISTS completed_at;
-- ALTER TABLE service_requests DROP COLUMN IF EXISTS completion_notes;

-- ============================================================================
-- Migration 003: Finance 3-Way Match Enforcement
-- ============================================================================
-- Purpose: Prevent unauthorized payouts by enforcing reconciliation
-- Tables: supplier_bills (add columns), audit_logs (new)
-- RPCs: validate_bill_for_payout, force_match_bill
-- ============================================================================

BEGIN;

-- Add reconciliation_status to supplier_bills if not exists
ALTER TABLE supplier_bills
ADD COLUMN IF NOT EXISTS reconciliation_status TEXT DEFAULT 'pending';

-- Update constraint to include all valid statuses
ALTER TABLE supplier_bills
DROP CONSTRAINT IF EXISTS supplier_bills_reconciliation_status_check;

ALTER TABLE supplier_bills
ADD CONSTRAINT supplier_bills_reconciliation_status_check
CHECK (reconciliation_status IN ('pending', 'matched', 'discrepancy', 'force_matched'));

-- Create CHECK constraint: Cannot pay bill unless reconciled
ALTER TABLE supplier_bills
DROP CONSTRAINT IF EXISTS payment_requires_reconciliation;

ALTER TABLE supplier_bills
ADD CONSTRAINT payment_requires_reconciliation
CHECK (
    (status != 'paid') OR 
    (status = 'paid' AND reconciliation_status IN ('matched', 'force_matched'))
);

-- Create audit_logs table for override tracking
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    performed_by UUID NOT NULL REFERENCES users(id),
    performed_by_email TEXT NOT NULL,
    reason TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "admins_can_view_audit_logs"
ON audit_logs FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'finance_manager')
    )
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by ON audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- RPC: Validate bill for payout
CREATE OR REPLACE FUNCTION validate_bill_for_payout(
    p_bill_id UUID
)
RETURNS TABLE (
    can_pay BOOLEAN,
    reason TEXT,
    reconciliation_status TEXT,
    po_amount NUMERIC,
    grn_amount NUMERIC,
    bill_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_bill RECORD;
BEGIN
    -- Fetch bill details with PO and GRN amounts
    SELECT 
        sb.id,
        sb.reconciliation_status,
        sb.total_amount as bill_amount,
        sb.status,
        po.total_amount as po_amount,
        COALESCE(grn.total_received_amount, 0) as grn_amount
    INTO v_bill
    FROM supplier_bills sb
    LEFT JOIN purchase_orders po ON sb.po_id = po.id
    LEFT JOIN (
        SELECT 
            po_id,
            SUM(received_quantity * unit_price) as total_received_amount
        FROM grn_items
        GROUP BY po_id
    ) grn ON po.id = grn.po_id
    WHERE sb.id = p_bill_id;
    
    -- Check if bill exists
    IF v_bill.id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Bill not found', NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC;
        RETURN;
    END IF;
    
    -- Check if already paid
    IF v_bill.status = 'paid' THEN
        RETURN QUERY SELECT FALSE, 'Bill already paid', v_bill.reconciliation_status, v_bill.po_amount, v_bill.grn_amount, v_bill.bill_amount;
        RETURN;
    END IF;
    
    -- Check reconciliation status
    IF v_bill.reconciliation_status NOT IN ('matched', 'force_matched') THEN
        RETURN QUERY SELECT FALSE, 'Bill not reconciled. Please complete 3-way match.', v_bill.reconciliation_status, v_bill.po_amount, v_bill.grn_amount, v_bill.bill_amount;
        RETURN;
    END IF;
    
    -- All checks passed
    RETURN QUERY SELECT TRUE, 'Bill is ready for payout', v_bill.reconciliation_status, v_bill.po_amount, v_bill.grn_amount, v_bill.bill_amount;
END;
$$;

GRANT EXECUTE ON FUNCTION validate_bill_for_payout TO authenticated;

-- RPC: Force match with audit trail
CREATE OR REPLACE FUNCTION force_match_bill(
    p_bill_id UUID,
    p_override_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_role TEXT;
    v_user_email TEXT;
BEGIN
    -- Verify user is admin or finance_manager
    SELECT role, email INTO v_user_role, v_user_email
    FROM users
    WHERE id = auth.uid();
    
    IF v_user_role NOT IN ('admin', 'finance_manager') THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can force match bills';
    END IF;
    
    -- Validate reason
    IF p_override_reason IS NULL OR length(trim(p_override_reason)) < 10 THEN
        RAISE EXCEPTION 'Override reason must be at least 10 characters';
    END IF;
    
    -- Update bill status
    UPDATE supplier_bills
    SET 
        reconciliation_status = 'force_matched',
        updated_at = now()
    WHERE id = p_bill_id;
    
    -- Log to audit trail
    INSERT INTO audit_logs (
        action_type,
        entity_type,
        entity_id,
        performed_by,
        performed_by_email,
        reason
    ) VALUES (
        'force_match',
        'supplier_bill',
        p_bill_id,
        auth.uid(),
        v_user_email,
        p_override_reason
    );
    
    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION force_match_bill TO authenticated;

COMMIT;

-- Rollback for Migration 003
-- DROP FUNCTION IF EXISTS validate_bill_for_payout;
-- DROP FUNCTION IF EXISTS force_match_bill;
-- DROP TABLE IF EXISTS audit_logs CASCADE;
-- ALTER TABLE supplier_bills DROP CONSTRAINT IF EXISTS payment_requires_reconciliation;
-- ALTER TABLE supplier_bills DROP COLUMN IF EXISTS reconciliation_status;

-- ============================================================================
-- Migration 004: Privacy-Safe Resident Directory
-- ============================================================================
-- Purpose: Enable guards to verify residents without exposing private data
-- Views: resident_verification_view
-- RPCs: search_residents
-- ============================================================================

BEGIN;

-- Create privacy-safe view for guards
CREATE OR REPLACE VIEW resident_verification_view AS
SELECT 
    r.id,
    r.full_name,
    r.flat_number,
    r.profile_photo_url,
    -- Mask phone number: Show first 2 and last 2 digits only
    CASE 
        WHEN r.phone IS NOT NULL THEN
            LEFT(r.phone, 2) || '****' || RIGHT(r.phone, 2)
        ELSE NULL
    END as masked_phone,
    r.society_id,
    r.is_owner,
    r.move_in_date,
    r.status
FROM residents r
WHERE r.status = 'active';

-- Grant select to authenticated users
GRANT SELECT ON resident_verification_view TO authenticated;

-- RPC: Search residents (for guards)
CREATE OR REPLACE FUNCTION search_residents(
    p_query TEXT,
    p_society_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    flat_number TEXT,
    profile_photo_url TEXT,
    masked_phone TEXT,
    is_owner BOOLEAN,
    move_in_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_role TEXT;
BEGIN
    -- Verify user is a guard or security personnel
    SELECT role INTO v_user_role
    FROM users
    WHERE id = auth.uid();
    
    IF v_user_role NOT IN ('security_guard', 'admin', 'supervisor') THEN
        RAISE EXCEPTION 'Unauthorized: Only security personnel can search residents';
    END IF;
    
    -- Search residents
    RETURN QUERY
    SELECT 
        rv.id,
        rv.full_name,
        rv.flat_number,
        rv.profile_photo_url,
        rv.masked_phone,
        rv.is_owner,
        rv.move_in_date
    FROM resident_verification_view rv
    WHERE 
        (p_society_id IS NULL OR rv.society_id = p_society_id)
        AND (
            rv.full_name ILIKE '%' || p_query || '%'
            OR rv.flat_number ILIKE '%' || p_query || '%'
        )
    ORDER BY rv.flat_number
    LIMIT 50;
END;
$$;

GRANT EXECUTE ON FUNCTION search_residents TO authenticated;

COMMIT;

-- Rollback for Migration 004
-- DROP FUNCTION IF EXISTS search_residents;
-- DROP VIEW IF EXISTS resident_verification_view;

-- ============================================================================
-- Migration 005: HRMS Compliance Enforcement
-- ============================================================================
-- Purpose: Enforce BGV document uploads before hiring
-- Tables: employees (add columns)
-- Triggers: update_bgv_docs_count
-- ============================================================================

BEGIN;

-- Add BGV document tracking to employees
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS bgv_docs_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bgv_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS bgv_verified_by UUID REFERENCES users(id);

-- Create CHECK constraint: Cannot hire without BGV docs
ALTER TABLE employees
DROP CONSTRAINT IF EXISTS hiring_requires_bgv;

ALTER TABLE employees
ADD CONSTRAINT hiring_requires_bgv
CHECK (
    (status != 'hired') OR 
    (status = 'hired' AND bgv_docs_count >= 2)
);

-- Trigger: Update bgv_docs_count when documents are uploaded
CREATE OR REPLACE FUNCTION update_bgv_docs_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE employees
    SET bgv_docs_count = (
        SELECT COUNT(*)
        FROM employee_documents
        WHERE employee_id = NEW.employee_id
        AND document_type IN ('police_verification', 'address_proof')
        AND document_url IS NOT NULL
    )
    WHERE id = NEW.employee_id;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_bgv_docs_count ON employee_documents;

CREATE TRIGGER trigger_update_bgv_docs_count
AFTER INSERT OR UPDATE ON employee_documents
FOR EACH ROW
EXECUTE FUNCTION update_bgv_docs_count();

COMMIT;

-- Rollback for Migration 005
-- DROP TRIGGER IF EXISTS trigger_update_bgv_docs_count ON employee_documents;
-- DROP FUNCTION IF EXISTS update_bgv_docs_count;
-- ALTER TABLE employees DROP CONSTRAINT IF EXISTS hiring_requires_bgv;
-- ALTER TABLE employees DROP COLUMN IF EXISTS bgv_docs_count;
-- ALTER TABLE employees DROP COLUMN IF EXISTS bgv_verified_at;
-- ALTER TABLE employees DROP COLUMN IF EXISTS bgv_verified_by;

-- ============================================================================
-- End of Migration Bundle
-- ============================================================================
-- 
-- Verification Queries:
-- 
-- 1. Check all tables created:
--    SELECT table_name FROM information_schema.tables 
--    WHERE table_schema = 'public' 
--    AND table_name IN ('material_arrival_logs', 'audit_logs');
-- 
-- 2. Check all functions created:
--    SELECT routine_name FROM information_schema.routines 
--    WHERE routine_schema = 'public' 
--    AND routine_name IN (
--        'log_material_arrival',
--        'start_service_task',
--        'complete_service_task',
--        'validate_bill_for_payout',
--        'force_match_bill',
--        'search_residents'
--    );
-- 
-- 3. Check all constraints:
--    SELECT conname, conrelid::regclass 
--    FROM pg_constraint 
--    WHERE contype = 'c' 
--    AND conname IN (
--        'service_completion_requires_photo',
--        'payment_requires_reconciliation',
--        'hiring_requires_bgv'
--    );
-- 
-- ============================================================================
