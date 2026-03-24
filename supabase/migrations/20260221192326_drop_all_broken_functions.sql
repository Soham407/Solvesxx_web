
DROP FUNCTION IF EXISTS public.check_geofence(double precision, double precision, double precision, double precision, double precision);
DROP FUNCTION IF EXISTS public.detect_expiring_items(integer);
DROP FUNCTION IF EXISTS public.validate_bill_for_payout(uuid);
DROP FUNCTION IF EXISTS public.get_shift_checklist_items(uuid);
DROP FUNCTION IF EXISTS public.get_guard_checklist_completion(uuid, date);
DROP FUNCTION IF EXISTS public.detect_incomplete_checklists();
DROP FUNCTION IF EXISTS public.detect_incomplete_checklists(numeric, boolean);
DROP FUNCTION IF EXISTS public.get_clocked_in_guards();
DROP FUNCTION IF EXISTS public.get_guard_last_position(uuid);
DROP FUNCTION IF EXISTS public.has_active_checklist_alert(uuid, date);
DROP FUNCTION IF EXISTS public.has_active_inactivity_alert(uuid);
DROP FUNCTION IF EXISTS public.get_shift_time_info(uuid);
DROP FUNCTION IF EXISTS public.trigger_checklist_check();
DROP FUNCTION IF EXISTS public.trigger_inactivity_check();
;
