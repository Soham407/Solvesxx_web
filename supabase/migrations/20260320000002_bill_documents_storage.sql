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

-- RLS policy: authenticated users can upload (INSERT) to bill-documents
CREATE POLICY "Authenticated users can upload bill documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'bill-documents');

-- RLS policy: authenticated users can read (SELECT) from bill-documents
CREATE POLICY "Authenticated users can read bill documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'bill-documents');
