/**
 * Phase B TypeScript Interfaces
 * Asset Management, Service Execution, and Inventory Tracking
 */

import { Database } from './supabase';

// ===== ENUMS =====
export type AssetStatus = Database['public']['Enums']['asset_status'];
export type ServicePriority = Database['public']['Enums']['service_priority'];
export type ServiceRequestStatus = Database['public']['Enums']['service_request_status'];
export type JobSessionStatus = Database['public']['Enums']['job_session_status'];
export type MaintenanceFrequency = Database['public']['Enums']['maintenance_frequency'];

// ===== TABLE ROW TYPES =====
export type AssetCategory = Database['public']['Tables']['asset_categories']['Row'];
export type AssetCategoryInsert = Database['public']['Tables']['asset_categories']['Insert'];
export type AssetCategoryUpdate = Database['public']['Tables']['asset_categories']['Update'];

export type Asset = Database['public']['Tables']['assets']['Row'];
export type AssetInsert = Database['public']['Tables']['assets']['Insert'];
export type AssetUpdate = Database['public']['Tables']['assets']['Update'];

export type QrCode = Database['public']['Tables']['qr_codes']['Row'];
export type QrCodeInsert = Database['public']['Tables']['qr_codes']['Insert'];
export type QrCodeUpdate = Database['public']['Tables']['qr_codes']['Update'];

export type QrScan = Database['public']['Tables']['qr_scans']['Row'];
export type QrScanInsert = Database['public']['Tables']['qr_scans']['Insert'];

export type Service = Database['public']['Tables']['services']['Row'];
export type ServiceInsert = Database['public']['Tables']['services']['Insert'];
export type ServiceUpdate = Database['public']['Tables']['services']['Update'];

export type ServiceRequest = Database['public']['Tables']['service_requests']['Row'] & {
  before_photo_url?: string | null;
  after_photo_url?: string | null;
  completion_signature_url?: string | null;
  completion_notes?: string | null;
  started_at?: string | null;
};
export type ServiceRequestInsert = Database['public']['Tables']['service_requests']['Insert'];
export type ServiceRequestUpdate = Database['public']['Tables']['service_requests']['Update'];

export type MaintenanceSchedule = Database['public']['Tables']['maintenance_schedules']['Row'];
export type MaintenanceScheduleInsert = Database['public']['Tables']['maintenance_schedules']['Insert'];
export type MaintenanceScheduleUpdate = Database['public']['Tables']['maintenance_schedules']['Update'];

export type JobSession = Database['public']['Tables']['job_sessions']['Row'];
export type JobSessionInsert = Database['public']['Tables']['job_sessions']['Insert'];
export type JobSessionUpdate = Database['public']['Tables']['job_sessions']['Update'];

export type JobPhoto = Database['public']['Tables']['job_photos']['Row'];
export type JobPhotoInsert = Database['public']['Tables']['job_photos']['Insert'];

export type Warehouse = Database['public']['Tables']['warehouses']['Row'];
export type WarehouseInsert = Database['public']['Tables']['warehouses']['Insert'];
export type WarehouseUpdate = Database['public']['Tables']['warehouses']['Update'];

export type StockBatch = Database['public']['Tables']['stock_batches']['Row'];
export type StockBatchInsert = Database['public']['Tables']['stock_batches']['Insert'];
export type StockBatchUpdate = Database['public']['Tables']['stock_batches']['Update'];

export type JobMaterialUsed = Database['public']['Tables']['job_materials_used']['Row'];
export type JobMaterialUsedInsert = Database['public']['Tables']['job_materials_used']['Insert'];

export type ReorderRule = Database['public']['Tables']['reorder_rules']['Row'];
export type ReorderRuleInsert = Database['public']['Tables']['reorder_rules']['Insert'];
export type ReorderRuleUpdate = Database['public']['Tables']['reorder_rules']['Update'];

// ===== VIEW TYPES =====
export type AssetWithDetails = Database['public']['Views']['assets_with_details']['Row'];
export type ServiceRequestWithDetails = Database['public']['Views']['service_requests_with_details']['Row'] & {
  before_photo_url?: string | null;
  after_photo_url?: string | null;
  completion_signature_url?: string | null;
  completion_notes?: string | null;
  started_at?: string | null;
};
export type DueMaintenanceSchedule = Database['public']['Views']['due_maintenance_schedules']['Row'];
export type StockLevel = Database['public']['Views']['stock_levels']['Row'];

// ===== UI-SPECIFIC INTERFACES =====

/** Asset with all joined data for display */
export interface AssetDisplay extends AssetWithDetails {
  maintenanceSchedules?: MaintenanceSchedule[];
  recentServiceRequests?: ServiceRequestWithDetails[];
}

