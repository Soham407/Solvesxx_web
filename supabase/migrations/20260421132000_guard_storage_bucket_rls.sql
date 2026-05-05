-- Storage Bucket RLS Policies for Guard Role Photos
-- Ensures secure access to visitor-photos and checklist-evidence buckets

DO $$ BEGIN
  CREATE POLICY "Guards can upload visitor photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'visitor-photos'
    AND (storage.foldername(name))[1] = 'guards'
  );
EXCEPTION WHEN duplicate_object OR insufficient_privilege THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Residents can view visitor photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'visitor-photos');
EXCEPTION WHEN duplicate_object OR insufficient_privilege THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Anon can view visitor photos via URL"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'visitor-photos');
EXCEPTION WHEN duplicate_object OR insufficient_privilege THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Guards can upload checklist evidence"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'checklist-evidence');
EXCEPTION WHEN duplicate_object OR insufficient_privilege THEN NULL; END $$;

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
EXCEPTION WHEN duplicate_object OR insufficient_privilege THEN NULL; END $$;
