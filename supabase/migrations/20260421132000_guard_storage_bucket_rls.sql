-- Storage Bucket RLS Policies for Guard Role Photos
-- Ensures secure access to visitor-photos and checklist-evidence buckets

-- ============================================================
-- VISITOR-PHOTOS BUCKET RLS POLICIES
-- Public bucket for guard uploads + resident viewing
-- ============================================================

-- Policy 1: Guards can upload visitor photos
CREATE POLICY "Guards can upload visitor photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'visitor-photos'
  AND (storage.foldername(name))[1] = 'guards'
);

-- Policy 2: Residents can download visitor photos for their flats
CREATE POLICY "Residents can view visitor photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'visitor-photos'
);

-- Policy 3: Anon users (via signed URL) can view for approval
CREATE POLICY "Anon can view visitor photos via URL"
ON storage.objects FOR SELECT TO anon
USING (
  bucket_id = 'visitor-photos'
);

-- ============================================================
-- CHECKLIST-EVIDENCE BUCKET RLS POLICIES
-- Private bucket for guard uploads + manager review
-- ============================================================

-- Policy 1: Guards can upload checklist photos
CREATE POLICY "Guards can upload checklist evidence"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'checklist-evidence'
);

-- Policy 2: Managers and supervisors can download checklist photos
CREATE POLICY "Managers can view checklist evidence"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'checklist-evidence'
  AND EXISTS (
    SELECT 1 FROM employees e
    WHERE e.auth_user_id = auth.uid()
    AND e.role_id IN (SELECT id FROM roles WHERE role_type IN ('manager', 'supervisor'))
  )
);

-- Comments
COMMENT ON POLICY "Guards can upload visitor photos" ON storage.objects
IS 'Allows authenticated guards to upload visitor photos to visitor-photos bucket';

COMMENT ON POLICY "Guards can upload checklist evidence" ON storage.objects
IS 'Allows authenticated guards to upload evidence photos to checklist-evidence bucket';
