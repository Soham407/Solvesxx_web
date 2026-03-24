
-- ============================================
-- PHASE C MIGRATION 02: CORE TABLES
-- ============================================

-- CANDIDATES TABLE
CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_code VARCHAR(20) UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    date_of_birth DATE,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    applied_position VARCHAR(200) NOT NULL,
    designation_id UUID REFERENCES designations(id),
    department VARCHAR(100),
    expected_salary DECIMAL(12, 2),
    notice_period_days INTEGER,
    resume_url TEXT,
    status candidate_status DEFAULT 'screening' NOT NULL,
    status_changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status_changed_by UUID REFERENCES auth.users(id),
    interview_date TIMESTAMP WITH TIME ZONE,
    interview_notes TEXT,
    interview_rating INTEGER CHECK (interview_rating >= 1 AND interview_rating <= 5),
    interviewer_id UUID REFERENCES employees(id),
    bgv_initiated_at TIMESTAMP WITH TIME ZONE,
    bgv_completed_at TIMESTAMP WITH TIME ZONE,
    bgv_status VARCHAR(50),
    bgv_notes TEXT,
    offered_salary DECIMAL(12, 2),
    offer_date DATE,
    offer_accepted_at TIMESTAMP WITH TIME ZONE,
    joining_date DATE,
    rejection_reason TEXT,
    converted_employee_id UUID REFERENCES employees(id),
    converted_at TIMESTAMP WITH TIME ZONE,
    source VARCHAR(100),
    referred_by UUID REFERENCES employees(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_candidates_status ON candidates(status);
CREATE INDEX idx_candidates_applied_position ON candidates(applied_position);
CREATE INDEX idx_candidates_department ON candidates(department);
CREATE INDEX idx_candidates_email ON candidates(email);
CREATE INDEX idx_candidates_created_at ON candidates(created_at DESC);

ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View Candidates" ON candidates FOR SELECT TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod', 'company_md'));
CREATE POLICY "Manage Candidates" ON candidates FOR ALL TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod'));

-- PAYROLL CYCLES TABLE
CREATE TABLE payroll_cycles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cycle_code VARCHAR(20) UNIQUE NOT NULL,
    period_month INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
    period_year INTEGER NOT NULL CHECK (period_year >= 2020),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_working_days INTEGER NOT NULL,
    status payroll_cycle_status DEFAULT 'draft' NOT NULL,
    computed_at TIMESTAMP WITH TIME ZONE,
    computed_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES auth.users(id),
    disbursed_at TIMESTAMP WITH TIME ZONE,
    disbursed_by UUID REFERENCES auth.users(id),
    total_employees INTEGER DEFAULT 0,
    total_gross DECIMAL(14, 2) DEFAULT 0,
    total_deductions DECIMAL(14, 2) DEFAULT 0,
    total_net DECIMAL(14, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    CONSTRAINT unique_payroll_period UNIQUE (period_month, period_year)
);

CREATE INDEX idx_payroll_cycles_period ON payroll_cycles(period_year, period_month);
CREATE INDEX idx_payroll_cycles_status ON payroll_cycles(status);

ALTER TABLE payroll_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View Payroll Cycles" ON payroll_cycles FOR SELECT TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod', 'account', 'company_md'));
CREATE POLICY "Manage Payroll Cycles" ON payroll_cycles FOR ALL TO authenticated
    USING (get_user_role() IN ('admin', 'account'));

-- PAYSLIPS TABLE
CREATE TABLE payslips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payslip_number VARCHAR(30) UNIQUE,
    payroll_cycle_id UUID NOT NULL REFERENCES payroll_cycles(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id),
    present_days DECIMAL(6, 2) NOT NULL DEFAULT 0,
    absent_days DECIMAL(6, 2) NOT NULL DEFAULT 0,
    leave_days DECIMAL(6, 2) NOT NULL DEFAULT 0,
    overtime_hours DECIMAL(6, 2) NOT NULL DEFAULT 0,
    basic_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
    pro_rated_basic DECIMAL(12, 2) NOT NULL DEFAULT 0,
    hra DECIMAL(12, 2) NOT NULL DEFAULT 0,
    special_allowance DECIMAL(12, 2) NOT NULL DEFAULT 0,
    travel_allowance DECIMAL(12, 2) NOT NULL DEFAULT 0,
    medical_allowance DECIMAL(12, 2) NOT NULL DEFAULT 0,
    overtime_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    bonus DECIMAL(12, 2) NOT NULL DEFAULT 0,
    other_earnings DECIMAL(12, 2) NOT NULL DEFAULT 0,
    gross_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
    pf_deduction DECIMAL(12, 2) NOT NULL DEFAULT 0,
    esic_deduction DECIMAL(12, 2) NOT NULL DEFAULT 0,
    professional_tax DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tds DECIMAL(12, 2) NOT NULL DEFAULT 0,
    loan_recovery DECIMAL(12, 2) NOT NULL DEFAULT 0,
    advance_recovery DECIMAL(12, 2) NOT NULL DEFAULT 0,
    other_deductions DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_deductions DECIMAL(12, 2) NOT NULL DEFAULT 0,
    net_payable DECIMAL(12, 2) NOT NULL DEFAULT 0,
    employer_pf DECIMAL(12, 2) NOT NULL DEFAULT 0,
    employer_esic DECIMAL(12, 2) NOT NULL DEFAULT 0,
    bank_account_number VARCHAR(30),
    bank_ifsc VARCHAR(20),
    payment_mode VARCHAR(20),
    payment_reference VARCHAR(100),
    paid_at TIMESTAMP WITH TIME ZONE,
    status payslip_status DEFAULT 'draft' NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    CONSTRAINT unique_employee_cycle UNIQUE (payroll_cycle_id, employee_id)
);

