-- =============================================================================
-- Guard secure media bucket
-- Separates panic/checklist evidence from resident-visible visitor media.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'guard-secure-media',
  'guard-secure-media',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'guard_secure_media_select'
  ) THEN
    CREATE POLICY "guard_secure_media_select"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'guard-secure-media'
        AND get_user_role() IN (
          'admin',
          'super_admin',
          'society_manager',
          'security_supervisor',
          'security_guard'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'guard_secure_media_insert'
  ) THEN
    CREATE POLICY "guard_secure_media_insert"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'guard-secure-media'
        AND get_user_role() IN (
          'admin',
          'super_admin',
          'society_manager',
          'security_supervisor',
          'security_guard'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'guard_secure_media_delete'
  ) THEN
    CREATE POLICY "guard_secure_media_delete"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'guard-secure-media'
        AND get_user_role() IN (
          'admin',
          'super_admin',
          'society_manager',
          'security_supervisor',
          'security_guard'
        )
      );
  END IF;
END $$;
