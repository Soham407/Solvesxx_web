-- Phase 5: Financial Scale & Production Hardening
-- Payment Gateway Integration Migration

-- ============================================
-- 1. ENUMS & TYPES
-- ============================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_gateway') THEN
        CREATE TYPE payment_gateway AS ENUM ('razorpay', 'stripe', 'paypal', 'manual');
    END IF;
END $$;

-- ============================================
-- 2. PAYMENT METHODS
-- ============================================
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    method_name VARCHAR(50) UNIQUE NOT NULL, 
    gateway payment_gateway DEFAULT 'manual',
    is_active BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO payment_methods (method_name, gateway)
VALUES 
('Razorpay Online', 'razorpay'),
('Cash', 'manual'),
('Bank Transfer', 'manual')
ON CONFLICT (method_name) DO NOTHING;

-- ============================================
-- 3. PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_number VARCHAR(50) UNIQUE,
    payment_type VARCHAR(20) NOT NULL,
    reference_type VARCHAR(50) NOT NULL,
    reference_id UUID,
    payer_type VARCHAR(50), 
    payer_id UUID,
    payee_type VARCHAR(50), 
    payee_id UUID,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method_id UUID REFERENCES payment_methods(id),
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    external_id VARCHAR(100),
    gateway_log JSONB DEFAULT '{}'::jsonb,
    failure_reason TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    processed_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_payments_external_id ON payments(external_id);

CREATE SEQUENCE IF NOT EXISTS payment_num_seq;

CREATE OR REPLACE FUNCTION generate_payment_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_number IS NULL THEN
        NEW.payment_number := 'PAY-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(nextval('payment_num_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_payment_number ON payments;
CREATE TRIGGER trigger_generate_payment_number
BEFORE INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION generate_payment_number();

-- ============================================
-- 4. MODIFY BILLS TABLES
-- ============================================

DO $$ BEGIN
    ALTER TABLE purchase_bills ADD COLUMN external_id VARCHAR(100);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE purchase_bills ADD COLUMN gateway_log JSONB DEFAULT '{}'::jsonb;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE purchase_bills ADD COLUMN failure_reason TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE sale_bills ADD COLUMN external_id VARCHAR(100);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE sale_bills ADD COLUMN gateway_log JSONB DEFAULT '{}'::jsonb;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE sale_bills ADD COLUMN failure_reason TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============================================
-- 5. RATE LIMITING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS login_rate_limits (
    ip_address INET PRIMARY KEY,
    attempt_count INTEGER DEFAULT 1,
    first_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    blocked_until TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 6. RLS POLICIES
-- ============================================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_rate_limits ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Finance can view all payments') THEN
        CREATE POLICY "Finance can view all payments" ON payments FOR SELECT TO authenticated USING (get_user_role() IN ('admin', 'account', 'company_md'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Finance can manage payments') THEN
        CREATE POLICY "Finance can manage payments" ON payments FOR ALL TO authenticated USING (get_user_role() IN ('admin', 'account'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'All authenticated can view payment methods') THEN
        CREATE POLICY "All authenticated can view payment methods" ON payment_methods FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

-- ============================================
-- 7. NOTIFICATION INTEGRATION
-- ============================================
CREATE OR REPLACE FUNCTION notify_payment_failure()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'failed' AND (OLD.status IS NULL OR OLD.status != 'failed') THEN
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
            'payment_failure_alert',
            'Payment Failed',
            format('Payment %s of %s failed: %s', NEW.payment_number, NEW.amount, NEW.failure_reason),
            'payment',
            NEW.id,
            'high'
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE r.role_name::text IN ('admin', 'account');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_payment_failure ON payments;
CREATE TRIGGER trigger_notify_payment_failure
AFTER UPDATE OF status ON payments
FOR EACH ROW
EXECUTE FUNCTION notify_payment_failure();
;
