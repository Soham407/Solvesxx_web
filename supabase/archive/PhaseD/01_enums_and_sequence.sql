-- ============================================================
-- Phase D: Supply Chain Core - Part 1: ENUMs and Sequences
-- ============================================================
-- Description: Creates supplier-related enums and code generation sequence
-- Dependencies: None
-- ============================================================

-- Create supplier_status enum
DO $$ BEGIN
  CREATE TYPE supplier_status AS ENUM (
    'active',
    'inactive',
    'blacklisted',
    'pending_verification'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create supplier_type enum
DO $$ BEGIN
  CREATE TYPE supplier_type AS ENUM (
    'manufacturer',
    'distributor',
    'wholesaler',
    'retailer',
    'service_provider'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create sequence for supplier code generation
CREATE SEQUENCE IF NOT EXISTS supplier_seq START WITH 1 INCREMENT BY 1;

-- Create trigger function for auto-generating supplier code
CREATE OR REPLACE FUNCTION generate_supplier_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.supplier_code IS NULL OR NEW.supplier_code = '' THEN
    NEW.supplier_code := 'SUP-' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || '-' || LPAD(nextval('supplier_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Comments
COMMENT ON TYPE supplier_status IS 'Status of a supplier in the system';
COMMENT ON TYPE supplier_type IS 'Type/category of supplier business';
COMMENT ON FUNCTION generate_supplier_code() IS 'Auto-generates supplier code in format SUP-YYYY-NNNN';
