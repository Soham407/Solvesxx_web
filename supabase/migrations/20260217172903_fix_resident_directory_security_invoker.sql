
-- FIX: resident_directory view should use SECURITY INVOKER (default)
-- not SECURITY DEFINER, which would bypass RLS on the underlying
-- residents table by running as the view creator.
--
-- The privacy masking logic uses get_user_role() which already 
-- resolves based on auth.uid(), so INVOKER is the correct choice.
ALTER VIEW resident_directory SET (security_invoker = true);
;
