-- ============================================
-- PHASE C: STORAGE CONFIGURATION
-- Employee Documents Storage Bucket Setup
-- ============================================

-- ============================================
-- STORAGE BUCKET: employee-documents
-- ============================================

-- Create the employee-documents bucket
-- Note: This needs to be run in Supabase Dashboard SQL Editor
-- or via Supabase CLI with storage admin permissions

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'employee-documents',
    'employee-documents',
    false,  -- Private bucket
    10485760,  -- 10MB limit (10 * 1024 * 1024)
    ARRAY['application/pdf', 'image/jpeg', 'image/png']::text[]
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- STORAGE RLS POLICIES
-- ============================================

-- Policy: Employees can view files in their own folder
-- Folder structure: {employee_id}/{document_type}/{filename}
CREATE POLICY "Employees view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'employee-documents'
    AND (
        -- Extract employee_id from path (first segment)
        (storage.foldername(name))[1] IN (
            SELECT employee_id::text FROM users WHERE id = auth.uid()
        )
        -- OR user is admin/HR
        OR get_user_role() IN ('admin', 'company_hod', 'company_md')
    )
);

-- Policy: Employees can upload files to their own folder
CREATE POLICY "Employees upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'employee-documents'
    AND (
        -- Extract employee_id from path (first segment)
        (storage.foldername(name))[1] IN (
            SELECT employee_id::text FROM users WHERE id = auth.uid()
        )
        -- OR user is admin/HR
        OR get_user_role() IN ('admin', 'company_hod')
    )
);

-- Policy: Admins can update any document
CREATE POLICY "Admins update documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'employee-documents'
    AND get_user_role() IN ('admin', 'company_hod')
);

-- Policy: Admins can delete documents
CREATE POLICY "Admins delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'employee-documents'
    AND get_user_role() IN ('admin', 'company_hod')
);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check bucket was created:
-- SELECT * FROM storage.buckets WHERE id = 'employee-documents';

-- Check policies were created:
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%documents%';

-- ============================================
-- MANUAL SETUP INSTRUCTIONS
-- ============================================

/*
If the above INSERT fails due to permissions, create the bucket manually:

1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Name: employee-documents
4. Public: OFF (unchecked)
5. Click "Create bucket"
6. Click on the bucket → Policies tab
7. Create policies as defined above

File Path Convention:
{employee_id}/{document_type}/{timestamp}_{original_filename}

Example paths:
- a1b2c3d4-e5f6-7890-abcd-ef1234567890/aadhar_card/1707500000000_aadhar.pdf
- a1b2c3d4-e5f6-7890-abcd-ef1234567890/pan_card/1707500000000_pan.pdf
- a1b2c3d4-e5f6-7890-abcd-ef1234567890/education_certificate/1707500000000_degree.pdf

This structure allows:
- Employee-based folder isolation
- Document type organization
- Timestamp-based versioning (same document can be re-uploaded)
*/
