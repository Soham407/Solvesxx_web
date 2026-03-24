-- Legacy financial/procurement audit writers still insert into audit_logs using
-- the old table_name/record_id columns. The audit_logs table now uses
-- entity_type/entity_id, so those functions must be aligned or inserts into
-- requests, purchase orders, bills, etc. will fail at runtime.

CREATE OR REPLACE FUNCTION public.log_financial_audit()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.audit_logs (
    entity_type,
    entity_id,
    actor_id,
    actor_role,
    action,
    old_data,
    new_data,
    metadata
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id)::text,
    auth.uid(),
    public.get_my_app_role(),
    TG_OP,
    to_jsonb(OLD),
    to_jsonb(NEW),
    jsonb_build_object('source', 'log_financial_audit')
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.force_match_bill(
  p_bill_id UUID,
  p_reason TEXT,
  p_evidence_url TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_actor_id UUID;
BEGIN
  v_actor_id := auth.uid();

  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.purchase_bills WHERE id = p_bill_id) THEN
    RAISE EXCEPTION 'Bill not found';
  END IF;

  UPDATE public.purchase_bills
  SET
    is_reconciled = TRUE,
    reconciled_at = now(),
    reconciled_by = v_actor_id,
    match_status = 'force_matched',
    notes = COALESCE(notes, '') || E'\n[FORCE MATCH ' || now()::text || '] ' || p_reason
  WHERE id = p_bill_id;

  INSERT INTO public.audit_logs (
    entity_type,
    entity_id,
    actor_id,
    actor_role,
    action,
    new_data,
    metadata,
    evidence_url
  ) VALUES (
    'purchase_bills',
    p_bill_id::text,
    v_actor_id,
    public.get_my_app_role(),
    'FORCE_MATCH',
    jsonb_build_object('reason', p_reason, 'timestamp', now()::text),
    jsonb_build_object('source', 'force_match_bill'),
    p_evidence_url
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
