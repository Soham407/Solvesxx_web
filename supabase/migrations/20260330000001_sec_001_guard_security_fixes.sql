-- ============================================
-- SEC-001: Guard / security hardening
-- Fixes panic alert resolution identity, guard geofence enforcement,
-- and stationary / inactive guard scheduling semantics.
-- ============================================

CREATE EXTENSION IF NOT EXISTS "pg_cron";

COMMENT ON COLUMN public.gps_tracking.employee_id IS
  'Stores security_guards.id values for guard GPS telemetry.';

DROP POLICY IF EXISTS "Supervisors can resolve panic alerts" ON public.panic_alerts;
CREATE POLICY "Supervisors can resolve panic alerts"
ON public.panic_alerts
FOR UPDATE
USING (
  has_role('admin')
  OR has_role('super_admin')
  OR has_role('security_supervisor')
  OR has_role('society_manager')
)
WITH CHECK (
  (
    has_role('admin')
    OR has_role('super_admin')
    OR has_role('security_supervisor')
    OR has_role('society_manager')
  )
  AND (
    resolved_by IS NULL
    OR resolved_by = get_employee_id()
    OR has_role('admin')
    OR has_role('super_admin')
  )
);

DROP POLICY IF EXISTS "Admins can manage all panic alerts" ON public.panic_alerts;
CREATE POLICY "Admins can manage all panic alerts"
ON public.panic_alerts
FOR ALL
USING (
  has_role('admin')
  OR has_role('super_admin')
)
WITH CHECK (
  has_role('admin')
  OR has_role('super_admin')
);

CREATE OR REPLACE FUNCTION public.validate_clock_in_geofence()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Privileged/manual attendance corrections can still bypass GPS enforcement.
  IF NEW.check_in_latitude IS NULL OR NEW.check_in_longitude IS NULL THEN
    IF has_role('admin')
      OR has_role('super_admin')
      OR has_role('security_supervisor')
      OR has_role('society_manager')
      OR has_role('site_supervisor') THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION
      'Clock-in rejected: GPS coordinates are required to validate the geo-fence boundary.';
  END IF;

  IF NEW.check_in_location_id IS NULL THEN
    IF has_role('admin')
      OR has_role('super_admin')
      OR has_role('security_supervisor')
      OR has_role('society_manager')
      OR has_role('site_supervisor') THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION
      'Clock-in rejected: A check-in location is required for geo-fence validation.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.company_locations cl
    WHERE cl.id = NEW.check_in_location_id
      AND cl.latitude IS NOT NULL
      AND cl.longitude IS NOT NULL
  ) THEN
    RETURN NEW;
  END IF;

  IF NOT check_geofence(
    NEW.check_in_latitude::double precision,
    NEW.check_in_longitude::double precision,
    (
      SELECT cl.latitude::double precision
      FROM public.company_locations cl
      WHERE cl.id = NEW.check_in_location_id
    ),
    (
      SELECT cl.longitude::double precision
      FROM public.company_locations cl
      WHERE cl.id = NEW.check_in_location_id
    ),
    COALESCE(
      (
        SELECT cl.geo_fence_radius::double precision
        FROM public.company_locations cl
        WHERE cl.id = NEW.check_in_location_id
      ),
      100.0
    )
  ) THEN
    RAISE EXCEPTION
      'Clock-in rejected: You are outside the geo-fence boundary for this location. Please move closer to your assigned location.';
  END IF;

  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.detect_inactive_guards(INT);

CREATE FUNCTION public.detect_inactive_guards(p_threshold_minutes INT DEFAULT 15)
RETURNS TABLE (out_guard_id UUID, out_alert_created BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_alert_id UUID;
BEGIN
  FOR r IN
    SELECT
      sg.id AS guard_id,
      sg.employee_id,
      al.check_in_location_id,
      e.first_name || ' ' || e.last_name AS guard_name
    FROM public.attendance_logs al
    JOIN public.employees e ON al.employee_id = e.id
    JOIN public.security_guards sg ON e.id = sg.employee_id
    WHERE al.check_out_time IS NULL
      AND al.log_date = CURRENT_DATE
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.gps_tracking gt
      WHERE gt.employee_id = r.guard_id
        AND gt.tracked_at >= (NOW() - (p_threshold_minutes || ' minutes')::INTERVAL)
    ) THEN
      IF NOT EXISTS (
        SELECT 1
        FROM public.panic_alerts pa
        WHERE pa.guard_id = r.guard_id
          AND pa.alert_type = 'inactivity'
          AND pa.is_resolved = false
          AND pa.alert_time >= NOW() - INTERVAL '1 hour'
      ) THEN
        INSERT INTO public.panic_alerts (
          guard_id,
          alert_type,
          location_id,
          description,
          is_resolved,
          alert_time
        )
        VALUES (
          r.guard_id,
          'inactivity',
          r.check_in_location_id,
          'Inactivity detected: No GPS heartbeat for ' || p_threshold_minutes || ' minutes.',
          false,
          NOW()
        )
        RETURNING id INTO v_alert_id;

        INSERT INTO public.notifications (
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
          'inactivity_alert',
          'Guard Inactivity Warning',
          'Guard ' || r.guard_name || ' has not updated GPS location for ' || p_threshold_minutes || 'm.',
          'panic_alert',
          v_alert_id,
          'high'
        FROM public.users u
        JOIN public.roles rl ON u.role_id = rl.id
        WHERE rl.role_name::text IN ('admin', 'security_supervisor');

        out_guard_id := r.guard_id;
        out_alert_created := true;
        RETURN NEXT;
      END IF;
    END IF;
  END LOOP;
END;
$$;

DO $$
BEGIN
  PERFORM cron.unschedule('check-stationary-guards');
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

SELECT cron.schedule(
  'check-stationary-guards',
  '*/30 * * * *',
  'SELECT public.detect_stationary_guards();'
);
