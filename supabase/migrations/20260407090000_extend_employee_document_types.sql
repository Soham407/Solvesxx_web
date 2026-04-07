-- Extend employee document enum to support security compliance flows.
DO $$
BEGIN
    ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'psara_license';
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'id_proof';
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;
