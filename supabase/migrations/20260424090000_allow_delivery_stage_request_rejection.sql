-- Allow buyer-side delivery rejection from late material delivery states.
-- This keeps the existing request_status enum unchanged and updates the
-- transition guard to permit the real workflow used by the web app.

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

  IF NEW.status = 'rejected' THEN
    IF OLD.status IN ('pending', 'po_dispatched', 'material_received') THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Can only reject from Pending, PO Dispatched, or Material Received states';
  END IF;

  SELECT array_position(status_order, OLD.status::TEXT) INTO old_rank;
  SELECT array_position(status_order, NEW.status::TEXT) INTO new_rank;

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

ALTER FUNCTION public.enforce_request_status_transition() SET search_path = public;

COMMENT ON FUNCTION public.enforce_request_status_transition() IS
  'Shared request workflow guard with a service-safe bridge from po_issued to bill_generated and buyer delivery rejection allowed from pending, po_dispatched, and material_received.';
