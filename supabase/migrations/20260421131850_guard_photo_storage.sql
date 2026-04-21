-- Visitor Photo Metadata Table
-- Links visitor records to their photos stored in Supabase object storage

CREATE TABLE IF NOT EXISTS visitor_photo_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
  guard_id UUID NOT NULL REFERENCES employees(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  storage_bucket TEXT DEFAULT 'visitor-photos',
  file_size_bytes INT,
  mime_type TEXT DEFAULT 'image/jpeg',
  photo_captured_at TIMESTAMP WITH TIME ZONE NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(visitor_id, photo_captured_at)
);

-- Indexes for performance
CREATE INDEX idx_visitor_photo_metadata_visitor_id ON visitor_photo_metadata(visitor_id);
CREATE INDEX idx_visitor_photo_metadata_guard_id ON visitor_photo_metadata(guard_id);
CREATE INDEX idx_visitor_photo_metadata_uploaded_at ON visitor_photo_metadata(uploaded_at DESC);

-- RLS Policies for visitor photos
ALTER TABLE visitor_photo_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guards can view photos they captured"
  ON visitor_photo_metadata FOR SELECT
  USING (
    auth.uid() = (SELECT auth_user_id FROM employees WHERE id = guard_id)
  );

CREATE POLICY "Residents can view visitor photos"
  ON visitor_photo_metadata FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM visitors v WHERE v.id = visitor_id AND v.resident_id = (SELECT id FROM residents WHERE auth_user_id = auth.uid())
    )
  );

CREATE POLICY "System can insert visitor photo metadata"
  ON visitor_photo_metadata FOR INSERT
  WITH CHECK (true);

-- Comments
COMMENT ON TABLE visitor_photo_metadata IS 'Metadata for visitor photos captured by guards at gate. Photos stored in Supabase object storage bucket ''visitor-photos''.';
