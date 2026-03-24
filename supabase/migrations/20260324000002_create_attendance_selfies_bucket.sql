-- =============================================================================
-- Migration: 20260324000002_create_attendance_selfies_bucket.sql
-- Purpose:   Create the attendance-selfies storage bucket used by GuardDashboard
--            for clock-in selfie uploads (processCheckInWithSelfie).
--            This bucket was referenced in code but never created.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attendance-selfies',
  'attendance-selfies',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Guards and supervisors can upload selfies
DROP POLICY IF EXISTS "guards_upload_attendance_selfies" ON storage.objects;
CREATE POLICY "guards_upload_attendance_selfies" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'attendance-selfies'
    AND (is_guard() OR is_admin())
  );

-- Guards can read their own selfies; admins/supervisors can read all
DROP POLICY IF EXISTS "guards_read_attendance_selfies" ON storage.objects;
CREATE POLICY "guards_read_attendance_selfies" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'attendance-selfies'
    AND (is_admin() OR is_guard())
  );
