-- =============================================================================
-- Migration: 20260401000002_finance_service_deployment_alignment.sql
-- Purpose:   Bridge the gap between service deployments and the finance module.
--            Adds service_purchase_order_id to purchase_bills and ensures 
--            request status propagates to 'paid' when linked bills are settled.
--            Also adds request/indent links to service_purchase_orders.
-- =============================================================================

-- 1. Add link from purchase_bills to service_purchase_orders
ALTER TABLE public.purchase_bills
  ADD COLUMN IF NOT EXISTS service_purchase_order_id UUID REFERENCES public.service_purchase_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_bills_service_purchase_order_id
  ON public.purchase_bills(service_purchase_order_id);

-- 2. Add back-links to service_purchase_orders for workflow traceability
ALTER TABLE public.service_purchase_orders
  ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES public.requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS indent_id UUID REFERENCES public.indents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_service_purchase_orders_request_id
  ON public.service_purchase_orders(request_id);

CREATE INDEX IF NOT EXISTS idx_service_purchase_orders_indent_id
  ON public.service_purchase_orders(indent_id);

-- 3. Trigger to propagate 'paid' status back to requests table
CREATE OR REPLACE FUNCTION public.propagate_payment_status_to_request()
RETURNS TRIGGER AS $$
DECLARE
  v_request_id UUID;
BEGIN
  -- We only care if payment_status changed to 'paid'
  IF NEW.payment_status <> 'paid' THEN
    RETURN NEW;
  END IF;

  -- Find the originating request
  IF NEW.purchase_order_id IS NOT NULL THEN
    -- Material Flow: purchase_bill -> purchase_order -> indent -> request
    SELECT r.id INTO v_request_id
    FROM public.requests r
    JOIN public.indents i ON r.indent_id = i.id
    JOIN public.purchase_orders po ON po.indent_id = i.id
    WHERE po.id = NEW.purchase_order_id;
  ELSIF NEW.service_purchase_order_id IS NOT NULL THEN
    -- Service Flow: purchase_bill -> service_purchase_order -> request
    SELECT request_id INTO v_request_id
    FROM public.service_purchase_orders
    WHERE id = NEW.service_purchase_order_id;
  END IF;

  IF v_request_id IS NOT NULL THEN
    -- Set request status to paid
    UPDATE public.requests
    SET 
      status = 'paid',
      updated_at = NOW()
    WHERE id = v_request_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_purchase_bills_payment_propagation ON public.purchase_bills;
CREATE TRIGGER tr_purchase_bills_payment_propagation
  AFTER UPDATE OF payment_status ON public.purchase_bills
  FOR EACH ROW
  WHEN (NEW.payment_status = 'paid')
  EXECUTE FUNCTION public.propagate_payment_status_to_request();
