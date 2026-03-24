-- 1. Improved update_budget_usage function
CREATE OR REPLACE FUNCTION update_budget_usage()
RETURNS TRIGGER AS $$
BEGIN
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
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Update trigger to handle UPDATE and DELETE
DROP TRIGGER IF EXISTS trigger_update_budget_usage ON purchase_bills;
CREATE TRIGGER trigger_update_budget_usage
AFTER INSERT OR UPDATE OF budget_id, total_amount OR DELETE ON purchase_bills
FOR EACH ROW EXECUTE FUNCTION update_budget_usage();
;
