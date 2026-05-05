# FacilityPro — Product Requirements Document

> **Version:** 2.0
> **Updated:** 2026-05-04
> **Status:** Reflects the full implemented system as of this date.

---

# Scope

FacilityPro is a comprehensive Facility Management & Services platform engineered to digitize and streamline all core operational functions within an organization. The system provides a unified architecture for automating Company, Buyer, and Supplier workflows — ensuring a seamless flow of data from the initial service request through to final payment and feedback.

The platform connects multiple stakeholders in a single ecosystem: Company Administrators, Buyers, Suppliers, Security Guards, Residents, and specialized service personnel. It eliminates manual handling, reduces human error, and provides real-time visibility into resource allocation, procurement, workforce, and financial operations.

---

# Application Stakeholders

| Role | Portal / Entry Point | Primary Responsibility |
|------|---------------------|----------------------|
| **Super Admin** | Admin dashboard | Full system access, platform configuration, admin provisioning |
| **Admin** | Admin dashboard | Full CRUD across all modules; request management, indent generation, procurement |
| **Company MD** | MD dashboard | Executive overview, revenue analytics, YTD financials, growth forecasting |
| **Company HOD** | HOD dashboard | Workforce management, service requests, ticket oversight |
| **Account** | Accounts dashboard | Financial operations, supplier bills, buyer invoices, reconciliation |
| **Storekeeper** | Storekeeper dashboard | GRN management, stock alerts, RTV tickets, shortage notes |
| **Site Supervisor** | Site Supervisor dashboard | Active deployments, personnel dispatches, incidents, attendance oversight |
| **Delivery Boy** | Delivery dashboard | Material arrival logging with photo and vehicle capture |
| **Buyer** | Buyer portal (`/buyer`) | Submit service and material requests, track invoices, provide feedback |
| **Supplier / Vendor** | Supplier portal (`/supplier`) | Respond to indents, manage POs, submit bills, upload delivery notes |
| **Security Guard** | Guard interface | Panic alerts, daily checklists, visitor logging, GPS clock-in |
| **Security Supervisor** | Supervisor dashboard | Guard oversight, attendance, ticket management |
| **Society Manager** | Society Manager dashboard | Visitor stats, checklist status, panic logs, live guard map |
| **Service Boy** | Service Boy interface | Job sessions, GPS tracking, before/after photo evidence |
| **AC Technician** | AC Technician dashboard | AC service requests, certifications panel, PPE checklist, inventory |
| **Pest Control Technician** | Pest Control Technician dashboard | Chemical expiry alerts, PPE checklist, pest control requests |
| **Resident** | Resident portal | Visitor invitations, flat details, family directory |

---

# Master Data

## Company Module

### 1. Role Master
Defines user roles and system-wide access levels. Controls which actions a user can perform across all modules.

### 2. Designation Master
Manages official job titles and positions within the organization. Used for employee profile assignment and payroll calculations.

### 3. Employee Master
Manages all internal staff records. Stores personal details, department, designation, shift assignment, and document uploads. Supports the full HRMS lifecycle from recruitment to payroll.

### 4. User Master
Creates and manages system user accounts linked to Supabase Auth. Enforces role-based access control. Admins can provision new users with a temporary password and a structured invitation link. Supports the `must_change_password` flag for first-login enforcement.

### 5. Company Location Master
Registers all physical sites — gates, wings, clubhouse, basement parking — with GPS coordinates. Used by the geo-fencing system to validate that employees are physically on-site before clocking in.

---

## Supply Module Master

### 6. Product Category
Defines high-level classifications for all products in the inventory (e.g., Cleaning Essentials, Pest Control Materials, AC Spare Parts).

### 7. Product Subcategory
Sub-level classification nested under a Product Category for more granular organization.

### 8. Product Master
Full product library with Name, Product Code, Unit of Measurement, and rate display. Foundation for all procurement and inventory operations.

### 9. Supplier Master
Full vendor profile: contact info, banking details, payment terms, credit limit, service rates, and product availability. Suppliers self-manage their profile from the Supplier Portal.

