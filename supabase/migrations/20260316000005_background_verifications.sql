-- Background Verifications
-- Per-type BGV tracking for candidates at the background_check stage.
-- Tracks police, address, education, and employment verifications separately.

CREATE TABLE IF NOT EXISTS background_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id),
  verification_type VARCHAR(50) NOT NULL,
  -- police | address | education | employment
  verification_agency VARCHAR(200),
  initiated_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- pending | in_progress | verified | rejected
  verification_document_url TEXT,
  remarks TEXT,
  verified_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_bgv_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_bgv_updated_at
  BEFORE UPDATE ON background_verifications
  FOR EACH ROW EXECUTE FUNCTION update_bgv_updated_at();

-- RLS
ALTER TABLE background_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bgv_select" ON background_verifications
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "bgv_insert" ON background_verifications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "bgv_update" ON background_verifications
  FOR UPDATE TO authenticated USING (true);

-- Indexes
CREATE INDEX idx_background_verifications_candidate_id ON background_verifications(candidate_id);
CREATE INDEX idx_background_verifications_status ON background_verifications(status);
