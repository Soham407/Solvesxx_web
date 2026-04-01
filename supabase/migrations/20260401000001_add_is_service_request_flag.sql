-- =============================================================================
-- Migration: 20260401000001_add_is_service_request_flag.sql
-- Purpose:   Add explicit is_service_request boolean to requests table.
--            Replaces the field-presence heuristic in useSupplierPortal.ts
--            respondToIndent() that could misroute material requests carrying
--            site_location_id through the SPO path (Breaks 1 and 3).
-- =============================================================================

ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS is_service_request BOOLEAN NOT NULL DEFAULT false;

-- Backfill: any existing request that has a service_type set is a service request.
UPDATE public.requests
SET is_service_request = true
WHERE service_type IS NOT NULL AND service_type <> '';

-- Index to support efficient filtering of service vs material requests.
CREATE INDEX IF NOT EXISTS idx_requests_is_service_request
  ON public.requests (is_service_request);

COMMENT ON COLUMN public.requests.is_service_request IS
  'Explicit discriminator written at creation time. TRUE = service deployment '
  'request (routes through service_purchase_orders). FALSE = material/goods '
  'request (routes through purchase_orders via create_po_from_supplier_request). '
  'Do NOT infer request type from optional service fields after this migration.';
