-- =============================================================================
-- Migration: 20260324000004_link_resident_test_auth.sql
-- Purpose:   Link the resident@test.com auth user to their residents table record.
--            useResidentProfile first queries by auth_user_id = auth.uid().
--            When auth_user_id is NULL the lookup fails and the email fallback
--            may also fail if RLS requires auth_user_id match.
--            This ensures the test resident account works out of the box.
-- =============================================================================

UPDATE public.residents
SET auth_user_id = (
  SELECT id FROM auth.users WHERE email = 'resident@test.com' LIMIT 1
)
WHERE email = 'resident@test.com'
  AND auth_user_id IS NULL;
