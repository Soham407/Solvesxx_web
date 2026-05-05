# Graph Report - app  (2026-04-24)

## Corpus Check
- 174 files · ~166,482 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 506 nodes · 713 edges · 75 communities detected
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 91 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Dashboard Operations|Dashboard Operations]]
- [[_COMMUNITY_API Routes|API Routes]]
- [[_COMMUNITY_Inventory Catalog|Inventory Catalog]]
- [[_COMMUNITY_Admin Workflows|Admin Workflows]]
- [[_COMMUNITY_Inventory Operations|Inventory Operations]]
- [[_COMMUNITY_HRMS Shifts|HRMS Shifts]]
- [[_COMMUNITY_Inventory Indents|Inventory Indents]]
- [[_COMMUNITY_Assets And HR|Assets And HR]]
- [[_COMMUNITY_Society Panic Alerts|Society Panic Alerts]]
- [[_COMMUNITY_Company Locations|Company Locations]]
- [[_COMMUNITY_Admin Material Indents|Admin Material Indents]]
- [[_COMMUNITY_Module Layouts|Module Layouts]]
- [[_COMMUNITY_Services Plantation|Services Plantation]]
- [[_COMMUNITY_Login Page|Login Page]]
- [[_COMMUNITY_HRMS Payroll|HRMS Payroll]]
- [[_COMMUNITY_Apple Icon Solvesxx|Apple Icon Solvesxx]]
- [[_COMMUNITY_HRMS Holidays|HRMS Holidays]]
- [[_COMMUNITY_Icon Solvesxx|Icon Solvesxx]]
- [[_COMMUNITY_HRMS Attendance|HRMS Attendance]]
- [[_COMMUNITY_Dashboard Home|Dashboard Home]]
- [[_COMMUNITY_Root Layout|Root Layout]]
- [[_COMMUNITY_Dashboard Layout|Dashboard Layout]]
- [[_COMMUNITY_Loading States|Loading States]]
- [[_COMMUNITY_Not Found States|Not Found States]]
- [[_COMMUNITY_Settings Page|Settings Page]]
- [[_COMMUNITY_Settings Branding|Settings Branding]]
- [[_COMMUNITY_Settings Permissions|Settings Permissions]]
- [[_COMMUNITY_Settings Notifications|Settings Notifications]]
- [[_COMMUNITY_Settings Company|Settings Company]]
- [[_COMMUNITY_Tickets Index|Tickets Index]]
- [[_COMMUNITY_Resident Index|Resident Index]]
- [[_COMMUNITY_Test Resident Page|Test Resident Page]]
- [[_COMMUNITY_Society Index|Society Index]]
- [[_COMMUNITY_Society My Flat|Society My Flat]]
- [[_COMMUNITY_HRMS Index|HRMS Index]]
- [[_COMMUNITY_Service Requests Board|Service Requests Board]]
- [[_COMMUNITY_Service Requests New|Service Requests New]]
- [[_COMMUNITY_Supplier Layout|Supplier Layout]]
- [[_COMMUNITY_Supplier Profile|Supplier Profile]]
- [[_COMMUNITY_Test Guard Page|Test Guard Page]]
- [[_COMMUNITY_Test Delivery Page|Test Delivery Page]]
- [[_COMMUNITY_Delivery Page|Delivery Page]]
- [[_COMMUNITY_Finance Page|Finance Page]]
- [[_COMMUNITY_Assets Maintenance|Assets Maintenance]]
- [[_COMMUNITY_Assets Categories|Assets Categories]]
- [[_COMMUNITY_Services Index|Services Index]]
- [[_COMMUNITY_Services Masters|Services Masters]]
- [[_COMMUNITY_Buyer Layout|Buyer Layout]]
- [[_COMMUNITY_Reports Page|Reports Page]]
- [[_COMMUNITY_Company Index|Company Index]]
- [[_COMMUNITY_Company Employees|Company Employees]]
- [[_COMMUNITY_Users Create|Users Create]]
- [[_COMMUNITY_Settings Audit Logs|Settings Audit Logs]]
- [[_COMMUNITY_Admin Waitlist|Admin Waitlist]]
- [[_COMMUNITY_Admin Config|Admin Config]]
- [[_COMMUNITY_Society Emergency|Society Emergency]]
- [[_COMMUNITY_HRMS Profiles|HRMS Profiles]]
- [[_COMMUNITY_HRMS Incidents|HRMS Incidents]]
- [[_COMMUNITY_Supplier Index|Supplier Index]]
- [[_COMMUNITY_Supplier Bills|Supplier Bills]]
- [[_COMMUNITY_Inventory Service Purchase Orders|Inventory Service Purchase Orders]]
- [[_COMMUNITY_Finance Closure|Finance Closure]]
- [[_COMMUNITY_Finance Payments|Finance Payments]]
- [[_COMMUNITY_Finance Ledger|Finance Ledger]]
- [[_COMMUNITY_Finance Buyer Invoices|Finance Buyer Invoices]]
- [[_COMMUNITY_Finance Performance Audit|Finance Performance Audit]]
- [[_COMMUNITY_Assets Qr Codes|Assets Qr Codes]]
- [[_COMMUNITY_Services Pest Control|Services Pest Control]]
- [[_COMMUNITY_AC Services|AC Services]]
- [[_COMMUNITY_Services Printing|Services Printing]]
- [[_COMMUNITY_Buyer Page|Buyer Page]]
- [[_COMMUNITY_Buyer Requests|Buyer Requests]]
- [[_COMMUNITY_Reports Attendance|Reports Attendance]]
- [[_COMMUNITY_Reports Inventory|Reports Inventory]]
- [[_COMMUNITY_Reports Services|Reports Services]]

