-- =============================================================================
-- Migration: 20260401000006_service_acknowledgment_spo_unique.sql
-- Purpose:
--   Add UNIQUE(spo_id) on service_acknowledgments to enforce one acknowledgment
--   per service purchase order at the DB level.
--
--   The old RPC (20260330000008) used ON CONFLICT (spo_id) which required this
--   constraint. That RPC was replaced by UPDATE-then-INSERT in 20260401000005,
--   so the constraint is no longer required by application code, but it is
--   correct data modelling: an SPO should have at most one acknowledgment.
--
--   The deduplication step keeps the most-recent row per spo_id if duplicates
--   exist (possible before 20260401000005 was applied).
-- =============================================================================

-- 1. Remove duplicate acknowledgment rows, keeping the latest per spo_id.
--    This is a no-op when there are no duplicates.
DELETE FROM public.service_acknowledgments
WHERE id NOT IN (
  SELECT DISTINCT ON (spo_id) id
  FROM public.service_acknowledgments
  ORDER BY spo_id, updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
);

-- 2. Add the unique constraint.
ALTER TABLE public.service_acknowledgments
  ADD CONSTRAINT service_acknowledgments_spo_id_key UNIQUE (spo_id);
