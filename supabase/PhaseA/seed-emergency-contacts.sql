-- ============================================
-- PHASE A: SEED EMERGENCY CONTACTS
-- Safe to run multiple times (uses INSERT ... ON CONFLICT DO NOTHING)
-- ============================================
-- 
-- Prerequisites:
-- 1. Run schema_phaseA_final_patch.sql first to create the emergency_contacts table
-- 2. This seeds global contacts (society_id = NULL) that apply to all societies
--
-- To add society-specific contacts, insert with a valid society_id
-- ============================================

-- Global Emergency Contacts (Available to all societies)
INSERT INTO emergency_contacts 
  (id, contact_name, contact_type, phone_number, priority, is_active, society_id, description)
VALUES
  -- National Emergency Numbers (India)
  (
    'ec000001-0001-0001-0001-000000000001',
    'Police',
    'police',
    '100',
    1,
    true,
    NULL,
    'National Police Emergency Helpline'
  ),
  (
    'ec000001-0001-0001-0001-000000000002',
    'Fire Brigade',
    'fire',
    '101',
    2,
    true,
    NULL,
    'Fire Emergency Services'
  ),
  (
    'ec000001-0001-0001-0001-000000000003',
    'Ambulance',
    'ambulance',
    '102',
    3,
    true,
    NULL,
    'Medical Emergency Ambulance'
  ),
  (
    'ec000001-0001-0001-0001-000000000004',
    'Women Helpline',
    'other',
    '1091',
    4,
    true,
    NULL,
    'Women Safety Helpline - 24/7'
  ),
  (
    'ec000001-0001-0001-0001-000000000005',
    'Child Helpline',
    'other',
    '1098',
    5,
    true,
    NULL,
    'Child Safety & Protection Helpline'
  ),
  (
    'ec000001-0001-0001-0001-000000000006',
    'Disaster Management',
    'other',
    '108',
    6,
    true,
    NULL,
    'National Disaster Response (NDRF)'
  )
ON CONFLICT (id) DO NOTHING;

-- Add description column if it doesn't exist (safety check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'emergency_contacts' AND column_name = 'description'
  ) THEN
    ALTER TABLE emergency_contacts ADD COLUMN description TEXT;
  END IF;
END $$;

-- ============================================
-- VERIFICATION QUERY
-- Run this to verify the seed was successful:
-- SELECT * FROM emergency_contacts ORDER BY priority;
-- ============================================
