-- Bootstrap core schema so subsequent fix migrations can run on a fresh DB.
-- This captures the foundational Phase A objects that are already represented
-- in docs/reference_schema.sql and the archived Phase A schema.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM (
      'admin',
      'company_md',
      'company_hod',
      'account',
      'delivery_boy',
      'buyer',
      'supplier',
      'vendor',
      'security_guard',
      'security_supervisor',
      'society_manager',
      'service_boy',
      'super_admin',
      'ac_technician',
      'pest_control_technician',
      'storekeeper',
      'site_supervisor',
      'resident'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
    CREATE TYPE request_status AS ENUM (
      'pending',
      'accepted',
      'rejected',
      'indent_generated',
      'indent_forwarded',
      'indent_accepted',
      'indent_rejected',
      'po_issued',
      'po_received',
      'po_dispatched',
      'material_received',
      'material_acknowledged',
      'bill_generated',
      'paid',
      'feedback_pending',
      'completed'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_category') THEN
    CREATE TYPE service_category AS ENUM (
      'security_services',
      'ac_services',
      'plantation_services',
      'printing_advertising',
      'pest_control',
      'housekeeping',
      'pantry_services',
      'general_maintenance'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'guard_grade') THEN
    CREATE TYPE guard_grade AS ENUM ('A', 'B', 'C', 'D');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leave_type_enum') THEN
    CREATE TYPE leave_type_enum AS ENUM (
      'sick_leave',
      'casual_leave',
      'paid_leave',
      'unpaid_leave',
      'emergency_leave'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'material_condition') THEN
    CREATE TYPE material_condition AS ENUM (
      'good',
      'damaged',
      'expired',
      'leaking',
      'defective'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_type') THEN
    CREATE TYPE ticket_type AS ENUM (
      'quality_check',
      'quantity_check',
      'material_return'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_type') THEN
    CREATE TYPE alert_type AS ENUM (
      'panic',
      'inactivity',
      'geo_fence_breach',
      'checklist_incomplete',
      'routine'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_name user_role NOT NULL UNIQUE,
  role_display_name VARCHAR(100) NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS designations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  designation_code VARCHAR(20) UNIQUE NOT NULL,
  designation_name VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS leave_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  leave_type leave_type_enum NOT NULL UNIQUE,
  leave_name VARCHAR(100) NOT NULL,
  yearly_quota INTEGER NOT NULL,
  can_carry_forward BOOLEAN DEFAULT false,
  max_carry_forward INTEGER DEFAULT 0,
  requires_approval BOOLEAN DEFAULT true,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS societies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  society_code VARCHAR(20) UNIQUE NOT NULL,
  society_name VARCHAR(200) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  total_buildings INTEGER,
  total_flats INTEGER,
  contact_person VARCHAR(100),
  contact_phone VARCHAR(20),
  contact_email VARCHAR(255),
  society_manager_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS company_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_code VARCHAR(20) UNIQUE NOT NULL,
  location_name VARCHAR(200) NOT NULL,
  location_type VARCHAR(50),
  society_id UUID REFERENCES societies(id),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  geo_fence_radius DECIMAL(6, 2),
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS buildings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_code VARCHAR(20) NOT NULL,
  building_name VARCHAR(100) NOT NULL,
  society_id UUID REFERENCES societies(id) ON DELETE CASCADE NOT NULL,
  total_floors INTEGER,
  total_flats INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(society_id, building_code)
);

CREATE TABLE IF NOT EXISTS flats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flat_number VARCHAR(20) NOT NULL,
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE NOT NULL,
  floor_number INTEGER,
  flat_type VARCHAR(50),
  area_sqft DECIMAL(8, 2),
  ownership_type VARCHAR(20),
  is_occupied BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(building_id, flat_number)
);

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_code VARCHAR(50) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  date_of_birth DATE,
  date_of_joining DATE NOT NULL,
  designation_id UUID REFERENCES designations(id),
  department VARCHAR(100),
  reporting_to UUID REFERENCES employees(id),
  is_active BOOLEAN DEFAULT true,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id),
  role_id UUID REFERENCES roles(id) NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS residents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resident_code VARCHAR(50) UNIQUE NOT NULL,
  flat_id UUID REFERENCES flats(id) ON DELETE CASCADE NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  relation VARCHAR(50),
  phone VARCHAR(20),
  alternate_phone VARCHAR(20),
  email VARCHAR(255),
  is_primary_contact BOOLEAN DEFAULT false,
  move_in_date DATE,
  move_out_date DATE,
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_guards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) NOT NULL,
  guard_code VARCHAR(50) UNIQUE NOT NULL,
  grade guard_grade NOT NULL,
  is_armed BOOLEAN DEFAULT false,
  license_number VARCHAR(100),
  license_expiry DATE,
  assigned_location_id UUID REFERENCES company_locations(id),
  shift_timing VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_code VARCHAR(20) UNIQUE NOT NULL,
  shift_name VARCHAR(100) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_hours DECIMAL(4, 2),
  is_night_shift BOOLEAN DEFAULT false,
  break_duration_minutes INTEGER DEFAULT 60,
  grace_time_minutes INTEGER DEFAULT 15,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employee_shift_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  shift_id UUID REFERENCES shifts(id) NOT NULL,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN DEFAULT true,
  assigned_by UUID REFERENCES employees(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leave_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) NOT NULL,
  leave_type_id UUID REFERENCES leave_types(id) NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  number_of_days DECIMAL(3, 1) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) NOT NULL,
  log_date DATE NOT NULL,
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  check_in_location_id UUID REFERENCES company_locations(id),
  check_out_location_id UUID REFERENCES company_locations(id),
  total_hours DECIMAL(5, 2),
  status VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id, log_date)
);

