-- ============================================
-- Task: FIN-001
-- Description: Repair finance payout validation, reconciliation lock propagation,
-- and finance-closure trigger coverage for bills/payments.
-- ============================================

CREATE OR REPLACE FUNCTION public.validate_bill_for_payout(p_bill_id UUID)
RETURNS TABLE (
  is_valid BOOLEAN,
  message TEXT,
  match_status TEXT,
  po_total NUMERIC,
  grn_total NUMERIC,
  bill_total NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_po_id UUID;
  v_grn_id UUID;
  v_payment_status TEXT;
BEGIN
  SELECT
    pb.total_amount,
    COALESCE(pb.match_status, 'pending'),
    pb.payment_status,
    pb.purchase_order_id,
    pb.material_receipt_id
  INTO bill_total, match_status, v_payment_status, v_po_id, v_grn_id
  FROM public.purchase_bills pb
  WHERE pb.id = p_bill_id;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      FALSE,
      'Bill not found.'::TEXT,
      'pending'::TEXT,
      0::NUMERIC,
      0::NUMERIC,
      0::NUMERIC;
    RETURN;
  END IF;

  SELECT COALESCE(po.grand_total, 0)
  INTO po_total
  FROM public.purchase_orders po
  WHERE po.id = v_po_id;
  po_total := COALESCE(po_total, 0);

  SELECT COALESCE(grn.total_received_value, 0)
  INTO grn_total
  FROM public.material_receipts grn
  WHERE grn.id = v_grn_id;
  grn_total := COALESCE(grn_total, 0);

  IF v_payment_status = 'paid' THEN
    RETURN QUERY
    SELECT
      FALSE,
      'Bill is already fully paid.'::TEXT,
      match_status,
      po_total,
      grn_total,
      bill_total;
  ELSIF match_status IN ('matched', 'force_matched') THEN
    RETURN QUERY
    SELECT
      TRUE,
      'Bill is valid for payout.'::TEXT,
      match_status,
      po_total,
      grn_total,
      bill_total;
  ELSE
    RETURN QUERY
    SELECT
      FALSE,
      'Reconciliation mismatch detected. Requires manual Force Match by Finance Admin.'::TEXT,
      match_status,
      po_total,
      grn_total,
      bill_total;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_purchase_bill_match_status_from_reconciliation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match_status TEXT;
  v_reconciled_at TIMESTAMPTZ;
  v_reconciled_by UUID;
BEGIN
  IF NEW.purchase_bill_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'matched' THEN
    v_match_status := 'matched';
    v_reconciled_at := COALESCE(NEW.updated_at, NEW.created_at, NOW());
    v_reconciled_by := COALESCE(NEW.updated_by, NEW.created_by);
  ELSIF NEW.status = 'resolved' THEN
    v_match_status := 'force_matched';
    v_reconciled_at := COALESCE(NEW.resolved_at, NEW.updated_at, NEW.created_at, NOW());
    v_reconciled_by := COALESCE(NEW.resolved_by, NEW.updated_by, NEW.created_by);
  ELSE
    RETURN NEW;
  END IF;

  UPDATE public.purchase_bills
  SET
    is_reconciled = TRUE,
    reconciled_at = COALESCE(v_reconciled_at, reconciled_at, NOW()),
    reconciled_by = COALESCE(v_reconciled_by, reconciled_by),
    match_status = v_match_status
  WHERE id = NEW.purchase_bill_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_purchase_bill_match_status ON public.reconciliations;
CREATE TRIGGER trigger_sync_purchase_bill_match_status
AFTER INSERT OR UPDATE OF status, resolved_at, resolved_by, updated_at, updated_by
ON public.reconciliations
FOR EACH ROW
EXECUTE FUNCTION public.sync_purchase_bill_match_status_from_reconciliation();

WITH latest_reconciliation AS (
  SELECT DISTINCT ON (r.purchase_bill_id)
    r.purchase_bill_id,
    CASE
      WHEN r.status = 'matched' THEN 'matched'
      ELSE 'force_matched'
    END AS synced_match_status,
    COALESCE(r.resolved_at, r.updated_at, r.created_at, NOW()) AS synced_reconciled_at,
    COALESCE(r.resolved_by, r.updated_by, r.created_by) AS synced_reconciled_by
  FROM public.reconciliations r
  WHERE r.purchase_bill_id IS NOT NULL
    AND r.status IN ('matched', 'resolved')
  ORDER BY
    r.purchase_bill_id,
    CASE WHEN r.status = 'matched' THEN 0 ELSE 1 END,
    COALESCE(r.resolved_at, r.updated_at, r.created_at) DESC NULLS LAST
)
UPDATE public.purchase_bills pb
SET
  is_reconciled = TRUE,
  reconciled_at = COALESCE(pb.reconciled_at, latest_reconciliation.synced_reconciled_at),
  reconciled_by = COALESCE(pb.reconciled_by, latest_reconciliation.synced_reconciled_by),
  match_status = latest_reconciliation.synced_match_status
FROM latest_reconciliation
WHERE pb.id = latest_reconciliation.purchase_bill_id
  AND COALESCE(pb.match_status, 'pending') NOT IN ('matched', 'force_matched');

CREATE OR REPLACE FUNCTION public.check_finance_closure()
RETURNS TRIGGER AS $$
DECLARE
  v_target_date DATE;
BEGIN
  IF TG_TABLE_NAME = 'purchase_bills' THEN
    v_target_date := COALESCE(NEW.bill_date, OLD.bill_date);
  ELSIF TG_TABLE_NAME = 'sale_bills' THEN
    v_target_date := COALESCE(NEW.invoice_date, OLD.invoice_date);
  ELSIF TG_TABLE_NAME = 'payments' THEN
    v_target_date := COALESCE(NEW.payment_date, OLD.payment_date);
  ELSIF TG_TABLE_NAME = 'ledger_entries' THEN
    v_target_date := COALESCE(NEW.entry_date, OLD.entry_date);
  ELSE
    v_target_date := CURRENT_DATE;
  END IF;

  IF public.is_period_closed(v_target_date) THEN
    RAISE EXCEPTION 'Financial period for % is closed. Modifications not allowed.', v_target_date;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_bills') THEN
    DROP TRIGGER IF EXISTS trigger_check_purchase_bills_closure ON public.purchase_bills;
    CREATE TRIGGER trigger_check_purchase_bills_closure
    BEFORE INSERT OR UPDATE OR DELETE ON public.purchase_bills
    FOR EACH ROW
    EXECUTE FUNCTION public.check_finance_closure();
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sale_bills') THEN
    DROP TRIGGER IF EXISTS trigger_check_sale_bills_closure ON public.sale_bills;
    CREATE TRIGGER trigger_check_sale_bills_closure
    BEFORE INSERT OR UPDATE OR DELETE ON public.sale_bills
    FOR EACH ROW
    EXECUTE FUNCTION public.check_finance_closure();
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
    DROP TRIGGER IF EXISTS trigger_check_payments_closure ON public.payments;
    CREATE TRIGGER trigger_check_payments_closure
    BEFORE INSERT OR UPDATE OR DELETE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.check_finance_closure();
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ledger_entries') THEN
    DROP TRIGGER IF EXISTS trigger_check_ledger_entries_closure ON public.ledger_entries;
    CREATE TRIGGER trigger_check_ledger_entries_closure
    BEFORE INSERT OR UPDATE OR DELETE ON public.ledger_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.check_finance_closure();
  END IF;
END;
$$;
