-- Enforce Service Acknowledgment gate on Supplier Bills for SPO-linked work
-- (1) Check that a corresponding service_acknowledgments record exists with status='acknowledged'
-- (2) Before insert on purchase_bills where service_purchase_order_id is NOT NULL

CREATE OR REPLACE FUNCTION public.check_service_acknowledgment_gate()
RETURNS TRIGGER AS $$
BEGIN
    -- Only check for SPO-linked work (Service Purchase Order)
    IF NEW.service_purchase_order_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.service_acknowledgments
            WHERE spo_id = NEW.service_purchase_order_id
            AND status = 'acknowledged'
        ) THEN
            RAISE EXCEPTION 'Service acknowledgment required before billing for SPO-linked work';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to purchase_bills
DROP TRIGGER IF EXISTS tr_purchase_bills_service_ack_gate ON public.purchase_bills;
CREATE TRIGGER tr_purchase_bills_service_ack_gate
    BEFORE INSERT ON public.purchase_bills
    FOR EACH ROW
    EXECUTE FUNCTION public.check_service_acknowledgment_gate();

-- Comment for documentation
COMMENT ON FUNCTION public.check_service_acknowledgment_gate() IS 'Enforces that SPO-linked bills require an acknowledged service acknowledgment record.';
