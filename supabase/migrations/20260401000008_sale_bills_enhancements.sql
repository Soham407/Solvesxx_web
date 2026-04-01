-- Migration to enhance sale_bills for Admin Generation Workflow
-- Add request_id and paid_at columns, add sequence for invoice numbers, and fix buyer RLS

-- 1. Add missing columns to sale_bills
ALTER TABLE public.sale_bills 
ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES public.requests(id),
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

-- 2. Sequence for invoice numbers (Sale Bills)
CREATE SEQUENCE IF NOT EXISTS sale_invoice_seq START 1;

CREATE OR REPLACE FUNCTION generate_sale_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invoice_number IS NULL THEN
        NEW.invoice_number := 'INV-' || TO_CHAR(now(), 'YYYY') || '-' || 
            LPAD(nextval('sale_invoice_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_sale_invoice_number ON sale_bills;
CREATE TRIGGER set_sale_invoice_number
    BEFORE INSERT ON sale_bills
    FOR EACH ROW
    EXECUTE FUNCTION generate_sale_invoice_number();

-- 3. Fix Buyer RLS on sale_bills
-- Previous policy was likely broken or missing
DROP POLICY IF EXISTS "Buyers View Own Invoices" ON public.sale_bills;
CREATE POLICY "Buyers View Own Invoices"
    ON public.sale_bills FOR SELECT
    TO authenticated
    USING (
        get_user_role() = 'buyer' AND
        client_id IN (
            SELECT b.society_id 
            FROM residents r
            JOIN flats f ON r.flat_id = f.id
            JOIN buildings b ON f.building_id = b.id
            WHERE r.auth_user_id = auth.uid()
        )
    );

-- Also ensure Admin/Account can still view
-- The existing "View Sale Bills" policy in 20260210125115_phase_c_06_contracts_and_sales.sql
-- is: USING (get_user_role() IN ('admin', 'company_hod', 'account', 'company_md', 'society_manager'))
-- This is fine.
