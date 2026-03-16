-- ============================================
-- PHASE C: STABILIZATION & DE-MOCKING
-- New Tables for HRMS, Payroll & Reconciliation
-- Depends on: Phase A (employees, users, roles), Phase B
-- ============================================

-- ============================================
-- MIGRATION 01: ENUMS
-- ============================================

-- Candidate status for recruitment workflow
CREATE TYPE candidate_status AS ENUM (
    'screening',
    'interviewing',
    'background_check',
    'offered',
    'hired',
    'rejected'
);

-- Document types for employee compliance
CREATE TYPE document_type AS ENUM (
    'aadhar_card',
    'pan_card',
    'passport',
    'driving_license',
    'voter_id',
    'bank_passbook',
    'education_certificate',
    'experience_certificate',
    'offer_letter',
    'relieving_letter',
    'address_proof',
    'police_verification',
    'medical_certificate',
    'other'
);

-- Document verification status
CREATE TYPE document_status AS ENUM (
    'pending_upload',
    'pending_review',
    'verified',
    'expired',
    'rejected'
);

-- Reconciliation status for three-way matching
CREATE TYPE reconciliation_status AS ENUM (
    'pending',
    'matched',
    'discrepancy',
    'resolved',
    'disputed'
);

-- Payroll cycle status
CREATE TYPE payroll_cycle_status AS ENUM (
    'draft',
    'processing',
    'computed',
    'approved',
    'disbursed',
    'cancelled'
);

-- Payslip status
CREATE TYPE payslip_status AS ENUM (
    'draft',
    'computed',
    'approved',
    'processed',
    'disputed'
);

-- ============================================
-- MIGRATION 02: SEQUENCES
-- ============================================

-- Sequence for candidate code generation
CREATE SEQUENCE IF NOT EXISTS candidate_seq START 1;

-- Sequence for reconciliation number generation
CREATE SEQUENCE IF NOT EXISTS reconciliation_seq START 1;

-- Sequence for payslip number generation
CREATE SEQUENCE IF NOT EXISTS payslip_seq START 1;

-- ============================================
-- MIGRATION 03: CANDIDATES TABLE
-- Recruitment applicant tracking
-- ============================================

CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_code VARCHAR(20) UNIQUE,               -- Auto-generated: CAND-2026-0001
    
    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    date_of_birth DATE,
    
    -- Address
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    
    -- Application Details
    applied_position VARCHAR(200) NOT NULL,          -- Position title applied for
    designation_id UUID REFERENCES designations(id), -- Target designation
    department VARCHAR(100),
    expected_salary DECIMAL(12, 2),
    notice_period_days INTEGER,
    
    -- Resume/CV
    resume_url TEXT,
    
    -- Recruitment Status
    status candidate_status DEFAULT 'screening' NOT NULL,
    status_changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status_changed_by UUID REFERENCES auth.users(id),
    
    -- Interview Details
    interview_date TIMESTAMP WITH TIME ZONE,
    interview_notes TEXT,
    interview_rating INTEGER CHECK (interview_rating >= 1 AND interview_rating <= 5),
    interviewer_id UUID REFERENCES employees(id),
    
    -- Background Verification
    bgv_initiated_at TIMESTAMP WITH TIME ZONE,
    bgv_completed_at TIMESTAMP WITH TIME ZONE,
    bgv_status VARCHAR(50),                          -- 'pending', 'in_progress', 'cleared', 'flagged'
    bgv_notes TEXT,
    
    -- Offer Details
    offered_salary DECIMAL(12, 2),
    offer_date DATE,
    offer_accepted_at TIMESTAMP WITH TIME ZONE,
    joining_date DATE,
    
    -- Rejection Details (if rejected)
    rejection_reason TEXT,
    
    -- Conversion to Employee
    converted_employee_id UUID REFERENCES employees(id),
    converted_at TIMESTAMP WITH TIME ZONE,
    
    -- Source Tracking
    source VARCHAR(100),                             -- 'portal', 'referral', 'consultant', 'walk-in'
    referred_by UUID REFERENCES employees(id),
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_candidates_status ON candidates(status);
CREATE INDEX idx_candidates_applied_position ON candidates(applied_position);
CREATE INDEX idx_candidates_department ON candidates(department);
CREATE INDEX idx_candidates_email ON candidates(email);
CREATE INDEX idx_candidates_created_at ON candidates(created_at DESC);

-- Enable RLS
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "View Candidates"
    ON candidates FOR SELECT
    TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod', 'company_md'));

CREATE POLICY "Manage Candidates"
    ON candidates FOR ALL
    TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod'));

-- ============================================
-- MIGRATION 04: PAYROLL CYCLES TABLE
-- Monthly payroll run management
-- ============================================

CREATE TABLE payroll_cycles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cycle_code VARCHAR(20) UNIQUE NOT NULL,          -- PAY-2026-01
    
    -- Period
    period_month INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
    period_year INTEGER NOT NULL CHECK (period_year >= 2020),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Working Days
    total_working_days INTEGER NOT NULL,
    
    -- Status
    status payroll_cycle_status DEFAULT 'draft' NOT NULL,
    
    -- Processing
    computed_at TIMESTAMP WITH TIME ZONE,
    computed_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES auth.users(id),
    disbursed_at TIMESTAMP WITH TIME ZONE,
    disbursed_by UUID REFERENCES auth.users(id),
    
    -- Summary (calculated after payslips generated)
    total_employees INTEGER DEFAULT 0,
    total_gross DECIMAL(14, 2) DEFAULT 0,
    total_deductions DECIMAL(14, 2) DEFAULT 0,
    total_net DECIMAL(14, 2) DEFAULT 0,
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Ensure unique period per year
    CONSTRAINT unique_payroll_period UNIQUE (period_month, period_year)
);

-- Indexes
CREATE INDEX idx_payroll_cycles_period ON payroll_cycles(period_year, period_month);
CREATE INDEX idx_payroll_cycles_status ON payroll_cycles(status);

-- Enable RLS
ALTER TABLE payroll_cycles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "View Payroll Cycles"
    ON payroll_cycles FOR SELECT
    TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod', 'account', 'company_md'));

CREATE POLICY "Manage Payroll Cycles"
    ON payroll_cycles FOR ALL
    TO authenticated
    USING (get_user_role() IN ('admin', 'account'));

-- ============================================
-- MIGRATION 05: PAYSLIPS TABLE
-- Individual employee salary records
-- ============================================

CREATE TABLE payslips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payslip_number VARCHAR(30) UNIQUE,               -- PS-2026-01-0001
    
    -- References
    payroll_cycle_id UUID NOT NULL REFERENCES payroll_cycles(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id),
    
    -- Attendance Data
    present_days DECIMAL(6, 2) NOT NULL DEFAULT 0,
    absent_days DECIMAL(6, 2) NOT NULL DEFAULT 0,
    leave_days DECIMAL(6, 2) NOT NULL DEFAULT 0,
    overtime_hours DECIMAL(6, 2) NOT NULL DEFAULT 0,
    
    -- Earnings
    basic_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
    pro_rated_basic DECIMAL(12, 2) NOT NULL DEFAULT 0,  -- Basic adjusted for attendance
    hra DECIMAL(12, 2) NOT NULL DEFAULT 0,
    special_allowance DECIMAL(12, 2) NOT NULL DEFAULT 0,
    travel_allowance DECIMAL(12, 2) NOT NULL DEFAULT 0,
    medical_allowance DECIMAL(12, 2) NOT NULL DEFAULT 0,
    overtime_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    bonus DECIMAL(12, 2) NOT NULL DEFAULT 0,
    other_earnings DECIMAL(12, 2) NOT NULL DEFAULT 0,
    gross_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
    
    -- Deductions
    pf_deduction DECIMAL(12, 2) NOT NULL DEFAULT 0,       -- 12% of basic
    esic_deduction DECIMAL(12, 2) NOT NULL DEFAULT 0,     -- 0.75% of gross
    professional_tax DECIMAL(12, 2) NOT NULL DEFAULT 0,   -- State-wise
    tds DECIMAL(12, 2) NOT NULL DEFAULT 0,                -- Tax deducted at source
    loan_recovery DECIMAL(12, 2) NOT NULL DEFAULT 0,
    advance_recovery DECIMAL(12, 2) NOT NULL DEFAULT 0,
    other_deductions DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_deductions DECIMAL(12, 2) NOT NULL DEFAULT 0,
    
    -- Net Payable
    net_payable DECIMAL(12, 2) NOT NULL DEFAULT 0,
    
    -- Employer Contributions (not part of CTC but tracked)
    employer_pf DECIMAL(12, 2) NOT NULL DEFAULT 0,        -- 12% employer contribution
    employer_esic DECIMAL(12, 2) NOT NULL DEFAULT 0,      -- 3.25% employer contribution
    
    -- Payment Details
    bank_account_number VARCHAR(30),
    bank_ifsc VARCHAR(20),
    payment_mode VARCHAR(20),                             -- 'bank_transfer', 'cheque', 'cash'
    payment_reference VARCHAR(100),
    paid_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status payslip_status DEFAULT 'draft' NOT NULL,
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Ensure one payslip per employee per cycle
    CONSTRAINT unique_employee_cycle UNIQUE (payroll_cycle_id, employee_id)
);

