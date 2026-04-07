-- =============================================================================
-- Migration: 20260405000000_service_ops_closure.sql
-- Purpose:
-- 1. Repoint personnel_dispatches.service_po_id to service_purchase_orders.
-- 2. Harden SPO billing so deployment confirmation is required before billing.
-- 3. Allow service requests to bridge from po_issued -> bill_generated only when
--    the deeper deployment evidence is already present in the service tables.
-- 4. Make request status sync server-authoritative from purchase_bills rows.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Personnel dispatches belong to service purchase orders, not material POs.
-- Keep the new FK NOT VALID so historical bad rows do not block deployment of
-- the repair; new writes are still enforced immediately.
-- ---------------------------------------------------------------------------
ALTER TABLE public.personnel_dispatches
  DROP CONSTRAINT IF EXISTS personnel_dispatches_service_po_id_fkey;

ALTER TABLE public.personnel_dispatches
  ADD CONSTRAINT personnel_dispatches_service_po_id_fkey
  FOREIGN KEY (service_po_id)
  REFERENCES public.service_purchase_orders(id)
  ON DELETE CASCADE
  NOT VALID;

COMMENT ON CONSTRAINT personnel_dispatches_service_po_id_fkey ON public.personnel_dispatches
  IS 'Dispatch rows must reference service_purchase_orders so staffing deployments persist against SPOs.';

-- ---------------------------------------------------------------------------
-- Server-authoritative gate: service bills require both supplier acknowledgment
-- and an admin/site-confirmed deployment state.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_service_acknowledgment_gate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_spo_status TEXT;
BEGIN
  IF NEW.service_purchase_order_id IS NOT NULL THEN
    SELECT spo.status
    INTO v_spo_status
    FROM public.service_purchase_orders spo
    WHERE spo.id = NEW.service_purchase_order_id;

    IF v_spo_status IS NULL THEN
      RAISE EXCEPTION 'Service purchase order not found for billing';
    END IF;

    IF v_spo_status NOT IN ('deployment_confirmed', 'completed') THEN
      RAISE EXCEPTION 'Service deployment must be confirmed before billing for SPO-linked work';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.service_acknowledgments
      WHERE spo_id = NEW.service_purchase_order_id
        AND status = 'acknowledged'
    ) THEN
      RAISE EXCEPTION 'Service acknowledgment required before billing for SPO-linked work';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.service_delivery_notes
      WHERE po_id = NEW.service_purchase_order_id
        AND status IN ('pending', 'verified')
    ) THEN
      RAISE EXCEPTION 'Service delivery note required before billing for SPO-linked work';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.check_service_acknowledgment_gate() IS
  'Blocks SPO-linked bills until the deployment has a delivery note, an acknowledged service_acknowledgments row, and a deployment-confirmed SPO.';

-- ---------------------------------------------------------------------------
-- Helper for the shared request status guard. Service requests do not have
-- material-only request states for delivery/acknowledgment, so they can bridge
-- directly once the service-specific evidence is already present.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.service_request_can_bridge_to_bill_generated(
  p_request_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.service_purchase_orders spo
    JOIN public.service_acknowledgments ack
      ON ack.spo_id = spo.id
     AND ack.status = 'acknowledged'
    WHERE spo.request_id = p_request_id
      AND spo.status IN ('deployment_confirmed', 'completed')
      AND EXISTS (
        SELECT 1
        FROM public.service_delivery_notes note
        WHERE note.po_id = spo.id
          AND note.status IN ('pending', 'verified')
      )
  );
$$;

COMMENT ON FUNCTION public.service_request_can_bridge_to_bill_generated(UUID) IS
  'Allows service requests to bridge from po_issued to bill_generated once deployment evidence lives in the service tables.';

