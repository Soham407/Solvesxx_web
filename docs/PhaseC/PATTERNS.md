# PATTERNS — Phase C

> Enhanced with patterns from InvoiceShelf, Horilla HRMS, and bs_reconcile reference repositories.

## Database Patterns

### Table Naming

- Plural snake_case: `candidates`, `payroll_cycles`, `payslips`
- Junction tables: `indent_items`, `purchase_order_items`, `reconciliation_lines`

### Primary Keys

- UUID type: `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`

### Foreign Keys

- Reference pattern: `employee_id UUID REFERENCES employees(id)`
- Cascade on parent delete for child items: `ON DELETE CASCADE`

### Timestamps

- All tables include: `created_at`, `updated_at`
- Use `TIMESTAMP WITH TIME ZONE`
- Default: `DEFAULT CURRENT_TIMESTAMP`

### Auto-Generated Codes

Pattern: `PREFIX-YYYY-NNNN`

| Entity | Prefix | Example |
|--------|--------|---------|
| Candidate | `CAND` | `CAND-2026-0001` |
| Payroll Cycle | `PAY` | `PAY-2026-01` |
| Payslip | `PS` | `PS-2026-01-0001` |
| Document | `DOC` | `DOC-EMP001-AADHAR` |
| Reconciliation | `REC` | `REC-2026-0001` |

### Status Enums

Define as PostgreSQL ENUM types:

```sql
CREATE TYPE candidate_status AS ENUM ('screening', 'interviewing', 'background_check', 'offered', 'hired', 'rejected');
CREATE TYPE document_status AS ENUM ('pending_upload', 'pending_review', 'verified', 'expired', 'rejected');
CREATE TYPE reconciliation_status AS ENUM ('pending', 'matched', 'discrepancy', 'resolved', 'disputed');
```

### Decimal Precision

| Use Case | Precision |
|----------|-----------|
| Currency amounts | `DECIMAL(12, 2)` or `BIGINT` (paise) |
| Percentages | `DECIMAL(5, 2)` |
| Days/Hours | `DECIMAL(6, 2)` |
| Large totals | `DECIMAL(14, 2)` |

---

## Reference-Based Patterns (NEW)

### Dual Status Pattern (from InvoiceShelf)

For documents with both lifecycle and payment states, use TWO status fields:

```sql
-- Example: Supplier Bills
status TEXT DEFAULT 'draft',           -- Document lifecycle: draft, submitted, approved
payment_status TEXT DEFAULT 'unpaid',  -- Payment state: unpaid, partial, paid

-- Example: Buyer Invoices  
status TEXT DEFAULT 'draft',           -- draft, sent, acknowledged
payment_status TEXT DEFAULT 'unpaid',  -- unpaid, partial, paid
```

**Why:** Allows flexible queries like "all unpaid invoices" OR "all draft invoices".

### Due Amount Tracking (from InvoiceShelf)

For partial payment support, track remaining balance:

```sql
CREATE TABLE supplier_bills (
  total_amount BIGINT NOT NULL,      -- Total bill amount (in paise)
  paid_amount BIGINT DEFAULT 0,      -- Amount paid so far
  due_amount BIGINT GENERATED ALWAYS AS (total_amount - paid_amount) STORED
);
```

**Payment Application:**
```typescript
const applyPayment = async (billId: string, amount: number) => {
  const bill = await getBill(billId);
  const newPaidAmount = bill.paid_amount + amount;
  
  await supabase.from('supplier_bills').update({
    paid_amount: newPaidAmount,
    payment_status: newPaidAmount >= bill.total_amount ? 'paid' : 'partial'
  }).eq('id', billId);
};
```

### Integer Amount Storage (from InvoiceShelf)

Store monetary values as integers (smallest unit) to avoid floating-point errors:

```sql
-- Instead of: amount DECIMAL(12, 2)
-- Use: amount BIGINT  -- Store as paise (1 INR = 100 paise)

-- Example calculation:
-- Rs. 1,500.50 → stored as 150050
```

