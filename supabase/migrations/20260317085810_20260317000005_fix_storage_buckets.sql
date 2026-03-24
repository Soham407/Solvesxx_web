-- Fix storage bucket visibility, MIME restrictions, and file-size limits

-- C1 (CRITICAL): visitor-photos PUBLIC → PRIVATE (GDPR/biometric data)
UPDATE storage.buckets SET public = false WHERE id = 'visitor-photos';

-- H5 (HIGH): staff-compliance-docs — add MIME + size limits
UPDATE storage.buckets
SET file_size_limit    = 10485760,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
WHERE id = 'staff-compliance-docs';

-- supplier-bills: PDF invoices
UPDATE storage.buckets
SET file_size_limit    = 20971520,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png']
WHERE id = 'supplier-bills';

-- delivery-proof: photos + PDFs
UPDATE storage.buckets
SET file_size_limit    = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
WHERE id = 'delivery-proof';

-- checklist-evidence: photos
UPDATE storage.buckets
SET file_size_limit    = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'checklist-evidence';

-- ppe-verification: photos
UPDATE storage.buckets
SET file_size_limit    = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'ppe-verification';

-- service-evidence: photos + video
UPDATE storage.buckets
SET file_size_limit    = 52428800,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
WHERE id = 'service-evidence';

-- material-arrivals: make private + add limits
UPDATE storage.buckets
SET public             = false,
    file_size_limit    = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'material-arrivals';;
