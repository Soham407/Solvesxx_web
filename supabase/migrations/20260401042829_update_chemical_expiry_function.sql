-- Update get_expiring_chemicals to be more inclusive of general inventory
CREATE OR REPLACE FUNCTION public.get_expiring_chemicals(p_days_ahead INTEGER DEFAULT 30)
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    expiry_date DATE,
    batch_number TEXT,
    days_left INTEGER,
    severity TEXT,
    source TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- 1. Chemicals from domain-specific table (Pest Control)
    SELECT 
        pcc.product_id,
        p.product_name,
        pcc.expiry_date,
        pcc.batch_number,
        (pcc.expiry_date - CURRENT_DATE)::INTEGER as days_left,
        CASE 
            WHEN pcc.expiry_date < CURRENT_DATE THEN 'expired'
            WHEN (pcc.expiry_date - CURRENT_DATE) <= 7 THEN 'critical'
            WHEN (pcc.expiry_date - CURRENT_DATE) <= 30 THEN 'warning'
            ELSE 'healthy'
        END::TEXT as severity,
        'pest_control'::TEXT as source
    FROM public.pest_control_chemicals pcc
    JOIN public.products p ON pcc.product_id = p.id
    WHERE pcc.expiry_date IS NOT NULL
      AND pcc.expiry_date <= (CURRENT_DATE + p_days_ahead)
    
    UNION ALL
    
    -- 2. General chemicals from stock_batches (any chemical category)
    SELECT 
        sb.product_id,
        p.product_name,
        sb.expiry_date,
        sb.batch_number,
        (sb.expiry_date - CURRENT_DATE)::INTEGER as days_left,
        CASE 
            WHEN sb.expiry_date < CURRENT_DATE THEN 'expired'
            WHEN (sb.expiry_date - CURRENT_DATE) <= 7 THEN 'critical'
            WHEN (sb.expiry_date - CURRENT_DATE) <= 30 THEN 'warning'
            ELSE 'healthy'
        END::TEXT as severity,
        'inventory'::TEXT as source
    FROM public.stock_batches sb
    JOIN public.products p ON sb.product_id = p.id
    JOIN public.product_categories pc ON p.category_id = pc.id
    WHERE sb.expiry_date IS NOT NULL
      AND sb.expiry_date <= (CURRENT_DATE + p_days_ahead)
      AND (pc.category_name ILIKE '%chemical%' OR p.product_name ILIKE '%chemical%')
      -- Avoid duplicates if already in domain-specific table
      AND NOT EXISTS (
          SELECT 1 
          FROM public.pest_control_chemicals pcc 
          WHERE pcc.product_id = sb.product_id 
          AND pcc.batch_number = sb.batch_number
      )
    
    ORDER BY expiry_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_expiring_chemicals IS 'Returns chemicals from both domain-specific and general inventory tables expiring within the given number of days.';
