# Phase C Reference Analysis

> Analysis of three reference repositories for patterns applicable to FacilityPlatform Phase C implementation.

## Reference Repositories

| Repository | Tech Stack | Relevance |
|------------|------------|-----------|
| **InvoiceShelf** | Laravel/PHP | Billing, Invoicing, Payments, Multi-currency |
| **Horilla HRMS** | Frappe/Python | Payroll, Recruitment, Attendance, Leave Management |
| **bs_reconcile** | ERPNext/Python | Three-way Reconciliation, Partial Matching |

---

## 1. InvoiceShelf Analysis

### 1.1 Overview

InvoiceShelf is a self-hosted invoicing application built with Laravel. It provides comprehensive patterns for:
- Invoice and payment lifecycle management
- Partial payment tracking
- Multi-currency transactions
- Tax calculation systems

### 1.2 Key Models & Schema

#### Invoice Model
```
invoices
├── id (PK)
├── invoice_number (string, unique)
├── invoice_date (date)
├── due_date (date, nullable)
├── status (string)              -- Document lifecycle: DRAFT, SENT, VIEWED, COMPLETED
├── paid_status (string)         -- Payment state: UNPAID, PARTIALLY_PAID, PAID
├── sub_total (bigint)           -- Amounts stored as cents/integers
├── tax (bigint)
├── discount_val (bigint)
├── total (bigint)
├── due_amount (bigint)          -- Tracks remaining balance
├── exchange_rate (decimal 19,6)
├── base_total (bigint)          -- Converted to base currency
├── base_due_amount (bigint)
├── customer_id (FK)
├── currency_id (FK)
├── company_id (FK)
└── creator_id (FK)
```

#### Payment Model
```
payments
├── id (PK)
├── payment_number (string)
├── payment_date (date)
├── amount (bigint)
├── invoice_id (FK, nullable)    -- KEY: Payments can exist independently
├── customer_id (FK)
├── payment_method_id (FK)
├── currency_id (FK)
├── exchange_rate (decimal 19,6)
├── base_amount (bigint)
└── creator_id (FK)
```

### 1.3 Critical Patterns

#### Pattern 1: Dual Status Tracking
InvoiceShelf separates document lifecycle from payment state:

```
Document Status (status)         Payment Status (paid_status)
┌─────────────────────────┐     ┌─────────────────────────┐
│ DRAFT                   │     │ UNPAID                  │
│   ↓                     │     │   ↓                     │
│ SENT                    │     │ PARTIALLY_PAID          │
│   ↓                     │     │   ↓                     │
│ VIEWED                  │     │ PAID                    │
│   ↓                     │     └─────────────────────────┘
│ COMPLETED               │
└─────────────────────────┘
```

**Why This Matters:**
- A sent invoice can be partially paid (status=SENT, paid_status=PARTIALLY_PAID)
- Enables flexible reporting: "All unpaid invoices" vs "All draft invoices"
- Clean separation of concerns

**FacilityPlatform Recommendation:**
Apply to Supplier Bills and Buyer Invoices:
```sql
-- supplier_bills
status: 'draft', 'submitted', 'approved'
payment_status: 'unpaid', 'partial', 'paid'

-- buyer_invoices  
status: 'draft', 'sent', 'acknowledged'
payment_status: 'unpaid', 'partial', 'paid'
```

#### Pattern 2: Integer Amount Storage
All monetary values stored as integers (smallest currency unit):

```php
// Instead of: 150.50 (float)
// Store as: 15050 (integer cents)

$invoice->total = 15050;  // $150.50
$invoice->due_amount = 7525;  // $75.25 remaining
```

**Benefits:**
- No floating-point precision errors
- Consistent arithmetic operations
- Database-level comparisons are exact

**FacilityPlatform Recommendation:**
Store all amounts as `bigint` in cents/paise:
```sql
-- Instead of: decimal(10,2)
total_amount bigint not null,  -- Store as paise (1 INR = 100 paise)
paid_amount bigint default 0,
```

#### Pattern 3: Due Amount Tracking
Payment application automatically updates invoice balance:

```php
// When payment is applied:
public function subtractInvoicePayment($amount)
{
    $this->due_amount -= $amount;
    $this->changeInvoiceStatus($this->due_amount);
}

// Status determination:
if ($due_amount == 0) → PAID
else if ($due_amount < $total) → PARTIALLY_PAID
else → UNPAID
```

**FacilityPlatform Recommendation:**
Implement in `useSupplierBills.ts`:
```typescript
const applyPayment = async (billId: string, amount: number) => {
  const bill = await getBill(billId);
  const newDueAmount = bill.due_amount - amount;
  
  await supabase.from('supplier_bills').update({
    paid_amount: bill.paid_amount + amount,
    due_amount: newDueAmount,
    payment_status: newDueAmount === 0 ? 'paid' : 'partial'
  }).eq('id', billId);
};
```

#### Pattern 4: Nullable Invoice Reference on Payments
Payments can exist without being tied to a specific invoice:

```php
// payments.invoice_id is nullable
// Allows: Advance payments, deposits, prepayments
// Later: Allocate payment to invoice
```

**FacilityPlatform Recommendation:**
Support advance payments from Buyers:
```sql
create table buyer_payments (
  id uuid primary key,
  buyer_id uuid references buyers(id),
  invoice_id uuid references buyer_invoices(id),  -- nullable
  amount bigint not null,
  -- ...
);
```

#### Pattern 5: Multi-Currency with Base Amounts
Every transaction stores both original and base currency amounts:

```
Original Amount     Exchange Rate     Base Amount
100 USD      ×      83.50       =     8350 INR
```

**Schema Pattern:**
```sql
amount bigint,           -- In transaction currency
exchange_rate decimal(19,6),
base_amount bigint,      -- In company's base currency (INR)
currency_id uuid,
```

**FacilityPlatform Applicability:**
Currently single-currency (INR), but pattern useful if multi-currency needed later.

### 1.4 Tax System

#### Two-Level Tax Pattern
```
TaxType (Definition)           Tax (Applied Instance)
├── name: "GST 18%"           ├── tax_type_id → TaxType
├── percent: 18.00            ├── invoice_id → Invoice
├── compound_tax: false       ├── amount: 1800
└── company_id                └── percent: 18.00
```

**Key Insight:** Tax definitions are reusable; tax instances capture the actual amount on each document.

**FacilityPlatform Recommendation:**
```sql
-- Tax definitions
create table tax_types (
  id uuid primary key,
  name text not null,  -- "GST 18%", "CGST 9%", "SGST 9%"
  rate decimal(5,2) not null,
  is_compound boolean default false
);

-- Applied taxes (on invoice items)
create table invoice_taxes (
  id uuid primary key,
  invoice_item_id uuid references invoice_items(id),
  tax_type_id uuid references tax_types(id),
  amount bigint not null
);
```

---

## 2. Horilla HRMS Analysis

### 2.1 Overview

Horilla HRMS is a Frappe-based HR management system providing patterns for:
- Payroll calculation with formula evaluation
- Recruitment pipeline management
- Attendance-based salary computation
- Leave management with double-entry ledger

### 2.2 Payroll Module

#### Salary Structure → Salary Slip Flow
```
Salary Structure (Template)
├── name: "Standard Guard Salary"
├── payroll_frequency: Monthly
├── company_id
│
├── earnings[] (child table)
│   ├── Basic: amount=15000
│   ├── HRA: formula="base * 0.40"
│   └── DA: formula="base * 0.10"
│
└── deductions[] (child table)
    ├── PF: formula="base * 0.12"
    ├── PT: amount=200
    └── ESIC: formula="gross_pay * 0.0075"

         ↓ (Generate for Employee)

Salary Slip (Instance)
├── employee_id
├── salary_structure_id
├── posting_date
├── payment_days (from attendance)
├── total_working_days
│
├── earnings[] (calculated)
│   ├── Basic: 15000 × (payment_days/total_days)
│   ├── HRA: 6000
│   └── DA: 1500
│
├── deductions[] (calculated)
│   ├── PF: 1800
│   ├── PT: 200
│   └── ESIC: 168.75
│
├── gross_pay: 22500
├── total_deduction: 2168.75
└── net_pay: 20331.25
```