**Conversion helpers:**
```typescript
const toPaise = (rupees: number): number => Math.round(rupees * 100);
const toRupees = (paise: number): number => paise / 100;
```

### Residual Tracking (from bs_reconcile)

For reconciliation, track unmatched amounts on source documents:

```sql
-- Add to purchase_order_items, material_receipt_items, purchase_bill_items
ALTER TABLE purchase_order_items ADD COLUMN unmatched_qty DECIMAL(10, 2);
ALTER TABLE purchase_order_items ADD COLUMN unmatched_amount BIGINT;
```

**Update residual after matching:**
```typescript
const updateResidual = async (itemId: string, matchedQty: number, matchedAmount: number) => {
  const item = await getItem(itemId);
  await supabase.from('purchase_order_items').update({
    unmatched_qty: item.ordered_qty - matchedQty,
    unmatched_amount: item.amount - matchedAmount
  }).eq('id', itemId);
};
```

### Junction Table Pattern (from bs_reconcile)

For many-to-many reconciliation matching:

```sql
CREATE TABLE reconciliation_lines (
  id UUID PRIMARY KEY,
  reconciliation_id UUID REFERENCES reconciliations(id),
  
  -- Source documents (nullable - partial matching)
  po_item_id UUID REFERENCES purchase_order_items(id),
  grn_item_id UUID REFERENCES material_receipt_items(id),
  bill_item_id UUID REFERENCES purchase_bill_items(id),
  
  -- Matched amounts
  matched_qty DECIMAL(10, 2),
  matched_amount BIGINT,
  
  -- Match type for filtering
  match_type TEXT NOT NULL,  -- 'PO_GRN', 'GRN_BILL', 'PO_BILL', 'THREE_WAY'
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Salary Structure Pattern (from Horilla HRMS)

For flexible payroll, separate structure from calculation:

```sql
-- Component definitions (reusable)
CREATE TABLE salary_components (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,            -- 'Basic', 'HRA', 'PF'
  abbr TEXT UNIQUE NOT NULL,     -- 'B', 'HRA', 'PF'
  type TEXT NOT NULL,            -- 'earning' or 'deduction'
  formula TEXT,                  -- 'base * 0.12' or NULL
  depends_on_payment_days BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true
);

-- Employee-specific amounts
CREATE TABLE employee_salary_structure (
  id UUID PRIMARY KEY,
  employee_id UUID REFERENCES employees(id),
  component_id UUID REFERENCES salary_components(id),
  amount BIGINT,                 -- Override amount (paise)
  effective_from DATE NOT NULL,
  effective_to DATE,             -- NULL = currently active
  UNIQUE(employee_id, component_id, effective_from)
);
```

### Attendance-Based Calculation (from Horilla HRMS)

Pro-rate salary based on attendance:

```typescript
const calculateProRatedSalary = (
  basicSalary: number,
  presentDays: number,
  totalWorkingDays: number,
  paidLeaveDays: number
): number => {
  const paymentDays = presentDays + paidLeaveDays;
  return (basicSalary * paymentDays) / totalWorkingDays;
};
```

### Recruitment Pipeline Pattern (from Horilla HRMS)

Status flow with validation:

```typescript
const STATUS_TRANSITIONS: Record<CandidateStatus, CandidateStatus[]> = {
  screening: ['interviewing', 'rejected'],
  interviewing: ['background_check', 'rejected'],
  background_check: ['offered', 'rejected'],
  offered: ['hired', 'rejected'],
  hired: [],      // Terminal
  rejected: [],   // Terminal
};

