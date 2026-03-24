
-- Function to check and update login rate limits
CREATE OR REPLACE FUNCTION public.proc_handle_login_attempt(p_ip inet, p_is_failure boolean DEFAULT false)
RETURNS TABLE (
    is_blocked boolean,
    remaining_attempts integer,
    blocked_until_time timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_limit_record RECORD;
    v_max_attempts CONSTANT integer := 5;
    v_lockout_period CONSTANT interval := '15 minutes';
BEGIN
    -- Get or create record
    INSERT INTO public.login_rate_limits (ip_address, attempt_count, first_attempt_at)
    VALUES (p_ip, 0, now())
    ON CONFLICT (ip_address) DO NOTHING;

    SELECT * INTO v_limit_record FROM public.login_rate_limits WHERE ip_address = p_ip;

    IF NOT p_is_failure THEN
        -- Success: reset
        UPDATE public.login_rate_limits
        SET attempt_count = 0,
            blocked_until = NULL,
            first_attempt_at = now(),
            updated_at = now()
        WHERE ip_address = p_ip;
        
        RETURN QUERY SELECT false, v_max_attempts, NULL::timestamptz;
        RETURN;
    END IF;

    -- Failure: increment and block if needed
    UPDATE public.login_rate_limits
    SET attempt_count = attempt_count + 1,
        blocked_until = CASE 
            WHEN attempt_count + 1 >= v_max_attempts THEN now() + v_lockout_period 
            ELSE NULL 
        END,
        updated_at = now()
    WHERE ip_address = p_ip
    RETURNING * INTO v_limit_record;

    RETURN QUERY SELECT 
        v_limit_record.blocked_until IS NOT NULL AND v_limit_record.blocked_until > now(),
        GREATEST(0, v_max_attempts - v_limit_record.attempt_count),
        v_limit_record.blocked_until;
END;
$$;

-- Helper to check BEFORE attempt
CREATE OR REPLACE FUNCTION public.proc_check_login_blocked(p_ip inet)
RETURNS TABLE (
    is_blocked boolean,
    blocked_until_time timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        blocked_until IS NOT NULL AND blocked_until > now(),
        blocked_until
    FROM public.login_rate_limits
    WHERE ip_address = p_ip;
END;
$$;
;
