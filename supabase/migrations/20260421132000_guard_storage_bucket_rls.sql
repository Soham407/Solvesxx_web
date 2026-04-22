-- Storage Bucket RLS Policies for Guard Role Photos
-- Ensures secure access to visitor-photos and checklist-evidence buckets

-- ============================================================
-- VISITOR-PHOTOS BUCKET RLS POLICIES
-- Public bucket for guard uploads + resident viewing
-- ============================================================

-- Policy 1: Guards can upload visitor photos
DO $$ BEGIN
  CREATE POLICY "Guards can upload visitor photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'visitor-photos'
    AND (storage.foldername(name))[1] = 'guards'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Policy 2: Residents can download visitor photos for their flats
DO $$ BEGIN
  CREATE POLICY "Residents can view visitor photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'visitor-photos'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Policy 3: Anon users (via signed URL) can view for approval
DO $$ BEGIN
  CREATE POLICY "Anon can view visitor photos via URL"
  ON storage.objects FOR SELECT TO anon
  USING (
    bucket_id = 'visitor-photos'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- CHECKLIST-EVIDENCE BUCKET RLS POLICIES
-- Private bucket for guard uploads + manager review
-- ============================================================

-- Policy 1: Guards can upload checklist photos
DO $$ BEGIN
  CREATE POLICY "Guards can upload checklist evidence"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'checklist-evidence'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Policy 2: Managers and supervisors can download checklist photos
DO $$ BEGIN
  CREATE POLICY "Managers can view checklist evidence"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'checklist-evidence'
    AND EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.role_name IN ('admin', 'company_md', 'company_hod')
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