#### Formula Evaluation Pattern
Horilla uses safe formula evaluation with whitelisted variables:

```python
# Available in formulas:
{
    'base': basic_salary,
    'gross_pay': sum(earnings),
    'payment_days': attendance_days,
    'total_working_days': calendar_days,
    'HRA': hra_amount,  # Component abbreviations
    'DA': da_amount,
}

# Formula examples:
"base * 0.12"              # PF = 12% of basic
"gross_pay * 0.0075"       # ESIC = 0.75% of gross
"base if payment_days > 15 else 0"  # Conditional
```

**FacilityPlatform Recommendation:**
Simple calculation without formula eval (safer):
```typescript
// hooks/usePayroll.ts
const calculatePayslip = (employee, attendanceDays, workingDays) => {
  const basicProratedBasic = (employee.basic_salary * attendanceDays) / workingDays;
  
  const earnings = {
    basic: proratedBasic,
    hra: proratedBasic * 0.40,
    da: proratedBasic * 0.10,
    overtime: employee.overtime_hours * employee.overtime_rate,
  };
  
  const grossPay = Object.values(earnings).reduce((a, b) => a + b, 0);
  
  const deductions = {
    pf: proratedBasic * 0.12,
    pt: getPTForState(employee.state),  // State-wise PT
    esic: grossPay * 0.0075,
  };
  
  const totalDeduction = Object.values(deductions).reduce((a, b) => a + b, 0);
  
  return {
    ...earnings,
    ...deductions,
    gross_pay: grossPay,
    total_deduction: totalDeduction,
    net_pay: grossPay - totalDeduction,
  };
};
```

#### Payroll Entry (Batch Processing)
```
Payroll Entry
├── company_id
├── payroll_frequency: Monthly
├── start_date: 2024-01-01
├── end_date: 2024-01-31
├── status: Draft → Submitted → Completed
│
├── filters:
│   ├── department_id (optional)
│   ├── branch_id (optional)
│   └── designation_id (optional)
│
└── methods:
    ├── get_employees() → filtered employee list
    ├── create_salary_slips() → bulk generation
    └── submit() → finalize all slips
```

**FacilityPlatform Schema:**
```sql
create table payroll_cycles (
  id uuid primary key,
  cycle_name text not null,
  month integer not null,
  year integer not null,
  start_date date not null,
  end_date date not null,
  status text default 'draft',  -- draft, processing, completed
  total_employees integer,
  total_amount bigint,
  created_by uuid references users(id),
  created_at timestamptz default now()
);

create table payslips (
  id uuid primary key,
  payroll_cycle_id uuid references payroll_cycles(id),
  employee_id uuid references employees(id),
  basic_salary bigint not null,
  payment_days integer not null,
  working_days integer not null,
  hra bigint default 0,
  da bigint default 0,
  overtime_amount bigint default 0,
  gross_pay bigint not null,
  pf_deduction bigint default 0,
  pt_deduction bigint default 0,
  esic_deduction bigint default 0,
  other_deduction bigint default 0,
  total_deduction bigint not null,
  net_pay bigint not null,
  status text default 'draft',  -- draft, approved, paid
  unique(payroll_cycle_id, employee_id)
);
```

### 2.3 Recruitment Module

#### Recruitment Pipeline Flow
```
Job Requisition           Job Opening              Job Applicant
├── title                 ├── job_title            ├── applicant_name
├── department            ├── job_requisition_id   ├── email
├── no_of_positions       ├── status: Open/Closed  ├── job_title (opening)
├── status:               ├── publish_on_website   ├── status:
│   Pending → Approved    │                        │   Open → Replied →
│                         │                        │   Rejected/Accepted
│                         │                        │
         ↓                         ↓               │
                                                   │
                              Interview ←──────────┘
                              ├── job_applicant_id
                              ├── interview_round
                              ├── scheduled_on
                              ├── status: Pending → Completed
                              └── rating
                                         ↓
                              Job Offer
                              ├── job_applicant_id
                              ├── status: Awaiting → Accepted/Rejected
                              ├── offer_date
                              └── designation
                                         ↓
                              Employee Onboarding
                              ├── job_offer_id
                              ├── employee_id (new)
                              ├── boarding_status
                              └── activities[] (checklist)
```

