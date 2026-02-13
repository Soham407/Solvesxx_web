-- Phase 5: Financial Scale & Production Hardening
-- Payment Gateway Integration Migration

-- ============================================
-- 1. ENUMS & TYPES
-- ============================================
DO $$ BEGIN
    CREATE TYPE payment_gateway AS ENUM ('razorpay', 'stripe', 'paypal', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 2. PAYMENT METHODS
-- ============================================
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    method_name VARCHAR(50) UNIQUE NOT NULL, -- e.g. "Razorpay", "Stripe", "Cash", "Bank Transfer"
    gateway payment_gateway DEFAULT 'manual',
    is_active BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}'::jsonb, -- Store gateway specific config if needed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed basic methods
INSERT INTO payment_methods (method_name, gateway)
VALUES 
('Razorpay Online', 'razorpay'),
('Cash', 'manual'),
('Bank Transfer', 'manual')
ON CONFLICT (method_name) DO NOTHING;

-- ============================================
-- 3. PAYMENTS TABLE
-- Tracks actual cash flow independent of bills
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_number VARCHAR(50) UNIQUE,
    payment_type VARCHAR(20) NOT NULL, -- 'purchase' (payout), 'sale' (collection)
    
    -- Mapping to bills
    reference_type VARCHAR(50) NOT NULL, -- 'purchase_bill', 'sale_bill', 'manual'
    reference_id UUID,                   -- Optional if manual
    
    -- Parties
    payer_type VARCHAR(50),              -- 'buyer', 'company'
    payer_id UUID,                       -- References buyers.id or company_id
    payee_type VARCHAR(50),              -- 'supplier', 'company'
    payee_id UUID,                       -- References suppliers.id or company_id
    
    -- Details
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method_id UUID REFERENCES payment_methods(id),
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    
    -- Gateway Integration
    external_id VARCHAR(100),            -- Gateway Payment ID / Transaction ID
    gateway_log JSONB DEFAULT '{}'::jsonb,
    failure_reason TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed, cancelled, refunded
    
    -- Metadata
    processed_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_payments_external_id ON payments(external_id);

-- Sequence and trigger for payment number
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
-- Add external tracking and gateway logs
-- ============================================

-- Purchase Bills (Vendor Payments)
DO $$ BEGIN
    ALTER TABLE purchase_bills ADD COLUMN external_id VARCHAR(100);
    ALTER TABLE purchase_bills ADD COLUMN gateway_log JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE purchase_bills ADD COLUMN failure_reason TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Sale Bills (Buyer Invoices)
DO $$ BEGIN
    ALTER TABLE sale_bills ADD COLUMN external_id VARCHAR(100);
    ALTER TABLE sale_bills ADD COLUMN gateway_log JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE sale_bills ADD COLUMN failure_reason TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============================================
-- 5. RATE LIMITING TABLE
-- For security hardening
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

-- Payments: Admin and Finance can see all
DROP POLICY IF EXISTS "Finance can view all payments" ON payments;
CREATE POLICY "Finance can view all payments" ON payments
FOR SELECT TO authenticated
USING (get_user_role() IN ('admin', 'account', 'company_md'));

-- Payments: Admin and Finance can manage
DROP POLICY IF EXISTS "Finance can manage payments" ON payments;
CREATE POLICY "Finance can manage payments" ON payments
FOR ALL TO authenticated
USING (get_user_role() IN ('admin', 'account'));

-- Payment Methods: Everyone authenticated can view
DROP POLICY IF EXISTS "All authenticated can view payment methods" ON payment_methods;
CREATE POLICY "All authenticated can view payment methods" ON payment_methods
FOR SELECT TO authenticated
USING (true);

-- ============================================
-- 7. NOTIFICATION INTEGRATION
-- Trigger notification on payment failure
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
