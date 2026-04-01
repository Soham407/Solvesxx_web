
-- Create service_rates table
CREATE TABLE IF NOT EXISTS public.service_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL,
    rate NUMERIC(15, 2) NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(supplier_id, service_type, effective_from)
);

-- Index for lookup
CREATE INDEX IF NOT EXISTS idx_service_rates_lookup 
ON public.service_rates(supplier_id, service_type, is_active, effective_from);

-- Function to validate indent rate
CREATE OR REPLACE FUNCTION public.validate_indent_rate(p_indent_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_supplier_id UUID;
    v_service_type TEXT;
    v_is_service_request BOOLEAN;
    v_has_rate BOOLEAN;
BEGIN
    -- Get request and supplier info
    SELECT r.is_service_request, r.service_type, i.supplier_id
    INTO v_is_service_request, v_service_type, v_supplier_id
    FROM public.indents i
    LEFT JOIN public.requests r ON i.service_request_id = r.id
    WHERE i.id = p_indent_id;

    -- Fallback for indents without a service_request_id
    IF v_is_service_request IS NULL THEN
        -- Check if it looks like a service request via other fields if needed, 
        -- but as per migration 20260401000001, we should use the flag.
        v_is_service_request := FALSE;
    END IF;

    -- Case 1: Service Request
    IF v_is_service_request = TRUE THEN
        IF v_service_type IS NULL OR v_supplier_id IS NULL THEN
            RETURN FALSE;
        END IF;

        SELECT EXISTS (
            SELECT 1 FROM public.service_rates
            WHERE supplier_id = v_supplier_id
              AND service_type = v_service_type
              AND is_active = TRUE
              AND CURRENT_DATE >= effective_from
              AND (effective_to IS NULL OR CURRENT_DATE <= effective_to)
        ) INTO v_has_rate;

        RETURN v_has_rate;

    -- Case 2: Material Request
    ELSE
        -- For material requests, every item in the indent must have an active rate contract
        -- with the selected supplier.
        SELECT NOT EXISTS (
            SELECT 1 
            FROM public.indent_items ii
            WHERE ii.indent_id = p_indent_id
              AND ii.product_id IS NOT NULL
              AND NOT EXISTS (
                SELECT 1 
                FROM public.supplier_products sp
                JOIN public.supplier_rates sr ON sp.id = sr.supplier_product_id
                WHERE sp.supplier_id = v_supplier_id
                  AND sp.product_id = ii.product_id
                  AND sr.is_active = TRUE
                  AND CURRENT_DATE >= sr.effective_from
              )
        ) INTO v_has_rate;
        
        RETURN v_has_rate;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to check rate before forwarding
CREATE OR REPLACE FUNCTION public.check_rate_before_forward()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger when status transitions to 'indent_forwarded'
    IF NEW.status = 'indent_forwarded' AND (OLD.status IS NULL OR OLD.status <> 'indent_forwarded') THEN
        IF NEW.indent_id IS NULL THEN
            RAISE EXCEPTION 'Request cannot be forwarded without a linked indent.';
        END IF;

        IF NOT public.validate_indent_rate(NEW.indent_id) THEN
            IF NEW.is_service_request = TRUE THEN
                RAISE EXCEPTION 'No active rate contract found for this service. Verify rates before forwarding.';
            ELSE
                RAISE EXCEPTION 'No active rate contract found for one or more items in this indent. Verify rates before forwarding.';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_check_rate_before_forward ON public.requests;
CREATE TRIGGER trg_check_rate_before_forward
BEFORE UPDATE ON public.requests
FOR EACH ROW
EXECUTE FUNCTION public.check_rate_before_forward();

-- Enable RLS on service_rates
ALTER TABLE public.service_rates ENABLE ROW LEVEL SECURITY;

-- Select policy for authenticated users
CREATE POLICY "Public read for authenticated users" ON public.service_rates FOR SELECT TO authenticated USING (TRUE);

-- Manage policy for admins
CREATE POLICY "Manage service rates for admins" ON public.service_rates FOR ALL TO authenticated
    USING (get_user_role() IN ('admin', 'super_admin'));
