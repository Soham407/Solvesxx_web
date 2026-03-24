-- Phase E: Analytics & Reporting Views
-- Activates the Reports Module with high-performance SQL aggregation

-- 1. Financial Ledger Summary (Sales vs Purchases)
CREATE OR REPLACE VIEW view_financial_ledger_summary AS
WITH monthly_sales AS (
    SELECT 
        date_trunc('month', invoice_date) as month,
        SUM(total_amount) as total_revenue,
        COUNT(id) as bill_count
    FROM sale_bills
    WHERE status != 'cancelled'
    GROUP BY 1
),
monthly_purchases AS (
    SELECT 
        date_trunc('month', bill_date) as month,
        SUM(total_amount) as total_expense
    FROM purchase_bills
    WHERE status != 'cancelled'
    GROUP BY 1
)
SELECT 
    COALESCE(s.month, p.month) as report_month,
    COALESCE(s.total_revenue, 0) as revenue,
    COALESCE(p.total_expense, 0) as expense,
    (COALESCE(s.total_revenue, 0) - COALESCE(p.total_expense, 0)) as net_margin
FROM monthly_sales s
FULL OUTER JOIN monthly_purchases p ON s.month = p.month;

-- 2. Attendance Performance Stats
CREATE OR REPLACE VIEW view_attendance_stats AS
SELECT 
    e.department,
    COUNT(a.id) filter (where a.status = 'present') as total_present,
    COUNT(a.id) filter (where a.status = 'absent') as total_absent,
    ROUND(
        COUNT(a.id) filter (where a.status = 'present')::numeric / 
        NULLIF(COUNT(a.id), 0) * 100, 
        2
    ) as attendance_rate,
    ROUND(
        AVG(EXTRACT(EPOCH FROM (a.check_in_time::time - s.start_time)) / 60) 
        filter (where a.check_in_time::time > s.start_time), 
        2
    ) as avg_late_minutes
FROM employees e
LEFT JOIN attendance_logs a ON e.id = a.employee_id
LEFT JOIN employee_shift_assignments esa ON e.id = esa.employee_id AND esa.is_active = true
LEFT JOIN shifts s ON esa.shift_id = s.id
GROUP BY e.department;

-- 3. Inventory Velocity & Forecast
CREATE OR REPLACE VIEW view_inventory_velocity AS
SELECT 
    p.id as product_id,
    p.product_name,
    pc.category_name,
    COALESCE(i.quantity_on_hand, 0) as quantity_on_hand,
    COALESCE(SUM(ABS(st.quantity)) filter (where st.transaction_type IN ('OUT', 'ISSUE')), 0) as monthly_consumption,
    CASE 
        WHEN COALESCE(SUM(ABS(st.quantity)) filter (where st.transaction_type IN ('OUT', 'ISSUE')), 0) > 0 
        THEN ROUND((COALESCE(i.quantity_on_hand, 0) / (SUM(ABS(st.quantity)) filter (where st.transaction_type IN ('OUT', 'ISSUE')) / 30))::numeric, 0)
        ELSE 999 
    END as days_to_stockout
FROM products p
JOIN product_categories pc ON p.category_id = pc.id
LEFT JOIN inventory i ON p.id = i.product_id
LEFT JOIN stock_transactions st ON p.id = st.product_id AND st.transaction_date > (CURRENT_DATE - INTERVAL '30 days')
GROUP BY p.id, p.product_name, pc.category_name, i.quantity_on_hand;

-- 4. Service KPIs (Resolution & Ratings)
CREATE OR REPLACE VIEW view_service_kpis AS
SELECT 
    s.service_category,
    COUNT(sr.id) as total_jobs,
    ROUND(AVG(EXTRACT(EPOCH FROM (sr.completed_at - sr.created_at)) / 3600)::numeric, 1) as avg_resolution_hours,
    ROUND(AVG(sf.score)::numeric, 1) as avg_rating,
    ROUND(COUNT(sr.id) filter (where sr.status = 'completed')::numeric / NULLIF(COUNT(sr.id), 0) * 100, 1) as resolution_rate
FROM services s
JOIN service_requests sr ON s.id = sr.service_id
LEFT JOIN service_feedback sf ON sr.id = sf.service_request_id
GROUP BY s.service_category;
;
