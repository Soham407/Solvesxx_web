# FacilityPro — AI IDE Context File
> **Purpose:** This file is the single source of truth for AI IDEs (Cursor, Copilot, etc.) to
> understand the full scope, roles, permissions, modules, workflows, screens, APIs, database
> schema, and notification triggers of the FacilityPro enterprise platform.
>
> **Business Model:** An enterprise offers facility management services (Security, AC, Pest Control,
> Plantation, Printing). Buyers subscribe to or request these services. The enterprise fulfills
> demand by coordinating internal staff and third-party suppliers/vendors.
>
> ⚠️ Role list and access matrix are partially inferred from scope. Confirm with stakeholders
> before finalizing permissions in production.

---

## TABLE OF CONTENTS
1. [System Overview](#1-system-overview)
2. [Stakeholders & Role Definitions](#2-stakeholders--role-definitions)
3. [Master Data Modules](#3-master-data-modules)
4. [Service Catalogue](#4-service-catalogue)
5. [Core Workflows](#5-core-workflows)
6. [Status & State Machine](#6-status--state-machine)
7. [Security Guard Monitoring System](#7-security-guard-monitoring-system)
8. [Visitor Management System](#8-visitor-management-system)
9. [Ticket Generation System](#9-ticket-generation-system)
10. [HRMS Module](#10-hrms-module)
11. [UI Screens Per Role](#11-ui-screens-per-role)
12. [Notification & Alert Triggers](#12-notification--alert-triggers)
13. [API Endpoints Per Module](#13-api-endpoints-per-module)
14. [Database Schema / Entities](#14-database-schema--entities)
15. [Module-to-Role Access Matrix](#15-module-to-role-access-matrix)
16. [Key Business Rules](#16-key-business-rules)

---

## 1. System Overview

FacilityPro is a **multi-stakeholder enterprise portal** that digitizes and automates the
operational, procurement, HR, and service workflows of a facility management company.

**Three core parties:**
- **Company (Admin side)** — manages requests, procurement, HR, inventory, and billing.
- **Buyers** — organizations or individuals subscribing to / requesting services and materials.
- **Suppliers/Vendors** — third-party agencies fulfilling material or staffing demands.

**Key goals:**
- Eliminate manual handling
- Real-time visibility into resource allocation
- Paperless operations
- Role-based access control (RBAC)
- Geo-fenced staff accountability

---

## 2. Stakeholders & Role Definitions

> ⚠️ Role list is not finalized by the client. Additional roles may be added in future iterations.

| # | Role | Type | Description | Primary Access Area |
|---|------|------|-------------|---------------------|
| 1 | **Super Admin** | Platform | Highest-level platform owner. Full unrestricted access. Manages Admin accounts. | All modules, platform config, Admin management |
| 2 | **Admin** | Company | Central company operator. Full CRUD across all company modules. | Master Data, Workflows, Billing, HRMS, Reports |
| 3 | **Company MD** | Company | Top-level executive. View and high-level approve authority. | Dashboards, Reports, High-level approvals |
| 4 | **Company HOD** | Company | Departmental head. Manages team requests and staff under their department. | Department requests, Staff management |
| 5 | **Account** | Company | Handles all financial records, bills, and payment tracking. | Billing, Payroll, Financial reports |
| 6 | **Storekeeper / Inventory Manager** | Company | Manages physical stock. Handles material receipt, issue, and returns. | Inventory, Material Tickets, Stock alerts |
| 7 | **Site Supervisor** | Company | On-ground supervisor at a deployment site. Manages service acknowledgment and staff. | Service Acknowledgment, Staff monitoring, Tickets |
| 8 | **Delivery Boy** | Company | Executes last-mile delivery of materials. | Delivery status updates |
| 9 | **Buyer (Admin)** | Buyer | Manages the Buyer organization account. Submits requests, approves quotes, pays bills. | Order requests, Dashboard, Billing, Feedback |
| 10 | **Supplier / Vendor** | Supplier | Receives indents, dispatches materials or personnel, submits supplier bills. | Indent management, PO tracking, Billing |
| 11 | **Security Guard** | Field Staff | Field-level staff. Mobile app for attendance, checklists, panic alerts, visitor entry. | Guard App |
| 12 | **Security Supervisor** | Field Staff | Oversees guard operations. Reviews alerts and checklists. | Guard monitoring, Incident tickets |
| 13 | **Society Manager** | Field Staff | Manages on-ground society operations. Raises tickets, approves deliveries. | Visitor system, Material tickets, Staff tickets, Dashboard |
| 14 | **AC Technician** | Field Staff | Specialized technician for AC installation, maintenance, and repair jobs. | Service jobs, Inventory (parts), Attendance |
| 15 | **Pest Control Technician** | Field Staff | Handles chemical-based pest control treatments. Manages PPE checklist. | Service jobs, Chemical inventory, Attendance |
| 16 | **Service Boy** | Field Staff | Field staff for housekeeping, pantry, or office support tasks. | Attendance, Task updates |

---

## 3. Master Data Modules

> Master data is the foundational configuration layer.
> **Super Admin and Admin** have full write access. Other roles are view-only unless specified.

### 3.1 Company Module
| Master | Purpose | Managed By |
|--------|---------|------------|
| **Role Master** | Defines user roles and maps system permissions/access levels. | Super Admin |
| **Designation Master** | Stores official job titles (e.g., Senior Guard, HOD Finance). | Admin |
| **Employee Master** | Internal staff authorized to handle requests, indents, and feedback. | Admin |
| **User Master** | System login credentials + role assignment for all platform users. | Super Admin, Admin |

### 3.2 Supply Module
| Master | Purpose | Managed By |
|--------|---------|------------|
| **Product Category** | Top-level product grouping (e.g., Cleaning Supplies). | Admin |
| **Product Subcategory** | Sub-level grouping under a category for granular filtering. | Admin |
| **Product Master** | Product definition: Name, Code, Rate, Unit of Measurement. | Admin |
| **Supplier Details** | Vendor profile: contact, address, registration info. | Admin |
| **Supplier Wise Product** | Maps which vendor supplies which products. | Admin |
| **Supplier Wise Product Rate** | Pre-negotiated purchase cost per product per supplier. | Admin, Account |
| **Sale Product Rate** | Fixed selling price per product. Controls margin between buy and sell. | Admin, Account |

### 3.3 Services Module
| Master | Purpose | Managed By |
|--------|---------|------------|
| **Daily Checklist Master** | Defines routine inspection questions per department (Yes/No or value-based). | Admin |
| **Vendor Wise Services Master** | Maps vendor to the service categories they are authorized for. | Admin |
| **Work Master** | Library of all individual tasks/job types (e.g., Filter Cleaning, Fogging). | Admin |
| **Services Wise Work Master** | Maps specific Work items to a broader Service category. | Admin |

### 3.4 HRMS Module
| Master | Purpose | Managed By |
|--------|---------|------------|
| **Leave Type Master** | Defines leave categories (Sick, Casual, Paid) with yearly quotas and carry-forward rules. | Admin |
| **Holiday Master** | Pre-defined national/regional holidays for payroll and OT calculation. | Admin |
| **Company Event** | Schedules and notifies staff about meetings, drills, or training sessions. | Admin, Society Manager |
| **Company Location Master** | Registers physical sites/zones (e.g., Gate 1, Clubhouse) for GPS geo-fencing. | Admin |

---

## 4. Service Catalogue

### 4.1 Service Verticals
1. **Facility Management & Services** (umbrella)
2. **Air Conditioner Services**
3. **Plantation Services**
4. **Printing & Advertising Services**
5. **Pest Control Services**

### 4.2 Facility Management — Sub-services
| Sub-Service | Grades / Types |
|-------------|---------------|
| Security Services | Grade A (Premium), Grade B, Grade C, Grade D (Basic), Gunman (armed), Door Keeper |
| Staffing & Soft Services | Housekeeping, Pantry, Office Boy/Girls |

### 4.3 Material Supply — Categories
- Security Panel & Door Controller Materials
- Hot & Cold Beverages Materials
- Eco-Friendly Disposable Solutions
- Cleaning Essentials
- Pest Control Materials
- Air Fresheners
- Stationery Materials
- Corporate Gifting Materials

---

## 5. Core Workflows

### 5.1 Admin Workflow (Material Supply)
```
[Buyer: Submit Order Request]
        ↓
[Admin: Accept / Pending / Reject]
        ↓ (Accepted)
[Admin: Indent Generation → Forward Indent to Supplier]
        ↓
[Admin: Issue Purchase Order (PO) to Supplier]
        ↓
[Supplier: Received PO → Dispatch PO]
        ↓
[Storekeeper: Acknowledge Material Receipt + Quality & Quantity Ticket]
        ↓
[Admin / Account: Process Purchases Bill → Mark Paid]
        ↓
[Admin: Check Feedback]
        ↓
[END]
```

### 5.2 Buyer Workflow
```
[Buyer: Submit Order Request]
        ↓
[Buyer: Receive Order Notification → Accept / Reject proposed solution]
        ↓ (Accepted)
[Buyer: Receive Sale Bill]
        ↓
[Buyer: Pay → Submit Feedback]
        ↓
[END]
```

### 5.3 Supplier Workflow
```
[Supplier: Receive Indent Notification]
        ↓
[Supplier: Indent Accept / Indent Reject]
        ↓ (Accepted)
[Supplier: Receive PO → Prepare Goods → Dispatch PO]
        ↓
[Supplier: Generate Supplier Bill]
        ↓
[Admin marks: Supplier Bill Paid → END]
```

### 5.4 Service Deployment Workflow (Staffing / Security)
```
[Buyer: Select Service Category + Grade/Role + Headcount + Shift + Duration]
        ↓
[Admin: Rate Verification → Service Indent Generation → Vendor Matching → Forward Indent]
        ↓
[Supplier: Indent Accept / Reject → Receive Service Purchase Order (SPO)]
        ↓
[Supplier: Personnel Dispatched → Upload Delivery Note (names + credentials)]
        ↓
[Site Supervisor / Admin: Service Acknowledgment → Verify headcount + skill grade]
        ↓  Status: Deployment Confirmed
[Supplier: Submit Supplier Bill]
[Admin / Account: Reconcile → Generate Sale Bill for Buyer]
        ↓
[Buyer: Pay → Feedback → END]
```

### 5.5 AC / Pest Control Service Workflow
```
[Resident / Manager: Raise Service Request (complaint or scheduled)]
        ↓
[Admin: Assign Technician (AC Technician / Pest Control Technician)]
        ↓
[Technician: Arrive → GPS Check-in → Upload "Before" Photo]
        ↓
[Technician: Perform Work → Log Parts/Chemicals Used (linked to Inventory)]
        ↓
[Technician: Upload "After" Photo → Mark Complete]
        ↓
[Manager: Review → Close Job Ticket]
```

---

## 6. Status & State Machine

| State | Category | Who Sets It | Description |
|-------|----------|-------------|-------------|
| `Start` | Process Boundary | System (auto) | Initiated when Buyer submits an Order Request. |
| `END` | Process Boundary | System (auto) | Reached after Bill Paid + Feedback submitted. |
| `Accept` | Approval | Admin / Buyer | Admin approves request or Buyer accepts quotation. |
| `Reject` | Approval | Admin / Buyer | Request formally denied. |
| `Pending` | Approval | Admin | On hold for review or stock unavailability. |
| `Indent Accept` | Approval | Supplier | Supplier confirms they can fulfill the demand. |
| `Indent Reject` | Approval | Supplier | Supplier cannot fulfill the demand. |
| `Indent Forward` | Logistics | Admin | Indent formally sent from Admin to Supplier. |
| `Received PO` | Logistics | Supplier | Supplier confirms receipt of Purchase Order. |
| `Dispatch PO` | Logistics | Supplier | Goods/personnel en route from Supplier. |
| `Deployment Confirmed` | Logistics | Site Supervisor / Admin | Staff verified and on-site (staffing workflow only). |
| `Paid` | Financial | Admin / Account | Applied to both Supplier Bill and Sale/Buyer Bill. |

---

## 7. Security Guard Monitoring System

**App:** Guard Mobile App
**Oversight:** Security Supervisor, Society Manager

| Feature | Actor | Description |
|---------|-------|-------------|
| **Panic / SOS Button** | Guard | Red button on app home. Sends instant alert + GPS location to Society Manager Dashboard and SMS to Committee Members. |
| **Daily Checklist** | Guard | Routine checks: parking lights ON/OFF time, water supply/motor status, gate/shutter lock. Photo evidence required. |
| **Inactivity Alert** | System (auto) | If guard GPS does not change for a configurable period (default: 30 min), triggers alert to Manager. |
| **Checklist Reminder** | System (auto) | If checklist not submitted by set time (e.g., 9:00 AM), auto-reminder sent to guard. |
| **Emergency Contact Directory** | Guard | One-tap dial: Police, Fire Brigade, Ambulance, Electrician/Plumber. |

---

## 8. Visitor Management System

**Entry:** Security Guard
**Oversight:** Society Manager

| Feature | Description |
|---------|-------------|
| **Guest Entry** | Captures Name, Photo, Phone Number, Vehicle Number. |
| **Daily Visitor DB** | Separate database for frequent staff: Maids, Drivers, Milkmen, Car Cleaners. |
| **Society Family DB** | Flat Number, Owner/Tenant Name, Phone Numbers. Searchable by guard (limited personal details shown). |
| **SMS/Push Notification** | Auto-SMS + push notification to resident with visitor name and photo. |
| **Manager Dashboard** | Visitor stats, checklist status (Green/Red), panic logs, staff attendance log. |

---

## 9. Ticket Generation System

### 9.1 Material Quality Tickets
**Raised by:** Society Manager / Storekeeper on delivery

| Ticket Type | Purpose | Key Fields |
|-------------|---------|------------|
| **Bad Material (Quality Check)** | Flag damaged/expired goods. Blocks item from inventory. | Condition Status (Good/Damaged/Expired/Leaking), Photo Evidence, Batch Number |
| **Quantity Check** | Verify physical count vs PO. | Ordered Qty, Received Qty, Auto-calculated Shortage |
| **Return to Vendor (RTV)** | Track items sent back to vendor. | Reason (Wrong Item / Damaged / Quality Mismatch) |

**Digital Flow:**
```
Security logs delivery vehicle
        ↓
Manager / Storekeeper notified
        ↓
Open Material Ticket → Fill Quantity Check + Quality Check
        ↓
Approved → Add to Inventory
Rejected → Generate Return Ticket → Close on replacement or credit note
```

### 9.2 Employee Behaviour Tickets
**Raised by:** Society Manager / Security Supervisor

| Severity | Examples |
|----------|---------|
| **Low (Warning)** | Uniform issue, first-time minor mistake |
| **Medium (Serious)** | Repeated mistake, minor argument with resident |
| **High (Critical)** | Physical fight, theft, unattended gate during peak hours |

**Fields:** Employee Name/ID · Behaviour Category · Incident Description · Media Upload · Auto Date & Time

---

## 10. HRMS Module

**Primary Access:** Admin, HOD, Society Manager, Account (Payroll)

| Feature | Details |
|---------|---------|
| **Recruitment** | Job Requisition → Application Entry → BGV (Police + Address Verification) → One-click Onboarding |
| **Employee Profile** | Personal Info, Blood Group, Emergency Contact, Job Details, Shift Assignment, Documents |
| **Smart Attendance** | Selfie check-in + Geo-Fencing (50m radius of assigned Company Location Master zone). Auto-punch-out on geo-fence exit. |
| **Leave Management** | Staff applies via app → Manager Approve/Reject → Real-time leave balance view. |
| **Payroll** | Earnings (Basic + HRA + Allowances + OT) − Deductions (PF + PT + ESIC). Auto-calculated from attendance. Digital payslip download. |
| **Documents** | Aadhar Card, PAN Card, Voter ID, PSARA Certificate (guards), Police Verification PDF |

---

## 11. UI Screens Per Role

> ⚠️ Screen list is inferred from scope. Finalize with UI/UX designer before implementation.

### 11.1 Super Admin
| Screen | Description |
|--------|-------------|
| Platform Dashboard | System-wide health: total companies, active buyers, total transactions |
| Admin Management | Create / suspend / manage Admin accounts |
| Role & Permission Manager | Full RBAC configuration panel |
| Audit Logs | Platform-level activity logs |
| System Configuration | Feature flags, geo-fence radius, alert thresholds |

### 11.2 Admin
| Screen | Description |
|--------|-------------|
| Admin Dashboard | Overview: pending requests, active orders, low stock alerts, recent feedback |
| Request Management | Incoming Buyer requests with Accept / Pending / Reject actions |
| Indent Management | Create and forward indents to suppliers |
| Purchase Order (PO) | Issue, track, and manage POs |
| Material Acknowledgment | Confirm received goods against PO |
| Supplier Management | Add/edit supplier profiles, view supplier-wise products and rates |
| Sale Bill Management | Generate sale bills for buyers, track payment status |
| Purchases Bill Management | Verify and settle supplier bills |
| Master Data (All) | CRUD for all master tables |
| HRMS Panel | Full employee management access |
| Reports & Analytics | Procurement, sales, inventory, HR, service performance reports |

### 11.3 Company MD
| Screen | Description |
|--------|-------------|
| Executive Dashboard | High-level KPIs: revenue, active services, pending approvals |
| Approval Queue | High-value or escalated requests requiring MD sign-off |
| Reports | Read-only access to all financial and operational reports |

### 11.4 Company HOD
| Screen | Description |
|--------|-------------|
| Department Dashboard | Department-specific request and staff overview |
| Request Submission | Submit internal requests on behalf of department |
| Staff Overview | View department staff, attendance, leave balance |
| Behaviour Ticket Review | View tickets raised against department staff |

### 11.5 Account
| Screen | Description |
|--------|-------------|
| Financial Dashboard | Pending bills, payments received, outstanding supplier dues |
| Purchases Bill | Verify and process incoming supplier bills |
| Sale Bill | Track buyer payments, update paid status |
| Payroll Processing | Run monthly payroll, download payslips, handle deductions |
| Rate Management | Edit Supplier Wise Product Rate and Sale Product Rate |
| Financial Reports | Ledger reports, payment history, margin analysis |

### 11.6 Storekeeper / Inventory Manager
| Screen | Description |
|--------|-------------|
| Inventory Dashboard | Current stock levels, low stock alerts, reorder notifications |
| Material Receipt | Log incoming deliveries, link to PO |
| Quality & Quantity Ticket | Raise material check tickets on delivery |
| Return to Vendor (RTV) | Initiate and track material returns |
| Stock Issue | Log parts/items issued to technicians or departments |
| Inventory Reports | Stock movement, wastage, expiry reports |

### 11.7 Site Supervisor
| Screen | Description |
|--------|-------------|
| Site Dashboard | Active deployments, pending acknowledgments, alerts at site |
| Service Acknowledgment | Verify deployed personnel against Delivery Note |
| Behaviour Ticket | Raise incident tickets for on-site staff |
| Staff Attendance View | View attendance and geo-fence status for site staff |
| Service Job Tracking | Monitor AC/Pest Control/Facility jobs at site |

### 11.8 Buyer (Admin)
| Screen | Description |
|--------|-------------|
| Buyer Dashboard | Active subscriptions, pending requests, expiring services, pending bills |
| New Order / Service Request | Material request or service deployment with service type, grade/role, headcount, shift, start date, duration, and site location |
| Active Services | List of ongoing deployments with full details |
| Order History | Past completed requests with status and feedback |
| Bills & Payments | View and pay Sale Bills |
| Feedback Submission | Rate completed services |
| Profile & Account Settings | Manage Buyer organization profile |

### 11.9 Supplier / Vendor
| Screen | Description |
|--------|-------------|
| Supplier Dashboard | Pending indents, active POs, bills to submit |
| Indent Management | View received indents, Accept / Reject with reason |
| Purchase Order Tracking | View received POs, update Dispatch status |
| Personnel Dispatch | Upload Delivery Note with staff names and credentials |
| Supplier Bill | Generate and submit bills against completed orders |
| Payment Status | Track Paid / Unpaid bill status |
| Profile | Manage company profile, service categories, products |

### 11.10 Security Guard (Mobile App)
| Screen | Description |
|--------|-------------|
| Home | Panic/SOS button, quick access to checklist and visitor entry |
| Attendance | Selfie check-in with geo-fence validation |
| Daily Checklist | Fill routine inspection questions with photo upload |
| Visitor Entry | Register guest details (Name, Photo, Phone, Vehicle) |
| Daily Visitor List | Manage frequent visitors (Maids, Drivers, etc.) |
| Emergency Contacts | One-tap dial directory |
| Leave Application | Apply for leave, view leave balance |

### 11.11 Security Supervisor
| Screen | Description |
|--------|-------------|
| Supervisor Dashboard | Guard activity summary, active alerts, checklist status |
| Guard Monitoring | Live GPS status of all assigned guards |
| Alert Log | History of panic alerts and inactivity alerts |
| Behaviour Ticket | Raise and manage incident tickets |
| Attendance Overview | View guard attendance logs |

### 11.12 Society Manager
| Screen | Description |
|--------|-------------|
| Manager Dashboard | Visitor stats, checklist status (Green/Red), panic logs, attendance |
| Visitor Management | View all visitor entries, manage society family database |
| Material Ticket | Raise quality/quantity check tickets on delivery |
| Behaviour Ticket | Raise incident tickets for staff |
| Service Requests | Log and track AC/Pest Control complaints |
| Company Events | Create and broadcast events to staff |
| Staff Attendance | View attendance for all site staff |

### 11.13 AC Technician (Mobile App)
| Screen | Description |
|--------|-------------|
| My Jobs | List of assigned service jobs with status |
| Job Detail | View job description, resident info, location |
| Job Execution | GPS Check-in → Before Photo → Log Parts Used → After Photo → Complete |
| Parts Request | Request spare parts from inventory |
| Attendance | Selfie check-in with geo-fence |
| Leave Application | Apply for leave |

### 11.14 Pest Control Technician (Mobile App)
| Screen | Description |
|--------|-------------|
| My Jobs | Scheduled and complaint-based job list |
| Job Detail | Treatment plan, chemical selection, resident instructions |
| PPE Checklist | Mandatory pre-job safety checklist (Masks, Gloves, Eye Protection, Aprons) |
| Job Execution | GPS Check-in → Before Photo → Log Chemical Used → After Photo → Complete |
| Chemical Request | Request chemicals from store |
| Attendance | Selfie check-in with geo-fence |

### 11.15 Service Boy (Mobile App)
| Screen | Description |
|--------|-------------|
| Attendance | Selfie check-in |
| My Tasks | Assigned housekeeping/pantry tasks for the day |
| Task Update | Mark task as complete |
| Leave Application | Apply for leave |

---

## 12. Notification & Alert Triggers

| # | Trigger Event | Sent To | Channel | Message |
|---|--------------|---------|---------|---------|
| 1 | Buyer submits Order Request | Admin | App + Email | New order request from [Buyer Name] |
| 2 | Admin accepts Order Request | Buyer | App + SMS | Request accepted, indent being prepared |
| 3 | Admin rejects Order Request | Buyer | App + SMS | Request [#ID] rejected with reason |
| 4 | Admin forwards Indent to Supplier | Supplier | App + Email | New indent received, please review and respond |
| 5 | Supplier accepts Indent | Admin | App | Supplier [Name] accepted Indent [#ID] |
| 6 | Supplier rejects Indent | Admin | App + Email | Supplier [Name] rejected Indent [#ID], action required |
| 7 | Admin issues PO | Supplier | App + Email | Purchase Order [#PO] issued, please confirm |
| 8 | Supplier dispatches goods | Admin, Storekeeper | App + SMS | Goods dispatched by [Supplier], expected delivery [Date] |
| 9 | Storekeeper acknowledges material | Admin | App | Material for PO [#PO] received and acknowledged |
| 10 | Bad Material flagged | Admin, Supplier | App + Email | Quality issue flagged for Batch [#], return ticket raised |
| 11 | Quantity shortage detected | Admin, Supplier | App + Email | Shortage of [X] units for PO [#PO], shortage note generated |
| 12 | Sale Bill generated for Buyer | Buyer | App + Email | Invoice [#INV] ready, amount due ₹[X] by [Date] |
| 13 | Buyer pays Sale Bill | Admin, Account | App | Payment received from [Buyer] for Invoice [#INV] |
| 14 | Guard triggers Panic / SOS | Society Manager, Committee | App + SMS (Immediate) | 🚨 SOS Alert! [Guard Name] at [GPS Location] |
| 15 | Guard inactivity detected | Society Manager, Supervisor | App | ⚠️ [Guard Name] has not moved for [X] minutes |
| 16 | Checklist not filled by deadline | Security Guard | App + SMS | Daily checklist pending, complete before [Time] |
| 17 | Visitor arrives at gate | Resident | App + SMS | [Visitor Name] is at the gate for Flat [#] |
| 18 | Leave application submitted | HOD / Society Manager | App | [Employee Name] applied for [Leave Type] [Date–Date] |
| 19 | Leave approved / rejected | Employee | App + SMS | Leave request [Approved/Rejected] |
| 20 | Low stock alert | Admin, Storekeeper | App + Email | [Product Name] below reorder level ([X] units remaining) |
| 21 | Chemical nearing expiry | Admin, Storekeeper | App + Email | [Chemical Name] Batch [#] expires on [Date] |
| 22 | Buyer service expiring soon | Buyer | App + Email | [Service Name] deployment ends in [X] days, renew now |
| 23 | Behaviour ticket raised | Admin, HOD | App | Behaviour ticket raised for [Employee Name], severity [Level] |
| 24 | Technician completes job | Society Manager, Admin | App | Job [#ID] completed by [Technician Name], review and close |
| 25 | Payslip generated | Employee | App + SMS | Payslip for [Month Year] is ready, download from app |
| 26 | Checklist submitted successfully | Security Supervisor, Society Manager | App | [Guard Name] completed daily checklist at [Time] |
| 27 | Deployment confirmed | Buyer, Admin | App + Email | [X] personnel deployed at [Site], deployment confirmed |
| 28 | Supplier bill submitted | Admin, Account | App | Supplier [Name] submitted Bill [#] for ₹[X], please review |

---

## 13. API Endpoints Per Module

> Base URL: `/api/v1`
> Auth: Bearer Token (JWT) required on all endpoints unless marked Public.
> ⚠️ Endpoints are inferred from scope. Finalize with backend architect.

### 13.1 Auth
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/auth/login` | Login, returns JWT | Public |
| POST | `/auth/logout` | Invalidate token | All |
| POST | `/auth/refresh` | Refresh JWT | All |
| POST | `/auth/forgot-password` | Send password reset link | Public |
| POST | `/auth/reset-password` | Reset password with token | Public |

### 13.2 User & Role Management
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/users` | List all users | Super Admin, Admin |
| POST | `/users` | Create new user | Super Admin, Admin |
| GET | `/users/:id` | Get user details | Super Admin, Admin |
| PUT | `/users/:id` | Update user | Super Admin, Admin |
| DELETE | `/users/:id` | Deactivate user | Super Admin |
| GET | `/roles` | List all roles | Super Admin, Admin |
| POST | `/roles` | Create role | Super Admin |
| PUT | `/roles/:id` | Update role permissions | Super Admin |

### 13.3 Master Data
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET/POST | `/master/product-categories` | List / Create product categories | Admin |
| GET/POST | `/master/product-subcategories` | List / Create subcategories | Admin |
| GET/POST | `/master/products` | List / Create products | Admin |
| GET/POST | `/master/suppliers` | List / Create suppliers | Admin |
| GET/POST | `/master/supplier-products` | Map supplier to products | Admin |
| GET/PUT | `/master/supplier-product-rates` | View / Update supplier rates | Admin, Account |
| GET/PUT | `/master/sale-rates` | View / Update sale rates | Admin, Account |
| GET/POST | `/master/services` | List / Create service categories | Admin |
| GET/POST | `/master/works` | List / Create work types | Admin |
| GET/POST | `/master/checklists` | List / Create checklist templates | Admin |
| GET/POST | `/master/locations` | List / Create company locations | Admin |
| GET/POST | `/master/leave-types` | List / Create leave types | Admin |
| GET/POST | `/master/holidays` | List / Create holidays | Admin |

### 13.4 Order & Procurement
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/orders` | List all orders (filterable by status) | Admin, Account |
| POST | `/orders` | Buyer submits new order request | Buyer |
| GET | `/orders/:id` | Get order details | Admin, Buyer |
| PUT | `/orders/:id/status` | Update order status (Accept/Reject/Pending) | Admin |
| POST | `/indents` | Generate indent from accepted order | Admin |
| GET | `/indents` | List all indents | Admin, Supplier |
| PUT | `/indents/:id/forward` | Forward indent to supplier | Admin |
| PUT | `/indents/:id/respond` | Supplier accepts or rejects indent | Supplier |
| POST | `/purchase-orders` | Issue PO to supplier | Admin |
| GET | `/purchase-orders/:id` | Get PO details | Admin, Supplier, Storekeeper |
| PUT | `/purchase-orders/:id/dispatch` | Supplier marks goods dispatched | Supplier |
| POST | `/material-acknowledgment` | Storekeeper acknowledges received goods | Admin, Storekeeper |

### 13.5 Billing & Payments
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/bills/supplier` | List supplier bills | Admin, Account, Supplier |
| POST | `/bills/supplier` | Supplier generates bill | Supplier |
| PUT | `/bills/supplier/:id/pay` | Mark supplier bill as paid | Admin, Account |
| GET | `/bills/sale` | List sale bills for buyers | Admin, Account, Buyer |
| POST | `/bills/sale` | Admin generates sale bill for buyer | Admin |
| PUT | `/bills/sale/:id/pay` | Buyer pays sale bill | Buyer |
| POST | `/feedback` | Buyer submits feedback | Buyer |
| GET | `/feedback` | View all feedback | Admin |

### 13.6 Inventory
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/inventory` | View current stock levels | Admin, Storekeeper |
| POST | `/inventory/receive` | Log incoming material receipt | Storekeeper |
| POST | `/inventory/issue` | Issue stock to technician or department | Storekeeper |
| GET | `/inventory/alerts` | Get low stock and expiry alerts | Admin, Storekeeper |
| POST | `/inventory/tickets/quality` | Raise bad material / quality ticket | Storekeeper, Society Manager |
| POST | `/inventory/tickets/quantity` | Raise quantity shortage ticket | Storekeeper, Society Manager |
| POST | `/inventory/return` | Initiate return to vendor (RTV) | Storekeeper |

### 13.7 HRMS
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/employees` | List all employees | Admin, HOD |
| POST | `/employees` | Create employee profile (onboard) | Admin |
| GET | `/employees/:id` | Get employee details | Admin, HOD |
| PUT | `/employees/:id` | Update employee profile | Admin |
| POST | `/attendance/checkin` | Geo-fenced selfie check-in | All Field Staff |
| POST | `/attendance/checkout` | Employee check-out | All Field Staff |
| GET | `/attendance` | View attendance records | Admin, HOD, Site Supervisor |
| POST | `/leaves/apply` | Employee applies for leave | All Staff |
| PUT | `/leaves/:id/respond` | Manager approves or rejects leave | Admin, HOD, Society Manager |
| GET | `/leaves/balance/:employeeId` | View leave balance | Employee, Admin |
| POST | `/payroll/run` | Run monthly payroll | Admin, Account |
| GET | `/payroll/payslip/:employeeId/:month` | Download payslip | Employee, Admin, Account |

### 13.8 Security Guard & Visitor
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/guard/panic` | Trigger SOS alert with GPS | Security Guard |
| POST | `/guard/checklist` | Submit daily checklist | Security Guard |
| GET | `/guard/checklist/:guardId` | View checklist submissions | Security Supervisor, Society Manager |
| GET | `/guard/alerts` | View inactivity and panic alert log | Security Supervisor, Society Manager |
| POST | `/visitors` | Register new visitor | Security Guard |
| GET | `/visitors` | View visitor log | Security Guard, Society Manager |
| GET | `/visitors/daily` | View frequent/daily visitor list | Security Guard |
| GET | `/residents` | Search resident/family database | Security Guard |

### 13.9 Service Jobs (AC / Pest Control / Facility)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/jobs` | Raise new service request / job | Society Manager, Buyer |
| GET | `/jobs` | List all jobs (filterable by type, status) | Admin, Site Supervisor |
| GET | `/jobs/:id` | Get job details | Admin, Technician, Society Manager |
| PUT | `/jobs/:id/assign` | Assign technician to job | Admin, Site Supervisor |
| PUT | `/jobs/:id/start` | Technician starts job (GPS + before photo) | AC Technician, Pest Control Technician |
| PUT | `/jobs/:id/complete` | Technician completes job (after photo) | AC Technician, Pest Control Technician |
| POST | `/jobs/:id/parts` | Log parts or chemicals used | AC Technician, Pest Control Technician |
| POST | `/jobs/:id/tickets` | Raise behaviour ticket linked to job | Society Manager, Site Supervisor |

### 13.10 Notifications
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/notifications` | List notifications for logged-in user | All |
| PUT | `/notifications/:id/read` | Mark notification as read | All |
| PUT | `/notifications/read-all` | Mark all as read | All |

---

## 14. Database Schema / Entities

> ⚠️ Schema is inferred from scope. Review with DBA before implementation.
> Convention: snake_case for columns. UUID primary keys recommended.

### 14.1 users
```sql
id             UUID PRIMARY KEY
name           VARCHAR(100)
email          VARCHAR(100) UNIQUE
phone          VARCHAR(20)
password_hash  TEXT
role_id        UUID → roles.id
is_active      BOOLEAN DEFAULT TRUE
created_at     TIMESTAMP
updated_at     TIMESTAMP
```

### 14.2 roles
```sql
id             UUID PRIMARY KEY
name           VARCHAR(50) UNIQUE   -- e.g. 'admin', 'buyer', 'guard'
permissions    JSONB                -- Array of permission keys
created_at     TIMESTAMP
```

### 14.3 employees
```sql
id                UUID PRIMARY KEY
user_id           UUID → users.id
employee_code     VARCHAR(50) UNIQUE
name              VARCHAR(100)
designation_id    UUID → designations.id
department        VARCHAR(100)
date_of_joining   DATE
shift             VARCHAR(50)
reporting_manager UUID → employees.id
blood_group       VARCHAR(10)
emergency_contact VARCHAR(20)
location_id       UUID → company_locations.id
is_active         BOOLEAN
```

### 14.4 products
```sql
id               UUID PRIMARY KEY
name             VARCHAR(100)
product_code     VARCHAR(50) UNIQUE
category_id      UUID → product_categories.id
subcategory_id   UUID → product_subcategories.id
unit             VARCHAR(20)        -- e.g. 'kg', 'litre', 'piece'
base_rate        DECIMAL(10,2)
reorder_level    INT
created_at       TIMESTAMP
```

### 14.5 suppliers
```sql
id               UUID PRIMARY KEY
name             VARCHAR(100)
contact_person   VARCHAR(100)
phone            VARCHAR(20)
email            VARCHAR(100)
address          TEXT
gst_number       VARCHAR(20)
payment_terms    INTEGER
credit_limit     DECIMAL(12,2)
rates            TEXT
availability     TEXT
is_active        BOOLEAN
created_at       TIMESTAMP
```

### 14.6 supplier_products
```sql
id             UUID PRIMARY KEY
supplier_id    UUID → suppliers.id
product_id     UUID → products.id
rate           DECIMAL(10,2)
effective_date DATE
```

### 14.7 orders
```sql
id             UUID PRIMARY KEY
buyer_id       UUID → users.id
order_type     ENUM('material','service')
status         ENUM('pending','accepted','rejected','indent_generated',
                    'po_issued','dispatched','delivered','billed','paid','end')
notes          TEXT
service_type   TEXT
service_grade  TEXT
headcount      INT
shift          VARCHAR(50)
start_date     DATE
duration_months INT
site_location_id UUID → company_locations.id
supplier_id    UUID → suppliers.id
indent_id      UUID → indents.id
created_at     TIMESTAMP
updated_at     TIMESTAMP
```

### 14.8 order_items
```sql
id           UUID PRIMARY KEY
order_id     UUID → orders.id
product_id   UUID → products.id
quantity     INT
unit         VARCHAR(20)
rate         DECIMAL(10,2)
```

### 14.9 indents
```sql
id             UUID PRIMARY KEY
order_id       UUID → orders.id
service_request_id UUID → orders.id
supplier_id    UUID → suppliers.id
status         ENUM('drafted','forwarded','accepted','rejected')
forwarded_at   TIMESTAMP
responded_at   TIMESTAMP
notes          TEXT
```

### 14.10 purchase_orders
```sql
id              UUID PRIMARY KEY
indent_id       UUID → indents.id
supplier_id     UUID → suppliers.id
po_number       VARCHAR(50) UNIQUE
status          ENUM('issued','received','dispatched','delivered')
issued_at       TIMESTAMP
dispatched_at   TIMESTAMP
delivered_at    TIMESTAMP
```

### 14.11 inventory
```sql
id             UUID PRIMARY KEY
product_id     UUID → products.id
location_id    UUID → company_locations.id
quantity       DECIMAL(10,2)
batch_number   VARCHAR(50)
expiry_date    DATE
updated_at     TIMESTAMP
```

### 14.12 inventory_transactions
```sql
id                UUID PRIMARY KEY
product_id        UUID → products.id
transaction_type  ENUM('receive','issue','return','adjustment')
quantity          DECIMAL(10,2)
reference_id      UUID              -- PO ID or Job ID
performed_by      UUID → users.id
notes             TEXT
created_at        TIMESTAMP
```

### 14.13 bills
```sql
id             UUID PRIMARY KEY
bill_type      ENUM('supplier','sale')
reference_id   UUID              -- order_id or indent_id
party_id       UUID → users.id   -- Buyer or Supplier
amount         DECIMAL(12,2)
status         ENUM('pending','paid')
due_date       DATE
paid_at        TIMESTAMP
created_at     TIMESTAMP
```

### 14.14 visitors
```sql
id              UUID PRIMARY KEY
name            VARCHAR(100)
phone           VARCHAR(20)
photo_url       TEXT
vehicle_number  VARCHAR(20)
flat_number     VARCHAR(20)
visit_purpose   TEXT
entry_time      TIMESTAMP
exit_time       TIMESTAMP
logged_by       UUID → users.id
```

### 14.15 guard_checklists
```sql
id           UUID PRIMARY KEY
guard_id     UUID → employees.id
template_id  UUID → checklist_masters.id
submitted_at TIMESTAMP
responses    JSONB             -- [{question_id, answer, photo_url}]
location_id  UUID → company_locations.id
```

### 14.16 panic_alerts
```sql
id               UUID PRIMARY KEY
guard_id         UUID → employees.id
latitude         DECIMAL(10,7)
longitude        DECIMAL(10,7)
triggered_at     TIMESTAMP
resolved_at      TIMESTAMP
resolution_note  TEXT
```

### 14.17 attendance
```sql
id           UUID PRIMARY KEY
employee_id  UUID → employees.id
date         DATE
check_in     TIMESTAMP
check_out    TIMESTAMP
selfie_url   TEXT
latitude     DECIMAL(10,7)
longitude    DECIMAL(10,7)
status       ENUM('present','absent','half_day','leave')
notes        TEXT
is_auto_punch_out BOOLEAN
```

### 14.18 leaves
```sql
id             UUID PRIMARY KEY
employee_id    UUID → employees.id
leave_type_id  UUID → leave_types.id
from_date      DATE
to_date        DATE
reason         TEXT
status         ENUM('pending','approved','rejected')
reviewed_by    UUID → users.id
created_at     TIMESTAMP
```

### 14.19 service_jobs
```sql
id              UUID PRIMARY KEY
job_type        ENUM('ac','pest_control','housekeeping','security','plantation')
location_id     UUID → company_locations.id
assigned_to     UUID → employees.id
status          ENUM('open','assigned','in_progress','completed','closed')
complaint_notes TEXT
before_photo    TEXT
after_photo     TEXT
started_at      TIMESTAMP
completed_at    TIMESTAMP
created_by      UUID → users.id
created_at      TIMESTAMP
```

### 14.20a horticulture_seasonal_plans
```sql
id              UUID PRIMARY KEY
month           VARCHAR(20)
title           VARCHAR(200)
description     TEXT
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### 14.20 behaviour_tickets
```sql
id           UUID PRIMARY KEY
employee_id  UUID → employees.id
raised_by    UUID → users.id
category     VARCHAR(100)
description  TEXT
media_url    TEXT
severity     ENUM('low','medium','high')
created_at   TIMESTAMP
```

### 14.21 notifications
```sql
id            UUID PRIMARY KEY
user_id       UUID → users.id
title         VARCHAR(200)
body          TEXT
type          VARCHAR(50)       -- 'panic', 'order', 'bill', 'leave', etc.
reference_id  UUID
is_read       BOOLEAN DEFAULT FALSE
created_at    TIMESTAMP
```

### 14.22 feedback
```sql
id          UUID PRIMARY KEY
order_id    UUID → orders.id
given_by    UUID → users.id
rating      INT               -- 1 to 5
comments    TEXT
created_at  TIMESTAMP
```

### 14.23 service_acknowledgments
```sql
id                  UUID PRIMARY KEY
spo_id              UUID → service_purchase_orders.id
acknowledged_by     UUID → users.id
headcount_expected  INT
headcount_received  INT
grade_verified      BOOLEAN DEFAULT FALSE
notes               TEXT
acknowledged_at     TIMESTAMP
created_at          TIMESTAMP
```

### 14.24 system_config
```sql
key          VARCHAR(100) PRIMARY KEY   -- e.g. 'guard_inactivity_threshold_minutes'
value        TEXT NOT NULL
description  TEXT
updated_by   UUID → users.id
updated_at   TIMESTAMP
```

---

## 15. Module-to-Role Access Matrix

> ⚠️ Matrix is inferred from scope. Confirm with stakeholders before production.
> **Legend:** ✅ Full Access · 👁 View Only · ❌ No Access

| Module | Super Admin | Admin | MD | HOD | Account | Storekeeper | Site Supervisor | Buyer | Supplier | Guard | Guard Supervisor | Society Manager | AC Tech | Pest Tech | Service Boy |
|--------|:-----------:|:-----:|:--:|:---:|:-------:|:-----------:|:---------------:|:-----:|:--------:|:-----:|:----------------:|:---------------:|:-------:|:---------:|:-----------:|
| Role & User Master | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Product / Supply Master | ✅ | ✅ | 👁 | 👁 | 👁 | 👁 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Supplier Master | ✅ | ✅ | 👁 | ❌ | 👁 | ❌ | ❌ | ❌ | 👁 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Order Requests | ✅ | ✅ | 👁 | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Indent Management | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Purchase Orders | ✅ | ✅ | ❌ | ❌ | ✅ | 👁 | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Inventory | ✅ | ✅ | 👁 | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | 👁 | 👁 | 👁 | ❌ |
| Material Tickets | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Billing (Supplier) | ✅ | ✅ | 👁 | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Billing (Buyer/Sale) | ✅ | ✅ | 👁 | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Service Deployment | ✅ | ✅ | 👁 | ❌ | ❌ | ❌ | ✅ | 👁 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Service Acknowledgment | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Service Jobs (AC/Pest) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Visitor Management | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Guard Checklist / Panic | ✅ | 👁 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | 👁 | 👁 | ❌ | ❌ | ❌ |
| Behaviour Tickets | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| HRMS (Profiles, Docs) | ✅ | ✅ | 👁 | 👁 | ❌ | ❌ | 👁 | ❌ | ❌ | 👁 | 👁 | 👁 | 👁 | 👁 | 👁 |
| Attendance | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Leave Management | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Payroll | ✅ | ✅ | 👁 | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | 👁 | 👁 | ❌ | 👁 | 👁 | 👁 |
| Reports & Analytics | ✅ | ✅ | ✅ | ✅ | ✅ | 👁 | 👁 | 👁 | 👁 | ❌ | 👁 | ✅ | ❌ | ❌ | ❌ |
| Platform Config | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Feedback | ✅ | 👁 | 👁 | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 16. Key Business Rules

1. **Geo-Fencing Enforcement** — Attendance check-in only works within 50m of the employee's assigned Company Location Master zone.
2. **Indent Before PO** — A Purchase Order cannot be issued without a prior accepted Indent.
3. **Material Acknowledgment Gate** — Admin/Storekeeper must acknowledge material receipt before a Purchases Bill can be processed.
4. **Bad Material Block** — Items flagged as "Bad" in the Quality Ticket are automatically blocked from entering inventory.
5. **Shortage Auto-Calculation** — `Shortage = Ordered Quantity − Received Quantity` is computed automatically; a Shortage Note is dispatched to the vendor.
6. **Feedback Required for Closure** — A transaction cannot reach `END` state without Buyer feedback being submitted.
7. **Supplier Rate vs Sale Rate** — Both procurement cost (Supplier Wise Rate) and selling price (Sale Product Rate) are maintained to protect margin visibility.
8. **Chemical Expiry Alerts** — Pest control chemicals must have expiry dates tracked; system auto-alerts before "Best Before" date.
9. **PPE Checklist Gate** — Pest Control Technician must complete the PPE checklist before a job can be set to `in_progress`.
10. **BGV Required for Onboarding** — Employee cannot be fully onboarded without Police Verification and Address Verification status being recorded.
11. **Single Active Deployment** — A guard or technician can only be actively deployed to one site at a time.
12. **Service Acknowledgment Required** — A Supplier Bill for a staffing/service deployment cannot be processed without a prior Service Acknowledgment from the Site Supervisor or Admin.
13. **OT Calculation** — Overtime is triggered only for hours logged beyond the standard shift defined in the employee's shift assignment.
14. **Inactivity Threshold Configurable** — Guard inactivity alert threshold is configurable by Super Admin (default: 30 minutes).
15. **Roles Not Finalized** — The role list is not fully confirmed by the client. New roles may be introduced. Ensure the RBAC system is extensible without schema changes.
