-- Create view_inventory_summary to fix silent failure in inventory report
-- Based on view_inventory_velocity and hardening conventions

CREATE OR REPLACE VIEW view_inventory_summary AS
SELECT
    product_id,
    item_name,
    category,
    stock_level,
    CASE 
        WHEN stock_level < 10 THEN 'Low Stock' 
        ELSE 'In Stock' 
    END as stock_status
FROM view_inventory_velocity;

-- Harden with security_invoker
ALTER VIEW public.view_inventory_summary SET (security_invoker = on);

-- Grant select to authenticated role
GRANT SELECT ON public.view_inventory_summary TO authenticated;

COMMENT ON VIEW view_inventory_summary IS 'Summary of inventory levels and stock status for analytics reporting.';
