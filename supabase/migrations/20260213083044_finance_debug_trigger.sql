CREATE OR REPLACE FUNCTION update_budget_usage()
RETURNS TRIGGER AS $$
DECLARE
    v_budget_id UUID;
    v_budget RECORD;
    v_usage_percent DECIMAL;
BEGIN
    v_budget_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.budget_id ELSE NEW.budget_id END;

    IF (TG_OP = 'INSERT') AND NEW.budget_id IS NOT NULL THEN
        UPDATE budgets SET used_amount = used_amount + NEW.total_amount WHERE id = NEW.budget_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF OLD.budget_id IS DISTINCT FROM NEW.budget_id THEN
            IF OLD.budget_id IS NOT NULL THEN
                UPDATE budgets SET used_amount = used_amount - OLD.total_amount WHERE id = OLD.budget_id;
            END IF;
            IF NEW.budget_id IS NOT NULL THEN
                UPDATE budgets SET used_amount = used_amount + NEW.total_amount WHERE id = NEW.budget_id;
            END IF;
        ELSIF OLD.total_amount IS DISTINCT FROM NEW.total_amount AND NEW.budget_id IS NOT NULL THEN
            UPDATE budgets SET used_amount = used_amount - OLD.total_amount + NEW.total_amount WHERE id = NEW.budget_id;
        END IF;
    ELSIF (TG_OP = 'DELETE') AND OLD.budget_id IS NOT NULL THEN
        UPDATE budgets SET used_amount = used_amount - OLD.total_amount WHERE id = OLD.budget_id;
    END IF;

    IF TG_OP != 'DELETE' AND NEW.budget_id IS NOT NULL THEN
        SELECT * INTO v_budget FROM budgets WHERE id = NEW.budget_id;
        
        IF v_budget IS NOT NULL AND v_budget.allocated_amount > 0 THEN
            v_usage_percent := (v_budget.used_amount / v_budget.allocated_amount) * 100;
            
            -- Debugging logic: create a log entry if threshold is hit but notification isn't sent
            IF v_usage_percent >= v_budget.alert_threshold_percent THEN
                -- Insert a "system_log" or dummy notification to see if this block is entered
                INSERT INTO notifications (user_id, notification_type, title, message)
                VALUES ('ba8661e4-e7d2-4dc7-adda-f05623b6b700', 'budget_debug', 'Threshold Triggered', 
                        format('Percent: %s, Threshold: %s, Already Notified: %s', v_usage_percent, v_budget.alert_threshold_percent, v_budget.alert_notified_at));

                IF v_budget.alert_notified_at IS NULL THEN
                    INSERT INTO notifications (
                        user_id, notification_type, title, message, reference_type, reference_id, priority
                    )
                    SELECT 
                        u.id, 'budget_threshold_alert', 'Budget Threshold Reached',
                        format('Budget "%s" has reached %s%% of its limit.', v_budget.name, ROUND(v_usage_percent, 2)),
                        'budget', v_budget.id, 'high'
                    FROM public.users u
                    JOIN public.roles r ON u.role_id = r.id
                    WHERE r.role_name::text IN ('admin', 'account', 'company_md');
                    
                    UPDATE budgets SET alert_notified_at = NOW() WHERE id = v_budget.id;
                END IF;
            END IF;
        END IF;
    END IF;

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;
;
