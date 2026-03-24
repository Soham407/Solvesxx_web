-- =============================================================================
-- Migration: 20260324000003_seed_gate_location.sql
-- Purpose:   Insert the GATE-01 company location required by useAttendance hook.
--            Without this row, gateLocation is null and clockIn() fails with
--            "Location requirements not met" regardless of the guard's GPS.
--            geo_fence_radius = 9999 m gives a ~10km radius around the gate.
--            Coordinates: 18.518478710877552, 73.8532587138435 (Pune, IN).
-- =============================================================================

INSERT INTO public.company_locations (
  location_code,
  location_name,
  location_type,
  latitude,
  longitude,
  geo_fence_radius,
  address,
  is_active
)
VALUES (
  'GATE-01',
  'Main Gate',
  'gate',
  18.518478710877552,
  73.8532587138435,
  9999,
  'Main Entrance',
  true
)
ON CONFLICT (location_code) DO UPDATE
  SET geo_fence_radius = EXCLUDED.geo_fence_radius,
      is_active        = true;