-- Indexes
CREATE INDEX idx_payslips_cycle ON payslips(payroll_cycle_id);
CREATE INDEX idx_payslips_employee ON payslips(employee_id);
CREATE INDEX idx_payslips_status ON payslips(status);

-- Enable RLS
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Employees can view their own payslips
CREATE POLICY "Employees View Own Payslips"
    ON payslips FOR SELECT
    TO authenticated
    USING (
        employee_id IN (
            SELECT employee_id FROM users WHERE id = auth.uid()
        )
        OR get_user_role() IN ('admin', 'account', 'company_hod', 'company_md')
    );

CREATE POLICY "Manage Payslips"
    ON payslips FOR ALL
    TO authenticated
    USING (get_user_role() IN ('admin', 'account'));

-- ============================================
-- MIGRATION 06: EMPLOYEE DOCUMENTS TABLE
-- Compliance document storage with verification
-- ============================================

CREATE TABLE employee_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_code VARCHAR(50) UNIQUE,                -- DOC-EMP001-AADHAR
    
    -- References
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Document Details
    document_type document_type NOT NULL,
    document_number VARCHAR(100),                    -- Aadhar number, PAN, etc.
    document_name VARCHAR(200) NOT NULL,             -- Display name
    
    -- File Storage
    file_path TEXT NOT NULL,                         -- Path in storage bucket
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,                               -- Size in bytes
    mime_type VARCHAR(100),
    
    -- Validity
    issue_date DATE,
    expiry_date DATE,
    
    -- Verification
    status document_status DEFAULT 'pending_review' NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES auth.users(id),
    rejection_reason TEXT,
    
    -- Notifications
    expiry_notified_at TIMESTAMP WITH TIME ZONE,    -- When expiry notification was sent
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_employee_documents_employee ON employee_documents(employee_id);
CREATE INDEX idx_employee_documents_type ON employee_documents(document_type);
CREATE INDEX idx_employee_documents_status ON employee_documents(status);
CREATE INDEX idx_employee_documents_expiry ON employee_documents(expiry_date) WHERE expiry_date IS NOT NULL;

-- Enable RLS
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Employees can view their own documents
CREATE POLICY "Employees View Own Documents"
    ON employee_documents FOR SELECT
    TO authenticated
    USING (
        employee_id IN (
            SELECT employee_id FROM users WHERE id = auth.uid()
        )
        OR get_user_role() IN ('admin', 'company_hod', 'company_md')
    );

CREATE POLICY "Upload Own Documents"
    ON employee_documents FOR INSERT
    TO authenticated
    WITH CHECK (
        employee_id IN (
            SELECT employee_id FROM users WHERE id = auth.uid()
        )
        OR get_user_role() IN ('admin', 'company_hod')
    );

CREATE POLICY "Admin Manage Documents"
    ON employee_documents FOR ALL
    TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod'));

-- ============================================
-- MIGRATION 07: RECONCILIATIONS TABLE
-- Three-way Bill/PO/GRN matching records
-- ============================================

CREATE TABLE reconciliations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reconciliation_number VARCHAR(20) UNIQUE,        -- REC-2026-0001
    
    -- References (all three documents for matching)
    purchase_bill_id UUID REFERENCES purchase_bills(id),
    purchase_order_id UUID REFERENCES purchase_orders(id),
    material_receipt_id UUID REFERENCES material_receipts(id),
    
    -- Amounts from each document
    bill_amount DECIMAL(14, 2),
    po_amount DECIMAL(14, 2),
    grn_amount DECIMAL(14, 2),                       -- Value of goods received
    
    -- Variance Calculations
    bill_po_variance DECIMAL(14, 2),                 -- bill_amount - po_amount
    bill_grn_variance DECIMAL(14, 2),                -- bill_amount - grn_amount
    po_grn_variance DECIMAL(14, 2),                  -- po_amount - grn_amount
    
    -- Status
    status reconciliation_status DEFAULT 'pending' NOT NULL,
    
    -- Resolution Details (if discrepancy)
    discrepancy_type VARCHAR(100),                   -- 'quantity', 'price', 'tax', 'other'
    discrepancy_notes TEXT,
    
    resolution_action VARCHAR(100),                  -- 'accept', 'adjust', 'reject', 'credit_note'
    resolution_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id),
    
    -- Adjusted Amount (if any)
    adjusted_amount DECIMAL(14, 2),
    adjustment_reason TEXT,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_reconciliations_status ON reconciliations(status);
CREATE INDEX idx_reconciliations_bill ON reconciliations(purchase_bill_id);
CREATE INDEX idx_reconciliations_po ON reconciliations(purchase_order_id);
CREATE INDEX idx_reconciliations_grn ON reconciliations(material_receipt_id);
CREATE INDEX idx_reconciliations_created ON reconciliations(created_at DESC);

-- Enable RLS
ALTER TABLE reconciliations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "View Reconciliations"
    ON reconciliations FOR SELECT
    TO authenticated
    USING (get_user_role() IN ('admin', 'account', 'company_hod', 'company_md'));

CREATE POLICY "Manage Reconciliations"
    ON reconciliations FOR ALL
    TO authenticated
    USING (get_user_role() IN ('admin', 'account'));

-- ============================================
-- MIGRATION 08: TRIGGER FUNCTIONS
-- ============================================

