-- ============================================
-- Visitor Photos Storage Bucket Setup
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create the visitor-photos storage bucket as PRIVATE (not publicly accessible)
INSERT INTO storage.buckets (id, name, public)
VALUES ('visitor-photos', 'visitor-photos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 2. Allow authenticated users to read visitor photos (via signed URLs only)
-- Photos are accessed through signed URLs generated server-side, not public URLs
CREATE POLICY "Authenticated users can read visitor photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'visitor-photos'
  AND auth.role() = 'authenticated'
);

-- 3. Allow authenticated users (guards) to upload photos
CREATE POLICY "Authenticated users can upload visitor photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'visitor-photos' 
  AND auth.role() = 'authenticated'
);

-- 4. Allow authenticated users to update their own uploads
CREATE POLICY "Users can update their own visitor photos"
ON storage.objects FOR UPDATE
WITH CHECK (
  bucket_id = 'visitor-photos' 
  AND auth.role() = 'authenticated'
);

-- 5. Allow authenticated users to delete photos (optional - for cleanup)
CREATE POLICY "Authenticated users can delete visitor photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'visitor-photos' 
  AND auth.role() = 'authenticated'
);

-- ============================================
-- Verification Query
-- ============================================

-- Verify bucket was created
SELECT * FROM storage.buckets WHERE id = 'visitor-photos';

-- Verify policies were created
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%visitor%';
