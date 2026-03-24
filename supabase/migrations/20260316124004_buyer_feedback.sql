CREATE TABLE IF NOT EXISTS buyer_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE NOT NULL,
  overall_rating SMALLINT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  quality_rating SMALLINT CHECK (quality_rating BETWEEN 1 AND 5),
  delivery_rating SMALLINT CHECK (delivery_rating BETWEEN 1 AND 5),
  professionalism_rating SMALLINT CHECK (professionalism_rating BETWEEN 1 AND 5),
  would_recommend BOOLEAN DEFAULT true,
  comments TEXT,
  submitted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE buyer_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buyer_feedback_select" ON buyer_feedback
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "buyer_feedback_insert" ON buyer_feedback
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_buyer_feedback_request_id ON buyer_feedback(request_id);;
