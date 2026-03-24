-- 1. Seed data for mobile testing
INSERT INTO public.shifts (shift_code, shift_name, start_time, end_time, duration_hours, is_night_shift)
VALUES 
('MORN01', 'Morning Shift', '08:00:00', '16:00:00', 8, false),
('EVE01', 'Evening Shift', '16:00:00', '00:00:00', 8, false),
('NIG01', 'Night Shift', '00:00:00', '08:00:00', 8, true)
ON CONFLICT (shift_code) DO NOTHING;

INSERT INTO public.daily_checklists (checklist_code, checklist_name, department, questions)
VALUES 
('DC01', 'Security Daily Checklist', 'Security', '[{"type": "yes_no", "question": "Are all entry gates secured?", "required": true}, {"type": "yes_no", "question": "Did you inspect the perimeter?", "required": true}]'::jsonb)
ON CONFLICT (checklist_code) DO NOTHING;

INSERT INTO public.emergency_contacts (contact_name, contact_type, phone_number, description)
SELECT * FROM (VALUES 
('Local Police Station', 'Police', '100', 'Primary local police contact'),
('Fire Brigade', 'Fire', '101', 'Primary fire contact'),
('Local Hospital', 'Medical', '102', 'Nearest emergency hospital')
) AS v(name, type, phone, descr)
WHERE NOT EXISTS (SELECT 1 FROM public.emergency_contacts WHERE phone_number = v.phone);


-- 2. Fix the 12 functions with mutable search_path (and add to the 2 trigger functions just in case)
ALTER FUNCTION check_geofence(double precision, double precision, double precision, double precision, double precision) SET search_path = public;
ALTER FUNCTION detect_expiring_items(integer) SET search_path = public;
ALTER FUNCTION validate_bill_for_payout(uuid) SET search_path = public;
ALTER FUNCTION get_shift_checklist_items(uuid) SET search_path = public;
ALTER FUNCTION get_guard_checklist_completion(uuid, date) SET search_path = public;
ALTER FUNCTION has_active_checklist_alert(uuid, date) SET search_path = public;
ALTER FUNCTION get_shift_time_info(uuid) SET search_path = public;
ALTER FUNCTION detect_incomplete_checklists(numeric, boolean) SET search_path = public;
ALTER FUNCTION get_clocked_in_guards() SET search_path = public;
ALTER FUNCTION get_guard_last_position(uuid) SET search_path = public;
ALTER FUNCTION has_active_inactivity_alert(uuid) SET search_path = public;
ALTER FUNCTION detect_inactive_guards(integer) SET search_path = public;

-- Plus other functions that are security definer without search path
ALTER FUNCTION trigger_checklist_check() SET search_path = public;
ALTER FUNCTION trigger_inactivity_check() SET search_path = public;

-- 3. Enable RLS on material_arrival_evidence and storage_deletion_queue
ALTER TABLE public.material_arrival_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_deletion_queue ENABLE ROW LEVEL SECURITY;

-- 4. Change unused SECURITY DEFINER view (expiry_tracking) to SECURITY INVOKER
ALTER VIEW public.expiry_tracking SET (security_invoker = true);;
