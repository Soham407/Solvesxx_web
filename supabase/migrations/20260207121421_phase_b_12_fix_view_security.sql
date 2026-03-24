-- ============================================
-- PHASE B MIGRATION 12: FIX VIEW SECURITY
-- ============================================

-- Drop and recreate views with SECURITY INVOKER
DROP VIEW IF EXISTS assets_with_details;
DROP VIEW IF EXISTS service_requests_with_details;
DROP VIEW IF EXISTS due_maintenance_schedules;
DROP VIEW IF EXISTS stock_levels;

-- Assets with details - SECURITY INVOKER
CREATE VIEW assets_with_details 
WITH (security_invoker = on) AS
SELECT 
    a.*,
    ac.category_name,
    ac.category_code,
    cl.location_name,
    cl.location_code,
    s.supplier_name AS vendor_name,
    (SELECT id FROM qr_codes WHERE asset_id = a.id LIMIT 1) AS qr_id
FROM assets a
LEFT JOIN asset_categories ac ON a.category_id = ac.id
LEFT JOIN company_locations cl ON a.location_id = cl.id
LEFT JOIN suppliers s ON a.vendor_id = s.id;

-- Service requests with details - SECURITY INVOKER
CREATE VIEW service_requests_with_details 
WITH (security_invoker = on) AS
SELECT 
    sr.*,
    a.name AS asset_name,
    a.asset_code,
    e.first_name || ' ' || e.last_name AS technician_name,
    cl.location_name,
    sv.service_name
FROM service_requests sr
LEFT JOIN assets a ON sr.asset_id = a.id
LEFT JOIN employees e ON sr.assigned_to = e.id
LEFT JOIN company_locations cl ON sr.location_id = cl.id
LEFT JOIN services sv ON sr.service_id = sv.id;

-- Due maintenance schedules - SECURITY INVOKER
CREATE VIEW due_maintenance_schedules 
WITH (security_invoker = on) AS
SELECT 
    ms.*,
    a.name AS asset_name,
    a.asset_code,
    a.location_id,
    cl.location_name
FROM maintenance_schedules ms
JOIN assets a ON ms.asset_id = a.id
LEFT JOIN company_locations cl ON a.location_id = cl.id
WHERE ms.is_active = true
  AND ms.next_due_date <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY ms.next_due_date;

-- Stock levels - SECURITY INVOKER
CREATE VIEW stock_levels 
WITH (security_invoker = on) AS
SELECT 
    p.id AS product_id,
    p.product_name,
    p.product_code,
    w.id AS warehouse_id,
    w.warehouse_name,
    COALESCE(SUM(sb.current_quantity), 0) AS total_quantity,
    rr.reorder_level,
    CASE 
        WHEN COALESCE(SUM(sb.current_quantity), 0) <= COALESCE(rr.reorder_level, 0) THEN true
        ELSE false
    END AS needs_reorder
FROM products p
CROSS JOIN warehouses w
LEFT JOIN stock_batches sb ON p.id = sb.product_id AND w.id = sb.warehouse_id AND sb.status = 'active'
LEFT JOIN reorder_rules rr ON p.id = rr.product_id AND w.id = rr.warehouse_id
GROUP BY p.id, p.product_name, p.product_code, w.id, w.warehouse_name, rr.reorder_level;;
