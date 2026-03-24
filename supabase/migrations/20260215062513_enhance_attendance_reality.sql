
ALTER TABLE attendance_logs 
ADD COLUMN IF NOT EXISTS check_in_latitude NUMERIC,
ADD COLUMN IF NOT EXISTS check_in_longitude NUMERIC,
ADD COLUMN IF NOT EXISTS check_out_latitude NUMERIC,
ADD COLUMN IF NOT EXISTS check_out_longitude NUMERIC,
ADD COLUMN IF NOT EXISTS check_in_selfie_url TEXT,
ADD COLUMN IF NOT EXISTS is_auto_punch_out BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN attendance_logs.check_in_selfie_url IS 'Signed URL reference for guard selfie at check-in.';
;
