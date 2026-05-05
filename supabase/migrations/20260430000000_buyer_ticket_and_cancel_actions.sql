-- Buyer dashboard quick actions

ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'service_request';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'service_requests_type_check'
  ) THEN
    ALTER TABLE public.service_requests
      ADD CONSTRAINT service_requests_type_check
      CHECK (type IN ('service_request', 'ticket'));
  END IF;
END $$;

DO $$
BEGIN
  ALTER TYPE public.request_status ADD VALUE IF NOT EXISTS 'cancelled';
END $$;
