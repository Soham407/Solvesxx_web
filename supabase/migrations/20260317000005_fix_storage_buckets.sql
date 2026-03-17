-- =============================================================================
-- Migration: 20260317000005_fix_storage_buckets.sql
-- Purpose:   Fix storage bucket visibility, MIME restrictions, and file-size
--            limits identified in the 2026-03-17 security audit.
-- =============================================================================

-- ============================================================
-- C1 (CRITICAL): visitor-photos is PUBLIC — GDPR violation.
--    Visitor face photos (biometric data) are accessible
--    without authentication via a predictable URL.
-- ============================================================
UPDATE storage.buckets
SET public = false
WHERE id = 'visitor-photos';

-- ============================================================
-- H5 (HIGH): staff-compliance-docs — no MIME or size limits.
--    Stores Aadhar, PAN, PSARA certs, police verification PDFs.
--    Without limits, arbitrary files (including malware) can be
--    uploaded to this bucket by anyone with upload access.
-- ============================================================
UPDATE storage.buckets
SET
  file_size_limit    = 10485760,  -- 10 MB
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
WHERE id = 'staff-compliance-docs';

-- ============================================================
-- M7 (MEDIUM): Add size limits to all buckets that have none.
--    Also add MIME restrictions where the content type is known.
-- ============================================================

-- supplier-bills: PDF invoices only
UPDATE storage.buckets
SET
  file_size_limit    = 20971520,  -- 20 MB (invoices can be multi-page)
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png']
WHERE id = 'supplier-bills';

-- delivery-proof: photos and PDFs
UPDATE storage.buckets
SET
  file_size_limit    = 10485760,  -- 10 MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
WHERE id = 'delivery-proof';

-- checklist-evidence: photos
UPDATE storage.buckets
SET
  file_size_limit    = 10485760,  -- 10 MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'checklist-evidence';

-- ppe-verification: photos
UPDATE storage.buckets
SET
  file_size_limit    = 10485760,  -- 10 MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'ppe-verification';

-- service-evidence: photos and short videos
UPDATE storage.buckets
SET
  file_size_limit    = 52428800,  -- 50 MB (may include video)
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
WHERE id = 'service-evidence';

-- material-arrivals: photos (currently public — review needed)
-- Making private until explicit public-read requirement is confirmed.
UPDATE storage.buckets
SET
  public             = false,
  file_size_limit    = 10485760,  -- 10 MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'material-arrivals';

-- ============================================================
-- NOTE: After making visitor-photos private, the app must use
-- signed URLs for display. Generate them with:
--
--   const { data } = await supabase.storage
--     .from('visitor-photos')
--     .createSignedUrl(path, 3600);  // 1 hour expiry
--
-- Similarly for material-arrivals if the UI was using public URLs.
-- ============================================================