### 10. Supplier Wise Products
Maps which products from the Product Master are supplied by which specific vendor. Filters eligible suppliers when raising a purchase indent.

### 11. Supplier Wise Product Rate
Pre-negotiated purchase costs per product per supplier. Used during indent generation and bill reconciliation to validate pricing.

### 12. Sale Product Rate
The fixed selling price for every item in the Product Master. Acts as the counterpart to the Supplier Wise Product Rate — defines the margin between procurement cost and sale price. Linked to Product Category and Product Master.

---

## Services Module Master

### 13. Daily Checklist Master
Defines routine inspection points for Security, Housekeeping, and Maintenance. Stores yes/no and value-based questions (e.g., "Is the water motor pump working?", "Are all fire exits clear?"). Guards complete this daily from their interface with optional photo evidence.

### 14. Vendor Wise Services Master
Links each vendor to the specific service categories they are authorized to handle. Ensures that when a request is raised for "AC Repair," only vendors tagged for "Technical Services" are shown — not Plantation vendors.

### 15. Work Master
A library of all possible task types (job types) that can be performed: "Filter Cleaning," "Gas Top-up," "Lawn Mowing," "Chemical Spraying." Each is tracked as a separate line item on a job.

### 16. Services Wise Work Master
Maps specific Work items to a broader Service Category. Example: under "Pest Control," it maps "Fogging," "Gel Application," and "Chemical Spraying."

---

## HRMS Module Master

### 17. Leave Type Master
Defines categories of time-off: Sick Leave, Casual Leave, Paid Leave — with yearly quotas and carry-forward rules.

### 18. Holiday Master
Pre-defined national and regional holidays for the calendar year. Used by the payroll engine to calculate public holiday pay and overtime for on-duty staff.

### 19. Company Events
Scheduling tool for society meetings, training sessions, and emergency drills. Captures date, time, venue, and notifies relevant staff.

---

# Services

## 1. Facility Management & Security Services

### Grade-Based Guard Deployment
Guards are categorized by physical fitness, education, and salary:
- **Grade A/B:** High-end corporate or luxury residential (premium skills)
- **Grade C/D:** Industrial or general perimeter security (basic skills)

**Specialized Personnel:**
- Gunman: Licensed armed personnel for high-risk assets
- Door Keeper: Focused on hospitality, access control, and visitor management

**Soft Services (Staffing):**
- Housekeeping: Professional cleaning and maintenance staff
- Pantry: Trained personnel for office cafeterias and executive dining
- Office Boys/Girls: Support staff for administrative assistance

### Security Command Center
Admin-facing view showing live guard list with grade filter and GPS tracking. Provides real-time visibility into guard positions and deployment status.

---

## 2. AC Services

### Technical Staff Management
- **Skill Mapping:** Categorize AC technicians by expertise (Centralized Plant, Split AC, Window AC, Gas Charging Specialist)
- **Certifications:** Store technical diplomas and safety training certificates per technician
- **Attendance & Geo-Fencing:** Technicians clock in at specific society sites with selfie + GPS validation

### Equipment Supply (Inventory)
- **Stock Master:** Track refrigerant gas (R32/R410), capacitors, copper pipes, filters, remote controls
- **Purchase Orders:** Raise vendor requests when stock falls below reorder level
- **Issue to Staff:** Record which technician took which part for which job
- **Reorder Alerts:** Automatic notification when essential spare parts drop below reorder level

### Service & Maintenance Workflow
1. Resident or Manager logs a complaint (e.g., "AC not cooling")
2. Technician is assigned and clicks **Start Work** (captured with GPS)
3. Technician uploads **Before** photo
4. Technician replaces parts (linked to Equipment Supply)
5. Technician uploads **After** photo and clicks **Complete**
6. Job session is closed with photo evidence persisted

---

## 3. Pest Control Services

### Technical Staff Management
- **Certification Storage:** Licenses for handling hazardous chemicals (mandatory)
- **PPE Checklist:** Before starting a job, technician checks off Masks, Gloves, Eye Protection, Aprons in the app. Submission is written to the database.
- **Attendance with Photo & GPS:** Technician must be physically at the treatment site (e.g., Basement B2 or Wing A Garden)

