-- ============================================================
-- Phase E: Comprehensive Seed Data
-- ============================================================

DO $$
DECLARE
    v_admin_id UUID := 'ba8661e4-e7d2-4dc7-adda-f05623b6b700';
    v_sup1_id UUID;
    v_sup2_id UUID;
    v_feb_id UUID;
    v_budget_id UUID;
BEGIN
    -- 1. Suppliers
    INSERT INTO suppliers (supplier_name, contact_person, phone, email, is_active)
    VALUES 
    ('Global Security Systems', 'John Wick', '9876543210', 'global@security.com', true),
    ('Precision Maintenance Corp', 'Bob Builder', '9876543211', 'bob@precision.com', true)
    RETURNING id INTO v_sup1_id;
    
    SELECT id INTO v_sup2_id FROM suppliers WHERE supplier_name = 'Precision Maintenance Corp';

    -- 2. Financial Periods
    INSERT INTO financial_periods (period_name, period_type, start_date, end_date, status, created_by)
    VALUES 
    ('February 2026', 'monthly', '2026-02-01', '2026-02-28', 'open', v_admin_id),
    ('January 2026', 'monthly', '2026-01-01', '2026-01-31', 'closed', v_admin_id)
    RETURNING id INTO v_feb_id;

    -- 3. Budgets
    INSERT INTO budgets (name, department, category, financial_period_id, allocated_amount, status, created_by)
    VALUES 
    ('Security Ops - Feb 2026', 'Security', 'Staffing', v_feb_id, 10000000, 'active', v_admin_id) -- 1 Lakh
    RETURNING id INTO v_budget_id;

    -- 4. Purchase Bills (This will trigger budget utilization)
    INSERT INTO purchase_bills (
        bill_number, supplier_invoice_number, supplier_id, bill_date, due_date, 
        status, payment_status, subtotal, total_amount, due_amount, budget_id, created_by
    )
    VALUES 
    ('BILL-2026-001', 'INV-GS-101', v_sup1_id, '2026-02-10', '2026-02-20', 'approved', 'unpaid', 4500000, 4500000, 4500000, v_budget_id, v_admin_id),
    ('BILL-2026-002', 'INV-GS-102', v_sup1_id, '2026-02-12', '2026-02-22', 'submitted', 'unpaid', 3500000, 3500000, 3500000, v_budget_id, v_admin_id);

END $$;
