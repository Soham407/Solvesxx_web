-- Create a sequence for RTV tickets
CREATE SEQUENCE IF NOT EXISTS rtv_ticket_seq START 1;

-- Create a function to generate RTV number: RTV-YYMM-XXXX
CREATE OR REPLACE FUNCTION get_next_rtv_number()
RETURNS VARCHAR AS $$
DECLARE
    year_month VARCHAR;
    next_seq INT;
BEGIN
    year_month := to_char(CURRENT_TIMESTAMP, 'YYMM');
    next_seq := nextval('rtv_ticket_seq');
    RETURN 'RTV-' || year_month || '-' || lpad(next_seq::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Alter the rtv_tickets table to use this function as default
ALTER TABLE rtv_tickets ALTER COLUMN rtv_number SET DEFAULT get_next_rtv_number();;