### Pest Control Material
**Chemical Stock Master:**
- Insecticides/Pesticides (Deltamethrin, Imidacloprid)
- Rodenticides (rat bait stations, glue pads)
- Anti-termite solutions

**Material Controls:**
- **Request & Approval:** Technicians request a specific quantity; Manager approves. System deducts from main store.
- **Expiry Alerts:** Automated notifications when a chemical batch is nearing its "Best Before" date. Banner displayed on the pest control dashboard for chemicals expiring within 30 days.
- **Spill Kit Inventory:** Tracks absorbent materials (clay, sawdust) and neutralizers in storage

### Service Workflow
**Scheduled Services (General Pest Control):**
- Recurring calendar for common areas (monthly for drains, quarterly for building perimeter)
- Technicians upload Before/After photos of treated areas

**Complaint-Based Service (Specific Infestation):**
1. Resident raises a ticket for "Bed Bugs" or "Cockroaches"
2. Technician selects treatment type (Fogging, Spraying, Gel Application)
3. System automatically sends SMS/push notification to the resident: "Pest control scheduled for today at 4 PM. Please keep kids/pets away and cover all food items."

---

## 4. Plantation Services

### Operations
- Task and zone management with soil health and greenery density tracking per zone
- Seasonal planner for maintenance scheduling
- Horticulture inventory connected to the central stock system

---

## 5. Printing & Advertising Services

### Internal Printing (Operations)
- **Visitor Passes:** For long-term visitors or contractors
- **ID Cards:** For staff, linked to the Employee Profile
- **Notices:** Standard templates for water cut alerts, meeting minutes

### Advertising Management
- **Ad-Space Master:** Manages physical ad locations (lift posters, notice boards, entry gate banners)
- **Ad Booking Workflow:** Book available ad spaces with date range and client details. Revenue is tracked per booking.

---

# Security Guard Monitoring System

## I. Instant Panic Response
- **Purpose:** Immediate alert for high-risk situations (medical, fire, theft)
- **Trigger:** Prominent panic button on the Guard interface
- **Action:** Sends instant notification to Society Manager Dashboard + SMS/push to Security Supervisors
- **GPS Capture:** Guard's exact location captured at the time of alert
- **Resolution:** Supervisor acknowledges the alert and records `resolved_by`

## II. Daily Operational Checklist
- Guards complete checklist items daily via the app
- Items include: parking lights ON/OFF time, water supply motor status, gate/shutter lock verification
- Photo evidence option per checklist item
- **Checklist Reminder:** If not filled by 9:00 AM, an automatic SMS reminder is sent to the guard (automated via edge function)

## III. Inactivity Alert System
- **Static Alert:** If a guard's GPS location does not change for a configurable period (default: 30 minutes), the system triggers an "Inactivity Alert" to the Manager
- **Configurable Threshold:** The `guard_inactivity_threshold_minutes` value is stored in `system_config` and can be changed by Admin without a deployment
- **Edge Function:** `check-guard-inactivity` + `inactivity-monitor` run continuously

## IV. Emergency Contact Directory
Quick-dial list within the Guard interface:
- Police: Local station direct line
- Fire Brigade: Nearest fire station
- Ambulance: Local hospital or society-tied medical services
- Electrician/Plumber: For society-wide emergencies

---

# Visitor Management System

## I. Add Visitor Information
- **Guest Entry:** Capture Name, Photo, Phone Number, Vehicle Number
- **Daily Visitor (Frequent):** Separate database for recurring staff — maids, drivers, milkmen, car cleaners
- **Vendors & Contractors:** Separate category with longer-duration tracking
- **Family Directory:** Searchable list of flat owners and family members (privacy-safe view — guards cannot see full personal details)

## II. Society Family Database
- **Data Structure:** Flat Number, Owner/Tenant Name, Primary & Secondary Mobile Numbers
- **Resident Directory:** Guards can verify which flat a visitor is going to without exposing full resident details

## III. Notification System
- **Automated SMS:** "Dear Resident, [Visitor Name] is at the gate for [Flat No]."
- **Push Notifications:** If the resident has the app, a pop-up alert with the visitor's photo is sent instantly
- **Resident Approval:** Resident can approve or deny the visitor from their portal

