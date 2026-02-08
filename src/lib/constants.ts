// ===== ORGANIZATION =====
// Hardcoded ID for 'Shri Radhamadhav Enterprise' (from our Seed Script)
export const CURRENT_ORG_ID = '11111111-1111-1111-1111-111111111111';

// We will fetch the Gate ID dynamically, but we use this code to find it
export const MAIN_GATE_CODE = 'GATE-01';

// ===== PHASE B: ASSET STATUS =====
export const ASSET_STATUS = {
  FUNCTIONAL: 'functional',
  UNDER_MAINTENANCE: 'under_maintenance',
  FAULTY: 'faulty',
  DECOMMISSIONED: 'decommissioned',
} as const;

export const ASSET_STATUS_LABELS: Record<string, string> = {
  functional: 'Functional',
  under_maintenance: 'Under Maintenance',
  faulty: 'Faulty',
  decommissioned: 'Decommissioned',
};

export const ASSET_STATUS_COLORS: Record<string, string> = {
  functional: '#22c55e',      // green
  under_maintenance: '#f59e0b', // amber
  faulty: '#ef4444',          // red
  decommissioned: '#6b7280',  // gray
};

// ===== PHASE B: SERVICE PRIORITY =====
export const SERVICE_PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export const SERVICE_PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

export const SERVICE_PRIORITY_COLORS: Record<string, string> = {
  low: '#6b7280',     // gray
  normal: '#3b82f6',  // blue
  high: '#f59e0b',    // amber
  urgent: '#ef4444',  // red
};

// ===== PHASE B: SERVICE REQUEST STATUS =====
export const SERVICE_REQUEST_STATUS = {
  OPEN: 'open',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  ON_HOLD: 'on_hold',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const SERVICE_REQUEST_STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  on_hold: 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const SERVICE_REQUEST_STATUS_COLORS: Record<string, string> = {
  open: '#3b82f6',       // blue
  assigned: '#8b5cf6',   // purple
  in_progress: '#f59e0b', // amber
  on_hold: '#6b7280',    // gray
  completed: '#22c55e',  // green
  cancelled: '#ef4444',  // red
};

// ===== PHASE B: JOB SESSION STATUS =====
export const JOB_SESSION_STATUS = {
  STARTED: 'started',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const JOB_SESSION_STATUS_LABELS: Record<string, string> = {
  started: 'Started',
  paused: 'Paused',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const JOB_SESSION_STATUS_COLORS: Record<string, string> = {
  started: '#3b82f6',   // blue
  paused: '#f59e0b',    // amber
  completed: '#22c55e', // green
  cancelled: '#ef4444', // red
};

// ===== PHASE B: MAINTENANCE FREQUENCY =====
export const MAINTENANCE_FREQUENCY = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  HALF_YEARLY: 'half_yearly',
  YEARLY: 'yearly',
} as const;

export const MAINTENANCE_FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  half_yearly: 'Half Yearly',
  yearly: 'Yearly',
};

export const MAINTENANCE_FREQUENCY_DAYS: Record<string, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
  quarterly: 90,
  half_yearly: 180,
  yearly: 365,
};

// ===== PHASE B: PHOTO TYPES =====
export const JOB_PHOTO_TYPES = {
  BEFORE: 'before',
  DURING: 'during',
  AFTER: 'after',
} as const;

export const JOB_PHOTO_TYPE_LABELS: Record<string, string> = {
  before: 'Before Work',
  during: 'During Work',
  after: 'After Work',
};

// ===== PHASE B: DEFAULT ASSET CATEGORIES =====
export const DEFAULT_ASSET_CATEGORIES = [
  { code: 'HVAC', name: 'HVAC Systems', icon: 'Thermometer', color: '#3b82f6' },
  { code: 'ELEC', name: 'Electrical', icon: 'Zap', color: '#f59e0b' },
  { code: 'PLUMB', name: 'Plumbing', icon: 'Droplets', color: '#06b6d4' },
  { code: 'LIFT', name: 'Elevators/Lifts', icon: 'ArrowUpDown', color: '#8b5cf6' },
  { code: 'FIRE', name: 'Fire Safety', icon: 'Flame', color: '#ef4444' },
  { code: 'SEC', name: 'Security Equipment', icon: 'Shield', color: '#22c55e' },
  { code: 'GEN', name: 'Generators', icon: 'Battery', color: '#84cc16' },
  { code: 'PUMP', name: 'Pumps', icon: 'Gauge', color: '#0ea5e9' },
  { code: 'LAND', name: 'Landscaping', icon: 'TreePine', color: '#16a34a' },
  { code: 'FURN', name: 'Furniture', icon: 'Sofa', color: '#a855f7' },
] as const;

// ===== PHASE B: QR CODE CONFIG =====
export const QR_CODE_CONFIG = {
  SIZE: 256,
  ERROR_CORRECTION: 'M',
  BASE_URL: typeof window !== 'undefined' ? window.location.origin : '',
  SCAN_PATH: '/scan',
} as const;

// ===== PHASE B: PAGINATION =====
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;