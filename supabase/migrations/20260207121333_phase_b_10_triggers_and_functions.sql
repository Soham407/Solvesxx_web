-- ============================================
-- PHASE B MIGRATION 10: TRIGGERS & FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_phase_b_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER trigger_assets_updated_at
    BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION update_phase_b_updated_at();

CREATE TRIGGER trigger_asset_categories_updated_at
    BEFORE UPDATE ON asset_categories
    FOR EACH ROW EXECUTE FUNCTION update_phase_b_updated_at();

CREATE TRIGGER trigger_maintenance_schedules_updated_at
    BEFORE UPDATE ON maintenance_schedules
    FOR EACH ROW EXECUTE FUNCTION update_phase_b_updated_at();

CREATE TRIGGER trigger_service_requests_updated_at
    BEFORE UPDATE ON service_requests
    FOR EACH ROW EXECUTE FUNCTION update_phase_b_updated_at();

CREATE TRIGGER trigger_job_sessions_updated_at
    BEFORE UPDATE ON job_sessions
    FOR EACH ROW EXECUTE FUNCTION update_phase_b_updated_at();

CREATE TRIGGER trigger_warehouses_updated_at
    BEFORE UPDATE ON warehouses
    FOR EACH ROW EXECUTE FUNCTION update_phase_b_updated_at();

CREATE TRIGGER trigger_stock_batches_updated_at
    BEFORE UPDATE ON stock_batches
    FOR EACH ROW EXECUTE FUNCTION update_phase_b_updated_at();

CREATE TRIGGER trigger_services_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_phase_b_updated_at();

-- Auto-generate service request number
CREATE OR REPLACE FUNCTION generate_service_request_number()
RETURNS TRIGGER AS $$
DECLARE
    next_number INTEGER;
    year_part TEXT;
BEGIN
    year_part := to_char(CURRENT_DATE, 'YYYY');
    
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(request_number FROM 'SR-' || year_part || '-(\d+)') AS INTEGER)
    ), 0) + 1
    INTO next_number
    FROM service_requests
    WHERE request_number LIKE 'SR-' || year_part || '-%';
    
    NEW.request_number := 'SR-' || year_part || '-' || LPAD(next_number::TEXT, 5, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_service_request_number
    BEFORE INSERT ON service_requests
    FOR EACH ROW
    WHEN (NEW.request_number IS NULL)
    EXECUTE FUNCTION generate_service_request_number();

-- Auto-generate asset code
CREATE OR REPLACE FUNCTION generate_asset_code()
RETURNS TRIGGER AS $$
DECLARE
    next_number INTEGER;
BEGIN
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(asset_code FROM 'AST-(\d+)') AS INTEGER)
    ), 0) + 1
    INTO next_number
    FROM assets;
    
    NEW.asset_code := 'AST-' || LPAD(next_number::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_asset_code
    BEFORE INSERT ON assets
    FOR EACH ROW
    WHEN (NEW.asset_code IS NULL)
    EXECUTE FUNCTION generate_asset_code();

-- Auto-create QR code when asset is created
CREATE OR REPLACE FUNCTION create_qr_for_asset()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO qr_codes (asset_id, society_id, claimed_by, claimed_at, created_by)
    VALUES (NEW.id, NEW.society_id, NEW.created_by, CURRENT_TIMESTAMP, NEW.created_by);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_qr_for_asset
    AFTER INSERT ON assets
    FOR EACH ROW EXECUTE FUNCTION create_qr_for_asset();

-- Deduct stock when materials used
CREATE OR REPLACE FUNCTION deduct_stock_on_material_use()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.stock_batch_id IS NOT NULL THEN
        UPDATE stock_batches
        SET current_quantity = current_quantity - NEW.quantity,
            status = CASE 
                WHEN current_quantity - NEW.quantity <= 0 THEN 'depleted'
                ELSE status
            END
        WHERE id = NEW.stock_batch_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deduct_stock
    AFTER INSERT ON job_materials_used
    FOR EACH ROW EXECUTE FUNCTION deduct_stock_on_material_use();;
