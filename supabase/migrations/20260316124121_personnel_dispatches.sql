-- Historical placeholder retained so local migration history matches the linked
-- remote project. The original schema work for personnel_dispatches already
-- lives in 20260316000010_personnel_dispatches.sql.
--
-- This migration is intentionally a no-op so fresh local rebuilds do not fail
-- by attempting to recreate triggers/policies that were later consolidated.
DO $$
BEGIN
  RAISE NOTICE 'Historical migration 20260316124121_personnel_dispatches retained as a no-op placeholder.';
END
$$;
