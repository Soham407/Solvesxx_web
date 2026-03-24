-- 1. Create Audit Logs Table for Financial Truth
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    actor_id UUID REFERENCES public.users(id),
    action TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    evidence_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enhance Payments Table
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS evidence_url TEXT;

-- 3. Seed Payment Methods
INSERT INTO public.payment_methods (method_name, gateway, is_active)
VALUES 
    ('UPI', 'manual', true),
    ('Cheque', 'manual', true)
ON CONFLICT (method_name) DO NOTHING;

-- 4. Audit Logging Function
CREATE OR REPLACE FUNCTION public.log_financial_audit()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (
        table_name,
        record_id,
        actor_id,
        action,
        old_data,
        new_data
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        auth.uid(),
        TG_OP,
        to_jsonb(OLD),
        to_jsonb(NEW)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Attach Audit Triggers
DROP TRIGGER IF EXISTS tr_audit_payments ON public.payments;
CREATE TRIGGER tr_audit_payments
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION log_financial_audit();

DROP TRIGGER IF EXISTS tr_audit_reconciliations ON public.reconciliations;
CREATE TRIGGER tr_audit_reconciliations
AFTER INSERT OR UPDATE OR DELETE ON public.reconciliations
FOR EACH ROW EXECUTE FUNCTION log_financial_audit();

-- 6. RLS for Accounts Role
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper to check if user has admin or account role
CREATE OR REPLACE FUNCTION public.is_financial_manager()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users u
        JOIN public.roles r ON u.role_id = r.id
        WHERE u.id = auth.uid() 
        AND r.role_name IN ('admin', 'account')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies
DROP POLICY IF EXISTS "Accounts and Admin can manage payments" ON public.payments;
CREATE POLICY "Accounts and Admin can manage payments" ON public.payments
FOR ALL USING (public.is_financial_manager());

DROP POLICY IF EXISTS "Accounts and Admin can manage reconciliations" ON public.reconciliations;
CREATE POLICY "Accounts and Admin can manage reconciliations" ON public.reconciliations
FOR ALL USING (public.is_financial_manager());

DROP POLICY IF EXISTS "Audit logs visible to Admin and Accounts" ON public.audit_logs;
CREATE POLICY "Audit logs visible to Admin and Accounts" ON public.audit_logs
FOR SELECT USING (public.is_financial_manager());

DROP POLICY IF EXISTS "Payer/Payee can view their own payments" ON public.payments;
CREATE POLICY "Payer/Payee can view their own payments" ON public.payments
FOR SELECT USING (
    payer_id = auth.uid() OR payee_id = auth.uid() OR public.is_financial_manager()
);
;
