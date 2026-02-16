# 🗺️ STAKEHOLDER MAP — FacilityPro

> **Rule:** No page or hook shall be created without knowing which role it belongs to.

---

## Role Registry

The `user_role` enum in the deployed DB defines **13 values** (including `vendor` as alias for `supplier`, plus `resident`).
The PRD defines 11 stakeholders. They map 1:1, with `resident` as a limited external actor (see below).

| # | PRD Name | DB Enum Value | Category |
|---|---|---|---|
| 1 | Admin | `admin` | Company Staff |
| 2 | Company MD | `company_md` | Company Staff |
| 3 | Company HOD | `company_hod` | Company Staff |
| 4 | Account | `account` | Company Staff |
| 5 | Delivery Boy | `delivery_boy` | Field Staff |
| 6 | Buyer | `buyer` | External Stakeholder |
| 7 | Supplier/Vendor | `supplier` / `vendor` | External Stakeholder |
| 8 | Security Guard | `security_guard` | Field Staff |
| 9 | Security Supervisor | `security_supervisor` | Field Staff |
| 10 | Society Manager | `society_manager` | Client Stakeholder |
| 11 | Service Boy | `service_boy` | Field Staff |

### ⚠️ Special Actor: RESIDENT (`resident`)

> **Resident = Limited external actor.**
> - No full system login required for most interactions
> - Acts **only** via secure link / SMS response / single-screen app view
> - Cannot see system state beyond the single action they are performing
> - **Do NOT build a full "Resident Portal"** — Resident interactions are:
>   - Confirm/deny visitor entry (via SMS reply or app tap)
>   - Trigger Panic Alert (SOS button)
>   - View own flat info (limited My Flat page)
>   - Invite visitors (pre-authorization)

---

## Per-Role Action Matrix

### 1. ADMIN (`admin`)

**Purpose:** Platform super-user. Manages company, staff, procurement, and financial closure.

| Can Do | Cannot Do |
|---|---|
| ✅ Manage all master data (roles, designations, products, suppliers) | ❌ **Cannot bypass state-machine order** (see rule below) |
| ✅ Accept/Reject/Pending incoming Buyer requests | |
| ✅ Generate Indents from accepted requests | |
| ✅ Forward Indents to Suppliers | |
| ✅ Issue Purchase Orders (PO) | |
| ✅ Acknowledge Material Receipt (vs PO) | |
| ✅ Process Supplier Bills, Generate Buyer Invoices | |
| ✅ Mark bills as Paid (both sides) | |
| ✅ Check Feedback from Buyer | |
| ✅ Manage employees, attendance, payroll | |
| ✅ Manage all services (AC, Pest, Printing, Plantation) | |
| ✅ View all reports and analytics | |

**Entry Points:** Dashboard → All modules
**Exit Conditions:** Financial closure (Bill Paid + Feedback) completes a cycle

> ⚠️ **GOVERNANCE RULE:** Admin MAY NOT bypass state-machine order.
> Admin can *act at any transition point*, but only at PRD-defined transition points.
> Admin power = "can act at every step" ≠ "can skip steps."
> Examples of **ILLEGAL** admin actions:
> - Creating a PO without an approved indent
> - Marking a bill as paid without reconciliation
> - Setting status to `completed` without buyer feedback
> - Directly jumping from `pending` to `material_received`

---

### 2. COMPANY MD (`company_md`)

**Purpose:** Strategic oversight. Read-heavy, approve-only.

| Can Do | Cannot Do |
|---|---|
| ✅ View all dashboards and reports | ❌ Create/edit master data directly |
| ✅ Approve high-value POs (threshold-based) | ❌ Perform day-to-day CRUD operations |
| ✅ View financial summaries, budgets, closure status | ❌ Manage field staff directly |
| ✅ View and approve budget overrun alerts | |
| ✅ View performance audits | |

**Entry Points:** Executive Dashboard (read-only analytics)
**Exit Conditions:** Approval or rejection of escalated items

---

### 3. COMPANY HOD (`company_hod`)

**Purpose:** Departmental manager. Manages their domain operations.

| Can Do | Cannot Do |
|---|---|
| ✅ Manage employees within their department | ❌ Cross-department employee management |
| ✅ Approve leave applications | ❌ Financial closure actions |
| ✅ Generate service requests for their department | ❌ Approve POs above their threshold |
| ✅ View department-level reports | |
| ✅ Manage assets assigned to their department | |
| ✅ Create behavior tickets for staff | |

**Entry Points:** Department Dashboard
**Exit Conditions:** Task completion at department level

---

### 4. ACCOUNT (`account`)

**Purpose:** Finance specialist. Bills, payments, reconciliation.

| Can Do | Cannot Do |
|---|---|
| ✅ View/manage Supplier Bills | ❌ Accept/Reject buyer requests |
| ✅ View/manage Buyer Invoices | ❌ Generate Indents or POs |
| ✅ Process payments (both directions) | ❌ Manage employees or attendance |
| ✅ Run reconciliation matching | ❌ Modify master data |
| ✅ View financial reports | |
| ✅ Manage budget alerts | |
| ✅ Handle payment gateway | |