## IV. Society Manager Dashboard
- **Visitor Stats:** Total entries per day/week, category breakdown
- **Checklist Status:** Green/Red indicators for completed or pending daily checklist items
- **Panic Logs:** History of SOS alerts with resolution notes
- **Staff Attendance:** Clock-in/clock-out times for security personnel
- **Live Guard Map:** Real-time GPS positions of active guards

---

# HRMS — Human Resource Management System

## I. Recruitment Process
Tracks a candidate from "Applicant" to "Hired Staff":
1. **Job Requisition:** Manager posts a requirement (e.g., "Need 2 Night Shift Guards")
2. **Application Entry:** Capture basic details, source (Agency/Referral), interview status
3. **Background Verification (BGV):** Status tracking for Police Verification, Address Verification, Education Verification, Employment Verification. BGV panel visible on candidate record when candidate reaches `background_check` stage.
4. **Onboarding:** One-click conversion from Candidate → Employee

## II. Employee Profile
- Personal Info: Full name, Blood Group, Date of Birth, Emergency Contact
- Job Details: Employee ID, Designation, Date of Joining, Reporting Manager
- Shift Assignment: Mapped to specific shift timings
- **Specialized Profiles:** Additional profile data for Technicians and Guards (certifications, grade, assigned location)

## III. Smart Attendance & Geo-Fencing
- **Selfie Attendance:** Employee takes a photo via the app to clock in
- **Geo-Fencing:** Check-in button only works within a configurable radius of the registered Company Location (validated using haversine distance calculation)
- **Shift Compliance:** Cross-validates actual clock-in time against the employee's assigned shift start time. Late minutes are tracked per employee.
- **Auto-Punch Out:** If an employee is idle past their shift end without clocking out, the system auto-punches them out and flags `is_auto_punch_out`. Records `absent_breach` if applicable. Runs automatically via `pg_cron` at 1 AM daily.

## IV. Employee Documents
- Identity Proofs: Aadhar Card, PAN Card, Voter ID
- Security Licensing: PSARA training certificates (for guards)
- Police Verification Report: Mandatory PDF upload
- Document Expiry Alerts: Automated notification when compliance documents are nearing expiry

## V. Employee Leave
- **Leave Application:** Staff applies via their dashboard
- **Approval Workflow:** Manager receives a notification to Approve or Reject based on staff availability
- **Leave Balance:** Real-time view of remaining Sick/Casual leaves
- **Leave Config:** Leave types and quotas are configurable by Admin

## VI. Employee Payroll
- **Earnings:** Basic Salary + HRA + Special Allowance + Overtime (OT)
- **Deductions:** PF (Provident Fund), PT (Professional Tax), ESIC
- **Attendance Integration:** Salary automatically calculated from "Present Days" in the Smart Attendance module using `log_date`-backed summaries
- **Payslip Generation:** Monthly payslips generated via `generate_payroll_cycle()` RPC. Staff can download their payslip directly.
- **OT Calculation:** Overtime hours calculated from attendance logs against shift boundaries

---

# Inventory & Procurement

## Buyer Workflow

### Order Request
1. Buyer logs into the Buyer Portal and selects a **Service Category** (Security Services, Housekeeping, AC Repair, etc.) or a **Material Category** (Cleaning Essentials, Stationery, etc.)
2. **For Services:** Buyer selects Grade/Role, specifies headcount, shift timings, start date, deployment duration, and site location
3. **For Materials:** Buyer selects products, quantities, and delivery location
4. Request is submitted to Company Admin for review

### Buyer Dashboard
- **Active Subscriptions:** Count of ongoing service deployments
- **Pending Requests:** Requests awaiting Admin approval or Vendor assignment
- **Expiring Soon:** Services nearing end of deployment duration — prompts for renewal
- **Active Services Detail:** Service Category & Role, Headcount, Shift Timings, Start/End Date, Assigned Personnel
- **Pending Bills:** Direct access to unpaid Sale Bills needing payment
- **Quick Actions:** Renew Service, Cancel Service, Raise Ticket for an active deployment
- **Service History:** Past completed services with feedback ratings

