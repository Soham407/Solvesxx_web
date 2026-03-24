
-- 1. Update View: CONCAT_WS for technician_name
CREATE OR REPLACE VIEW service_requests_with_details 
WITH (security_invoker = on) AS
SELECT 
    sr.*,
    a.name AS asset_name,
    a.asset_code,
    CONCAT_WS(' ', e.first_name, e.last_name) AS technician_name,
    cl.location_name,
    sv.service_name
FROM service_requests sr
LEFT JOIN assets a ON sr.asset_id = a.id
LEFT JOIN employees e ON sr.assigned_to = e.id
LEFT JOIN company_locations cl ON sr.location_id = cl.id
LEFT JOIN services sv ON sr.service_id = sv.id;

-- 2. Update QR Codes policy
DROP POLICY IF EXISTS "Update QR Codes" ON qr_codes;
CREATE POLICY "Update QR Codes" ON qr_codes 
    FOR UPDATE TO authenticated 
    USING (get_user_role() IN ('admin', 'company_hod', 'society_manager'));

-- 3. Add Reorder Rules SELECT policy (Corrected roles)
DROP POLICY IF EXISTS "View Reorder Rules" ON reorder_rules;
CREATE POLICY "View Reorder Rules" ON reorder_rules 
    FOR SELECT TO authenticated 
    USING (get_user_role() IN ('admin', 'company_hod', 'account', 'society_manager', 'service_boy', 'security_supervisor', 'buyer'));

-- 4. Add Check Constraint for Stock
ALTER TABLE stock_batches DROP CONSTRAINT IF EXISTS chk_current_quantity_non_negative;
ALTER TABLE stock_batches ADD CONSTRAINT chk_current_quantity_non_negative CHECK (current_quantity >= 0);

-- 5. Update Stock Deduction Function (with locking and validation)
CREATE OR REPLACE FUNCTION deduct_stock_on_material_use()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    available_quantity DECIMAL(10, 2);
    target_batch_id UUID;
BEGIN
    IF NEW.stock_batch_id IS NOT NULL THEN
        target_batch_id := NEW.stock_batch_id;
        
        -- Lock the row and get current quantity
        SELECT current_quantity INTO available_quantity
        FROM stock_batches
        WHERE id = target_batch_id
        FOR UPDATE;
        
        -- Check if sufficient stock exists
        IF available_quantity IS NULL THEN
            RAISE EXCEPTION 'Stock batch % not found', target_batch_id;
        END IF;
        
        IF available_quantity < NEW.quantity THEN
            RAISE EXCEPTION 'Insufficient stock in batch %. Available: %, Requested: %', 
                target_batch_id, available_quantity, NEW.quantity;
        END IF;
        
        -- Perform the deduction
        UPDATE stock_batches
        SET current_quantity = current_quantity - NEW.quantity,
            status = CASE 
                WHEN current_quantity - NEW.quantity <= 0 THEN 'depleted'
                ELSE status
            END
        WHERE id = target_batch_id;
    END IF;
    RETURN NEW;
END;
$$;
;
