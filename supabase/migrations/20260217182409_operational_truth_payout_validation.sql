
-- RPC: Validate Bill for Payout (Truth Engine)
CREATE OR REPLACE FUNCTION validate_bill_for_payout(p_bill_id UUID)
RETURNS TABLE (
    can_pay BOOLEAN,
    reason TEXT,
    reconciliation_status TEXT,
    po_amount DECIMAL,
    grn_amount DECIMAL,
    bill_amount DECIMAL
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_po_total DECIMAL(12,2);
    v_grn_total DECIMAL(12,2);
    v_bill_total DECIMAL(12,2);
    v_status TEXT;
    v_payment_status TEXT;
BEGIN
    -- Get Bill Details
    SELECT 
        total_amount, 
        match_status, 
        payment_status 
    INTO v_bill_total, v_status, v_payment_status
    FROM purchase_bills 
    WHERE id = p_bill_id;

    -- Get PO Details (linked via Bill or GRN)
    SELECT sum(total_amount) INTO v_po_total 
    FROM purchase_orders 
    WHERE id IN (
        SELECT po_id FROM purchase_bills WHERE id = p_bill_id
    );

    -- Get GRN Details (linked via Bill)
    SELECT sum(total_amount) INTO v_grn_total 
    FROM material_receipt_notes 
    WHERE id IN (
        SELECT grn_id FROM purchase_bills WHERE id = p_bill_id
    );

    -- HARD ENFORCEMENT:
    IF v_payment_status = 'paid' THEN
        RETURN QUERY SELECT FALSE, 'Bill is already fully paid.', v_status, v_po_total, v_grn_total, v_bill_total;
    ELSIF v_status = 'matched' OR v_status = 'force_matched' THEN
        RETURN QUERY SELECT TRUE, 'Bill is valid for payout.', v_status, v_po_total, v_grn_total, v_bill_total;
    ELSE
        RETURN QUERY SELECT FALSE, 'Reconciliation mismatch detected. Requires manual Force Match by Finance Admin.', v_status, v_po_total, v_grn_total, v_bill_total;
    END IF;
END;
$$;
;
