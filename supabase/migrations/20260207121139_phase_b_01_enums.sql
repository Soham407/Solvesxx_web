-- ============================================
-- PHASE B MIGRATION 01: ENUMS
-- ============================================

-- Asset status enum
CREATE TYPE asset_status AS ENUM (
    'functional',
    'under_maintenance',
    'faulty',
    'decommissioned'
);

-- Service request priority enum
CREATE TYPE service_priority AS ENUM (
    'low',
    'normal',
    'high',
    'urgent'
);

-- Service request status enum
CREATE TYPE service_request_status AS ENUM (
    'open',
    'assigned',
    'in_progress',
    'on_hold',
    'completed',
    'cancelled'
);

-- Job session status enum
CREATE TYPE job_session_status AS ENUM (
    'started',
    'paused',
    'completed',
    'cancelled'
);

-- Maintenance frequency enum
CREATE TYPE maintenance_frequency AS ENUM (
    'daily',
    'weekly',
    'monthly',
    'quarterly',
    'half_yearly',
    'yearly'
);;