CREATE INDEX idx_payslips_cycle ON payslips(payroll_cycle_id);
CREATE INDEX idx_payslips_employee ON payslips(employee_id);
CREATE INDEX idx_payslips_status ON payslips(status);

ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees View Own Payslips" ON payslips FOR SELECT TO authenticated
    USING (
        employee_id IN (SELECT employee_id FROM users WHERE id = auth.uid())
        OR get_user_role() IN ('admin', 'account', 'company_hod', 'company_md')
    );
CREATE POLICY "Manage Payslips" ON payslips FOR ALL TO authenticated
    USING (get_user_role() IN ('admin', 'account'));

-- EMPLOYEE DOCUMENTS TABLE
CREATE TABLE employee_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_code VARCHAR(50) UNIQUE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    document_type document_type NOT NULL,
    document_number VARCHAR(100),
    document_name VARCHAR(200) NOT NULL,
    file_path TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    issue_date DATE,
    expiry_date DATE,
    status document_status DEFAULT 'pending_review' NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES auth.users(id),
    rejection_reason TEXT,
    expiry_notified_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_employee_documents_employee ON employee_documents(employee_id);
CREATE INDEX idx_employee_documents_type ON employee_documents(document_type);
CREATE INDEX idx_employee_documents_status ON employee_documents(status);
CREATE INDEX idx_employee_documents_expiry ON employee_documents(expiry_date) WHERE expiry_date IS NOT NULL;

ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees View Own Documents" ON employee_documents FOR SELECT TO authenticated
    USING (
        employee_id IN (SELECT employee_id FROM users WHERE id = auth.uid())
        OR get_user_role() IN ('admin', 'company_hod', 'company_md')
    );
CREATE POLICY "Upload Own Documents" ON employee_documents FOR INSERT TO authenticated
    WITH CHECK (
        employee_id IN (SELECT employee_id FROM users WHERE id = auth.uid())
        OR get_user_role() IN ('admin', 'company_hod')
    );
CREATE POLICY "Admin Manage Documents" ON employee_documents FOR ALL TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod'));

-- SALARY COMPONENTS TABLE
CREATE TABLE salary_components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    abbr VARCHAR(20) UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('earning', 'deduction')),
    formula TEXT,
    default_amount BIGINT,
    depends_on_payment_days BOOLEAN DEFAULT true,
    is_tax_applicable BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_salary_components_type ON salary_components(type);
CREATE INDEX idx_salary_components_active ON salary_components(is_active) WHERE is_active = true;

ALTER TABLE salary_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View Salary Components" ON salary_components FOR SELECT TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod', 'account', 'company_md'));
CREATE POLICY "Manage Salary Components" ON salary_components FOR ALL TO authenticated
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

-- EMPLOYEE SALARY STRUCTURE TABLE
CREATE TABLE employee_salary_structure (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    component_id UUID NOT NULL REFERENCES salary_components(id),
    amount BIGINT NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    CONSTRAINT unique_employee_component_period UNIQUE (employee_id, component_id, effective_from)
);

CREATE INDEX idx_employee_salary_structure_employee ON employee_salary_structure(employee_id);
CREATE INDEX idx_employee_salary_structure_component ON employee_salary_structure(component_id);
CREATE INDEX idx_employee_salary_structure_active ON employee_salary_structure(effective_to) WHERE effective_to IS NULL;

ALTER TABLE employee_salary_structure ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees View Own Salary Structure" ON employee_salary_structure FOR SELECT TO authenticated
    USING (
        employee_id IN (SELECT employee_id FROM users WHERE id = auth.uid())
        OR get_user_role() IN ('admin', 'account', 'company_hod', 'company_md')
    );
CREATE POLICY "Manage Employee Salary Structure" ON employee_salary_structure FOR ALL TO authenticated
    USING (get_user_role() IN ('admin', 'account'));

-- CANDIDATE INTERVIEWS TABLE
CREATE TABLE candidate_interviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL CHECK (round_number >= 1),
    interview_type TEXT NOT NULL CHECK (interview_type IN ('phone', 'technical', 'hr', 'final', 'panel', 'other')),
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    location TEXT,
    meeting_link TEXT,
    interviewer_id UUID REFERENCES employees(id),
    panel_members JSONB,
    completed_at TIMESTAMP WITH TIME ZONE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    recommendation TEXT CHECK (recommendation IN ('strong_yes', 'yes', 'maybe', 'no', 'strong_no')),
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled', 'no_show')),
    cancellation_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    CONSTRAINT unique_candidate_round UNIQUE (candidate_id, round_number)
);

CREATE INDEX idx_candidate_interviews_candidate ON candidate_interviews(candidate_id);
CREATE INDEX idx_candidate_interviews_interviewer ON candidate_interviews(interviewer_id);
CREATE INDEX idx_candidate_interviews_scheduled ON candidate_interviews(scheduled_at);
CREATE INDEX idx_candidate_interviews_status ON candidate_interviews(status);

ALTER TABLE candidate_interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View Candidate Interviews" ON candidate_interviews FOR SELECT TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod', 'company_md'));
CREATE POLICY "Manage Candidate Interviews" ON candidate_interviews FOR ALL TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod'));
CREATE POLICY "Interviewers Update Own Interviews" ON candidate_interviews FOR UPDATE TO authenticated
    USING (
        interviewer_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
    );
;
