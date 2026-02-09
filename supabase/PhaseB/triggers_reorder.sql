-- Automated Reorder Triggers for Phase B
-- These triggers automatically create reorder alerts when stock falls below reorder level

-- ============================================
-- TRIGGER 1: Check reorder on stock batch insert/update
-- ============================================

CREATE OR REPLACE FUNCTION check_reorder_after_stock_change()
RETURNS TRIGGER AS $$
DECLARE
    v_product_id UUID;
    v_warehouse_id UUID;
    v_total_quantity NUMERIC;
    v_reorder_level NUMERIC;
    v_product_name TEXT;
    v_warehouse_name TEXT;
BEGIN
    -- Determine which stock batch was affected
    IF TG_OP = 'DELETE' THEN
        v_product_id := OLD.product_id;
        v_warehouse_id := OLD.warehouse_id;
    ELSE
        v_product_id := NEW.product_id;
        v_warehouse_id := NEW.warehouse_id;
    END IF;

    -- Get product and warehouse details
    SELECT p.product_name INTO v_product_name
    FROM products p
    WHERE p.id = v_product_id;

    SELECT w.warehouse_name INTO v_warehouse_name
    FROM warehouses w
    WHERE w.id = v_warehouse_id;

    -- Calculate total quantity for this product in this warehouse
    SELECT COALESCE(SUM(quantity), 0)
    INTO v_total_quantity
    FROM stock_batches
    WHERE product_id = v_product_id
    AND warehouse_id = v_warehouse_id
    AND status = 'active';

    -- Get reorder level from reorder_rules or default to 10
    SELECT COALESCE(reorder_level, 10)
    INTO v_reorder_level
    FROM reorder_rules
    WHERE product_id = v_product_id
    AND is_active = true
    ORDER BY created_at DESC
    LIMIT 1;

    -- If no reorder rule exists, use default
    IF v_reorder_level IS NULL THEN
        v_reorder_level := 10;
    END IF;

    -- Insert or update reorder alert if stock is low
    IF v_total_quantity <= v_reorder_level THEN
        INSERT INTO reorder_alerts (
            product_id,
            warehouse_id,
            current_stock,
            reorder_level,
            alert_type,
            status,
            created_at
        )
        VALUES (
            v_product_id,
            v_warehouse_id,
            v_total_quantity,
            v_reorder_level,
            CASE 
                WHEN v_total_quantity = 0 THEN 'out_of_stock'
                ELSE 'low_stock'
            END,
            'active',
            NOW()
        )
        ON CONFLICT (product_id, warehouse_id, status) 
        DO UPDATE SET
            current_stock = EXCLUDED.current_stock,
            alert_type = EXCLUDED.alert_type,
            updated_at = NOW();

        -- Log the alert creation
        RAISE NOTICE 'Reorder alert created/updated for % at %: % units (reorder level: %)',
            v_product_name, v_warehouse_name, v_total_quantity, v_reorder_level;
    ELSE
        -- If stock is now above reorder level, close any active alerts
        UPDATE reorder_alerts
        SET status = 'resolved',
            resolved_at = NOW(),
            resolution_notes = 'Stock level restored'
        WHERE product_id = v_product_id
        AND warehouse_id = v_warehouse_id
        AND status = 'active';
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_check_reorder_on_stock_change ON stock_batches;

-- Create trigger for stock batch changes
CREATE TRIGGER trg_check_reorder_on_stock_change
    AFTER INSERT OR UPDATE OR DELETE ON stock_batches
    FOR EACH ROW
    EXECUTE FUNCTION check_reorder_after_stock_change();

-- ============================================
-- TRIGGER 2: Create reorder_alerts table if not exists
-- ============================================

CREATE TABLE IF NOT EXISTS reorder_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    current_stock NUMERIC NOT NULL DEFAULT 0,
    reorder_level NUMERIC NOT NULL DEFAULT 0,
    suggested_order_quantity NUMERIC,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'cancelled')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES employees(id),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    purchase_order_id UUID,
    UNIQUE(product_id, warehouse_id, status)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reorder_alerts_status ON reorder_alerts(status);
