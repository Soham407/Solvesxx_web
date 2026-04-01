-- Harden Service Acknowledgment gate on Supplier Bills for SPO-linked work
-- (1) Extend trigger to catch UPDATE of service_purchase_order_id
-- (2) Ensure status is checked on every relevant modification

-- Update the existing trigger to also fire on UPDATE of the SPO reference
DROP TRIGGER IF EXISTS tr_purchase_bills_service_ack_gate ON public.purchase_bills;

CREATE TRIGGER tr_purchase_bills_service_ack_gate
    BEFORE INSERT OR UPDATE OF service_purchase_order_id ON public.purchase_bills
    FOR EACH ROW
    EXECUTE FUNCTION public.check_service_acknowledgment_gate();

-- Comment for documentation
COMMENT ON TRIGGER tr_purchase_bills_service_ack_gate ON public.purchase_bills IS 'Enforces SPO-linked bills require an acknowledged service acknowledgment record on both insert and reference update.';