---

## Company Admin Workflow

### Request Management
Admin receives incoming buyer requests and takes one of three actions:
- **Accept:** Moves the request into the procurement phase
- **Pending:** Places the request on hold for further review
- **Reject:** Formally denies the request (notification sent to buyer)

### Indent Generation
Once a request is accepted, Admin converts it into a formal indent:
- **Material Indent:** Specifies exact products, quantities, and target supplier
- **Service Indent:** Specifies service type, grade/role, headcount, shift, and duration. Admin matches the request to a supplier from the Vendor Wise Services Master.
- **Forward Indent:** Admin forwards the indent to the chosen supplier

### Purchase Orders
After supplier accepts the indent:
- Admin issues a formal **Company Purchase Order (PO)** for materials
- Admin issues a formal **Service Purchase Order (SPO)** for staffing/service deployments
- System tracks order lifecycle: Received PO → Dispatched → Delivered

### GRN (Goods Received Note)
Upon material delivery:
- Storekeeper performs **Quality Check** (Good / Damaged / Expired / Leaking) with mandatory photo evidence
- Storekeeper performs **Quantity Check** — system auto-calculates shortage (Ordered − Received)
- If approved: items enter the inventory
- If rejected: a Return to Vendor (RTV) ticket is created

---

## Supplier Workflow

### Indent Response
1. Supplier receives indent notification
2. Reviews their personnel/product availability
3. Responds: **Indent Accept** or **Indent Reject** (cites lack of availability)

### Service Deployment
1. Supplier updates status to **Personnel Dispatched**
2. Supplier uploads a digital **Service Delivery Note** — includes names and credentials of deployed staff
3. Admin or Site Supervisor performs **Service Acknowledgment**: verifies headcount and skill level match the requested grade
4. Status: **Deployment Confirmed**

### Billing & Payment
1. Supplier submits **Supplier Bill** within the system based on Supplier Wise Service/Product Rate
2. System generates a unique bill number via `generate_bill_number()` RPC
3. Supplier uploads supporting documents to storage
4. Admin reconciles bill against GRN/Service Acknowledgment
5. Admin marks bill as **Paid** — completing the financial obligation to the supplier

---

## Financial Closure & Quality Audit

### Reconciliation
The reconciliation engine performs 3-way matching: **PO ↔ GRN ↔ Supplier Bill**. Mismatches are flagged for Admin review before payment approval.

### Buyer Invoicing
1. Admin generates a **Sale Bill** for the Buyer linked to the accepted request and society
2. Sale Bill has a unique invoice number generated by `sale_invoice_seq`
3. Buyer sees their invoices in the Buyer Portal filtered by their society
4. Buyer makes payment → Admin marks **Sale Bill Paid**

### Feedback (End of Cycle)
After the bill is marked Paid, the Buyer is prompted to rate performance:
- Security: Was the guard's conduct satisfactory? Was the grade level correct?
- Staffing: Was the housekeeping staff punctual?
- Materials: Was the quality as expected?

The request officially reaches **END** state only after feedback is submitted and the bill is settled.

---

## Status Tracking

### Request Status Flow
```
Order Request → accepted / pending / rejected
  → (accepted) material_received / po_received / po_dispatched
  → (delivered) invoice_generated
  → (paid) feedback_pending
  → (feedback submitted) completed
  → cancelled (at any stage before completion)
```

### Financial States
- **Supplier Bill:** `pending` → `approved` → `paid`
- **Sale Bill (Buyer Invoice):** `generated` → `paid`

### Logistics States
- `Indent Forward` → Demand formalized and sent to supplier
- `Received PO` → Supplier has received the Purchase Order
- `Dispatch PO` → Goods/staff are en route
- `Material Received` → GRN completed, items in inventory

---

# Ticket Generation System

## Employee Behaviour Tickets
**Created by:** Society Manager or Supervisor

