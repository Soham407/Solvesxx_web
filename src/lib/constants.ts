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

// ===== PHASE D: SUPPLIER STATUS =====
export const SUPPLIER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  BLACKLISTED: 'blacklisted',
  PENDING_VERIFICATION: 'pending_verification',
} as const;

export const SUPPLIER_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  blacklisted: 'Blacklisted',
  pending_verification: 'Pending Verification',
};

export const SUPPLIER_STATUS_COLORS: Record<string, string> = {
  active: '#22c55e',              // green
  inactive: '#6b7280',            // gray
  blacklisted: '#ef4444',         // red
  pending_verification: '#f59e0b', // amber
};

// Badge class names for UI components
export const SUPPLIER_STATUS_BADGE_CLASSES: Record<string, string> = {
  active: 'bg-success/10 text-success border-success/20',
  inactive: 'bg-muted text-muted-foreground border-border',
  blacklisted: 'bg-critical/10 text-critical border-critical/20',
  pending_verification: 'bg-warning/10 text-warning border-warning/20',
};

// ===== PHASE D: SUPPLIER TYPE =====
export const SUPPLIER_TYPE = {
  MANUFACTURER: 'manufacturer',
  DISTRIBUTOR: 'distributor',
  WHOLESALER: 'wholesaler',
  RETAILER: 'retailer',
  SERVICE_PROVIDER: 'service_provider',
} as const;

export const SUPPLIER_TYPE_LABELS: Record<string, string> = {
  manufacturer: 'Manufacturer',
  distributor: 'Distributor',
  wholesaler: 'Wholesaler',
  retailer: 'Retailer',
  service_provider: 'Service Provider',
};

export const SUPPLIER_TYPE_ICONS: Record<string, string> = {
  manufacturer: 'Factory',
  distributor: 'Truck',
  wholesaler: 'Warehouse',
  retailer: 'Store',
  service_provider: 'Wrench',
};

// ===== PHASE D: SUPPLIER TIER =====
export const SUPPLIER_TIER = {
  PLATINUM: 1,
  GOLD: 2,
  SILVER: 3,
} as const;

export const SUPPLIER_TIER_LABELS: Record<number, string> = {
  1: 'Platinum',
  2: 'Gold',
  3: 'Silver',
};

export const SUPPLIER_TIER_COLORS: Record<number, string> = {
  1: '#a855f7',  // purple/platinum
  2: '#f59e0b',  // amber/gold
  3: '#94a3b8',  // slate/silver
};

export const SUPPLIER_TIER_BADGE_CLASSES: Record<number, string> = {
  1: 'bg-purple-100 text-purple-700 border-purple-200',  // Platinum
  2: 'bg-amber-100 text-amber-700 border-amber-200',     // Gold
  3: 'bg-slate-100 text-slate-600 border-slate-200',     // Silver
};

// ===== PHASE D: RATE DEFAULTS =====
export const RATE_DEFAULTS = {
  GST_PERCENTAGE: 18,
  CURRENCY: 'INR',
  MIN_QTY_FOR_PRICE: 1,
  PAYMENT_TERMS_DAYS: 30,
} as const;

// ===== PHASE D: SCORE THRESHOLDS =====
export const SUPPLIER_SCORE_THRESHOLDS = {
  EXCELLENT: 80,  // 80-100
  GOOD: 60,       // 60-79
  AVERAGE: 40,    // 40-59
  POOR: 0,        // 0-39
} as const;

export const SUPPLIER_SCORE_LABELS: Record<string, { min: number; max: number; label: string; color: string }> = {
  excellent: { min: 80, max: 100, label: 'Excellent', color: '#22c55e' },
  good: { min: 60, max: 79, label: 'Good', color: '#3b82f6' },
  average: { min: 40, max: 59, label: 'Average', color: '#f59e0b' },
  poor: { min: 0, max: 39, label: 'Poor', color: '#ef4444' },
};

export const getScoreLabel = (score: number): string => {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Average';
  return 'Poor';
};

export const getScoreColor = (score: number): string => {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#3b82f6';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
};

// ===== PHASE D: INDIAN STATES =====
export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
] as const;