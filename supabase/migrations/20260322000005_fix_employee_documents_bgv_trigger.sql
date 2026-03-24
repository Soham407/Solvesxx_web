-- employee_documents moved to the Phase C schema and background verification
-- now lives in public.background_verifications. The old Day 5 trigger still
-- references removed columns and enum literals, which makes valid document
-- inserts fail at runtime.

DROP TRIGGER IF EXISTS trigger_update_bgv_docs_count ON public.employee_documents;
DROP FUNCTION IF EXISTS public.update_bgv_docs_count();
