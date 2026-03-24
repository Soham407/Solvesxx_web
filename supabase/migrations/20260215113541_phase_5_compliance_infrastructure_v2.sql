-- 1. Create Compliance Snapshots Table
CREATE TABLE IF NOT EXISTS public.compliance_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID REFERENCES public.financial_periods(id),
    snapshot_name TEXT NOT NULL,
    snapshot_date TIMESTAMPTZ DEFAULT now(),
    total_invoices_amount BIGINT NOT NULL DEFAULT 0,
    total_collections_amount BIGINT NOT NULL DEFAULT 0,
    total_bills_amount BIGINT NOT NULL DEFAULT 0,
    total_payouts_amount BIGINT NOT NULL DEFAULT 0,
    unresolved_reconciliations_count INTEGER NOT NULL DEFAULT 0,
    data_payload JSONB NOT NULL DEFAULT '{}',
    is_locked BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add RLS to Compliance Snapshots
ALTER TABLE public.compliance_snapshots ENABLE ROW LEVEL SECURITY;

-- Drop if exists to be safe
DROP POLICY IF EXISTS "Admin/Account can view snapshots" ON public.compliance_snapshots;
DROP POLICY IF EXISTS "Admin/Account can create snapshots" ON public.compliance_snapshots;

CREATE POLICY "Admin/Account can view snapshots"
ON public.compliance_snapshots FOR SELECT
USING (
    get_user_role() IN ('admin', 'account')
);

CREATE POLICY "Admin/Account can create snapshots"
ON public.compliance_snapshots FOR INSERT
WITH CHECK (
    get_user_role() IN ('admin', 'account')
);

-- 3. Audit Log Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id);
;