**Entry Points:** Finance module only
**Exit Conditions:** Bill marked as Paid, Reconciliation matched

---

### 5. DELIVERY BOY (`delivery_boy`) ⚠️ FIRST-CLASS PRD STAKEHOLDER

**Purpose:** Last-mile logistics. Receives dispatch assignments, confirms delivery.

> ⚠️ **Delivery Boy is a mandatory actor in the supply chain.**
> Do NOT treat delivery as an admin-only step.
> Every PO dispatch → material receipt flow MUST pass through a Delivery Boy task.

| Can Do | Cannot Do |
|---|---|
| ✅ View assigned delivery tasks | ❌ View any admin/finance data |
| ✅ Update delivery status (en route, arrived, delivered) | ❌ Modify POs or Indents |
| ✅ Capture delivery proof (photo of materials + signature) | ❌ Access any master data |
| ✅ View own attendance and schedule | ❌ Access finance or billing |
| ✅ Scan QR codes for delivery verification | |

**Entry Points:** Mobile-first delivery task list
**Exit Conditions:** Delivery confirmed with photo proof + digital signature

**MANDATORY EVIDENCE:**
- Photo of delivered materials at site
- Digital signature from receiving party (admin/guard)
- GPS location at delivery point
- Timestamp of handover

---

### 6. BUYER (`buyer`)

**Purpose:** External client who requests materials/services and pays invoices.

| Can Do | Cannot Do |
|---|---|
| ✅ Submit Order Requests (material or service) | ❌ View internal Indents, POs, or Supplier data |
| ✅ Track order status (pending → dispatched → delivered) | ❌ Modify company master data |
| ✅ Accept or Reject received orders/quotations | ❌ View other buyers' orders |
| ✅ View and pay Sale Bills / Buyer Invoices | ❌ Access HRMS, attendance, or payroll |
| ✅ Submit Feedback on delivered orders | |
| ✅ View own order history | |

**Entry Points:** Buyer Portal (isolated from admin dashboard)
**Exit Conditions:** Bill Paid + Feedback submitted → transaction END

---

### 7. SUPPLIER / VENDOR (`supplier` / `vendor`)

**Purpose:** External partner who fulfills Indents and generates Supplier Bills.

| Can Do | Cannot Do |
|---|---|
| ✅ View Indents forwarded to them | ❌ View other suppliers' data |
| ✅ Accept or Reject Indents | ❌ Access company financials |
| ✅ View Purchase Orders issued to them | ❌ Modify company master data |
| ✅ Update dispatch status (PO Dispatched) | ❌ Access HRMS or employee data |
| ✅ Generate Supplier Bills after delivery | |
| ✅ Track payment status (Paid/Unpaid) | |
| ✅ View own product-rate mappings | |

**Entry Points:** Supplier Portal (isolated from admin dashboard)
**Exit Conditions:** Supplier Bill → Paid status confirmed

---

### 8. SECURITY GUARD (`security_guard`)

**Purpose:** On-ground security. Mobile-first operator.

| Can Do | Cannot Do |
|---|---|
| ✅ Trigger Panic Alert (SOS button) | ❌ View admin/finance data |
| ✅ Fill Daily Checklist (with mandatory photo proof) | ❌ Manage other guards |
| ✅ Log Patrol route (with GPS checkpoints) | ❌ Modify master data |
| ✅ Register Visitor Entry (name, photo, phone, vehicle) | ❌ Access reports or analytics |
| ✅ Log Visitor Exit | |
| ✅ View Emergency Contact Quick-Dial | |
| ✅ Check-in/out attendance (selfie + geo-fence enforced) | |
| ✅ View own shift schedule | |
| ✅ View assigned location on map | |

**Entry Points:** Guard Mobile Dashboard (single-screen home with: SOS, Checklist, Visitor Entry, Quick Dial)
**Exit Conditions:** Each task is atomic (checklist submitted, visitor logged, patrol completed)

**MANDATORY EVIDENCE:**
- Checklist: photo proof per item where required
- Visitor: photo of visitor
- Attendance: selfie + GPS within 50m of assigned location
- Patrol: GPS route log with checkpoint timestamps

---

### 9. SECURITY SUPERVISOR (`security_supervisor`)

**Purpose:** Oversees guards. Receives alerts. Reviews compliance.

| Can Do | Cannot Do |
|---|---|
| ✅ View all guard locations on live map | ❌ Modify company master data |
| ✅ View Panic Alert history with resolution status | ❌ Access finance module |
| ✅ View guard attendance logs | ❌ Manage non-security employees |
| ✅ View/resolve Inactivity Alerts | |
| ✅ View Checklist completion status (Green/Red) | |
| ✅ Create Behavior Tickets for guards | |
| ✅ View patrol route compliance | |
| ✅ Manage guard assignments and shifts | |

**Entry Points:** Security Command Center (map + alerts + checklist status)
**Exit Conditions:** Alert resolved, ticket created, compliance reviewed