-- Function to generate candidate code
CREATE OR REPLACE FUNCTION generate_candidate_code()
RETURNS TRIGGER AS $$
BEGIN
    NEW.candidate_code := 'CAND-' || TO_CHAR(now(), 'YYYY') || '-' || 
        LPAD(nextval('candidate_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate payslip number
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

-- Function to generate document code
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

-- Function to generate reconciliation number
CREATE OR REPLACE FUNCTION generate_reconciliation_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.reconciliation_number := 'REC-' || TO_CHAR(now(), 'YYYY') || '-' || 
        LPAD(nextval('reconciliation_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generic updated_at trigger function (reuse if exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- MIGRATION 09: TRIGGERS
-- ============================================

-- Candidate code generation trigger
CREATE TRIGGER set_candidate_code
    BEFORE INSERT ON candidates
    FOR EACH ROW
    WHEN (NEW.candidate_code IS NULL)
    EXECUTE FUNCTION generate_candidate_code();

-- Payslip number generation trigger
CREATE TRIGGER set_payslip_number
    BEFORE INSERT ON payslips
    FOR EACH ROW
    WHEN (NEW.payslip_number IS NULL)
    EXECUTE FUNCTION generate_payslip_number();

-- Document code generation trigger
CREATE TRIGGER set_document_code
    BEFORE INSERT ON employee_documents
    FOR EACH ROW
    WHEN (NEW.document_code IS NULL)
    EXECUTE FUNCTION generate_document_code();

-- Reconciliation number generation trigger
CREATE TRIGGER set_reconciliation_number
    BEFORE INSERT ON reconciliations
    FOR EACH ROW
    WHEN (NEW.reconciliation_number IS NULL)
    EXECUTE FUNCTION generate_reconciliation_number();

-- Updated_at triggers for all new tables
CREATE TRIGGER update_candidates_updated_at
    BEFORE UPDATE ON candidates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_cycles_updated_at
    BEFORE UPDATE ON payroll_cycles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payslips_updated_at
    BEFORE UPDATE ON payslips
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_documents_updated_at
    BEFORE UPDATE ON employee_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reconciliations_updated_at
    BEFORE UPDATE ON reconciliations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MIGRATION 10: AUDIT LOGGING
-- Track changes to sensitive payroll/reconciliation data
-- ============================================

-- Payslip audit trigger
CREATE OR REPLACE FUNCTION audit_payslip_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        changed_by
    ) VALUES (
        'payslips',
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        auth.uid()
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reconciliation audit trigger
CREATE OR REPLACE FUNCTION audit_reconciliation_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        changed_by
    ) VALUES (
        'reconciliations',
        COALESCE(NEW.id, OLD.id),
        TG_OP,
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
            FOR EACH ROW
            EXECUTE FUNCTION audit_payslip_changes();
            
        CREATE TRIGGER audit_reconciliations_changes
            AFTER INSERT OR UPDATE OR DELETE ON reconciliations
            FOR EACH ROW
            EXECUTE FUNCTION audit_reconciliation_changes();
    END IF;
END $$;

-- ============================================
-- MIGRATION 11: HELPER VIEWS (Optional)
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

-- ============================================
-- MIGRATION 12: COMMENTS
-- ============================================

COMMENT ON TABLE candidates IS 'Recruitment applicant tracking - admin entry only';
COMMENT ON TABLE payroll_cycles IS 'Monthly payroll run management';
COMMENT ON TABLE payslips IS 'Individual employee salary records with attendance-based calculation';
COMMENT ON TABLE employee_documents IS 'Compliance document storage with internal verification';
COMMENT ON TABLE reconciliations IS 'Three-way Bill/PO/GRN matching records';

COMMENT ON COLUMN payslips.pro_rated_basic IS 'Basic salary adjusted for attendance: (basic × present_days / total_working_days)';
COMMENT ON COLUMN payslips.gross_salary IS 'pro_rated_basic + hra + allowances + overtime + bonus';
COMMENT ON COLUMN payslips.net_payable IS 'gross_salary - total_deductions';

COMMENT ON COLUMN reconciliations.bill_po_variance IS 'Difference between bill amount and PO amount';
COMMENT ON COLUMN reconciliations.bill_grn_variance IS 'Difference between bill amount and GRN received value';
COMMENT ON COLUMN reconciliations.po_grn_variance IS 'Difference between PO amount and GRN received value';

-- ============================================
-- MIGRATION 13: ENHANCED SCHEMA (Items 1.36-1.41)
-- From Code Audit - Reference Repository Patterns
-- ============================================

-- ============================================
-- 1.36: SALARY COMPONENTS TABLE (from Horilla HRMS pattern)
-- Reusable salary component definitions
-- ============================================

CREATE TABLE salary_components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identification
    name TEXT NOT NULL,                              -- 'Basic', 'HRA', 'PF Employee', etc.
    abbr VARCHAR(20) UNIQUE NOT NULL,                -- 'B', 'HRA', 'PF'
    
    -- Type
    type TEXT NOT NULL CHECK (type IN ('earning', 'deduction')),
    
    -- Calculation
    formula TEXT,                                    -- e.g., 'base * 0.12' or NULL for fixed amount
    default_amount BIGINT,                           -- Default amount in paise (if no formula)
    
    -- Behavior
    depends_on_payment_days BOOLEAN DEFAULT true,    -- Pro-rate based on attendance
    is_tax_applicable BOOLEAN DEFAULT true,          -- Subject to TDS calculation
    
    -- Ordering
    sort_order INTEGER DEFAULT 0,                    -- Display order in payslip
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_salary_components_type ON salary_components(type);
CREATE INDEX idx_salary_components_active ON salary_components(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE salary_components ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "View Salary Components"
    ON salary_components FOR SELECT
    TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod', 'account', 'company_md'));

CREATE POLICY "Manage Salary Components"
    ON salary_components FOR ALL
    TO authenticated
    USING (get_user_role() IN ('admin', 'account'));

-- Seed default salary components
INSERT INTO salary_components (name, abbr, type, formula, default_amount, depends_on_payment_days, is_tax_applicable, sort_order, description) VALUES
    ('Basic Salary', 'B', 'earning', NULL, NULL, true, true, 1, 'Base salary component'),
    ('House Rent Allowance', 'HRA', 'earning', 'B * 0.40', NULL, true, true, 2, '40% of Basic'),
    ('Dearness Allowance', 'DA', 'earning', 'B * 0.10', NULL, true, true, 3, '10% of Basic'),
    ('Special Allowance', 'SA', 'earning', NULL, NULL, true, true, 4, 'Special/flexible allowance'),
    ('Travel Allowance', 'TA', 'earning', NULL, NULL, false, false, 5, 'Fixed travel allowance'),
    ('Medical Allowance', 'MA', 'earning', NULL, NULL, false, false, 6, 'Fixed medical allowance'),
    ('PF Employee Contribution', 'PF', 'deduction', 'B * 0.12', NULL, true, false, 10, '12% of Basic'),
    ('ESIC Employee Contribution', 'ESIC', 'deduction', 'gross_pay * 0.0075', NULL, true, false, 11, '0.75% of Gross (if eligible)'),
    ('Professional Tax', 'PT', 'deduction', NULL, 20000, false, false, 12, 'State-wise Professional Tax'),
    ('TDS', 'TDS', 'deduction', NULL, NULL, false, false, 13, 'Tax Deducted at Source')
ON CONFLICT (abbr) DO NOTHING;

-- ============================================
-- 1.37: EMPLOYEE SALARY STRUCTURE TABLE (from Horilla HRMS pattern)
-- Employee-specific salary component assignments
-- ============================================

CREATE TABLE employee_salary_structure (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- References
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    component_id UUID NOT NULL REFERENCES salary_components(id),
    
    -- Amount (overrides component default)
    amount BIGINT NOT NULL,                          -- Amount in paise
    
    -- Validity Period
    effective_from DATE NOT NULL,
    effective_to DATE,                               -- NULL = currently active
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Ensure unique active structure per employee per component
    CONSTRAINT unique_employee_component_period UNIQUE (employee_id, component_id, effective_from)
);

-- Indexes
CREATE INDEX idx_employee_salary_structure_employee ON employee_salary_structure(employee_id);
CREATE INDEX idx_employee_salary_structure_component ON employee_salary_structure(component_id);
CREATE INDEX idx_employee_salary_structure_active ON employee_salary_structure(effective_to) WHERE effective_to IS NULL;

-- Enable RLS
ALTER TABLE employee_salary_structure ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Employees can view their own structure
CREATE POLICY "Employees View Own Salary Structure"
    ON employee_salary_structure FOR SELECT
    TO authenticated
    USING (
        employee_id IN (
            SELECT employee_id FROM users WHERE id = auth.uid()
        )
        OR get_user_role() IN ('admin', 'account', 'company_hod', 'company_md')
    );

CREATE POLICY "Manage Employee Salary Structure"
    ON employee_salary_structure FOR ALL
    TO authenticated
    USING (get_user_role() IN ('admin', 'account'));

-- ============================================
-- 1.38: CANDIDATE INTERVIEWS TABLE (from Horilla HRMS pattern)
-- Multi-round interview tracking for recruitment
-- ============================================

CREATE TABLE candidate_interviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Reference
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    
    -- Interview Details
    round_number INTEGER NOT NULL CHECK (round_number >= 1),
    interview_type TEXT NOT NULL CHECK (interview_type IN ('phone', 'technical', 'hr', 'final', 'panel', 'other')),
    
    -- Scheduling
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    location TEXT,                                   -- 'Office', 'Video Call', etc.
    meeting_link TEXT,                               -- For virtual interviews
    
    -- Interviewers
    interviewer_id UUID REFERENCES employees(id),
    panel_members JSONB,                             -- Array of employee IDs for panel interviews
    
    -- Completion
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Evaluation
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    recommendation TEXT CHECK (recommendation IN ('strong_yes', 'yes', 'maybe', 'no', 'strong_no')),
    
    -- Status
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled', 'no_show')),
    cancellation_reason TEXT,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Ensure unique round number per candidate
    CONSTRAINT unique_candidate_round UNIQUE (candidate_id, round_number)
);

-- Indexes
CREATE INDEX idx_candidate_interviews_candidate ON candidate_interviews(candidate_id);
CREATE INDEX idx_candidate_interviews_interviewer ON candidate_interviews(interviewer_id);
CREATE INDEX idx_candidate_interviews_scheduled ON candidate_interviews(scheduled_at);
CREATE INDEX idx_candidate_interviews_status ON candidate_interviews(status);

-- Enable RLS
ALTER TABLE candidate_interviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "View Candidate Interviews"
    ON candidate_interviews FOR SELECT
    TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod', 'company_md'));

CREATE POLICY "Manage Candidate Interviews"
    ON candidate_interviews FOR ALL
    TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod'));

-- Interviewers can update their own interviews
CREATE POLICY "Interviewers Update Own Interviews"
    ON candidate_interviews FOR UPDATE
    TO authenticated
    USING (
        interviewer_id IN (
            SELECT id FROM employees WHERE auth_user_id = auth.uid()
        )
    );

-- ============================================
-- 1.39: RECONCILIATION LINES TABLE (from bs_reconcile pattern)
-- Line-item level three-way matching junction table
-- ============================================

CREATE TABLE reconciliation_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Parent reconciliation
    reconciliation_id UUID NOT NULL REFERENCES reconciliations(id) ON DELETE CASCADE,
    
    -- Source document line items (nullable - not all three required for partial matching)
    po_item_id UUID,                                 -- REFERENCES purchase_order_items(id)
    grn_item_id UUID,                                -- REFERENCES material_receipt_items(id)
    bill_item_id UUID,                               -- REFERENCES purchase_bill_items(id)
    
    -- Product reference for easier querying
    product_id UUID REFERENCES products(id),
    
    -- Matched amounts
    matched_qty DECIMAL(10, 2) NOT NULL DEFAULT 0,
    matched_amount BIGINT NOT NULL DEFAULT 0,        -- In paise
    
    -- Variance at line level
    po_unit_price BIGINT,                            -- Unit price from PO (paise)
    grn_unit_price BIGINT,                           -- Unit price from GRN (paise)
    bill_unit_price BIGINT,                          -- Unit price from Bill (paise)
    unit_price_variance BIGINT DEFAULT 0,            -- bill_price - po_price (paise)
    
    qty_ordered DECIMAL(10, 2),                      -- From PO
    qty_received DECIMAL(10, 2),                     -- From GRN
    qty_billed DECIMAL(10, 2),                       -- From Bill
    qty_variance DECIMAL(10, 2) DEFAULT 0,           -- Difference in quantities
    
    -- Match type
    match_type TEXT NOT NULL CHECK (match_type IN ('PO_GRN', 'GRN_BILL', 'PO_BILL', 'THREE_WAY')),
    
    -- Line status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'variance', 'resolved')),
    
    -- Resolution (if variance)
    resolution_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_reconciliation_lines_reconciliation ON reconciliation_lines(reconciliation_id);
CREATE INDEX idx_reconciliation_lines_po_item ON reconciliation_lines(po_item_id) WHERE po_item_id IS NOT NULL;
CREATE INDEX idx_reconciliation_lines_grn_item ON reconciliation_lines(grn_item_id) WHERE grn_item_id IS NOT NULL;
CREATE INDEX idx_reconciliation_lines_bill_item ON reconciliation_lines(bill_item_id) WHERE bill_item_id IS NOT NULL;
CREATE INDEX idx_reconciliation_lines_product ON reconciliation_lines(product_id);
CREATE INDEX idx_reconciliation_lines_status ON reconciliation_lines(status);

-- Enable RLS
ALTER TABLE reconciliation_lines ENABLE ROW LEVEL SECURITY;

-- RLS Policies (inherit from parent reconciliation)
CREATE POLICY "View Reconciliation Lines"
    ON reconciliation_lines FOR SELECT
    TO authenticated
    USING (get_user_role() IN ('admin', 'account', 'company_hod', 'company_md'));

CREATE POLICY "Manage Reconciliation Lines"
    ON reconciliation_lines FOR ALL
    TO authenticated
    USING (get_user_role() IN ('admin', 'account'));

-- ============================================
-- 1.40: ADD RESIDUAL COLUMNS TO PO/GRN/BILL ITEMS
-- For tracking unmatched quantities (from bs_reconcile pattern)
-- ============================================

-- Note: These ALTER statements will only work if the tables exist.
-- They are wrapped in DO blocks to handle cases where tables don't exist yet.

-- Add residual columns to purchase_order_items (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_order_items') THEN
        -- Add unmatched_qty if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'purchase_order_items' AND column_name = 'unmatched_qty') THEN
            ALTER TABLE purchase_order_items ADD COLUMN unmatched_qty DECIMAL(10, 2);
        END IF;
        
        -- Add unmatched_amount if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'purchase_order_items' AND column_name = 'unmatched_amount') THEN
            ALTER TABLE purchase_order_items ADD COLUMN unmatched_amount BIGINT;
        END IF;
        
        RAISE NOTICE 'Added residual columns to purchase_order_items';
    ELSE
        RAISE NOTICE 'Table purchase_order_items does not exist yet - residual columns will be added when table is created';
    END IF;
END $$;

-- Add residual columns to material_receipt_items (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material_receipt_items') THEN
        -- Add unmatched_qty if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'material_receipt_items' AND column_name = 'unmatched_qty') THEN
            ALTER TABLE material_receipt_items ADD COLUMN unmatched_qty DECIMAL(10, 2);
        END IF;
        
        -- Add unmatched_amount if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'material_receipt_items' AND column_name = 'unmatched_amount') THEN
            ALTER TABLE material_receipt_items ADD COLUMN unmatched_amount BIGINT;
        END IF;
        
        RAISE NOTICE 'Added residual columns to material_receipt_items';
    ELSE
        RAISE NOTICE 'Table material_receipt_items does not exist yet - residual columns will be added when table is created';
    END IF;
