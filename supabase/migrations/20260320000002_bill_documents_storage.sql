-- Migration: Bill Documents Storage Bucket
-- Creates a private storage bucket for bill/invoice document attachments
-- Allows authenticated users to upload and read documents

-- Create the bill-documents storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bill-documents',
  'bill-documents',
  false,
  5242880,
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated users can upload bill documents'
  ) THEN
    CREATE POLICY "Authenticated users can upload bill documents"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'bill-documents');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated users can read bill documents'
  ) THEN
    CREATE POLICY "Authenticated users can read bill documents"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'bill-documents');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated users can delete bill documents'
  ) THEN
    CREATE POLICY "Authenticated users can delete bill documents"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'bill-documents');
  END IF;
END;
$$;
