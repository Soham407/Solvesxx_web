-- =============================================================================
-- Migration: 20260331000001_service_deployment_indent_flow.sql
-- Purpose:   Complete the buyer -> admin -> supplier service deployment handoff
--            by storing service-specific request metadata and linking generated
--            indents to both the originating request and assigned supplier.
-- =============================================================================

ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS service_type TEXT,
  ADD COLUMN IF NOT EXISTS service_grade TEXT,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS site_location_id UUID REFERENCES public.company_locations(id);

ALTER TABLE public.indents
  ADD COLUMN IF NOT EXISTS service_request_id UUID REFERENCES public.requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_requests_service_type
  ON public.requests(service_type);

CREATE INDEX IF NOT EXISTS idx_requests_site_location_id
  ON public.requests(site_location_id);

CREATE INDEX IF NOT EXISTS idx_indents_service_request_id
  ON public.indents(service_request_id);

CREATE INDEX IF NOT EXISTS idx_indents_supplier_id
  ON public.indents(supplier_id);