END $$;

-- Add residual columns to purchase_bill_items (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_bill_items') THEN
        -- Add unmatched_qty if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'purchase_bill_items' AND column_name = 'unmatched_qty') THEN
            ALTER TABLE purchase_bill_items ADD COLUMN unmatched_qty DECIMAL(10, 2);
        END IF;
        
        -- Add unmatched_amount if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'purchase_bill_items' AND column_name = 'unmatched_amount') THEN
            ALTER TABLE purchase_bill_items ADD COLUMN unmatched_amount BIGINT;
        END IF;
        
        RAISE NOTICE 'Added residual columns to purchase_bill_items';
    ELSE
        RAISE NOTICE 'Table purchase_bill_items does not exist yet - residual columns will be added when table is created';
    END IF;
END $$;

-- ============================================
-- 1.41: ADD PAYMENT STATUS AND DUE AMOUNT TO BILLS/INVOICES
-- Dual status pattern from InvoiceShelf
-- ============================================

-- Add payment tracking columns to purchase_bills (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_bills') THEN
        -- Add payment_status if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'purchase_bills' AND column_name = 'payment_status') THEN
            ALTER TABLE purchase_bills ADD COLUMN payment_status TEXT DEFAULT 'unpaid' 
                CHECK (payment_status IN ('unpaid', 'partial', 'paid'));
        END IF;
        
        -- Add paid_amount if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'purchase_bills' AND column_name = 'paid_amount') THEN
            ALTER TABLE purchase_bills ADD COLUMN paid_amount BIGINT DEFAULT 0;
        END IF;
        
        -- Add due_amount as generated column if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'purchase_bills' AND column_name = 'due_amount') THEN
            -- Note: Can't use generated column if total_amount doesn't exist or has different type
            -- Using a regular column that must be updated via trigger/application
            ALTER TABLE purchase_bills ADD COLUMN due_amount BIGINT DEFAULT 0;
        END IF;
        
        RAISE NOTICE 'Added payment tracking columns to purchase_bills';
    ELSE
        RAISE NOTICE 'Table purchase_bills does not exist yet - payment columns will be added when table is created';
    END IF;