/** Service request with job sessions for tracking */
export interface ServiceRequestDisplay extends ServiceRequestWithDetails {
  jobSessions?: JobSessionWithPhotos[];
  materialsUsed?: JobMaterialUsed[];
}

/** Job session with photos attached */
export interface JobSessionWithPhotos extends JobSession {
  photos: JobPhoto[];
  technicianName?: string;
  service_request?: ServiceRequest & {
    location?: {
      location_name: string;
    };
  };
}

/** Stock item with reorder info */
export interface StockItemDisplay extends StockLevel {
  reorderRule?: ReorderRule;
  recentBatches?: StockBatch[];
}

/** QR Code scan result */
export interface QrScanResult {
  qrId: string;
  asset?: AssetWithDetails;
  isValid: boolean;
  errorMessage?: string;
}

// ===== FORM INTERFACES =====

export interface CreateAssetForm {
  name: string;
  description?: string;
  categoryId: string;
  locationId: string;
  societyId?: string;
  serialNumber?: string;
  manufacturer?: string;
  modelNumber?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  warrantyExpiry?: string;
  vendorId?: string;
  expectedLifeYears?: number;
  specifications?: Record<string, unknown>;
}

export interface CreateServiceRequestForm {
  title?: string;
  description: string;
  serviceId?: string;
  assetId?: string;
  locationId?: string;
  societyId?: string;
  priority: ServicePriority;
  scheduledDate?: string;
  scheduledTime?: string;
  requesterPhone?: string;
}

export interface StartJobSessionForm {
  serviceRequestId: string;
  technicianId: string;
  startLatitude?: number;
  startLongitude?: number;
}

export interface CompleteJobSessionForm {
  workPerformed: string;
  remarks?: string;
  endLatitude?: number;
  endLongitude?: number;
  afterPhotoUrl?: string;
}

export interface AddJobPhotoForm {
  jobSessionId: string;
  photoUrl: string;
  photoType: 'before' | 'during' | 'after';
  caption?: string;
  latitude?: number;
  longitude?: number;
}

export interface AddMaterialUsedForm {
  jobSessionId: string;
  productId: string;
  quantity: number;
  stockBatchId?: string;
  notes?: string;
}

// ===== FILTER INTERFACES =====

export interface AssetFilters {
  categoryId?: string;
  locationId?: string;
  societyId?: string;
  status?: AssetStatus;
  searchTerm?: string;
}

export interface ServiceRequestFilters {
  status?: ServiceRequestStatus | ServiceRequestStatus[];
  priority?: ServicePriority;
  assignedTo?: string;
  requesterId?: string;
  assetId?: string;
  serviceId?: string;
  locationId?: string;
  societyId?: string;
  dateFrom?: string;
  dateTo?: string;
  searchTerm?: string;
}

export interface InventoryFilters {
  warehouseId?: string;
  productId?: string;
  needsReorder?: boolean;
  searchTerm?: string;
}

export interface MaintenanceScheduleFilters {
  assetId?: string;
  locationId?: string;
  frequency?: string;
  dueSoon?: boolean;
  isActive?: boolean;
  searchTerm?: string;
}

/** Extended maintenance schedule with asset/location details from view */
export interface MaintenanceScheduleWithDetails extends DueMaintenanceSchedule {
  schedule_name?: string; // Alias for task_name
  description?: string;   // Alias for task_description
}

// ===== DASHBOARD STATS =====

export interface AssetDashboardStats {
  totalAssets: number;
  functionalAssets: number;
  underMaintenance: number;
  faultyAssets: number;
  decommissioned: number;
  upcomingMaintenance: number;
}

export interface ServiceDashboardStats {
  openRequests: number;
  inProgressRequests: number;
  completedToday: number;
  overdueRequests: number;
  avgResolutionTime: number; // in hours
  urgentRequests: number;
}

export interface InventoryDashboardStats {
  totalProducts: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalWarehouses: number;
  pendingReorders: number;
}

// ===== RTV (RETURN TO VENDOR) INTERFACES =====

export type RTVTicket = Database['public']['Tables']['rtv_tickets']['Row'];
export type RTVTicketInsert = Database['public']['Tables']['rtv_tickets']['Insert'];
export type RTVTicketUpdate = Database['public']['Tables']['rtv_tickets']['Update'];

export interface RTVTicketDisplay extends RTVTicket {
  supplier?: {
    supplier_name: string;
  };
  product?: {
    product_name: string;
  };
  purchase_order?: {
    po_number: string;
  };
}

export interface RTVDashboardStats {
  pendingPickup: number;
  inTransit: number;
  creditPendingValue: number;
  monthlyReturnsCount: number;
}

