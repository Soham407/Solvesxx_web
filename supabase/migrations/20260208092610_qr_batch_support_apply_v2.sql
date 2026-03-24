-- QR Batch Generation Support Tables
-- Add these columns and tables to support bulk QR code generation

-- ============================================
-- 1. Update qr_codes table with batch support
-- ============================================

-- Add columns if they don't exist
DO $$
BEGIN
    -- Add batch_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'qr_codes' AND column_name = 'batch_id'
    ) THEN
        ALTER TABLE qr_codes ADD COLUMN batch_id TEXT;
    END IF;

    -- Add sequence_number column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'qr_codes' AND column_name = 'sequence_number'
    ) THEN
        ALTER TABLE qr_codes ADD COLUMN sequence_number INTEGER;
    END IF;

    -- Add is_linked column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'qr_codes' AND column_name = 'is_linked'
    ) THEN
        ALTER TABLE qr_codes ADD COLUMN is_linked BOOLEAN DEFAULT false;
    END IF;

    -- Add warehouse_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'qr_codes' AND column_name = 'warehouse_id'
    ) THEN
        ALTER TABLE qr_codes ADD COLUMN warehouse_id UUID REFERENCES warehouses(id);
    END IF;
END $$;

-- Create index on batch_id
CREATE INDEX IF NOT EXISTS idx_qr_codes_batch_id ON qr_codes(batch_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_sequence ON qr_codes(sequence_number);
CREATE INDEX IF NOT EXISTS idx_qr_codes_is_linked ON qr_codes(is_linked);

-- ============================================
-- 2. Create qr_batch_logs table
-- ============================================

CREATE TABLE IF NOT EXISTS qr_batch_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_id TEXT NOT NULL UNIQUE,
    society_id UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
    count INTEGER NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    generated_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    notes TEXT,
    downloaded_at TIMESTAMPTZ,
    download_count INTEGER DEFAULT 0
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_qr_batch_logs_society ON qr_batch_logs(society_id);
CREATE INDEX IF NOT EXISTS idx_qr_batch_logs_batch_id ON qr_batch_logs(batch_id);
CREATE INDEX IF NOT EXISTS idx_qr_batch_logs_generated_at ON qr_batch_logs(generated_at);

-- Enable RLS
ALTER TABLE qr_batch_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Since 'role' doesn't exist on employees, and we are using auth.users for checks usually,
-- we'll allow all authenticated users for now or check against the user role in the users table.
CREATE POLICY "Allow authenticated users to manage batch logs"
    ON qr_batch_logs
    FOR ALL
    TO authenticated
    USING (true);

-- ============================================
-- 3. Create function to update QR code link status
-- ============================================

CREATE OR REPLACE FUNCTION update_qr_link_status()
RETURNS TRIGGER AS $$
BEGIN
    -- When asset_id is set, mark as linked
    IF NEW.asset_id IS NOT NULL AND (OLD.asset_id IS NULL OR OLD.asset_id != NEW.asset_id) THEN
        NEW.is_linked = true;
    
    -- When asset_id is removed, mark as unlinked
    ELSIF NEW.asset_id IS NULL AND OLD.asset_id IS NOT NULL THEN
        NEW.is_linked = false;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_update_qr_link_status ON qr_codes;

-- Create trigger
CREATE TRIGGER trg_update_qr_link_status
    BEFORE INSERT OR UPDATE ON qr_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_qr_link_status();

-- ============================================
-- 4. Create view for QR codes with batch info
-- ============================================

CREATE OR REPLACE VIEW qr_codes_with_batch_info AS
SELECT 
    qc.*,
    qb.generated_at as batch_generated_at,
    qb.generated_by as batch_generated_by,
    COALESCE(e.first_name || ' ' || e.last_name, 'Unknown') as generated_by_name,
    qb.count as batch_count,
    a.name as linked_asset_name,
    a.asset_code as linked_asset_tag,
    w.warehouse_name
FROM qr_codes qc
LEFT JOIN qr_batch_logs qb ON qc.batch_id = qb.batch_id
LEFT JOIN employees e ON qb.generated_by = e.id
LEFT JOIN assets a ON qc.asset_id = a.id
LEFT JOIN warehouses w ON qc.warehouse_id = w.id;

-- Grant permissions
GRANT SELECT ON qr_codes_with_batch_info TO authenticated;

-- ============================================
-- 5. Create function to get unlinked QR codes
-- ============================================

CREATE OR REPLACE FUNCTION get_unlinked_qr_codes(p_society_id UUID, p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
    id UUID,
    batch_id TEXT,
    sequence_number INTEGER,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        qc.id,
        qc.batch_id,
        qc.sequence_number,
        qc.created_at
    FROM qr_codes qc
    WHERE qc.society_id = p_society_id
    AND qc.is_linked = false
    AND qc.is_active = true
    ORDER BY qc.batch_id, qc.sequence_number
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_unlinked_qr_codes(UUID, INTEGER) TO authenticated;

-- ============================================
-- 6. Create function to get batch statistics
-- ============================================

CREATE OR REPLACE FUNCTION get_qr_batch_statistics(p_society_id UUID)
RETURNS TABLE (
    total_qr_codes BIGINT,
    linked_qr_codes BIGINT,
    unlinked_qr_codes BIGINT,
    total_batches BIGINT,
    latest_batch_date TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_qr_codes,
        COUNT(*) FILTER (WHERE is_linked = true)::BIGINT as linked_qr_codes,
        COUNT(*) FILTER (WHERE is_linked = false)::BIGINT as unlinked_qr_codes,
        COUNT(DISTINCT batch_id)::BIGINT as total_batches,
        MAX(created_at) as latest_batch_date
    FROM qr_codes
    WHERE society_id = p_society_id
    AND is_active = true;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_qr_batch_statistics(UUID) TO authenticated;
;