END $$;

-- Add payment tracking columns to sale_bills/buyer_invoices (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sale_bills') THEN
        -- Add payment_status if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'sale_bills' AND column_name = 'payment_status') THEN
            ALTER TABLE sale_bills ADD COLUMN payment_status TEXT DEFAULT 'unpaid' 
                CHECK (payment_status IN ('unpaid', 'partial', 'paid'));
        END IF;
        
        -- Add paid_amount if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'sale_bills' AND column_name = 'paid_amount') THEN
            ALTER TABLE sale_bills ADD COLUMN paid_amount BIGINT DEFAULT 0;
        END IF;
        
        -- Add due_amount if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'sale_bills' AND column_name = 'due_amount') THEN
            ALTER TABLE sale_bills ADD COLUMN due_amount BIGINT DEFAULT 0;
        END IF;
        
        RAISE NOTICE 'Added payment tracking columns to sale_bills';
    ELSE
        RAISE NOTICE 'Table sale_bills does not exist yet - payment columns will be added when table is created';
    END IF;
END $$;

-- ============================================
-- MIGRATION 14: ADDITIONAL TRIGGERS FOR NEW TABLES
-- ============================================

-- Updated_at triggers for new tables
CREATE TRIGGER update_salary_components_updated_at
    BEFORE UPDATE ON salary_components
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_salary_structure_updated_at
    BEFORE UPDATE ON employee_salary_structure
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidate_interviews_updated_at
    BEFORE UPDATE ON candidate_interviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reconciliation_lines_updated_at
    BEFORE UPDATE ON reconciliation_lines
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MIGRATION 15: HELPER VIEWS FOR NEW TABLES
-- ============================================

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
WHERE ess.effective_to IS NULL;  -- Only currently active structures

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

-- ============================================
-- MIGRATION 16: COMMENTS FOR NEW TABLES
-- ============================================

COMMENT ON TABLE salary_components IS 'Reusable salary component definitions with formulas - from Horilla HRMS pattern';
COMMENT ON TABLE employee_salary_structure IS 'Employee-specific salary component assignments with effective dates';
COMMENT ON TABLE candidate_interviews IS 'Multi-round interview tracking for recruitment pipeline';
COMMENT ON TABLE reconciliation_lines IS 'Line-item level three-way matching for PO/GRN/Bill reconciliation - from bs_reconcile pattern';

COMMENT ON COLUMN salary_components.formula IS 'Formula using variables: B (Basic), gross_pay, etc. Example: B * 0.12';
COMMENT ON COLUMN salary_components.default_amount IS 'Default amount in paise (smallest currency unit) if no formula';
COMMENT ON COLUMN employee_salary_structure.amount IS 'Amount in paise (1 INR = 100 paise)';
COMMENT ON COLUMN employee_salary_structure.effective_to IS 'NULL means currently active';

COMMENT ON COLUMN reconciliation_lines.matched_amount IS 'Matched amount in paise';
COMMENT ON COLUMN reconciliation_lines.unit_price_variance IS 'bill_price - po_price in paise';
COMMENT ON COLUMN reconciliation_lines.match_type IS 'Type of match: PO_GRN, GRN_BILL, PO_BILL, or THREE_WAY';

-- ============================================
-- MIGRATION 17: ATTENDANCE SUMMARY FUNCTION
-- For payroll integration (Phase C item 5.19)
-- ============================================

-- Function to get attendance summary for an employee in a date range
-- Used by payroll module to calculate pro-rated salary
CREATE OR REPLACE FUNCTION get_attendance_summary(
    p_employee_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    employee_id UUID,
    total_days INTEGER,
    present_days INTEGER,
    absent_days INTEGER,
    leave_days INTEGER,
    half_days INTEGER,
    late_days INTEGER,
    overtime_hours DECIMAL(6, 2),
    total_worked_hours DECIMAL(8, 2)
) AS $$
BEGIN
    RETURN QUERY
    WITH attendance_data AS (
        SELECT 
            al.employee_id,
            al.date,
            al.status,
            al.check_in,
            al.check_out,
            al.worked_hours,
            al.overtime_hours AS ot_hours,
            al.is_late
        FROM attendance_logs al
        WHERE al.employee_id = p_employee_id
          AND al.date >= p_start_date
          AND al.date <= p_end_date
    ),
    summary AS (
        SELECT
            p_employee_id AS emp_id,
            (p_end_date - p_start_date + 1)::INTEGER AS total_d,
            COUNT(*) FILTER (WHERE status = 'present')::INTEGER AS present_d,
            COUNT(*) FILTER (WHERE status = 'absent')::INTEGER AS absent_d,
            COUNT(*) FILTER (WHERE status IN ('leave', 'sick_leave', 'casual_leave', 'earned_leave'))::INTEGER AS leave_d,
            COUNT(*) FILTER (WHERE status = 'half_day')::INTEGER AS half_d,
            COUNT(*) FILTER (WHERE is_late = true)::INTEGER AS late_d,
            COALESCE(SUM(ot_hours), 0)::DECIMAL(6, 2) AS total_ot,
            COALESCE(SUM(worked_hours), 0)::DECIMAL(8, 2) AS total_worked
        FROM attendance_data
    )
    SELECT 
        s.emp_id,
        s.total_d,
        s.present_d,
        -- Calculate absent = total - present - leave - half_day
        GREATEST(0, s.total_d - s.present_d - s.leave_d - s.half_d)::INTEGER AS absent_d,
        s.leave_d,
        s.half_d,
        s.late_d,
        s.total_ot,
        s.total_worked
    FROM summary s;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_attendance_summary IS 'Returns attendance summary for payroll calculation. Counts present, absent, leave, and half days, plus overtime hours.';

-- ============================================
-- MIGRATION 18: BATCH ATTENDANCE SUMMARY
-- For generating payslips for all employees in a cycle
-- ============================================

