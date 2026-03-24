-- ============================================
-- Fix: Enable RLS on new GPS tracking partitions
-- ============================================

ALTER TABLE gps_tracking_2026_05 ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_tracking_2026_06 ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_tracking_2026_07 ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_tracking_2026_08 ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_tracking_2026_09 ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_tracking_2026_10 ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_tracking_2026_11 ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_tracking_2026_12 ENABLE ROW LEVEL SECURITY;;
