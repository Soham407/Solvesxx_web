# MCP Execution Guide: Truth Engine RPCs

This guide documents the database-level logic required to support the Operational Truth initiative. Use the `supabase-mcp-server` to execute these migrations if they are missing from a reproduction environment.

## 1. Logistics: Gate Entry Verification
Ensures every material arrival is linked to a PO and a physical photo.

```sql
CREATE OR REPLACE FUNCTION log_gate_entry(
  p_po_id UUID,
  p_photo_url TEXT,
  p_vehicle_number TEXT,
  p_signature_url TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO material_arrival_evidence (
    po_id,
    photo_url,
    vehicle_number,
    signature_url,
    logged_by
  ) VALUES (
    p_po_id,
    p_photo_url,
    p_vehicle_number,
    p_signature_url,
    auth.uid()
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 2. Finance: 3-Way Match Validation
The "Hard Gate" for payouts. Prevents payment if PO != GRN != Bill.

```sql
CREATE OR REPLACE FUNCTION validate_bill_for_payout(p_bill_id UUID)
RETURNS JSON AS $$
DECLARE
  v_bill RECORD;
  v_reconciliation_status TEXT;
  v_can_pay BOOLEAN := FALSE;
  v_reason TEXT;
BEGIN
  SELECT * FROM purchase_bills WHERE id = p_bill_id INTO v_bill;

  -- 1. Check Reconciliation Status
  v_reconciliation_status := v_bill.reconciliation_status;

  -- 2. Truth Logic
  IF v_bill.payment_status = 'paid' THEN
    v_reason := 'Bill already paid.';
  ELSIF v_reconciliation_status IN ('matched', 'force_matched') THEN
    v_can_pay := TRUE;
  ELSE
    v_reason := 'Reconciliation mismatch. Check PO vs GRN vs Bill amounts.';
  END IF;

  RETURN json_build_object(
    'success', TRUE,
    'can_pay', v_can_pay,
    'reason', v_reason,
    'reconciliation_status', v_reconciliation_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 3. Operations: Service Completion Proof
Attaches photo evidence to the work order lifecycle.

```sql
CREATE OR REPLACE FUNCTION complete_service_task(
  p_request_id UUID,
  p_after_photo_url TEXT,
  p_completion_notes TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE service_requests
  SET 
    status = 'completed',
    after_photo = p_after_photo_url,
    resolution_notes = p_completion_notes,
    completed_at = NOW()
  WHERE id = p_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```