---

### 10. SOCIETY MANAGER (`society_manager`)

**Purpose:** Client-side representative of the society. Oversees facility services.

| Can Do | Cannot Do |
|---|---|
| ✅ View Society Manager Dashboard (Visitor Stats, Checklist Status, Panic Logs, Staff Attendance) | ❌ Access internal company finances |
| ✅ Create Behavior Tickets for staff | ❌ Manage procurement |
| ✅ View visitor history per flat | ❌ Modify employee master data |
| ✅ View and manage society assets | |
| ✅ Log service requests (AC, Pest, Maintenance) | |
| ✅ View service request resolution status | |
| ✅ View guard compliance reports | |
| ✅ Manage society-level data (buildings, flats, residents) | |
| ✅ View society-specific reports | |

**Entry Points:** Society Manager Dashboard (PRD lines 203-208)
**Exit Conditions:** Service request resolved, ticket reviewed

---

### 11. SERVICE BOY (`service_boy`)

**Purpose:** Field technician (AC, Pest Control, Plantation). Executes assigned work orders.

| Can Do | Cannot Do |
|---|---|
| ✅ View assigned service requests/work orders | ❌ View admin or finance data |
| ✅ Update work status (Start → Before Photo → Work → After Photo → Complete) | ❌ Manage other staff |
| ✅ Request materials from inventory | ❌ Access master data |
| ✅ Complete PPE checklist before starting work | |
| ✅ Check-in to work location (GPS verified) | |
| ✅ View own attendance and schedule | |
| ✅ Scan QR codes for asset identification | |

**Entry Points:** Service Boy Mobile Dashboard (assigned tasks, PPE checklist, work status update)
**Exit Conditions:** Work order completed with Before/After photos

**MANDATORY EVIDENCE:**
- PPE Checklist completed before work
- "Before" photo at work start
- "After" photo at work completion
- GPS location at check-in

---

## 🔒 Role-to-Module Access Matrix

| Module | admin | company_md | company_hod | account | delivery_boy | buyer | supplier | security_guard | security_supervisor | society_manager | service_boy |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Dashboard** | ✅ Full | ✅ Executive | ✅ Dept | ✅ Finance | ❌ | ❌ | ❌ | ✅ Guard | ✅ Command | ✅ Society | ✅ Tasks |
| **Master Data** | ✅ CRUD | 👁 Read | 👁 Read | ❌ | ❌ | ❌ | 👁 Own data | ❌ | ❌ | ❌ | ❌ |
| **HRMS** | ✅ Full | 👁 Reports | ✅ Dept | ❌ | ❌ | ❌ | ❌ | 👁 Own | 👁 Guards | ❌ | 👁 Own |
| **Attendance** | ✅ Full | 👁 Read | ✅ Dept | ❌ | ✅ Own | ❌ | ❌ | ✅ Self-service | ✅ Guards | 👁 Guards | ✅ Self-service |
| **Inventory** | ✅ Full | 👁 Read | ✅ Dept | ❌ | ❌ | ✅ Portal | ✅ Portal | ❌ | ❌ | ❌ | ✅ Request |
| **Security** | ✅ Full | 👁 Read | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Operational | ✅ Full | ✅ View | ❌ |
| **Services** | ✅ Full | 👁 Read | ✅ Dept | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Request | ✅ Execute |
| **Finance** | ✅ Full | ✅ Approve | ❌ | ✅ Full | ❌ | ✅ Bills | ✅ Bills | ❌ | ❌ | ❌ | ❌ |
| **Reports** | ✅ All | ✅ All | ✅ Dept | ✅ Finance | ❌ | 👁 Own | 👁 Own | ❌ | ✅ Security | ✅ Society | ❌ |
| **Tickets** | ✅ Full | 👁 Read | ✅ Create | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Create | ✅ Create | ❌ |

Legend: ✅ = Full access, 👁 = Read-only, ❌ = No access

---

## Current Frontend Reality

| Role | Has Dedicated UI? | Has Sidebar Filtering? | Has Middleware Check? |
|---|---|---|---|
| admin | ✅ (all pages are admin-view) | ❌ No filtering | ❌ Auth only, no role |
| company_md | ❌ | ❌ | ❌ |
| company_hod | ❌ | ❌ | ❌ |
| account | ❌ | ❌ | ❌ |
| delivery_boy | ❌ | ❌ | ❌ |
| buyer | ❌ | ❌ | ❌ |
| supplier | ❌ | ❌ | ❌ |
| security_guard | ❌ (uses admin pages) | ❌ | ❌ |
| security_supervisor | ❌ | ❌ | ❌ |
| society_manager | ❌ | ❌ | ❌ |
| service_boy | ❌ (test page exists) | ❌ | ❌ |

**Verdict:** The `useAuth` hook provides `user` and `userId` but **never fetches the user's role**. The sidebar shows all 50+ pages to every user. The middleware checks auth but never checks role.

---

_End of Stakeholder Map — v2.0 (Corrected: Admin governance, Resident actor, Delivery Boy prominence)_
