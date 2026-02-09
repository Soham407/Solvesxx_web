# Phase B Implementation Plan

## Facility & Asset Management System

**Created:** 2026-02-07
**Project:** FacilityPlatform / enterprise-canvas-main
**Status:** Planning Phase

---

## � Reference Repositories

> **IMPORTANT:** When implementing each module, refer to these reference repositories for patterns, best practices, and code examples:

| Reference          | Path                           | Use For                                                                               |
| ------------------ | ------------------------------ | ------------------------------------------------------------------------------------- |
| **Atlas CMMS**     | `reference/Phase_B/cmms/`      | Work Orders, Service Requests, Maintenance Scheduling, Workflow Automation, Analytics |
| **Shelf.nu**       | `reference/Phase_B/shelf.nu/`  | QR Code System, Asset Tracking, Custom Fields, Digital Catalog, Location Tracking     |
| **Inventory Tool** | `reference/Phase_B/inventory/` | QR-based Part Checkout, Stock Management, Mobile-optimized Workflows                  |

### Reference Details

#### 📋 Atlas CMMS (`reference/Phase_B/cmms/`)

- **Tech Stack:** React (frontend), Spring Boot (API), React Native (mobile)
- **Key Features to Reference:**
  - Work order creation, assignment, and tracking
  - Time logging and priority management
  - Automated work order triggers
  - Equipment downtime tracking
  - Inventory stock alerts
  - Purchase order automation
- **Key Directories:**
  - `frontend/` - React components & pages
  - `api/` - REST API patterns
  - `mobile/` - React Native mobile app

#### 🏷️ Shelf.nu (`reference/Phase_B/shelf.nu/`)

- **Tech Stack:** Remix, React, Supabase, Prisma
- **Key Features to Reference:**
  - QR code generation and scanning
  - Asset tags and location tracking
  - Custom fields for assets
  - Team collaboration patterns
  - Booking/reservation system
- **Key Directories:**
  - `app/` - Remix routes and components
  - `docs/` - Setup guides
  - `prisma/` - Database schema (compare with our Supabase schema)

#### 📦 Inventory Tool (`reference/Phase_B/inventory/`)

- **Tech Stack:** Go, bbolt (embeded DB)
- **Key Features to Reference:**
  - QR-based part scanning workflow (mobile-optimized)
  - Part catalog filtering
  - Stock check-out process
  - Simple, clean mobile UI patterns

---

## �📋 Overview

Phase B introduces **Asset Management**, **Service Execution**, and **Inventory Tracking** capabilities to the Facility Platform. This plan outlines the step-by-step implementation strategy.

### Key Modules

1. **Asset Management** - Track physical equipment (ACs, Lifts, Pumps, etc.)
2. **QR Code System** - Scan-to-lookup for assets
3. **Service Requests** - Work order management
4. **Job Execution** - Service Boy workflow with GPS + photos
5. **Inventory Management** - Parts tracking and reorder alerts

### User Roles Involved

| Role                | Primary Functions                                   |
| ------------------- | --------------------------------------------------- |
| **Admin/HOD**       | Create assets, assign categories, view reports      |
| **Society Manager** | Manage assets for their society, assign work        |
| **Service Boy**     | Scan QR, execute jobs, upload photos, log materials |
| **Resident**        | Create service requests (future phase)              |

---

## 🔍 Existing UI Components

> **NOTE:** Some static/mockup UI components already exist. These need to be enhanced with real data hooks.

| Component                                       | Status           | Notes                                                    |
| ----------------------------------------------- | ---------------- | -------------------------------------------------------- |
| `components/dashboards/ServiceBoyDashboard.tsx` | ⚠️ Static Mockup | Uses hardcoded jobs, needs real hooks                    |
| `app/(dashboard)/inventory/`                    | ⚠️ Partial       | Has categories, products, suppliers - extend for Phase B |

---

## 🏗️ Implementation Phases

### **STEP 1: TypeScript Types Generation**

**Duration:** 1 hour

1. Generate Supabase TypeScript types including new Phase B tables
2. Create `types/phaseB.ts` with interfaces for:
   - Asset, AssetCategory, AssetWithDetails
   - QrCode, QrScan
   - ServiceRequest, ServiceRequestWithDetails
   - JobSession, JobPhoto
   - Warehouse, StockBatch, JobMaterialUsed
3. Update `src/types/supabase.ts` with regenerated types

**Files to Create/Update:**

- `src/types/supabase.ts` (regenerate)
- `src/types/phaseB.ts` (new)

---

### **STEP 2: Constants & Configuration**

**Duration:** 30 minutes

1. Add Phase B constants to `src/lib/constants.ts`:
   - Asset status colors/labels
   - Service priority colors/labels
   - Request status labels
   - Job session status labels
2. Add icon mappings for asset categories

**Files to Update:**

