-- Ad-Space Bookings
-- Manages the ad space booking workflow for printing/advertising areas.

CREATE TABLE IF NOT EXISTS printing_ad_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number VARCHAR(50) UNIQUE NOT NULL,
  ad_space_id UUID NOT NULL,
  -- References printing_ad_spaces(id) once that table is confirmed live
  advertiser_name VARCHAR(200) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  agreed_rate_paise BIGINT NOT NULL DEFAULT 0,
  -- Store in paise, display with formatCurrency()
  creative_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- pending | approved | active | completed | cancelled
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-number bookings
CREATE SEQUENCE IF NOT EXISTS ad_booking_number_seq START 1001;

CREATE OR REPLACE FUNCTION generate_ad_booking_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.booking_number IS NULL OR NEW.booking_number = '' THEN
    NEW.booking_number := 'ADB-' || LPAD(nextval('ad_booking_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_ad_booking_number
  BEFORE INSERT ON printing_ad_bookings
  FOR EACH ROW EXECUTE FUNCTION generate_ad_booking_number();

CREATE OR REPLACE FUNCTION update_ad_booking_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_ad_booking_updated_at
  BEFORE UPDATE ON printing_ad_bookings
  FOR EACH ROW EXECUTE FUNCTION update_ad_booking_updated_at();

-- RLS
ALTER TABLE printing_ad_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ad_bookings_select" ON printing_ad_bookings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "ad_bookings_insert" ON printing_ad_bookings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "ad_bookings_update" ON printing_ad_bookings
  FOR UPDATE TO authenticated USING (true);

CREATE INDEX idx_ad_bookings_status ON printing_ad_bookings(status);
CREATE INDEX idx_ad_bookings_ad_space_id ON printing_ad_bookings(ad_space_id);
