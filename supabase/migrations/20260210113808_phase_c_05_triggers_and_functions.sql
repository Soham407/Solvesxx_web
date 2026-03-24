
-- ============================================
-- PHASE C MIGRATION 05: TRIGGER FUNCTIONS & TRIGGERS
-- ============================================

-- Code generation functions
CREATE OR REPLACE FUNCTION generate_candidate_code()
RETURNS TRIGGER AS $$
BEGIN
    NEW.candidate_code := 'CAND-' || TO_CHAR(now(), 'YYYY') || '-' || 
        LPAD(nextval('candidate_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_payslip_number()
RETURNS TRIGGER AS $$
DECLARE
    v_cycle payroll_cycles;
BEGIN
    SELECT * INTO v_cycle FROM payroll_cycles WHERE id = NEW.payroll_cycle_id;
    NEW.payslip_number := 'PS-' || v_cycle.period_year || '-' || 
        LPAD(v_cycle.period_month::TEXT, 2, '0') || '-' ||
        LPAD(nextval('payslip_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_document_code()
RETURNS TRIGGER AS $$
DECLARE
    v_employee employees;
BEGIN
    SELECT * INTO v_employee FROM employees WHERE id = NEW.employee_id;
    NEW.document_code := 'DOC-' || v_employee.employee_code || '-' || 
        UPPER(REPLACE(NEW.document_type::TEXT, '_', ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_reconciliation_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.reconciliation_number := 'REC-' || TO_CHAR(now(), 'YYYY') || '-' || 
        LPAD(nextval('reconciliation_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_indent_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.indent_number := 'IND-' || TO_CHAR(now(), 'YYYY') || '-' || 
        LPAD(nextval('indent_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.po_number := 'PO-' || TO_CHAR(now(), 'YYYY') || '-' || 
        LPAD(nextval('po_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_grn_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.grn_number := 'GRN-' || TO_CHAR(now(), 'YYYY') || '-' || 
        LPAD(nextval('grn_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_bill_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.bill_number IS NULL THEN
        NEW.bill_number := 'BILL-' || TO_CHAR(now(), 'YYYY') || '-' || 
            LPAD(nextval('purchase_bill_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure updated_at function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CODE GENERATION TRIGGERS
-- ============================================

CREATE TRIGGER set_candidate_code
    BEFORE INSERT ON candidates
    FOR EACH ROW WHEN (NEW.candidate_code IS NULL)
    EXECUTE FUNCTION generate_candidate_code();

CREATE TRIGGER set_payslip_number
    BEFORE INSERT ON payslips
    FOR EACH ROW WHEN (NEW.payslip_number IS NULL)
    EXECUTE FUNCTION generate_payslip_number();

CREATE TRIGGER set_document_code
    BEFORE INSERT ON employee_documents
    FOR EACH ROW WHEN (NEW.document_code IS NULL)
    EXECUTE FUNCTION generate_document_code();

CREATE TRIGGER set_reconciliation_number
    BEFORE INSERT ON reconciliations
    FOR EACH ROW WHEN (NEW.reconciliation_number IS NULL)
    EXECUTE FUNCTION generate_reconciliation_number();

DROP TRIGGER IF EXISTS set_indent_number ON indents;
CREATE TRIGGER set_indent_number
    BEFORE INSERT ON indents
    FOR EACH ROW WHEN (NEW.indent_number IS NULL)
    EXECUTE FUNCTION generate_indent_number();

DROP TRIGGER IF EXISTS set_po_number ON purchase_orders;
CREATE TRIGGER set_po_number
    BEFORE INSERT ON purchase_orders
    FOR EACH ROW WHEN (NEW.po_number IS NULL)
    EXECUTE FUNCTION generate_po_number();

DROP TRIGGER IF EXISTS set_grn_number ON material_receipts;
CREATE TRIGGER set_grn_number
    BEFORE INSERT ON material_receipts
    FOR EACH ROW WHEN (NEW.grn_number IS NULL)
    EXECUTE FUNCTION generate_grn_number();

DROP TRIGGER IF EXISTS set_bill_number ON purchase_bills;
CREATE TRIGGER set_bill_number
    BEFORE INSERT ON purchase_bills
    FOR EACH ROW
    EXECUTE FUNCTION generate_bill_number();

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================

CREATE TRIGGER update_candidates_updated_at
    BEFORE UPDATE ON candidates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_cycles_updated_at
    BEFORE UPDATE ON payroll_cycles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payslips_updated_at
    BEFORE UPDATE ON payslips FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_documents_updated_at
    BEFORE UPDATE ON employee_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reconciliations_updated_at
    BEFORE UPDATE ON reconciliations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_salary_components_updated_at
    BEFORE UPDATE ON salary_components FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_salary_structure_updated_at
    BEFORE UPDATE ON employee_salary_structure FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidate_interviews_updated_at
    BEFORE UPDATE ON candidate_interviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reconciliation_lines_updated_at
    BEFORE UPDATE ON reconciliation_lines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_indents_updated_at ON indents;
CREATE TRIGGER update_indents_updated_at
    BEFORE UPDATE ON indents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_indent_items_updated_at ON indent_items;
CREATE TRIGGER update_indent_items_updated_at
    BEFORE UPDATE ON indent_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_purchase_orders_updated_at ON purchase_orders;
CREATE TRIGGER update_purchase_orders_updated_at
    BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_purchase_order_items_updated_at ON purchase_order_items;
CREATE TRIGGER update_purchase_order_items_updated_at
    BEFORE UPDATE ON purchase_order_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_material_receipts_updated_at ON material_receipts;
CREATE TRIGGER update_material_receipts_updated_at
    BEFORE UPDATE ON material_receipts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_material_receipt_items_updated_at ON material_receipt_items;
CREATE TRIGGER update_material_receipt_items_updated_at
    BEFORE UPDATE ON material_receipt_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_purchase_bills_updated_at ON purchase_bills;
CREATE TRIGGER update_purchase_bills_updated_at
    BEFORE UPDATE ON purchase_bills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_purchase_bill_items_updated_at ON purchase_bill_items;
CREATE TRIGGER update_purchase_bill_items_updated_at
    BEFORE UPDATE ON purchase_bill_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- BUSINESS LOGIC TRIGGERS
-- ============================================

-- Recalculate indent totals
CREATE OR REPLACE FUNCTION recalculate_indent_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_indent_id UUID;
BEGIN
    v_indent_id := COALESCE(NEW.indent_id, OLD.indent_id);
    UPDATE indents
    SET 
        total_items = (SELECT COUNT(*) FROM indent_items WHERE indent_id = v_indent_id),
        total_estimated_value = (SELECT COALESCE(SUM(estimated_total), 0) FROM indent_items WHERE indent_id = v_indent_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_indent_id;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recalculate_indent_totals ON indent_items;
CREATE TRIGGER trigger_recalculate_indent_totals
    AFTER INSERT OR UPDATE OR DELETE ON indent_items
    FOR EACH ROW EXECUTE FUNCTION recalculate_indent_totals();

-- Recalculate PO totals
CREATE OR REPLACE FUNCTION recalculate_po_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_po_id UUID;
BEGIN
    v_po_id := COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);
    UPDATE purchase_orders
    SET 
        subtotal = (SELECT COALESCE(SUM(line_total - tax_amount), 0) FROM purchase_order_items WHERE purchase_order_id = v_po_id),
        tax_amount = (SELECT COALESCE(SUM(tax_amount), 0) FROM purchase_order_items WHERE purchase_order_id = v_po_id),
        grand_total = (SELECT COALESCE(SUM(line_total), 0) FROM purchase_order_items WHERE purchase_order_id = v_po_id) + shipping_cost - discount_amount,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_po_id;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recalculate_po_totals ON purchase_order_items;
CREATE TRIGGER trigger_recalculate_po_totals
    AFTER INSERT OR UPDATE OR DELETE ON purchase_order_items
    FOR EACH ROW EXECUTE FUNCTION recalculate_po_totals();

-- Update bill due amount
CREATE OR REPLACE FUNCTION update_bill_due_amount()
RETURNS TRIGGER AS $$
BEGIN
    NEW.due_amount := NEW.total_amount - NEW.paid_amount;
    IF NEW.paid_amount >= NEW.total_amount THEN
        NEW.payment_status := 'paid';
    ELSIF NEW.paid_amount > 0 THEN
        NEW.payment_status := 'partial';
    ELSE
        NEW.payment_status := 'unpaid';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_bill_due_amount ON purchase_bills;
CREATE TRIGGER trigger_update_bill_due_amount
    BEFORE INSERT OR UPDATE OF total_amount, paid_amount ON purchase_bills
    FOR EACH ROW EXECUTE FUNCTION update_bill_due_amount();

-- Audit logging for payslips
CREATE OR REPLACE FUNCTION audit_payslip_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_by)
    VALUES (
        'payslips', COALESCE(NEW.id, OLD.id), TG_OP,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        auth.uid()
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit logging for reconciliations
CREATE OR REPLACE FUNCTION audit_reconciliation_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_by)
    VALUES (
        'reconciliations', COALESCE(NEW.id, OLD.id), TG_OP,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        auth.uid()
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only create audit triggers if audit_log table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log') THEN
        CREATE TRIGGER audit_payslips_changes
            AFTER INSERT OR UPDATE OR DELETE ON payslips
            FOR EACH ROW EXECUTE FUNCTION audit_payslip_changes();
        CREATE TRIGGER audit_reconciliations_changes
            AFTER INSERT OR UPDATE OR DELETE ON reconciliations
            FOR EACH ROW EXECUTE FUNCTION audit_reconciliation_changes();
    END IF;
END $$;
;