**Ticket Fields:**
- Employee Name/ID (dropdown of registered staff)
- Category: Sleeping on Duty / Rudeness / Absence from Post / Grooming & Uniform / Unauthorized Entry
- Incident Description: Detailed notes on the incident
- Media Upload: Photo evidence
- Date & Time: Auto-captured
- Severity: Low (Warning) / Medium (Serious) / High (Critical)

---

## Quality & Quantity Tickets (GRN-Linked)

**Quality Check:**
- Condition Status: Good / Damaged / Expired / Leaking
- Photo Evidence: Mandatory upload of damaged item or expiry label
- Batch Number: To track faulty lots from a vendor
- If marked Bad: Item is flagged as non-usable and blocked from entering inventory

**Quantity Check:**
- Ordered Quantity vs. Received Quantity
- Shortage: Automatically calculated (Ordered − Received)
- System generates a **Shortage Note** sent to the vendor

---

## Return to Vendor (RTV) Tickets
If material fails quality or quantity checks, an RTV ticket is raised:
- Reason for Return: Wrong Item / Damaged / Quality Not as per Sample
- Status tracked from creation through vendor resolution
- Realtime subscription keeps the dashboard live

---

# Asset Management

## Asset List & Detail
Full inventory of company-owned assets with status tracking, maintenance history, and linked service requests.

## Asset Categories
Hierarchical category management for asset classification.

## Asset Maintenance
- Scheduled maintenance based on due dates
- Due schedules can create linked service requests
- `markAsPerformed` only advances the schedule after a completed linked service request exists — preventing false maintenance records

## QR Code System
- Batch QR code generation for assets
- `/scan/[id]` landing pages record each scan and resolve the linked asset
- Scanner support via `html5-qrcode`

---

# Warehouses
Multi-warehouse inventory management. Stock levels are tracked per warehouse location.

---

# Reports & Analytics

## Attendance Reports
Attendance analytics derived from real attendance log data — present days, late arrivals, absent breach incidents.

## Financial Reports
- KPI cards: YTD Collected, Outstanding AR, Profit Retention, Net Margin
- Revenue Distribution (Pie Chart)
- Monthly Profitability trend (Area Chart)

## Inventory Reports
Stock level analytics, reorder alerts, consumption trends.

## Service Reports
Service request analytics — open vs. closed, average resolution time, overdue requests by priority.

---

# Finance Module

## Financial Reconciliation
3-way matching engine that reconciles Purchase Orders, Goods Received Notes, and Supplier Bills. Mismatches are surfaced before payment approval.

## Compliance Tracking
Monitors document expiry dates (PSARA licenses, police verification reports). Automated alerts sent before expiry. Compliance percentage visible on MD Dashboard.

## Performance Audit
Vendor performance metrics — on-time delivery rate, quality rejection rate, billing accuracy.

## Budgeting
Budget management per department or cost center. Budget vs. actual tracking.

## Financial Closure
Month-end or period closure workflows — locks the ledger for a period after all bills and invoices are reconciled.

## Payment Tracking
Unified view of all payment statuses — supplier bills pending payment, buyer invoices awaiting settlement.

---

# Notifications System

All platform events emit in-app notifications. Notifications are stored in the `notifications` table and delivered via:
- **In-app notification bell** (realtime subscription, badge count, mark-as-read)
- **SMS** via MSG91 (`send-notification` edge function)
- **Push notifications** via Firebase Cloud Messaging (FCM)

**Sources that produce notifications:**
- Panic alerts and supervisor acknowledgments
- Visitor check-ins and resident approvals
- Service request status changes
- Purchase order, GRN, and billing milestones
- Chemical expiry warnings
- Guard inactivity alerts
- Checklist reminders

**Notification priorities:** `normal` / `high` / `critical`

**Settings Page:** Admins can view the live notification feed, operational thresholds (checklist escalation %, geo-fence radius, guard inactivity threshold), and mark all notifications as read.

---

# Admin Portal

## Society & Building Management
Admin manages societies (residential complexes or corporate facilities) and their building/block structure. Each society can have multiple buildings, each building has configurable floors and units.

## Guards Management
Admin-side roster of all security guards — grade, assigned location, active/inactive status.

## Audit Logs
Complete system audit trail — who did what, when, on which record. Searchable by actor, action type, and entity.