- `src/lib/constants.ts`

---

### **STEP 3: Data Hooks - Assets**

**Duration:** 3-4 hours

> 📚 **Reference:** Study `reference/Phase_B/shelf.nu/app/` for asset CRUD patterns and QR linking

Create hooks following existing patterns (`useAttendance.ts`, `useGuardVisitors.ts`):

#### 3.1 `useAssetCategories.ts`

```typescript
// Functions:
-fetchCategories() - createCategory() - updateCategory() - deleteCategory();
```

#### 3.2 `useAssets.ts`

```typescript
// Functions:
- fetchAssets(filters?: { status, category_id, location_id, search })
- getAssetById(id)
- createAsset(data)
- updateAsset(id, data)
- updateAssetStatus(id, status)
- deleteAsset(id)
- bulkUpdateStatus(ids, status)
```

#### 3.3 `useQrCodes.ts`

> 📚 **Reference:** Study `reference/Phase_B/shelf.nu/app/` for QR generation and scan patterns

```typescript
// Functions:
- scanQr(qrId, latitude?, longitude?)
- getQrByAssetId(assetId)
- linkQrToAsset(qrId, assetId)
- generateBulkQrCodes(count, societyId)
```

**Files to Create:**

- `hooks/useAssetCategories.ts`
- `hooks/useAssets.ts`
- `hooks/useQrCodes.ts`

---

### **STEP 4: Data Hooks - Service Requests**

**Duration:** 3-4 hours

> 📚 **Reference:** Study `reference/Phase_B/cmms/frontend/` for work order patterns

#### 4.1 `useServices.ts`

```typescript
// Functions:
-fetchServices() - createService();
```

#### 4.2 `useServiceRequests.ts`

> 📚 **Reference:** Study `reference/Phase_B/cmms/frontend/` for work order status workflow

```typescript
// Functions:
- fetchRequests(filters?: { status, priority, assigned_to })
- getRequestById(id)
- createRequest(data)
- assignRequest(id, employeeId)
- updateRequestStatus(id, status)
- completeRequest(id, resolutionNotes)
- getMyAssignedRequests() // For Service Boy
```

#### 4.3 `useMaintenanceSchedules.ts`

> 📚 **Reference:** Study `reference/Phase_B/cmms/api/` for preventive maintenance patterns

```typescript
// Functions:
- fetchSchedules(assetId?)
- createSchedule(data)
- updateSchedule(id, data)
- markAsPerformed(id)
- getDueSchedules()
```

**Files to Create:**

- `hooks/useServices.ts`
- `hooks/useServiceRequests.ts`
- `hooks/useMaintenanceSchedules.ts`

---

### **STEP 5: Data Hooks - Job Execution**

**Duration:** 3-4 hours

> 📚 **Reference:** Study `reference/Phase_B/cmms/mobile/` for technician mobile workflow patterns

#### 5.1 `useJobSessions.ts`

```typescript
// Functions:
-startSession(serviceRequestId, gpsCoords) -
  pauseSession(id) -
  resumeSession(id) -
  completeSession(id, endGpsCoords, workPerformed) -
  getActiveSession() - // Current session for logged-in technician
  getSessionsByRequest(requestId);
```

#### 5.2 `useJobPhotos.ts`

```typescript
// Functions:
- uploadPhoto(sessionId, file, photoType, caption?, gps?)
- getPhotosBySession(sessionId)
- deletePhoto(id)
```

**Files to Create:**

- `hooks/useJobSessions.ts`
- `hooks/useJobPhotos.ts`

---

### **STEP 6: Data Hooks - Inventory**

**Duration:** 2-3 hours

> 📚 **Reference:** Study `reference/Phase_B/inventory/` for QR-based stock workflow patterns
> 📚 **Reference:** Study `reference/Phase_B/cmms/frontend/` for inventory management UI

#### 6.1 `useWarehouses.ts`

```typescript
// Functions:
-fetchWarehouses() - createWarehouse();
```

#### 6.2 `useInventory.ts`

```typescript
// Functions:
- getStockLevels(warehouseId?)
- addStockBatch(data)
- getProductStock(productId)
- getLowStockAlerts()
```

#### 6.3 `useJobMaterials.ts`

> 📚 **Reference:** Study `reference/Phase_B/inventory/` for QR-based part checkout workflow

```typescript
// Functions:
- recordMaterialUsage(sessionId, productId, quantity, batchId?)
- getMaterialsBySession(sessionId)
```

**Files to Create:**

- `hooks/useWarehouses.ts`
- `hooks/useInventory.ts`
- `hooks/useJobMaterials.ts`

---

### **STEP 7: UI Components - Asset Management**

**Duration:** 4-5 hours

> 📚 **Reference:** Study `reference/Phase_B/shelf.nu/app/` for asset list, detail, and form UI patterns

