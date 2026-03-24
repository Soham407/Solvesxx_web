-- ============================================
-- Migration: fix_finance_closure_target_dates
-- Description: Align finance closure trigger with the live bill and payment column names.
-- ============================================

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
$$ LANGUAGE plpgsql SET search_path = public;