-- Function to get attendance summary for multiple employees
CREATE OR REPLACE FUNCTION get_batch_attendance_summary(
    p_employee_ids UUID[],
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    employee_id UUID,
    total_days INTEGER,
    present_days INTEGER,
    absent_days INTEGER,
    leave_days INTEGER,
    half_days INTEGER,
    late_days INTEGER,
    overtime_hours DECIMAL(6, 2),
    total_worked_hours DECIMAL(8, 2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id AS employee_id,
        (p_end_date - p_start_date + 1)::INTEGER AS total_days,
        COALESCE(COUNT(*) FILTER (WHERE al.status = 'present'), 0)::INTEGER AS present_days,
        COALESCE(COUNT(*) FILTER (WHERE al.status = 'absent'), 0)::INTEGER AS absent_days,
        COALESCE(COUNT(*) FILTER (WHERE al.status IN ('leave', 'sick_leave', 'casual_leave', 'earned_leave')), 0)::INTEGER AS leave_days,
        COALESCE(COUNT(*) FILTER (WHERE al.status = 'half_day'), 0)::INTEGER AS half_days,
        COALESCE(COUNT(*) FILTER (WHERE al.is_late = true), 0)::INTEGER AS late_days,
        COALESCE(SUM(al.overtime_hours), 0)::DECIMAL(6, 2) AS overtime_hours,
        COALESCE(SUM(al.worked_hours), 0)::DECIMAL(8, 2) AS total_worked_hours
    FROM UNNEST(p_employee_ids) AS e(id)
    LEFT JOIN attendance_logs al ON al.employee_id = e.id
        AND al.date >= p_start_date
        AND al.date <= p_end_date
    GROUP BY e.id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_batch_attendance_summary IS 'Returns attendance summary for multiple employees at once. Used for batch payslip generation.';

-- ============================================
-- MIGRATION 19: INDENTS TABLE
-- Internal material request tracking
-- ============================================

-- Indent status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'indent_status') THEN
        CREATE TYPE indent_status AS ENUM (
            'draft',
            'pending_approval',
            'approved',
            'rejected',
            'po_created',
            'cancelled'
        );
    END IF;
END $$;

-- Sequences for code generation
CREATE SEQUENCE IF NOT EXISTS indent_seq START 1;

-- Indents Table
CREATE TABLE IF NOT EXISTS indents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    indent_number VARCHAR(20) UNIQUE,                    -- Auto-generated: IND-2026-0001
    
    -- Requester info
    requester_id UUID NOT NULL REFERENCES employees(id),
    department VARCHAR(100),
    
    -- Location context
    location_id UUID REFERENCES company_locations(id),
    society_id UUID REFERENCES societies(id),
    
    -- Indent details
    title VARCHAR(200),
    purpose TEXT,
    required_date DATE,
    
    -- Priority
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Status
    status indent_status DEFAULT 'draft' NOT NULL,
    
    -- Totals (calculated from items)
    total_items INTEGER DEFAULT 0,
    total_estimated_value BIGINT DEFAULT 0,              -- In paise
    
    -- Approval workflow
    submitted_at TIMESTAMP WITH TIME ZONE,
    submitted_by UUID REFERENCES auth.users(id),
    
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES auth.users(id),
    approver_notes TEXT,
    
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejected_by UUID REFERENCES auth.users(id),
    rejection_reason TEXT,
    
    -- PO creation
    po_created_at TIMESTAMP WITH TIME ZONE,
    linked_po_id UUID,                                   -- Will be FK to purchase_orders
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Indent Items Table
CREATE TABLE IF NOT EXISTS indent_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Parent indent
    indent_id UUID NOT NULL REFERENCES indents(id) ON DELETE CASCADE,
    
    -- Product reference
    product_id UUID REFERENCES products(id),
    
    -- Manual entry (if product not in catalog)
    item_description TEXT,
    specifications TEXT,
    
    -- Quantity
    requested_quantity DECIMAL(10, 2) NOT NULL,
    unit_of_measure VARCHAR(20) DEFAULT 'pcs',
    
    -- Estimated pricing
    estimated_unit_price BIGINT,                         -- In paise
    estimated_total BIGINT,                              -- In paise
    
    -- Approval adjustments
    approved_quantity DECIMAL(10, 2),
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for indents
CREATE INDEX IF NOT EXISTS idx_indents_status ON indents(status);
CREATE INDEX IF NOT EXISTS idx_indents_requester ON indents(requester_id);
CREATE INDEX IF NOT EXISTS idx_indents_department ON indents(department);
CREATE INDEX IF NOT EXISTS idx_indents_created_at ON indents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_indents_location ON indents(location_id);
CREATE INDEX IF NOT EXISTS idx_indents_society ON indents(society_id);

-- Indexes for indent_items
CREATE INDEX IF NOT EXISTS idx_indent_items_indent ON indent_items(indent_id);
CREATE INDEX IF NOT EXISTS idx_indent_items_product ON indent_items(product_id);

-- Enable RLS on indents
ALTER TABLE indents ENABLE ROW LEVEL SECURITY;
ALTER TABLE indent_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for indents
CREATE POLICY "View Indents"
    ON indents FOR SELECT
    TO authenticated
    USING (
        requester_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
        OR get_user_role() IN ('admin', 'company_hod', 'account', 'company_md')
    );

CREATE POLICY "Create Indents"
    ON indents FOR INSERT
    TO authenticated
    WITH CHECK (get_user_role() IN ('admin', 'company_hod', 'account', 'security_supervisor', 'society_manager'));

CREATE POLICY "Update Own Indents"
    ON indents FOR UPDATE
    TO authenticated
    USING (
        (requester_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid()) AND status = 'draft')
        OR get_user_role() IN ('admin', 'company_hod')
    );

CREATE POLICY "Delete Draft Indents"
    ON indents FOR DELETE
    TO authenticated
    USING (
        (requester_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid()) AND status = 'draft')
        OR get_user_role() IN ('admin')
    );

-- RLS Policies for indent_items
CREATE POLICY "View Indent Items"
    ON indent_items FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM indents i 
            WHERE i.id = indent_items.indent_id
            AND (
                i.requester_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
                OR get_user_role() IN ('admin', 'company_hod', 'account', 'company_md')
            )
        )
    );

CREATE POLICY "Manage Indent Items"
    ON indent_items FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM indents i 
            WHERE i.id = indent_items.indent_id
            AND (
                (i.requester_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid()) AND i.status = 'draft')
                OR get_user_role() IN ('admin', 'company_hod')
            )
        )
    );

