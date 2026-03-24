-- Allow all authenticated users to read (SELECT) visitor photos.
-- This is required for createSignedUrl() to work from the client.
-- The bucket remains private -- signed URLs expire and are the actual access gate.
INSERT INTO storage.buckets (id, name, public)
VALUES ('visitor-photos', 'visitor-photos', false)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  -- SELECT: any authenticated user (residents, guards, admins)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Authenticated users can read visitor photos'
  ) THEN
    CREATE POLICY "Authenticated users can read visitor photos"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'visitor-photos');
  END IF;

  -- INSERT: guards and admins only
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Guards and admins can upload visitor photos'
  ) THEN
    CREATE POLICY "Guards and admins can upload visitor photos"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'visitor-photos'
        AND get_user_role() IN ('admin', 'super_admin', 'society_manager', 'security_guard', 'security_supervisor')
      );
  END IF;

  -- DELETE: guards and admins only
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Guards and admins can delete visitor photos'
  ) THEN
    CREATE POLICY "Guards and admins can delete visitor photos"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'visitor-photos'
        AND get_user_role() IN ('admin', 'super_admin', 'society_manager', 'security_guard', 'security_supervisor')
      );
  END IF;
END $$;