**FacilityPlatform Simplified Pipeline:**
```sql
-- PRD requires: screening → interviewing → background_check → offered → hired

create type candidate_status as enum (
  'screening',
  'interviewing', 
  'background_check',
  'offered',
  'hired',
  'rejected'
);

create table candidates (
  id uuid primary key,
  full_name text not null,
  email text,
  phone text not null,
  position text not null,  -- e.g., "Security Guard Grade A"
  source text,  -- Agency, Referral, Walk-in
  status candidate_status default 'screening',
  
  -- Background Verification
  bgv_status text,  -- pending, verified, failed
  police_verification_date date,
  address_verified boolean default false,
  
  -- Interview tracking
  interview_date date,
  interview_notes text,
  interview_rating integer,  -- 1-5
  
  -- Offer
  offered_salary bigint,
  offer_date date,
  offer_accepted boolean,
  
  -- Conversion
  converted_employee_id uuid references employees(id),
  hired_date date,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 2.4 Attendance Integration

#### Attendance-Based Payroll Calculation
```python
# Horilla pattern:
def get_payment_days(employee, start_date, end_date):
    total_days = get_working_days(start_date, end_date)
    
    # Count present days from attendance
    present = count_attendance(employee, 'Present', start_date, end_date)
    half_days = count_attendance(employee, 'Half Day', start_date, end_date)
    
    # Leave without pay reduces payment days
    lwp = get_leaves_without_pay(employee, start_date, end_date)
    
    payment_days = present + (half_days * 0.5) + paid_leaves - lwp
    
    return payment_days, total_days
```

**FacilityPlatform Integration:**
```typescript
// hooks/usePayroll.ts
const calculatePaymentDays = async (employeeId: string, startDate: Date, endDate: Date) => {
  // Get attendance records
  const { data: attendance } = await supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('date', startDate)
    .lte('date', endDate);
  
  // Get approved leaves
  const { data: leaves } = await supabase
    .from('leave_applications')
    .select('*, leave_types(*)')
    .eq('employee_id', employeeId)
    .eq('status', 'approved')
    .overlaps('start_date', 'end_date', [startDate, endDate]);
  
  const presentDays = attendance.filter(a => a.status === 'present').length;
  const halfDays = attendance.filter(a => a.status === 'half_day').length * 0.5;
  const paidLeaves = leaves.filter(l => l.leave_types.is_paid).reduce((sum, l) => sum + l.days, 0);
  const unpaidLeaves = leaves.filter(l => !l.leave_types.is_paid).reduce((sum, l) => sum + l.days, 0);
  
  const workingDays = getWorkingDays(startDate, endDate);
  const paymentDays = presentDays + halfDays + paidLeaves;
  
  return { paymentDays, workingDays, unpaidLeaves };
};
```

### 2.5 Leave Ledger Double-Entry Pattern

#### How It Works
```
Leave Allocation (+)                    Leave Application (-)
├── employee_id                         ├── employee_id
├── leave_type: Casual                  ├── leave_type: Casual
├── new_leaves_allocated: 12            ├── total_leave_days: 2
└── creates →                           └── creates →
    Leave Ledger Entry                      Leave Ledger Entry
    ├── leaves: +12                         ├── leaves: -2
    └── transaction_type: allocation        └── transaction_type: consumption
```

**Balance Query:**
```sql
SELECT SUM(leaves) as balance
FROM leave_ledger_entry
WHERE employee_id = :emp
  AND leave_type = :type
  AND is_expired = 0;
```

**FacilityPlatform Simplification:**
For MVP, use direct balance tracking on leave_applications:
```sql
-- Track balance directly on employees
alter table employees add column casual_leave_balance integer default 12;
alter table employees add column sick_leave_balance integer default 6;