const canTransition = (current: CandidateStatus, target: CandidateStatus): boolean => {
  return STATUS_TRANSITIONS[current].includes(target);
};
```

## Hook Patterns

### File Location

All hooks in: `hooks/`

### Naming Convention

- `use<Entity>.ts` — e.g., `useCandidates.ts`
- Export single default hook function

### Hook Structure

```typescript
export function use<Entity>() {
  // State
  const [items, setItems] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch function
  const fetch<Entity> = async (filters?: FilterParams) => { ... };

  // CRUD functions
  const create<Entity> = async (data: Create<Entity>Input) => { ... };
  const update<Entity> = async (id: string, data: Partial<Entity>) => { ... };
  const delete<Entity> = async (id: string) => { ... };

  // Initial fetch
  useEffect(() => { fetch<Entity>(); }, []);

  return {
    items,
    loading,
    error,
    fetch<Entity>,
    create<Entity>,
    update<Entity>,
    delete<Entity>,
  };
}
```

### Supabase Query Pattern

```typescript
const { data, error } = await supabase
  .from('table_name')
  .select('*, related_table(*)')
  .eq('column', value)
  .order('created_at', { ascending: false });
```

### Error Handling

```typescript
if (error) {
  console.error('Operation failed:', error);
  setError(error.message);
  return null;
}
```

### Type Definitions

Define at top of hook file:

```typescript
interface Entity {
  id: string;
  // ... fields matching database columns
  created_at: string;
  updated_at: string;
}

interface CreateEntityInput {
  // Required fields for creation (exclude id, timestamps)
}
```

## Component Patterns

### Page Structure

```tsx
export default function EntityPage() {
  const { items, loading, error, createEntity } = useEntity();
  const columns: ColumnDef<Entity>[] = [ ... ];

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <PageHeader title="..." description="..." actions={...} />
      <StatsCards data={items} />
      <DataTable columns={columns} data={items} searchKey="..." />
    </div>
  );
}
```

### Replace Mock Data

Before:
```tsx
const data: Entity[] = [
  { id: "1", name: "Hardcoded", ... },
];
```

After:
```tsx
const { items: data, loading } = useEntity();
```

### Form Dialog Pattern

```tsx
const [open, setOpen] = useState(false);
const [formData, setFormData] = useState<CreateEntityInput>(initialState);

const handleSubmit = async () => {
  await createEntity(formData);
  setOpen(false);
  setFormData(initialState);
};
```

### Status Badge Variants

```typescript
const variants: Record<string, string> = {
  "approved": "bg-success/10 text-success border-success/20",
  "pending": "bg-warning/10 text-warning border-warning/20",
  "rejected": "bg-critical/10 text-critical border-critical/20",
  "draft": "bg-muted text-muted-foreground border-border",
};
```

## File Upload Pattern

### Storage Bucket

Bucket name: `employee-documents`

### Upload Function

```typescript
const uploadDocument = async (file: File, employeeId: string, docType: string) => {
  const filePath = `${employeeId}/${docType}/${Date.now()}_${file.name}`;
  
  const { data, error } = await supabase.storage
    .from('employee-documents')
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) throw error;
  return data.path;
};
```

### File Path Convention

`{employee_id}/{document_type}/{timestamp}_{filename}`

Example: `abc123/aadhar_card/1707500000000_aadhar.pdf`

## Calculation Patterns

### Payroll Calculation

```typescript
function calculatePayslip(employee: Employee, attendance: AttendanceData): PayslipCalculation {
  const proRatedBasic = (employee.basic_salary * attendance.present_days) / attendance.total_working_days;
  const overtimeAmount = attendance.overtime_hours * employee.overtime_rate;
  const grossSalary = proRatedBasic + employee.hra + employee.special_allowance + overtimeAmount;
  
  const pfDeduction = grossSalary * 0.12;
  const ptDeduction = calculatePT(grossSalary); // State-wise lookup
  const esicDeduction = grossSalary * 0.0075;
  const totalDeductions = pfDeduction + ptDeduction + esicDeduction + employee.other_deductions;
  
  const netPayable = grossSalary - totalDeductions;
  
  return { grossSalary, totalDeductions, netPayable, ... };
}
```

### Reconciliation Variance

```typescript
function calculateVariance(bill: Bill, po: PO, grn: GRN): ReconciliationVariance {
  return {
    bill_po_variance: bill.total_amount - po.grand_total,
    bill_grn_variance: bill.total_amount - grn.accepted_value,
    po_grn_variance: po.grand_total - grn.accepted_value,
    status: isAllZero ? 'matched' : 'discrepancy',
  };
}
```

## RLS Patterns

### Role Check Function

Use existing `get_user_role()` function from schema.sql.

### Policy Template

```sql
CREATE POLICY "Role can action entity"
    ON table_name FOR [SELECT|INSERT|UPDATE|DELETE|ALL]
    TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod', 'account'));
