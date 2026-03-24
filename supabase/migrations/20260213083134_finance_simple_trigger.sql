CREATE OR REPLACE FUNCTION update_budget_usage()
RETURNS TRIGGER AS $$
DECLARE
    v_budget RECORD;
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.budget_id IS NOT NULL THEN
        -- Force recalculation of used_amount for this budget
        UPDATE budgets b
        SET used_amount = (SELECT COALESCE(SUM(total_amount), 0) FROM purchase_bills WHERE budget_id = b.id),
            updated_at = NOW()
        WHERE id = NEW.budget_id;
        
        -- Check and Notify
        SELECT * INTO v_budget FROM budgets WHERE id = NEW.budget_id;
        IF v_budget.allocated_amount > 0 AND (v_budget.used_amount / v_budget.allocated_amount * 100) >= v_budget.alert_threshold_percent THEN
            IF v_budget.alert_notified_at IS NULL THEN
                INSERT INTO notifications (user_id, notification_type, title, message)
                VALUES ('ba8661e4-e7d2-4dc7-adda-f05623b6b700', 'budget_threshold_alert', 'Budget Alert', 'Budget ' || v_budget.name || ' threshold hit (' || ROUND((v_budget.used_amount / v_budget.allocated_amount * 100)::numeric, 2) || '%).');
                
                UPDATE budgets SET alert_notified_at = NOW() WHERE id = v_budget.id;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
;