-- Or use a leave_balances table
create table leave_balances (
  employee_id uuid references employees(id),
  leave_type_id uuid references leave_types(id),
  balance decimal(4,1) default 0,
  year integer not null,
  primary key (employee_id, leave_type_id, year)
);
```

---

## 3. BS_Reconcile Analysis

### 3.1 Overview

BS_Reconcile is an ERPNext module for balance sheet account reconciliation. It provides patterns for:
- Many-to-many partial matching
- Residual-based tracking
- Full reconciliation grouping
- Recursive entry discovery

### 3.2 Core Data Model

#### Junction Table Pattern
```
GL Entry (Debit)         Partial Reconcile Entry         GL Entry (Credit)
├── $100 receivable      ├── debit_gl_entry ────────►   ├── -$60 payment
│                        ├── credit_gl_entry ──────►    │
│   residual: $40        ├── amount: $60               │   residual: $0
│                        └── full_reconcile_number     │
│                                                      │
│                        ┌─────────────────────────┐   │
│   ◄────────────────────│ P2: amount: $40        │───►│ -$40 payment
│   residual: $0         └─────────────────────────┘   │   residual: $0
│                                   ↑
│                        Full Reconcile Number: F.1
│                        (all residuals = 0)
```

#### Key Entities
```sql
-- Junction table for reconciliation
partial_reconcile_entry:
  id, name (autoname: P{#})
  debit_gl_entry   -- FK to GL Entry (debit side)
  credit_gl_entry  -- FK to GL Entry (credit side)
  amount           -- Reconciled amount
  full_reconcile_number  -- Set when fully matched

-- Group identifier (created when complete)
full_reconcile_number:
  name (autoname: F.{#})
  
-- Extended GL Entry fields
gl_entry (custom fields):
  is_reconcile    -- Flag: account allows reconciliation
  residual        -- Remaining unreconciled amount
  full_reconcile_number  -- Link when fully matched
```

### 3.3 Critical Algorithms

#### Residual Calculation
```python
def update_residual(gl_entry):
    # Original amount
    gl_amount = gl_entry.debit - gl_entry.credit
    
    # Sum of all reconciled amounts where this entry is debit
    debit_reconciled = SUM(PRE.amount WHERE PRE.debit_gl_entry = gl_entry.name)
    
    # Sum of all reconciled amounts where this entry is credit
    credit_reconciled = SUM(PRE.amount WHERE PRE.credit_gl_entry = gl_entry.name)
    
    # Net reconciled
    reconciled = debit_reconciled - credit_reconciled
    
    # Residual = what's left
    gl_entry.residual = gl_amount - reconciled
```

#### Partial Reconcile Creation
```python
def create_partial_reconcile_entries(gl_entries):
    # Separate into debits and credits
    debit_entries = [gl for gl in gl_entries if gl.debit > 0]
    credit_entries = [gl for gl in gl_entries if gl.credit > 0]
    
    # Match each debit with each credit (cartesian product)
    for dr in debit_entries:
        for cr in credit_entries:
            # Amount to reconcile is minimum of available residuals
            amount = min(
                abs(dr.residual),
                abs(cr.residual)
            )
            
            if amount > 0:
                create_pre(debit=dr, credit=cr, amount=amount)
                update_residual(dr)
                update_residual(cr)
```

#### Full Reconcile Detection
```python
def mark_full_reconcile(gl_entries):
    # Get all related entries (recursive graph traversal)
    all_entries = get_all_related_entries(gl_entries)
    
    # Sum all residuals
    total_residual = sum(gl.residual for gl in all_entries)
    
    # If zero, create full reconcile number
    if total_residual == 0:
        frn = create("Full Reconcile Number")
        for gl in all_entries:
            gl.full_reconcile_number = frn
```

### 3.4 Adaptation for Three-Way Matching

#### Conceptual Mapping
| BS Reconcile | Three-Way Matching |
|--------------|-------------------|
| GL Entry (Debit) | Purchase Order Line |
| GL Entry (Credit) | GRN Line / Invoice Line |
| Partial Reconcile Entry | Match Line |
| Full Reconcile Number | Match Group |
| Residual (amount) | Unmatched Qty/Amount |

#### Proposed FacilityPlatform Schema
```sql
-- Match lines (junction table)
create table reconciliation_lines (
  id uuid primary key,
  
  -- Source documents (any combination)
  po_item_id uuid references purchase_order_items(id),
  grn_item_id uuid references material_receipt_items(id),
  bill_item_id uuid references purchase_bill_items(id),
  
  -- Matched amounts
  matched_qty decimal(10,2),
  matched_amount bigint,
  
  -- Match type
  match_type text not null,  -- 'PO_GRN', 'GRN_BILL', 'PO_BILL', 'THREE_WAY'
  
  -- Group when complete
  reconciliation_id uuid references reconciliations(id),
  
  created_at timestamptz default now()
);

-- Reconciliation groups
create table reconciliations (
  id uuid primary key,
  reference_number text unique,  -- REC-2024-0001
  
  -- Summary
  po_total bigint,
  grn_total bigint,
  bill_total bigint,
  variance bigint,  -- calculated
  
  -- Status
  status text default 'pending',  -- pending, matched, discrepancy, resolved
  
  -- Resolution
  resolution_notes text,
  resolved_by uuid references users(id),
  resolved_at timestamptz,
  
  created_at timestamptz default now()
);

-- Add residual tracking to source documents
alter table purchase_order_items add column unmatched_qty decimal(10,2);
alter table purchase_order_items add column unmatched_amount bigint;

alter table material_receipt_items add column unmatched_qty decimal(10,2);
alter table material_receipt_items add column unmatched_amount bigint;

alter table purchase_bill_items add column unmatched_qty decimal(10,2);
alter table purchase_bill_items add column unmatched_amount bigint;
```

#### Three-Way Matching Algorithm
```typescript
// hooks/useReconciliation.ts
interface MatchResult {
  poItem: POItem;
  grnItem?: GRNItem;
  billItem?: BillItem;
  matchedQty: number;
  matchedAmount: number;
  variance: number;
  status: 'matched' | 'qty_mismatch' | 'price_mismatch' | 'missing_grn' | 'missing_bill';
}

const performThreeWayMatch = async (poId: string, grnId: string, billId: string): Promise<MatchResult[]> => {
  const poItems = await getPOItems(poId);
  const grnItems = await getGRNItems(grnId);
  const billItems = await getBillItems(billId);
  
  const results: MatchResult[] = [];
  
  for (const poItem of poItems) {
    // Find matching GRN item by product
    const grnItem = grnItems.find(g => g.product_id === poItem.product_id);
    const billItem = billItems.find(b => b.product_id === poItem.product_id);
    
    const matchedQty = Math.min(
      poItem.unmatched_qty,
      grnItem?.unmatched_qty ?? 0,
      billItem?.unmatched_qty ?? 0
    );
    
    // Calculate variance
    const poAmount = poItem.unit_price * matchedQty;
    const billAmount = billItem ? billItem.unit_price * matchedQty : 0;
    const variance = billAmount - poAmount;
    
    // Determine status
    let status: MatchResult['status'];
    if (!grnItem) status = 'missing_grn';
    else if (!billItem) status = 'missing_bill';
    else if (grnItem.received_qty !== poItem.ordered_qty) status = 'qty_mismatch';
    else if (Math.abs(variance) > TOLERANCE) status = 'price_mismatch';
    else status = 'matched';
    
    results.push({
      poItem, grnItem, billItem, matchedQty,
      matchedAmount: poAmount,
      variance, status
    });
    
    // Create reconciliation line
    if (matchedQty > 0) {
      await createReconciliationLine({
        po_item_id: poItem.id,
        grn_item_id: grnItem?.id,
        bill_item_id: billItem?.id,
        matched_qty: matchedQty,
        matched_amount: poAmount,
        match_type: 'THREE_WAY'
      });
      
      // Update residuals
      await updateResiduals(poItem.id, grnItem?.id, billItem?.id, matchedQty);
    }
  }
  
  return results;
};
```

---

## 4. Pattern Recommendations for FacilityPlatform

### 4.1 Supplier Bills (From InvoiceShelf)

| Pattern | Source | Recommendation |
|---------|--------|----------------|
| Dual Status | InvoiceShelf | Use `status` + `payment_status` |
| Integer Amounts | InvoiceShelf | Store amounts in paise (bigint) |
| Due Amount | InvoiceShelf | Track `due_amount` for payment application |
| Payment Linkage | InvoiceShelf | Allow nullable `bill_id` on payments |

### 4.2 Buyer Invoices (From InvoiceShelf)

| Pattern | Source | Recommendation |
|---------|--------|----------------|
| Invoice Items | InvoiceShelf | Separate `invoice_items` table |
| Sequence Number | InvoiceShelf | Auto-generate: INV-2024-0001 |
| Tax Application | InvoiceShelf | Use TaxType → Tax instance pattern |

### 4.3 Payroll (From Horilla HRMS)

| Pattern | Source | Recommendation |
|---------|--------|----------------|
| Salary Structure | Horilla | Template with earnings/deductions |
| Payment Days | Horilla | Calculate from attendance records |
| Batch Processing | Horilla | PayrollCycle → PaySlips pattern |
| Pro-rata Calculation | Horilla | `(basic × payment_days) / working_days` |

### 4.4 Recruitment (From Horilla HRMS)

| Pattern | Source | Recommendation |
|---------|--------|----------------|
| Pipeline Status | Horilla | Simplified: screening → hired |
| BGV Tracking | Horilla | Add `bgv_status`, `police_verification` |
| Convert to Employee | Horilla | One-click with `converted_employee_id` |

### 4.5 Reconciliation (From bs_reconcile)

| Pattern | Source | Recommendation |
|---------|--------|----------------|
| Junction Table | bs_reconcile | `reconciliation_lines` for many-to-many |
| Residual Tracking | bs_reconcile | `unmatched_qty`, `unmatched_amount` on lines |
| Group Identifier | bs_reconcile | `reconciliations` table with status |
| Variance Calculation | bs_reconcile | Auto-calculate and flag discrepancies |

---

## 5. Files Analyzed

### InvoiceShelf
```
reference/Phase_C/InvoiceShelf/
├── app/Models/
│   ├── Invoice.php
│   ├── Payment.php
│   ├── Customer.php
│   ├── Expense.php
│   ├── Item.php
│   ├── Tax.php
│   ├── TaxType.php
│   └── InvoiceItem.php
└── database/migrations/
    ├── create_invoices_table.php
    ├── create_payments_table.php
    ├── add_base_columns_*.php
    └── ...
```

### Horilla HRMS
```
reference/Phase_C/hrms/
├── hrms/payroll/doctype/
│   ├── salary_structure/
│   ├── salary_slip/
│   └── payroll_entry/
├── hrms/hr/doctype/
│   ├── attendance/
│   ├── leave_application/
│   ├── job_applicant/
│   ├── job_offer/
│   └── employee_onboarding/
└── hrms/overrides/
```

### BS_Reconcile
```
reference/Phase_C/bs_reconcile/
├── bs_reconcile/balance_sheet_reconciliation/
│   ├── doctype/partial_reconcile_entry/
│   ├── doctype/full_reconcile_number/
│   └── utils.py
├── bs_reconcile/overrides/
│   ├── gl_entry.py
│   └── general_ledger.py
└── fixtures/custom_field.json
```

---

## 6. Summary Matrix

| PRD Requirement | Best Reference | Key Pattern |
|-----------------|----------------|-------------|
| Recruitment Process | Horilla HRMS | Pipeline status flow |
| Employee Payroll | Horilla HRMS | Attendance-based calculation |
| Employee Documents | Horilla HRMS | Document type + verification |
| Supplier Bills | InvoiceShelf | Dual status + payment tracking |
| Buyer Invoices | InvoiceShelf | Invoice + items + tax |
| Bill vs PO vs GRN | bs_reconcile | Junction table + residuals |
| Partial Payments | InvoiceShelf | Due amount tracking |
| Multi-currency | InvoiceShelf | Base amount pattern (future) |

---

*Document created: Phase C Reference Analysis*
*Last updated: 2024*