CREATE OR REPLACE FUNCTION public.enforce_request_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  old_rank INT;
  new_rank INT;
  v_is_service_request BOOLEAN := COALESCE(NEW.is_service_request, OLD.is_service_request, FALSE);
  v_actor_role TEXT := COALESCE(public.get_my_app_role(), public.get_user_role()::TEXT);
  status_order TEXT[] := ARRAY[
    'pending', 'accepted', 'rejected',
    'indent_generated', 'indent_forwarded', 'indent_accepted', 'indent_rejected',
    'po_issued', 'po_received', 'po_dispatched',
    'material_received', 'material_acknowledged',
    'bill_generated', 'paid', 'feedback_pending', 'completed'
  ];
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF v_actor_role IN ('admin', 'super_admin') THEN
    RETURN NEW;
  END IF;

  SELECT array_position(status_order, OLD.status::TEXT) INTO old_rank;
  SELECT array_position(status_order, NEW.status::TEXT) INTO new_rank;

  IF NEW.status = 'rejected' AND OLD.status != 'pending' THEN
    RAISE EXCEPTION 'Can only reject from Pending state';
  END IF;

  IF new_rank IS NULL OR old_rank IS NULL OR new_rank <= old_rank THEN
    RAISE EXCEPTION 'Illegal status transition from % to %', OLD.status, NEW.status;
  END IF;

  IF v_is_service_request
     AND OLD.status = 'po_issued'
     AND NEW.status = 'bill_generated' THEN
    IF public.service_request_can_bridge_to_bill_generated(OLD.id) THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Service deployment must be confirmed before billing can be generated';
  END IF;

  IF new_rank - old_rank > 2 THEN
    RAISE EXCEPTION 'Cannot skip intermediate workflow steps (Attempted % -> %)', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_request_status_transition() IS
  'Shared request workflow guard with a service-safe bridge from po_issued to bill_generated once deployment evidence exists.';

-- ---------------------------------------------------------------------------
-- Request-state propagation must happen from the bill row, not from a client
-- hook that can ignore failed writes.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_request_status_from_purchase_bill()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id UUID;
  v_current_status TEXT;
  v_target_status public.request_status;
BEGIN
  IF NEW.purchase_order_id IS NOT NULL THEN
    SELECT r.id, r.status::TEXT
    INTO v_request_id, v_current_status
    FROM public.requests r
    JOIN public.indents i ON i.id = r.indent_id
    JOIN public.purchase_orders po ON po.indent_id = i.id
    WHERE po.id = NEW.purchase_order_id
    LIMIT 1;
  ELSIF NEW.service_purchase_order_id IS NOT NULL THEN
    SELECT r.id, r.status::TEXT
    INTO v_request_id, v_current_status
    FROM public.service_purchase_orders spo
    JOIN public.requests r ON r.id = spo.request_id
    WHERE spo.id = NEW.service_purchase_order_id
    LIMIT 1;
  END IF;

  IF v_request_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.payment_status = 'paid' THEN
    v_target_status := 'paid';
  ELSIF COALESCE(NEW.status, '') NOT IN ('draft', 'cancelled', 'rejected') THEN
    v_target_status := 'bill_generated';
  ELSE
    RETURN NEW;
  END IF;

  IF v_target_status = 'bill_generated'
     AND v_current_status IN ('bill_generated', 'paid', 'feedback_pending', 'completed') THEN
    RETURN NEW;
  END IF;

  IF v_target_status = 'paid'
     AND v_current_status IN ('paid', 'feedback_pending', 'completed') THEN
    RETURN NEW;
  END IF;

  UPDATE public.requests
  SET
    status = v_target_status,
    updated_at = NOW()
  WHERE id = v_request_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_purchase_bills_payment_propagation ON public.purchase_bills;
DROP TRIGGER IF EXISTS tr_purchase_bills_request_status_sync ON public.purchase_bills;
CREATE TRIGGER tr_purchase_bills_request_status_sync
  AFTER INSERT OR UPDATE OF status, payment_status, purchase_order_id, service_purchase_order_id
  ON public.purchase_bills
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_request_status_from_purchase_bill();

COMMENT ON TRIGGER tr_purchase_bills_request_status_sync ON public.purchase_bills IS
  'Propagates bill_generated and paid back to requests for both material and service flows.';

-- ---------------------------------------------------------------------------
-- Repair stale service requests that already have bills linked from a prior run.
-- ---------------------------------------------------------------------------
UPDATE public.requests r
SET
  status = 'bill_generated',
  updated_at = NOW()
WHERE r.is_service_request = TRUE
  AND r.status = 'po_issued'
  AND public.service_request_can_bridge_to_bill_generated(r.id)
  AND EXISTS (
    SELECT 1
    FROM public.service_purchase_orders spo
    JOIN public.purchase_bills pb
      ON pb.service_purchase_order_id = spo.id
    WHERE spo.request_id = r.id
  );

UPDATE public.requests r
SET
  status = 'paid',
  updated_at = NOW()
WHERE r.is_service_request = TRUE
  AND r.status = 'bill_generated'
  AND EXISTS (
    SELECT 1
    FROM public.service_purchase_orders spo
    JOIN public.purchase_bills pb
      ON pb.service_purchase_order_id = spo.id
    WHERE spo.request_id = r.id
      AND pb.payment_status = 'paid'
  );
