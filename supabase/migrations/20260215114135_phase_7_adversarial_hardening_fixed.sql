-- 1. UNIVERSAL AUDIT TRIGGER ENFORCEMENT
-- Apply high-fidelity audit to all commercial/operational truth tables
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('requests', 'service_requests', 'indents', 'purchase_orders', 'material_receipts', 'purchase_bills', 'sale_bills', 'visitors', 'attendance_logs')
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS tr_audit_%I ON public.%I', t, t);
        EXECUTE format('CREATE TRIGGER tr_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION log_financial_audit()', t, t);
    END LOOP;
END $$;

-- 2. STATE MACHINE GUARD: Requests Flow
-- Ensures status can only move forward according to STATE_TABLES.md
CREATE OR REPLACE FUNCTION public.enforce_request_status_transition()
RETURNS trigger AS $$
DECLARE
    old_rank int;
    new_rank int;
    status_order text[] := ARRAY[
        'pending', 'accepted', 'rejected', -- Final branch: rejected
        'indent_generated', 'indent_forwarded', 'indent_accepted', 'indent_rejected', -- Final branch: indent_rejected
        'po_issued', 'po_received', 'po_dispatched', 
        'material_received', 'material_acknowledged', 
        'bill_generated', 'paid', 'feedback_pending', 'completed'
    ];
BEGIN
    -- Allow any change if status is not changing or for Admins (Admin bypass discouraged but allowed for emergency recovery)
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    -- Admin bypass check (using our get_user_role function)
    IF get_user_role() = 'admin' THEN
        RETURN NEW;
    END IF;

    -- Logic for non-admins:
    -- 1. Cannot move backward (generally)
    -- 2. Can move to terminal states like 'rejected' or 'indent_rejected' from their allowed sources
    
    SELECT array_position(status_order, OLD.status::text) INTO old_rank;
    SELECT array_position(status_order, NEW.status::text) INTO new_rank;

    -- Rejected/Cancelled logic
    IF NEW.status = 'rejected' AND OLD.status != 'pending' THEN
        RAISE EXCEPTION 'Can only reject from Pending state';
    END IF;

    -- Forward progress only
    IF new_rank IS NULL OR old_rank IS NULL OR new_rank <= old_rank THEN
        RAISE EXCEPTION 'Illegal status transition from % to %', OLD.status, NEW.status;
    END IF;

    -- Skip distance check (max 2 steps to allow auto-transitions like paid -> feedback_pending)
    IF new_rank - old_rank > 2 THEN
        RAISE EXCEPTION 'Cannot skip intermediate workflow steps (Attempted % -> %)', OLD.status, NEW.status;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_guard_request_status ON public.requests;
CREATE TRIGGER tr_guard_request_status BEFORE UPDATE OF status ON public.requests
FOR EACH ROW EXECUTE FUNCTION enforce_request_status_transition();

-- 3. IDEMPOTENCY & DOUBLE-SPEND PROTECTION
-- Prevent recording multiple active payments for the same reference
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idempotency 
ON public.payments (reference_id, payment_type) 
WHERE (status != 'failed' AND status != 'refunded');

-- 4. RLS REINFORCEMENT
-- Hard block: Ensure buyers/suppliers cannot even SEE cross-role prefixes if manipulated via API
DROP POLICY IF EXISTS "Buyers Create Own Requests" ON public.requests;
CREATE POLICY "Buyers Create Own Requests"
ON public.requests FOR INSERT
WITH CHECK (
    (buyer_id = auth.uid()) AND 
    (status = 'pending')
);

DROP POLICY IF EXISTS "Suppliers can view own purchase bills" ON public.purchase_bills;
CREATE POLICY "Suppliers can view own purchase bills"
ON public.purchase_bills FOR SELECT
USING (
    supplier_id IN (SELECT supplier_id FROM public.users WHERE id = auth.uid())
);

-- 5. SERVER-AUTHORITATIVE TIMESTAMPS
-- Prevent clients from backdating submissions
CREATE OR REPLACE FUNCTION public.stamp_server_time()
RETURNS trigger AS $$
BEGIN
    NEW.created_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_stamp_attendance ON public.attendance_logs;
CREATE TRIGGER tr_stamp_attendance BEFORE INSERT ON public.attendance_logs
FOR EACH ROW EXECUTE FUNCTION stamp_server_time();
;
