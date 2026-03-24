
-- M6 FIX: Server-side geo-fence validation for attendance clock-in
-- This function validates that the guard is within the geo-fence radius
-- of their assigned check-in location when clocking in.
-- It uses the existing check_geofence() function for distance calculation.

CREATE OR REPLACE FUNCTION validate_clock_in_geofence()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_location RECORD;
BEGIN
  -- Only validate on INSERT (clock-in), not UPDATE (clock-out)
  -- Skip if no check-in coordinates provided (fallback for legacy/admin entries)
  IF NEW.check_in_latitude IS NULL OR NEW.check_in_longitude IS NULL THEN
    RETURN NEW;
  END IF;

  -- Skip if no check-in location specified
  IF NEW.check_in_location_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the location's geo-fence parameters
  SELECT latitude, longitude, geo_fence_radius
  INTO v_location
  FROM company_locations
  WHERE id = NEW.check_in_location_id;

  -- If location not found or no coordinates, allow (graceful fallback)
  IF v_location IS NULL OR v_location.latitude IS NULL OR v_location.longitude IS NULL THEN
    RETURN NEW;
  END IF;

  -- Use existing check_geofence function to validate distance
  -- Default radius to 100m if not configured (generous server-side limit)
  IF NOT check_geofence(
    NEW.check_in_latitude::double precision,
    NEW.check_in_longitude::double precision,
    v_location.latitude::double precision,
    v_location.longitude::double precision,
    COALESCE(v_location.geo_fence_radius::double precision, 100.0)
  ) THEN
    RAISE EXCEPTION 'Clock-in rejected: You are outside the geo-fence boundary for this location. Please move closer to your assigned location.';
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on attendance_logs table
DROP TRIGGER IF EXISTS trg_validate_clock_in_geofence ON attendance_logs;

CREATE TRIGGER trg_validate_clock_in_geofence
  BEFORE INSERT ON attendance_logs
  FOR EACH ROW
  EXECUTE FUNCTION validate_clock_in_geofence();

COMMENT ON FUNCTION validate_clock_in_geofence() IS 
  'Server-side geo-fence enforcement for attendance clock-in. Prevents bypassing client-side geo-fence checks via DevTools or direct API calls.';
;