#### 7.1 Asset List Component

- Table view with filters (status, category, location)
- Search functionality
- Bulk actions (change status)
- Pagination

#### 7.2 Asset Detail Component

- Asset information display
- QR code display/download
- Maintenance history
- Service request history
- Edit mode

#### 7.3 Asset Form Component

- Create/Edit asset modal
- Category selection
- Location selection
- Specification fields (dynamic JSONB)
- Photo upload

#### 7.4 Asset Category Manager

- Category CRUD
- Color/icon picker
- Hierarchy display

**Files to Create:**

- `components/assets/AssetList.tsx`
- `components/assets/AssetDetail.tsx`
- `components/assets/AssetForm.tsx`
- `components/assets/AssetCategoryManager.tsx`
- `components/assets/AssetQrCode.tsx`
- `components/assets/AssetStatusBadge.tsx`

---

### **STEP 8: UI Components - QR Scanner**

**Duration:** 3-4 hours

> 📚 **Reference:** Study `reference/Phase_B/shelf.nu/app/` for QR scanner implementation
> 📚 **Reference:** Study `reference/Phase_B/inventory/gui/` for mobile-optimized QR workflow

#### 8.1 QR Scanner Component

- Camera access for mobile
- QR decode library integration (e.g., `@zxing/browser`)
- Fallback manual entry
- Success/error feedback

#### 8.2 QR Scan Result Component

- Display asset details after scan
- Quick actions (start job, view history)
- Location verification

**Files to Create:**

- `components/qr/QrScanner.tsx`
- `components/qr/QrScanResult.tsx`
- `components/qr/QrCodeGenerator.tsx`

---

### **STEP 9: UI Components - Service Requests**

**Duration:** 4-5 hours

> 📚 **Reference:** Study `reference/Phase_B/cmms/frontend/` for work order list/detail UI patterns

#### 9.1 Service Request List

- Kanban or table view
- Filter by status, priority, assignee
- Color-coded priority

#### 9.2 Service Request Detail

- Full request information
- Assignment controls
- Status workflow buttons
- Job sessions timeline
- Materials used summary

#### 9.3 Service Request Form

- Asset selection (with QR scan option)
- Service type selection
- Priority selection
- Description input
- Schedule date/time

**Files to Create:**

- `components/service-requests/RequestList.tsx`
- `components/service-requests/RequestDetail.tsx`
- `components/service-requests/RequestForm.tsx`
- `components/service-requests/RequestStatusBadge.tsx`
- `components/service-requests/RequestKanban.tsx`

---

### **STEP 10: UI Components - Job Execution (Service Boy)**

**Duration:** 5-6 hours

> 📚 **Reference:** Study `reference/Phase_B/cmms/mobile/` for technician mobile interface patterns
> ⚠️ **NOTE:** Enhance existing `components/dashboards/ServiceBoyDashboard.tsx` (currently static)

#### 10.1 Service Boy Dashboard

- Today's assigned jobs
- Active job session card
- Quick scan button
- Job completion summary

#### 10.2 Job Session Component

- Timer display
- GPS status indicator
- Photo capture buttons (before/after)
- Materials used input
- Work notes
- Complete/Pause buttons

#### 10.3 Photo Capture Component

- Camera integration
- Photo preview
- Caption input
- GPS tagging
- Upload progress

#### 10.4 Materials Picker Component

> 📚 **Reference:** Study `reference/Phase_B/inventory/` for part checkout workflow

- Product search/list
- Quantity input
- Batch selection
- Running total

**Files to Create/Update:**

- `app/(dashboard)/service-boy/page.tsx` (new route)
- `components/dashboards/ServiceBoyDashboard.tsx` (**UPDATE** existing static component)
- `components/jobs/JobSessionCard.tsx`
- `components/jobs/ActiveJobPanel.tsx`
- `components/jobs/PhotoCapture.tsx`
- `components/jobs/MaterialsPicker.tsx`
- `components/jobs/JobTimer.tsx`

---

### **STEP 11: Dashboard Pages**

**Duration:** 4-5 hours

#### 11.1 Asset Management Dashboard (`/assets`)

- Asset statistics cards
- Asset list with filters
- Category breakdown chart
- Status distribution chart

#### 11.2 Service Requests Dashboard (`/service-requests`)

> 📚 **Reference:** Study `reference/Phase_B/cmms/frontend/` for work order dashboard patterns

- Request statistics
- Kanban board
- Recent requests list
- Overdue requests alert

#### 11.3 Service Boy Dashboard (`/service-boy`)

- My assigned jobs
- Active job panel
- Completed today count
- QR Scanner quick access

#### 11.4 Inventory Dashboard (`/inventory`)

> ⚠️ **NOTE:** Extend existing `/inventory` pages with Phase B tables

- Stock levels overview
- Low stock alerts
- Recent stock movements
- Warehouse selector

