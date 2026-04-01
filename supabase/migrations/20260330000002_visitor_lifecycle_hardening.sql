-- ============================================
-- Migration: visitor lifecycle hardening
-- Description: complete VISITOR-001 visitor lifecycle hardening
-- ============================================

-- Restore resident access to the deny RPC.
GRANT EXECUTE ON FUNCTION public.deny_visitor(UUID, UUID, TEXT) TO authenticated;

-- Persist a real audit trail for bypassed approvals instead of only storing the reason on visitors.
CREATE TABLE IF NOT EXISTS public.visitor_bypass_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
  bypass_reason TEXT NOT NULL,
  bypassed_by_auth_user_id UUID,
  entry_guard_id UUID REFERENCES public.security_guards(id) ON DELETE SET NULL,
  resident_id UUID REFERENCES public.residents(id) ON DELETE SET NULL,
  flat_id UUID REFERENCES public.flats(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.visitor_bypass_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view visitor bypass audit" ON public.visitor_bypass_audit;
CREATE POLICY "Admins can view visitor bypass audit"
ON public.visitor_bypass_audit
FOR SELECT
USING (
  has_role('admin')
  OR has_role('super_admin')
  OR has_role('society_manager')
  OR has_role('security_supervisor')
);

CREATE INDEX IF NOT EXISTS idx_visitor_bypass_audit_visitor_id
  ON public.visitor_bypass_audit(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visitor_bypass_audit_created_at
  ON public.visitor_bypass_audit(created_at DESC);

CREATE OR REPLACE FUNCTION public.log_visitor_bypass_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.bypass_reason IS NULL OR btrim(NEW.bypass_reason) = '' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.bypass_reason IS NOT DISTINCT FROM NEW.bypass_reason THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.visitor_bypass_audit (
    visitor_id,
    bypass_reason,
    bypassed_by_auth_user_id,
    entry_guard_id,
    resident_id,
    flat_id
  )
  VALUES (
    NEW.id,
    NEW.bypass_reason,
    auth.uid(),
    NEW.entry_guard_id,
    NEW.resident_id,
    NEW.flat_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_visitor_bypass_audit ON public.visitors;
CREATE TRIGGER tr_visitor_bypass_audit
AFTER INSERT OR UPDATE OF bypass_reason ON public.visitors
FOR EACH ROW
EXECUTE FUNCTION public.log_visitor_bypass_audit();

-- Guards can still register walk-ins, but only genuine fast-track visitors may self-approve at insert time.
DROP POLICY IF EXISTS "Guards can check in visitors" ON public.visitors;
CREATE POLICY "Guards can check in visitors"
ON public.visitors
FOR INSERT
WITH CHECK (
  is_guard()
  AND (
    approved_by_resident IS NULL
    OR (
      approved_by_resident = true
      AND is_frequent_visitor = true
      AND bypass_reason IS NOT NULL
      AND flat_id IS NOT NULL
      AND phone IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.visitors prior
        WHERE prior.flat_id = flat_id
          AND prior.phone = phone
          AND prior.is_frequent_visitor = true
          AND prior.approved_by_resident = true
      )
    )
  )
);

-- Residents need a direct RLS-safe path for frequent visitor toggles.
DROP POLICY IF EXISTS "Residents can update their flat visitors" ON public.visitors;
CREATE POLICY "Residents can update their flat visitors"
ON public.visitors
FOR UPDATE
USING (
  is_resident()
  AND flat_id IN (
    SELECT flat_id
    FROM public.residents
    WHERE auth_user_id = auth.uid()
  )
)
WITH CHECK (
  is_resident()
  AND flat_id IN (
    SELECT flat_id
    FROM public.residents
    WHERE auth_user_id = auth.uid()
  )
);

-- Keep direct browser updates constrained even when RLS allows the row through.
CREATE OR REPLACE FUNCTION public.check_visitor_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF is_guard() AND NOT is_admin() THEN
    IF OLD.flat_id IS DISTINCT FROM NEW.flat_id
       OR OLD.visitor_name IS DISTINCT FROM NEW.visitor_name
       OR OLD.approved_by_resident IS DISTINCT FROM NEW.approved_by_resident
       OR OLD.resident_id IS DISTINCT FROM NEW.resident_id
       OR OLD.visitor_type IS DISTINCT FROM NEW.visitor_type
       OR OLD.is_frequent_visitor IS DISTINCT FROM NEW.is_frequent_visitor
       OR OLD.bypass_reason IS DISTINCT FROM NEW.bypass_reason THEN
      RAISE EXCEPTION 'Security Policy: Guards cannot modify visitor approval or identity fields.';
    END IF;
  ELSIF is_resident() AND NOT is_admin() AND current_user = 'authenticated' THEN
    IF OLD.flat_id IS DISTINCT FROM NEW.flat_id
       OR OLD.visitor_name IS DISTINCT FROM NEW.visitor_name
       OR OLD.approved_by_resident IS DISTINCT FROM NEW.approved_by_resident
       OR OLD.resident_id IS DISTINCT FROM NEW.resident_id
       OR OLD.visitor_type IS DISTINCT FROM NEW.visitor_type
       OR OLD.phone IS DISTINCT FROM NEW.phone
       OR OLD.vehicle_number IS DISTINCT FROM NEW.vehicle_number
       OR OLD.photo_url IS DISTINCT FROM NEW.photo_url
       OR OLD.purpose IS DISTINCT FROM NEW.purpose
       OR OLD.entry_time IS DISTINCT FROM NEW.entry_time
       OR OLD.exit_time IS DISTINCT FROM NEW.exit_time
       OR OLD.entry_guard_id IS DISTINCT FROM NEW.entry_guard_id
       OR OLD.exit_guard_id IS DISTINCT FROM NEW.exit_guard_id
       OR OLD.entry_location_id IS DISTINCT FROM NEW.entry_location_id
       OR OLD.rejection_reason IS DISTINCT FROM NEW.rejection_reason
       OR OLD.bypass_reason IS DISTINCT FROM NEW.bypass_reason
       OR OLD.visitor_pass_number IS DISTINCT FROM NEW.visitor_pass_number THEN
      RAISE EXCEPTION 'Security Policy: Residents can only update frequent visitor status from the app.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
