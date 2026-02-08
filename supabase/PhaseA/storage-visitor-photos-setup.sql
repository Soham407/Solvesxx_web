-- ============================================
-- Visitor Photos Storage Bucket Setup
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create the visitor-photos storage bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('visitor-photos', 'visitor-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable public read access for visitor photos
-- This allows the photos to be viewed via public URLs
CREATE POLICY "Public read access for visitor photos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'visitor-photos' );

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
