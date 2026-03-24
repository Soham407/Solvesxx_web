
-- Add importance flag to job photos
ALTER TABLE public.job_photos ADD COLUMN IF NOT EXISTS is_important boolean DEFAULT false;

-- Create a table to track files scheduled for deletion from Storage
CREATE TABLE IF NOT EXISTS public.storage_deletion_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id text NOT NULL,
    file_path text NOT NULL,
    metadata jsonb,
    scheduled_at timestamp with time zone DEFAULT now(),
    processed_at timestamp with time zone
);

-- Function to queue old photos for deletion
CREATE OR REPLACE FUNCTION public.proc_enqueue_old_photos()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count integer;
BEGIN
    -- Insert photos older than 30 days that are not important into the deletion queue
    -- We assume the bucket name is 'job-evidence' based on common patterns
    INSERT INTO public.storage_deletion_queue (bucket_id, file_path, metadata)
    SELECT 
        'job-evidence', 
        substring(photo_url from '/storage/v1/object/public/job-evidence/(.*)'),
        jsonb_build_object('job_photo_id', id, 'captured_at', captured_at)
    FROM public.job_photos
    WHERE captured_at < now() - interval '30 days'
      AND is_important = false;

    -- Delete the records from job_photos
    WITH deleted AS (
        DELETE FROM public.job_photos
        WHERE captured_at < now() - interval '30 days'
          AND is_important = false
        RETURNING id
    )
    SELECT count(*) INTO deleted_count FROM deleted;

    RETURN deleted_count;
END;
$$;
;