## God Nodes (most connected - your core abstractions)
1. `Error()` - 55 edges
2. `POST()` - 49 edges
3. `GET()` - 22 edges
4. `PATCH()` - 21 edges
5. `refresh()` - 19 edges
6. `resetForm()` - 17 edges
7. `getAuthorizedSocietyAdmin()` - 13 edges
8. `DELETE()` - 13 edges
9. `openEditDialog()` - 13 edges
10. `handleSubmit()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `fetchChecklistData()` --calls--> `Error()`  [INFERRED]
  app/(dashboard)/society/checklists/page.tsx → app/(dashboard)/error.tsx
- `fetchAttendanceData()` --calls--> `Error()`  [INFERRED]
  app/(dashboard)/hrms/attendance/page.tsx → app/(dashboard)/error.tsx
- `handleSubmitOverride()` --calls--> `Error()`  [INFERRED]
  app/(dashboard)/inventory/indents/verification/page.tsx → app/(dashboard)/error.tsx
- `fetchAsset()` --calls--> `Error()`  [INFERRED]
  app/(dashboard)/assets/[id]/page.tsx → app/(dashboard)/error.tsx
- `handleImport()` --calls--> `refresh()`  [INFERRED]
  app/(dashboard)/admin/societies/page.tsx → app/(dashboard)/inventory/grn/page.tsx

## Hyperedges (group relationships)
- **SOLVESXX Growth Brand Mark** — icon_solvesxx_logo, icon_upward_arrow, icon_rising_bar_chart, icon_solvesxx_wordmark [EXTRACTED 1.00]
- **SOLVESXX Growth Logo Composition** — appleicon_solvesxx_logo, appleicon_upward_arrow, appleicon_blue_bars, appleicon_solvesxx_brand [EXTRACTED 1.00]

## Communities

### Community 0 - "Dashboard Operations"
Cohesion: 0.04
Nodes (41): Error(), async(), fetchQualityData(), fetchRequest(), fetchResidents(), fetchServiceMappings(), handleAssignSociety(), handleAutoSync() (+33 more)

### Community 1 - "API Routes"
Cohesion: 0.06
Nodes (41): advanceRequestWorkflowStatus(), authenticateAndAuthorize(), authenticateRequest(), authorizeEmployeeAdmin(), authorizeGuardAdmin(), authorizeQrManagement(), authorizeSecurityReset(), buildFallbackEmail() (+33 more)

### Community 2 - "Inventory Catalog"
Cohesion: 0.07
Nodes (29): buildProductPayload(), chartCurrencyFormatter(), formatCurrency(), formatViewCurrency(), getInitials(), handleConfirmAction(), handleCreate(), handleCreateMapping() (+21 more)

### Community 3 - "Admin Workflows"
Cohesion: 0.06
Nodes (12): handleContinueToServiceDetails(), handleDrop(), handleFileChange(), handleFileSelect(), handleImport(), handleResolve(), handleSubmit(), isMissingColumnError() (+4 more)

### Community 4 - "Inventory Operations"
Cohesion: 0.08
Nodes (10): calculateVariance(), cn(), getVerificationStatus(), handleAcknowledge(), handleCreateFromPO(), handleCreateSuccess(), handleRefresh(), handleStartJob() (+2 more)

### Community 5 - "HRMS Shifts"
Cohesion: 0.1
Nodes (13): Boolean(), buildChangeDiff(), formatTime(), getGuardDisplayName(), handleAccept(), handleAssignGuard(), handleCreateShift(), isObjectRecord() (+5 more)

### Community 6 - "Inventory Indents"
Cohesion: 0.11
Nodes (9): formatDate(), handleApprove(), handleCancel(), handleCreateIndent(), handleCreatePO(), handleReject(), handleSubmitForApproval(), openDetailSheet() (+1 more)

### Community 7 - "Assets And HR"
Cohesion: 0.13
Nodes (4): DetailRow(), fetchAsset(), handleStatusChange(), handleStatusUpdate()

### Community 8 - "Society Panic Alerts"
Cohesion: 0.25
Nodes (5): fetchChecklistData(), isHttpUrl(), openDetailsDialog(), openEvidenceDialog(), parseStorageRef()

### Community 9 - "Company Locations"
Cohesion: 0.25
Nodes (3): handleAdd(), handleDelete(), handleEdit()

### Community 10 - "Admin Material Indents"
Cohesion: 0.4
Nodes (8): closeGenerateDialog(), fetchActiveRate(), fetchMaterialRateSummary(), fetchRequestItems(), handleGenerateMaterialIndent(), handleGenerateServiceIndent(), handleSupplierChange(), openGenerateDialog()

### Community 11 - "Module Layouts"
Cohesion: 0.22
Nodes (1): Layout()

### Community 12 - "Services Plantation"
Cohesion: 0.28
Nodes (4): canManagePlantation(), canUpdatePlantationTask(), getPlantationStats(), getPlantationTaskBuckets()

### Community 13 - "Login Page"
Cohesion: 0.32
Nodes (3): getRoleName(), handleLogin(), waitForPersistedAuthCookie()

### Community 14 - "HRMS Payroll"
Cohesion: 0.33
Nodes (0): 

### Community 15 - "Apple Icon Solvesxx"
Cohesion: 0.53
Nodes (6): Blue Bar Chart Motif, Business Growth Concept, Powerful Solutions Pvt. Ltd. Tagline, SOLVESXX Brand, SOLVESXX Logo, Upward Gold Arrow Motif

### Community 16 - "HRMS Holidays"
Cohesion: 0.4
Nodes (0): 

### Community 17 - "Icon Solvesxx"
Cohesion: 0.7
Nodes (5): Business Growth Symbolism, Rising Bar Chart, SOLVESXX Logo, SOLVESXX Wordmark, Upward Arrow Emblem

### Community 18 - "HRMS Attendance"
Cohesion: 0.5
Nodes (1): fetchAttendanceData()

### Community 19 - "Dashboard Home"
Cohesion: 0.67
Nodes (0): 

### Community 20 - "Root Layout"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Dashboard Layout"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Loading States"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Not Found States"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Settings Page"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Settings Branding"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Settings Permissions"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Settings Notifications"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Settings Company"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Tickets Index"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Resident Index"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Test Resident Page"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Society Index"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Society My Flat"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "HRMS Index"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Service Requests Board"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Service Requests New"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Supplier Layout"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Supplier Profile"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Test Guard Page"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Test Delivery Page"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Delivery Page"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Finance Page"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Assets Maintenance"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Assets Categories"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Services Index"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Services Masters"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Buyer Layout"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Reports Page"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Company Index"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Company Employees"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "Users Create"
Cohesion: 1.0
Nodes (0): 

### Community 52 - "Settings Audit Logs"
Cohesion: 1.0
Nodes (0): 

### Community 53 - "Admin Waitlist"
Cohesion: 1.0
Nodes (0): 

### Community 54 - "Admin Config"
Cohesion: 1.0
Nodes (0): 

### Community 55 - "Society Emergency"
Cohesion: 1.0
Nodes (0): 

### Community 56 - "HRMS Profiles"
Cohesion: 1.0
Nodes (0): 

### Community 57 - "HRMS Incidents"
Cohesion: 1.0
Nodes (0): 

### Community 58 - "Supplier Index"
Cohesion: 1.0
Nodes (0): 

### Community 59 - "Supplier Bills"
Cohesion: 1.0
Nodes (0): 

### Community 60 - "Inventory Service Purchase Orders"
Cohesion: 1.0
Nodes (0): 

### Community 61 - "Finance Closure"
Cohesion: 1.0
Nodes (0): 

### Community 62 - "Finance Payments"
Cohesion: 1.0
Nodes (0): 

### Community 63 - "Finance Ledger"
Cohesion: 1.0
Nodes (0): 

### Community 64 - "Finance Buyer Invoices"
Cohesion: 1.0
Nodes (0): 

### Community 65 - "Finance Performance Audit"
Cohesion: 1.0
Nodes (0): 

### Community 66 - "Assets Qr Codes"
Cohesion: 1.0
Nodes (0): 

### Community 67 - "Services Pest Control"
Cohesion: 1.0
Nodes (0): 

### Community 68 - "AC Services"
Cohesion: 1.0
Nodes (0): 

### Community 69 - "Services Printing"
Cohesion: 1.0
Nodes (0): 

### Community 70 - "Buyer Page"
Cohesion: 1.0
Nodes (0): 

### Community 71 - "Buyer Requests"
Cohesion: 1.0
Nodes (0): 

### Community 72 - "Reports Attendance"
Cohesion: 1.0
Nodes (0): 

### Community 73 - "Reports Inventory"
Cohesion: 1.0
Nodes (0): 

### Community 74 - "Reports Services"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **1 isolated node(s):** `SOLVESXX Brand`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Root Layout`** (2 nodes): `layout.tsx`, `RootLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Dashboard Layout`** (2 nodes): `layout.tsx`, `DashboardLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Loading States`** (2 nodes): `loading.tsx`, `Loading()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Not Found States`** (2 nodes): `not-found.tsx`, `NotFound()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Settings Page`** (2 nodes): `page.tsx`, `SettingsIndex()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Settings Branding`** (2 nodes): `page.tsx`, `BrandingSettingsPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Settings Permissions`** (2 nodes): `page.tsx`, `togglePermission()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Settings Notifications`** (2 nodes): `page.tsx`, `NotificationsSettingsPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Settings Company`** (2 nodes): `page.tsx`, `handleSave()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Tickets Index`** (2 nodes): `page.tsx`, `TicketsIndex()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Resident Index`** (2 nodes): `page.tsx`, `ResidentPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Test Resident Page`** (2 nodes): `page.tsx`, `TestResidentPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Society Index`** (2 nodes): `page.tsx`, `SocietyIndex()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Society My Flat`** (2 nodes): `page.tsx`, `MyFlatPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `HRMS Index`** (2 nodes): `page.tsx`, `HrmsIndex()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Service Requests Board`** (2 nodes): `page.tsx`, `ServiceRequestsKanbanPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Service Requests New`** (2 nodes): `page.tsx`, `CreateServiceRequestPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Supplier Layout`** (2 nodes): `layout.tsx`, `SupplierLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Supplier Profile`** (2 nodes): `page.tsx`, `SupplierProfilePage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Test Guard Page`** (2 nodes): `page.tsx`, `TestGuardPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Test Delivery Page`** (2 nodes): `page.tsx`, `TestDeliveryPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Delivery Page`** (2 nodes): `page.tsx`, `DeliveryPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Finance Page`** (2 nodes): `page.tsx`, `FinanceIndex()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Assets Maintenance`** (2 nodes): `page.tsx`, `MaintenanceSchedulesPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Assets Categories`** (2 nodes): `page.tsx`, `AssetCategoriesPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Services Index`** (2 nodes): `page.tsx`, `ServicesIndex()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Services Masters`** (2 nodes): `page.tsx`, `ServicesMastersIndexPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Buyer Layout`** (2 nodes): `layout.tsx`, `BuyerLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Reports Page`** (2 nodes): `page.tsx`, `ReportsIndex()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Company Index`** (2 nodes): `page.tsx`, `CompanyIndex()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Company Employees`** (2 nodes): `page.tsx`, `CreateEmployeePage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Users Create`** (1 nodes): `route.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Settings Audit Logs`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Admin Waitlist`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Admin Config`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Society Emergency`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `HRMS Profiles`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `HRMS Incidents`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Supplier Index`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Supplier Bills`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Inventory Service Purchase Orders`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Finance Closure`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Finance Payments`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Finance Ledger`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Finance Buyer Invoices`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Finance Performance Audit`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Assets Qr Codes`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Services Pest Control`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `AC Services`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Services Printing`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Buyer Page`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Buyer Requests`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Reports Attendance`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Reports Inventory`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Reports Services`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Error()` connect `Dashboard Operations` to `API Routes`, `Inventory Catalog`, `Admin Workflows`, `Inventory Operations`, `Inventory Indents`, `Assets And HR`, `Society Panic Alerts`, `Company Locations`, `Admin Material Indents`, `Login Page`, `HRMS Attendance`?**
  _High betweenness centrality (0.362) - this node is a cross-community bridge._
- **Why does `POST()` connect `API Routes` to `Dashboard Operations`, `HRMS Shifts`?**
  _High betweenness centrality (0.116) - this node is a cross-community bridge._
- **Why does `handleSubmit()` connect `Admin Workflows` to `Dashboard Operations`, `Inventory Indents`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Are the 54 inferred relationships involving `Error()` (e.g. with `POST()` and `PATCH()`) actually correct?**
  _`Error()` has 54 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `POST()` (e.g. with `Error()` and `DELETE()`) actually correct?**
  _`POST()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `GET()` (e.g. with `POST()` and `Error()`) actually correct?**
  _`GET()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `PATCH()` (e.g. with `Error()` and `Boolean()`) actually correct?**
  _`PATCH()` has 2 INFERRED edges - model-reasoned connections that need verification._