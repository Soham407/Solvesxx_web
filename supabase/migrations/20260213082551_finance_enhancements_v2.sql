-- Re-applying fixed notification logic

-- 1. Fixed check_budget_threshold
CREATE OR REPLACE FUNCTION check_budget_threshold()
RETURNS TRIGGER AS $$
DECLARE
    v_budget RECORD;
    v_usage_percent DECIMAL;
BEGIN
    SELECT * INTO v_budget FROM budgets WHERE id = NEW.budget_id;
    
    IF v_budget IS NOT NULL THEN
        v_usage_percent := (v_budget.used_amount / v_budget.allocated_amount) * 100;
        
        IF v_usage_percent >= v_budget.alert_threshold_percent AND v_budget.alert_notified_at IS NULL THEN
            INSERT INTO notifications (
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
                'budget_threshold_alert',
                'Budget Threshold Reached',
                format('Budget "%s" has reached %s%% of its limit.', v_budget.name, ROUND(v_usage_percent, 2)),
                'budget',
                v_budget.id,
                'high'
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE r.role_name::text IN ('admin', 'account', 'company_md');
            
            UPDATE budgets SET alert_notified_at = NOW() WHERE id = v_budget.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Fixed process_overdue_alerts
CREATE OR REPLACE FUNCTION process_overdue_alerts()
RETURNS void AS $$
BEGIN
    INSERT INTO notifications (
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
        'overdue_payment_alert',
        'Overdue Vendor Payment',
        format('Bill %s for supplier %s is overdue since %s.', pb.bill_number, s.supplier_name, pb.due_date),
        'purchase_bill',
        pb.id,
        'high'
    FROM purchase_bills pb
    JOIN suppliers s ON pb.supplier_id = s.id
    CROSS JOIN LATERAL (
        SELECT u.id FROM users u 
        JOIN roles r ON u.role_id = r.id
        WHERE r.role_name::text IN ('admin', 'account')
    ) u
    WHERE pb.payment_status != 'paid' 
    AND pb.due_date < CURRENT_DATE
    AND NOT EXISTS (
        SELECT 1 FROM notifications n 
        WHERE n.reference_id = pb.id 
        AND n.notification_type = 'overdue_payment_alert'
        AND n.created_at > CURRENT_DATE - INTERVAL '7 days'
    );

    INSERT INTO notifications (
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
        'overdue_collection_alert',
        'Overdue Buyer Payment',
        format('Invoice %s is overdue since %s.', sb.bill_number, sb.due_date),
        'sale_bill',
        sb.id,
        'high'
    FROM sale_bills sb
    CROSS JOIN LATERAL (
        SELECT u.id FROM users u 
        JOIN roles r ON u.role_id = r.id
        WHERE r.role_name::text IN ('admin', 'account')
    ) u
    WHERE sb.payment_status != 'paid' 
    AND sb.due_date < CURRENT_DATE
    AND NOT EXISTS (
        SELECT 1 FROM notifications n 
        WHERE n.reference_id = sb.id 
        AND n.notification_type = 'overdue_collection_alert'
        AND n.created_at > CURRENT_DATE - INTERVAL '7 days'
    );
END;
$$ LANGUAGE plpgsql;
;
