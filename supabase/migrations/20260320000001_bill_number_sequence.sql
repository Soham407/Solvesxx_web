-- Migration: Bill Number Sequence
-- Creates a PostgreSQL sequence and function to generate unique bill numbers
-- Format: BILL-{YYYY}-{NNNNNN}

-- Create the sequence for bill numbers
CREATE SEQUENCE IF NOT EXISTS bill_number_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- Create the function to generate bill numbers
CREATE OR REPLACE FUNCTION generate_bill_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year text;
  v_seq  text;
BEGIN
  v_year := to_char(CURRENT_DATE, 'YYYY');
  v_seq  := lpad(nextval('bill_number_seq')::text, 6, '0');
  RETURN 'BILL-' || v_year || '-' || v_seq;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION generate_bill_number() TO authenticated;