**Files to Create:**

- `app/(dashboard)/assets/page.tsx`
- `app/(dashboard)/assets/[id]/page.tsx`
- `app/(dashboard)/service-requests/page.tsx`
- `app/(dashboard)/service-requests/[id]/page.tsx`
- `app/(dashboard)/service-boy/page.tsx`

**Files to Update:**

- `app/(dashboard)/inventory/page.tsx` (extend with warehouses, stock batches)

---

### **STEP 12: Navigation & Sidebar Updates**

**Duration:** 1 hour

1. Add new sidebar items for Phase B:
   - Assets (Admin/Manager)
   - Service Requests (Admin/Manager)
   - My Jobs (Service Boy)
   - Inventory (Admin/Account)
2. Role-based visibility

**Files to Update:**

- `components/AppSidebar.tsx`
- Update navigation arrays

---

### **STEP 13: Real-time Subscriptions**

**Duration:** 2-3 hours

1. Service request assignment notifications
2. Job session status updates
3. Low stock alerts
4. Maintenance due reminders

**Files to Create:**

- `hooks/useServiceRequestSubscription.ts`
- `hooks/useJobSessionSubscription.ts`

---

### **STEP 14: API Routes (Optional)**

**Duration:** 2-3 hours

If needed for complex operations:

- `/api/assets/generate-qr-batch`
- `/api/service-requests/auto-assign`
- `/api/inventory/check-reorder`

---

### **STEP 15: Seed Data**

**Duration:** 1-2 hours

Create seed data for testing:

1. Asset categories (HVAC, Electrical, Plumbing, Security, Lifts)
2. Sample assets
3. Services (Maintenance, Repair, Inspection)
4. Sample warehouse and products
5. Sample service requests

**Files to Create:**

- `supabase/PhaseB/seed_phaseB.sql`

---

### **STEP 16: Testing & QA**

**Duration:** 4-6 hours

1. **Unit Tests:**
   - Hook functions
   - Utility functions

2. **Integration Tests:**
   - Asset CRUD flow
   - Service request workflow
   - Job session lifecycle
   - Material deduction

3. **E2E Tests:**
   - Admin creates asset → Service Boy scans → Completes job
   - Low stock alert flow

---

### **STEP 17: Documentation**

**Duration:** 2 hours

1. Update README with Phase B features
2. Create user guide for Service Boy workflow
3. API documentation for hooks

---

## 📊 Implementation Timeline

| Week       | Steps | Focus Area                                      |
| ---------- | ----- | ----------------------------------------------- |
| **Week 1** | 1-4   | Types, Constants, Core Hooks (Assets, Requests) |
| **Week 2** | 5-6   | Job Execution Hooks, Inventory Hooks            |
| **Week 3** | 7-9   | UI Components (Assets, QR, Requests)            |
| **Week 4** | 10-12 | Service Boy UI, Dashboards, Navigation          |
| **Week 5** | 13-17 | Real-time, Seed Data, Testing, Docs             |

---

## 🔗 Dependencies & Prerequisites

### Already Available (from Phase A)

- ✅ `supabaseClient.ts` - Supabase connection
- ✅ `get_user_role()` - Role helper function
- ✅ `employees` table with `auth_user_id` link
- ✅ `company_locations` table
- ✅ `societies` table
- ✅ `suppliers` table
- ✅ `products` table
- ✅ Authentication flow
- ✅ Role-based sidebar

### Need to Install

- `@zxing/browser` or `html5-qrcode` - QR scanning
- `qrcode.react` or similar - QR generation

---

## 🎯 Success Criteria

### Functional

- [ ] Admin can create/manage assets and categories
- [ ] QR codes are auto-generated for assets
- [ ] Service Boy can scan QR and see asset details
- [ ] Service requests can be created and assigned
- [ ] Service Boy can start/complete job sessions
- [ ] Photos can be captured and uploaded
- [ ] Materials can be logged and stock deducted
- [ ] Low stock alerts trigger

### Performance

- [ ] Asset list loads in < 1 second
- [ ] QR scan to asset display < 500ms
- [ ] Photo upload with progress indicator

### UX

- [ ] Mobile-friendly Service Boy dashboard
- [ ] Intuitive job workflow
- [ ] Clear status indicators

---

## 📝 Notes

1. **QR Format:** The QR code will contain the URL: `https://app.example.com/scan/{qr_uuid}`
2. **GPS Verification:** Consider verifying Service Boy is at asset location when starting job
3. **Offline Support:** Consider PWA features for Service Boy in areas with poor connectivity (future)
4. **Barcode Support:** Can extend QR scanner to read traditional barcodes (future)

---

## 🚀 Ready to Start?

When ready to begin implementation, start with **Step 1: TypeScript Types Generation** and proceed sequentially. Each step builds on the previous one.
