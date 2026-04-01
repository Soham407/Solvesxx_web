-- Migration to fix mocked data in dashboards

-- 1. Alter requests table
ALTER TABLE requests
ADD COLUMN IF NOT EXISTS headcount INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS shift VARCHAR(50),
ADD COLUMN IF NOT EXISTS duration_months INTEGER DEFAULT 1;

-- 2. Alter horticulture_zones table
ALTER TABLE horticulture_zones
ADD COLUMN IF NOT EXISTS soil_health INTEGER DEFAULT 98,
ADD COLUMN IF NOT EXISTS greenery_density INTEGER DEFAULT 84;

-- 3. Create horticulture_seasonal_plans table
CREATE TABLE IF NOT EXISTS horticulture_seasonal_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- set up RLS for horticulture_seasonal_plans
ALTER TABLE horticulture_seasonal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to all users for seasonal_plans"
ON horticulture_seasonal_plans FOR SELECT
USING (true);

-- 4. Seed data for horticulture_seasonal_plans
INSERT INTO horticulture_seasonal_plans (month, title, description) VALUES
('Feb', 'Monsoon Prep Phase 1', 'Cleaning of all perimeter planters.'),
('Mar', 'Summer Flower Sowing', 'Transition to heat-resistant crops.');
