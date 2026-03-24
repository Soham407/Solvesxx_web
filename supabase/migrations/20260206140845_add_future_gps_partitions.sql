-- ============================================
-- Fix #7: Add future GPS tracking partitions
-- Prevents "no partition found" errors
-- ============================================

-- May 2026
CREATE TABLE IF NOT EXISTS gps_tracking_2026_05 PARTITION OF gps_tracking
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

-- June 2026    
CREATE TABLE IF NOT EXISTS gps_tracking_2026_06 PARTITION OF gps_tracking
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

-- July 2026
CREATE TABLE IF NOT EXISTS gps_tracking_2026_07 PARTITION OF gps_tracking
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

-- August 2026
CREATE TABLE IF NOT EXISTS gps_tracking_2026_08 PARTITION OF gps_tracking
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

-- September 2026
CREATE TABLE IF NOT EXISTS gps_tracking_2026_09 PARTITION OF gps_tracking
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

-- October 2026
CREATE TABLE IF NOT EXISTS gps_tracking_2026_10 PARTITION OF gps_tracking
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

-- November 2026
CREATE TABLE IF NOT EXISTS gps_tracking_2026_11 PARTITION OF gps_tracking
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

-- December 2026
CREATE TABLE IF NOT EXISTS gps_tracking_2026_12 PARTITION OF gps_tracking
    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

-- Comment
COMMENT ON TABLE gps_tracking IS 'Time-partitioned GPS tracking data. Partitions exist through Dec 2026. Add more partitions before they are needed.';;
