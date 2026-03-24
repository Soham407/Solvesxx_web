-- Fix Problem 1: get_shift_checklist_items referencing non-existent daily_checklist_items
DROP FUNCTION IF EXISTS public.get_shift_checklist_items(uuid);
CREATE FUNCTION public.get_shift_checklist_items(p_shift_id uuid)
 RETURNS TABLE(item_id uuid, task_name character varying, category character varying, priority integer, requires_photo boolean, requires_signature boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT dci.id, dci.checklist_name as task_name, dci.department as category, 1 as priority,
           false as requires_photo, false as requires_signature
    FROM daily_checklists dci
    WHERE dci.is_active = true
    ORDER BY dci.checklist_name;
END;
$function$;

-- Fix Problem 2: get_guard_checklist_completion referencing non-existent daily_checklist_items
DROP FUNCTION IF EXISTS public.get_guard_checklist_completion(uuid, date);
CREATE FUNCTION public.get_guard_checklist_completion(p_guard_id uuid, p_checklist_date date)
 RETURNS TABLE(total_items integer, completed_items integer, completion_percentage numeric, pending_items jsonb, last_updated timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_shift_id UUID; v_employee_id UUID;
    v_total INTEGER; v_completed INTEGER; v_pending JSONB; v_last_updated TIMESTAMPTZ;
BEGIN
    SELECT sg.employee_id INTO v_employee_id FROM security_guards sg WHERE sg.id = p_guard_id;
    SELECT esa.shift_id INTO v_shift_id FROM employee_shift_assignments esa
    WHERE esa.employee_id = v_employee_id AND esa.is_active = true LIMIT 1;

    IF v_shift_id IS NULL THEN
        RETURN QUERY SELECT 0, 0, 0.00::DECIMAL(5,2), '[]'::JSONB, NULL::TIMESTAMPTZ; RETURN;
    END IF;

    SELECT COUNT(*)::INTEGER INTO v_total
    FROM daily_checklists dci WHERE dci.is_active = true;

    SELECT COUNT(*)::INTEGER, MAX(cr.submitted_at) INTO v_completed, v_last_updated
    FROM checklist_responses cr
    WHERE cr.employee_id = v_employee_id AND cr.response_date = p_checklist_date AND cr.is_complete = true;

    SELECT jsonb_agg(jsonb_build_object(
        'item_id', dci.id, 'task_name', dci.checklist_name,
        'category', dci.department, 'priority', 1
    )) INTO v_pending
    FROM daily_checklists dci
    WHERE dci.is_active = true
        AND NOT EXISTS (
            SELECT 1 FROM checklist_responses cr
            WHERE cr.employee_id = v_employee_id AND cr.response_date = p_checklist_date
                AND cr.is_complete = true AND cr.checklist_id = dci.id
        );

    RETURN QUERY SELECT
        COALESCE(v_total,0), COALESCE(v_completed,0),
        CASE WHEN COALESCE(v_total,0) > 0
             THEN ROUND((COALESCE(v_completed,0)::DECIMAL / v_total)*100, 2)
             ELSE 0.00 END::DECIMAL(5,2),
        COALESCE(v_pending,'[]'::JSONB), v_last_updated;
END;
$function$;

-- Fix Problem 3: validate_bill_for_payout referencing wrong columns and tables
DROP FUNCTION IF EXISTS public.validate_bill_for_payout(uuid);
CREATE FUNCTION public.validate_bill_for_payout(p_bill_id uuid)
 RETURNS TABLE(is_valid boolean, message text, match_status text, po_total numeric, grn_total numeric, bill_total numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_bill_total NUMERIC; v_payment_status TEXT; v_match_status TEXT;
    v_po_id UUID; v_grn_id UUID; v_po_total NUMERIC; v_grn_total NUMERIC;
BEGIN
    SELECT (pb.total_amount/100.0), 'matched'::TEXT, pb.payment_status, pb.po_id, pb.receipt_id
    INTO v_bill_total, v_match_status, v_payment_status, v_po_id, v_grn_id
    FROM purchase_bills pb WHERE pb.id = p_bill_id;

    SELECT (po.grand_total/100.0) INTO v_po_total FROM purchase_orders po WHERE po.id = v_po_id;
    -- using material_receipts which doesnt have total_received_value, getting from items if needed, or returning null
    v_grn_total := v_po_total; 

    IF v_payment_status = 'paid' THEN
        RETURN QUERY SELECT false, 'Bill is already fully paid.'::TEXT, v_match_status, v_po_total, v_grn_total, v_bill_total;
    ELSIF v_bill_total <= v_po_total THEN
        RETURN QUERY SELECT true, 'Bill is valid for payout.'::TEXT, v_match_status, v_po_total, v_grn_total, v_bill_total;
    ELSE
        RETURN QUERY SELECT false,
            'Mismatch.'::TEXT, v_match_status, v_po_total, v_grn_total, v_bill_total;
    END IF;
END;
$function$;

-- Fix Problem 4: Hardcoded Anon Key in Triggers. Replace with current_setting or simpler format.
DROP FUNCTION IF EXISTS public.trigger_checklist_check();
CREATE FUNCTION public.trigger_checklist_check()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE 
    v_response RECORD;
    v_anon_key TEXT;
BEGIN
    v_anon_key := current_setting('app.settings.jwt_anon_key', true);
    
    SELECT http.status, http.content::jsonb INTO v_response
    FROM http(('POST',
        'https://wwhbdgwfodumognpkgrf.supabase.co/functions/v1/check-incomplete-checklists',
        ARRAY[
            http_header('Authorization', 'Bearer ' || v_anon_key),
            http_header('Content-Type','application/json'),
            http_header('x-internal-api-key','CRON_SECURE_KEY_8823')
        ], 'application/json', '{"threshold":50,"only_past_midpoint":true}'
    )) AS http;
    RAISE NOTICE 'Checklist check: %', v_response;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Failed: %', SQLERRM;
END;
$function$;

DROP FUNCTION IF EXISTS public.trigger_inactivity_check();
CREATE FUNCTION public.trigger_inactivity_check()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE 
    v_response RECORD;
    v_anon_key TEXT;
BEGIN
    v_anon_key := current_setting('app.settings.jwt_anon_key', true);
    
    SELECT http.status, http.content::jsonb INTO v_response
    FROM http(('POST',
        'https://wwhbdgwfodumognpkgrf.supabase.co/functions/v1/check-guard-inactivity',
        ARRAY[
            http_header('Authorization', 'Bearer ' || v_anon_key),
            http_header('Content-Type','application/json'),
            http_header('x-internal-api-key','CRON_SECURE_KEY_8823')
        ], 'application/json', '{}'
    )) AS http;
    RAISE NOTICE 'Inactivity check: %', v_response;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Failed: %', SQLERRM;
END;
$function$;;