CREATE TABLE IF NOT EXISTS daily_checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checklist_code VARCHAR(20) UNIQUE NOT NULL,
  checklist_name VARCHAR(200) NOT NULL,
  department VARCHAR(100) NOT NULL,
  description TEXT,
  questions JSONB NOT NULL,
  frequency VARCHAR(20) DEFAULT 'daily',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS checklist_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checklist_id UUID REFERENCES daily_checklists(id) NOT NULL,
  employee_id UUID REFERENCES employees(id) NOT NULL,
  response_date DATE NOT NULL,
  responses JSONB NOT NULL,
  location_id UUID REFERENCES company_locations(id),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_complete BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(checklist_id, employee_id, response_date)
);

CREATE TABLE IF NOT EXISTS visitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visitor_name VARCHAR(200) NOT NULL,
  visitor_type VARCHAR(50),
  phone VARCHAR(20),
  vehicle_number VARCHAR(20),
  photo_url TEXT,
  flat_id UUID REFERENCES flats(id),
  resident_id UUID REFERENCES residents(id),
  purpose VARCHAR(200),
  entry_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  exit_time TIMESTAMP WITH TIME ZONE,
  entry_guard_id UUID REFERENCES security_guards(id),
  exit_guard_id UUID REFERENCES security_guards(id),
  entry_location_id UUID REFERENCES company_locations(id),
  approved_by_resident BOOLEAN DEFAULT false,
  visitor_pass_number VARCHAR(50),
  is_frequent_visitor BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS guard_patrol_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guard_id UUID REFERENCES security_guards(id) NOT NULL,
  patrol_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  patrol_end_time TIMESTAMP WITH TIME ZONE,
  patrol_route JSONB,
  checkpoints_verified INTEGER,
  total_checkpoints INTEGER,
  anomalies_found TEXT,
  photos JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS panic_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guard_id UUID REFERENCES security_guards(id) NOT NULL,
  alert_type alert_type NOT NULL,
  location_id UUID REFERENCES company_locations(id),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  alert_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  description TEXT,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  notification_type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  reference_type VARCHAR(50),
  reference_id UUID,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  priority VARCHAR(20) DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gps_tracking (
  id UUID DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES security_guards(id),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  tracked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  battery_level INTEGER,
  is_mock_location BOOLEAN DEFAULT FALSE,
  accuracy_meters DECIMAL,
  speed_kmh DECIMAL,
  heading_degrees DECIMAL,
  PRIMARY KEY (id, tracked_at)
) PARTITION BY RANGE (tracked_at);

CREATE TABLE IF NOT EXISTS gps_tracking_default PARTITION OF gps_tracking DEFAULT;

CREATE TABLE IF NOT EXISTS gps_tracking_2026_02 PARTITION OF gps_tracking
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE IF NOT EXISTS gps_tracking_2026_03 PARTITION OF gps_tracking
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE IF NOT EXISTS gps_tracking_2026_04 PARTITION OF gps_tracking
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE OR REPLACE FUNCTION auto_exit_stale_visitors()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.visitors
  SET exit_time = COALESCE(exit_time, NOW())
  WHERE exit_time IS NULL
    AND entry_time < NOW() - INTERVAL '24 hours';
END;
$$;
