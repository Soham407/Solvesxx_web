-- ============================================================
-- Phase E: Finance Enhancements - Financial Closure & Budgeting
-- ============================================================

-- ============================================
-- 1. ENUMS
-- ============================================

DO $$ BEGIN
    CREATE TYPE financial_period_type AS ENUM ('monthly', 'quarterly', 'yearly');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE financial_period_status AS ENUM ('open', 'closing', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE budget_status AS ENUM ('draft', 'active', 'exhausted', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 2. SEQUENCES
-- ============================================

CREATE SEQUENCE IF NOT EXISTS budget_seq START 1;

-- ============================================
-- 3. FINANCIAL PERIODS
-- Tracks accounting periods for monthly/quarterly closing
-- ============================================

CREATE TABLE IF NOT EXISTS financial_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period_name VARCHAR(50) NOT NULL,                 -- e.g. "February 2026"
    period_type financial_period_type NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status financial_period_status DEFAULT 'open' NOT NULL,
    
    -- Closing Details
    closed_at TIMESTAMP WITH TIME ZONE,
    closed_by UUID REFERENCES auth.users(id),
    closing_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT date_range_check CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_financial_periods_status ON financial_periods(status);
CREATE INDEX IF NOT EXISTS idx_financial_periods_dates ON financial_periods(start_date, end_date);

-- ============================================
-- 4. BUDGETS
-- Monthly/Quarterly budget allocation
-- ============================================

CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_code VARCHAR(20) UNIQUE,                   -- BGT-2026-001
    name VARCHAR(100) NOT NULL,                       -- e.g. "IT Procurement Q1"
    
    -- Scope
    department VARCHAR(100),                          -- e.g. "Security", "Operations"
    category VARCHAR(100),                            -- e.g. "Hardware", "Consumables"
    
    -- Period
    financial_period_id UUID REFERENCES financial_periods(id) NOT NULL,
    
    -- Amounts (base currency)
    allocated_amount DECIMAL(15, 2) NOT NULL,
    used_amount DECIMAL(15, 2) DEFAULT 0,
    remaining_amount DECIMAL(15, 2) GENERATED ALWAYS AS (allocated_amount - used_amount) STORED,
    
    -- Thresholds for Alerts
    alert_threshold_percent INTEGER DEFAULT 90,       -- e.g. 90% usage
    alert_notified_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status budget_status DEFAULT 'draft' NOT NULL,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(financial_period_id);
CREATE INDEX IF NOT EXISTS idx_budgets_status ON budgets(status);
CREATE INDEX IF NOT EXISTS idx_budgets_dept_cat ON budgets(department, category);

-- ============================================
-- 5. FINANCIAL CLOSER WORKFLOW
-- ============================================

-- Function to check if a date falls within a closed period
CREATE OR REPLACE FUNCTION is_period_closed(p_date DATE)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM financial_periods
        WHERE p_date BETWEEN start_date AND end_date
        AND status = 'closed'
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Trigger to prevent modifications in closed periods
CREATE OR REPLACE FUNCTION check_finance_closure()
RETURNS TRIGGER AS $$
DECLARE
    v_target_date DATE;
BEGIN
    -- Determine target date based on table
    IF TG_TABLE_NAME = 'purchase_bills' THEN v_target_date := NEW.bill_date;
    ELSIF TG_TABLE_NAME = 'sale_bills' THEN v_target_date := NEW.bill_date;
    ELSIF TG_TABLE_NAME = 'payments' THEN v_target_date := NEW.payment_date;
    ELSIF TG_TABLE_NAME = 'ledger_entries' THEN v_target_date := NEW.entry_date;
    ELSE v_target_date := CURRENT_DATE;
    END IF;

    IF is_period_closed(v_target_date) THEN
        RAISE EXCEPTION 'Financial period for % is closed. Modifications not allowed.', v_target_date;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply closure protection to finance tables (if they exist)
DO $$
BEGIN
    -- Purchase Bills
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_bills') THEN
        DROP TRIGGER IF EXISTS trigger_check_purchase_bills_closure ON purchase_bills;
        CREATE TRIGGER trigger_check_purchase_bills_closure
        BEFORE INSERT OR UPDATE OR DELETE ON purchase_bills
        FOR EACH ROW EXECUTE FUNCTION check_finance_closure();
    END IF;

    -- Sale Bills
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sale_bills') THEN
        DROP TRIGGER IF EXISTS trigger_check_sale_bills_closure ON sale_bills;
        CREATE TRIGGER trigger_check_sale_bills_closure
        BEFORE INSERT OR UPDATE OR DELETE ON sale_bills
        FOR EACH ROW EXECUTE FUNCTION check_finance_closure();
    END IF;

    -- Payments
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        DROP TRIGGER IF EXISTS trigger_check_payments_closure ON payments;
        CREATE TRIGGER trigger_check_payments_closure
        BEFORE INSERT OR UPDATE OR DELETE ON payments
        FOR EACH ROW EXECUTE FUNCTION check_finance_closure();
    END IF;
END $$;

-- ============================================
-- 6. AUTOMATED FINANCIAL ALERTS
-- ============================================

-- 6.1 Budget Threshold Alert Trigger
CREATE OR REPLACE FUNCTION check_budget_threshold()
RETURNS TRIGGER AS $$
DECLARE
    v_budget RECORD;
    v_usage_percent DECIMAL;
BEGIN
    -- Find relevant budget (linking logic might vary, here we use department/category)
    -- In a real system, we'd link bills to budgets explicitly.
    -- For now, let's assume we link via budget_id in purchase_bills (we should add this column).
    
    -- Get budget
    SELECT * INTO v_budget FROM budgets WHERE id = NEW.budget_id;
    
    IF v_budget IS NOT NULL THEN
        v_usage_percent := (v_budget.used_amount / v_budget.allocated_amount) * 100;
        
        IF v_usage_percent >= v_budget.alert_threshold_percent AND v_budget.alert_notified_at IS NULL THEN
            -- Create notification
            INSERT INTO notifications (
                user_id,
                notification_type,
                title,
                message,
                reference_type,
                reference_id,
                priority
            )
            SELECT 
                u.id,
                'budget_threshold_alert',
                'Budget Threshold Reached',
                format('Budget "%s" has reached %s%% of its limit.', v_budget.name, ROUND(v_usage_percent, 2)),
                'budget',
                v_budget.id,
                'high'
            FROM users u
            JOIN user_roles ur ON u.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE r.role_name IN ('admin', 'account', 'company_md');
            
            -- Update budget notified status
            UPDATE budgets SET alert_notified_at = NOW() WHERE id = v_budget.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6.2 Overdue Payment Alert (to be run periodically or on bill submission/update)
CREATE OR REPLACE FUNCTION process_overdue_alerts()
RETURNS void AS $$
BEGIN
    -- Overdue Purchase Bills
    INSERT INTO notifications (
        user_id,
        notification_type,
        title,
        message,
        reference_type,
        reference_id,
        priority
    )
    SELECT 
        u.id,
        'overdue_payment_alert',
        'Overdue Vendor Payment',
        format('Bill %s for supplier %s is overdue since %s.', pb.bill_number, s.supplier_name, pb.due_date),
        'purchase_bill',
        pb.id,
        'high'
    FROM purchase_bills pb
    JOIN suppliers s ON pb.supplier_id = s.id
    CROSS JOIN LATERAL (
        SELECT u.id FROM users u 
        JOIN user_roles ur ON u.id = ur.user_id
        JOIN roles r ON ur.role_id = r.id
        WHERE r.role_name IN ('admin', 'account')
    ) u
    WHERE pb.payment_status != 'paid' 
    AND pb.due_date < CURRENT_DATE
    AND NOT EXISTS (
        SELECT 1 FROM notifications n 
        WHERE n.reference_id = pb.id 
        AND n.notification_type = 'overdue_payment_alert'
        AND n.created_at > CURRENT_DATE - INTERVAL '7 days' -- Alert once a week
    );

    -- Overdue Sale Bills (Buyer Invoices)
    INSERT INTO notifications (
        user_id,
        notification_type,
        title,
        message,
        reference_type,
        reference_id,
        priority
    )
    SELECT 
        u.id,
        'overdue_collection_alert',
        'Overdue Buyer Payment',
        format('Invoice %s is overdue since %s.', sb.bill_number, sb.due_date),
        'sale_bill',
        sb.id,
        'high'
    FROM sale_bills sb
    CROSS JOIN LATERAL (
        SELECT u.id FROM users u 
        JOIN user_roles ur ON u.id = ur.user_id
        JOIN roles r ON ur.role_id = r.id
        WHERE r.role_name IN ('admin', 'account')
    ) u
    WHERE sb.payment_status != 'paid' 
    AND sb.due_date < CURRENT_DATE
    AND NOT EXISTS (
        SELECT 1 FROM notifications n 
        WHERE n.reference_id = sb.id 
        AND n.notification_type = 'overdue_collection_alert'
        AND n.created_at > CURRENT_DATE - INTERVAL '7 days'
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. SCHEMA ADJUSTMENTS
-- ============================================

-- Add budget_id to purchase_bills if it doesn't exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_bills') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_bills' AND column_name = 'budget_id') THEN
            ALTER TABLE purchase_bills ADD COLUMN budget_id UUID REFERENCES budgets(id);
        END IF;
    END IF;
END $$;

-- Trigger for budget usage update
CREATE OR REPLACE FUNCTION update_budget_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.budget_id IS NOT NULL THEN
        UPDATE budgets 
        SET used_amount = used_amount + NEW.total_amount,
            updated_at = NOW()
        WHERE id = NEW.budget_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_bills') THEN
        DROP TRIGGER IF EXISTS trigger_update_budget_usage ON purchase_bills;
        CREATE TRIGGER trigger_update_budget_usage
        AFTER INSERT ON purchase_bills
        FOR EACH ROW EXECUTE FUNCTION update_budget_usage();
        
        DROP TRIGGER IF EXISTS trigger_check_budget_threshold ON purchase_bills;
        CREATE TRIGGER trigger_check_budget_threshold
        AFTER INSERT ON purchase_bills
        FOR EACH ROW EXECUTE FUNCTION check_budget_threshold();
    END IF;
END $$;

-- ============================================
-- 8. RLS POLICIES
-- ============================================

ALTER TABLE financial_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Financial periods viewable by finance/admin"
    ON financial_periods FOR SELECT
    TO authenticated
    USING (get_user_role() IN ('admin', 'account', 'company_md'));

CREATE POLICY "Financial periods manageable by admin"
    ON financial_periods FOR ALL
    TO authenticated
    USING (get_user_role() = 'admin');

CREATE POLICY "Budgets viewable by relevant roles"
    ON budgets FOR SELECT
    TO authenticated
    USING (get_user_role() IN ('admin', 'account', 'company_hod', 'company_md'));

CREATE POLICY "Budgets manageable by finance/admin"
    ON budgets FOR ALL
    TO authenticated
    USING (get_user_role() IN ('admin', 'account'));

-- ============================================
-- 9. HELPER FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION generate_budget_code()
RETURNS TRIGGER AS $$
BEGIN
    NEW.budget_code := 'BGT-' || TO_CHAR(now(), 'YYYY') || '-' || 
        LPAD(nextval('budget_seq')::TEXT, 3, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_budget_code
    BEFORE INSERT ON budgets
    FOR EACH ROW
    WHEN (NEW.budget_code IS NULL)
    EXECUTE FUNCTION generate_budget_code();
;
