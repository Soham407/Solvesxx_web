-- Phase E: Analytics & Reporting Views
-- Activates the Reports Module with high-performance SQL aggregation

-- 1. Financial: Monthly Trends
CREATE OR REPLACE VIEW view_financial_monthly_trends AS
WITH monthly_sales AS (
    SELECT 
        date_trunc('month', invoice_date)::date as report_month,
        SUM(total_amount) as revenue
    FROM sale_bills
    WHERE status != 'cancelled'
    GROUP BY 1
),
monthly_purchases AS (
    SELECT 
        date_trunc('month', bill_date)::date as report_month,
        SUM(total_amount) as expense
    FROM purchase_bills
    WHERE status != 'cancelled'
    GROUP BY 1
)
SELECT 
    COALESCE(s.report_month, p.report_month) as month,
    COALESCE(s.revenue/100, 0) as revenue,
    COALESCE(p.expense/100, 0) as expense,
    (COALESCE(s.revenue, 0) - COALESCE(p.expense, 0))/100 as net_margin
FROM monthly_sales s
FULL OUTER JOIN monthly_purchases p ON s.report_month = p.report_month
ORDER BY 1 DESC;

-- 2. Financial: Revenue Distribution by Category
CREATE OR REPLACE VIEW view_financial_revenue_by_category AS
SELECT 
    COALESCE(s.service_category, 'Uncategorized') as category,
    SUM(bi.line_total)/100 as revenue
FROM sale_bill_items bi
JOIN services s ON bi.service_id = s.id
GROUP BY 1;

-- 3. Attendance: Stats by Department
CREATE OR REPLACE VIEW view_attendance_by_dept AS
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

-- 4. Inventory: Velocity & Forecast
CREATE OR REPLACE VIEW view_inventory_velocity AS
SELECT 
    p.id as product_id,
    p.product_name as item_name,
    pc.category_name as category,
    COALESCE(i.quantity_on_hand, 0) as stock_level,
    COALESCE(SUM(ABS(st.quantity)) filter (where st.transaction_type IN ('OUT', 'ISSUE')), 0) as consumption_rate,
    CASE 
        WHEN COALESCE(SUM(ABS(st.quantity)) filter (where st.transaction_type IN ('OUT', 'ISSUE')), 0) > 0 
        THEN ROUND((COALESCE(i.quantity_on_hand, 0) / (NULLIF(SUM(ABS(st.quantity)) filter (where st.transaction_type IN ('OUT', 'ISSUE')), 0) / 30))::numeric, 0)
        ELSE 999 
    END as days_to_stockout
FROM products p
JOIN product_categories pc ON p.category_id = pc.id
LEFT JOIN inventory i ON p.id = i.product_id
LEFT JOIN stock_transactions st ON p.id = st.product_id AND st.transaction_date > (CURRENT_DATE - INTERVAL '30 days')
GROUP BY p.id, p.product_name, pc.category_name, i.quantity_on_hand;

-- 5. Service: Performance KPIs
CREATE OR REPLACE VIEW view_service_performance AS
SELECT 
    s.service_category,
    COUNT(sr.id) as total_jobs,
    ROUND(AVG(EXTRACT(EPOCH FROM (sr.completed_at - sr.created_at)) / 3600)::numeric, 1) as avg_response,
    ROUND(AVG(sf.score)::numeric, 1) as avg_rating,
    ROUND(COUNT(sr.id) filter (where sr.status = 'completed')::numeric / NULLIF(COUNT(sr.id), 0) * 100, 1) as resolution_rate
FROM services s
JOIN service_requests sr ON s.id = sr.service_id
LEFT JOIN service_feedback sf ON sr.id = sf.service_request_id
GROUP BY s.service_category;
;
