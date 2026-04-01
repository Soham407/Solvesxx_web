-- Migration: Bill Number Sequence
-- Creates a PostgreSQL sequence and function to generate unique bill numbers
-- Format: BILL-{YYYY}-{NNNNNN}

DO $$
BEGIN
  -- Phase C already created a trigger function with this exact name.
  -- Rename it so we can safely introduce the RPC expected by the app.
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'generate_bill_number'
      AND pg_get_function_result(p.oid) = 'trigger'
  ) THEN
    ALTER FUNCTION public.generate_bill_number() RENAME TO generate_bill_number_trigger;
  END IF;
END;
$$;

-- Create the sequence for bill numbers
CREATE SEQUENCE IF NOT EXISTS bill_number_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

DO $$
DECLARE
  v_max_seq bigint;
BEGIN
  -- Continue from the highest existing BILL suffix, regardless of old 4-digit or new 6-digit formatting.
  SELECT COALESCE(MAX((regexp_match(bill_number, '^BILL-\d{4}-(\d+)$'))[1]::bigint), 0)
  INTO v_max_seq
  FROM public.purchase_bills
  WHERE bill_number ~ '^BILL-\d{4}-(\d+)$';

  PERFORM setval('bill_number_seq', v_max_seq + 1, false);
END;
$$;

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

CREATE OR REPLACE FUNCTION generate_bill_number_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.bill_number IS NULL THEN
    NEW.bill_number := generate_bill_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_bill_number ON public.purchase_bills;
CREATE TRIGGER set_bill_number
  BEFORE INSERT ON public.purchase_bills
  FOR EACH ROW
  EXECUTE FUNCTION generate_bill_number_trigger();

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION generate_bill_number() TO authenticated;