CREATE INDEX IF NOT EXISTS idx_reorder_alerts_product ON reorder_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_reorder_alerts_warehouse ON reorder_alerts(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_reorder_alerts_type ON reorder_alerts(alert_type);

-- Enable RLS on reorder_alerts
ALTER TABLE reorder_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow admins to manage reorder alerts"
    ON reorder_alerts
    FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM employees e
        WHERE e.auth_user_id = auth.uid()
        AND e.role IN ('admin', 'hod', 'society_manager')
    ));

CREATE POLICY "Allow users to view reorder alerts"
    ON reorder_alerts
    FOR SELECT
    TO authenticated
    USING (true);

-- ============================================
-- TRIGGER 3: Auto-update priority based on stock level
-- ============================================

CREATE OR REPLACE FUNCTION update_reorder_alert_priority()
RETURNS TRIGGER AS $$
BEGIN
    -- Set priority based on stock level
    IF NEW.current_stock = 0 THEN
        NEW.priority := 'critical';
    ELSIF NEW.current_stock <= NEW.reorder_level * 0.5 THEN
        NEW.priority := 'high';
    ELSIF NEW.current_stock <= NEW.reorder_level THEN
        NEW.priority := 'medium';
    ELSE
        NEW.priority := 'low';
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_update_alert_priority ON reorder_alerts;

-- Create trigger for priority updates
CREATE TRIGGER trg_update_alert_priority
    BEFORE INSERT OR UPDATE ON reorder_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_reorder_alert_priority();

-- ============================================
-- TRIGGER 4: Update updated_at timestamp
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_reorder_alerts_updated_at ON reorder_alerts;

-- Create trigger for updated_at
CREATE TRIGGER trg_reorder_alerts_updated_at
    BEFORE UPDATE ON reorder_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEW: Reorder alerts with product details
-- ============================================

CREATE OR REPLACE VIEW reorder_alerts_with_details AS
SELECT 
    ra.id,
    ra.product_id,
    p.product_name,
    p.product_code,
    ra.warehouse_id,
    w.warehouse_name,
    ra.current_stock,
    ra.reorder_level,
    ra.suggested_order_quantity,
    ra.alert_type,
    ra.status,
    ra.priority,
    ra.created_at,
    ra.updated_at,
    ra.acknowledged_at,
    COALESCE(e.full_name, 'Unknown') as acknowledged_by_name,
    ra.resolved_at,
    ra.resolution_notes,
    ra.purchase_order_id,
    -- Calculate suggested quantity if not set
    COALESCE(
        ra.suggested_order_quantity,
        GREATEST(ra.reorder_level * 2 - ra.current_stock, 10)
    ) as calculated_suggested_qty,
    -- Days since alert created
    EXTRACT(DAY FROM (NOW() - ra.created_at)) as days_open
FROM reorder_alerts ra
LEFT JOIN products p ON ra.product_id = p.id
LEFT JOIN warehouses w ON ra.warehouse_id = w.id
LEFT JOIN employees e ON ra.acknowledged_by = e.id;

-- ============================================
-- FUNCTION: Get critical reorder summary
-- ============================================

CREATE OR REPLACE FUNCTION get_critical_reorder_summary()
RETURNS TABLE (
    total_alerts BIGINT,
    critical_count BIGINT,
    high_count BIGINT,
    out_of_stock_count BIGINT,
    low_stock_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_alerts,
        COUNT(*) FILTER (WHERE priority = 'critical')::BIGINT as critical_count,
        COUNT(*) FILTER (WHERE priority = 'high')::BIGINT as high_count,
        COUNT(*) FILTER (WHERE alert_type = 'out_of_stock')::BIGINT as out_of_stock_count,
        COUNT(*) FILTER (WHERE alert_type = 'low_stock')::BIGIT as low_stock_count
    FROM reorder_alerts
    WHERE status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON reorder_alerts_with_details TO authenticated;
GRANT EXECUTE ON FUNCTION get_critical_reorder_summary() TO authenticated;

-- ============================================
-- INITIALIZATION: Process existing stock to create initial alerts
-- ============================================

-- This will trigger the reorder check for all existing stock batches
-- Uncomment the following line to run on initial setup:
-- SELECT check_reorder_after_stock_change();

COMMENT ON TABLE reorder_alerts IS 'Automated alerts for inventory reordering based on stock levels';
COMMENT ON FUNCTION check_reorder_after_stock_change() IS 'Automatically creates or updates reorder alerts when stock changes';
