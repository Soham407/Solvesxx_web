
-- ============================================
-- PHASE C MIGRATION 06: VIEWS & COMMENTS
-- ============================================

-- View for candidates with full details
CREATE OR REPLACE VIEW candidates_with_details AS
SELECT 
    c.*,
    d.designation_name,
    i.first_name || ' ' || i.last_name AS interviewer_name,
    r.first_name || ' ' || r.last_name AS referred_by_name,
    ce.employee_code AS converted_employee_code
FROM candidates c
LEFT JOIN designations d ON c.designation_id = d.id
LEFT JOIN employees i ON c.interviewer_id = i.id
LEFT JOIN employees r ON c.referred_by = r.id
LEFT JOIN employees ce ON c.converted_employee_id = ce.id;

-- View for payslips with employee and cycle details
CREATE OR REPLACE VIEW payslips_with_details AS
SELECT 
    ps.*,
    e.employee_code,
    e.first_name || ' ' || e.last_name AS employee_name,
    e.department,
    pc.cycle_code,
    pc.period_month,
    pc.period_year,
    pc.total_working_days
FROM payslips ps
JOIN employees e ON ps.employee_id = e.id
JOIN payroll_cycles pc ON ps.payroll_cycle_id = pc.id;

-- View for employee documents with employee details
CREATE OR REPLACE VIEW employee_documents_with_details AS
SELECT 
    ed.*,
    e.employee_code,
    e.first_name || ' ' || e.last_name AS employee_name,
    e.department,
    v.full_name AS verified_by_name
FROM employee_documents ed
JOIN employees e ON ed.employee_id = e.id
LEFT JOIN users v ON ed.verified_by = v.id;

-- View for reconciliations with document details
CREATE OR REPLACE VIEW reconciliations_with_details AS
SELECT 
    r.*,
    pb.bill_number,
    pb.bill_date,
    po.po_number,
    po.po_date,
    mr.grn_number,
    mr.received_date,
    s.supplier_name
FROM reconciliations r
LEFT JOIN purchase_bills pb ON r.purchase_bill_id = pb.id
LEFT JOIN purchase_orders po ON r.purchase_order_id = po.id
LEFT JOIN material_receipts mr ON r.material_receipt_id = mr.id
LEFT JOIN suppliers s ON pb.supplier_id = s.id OR po.supplier_id = s.id;

-- View for employee salary structure with component details
CREATE OR REPLACE VIEW employee_salary_structure_with_details AS
SELECT 
    ess.*,
    e.employee_code,
    e.first_name || ' ' || e.last_name AS employee_name,
    e.department,
    sc.name AS component_name,
    sc.abbr AS component_abbr,
    sc.type AS component_type,
    sc.formula AS component_formula,
    sc.depends_on_payment_days
FROM employee_salary_structure ess
JOIN employees e ON ess.employee_id = e.id
JOIN salary_components sc ON ess.component_id = sc.id
WHERE ess.effective_to IS NULL;

-- View for candidate interviews with details
CREATE OR REPLACE VIEW candidate_interviews_with_details AS
SELECT 
    ci.*,
    c.candidate_code,
    c.first_name || ' ' || c.last_name AS candidate_name,
    c.applied_position,
    c.status AS candidate_status,
    i.first_name || ' ' || i.last_name AS interviewer_name,
    i.email AS interviewer_email
FROM candidate_interviews ci
JOIN candidates c ON ci.candidate_id = c.id
LEFT JOIN employees i ON ci.interviewer_id = i.id;

-- View for reconciliation lines with product details
CREATE OR REPLACE VIEW reconciliation_lines_with_details AS
SELECT 
    rl.*,
    r.reconciliation_number,
    r.status AS reconciliation_status,
    p.product_code,
    p.product_name
FROM reconciliation_lines rl
JOIN reconciliations r ON rl.reconciliation_id = r.id
LEFT JOIN products p ON rl.product_id = p.id;

-- Indents with requester details
CREATE OR REPLACE VIEW indents_with_details AS
SELECT 
    i.*,
    e.employee_code AS requester_code,
    e.first_name || ' ' || COALESCE(e.last_name, '') AS requester_name,
    cl.location_name,
    s.society_name,
    (SELECT COUNT(*) FROM indent_items WHERE indent_id = i.id) AS item_count
FROM indents i
LEFT JOIN employees e ON i.requester_id = e.id
LEFT JOIN company_locations cl ON i.location_id = cl.id
LEFT JOIN societies s ON i.society_id = s.id;

-- Purchase orders with supplier details
CREATE OR REPLACE VIEW purchase_orders_with_details AS
SELECT 
    po.*,
    sup.supplier_name,
    i.indent_number,
    (SELECT COUNT(*) FROM purchase_order_items WHERE purchase_order_id = po.id) AS item_count