```

### Self-Access Policy

```sql
CREATE POLICY "Users view own records"
    ON table_name FOR SELECT
    TO authenticated
    USING (
        employee_id IN (
            SELECT employee_id FROM users WHERE id = auth.uid()
        )
    );
```

## Sequence Number Generation

### Database Sequence

```sql
CREATE SEQUENCE IF NOT EXISTS candidate_seq START 1;
CREATE SEQUENCE IF NOT EXISTS reconciliation_seq START 1;
```

### Code Generation Function

```sql
CREATE OR REPLACE FUNCTION generate_candidate_code()
RETURNS TRIGGER AS $$
BEGIN
    NEW.candidate_code := 'CAND-' || TO_CHAR(now(), 'YYYY') || '-' || 
        LPAD(nextval('candidate_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_candidate_code
    BEFORE INSERT ON candidates
    FOR EACH ROW
    WHEN (NEW.candidate_code IS NULL)
    EXECUTE FUNCTION generate_candidate_code();
```

---

## Three-Way Reconciliation Pattern (from bs_reconcile)

### Matching Algorithm

```typescript
interface MatchResult {
  poItem: POItem;
  grnItem?: GRNItem;
  billItem?: BillItem;
  matchedQty: number;
  matchedAmount: number;
  variance: number;
  status: 'matched' | 'qty_mismatch' | 'price_mismatch' | 'missing';
}

const performThreeWayMatch = async (
  poId: string, 
  grnId: string, 
  billId: string
): Promise<MatchResult[]> => {
  const poItems = await getPOItems(poId);
  const grnItems = await getGRNItems(grnId);
  const billItems = await getBillItems(billId);
  
  const results: MatchResult[] = [];
  
  for (const poItem of poItems) {
    // Find matching items by product
    const grnItem = grnItems.find(g => g.product_id === poItem.product_id);
    const billItem = billItems.find(b => b.product_id === poItem.product_id);
    
    // Calculate matched quantity (minimum available)
    const matchedQty = Math.min(
      poItem.unmatched_qty ?? poItem.ordered_qty,
      grnItem?.unmatched_qty ?? 0,
      billItem?.unmatched_qty ?? 0
    );
    
    // Calculate variance
    const poAmount = poItem.unit_price * matchedQty;
    const billAmount = billItem ? billItem.unit_price * matchedQty : 0;
    const variance = billAmount - poAmount;
    
    // Determine match status
    let status: MatchResult['status'];
    if (!grnItem || !billItem) status = 'missing';
    else if (grnItem.received_qty !== poItem.ordered_qty) status = 'qty_mismatch';
    else if (Math.abs(variance) > TOLERANCE) status = 'price_mismatch';
    else status = 'matched';
    
    results.push({ poItem, grnItem, billItem, matchedQty, matchedAmount: poAmount, variance, status });
  }
  
  return results;
};
```

### Full Reconcile Detection (from bs_reconcile)

```typescript
const checkFullReconciliation = async (reconciliationId: string): Promise<boolean> => {
  // Get all lines in this reconciliation
  const { data: lines } = await supabase
    .from('reconciliation_lines')
    .select('*, po_items(*), grn_items(*), bill_items(*)')
    .eq('reconciliation_id', reconciliationId);
  
  // Check if all source items have zero residual
  const allMatched = lines.every(line => {
    const poFullyMatched = !line.po_item_id || line.po_items?.unmatched_qty === 0;
    const grnFullyMatched = !line.grn_item_id || line.grn_items?.unmatched_qty === 0;
    const billFullyMatched = !line.bill_item_id || line.bill_items?.unmatched_qty === 0;
    return poFullyMatched && grnFullyMatched && billFullyMatched;
  });
  
  if (allMatched) {
    await supabase
      .from('reconciliations')
      .update({ status: 'matched' })
      .eq('id', reconciliationId);
  }
  
  return allMatched;
};
```

---

## Payroll Calculation Patterns (Enhanced from Horilla)

### Component-Based Calculation

```typescript
interface SalaryComponent {
  abbr: string;
  type: 'earning' | 'deduction';
  amount: number;
  formula: string | null;
  depends_on_payment_days: boolean;
}

interface CalculationContext {
  base: number;          // Basic salary
  gross_pay: number;     // Sum of earnings
  payment_days: number;
  total_working_days: number;
  [key: string]: number; // Component abbreviations
}

const evaluateFormula = (formula: string, context: CalculationContext): number => {
  // Safe formula evaluation
  const allowedKeys = Object.keys(context);
  const fn = new Function(...allowedKeys, `return ${formula}`);
  return fn(...Object.values(context));
};

const calculatePayslip = async (
  employeeId: string,
  cycleId: string
): Promise<PayslipCalculation> => {
  // Get employee's salary structure
  const structure = await getEmployeeSalaryStructure(employeeId);
  const attendance = await getAttendanceForCycle(employeeId, cycleId);
  const cycle = await getCycleById(cycleId);
  
  const context: CalculationContext = {
    base: 0,
    gross_pay: 0,
    payment_days: attendance.present_days + attendance.paid_leave_days,
    total_working_days: cycle.total_working_days,
  };
  
  const earnings: Record<string, number> = {};
  const deductions: Record<string, number> = {};
  
  // First pass: Calculate earnings
  for (const comp of structure.filter(c => c.type === 'earning')) {
    let amount = comp.amount;
    
    if (comp.formula) {
      amount = evaluateFormula(comp.formula, context);
    }
    
    if (comp.depends_on_payment_days) {
      amount = (amount * context.payment_days) / context.total_working_days;
    }
    
    earnings[comp.abbr] = Math.round(amount);
    context[comp.abbr] = Math.round(amount);
    
    if (comp.abbr === 'B') context.base = amount;
  }
  
  context.gross_pay = Object.values(earnings).reduce((a, b) => a + b, 0);
  
  // Second pass: Calculate deductions (may depend on gross)
  for (const comp of structure.filter(c => c.type === 'deduction')) {
    let amount = comp.amount;
    
    if (comp.formula) {
      amount = evaluateFormula(comp.formula, context);
    }
    
    deductions[comp.abbr] = Math.round(amount);
    context[comp.abbr] = Math.round(amount);
  }
  
  const totalDeductions = Object.values(deductions).reduce((a, b) => a + b, 0);
  const netPayable = context.gross_pay - totalDeductions;
  
  return {
    earnings,
    deductions,
    gross_pay: context.gross_pay,
    total_deductions: totalDeductions,
    net_payable: netPayable,
  };
};
```

### Standard Deduction Formulas

| Component | Formula | Notes |
|-----------|---------|-------|
| PF Employee | `base * 0.12` | 12% of basic |
| PF Employer | `base * 0.12` | Employer contribution |
| ESIC Employee | `gross_pay <= 21000 ? gross_pay * 0.0075 : 0` | 0.75% if eligible |
| ESIC Employer | `gross_pay <= 21000 ? gross_pay * 0.0325 : 0` | 3.25% if eligible |
| Professional Tax | Lookup by state and gross slab | Varies by state |

---

## Document Reference

| Pattern | Source Repository | Applicable To |
|---------|-------------------|---------------|
| Dual Status | InvoiceShelf | Bills, Invoices |
| Integer Amounts | InvoiceShelf | All financial tables |
| Due Amount Tracking | InvoiceShelf | Bills, Invoices |
| Junction Table | bs_reconcile | Reconciliation |
| Residual Tracking | bs_reconcile | PO/GRN/Bill Items |
| Salary Components | Horilla HRMS | Payroll |
| Status Transitions | Horilla HRMS | Recruitment |
| Attendance Integration | Horilla HRMS | Payroll |