-- Indent code generation function
CREATE OR REPLACE FUNCTION generate_indent_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.indent_number := 'IND-' || TO_CHAR(now(), 'YYYY') || '-' || 
        LPAD(nextval('indent_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for indent number generation
DROP TRIGGER IF EXISTS set_indent_number ON indents;
CREATE TRIGGER set_indent_number
    BEFORE INSERT ON indents
    FOR EACH ROW
    WHEN (NEW.indent_number IS NULL)
    EXECUTE FUNCTION generate_indent_number();

-- Updated_at trigger for indents
DROP TRIGGER IF EXISTS update_indents_updated_at ON indents;
CREATE TRIGGER update_indents_updated_at
    BEFORE UPDATE ON indents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Updated_at trigger for indent_items
DROP TRIGGER IF EXISTS update_indent_items_updated_at ON indent_items;
CREATE TRIGGER update_indent_items_updated_at
    BEFORE UPDATE ON indent_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to recalculate indent totals
CREATE OR REPLACE FUNCTION recalculate_indent_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_indent_id UUID;
BEGIN
    -- Get the indent_id from either OLD or NEW
    v_indent_id := COALESCE(NEW.indent_id, OLD.indent_id);
    
    -- Update indent totals
    UPDATE indents
    SET 
        total_items = (
            SELECT COUNT(*) FROM indent_items WHERE indent_id = v_indent_id
        ),
        total_estimated_value = (
            SELECT COALESCE(SUM(estimated_total), 0) FROM indent_items WHERE indent_id = v_indent_id
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_indent_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate indent totals
DROP TRIGGER IF EXISTS trigger_recalculate_indent_totals ON indent_items;
CREATE TRIGGER trigger_recalculate_indent_totals
    AFTER INSERT OR UPDATE OR DELETE ON indent_items
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_indent_totals();

-- ============================================
-- MIGRATION 20: PURCHASE ORDERS TABLE
-- Supplier purchase order management
-- ============================================

-- Purchase order status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'po_status') THEN
        CREATE TYPE po_status AS ENUM (
            'draft',
            'sent_to_vendor',
            'acknowledged',
            'partial_received',
            'received',
            'cancelled'
        );
    END IF;
END $$;

-- Sequences for code generation
CREATE SEQUENCE IF NOT EXISTS po_seq START 1;

-- Purchase Orders Table
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number VARCHAR(20) UNIQUE,                        -- Auto-generated: PO-2026-0001
    
    -- Source indent
    indent_id UUID REFERENCES indents(id),
    
    -- Supplier
    supplier_id UUID REFERENCES suppliers(id),
    
    -- Dates
    po_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    
    -- Status
    status po_status DEFAULT 'draft' NOT NULL,
    
    -- Shipping/Billing
    shipping_address TEXT,
    billing_address TEXT,
    
    -- Amounts (in paise)
    subtotal BIGINT DEFAULT 0,
    tax_amount BIGINT DEFAULT 0,
    discount_amount BIGINT DEFAULT 0,
    shipping_cost BIGINT DEFAULT 0,
    grand_total BIGINT DEFAULT 0,
    
    -- Payment terms
    payment_terms TEXT,
    
    -- Workflow tracking
    sent_to_vendor_at TIMESTAMP WITH TIME ZONE,
    vendor_acknowledged_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    notes TEXT,
    terms_and_conditions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Purchase Order Items Table
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Parent PO
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    
    -- Source indent item (if applicable)
    indent_item_id UUID REFERENCES indent_items(id),
    
    -- Product reference
    product_id UUID REFERENCES products(id),
    
    -- Item details
    item_description TEXT,
    specifications TEXT,
    
    -- Quantity
    ordered_quantity DECIMAL(10, 2) NOT NULL,
    unit_of_measure VARCHAR(20) DEFAULT 'pcs',
    
    -- Received tracking
    received_quantity DECIMAL(10, 2) DEFAULT 0,
    
    -- Pricing (in paise)
    unit_price BIGINT NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    tax_amount BIGINT DEFAULT 0,
    discount_percent DECIMAL(5, 2) DEFAULT 0,
    discount_amount BIGINT DEFAULT 0,
    line_total BIGINT NOT NULL,
    
    -- Reconciliation tracking (from bs_reconcile pattern)
    unmatched_qty DECIMAL(10, 2),
    unmatched_amount BIGINT,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for purchase_orders
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_indent ON purchase_orders(indent_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_at ON purchase_orders(created_at DESC);

-- Indexes for purchase_order_items
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product ON purchase_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_indent_item ON purchase_order_items(indent_item_id);

-- Enable RLS
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for purchase_orders
CREATE POLICY "View Purchase Orders"
    ON purchase_orders FOR SELECT
    TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod', 'account', 'company_md'));

CREATE POLICY "Manage Purchase Orders"
    ON purchase_orders FOR ALL
    TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod', 'account'));

-- RLS Policies for purchase_order_items
CREATE POLICY "View Purchase Order Items"
    ON purchase_order_items FOR SELECT
    TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod', 'account', 'company_md'));

CREATE POLICY "Manage Purchase Order Items"
    ON purchase_order_items FOR ALL
    TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod', 'account'));

-- PO number generation function
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.po_number := 'PO-' || TO_CHAR(now(), 'YYYY') || '-' || 
        LPAD(nextval('po_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for PO number generation
DROP TRIGGER IF EXISTS set_po_number ON purchase_orders;
CREATE TRIGGER set_po_number
    BEFORE INSERT ON purchase_orders
    FOR EACH ROW
    WHEN (NEW.po_number IS NULL)
    EXECUTE FUNCTION generate_po_number();

-- Updated_at triggers
DROP TRIGGER IF EXISTS update_purchase_orders_updated_at ON purchase_orders;
CREATE TRIGGER update_purchase_orders_updated_at
    BEFORE UPDATE ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_purchase_order_items_updated_at ON purchase_order_items;
CREATE TRIGGER update_purchase_order_items_updated_at
    BEFORE UPDATE ON purchase_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to recalculate PO totals
CREATE OR REPLACE FUNCTION recalculate_po_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_po_id UUID;
BEGIN
    v_po_id := COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);
    
    UPDATE purchase_orders
    SET 
        subtotal = (
            SELECT COALESCE(SUM(line_total - tax_amount), 0) 
            FROM purchase_order_items WHERE purchase_order_id = v_po_id
        ),
        tax_amount = (
            SELECT COALESCE(SUM(tax_amount), 0) 
            FROM purchase_order_items WHERE purchase_order_id = v_po_id
        ),
        grand_total = (
            SELECT COALESCE(SUM(line_total), 0) 
            FROM purchase_order_items WHERE purchase_order_id = v_po_id
        ) + shipping_cost - discount_amount,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_po_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate PO totals
DROP TRIGGER IF EXISTS trigger_recalculate_po_totals ON purchase_order_items;
CREATE TRIGGER trigger_recalculate_po_totals
    AFTER INSERT OR UPDATE OR DELETE ON purchase_order_items
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_po_totals();

-- Add FK from indents to purchase_orders (update after table created)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'indents_linked_po_fk'
    ) THEN
        ALTER TABLE indents 
        ADD CONSTRAINT indents_linked_po_fk 
        FOREIGN KEY (linked_po_id) REFERENCES purchase_orders(id);
    END IF;
END $$;

-- ============================================
-- MIGRATION 21: MATERIAL RECEIPTS (GRN) TABLE
-- Goods received notes for PO fulfillment
-- ============================================

-- GRN status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'grn_status') THEN
        CREATE TYPE grn_status AS ENUM (
            'draft',
            'inspecting',
            'accepted',
            'partial_accepted',
            'rejected'
        );
    END IF;
END $$;

-- Sequences for code generation
CREATE SEQUENCE IF NOT EXISTS grn_seq START 1;

-- Material Receipts (GRN) Table
CREATE TABLE IF NOT EXISTS material_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grn_number VARCHAR(20) UNIQUE,                       -- Auto-generated: GRN-2026-0001
    
    -- Source PO
    purchase_order_id UUID REFERENCES purchase_orders(id),
    
    -- Supplier
    supplier_id UUID REFERENCES suppliers(id),
    
    -- Receipt details
    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    received_by UUID REFERENCES employees(id),
    
    -- Location
    warehouse_id UUID REFERENCES warehouses(id),
    
    -- Status
    status grn_status DEFAULT 'draft' NOT NULL,
    
    -- Quality check
    quality_checked_by UUID REFERENCES employees(id),
    quality_checked_at TIMESTAMP WITH TIME ZONE,
    
    -- Amounts (in paise)
    total_received_value BIGINT DEFAULT 0,
    
    -- Delivery info
    delivery_challan_number VARCHAR(100),
    vehicle_number VARCHAR(50),
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Material Receipt Items Table
CREATE TABLE IF NOT EXISTS material_receipt_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Parent GRN
    material_receipt_id UUID NOT NULL REFERENCES material_receipts(id) ON DELETE CASCADE,
    
    -- Source PO item
    po_item_id UUID REFERENCES purchase_order_items(id),
    
    -- Product reference
    product_id UUID REFERENCES products(id),
    
    -- Item details
    item_description TEXT,
    
    -- Quantities
    ordered_quantity DECIMAL(10, 2),                     -- From PO
    received_quantity DECIMAL(10, 2) NOT NULL,
    accepted_quantity DECIMAL(10, 2),
    rejected_quantity DECIMAL(10, 2) DEFAULT 0,
    
    -- Quality status
    quality_status VARCHAR(20) DEFAULT 'pending' CHECK (quality_status IN ('pending', 'good', 'damaged', 'partial', 'rejected')),
    rejection_reason TEXT,
    
    -- Pricing (in paise) - for value calculation
    unit_price BIGINT,
    line_total BIGINT,
    
    -- Reconciliation tracking
    unmatched_qty DECIMAL(10, 2),
    unmatched_amount BIGINT,
    
    -- Batch/lot tracking
    batch_number VARCHAR(50),
    expiry_date DATE,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for material_receipts
CREATE INDEX IF NOT EXISTS idx_material_receipts_status ON material_receipts(status);
CREATE INDEX IF NOT EXISTS idx_material_receipts_po ON material_receipts(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_material_receipts_supplier ON material_receipts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_material_receipts_created_at ON material_receipts(created_at DESC);

-- Indexes for material_receipt_items
CREATE INDEX IF NOT EXISTS idx_material_receipt_items_grn ON material_receipt_items(material_receipt_id);
CREATE INDEX IF NOT EXISTS idx_material_receipt_items_po_item ON material_receipt_items(po_item_id);
CREATE INDEX IF NOT EXISTS idx_material_receipt_items_product ON material_receipt_items(product_id);

-- Enable RLS
ALTER TABLE material_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_receipt_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "View Material Receipts"
    ON material_receipts FOR SELECT
    TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod', 'account', 'company_md'));

CREATE POLICY "Manage Material Receipts"
    ON material_receipts FOR ALL
    TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod', 'account'));

CREATE POLICY "View Material Receipt Items"
    ON material_receipt_items FOR SELECT
    TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod', 'account', 'company_md'));

CREATE POLICY "Manage Material Receipt Items"
    ON material_receipt_items FOR ALL
    TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod', 'account'));

-- GRN number generation function
CREATE OR REPLACE FUNCTION generate_grn_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.grn_number := 'GRN-' || TO_CHAR(now(), 'YYYY') || '-' || 
        LPAD(nextval('grn_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for GRN number generation
DROP TRIGGER IF EXISTS set_grn_number ON material_receipts;
CREATE TRIGGER set_grn_number
    BEFORE INSERT ON material_receipts
    FOR EACH ROW
    WHEN (NEW.grn_number IS NULL)
    EXECUTE FUNCTION generate_grn_number();

-- Updated_at triggers
DROP TRIGGER IF EXISTS update_material_receipts_updated_at ON material_receipts;
CREATE TRIGGER update_material_receipts_updated_at
    BEFORE UPDATE ON material_receipts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_material_receipt_items_updated_at ON material_receipt_items;
CREATE TRIGGER update_material_receipt_items_updated_at
    BEFORE UPDATE ON material_receipt_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MIGRATION 22: PURCHASE BILLS TABLE
-- Supplier bill/invoice tracking
-- ============================================

-- Sequences for bill numbers
CREATE SEQUENCE IF NOT EXISTS purchase_bill_seq START 1;

-- Purchase Bills Table
CREATE TABLE IF NOT EXISTS purchase_bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_number VARCHAR(30) UNIQUE,                      -- Auto-generated or from supplier
    supplier_invoice_number VARCHAR(100),                -- Supplier's invoice reference
    
    -- References
    purchase_order_id UUID REFERENCES purchase_orders(id),
    material_receipt_id UUID REFERENCES material_receipts(id),
    supplier_id UUID REFERENCES suppliers(id),
    
    -- Dates
    bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    
    -- Document status
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'disputed')),
    
    -- Payment status (dual status pattern)
    payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
    
    -- Amounts (in paise)
    subtotal BIGINT DEFAULT 0,
    tax_amount BIGINT DEFAULT 0,
    discount_amount BIGINT DEFAULT 0,
    total_amount BIGINT NOT NULL DEFAULT 0,
    paid_amount BIGINT DEFAULT 0,
    due_amount BIGINT DEFAULT 0,
    
    -- Payment tracking
    last_payment_date DATE,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Purchase Bill Items Table
CREATE TABLE IF NOT EXISTS purchase_bill_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Parent bill
    purchase_bill_id UUID NOT NULL REFERENCES purchase_bills(id) ON DELETE CASCADE,
    
    -- Source references
    po_item_id UUID REFERENCES purchase_order_items(id),
    grn_item_id UUID REFERENCES material_receipt_items(id),
    
    -- Product reference
    product_id UUID REFERENCES products(id),
    
    -- Item details
    item_description TEXT,
    
    -- Quantities
    billed_quantity DECIMAL(10, 2) NOT NULL,
    unit_of_measure VARCHAR(20) DEFAULT 'pcs',
    
    -- Pricing (in paise)
    unit_price BIGINT NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    tax_amount BIGINT DEFAULT 0,
    discount_amount BIGINT DEFAULT 0,
    line_total BIGINT NOT NULL,
    
    -- Reconciliation tracking
    unmatched_qty DECIMAL(10, 2),
    unmatched_amount BIGINT,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_purchase_bills_status ON purchase_bills(status);
CREATE INDEX IF NOT EXISTS idx_purchase_bills_payment_status ON purchase_bills(payment_status);
CREATE INDEX IF NOT EXISTS idx_purchase_bills_supplier ON purchase_bills(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_bills_po ON purchase_bills(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_bills_grn ON purchase_bills(material_receipt_id);
CREATE INDEX IF NOT EXISTS idx_purchase_bills_created_at ON purchase_bills(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_purchase_bill_items_bill ON purchase_bill_items(purchase_bill_id);
CREATE INDEX IF NOT EXISTS idx_purchase_bill_items_product ON purchase_bill_items(product_id);

-- Enable RLS
ALTER TABLE purchase_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_bill_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "View Purchase Bills"
    ON purchase_bills FOR SELECT
    TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod', 'account', 'company_md'));

CREATE POLICY "Manage Purchase Bills"
    ON purchase_bills FOR ALL
    TO authenticated
    USING (get_user_role() IN ('admin', 'account'));

CREATE POLICY "View Purchase Bill Items"
    ON purchase_bill_items FOR SELECT
    TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod', 'account', 'company_md'));

CREATE POLICY "Manage Purchase Bill Items"
    ON purchase_bill_items FOR ALL
    TO authenticated
    USING (get_user_role() IN ('admin', 'account'));

-- Bill number generation (with supplier prefix if available)
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

DROP TRIGGER IF EXISTS set_bill_number ON purchase_bills;
CREATE TRIGGER set_bill_number
    BEFORE INSERT ON purchase_bills
    FOR EACH ROW
    EXECUTE FUNCTION generate_bill_number();

-- Updated_at triggers
DROP TRIGGER IF EXISTS update_purchase_bills_updated_at ON purchase_bills;
CREATE TRIGGER update_purchase_bills_updated_at
    BEFORE UPDATE ON purchase_bills
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_purchase_bill_items_updated_at ON purchase_bill_items;
CREATE TRIGGER update_purchase_bill_items_updated_at
    BEFORE UPDATE ON purchase_bill_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update due_amount on payment changes
CREATE OR REPLACE FUNCTION update_bill_due_amount()
RETURNS TRIGGER AS $$
BEGIN
    NEW.due_amount := NEW.total_amount - NEW.paid_amount;
    
    -- Auto-update payment_status
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
    FOR EACH ROW
    EXECUTE FUNCTION update_bill_due_amount();

-- ============================================
-- MIGRATION 23: VIEWS FOR NEW TABLES
-- ============================================

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
    sup.supplier_code,
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
    sup.supplier_code,
    po.po_number,
    mr.grn_number
FROM purchase_bills pb
LEFT JOIN suppliers sup ON pb.supplier_id = sup.id
LEFT JOIN purchase_orders po ON pb.purchase_order_id = po.id
LEFT JOIN material_receipts mr ON pb.material_receipt_id = mr.id;

-- ============================================
-- MIGRATION 24: COMMENTS FOR NEW TABLES
-- ============================================

COMMENT ON TABLE indents IS 'Internal material requests before conversion to PO';
COMMENT ON TABLE indent_items IS 'Line items for indent requests';
COMMENT ON TABLE purchase_orders IS 'Purchase orders sent to suppliers';
COMMENT ON TABLE purchase_order_items IS 'Line items for purchase orders';
COMMENT ON TABLE material_receipts IS 'Goods Received Notes (GRN) for received materials';
COMMENT ON TABLE material_receipt_items IS 'Line items for material receipts';
COMMENT ON TABLE purchase_bills IS 'Supplier bills/invoices for payment';
COMMENT ON TABLE purchase_bill_items IS 'Line items for supplier bills';

COMMENT ON COLUMN indents.total_estimated_value IS 'Sum of estimated_total from indent_items in paise';
COMMENT ON COLUMN purchase_orders.grand_total IS 'Total PO value including tax, minus discounts, plus shipping in paise';
COMMENT ON COLUMN purchase_bills.due_amount IS 'total_amount - paid_amount, auto-calculated';