## Platform Configuration
Key-value store for runtime settings. Values editable by Admin without a deployment:
- `guard_inactivity_threshold_minutes`
- `default_geo_fence_radius_meters`
- `checklist_completion_alert_threshold_percent`

## Admin Provisioning
Super Admins can invite new Admins by generating a temporary password and a structured setup link. The new Admin must change their password on first login (`must_change_password` flag).

## Waitlist Management
Review and approve incoming sign-up requests from the landing page.

---

# Resident Portal

## Resident Dashboard
- Flat details and occupancy information
- Visitor invitation management
- Family directory access
- Pending visitor approvals

## Visitor Approval
When a visitor arrives at the gate, the resident receives an SMS and push notification with the visitor's photo. The resident can approve or deny entry directly from the portal.

---

# Edge Functions (Automated Backend)

| Function | Trigger | Purpose |
|----------|---------|---------|
| `send-notification` | On demand | SMS via MSG91 + Push via FCM |
| `check-document-expiry` | Daily (pg_cron) | Flag compliance documents nearing expiry |
| `check-guard-inactivity` | Continuous | Detect guards with static GPS position |
| `inactivity-monitor` | Continuous | Broader inactivity monitoring |
| `check-checklist` | On submission | Verify daily checklist completion |
| `check-incomplete-checklists` | Scheduled | Flag checklists not filled by threshold time |
| `checklist-reminders` | Scheduled (9 AM) | Send reminder SMS to guard if checklist unfilled |
| `auto_punch_out_idle_employees` | pg_cron (1 AM daily) | Auto-punch out employees who did not clock out |

---

# Mobile & PWA

The Guard interface is optimized as a Progressive Web App (PWA):
- `public/manifest.json` with `start_url: /guard`, `display: standalone`
- Service worker with NetworkFirst caching for Supabase API routes
- Installable on Android/iOS home screen

---

# Role-to-Module Access Matrix

| Module | Admin | MD | HOD | Account | Storekeeper | Site Sup | Buyer | Supplier | Guard | Society Mgr | Service Boy | AC Tech | Pest Tech | Resident |
|--------|-------|----|----|---------|-------------|----------|-------|----------|-------|-------------|-------------|---------|-----------|----------|
| Company Master Data | ✅ | — | ✅ | — | — | — | — | — | — | — | — | — | — | — |
| Inventory / Products | ✅ | — | — | — | ✅ | — | — | — | — | — | — | ✅ | ✅ | — |
| Purchase Orders | ✅ | — | — | ✅ | ✅ | — | — | ✅ | — | — | — | — | — | — |
| GRN | ✅ | — | — | — | ✅ | — | — | — | — | — | — | — | — | — |
| Service Requests | ✅ | — | ✅ | — | — | ✅ | — | — | — | — | ✅ | ✅ | ✅ | — |
| Buyer Portal | — | — | — | — | — | — | ✅ | — | — | — | — | — | — | — |
| Supplier Portal | — | — | — | — | — | — | — | ✅ | — | — | — | — | — | — |
| Finance | ✅ | ✅ | — | ✅ | — | — | — | — | — | — | — | — | — | — |
| HRMS | ✅ | — | ✅ | — | — | — | — | — | — | — | — | ✅ | ✅ | — |
| Attendance | ✅ | — | ✅ | — | — | ✅ | — | — | ✅ | ✅ | — | ✅ | ✅ | — |
| Tickets | ✅ | — | ✅ | — | ✅ | ✅ | — | — | ✅ | ✅ | — | — | — | — |
| Society / Visitors | ✅ | — | — | — | — | ✅ | — | — | ✅ | ✅ | — | — | — | — |
| Assets | ✅ | — | ✅ | — | ✅ | — | — | — | — | — | — | — | — | — |
| Reports | ✅ | ✅ | — | ✅ | — | — | — | — | — | — | — | — | — | — |
| Resident Portal | — | — | — | — | — | — | — | — | — | — | — | — | — | ✅ |
| Admin Settings | ✅ | — | — | — | — | — | — | — | — | — | — | — | — | — |