FROM purchase_orders po
LEFT JOIN suppliers sup ON po.supplier_id = sup.id
LEFT JOIN indents i ON po.indent_id = i.id;

-- Material receipts with details
CREATE OR REPLACE VIEW material_receipts_with_details AS
SELECT 
    mr.*,
    po.po_number,
    sup.supplier_name,
    w.warehouse_name,
    e.first_name || ' ' || COALESCE(e.last_name, '') AS received_by_name,
    (SELECT COUNT(*) FROM material_receipt_items WHERE material_receipt_id = mr.id) AS item_count
FROM material_receipts mr
LEFT JOIN purchase_orders po ON mr.purchase_order_id = po.id
LEFT JOIN suppliers sup ON mr.supplier_id = sup.id
LEFT JOIN warehouses w ON mr.warehouse_id = w.id
LEFT JOIN employees e ON mr.received_by = e.id;

-- Purchase bills with details
CREATE OR REPLACE VIEW purchase_bills_with_details AS
SELECT 
    pb.*,
    sup.supplier_name,
    po.po_number,
    mr.grn_number
FROM purchase_bills pb
LEFT JOIN suppliers sup ON pb.supplier_id = sup.id
LEFT JOIN purchase_orders po ON pb.purchase_order_id = po.id
LEFT JOIN material_receipts mr ON pb.material_receipt_id = mr.id;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE candidates IS 'Recruitment applicant tracking - admin entry only';
COMMENT ON TABLE payroll_cycles IS 'Monthly payroll run management';
COMMENT ON TABLE payslips IS 'Individual employee salary records with attendance-based calculation';
COMMENT ON TABLE employee_documents IS 'Compliance document storage with internal verification';
COMMENT ON TABLE reconciliations IS 'Three-way Bill/PO/GRN matching records';
COMMENT ON TABLE salary_components IS 'Reusable salary component definitions with formulas - from Horilla HRMS pattern';
COMMENT ON TABLE employee_salary_structure IS 'Employee-specific salary component assignments with effective dates';
COMMENT ON TABLE candidate_interviews IS 'Multi-round interview tracking for recruitment pipeline';
COMMENT ON TABLE reconciliation_lines IS 'Line-item level three-way matching for PO/GRN/Bill reconciliation - from bs_reconcile pattern';
COMMENT ON TABLE indents IS 'Internal material requests before conversion to PO';
COMMENT ON TABLE indent_items IS 'Line items for indent requests';
COMMENT ON TABLE purchase_orders IS 'Purchase orders sent to suppliers';
COMMENT ON TABLE purchase_order_items IS 'Line items for purchase orders';
COMMENT ON TABLE material_receipts IS 'Goods Received Notes (GRN) for received materials';
COMMENT ON TABLE material_receipt_items IS 'Line items for material receipts';
COMMENT ON TABLE purchase_bills IS 'Supplier bills/invoices for payment';
COMMENT ON TABLE purchase_bill_items IS 'Line items for supplier bills';

COMMENT ON COLUMN payslips.pro_rated_basic IS 'Basic salary adjusted for attendance: (basic × present_days / total_working_days)';
COMMENT ON COLUMN payslips.gross_salary IS 'pro_rated_basic + hra + allowances + overtime + bonus';
COMMENT ON COLUMN payslips.net_payable IS 'gross_salary - total_deductions';
COMMENT ON COLUMN reconciliations.bill_po_variance IS 'Difference between bill amount and PO amount';
COMMENT ON COLUMN reconciliations.bill_grn_variance IS 'Difference between bill amount and GRN received value';
COMMENT ON COLUMN reconciliations.po_grn_variance IS 'Difference between PO amount and GRN received value';
COMMENT ON COLUMN salary_components.formula IS 'Formula using variables: B (Basic), gross_pay, etc. Example: B * 0.12';
COMMENT ON COLUMN salary_components.default_amount IS 'Default amount in paise (smallest currency unit) if no formula';
COMMENT ON COLUMN employee_salary_structure.amount IS 'Amount in paise (1 INR = 100 paise)';
COMMENT ON COLUMN employee_salary_structure.effective_to IS 'NULL means currently active';
COMMENT ON COLUMN reconciliation_lines.matched_amount IS 'Matched amount in paise';
COMMENT ON COLUMN reconciliation_lines.unit_price_variance IS 'bill_price - po_price in paise';
COMMENT ON COLUMN reconciliation_lines.match_type IS 'Type of match: PO_GRN, GRN_BILL, PO_BILL, or THREE_WAY';
COMMENT ON COLUMN indents.total_estimated_value IS 'Sum of estimated_total from indent_items in paise';
COMMENT ON COLUMN purchase_orders.grand_total IS 'Total PO value including tax, minus discounts, plus shipping in paise';
COMMENT ON COLUMN purchase_bills.due_amount IS 'total_amount - paid_amount, auto-calculated';
;
