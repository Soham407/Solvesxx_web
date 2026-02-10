# Phase C Code Audit

> Audit of implemented Phase C code against reference repository patterns (InvoiceShelf, Horilla HRMS, bs_reconcile).

---

## Audit Summary

| Component | Files Audited | Alignment Score | Critical Gaps |
|-----------|---------------|-----------------|---------------|
| Schema (schema_phaseC.sql) | 1 | 75% | 3 |
| Hooks (useCandidates, useEmployeeDocuments, usePayroll) | 3 | 80% | 4 |
| Pages (recruitment/page.tsx) | 1 | 85% | 1 |

**Overall Assessment:** Good foundation, needs enhancements for production-readiness.

---

## 1. Schema Audit: `schema_phaseC.sql`

### 1.1 Candidates Table

**Current Implementation:**
```sql
CREATE TABLE candidates (
    id UUID PRIMARY KEY,
    candidate_code VARCHAR(20) UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    status candidate_status DEFAULT 'screening',
    -- ... more fields
);
```

**vs. Horilla HRMS Pattern:**

| Aspect | Current | Horilla Pattern | Gap |
|--------|---------|-----------------|-----|
| Status Flow | Single `status` enum | Separate `docstatus` + `status` | Minor |
| Interview Tracking | Single `interview_date`, `interview_notes` | Separate `Interview` doctype with rounds | **Gap** |
| Job Opening Link | `applied_position` (text) | `job_opening` (FK to Job Opening) | **Gap** |
| Staffing Plan | None | Links to Staffing Plan for vacancy validation | **Gap** |

**Recommendations:**

1. **Add Interview Rounds Support** (Medium Priority)
   ```sql
   CREATE TABLE candidate_interviews (
     id UUID PRIMARY KEY,
     candidate_id UUID REFERENCES candidates(id),
     round_number INTEGER NOT NULL,
     interview_type TEXT,  -- 'phone', 'technical', 'hr', 'final'
     scheduled_at TIMESTAMPTZ,
     completed_at TIMESTAMPTZ,
     interviewer_id UUID REFERENCES employees(id),
     rating INTEGER CHECK (rating >= 1 AND rating <= 5),
     feedback TEXT,
     status TEXT DEFAULT 'scheduled',  -- 'scheduled', 'completed', 'cancelled'
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. **Add Job Opening Reference** (Low Priority - PRD doesn't require job requisitions)
   - Current approach (free-text `applied_position`) is acceptable for MVP
   - Consider adding `job_openings` table in future if formal requisition workflow needed

3. **Status Timestamps** ✅
   - Current: `status_changed_at` tracks when status changed
   - Horilla: Uses `creation`, `modified` fields
   - **Assessment:** Current approach is sufficient

---

### 1.2 Payroll Tables

**Current Implementation:**
```sql
-- Payroll Cycles
CREATE TABLE payroll_cycles (
    id UUID PRIMARY KEY,
    cycle_code VARCHAR(20) UNIQUE,
    period_month INTEGER,
    period_year INTEGER,
    total_working_days INTEGER,
    status payroll_cycle_status,
    total_gross DECIMAL(14, 2),
    -- ...
);

-- Payslips
CREATE TABLE payslips (
    id UUID PRIMARY KEY,
    payroll_cycle_id UUID REFERENCES payroll_cycles(id),
    employee_id UUID REFERENCES employees(id),
    basic_salary DECIMAL(12, 2),
    pro_rated_basic DECIMAL(12, 2),
    pf_deduction DECIMAL(12, 2),
    -- ...
);
```

**vs. Horilla HRMS Pattern:**

| Aspect | Current | Horilla Pattern | Assessment |
|--------|---------|-----------------|------------|
| Salary Structure | None (hardcoded in hook) | Separate `SalaryStructure` with components | **Critical Gap** |
| Formula Evaluation | Hardcoded percentages | Dynamic formulas with `_safe_eval` | **Gap** (OK for MVP) |
| Component Categories | Flat columns (hra, da, pf) | Earnings/Deductions child tables | **Structural Gap** |
| Leave Integration | `leave_days` column | Links to Leave Ledger | **Gap** |
| Attendance Source | Manual input | Auto-fetch from Attendance module | **Gap** |

**Critical Recommendations:**

1. **Add Salary Components Table** (High Priority)
   ```sql
   CREATE TABLE salary_components (
     id UUID PRIMARY KEY,
     name TEXT NOT NULL,  -- 'Basic', 'HRA', 'PF Employee', etc.
     abbr TEXT UNIQUE,    -- 'B', 'HRA', 'PF'
     type TEXT NOT NULL,  -- 'earning' or 'deduction'
     is_tax_applicable BOOLEAN DEFAULT true,
     formula TEXT,        -- 'base * 0.12' or NULL for fixed
     default_amount DECIMAL(12,2),
     depends_on_payment_days BOOLEAN DEFAULT true,
     is_active BOOLEAN DEFAULT true
   );
   
   CREATE TABLE employee_salary_structure (
     id UUID PRIMARY KEY,
     employee_id UUID REFERENCES employees(id),
     component_id UUID REFERENCES salary_components(id),
     amount DECIMAL(12,2),  -- Override amount
     effective_from DATE,
     effective_to DATE,
     UNIQUE(employee_id, component_id, effective_from)
   );
   ```

2. **Integrate with Attendance** (High Priority)
   - Current: `present_days`, `leave_days` entered manually during payslip generation
   - Recommendation: Auto-calculate from `attendance` and `leave_applications` tables
   - Add function:
   ```sql
   CREATE FUNCTION get_attendance_summary(
     p_employee_id UUID,
     p_start_date DATE,
     p_end_date DATE
   ) RETURNS TABLE (
     present_days DECIMAL,
     absent_days DECIMAL,
     leave_days DECIMAL,
     overtime_hours DECIMAL
   ) AS $$
     -- Query attendance table
     -- Calculate from leave_applications
   $$ LANGUAGE plpgsql;
   ```

3. **Amount Storage Pattern** (Medium Priority)
   - Current: `DECIMAL(12, 2)` for currency
   - InvoiceShelf: `bigint` (store as paise/cents)
   - **Assessment:** Current approach is acceptable, but integer storage is more precise
   - Recommendation for new tables: Use `bigint` and store amounts in smallest unit (paise)

---

### 1.3 Employee Documents Table

**Current Implementation:**
```sql
CREATE TABLE employee_documents (
    id UUID PRIMARY KEY,
    employee_id UUID REFERENCES employees(id),
    document_type document_type NOT NULL,
    document_number VARCHAR(100),
    file_path TEXT NOT NULL,
    status document_status DEFAULT 'pending_review',
    expiry_date DATE,
    verified_at TIMESTAMPTZ,
    verified_by UUID,
    -- ...
);
```

**vs. Horilla HRMS Pattern:**

| Aspect | Current | Horilla Pattern | Assessment |
|--------|---------|-----------------|------------|
| Document Types | Enum with 14 types | Dynamic via DocumentType master | Current is simpler, acceptable |
| Verification Flow | `verified_at`, `verified_by` | Similar approach | ✅ Aligned |
| Expiry Tracking | `expiry_date` column | Similar + notification workflow | ✅ Aligned |
| File Storage | Supabase Storage path | Frappe file attachment | ✅ Aligned |

**Assessment:** ✅ Well-implemented. Minor enhancements:

1. **Add Required Documents Configuration** (Low Priority)
   ```sql
   -- Track which documents are mandatory per designation
   CREATE TABLE designation_required_documents (
     designation_id UUID REFERENCES designations(id),
     document_type document_type,
     is_mandatory BOOLEAN DEFAULT true,
     PRIMARY KEY (designation_id, document_type)
   );
   ```

2. **Document Compliance View** (Low Priority)
   ```sql
   CREATE VIEW employee_document_compliance AS
   SELECT 
     e.id as employee_id,
     e.employee_code,
     COUNT(CASE WHEN ed.status = 'verified' THEN 1 END) as verified_count,
     COUNT(CASE WHEN ed.status = 'expired' THEN 1 END) as expired_count,
     COUNT(CASE WHEN ed.expiry_date < NOW() + INTERVAL '30 days' THEN 1 END) as expiring_soon
   FROM employees e
   LEFT JOIN employee_documents ed ON e.id = ed.employee_id
   GROUP BY e.id, e.employee_code;
   ```

---

### 1.4 Reconciliations Table

**Current Implementation:**
```sql
CREATE TABLE reconciliations (
    id UUID PRIMARY KEY,
    reconciliation_number VARCHAR(20) UNIQUE,
    purchase_bill_id UUID REFERENCES purchase_bills(id),
    purchase_order_id UUID REFERENCES purchase_orders(id),
    material_receipt_id UUID REFERENCES material_receipts(id),
    bill_amount DECIMAL(14, 2),
    po_amount DECIMAL(14, 2),
    grn_amount DECIMAL(14, 2),
    bill_po_variance DECIMAL(14, 2),
    status reconciliation_status,
    -- ...
);
```

**vs. bs_reconcile Pattern:**

| Aspect | Current | bs_reconcile Pattern | Gap Severity |
|--------|---------|----------------------|--------------|
| Matching Granularity | Document-level only | Line-item level with junction table | **Critical** |
| Partial Matching | Not supported | `PartialReconcileEntry` junction table | **Critical** |
| Residual Tracking | None | `residual` field on each entry | **Critical** |
| Full Reconcile Group | Single record | `FullReconcileNumber` linking multiple | **Gap** |
| Many-to-Many | 1:1:1 (Bill:PO:GRN) | Many-to-many via junction | **Critical** |

**Critical Recommendations:**

1. **Add Line-Item Level Matching** (Critical)
   ```sql
   -- Junction table for line-item reconciliation
   CREATE TABLE reconciliation_lines (
     id UUID PRIMARY KEY,
     reconciliation_id UUID REFERENCES reconciliations(id),
     
     -- Source document lines (nullable - not all three required)
     po_item_id UUID REFERENCES purchase_order_items(id),
     grn_item_id UUID REFERENCES material_receipt_items(id),
     bill_item_id UUID REFERENCES purchase_bill_items(id),
     
     -- Product reference for easier querying
     product_id UUID REFERENCES products(id),
     
     -- Matched amounts
     matched_qty DECIMAL(10, 2),
     matched_amount DECIMAL(14, 2),
     
     -- Variance at line level
     unit_price_variance DECIMAL(14, 2),  -- bill_price - po_price
     qty_variance DECIMAL(10, 2),          -- received - ordered
     
     -- Match type
     match_type TEXT NOT NULL,  -- 'PO_GRN', 'GRN_BILL', 'PO_BILL', 'THREE_WAY'
     
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. **Add Residual Tracking to Source Documents** (Critical)
   ```sql
   -- Add to purchase_order_items
   ALTER TABLE purchase_order_items 
     ADD COLUMN unmatched_qty DECIMAL(10, 2),
     ADD COLUMN unmatched_amount DECIMAL(14, 2);
   
   -- Add to material_receipt_items
   ALTER TABLE material_receipt_items 
     ADD COLUMN unmatched_qty DECIMAL(10, 2),
     ADD COLUMN unmatched_amount DECIMAL(14, 2);
   
   -- Add to purchase_bill_items
   ALTER TABLE purchase_bill_items 
     ADD COLUMN unmatched_qty DECIMAL(10, 2),
     ADD COLUMN unmatched_amount DECIMAL(14, 2);
   ```

3. **Update Reconciliation Status Logic** (High Priority)
   ```sql
   -- Function to determine reconciliation status
   CREATE FUNCTION update_reconciliation_status(p_reconciliation_id UUID)
   RETURNS void AS $$
   DECLARE
     v_total_variance DECIMAL;
     v_all_matched BOOLEAN;
   BEGIN
     -- Check if all line items have zero variance
     SELECT 
       SUM(ABS(unit_price_variance) + ABS(qty_variance)),
       BOOL_AND(match_type = 'THREE_WAY')
     INTO v_total_variance, v_all_matched
     FROM reconciliation_lines
     WHERE reconciliation_id = p_reconciliation_id;
     
     UPDATE reconciliations SET status = 
       CASE 
         WHEN v_all_matched AND v_total_variance = 0 THEN 'matched'
         WHEN v_total_variance > 0 THEN 'discrepancy'
         ELSE 'pending'
       END
     WHERE id = p_reconciliation_id;
   END;
   $$ LANGUAGE plpgsql;
   ```

---

## 2. Hooks Audit

### 2.1 `useCandidates.ts`

**Strengths:**
- ✅ Clean TypeScript interfaces
- ✅ Status transition validation (`STATUS_TRANSITIONS` mapping)
- ✅ `convertToEmployee` creates employee record and links back
- ✅ Client-side search filtering
- ✅ Status statistics calculation

**Gaps vs. Horilla:**

| Feature | Current | Horilla Pattern | Priority |
|---------|---------|-----------------|----------|
| Interview Scheduling | Not implemented | Creates Interview doctype | Medium |
| Offer Letter Generation | Not implemented | Template-based generation | Low |
| Onboarding Workflow | Basic (convert only) | Task-based checklist | Medium |
| Email Notifications | None | On status change | Low |

**Recommendations:**

1. **Add Interview Scheduling** (Medium Priority)
   ```typescript
   const scheduleInterview = useCallback(async (
     candidateId: string,
     interviewData: {
       round_number: number;
       interview_type: 'phone' | 'technical' | 'hr' | 'final';
       scheduled_at: string;
       interviewer_id: string;
     }
   ) => {
     // Insert into candidate_interviews table
     // Update candidate status to 'interviewing' if first interview
   }, []);
   ```

2. **Enhance Status Change with Validation** (Low Priority)
   - Current: Validates allowed transitions
   - Enhancement: Add business rule validation (e.g., must have interview before BGV)
   ```typescript
   // Before moving to background_check, ensure interview completed
   if (newStatus === 'background_check') {
     const hasCompletedInterview = candidate.interview_rating != null;
     if (!hasCompletedInterview) {
       throw new Error('Interview must be completed before background check');
     }
   }
   ```

---

### 2.2 `useEmployeeDocuments.ts`

**Strengths:**
- ✅ File validation (type, size)
- ✅ Storage upload with rollback on DB error
- ✅ Signed URL generation for downloads
- ✅ Expiring documents query
- ✅ Verify/Reject workflow

**Gaps:**

| Feature | Current | Reference Pattern | Priority |
|---------|---------|-------------------|----------|
| Bulk Upload | Not implemented | Useful for onboarding | Low |
| Document Templates | None | Required document checklist | Medium |
| Auto-Expiry Status | Manual check | Trigger to auto-mark expired | Medium |

**Recommendations:**

1. **Add Auto-Expiry Trigger** (Medium Priority)
   ```sql
   -- Database trigger to mark expired documents
   CREATE FUNCTION mark_expired_documents()
   RETURNS void AS $$
   BEGIN
     UPDATE employee_documents
     SET status = 'expired'
     WHERE expiry_date < CURRENT_DATE
       AND status = 'verified';
   END;
   $$ LANGUAGE plpgsql;
   
   -- Run daily via pg_cron or Edge Function
   ```

2. **Add Required Documents Check** (Medium Priority)
   ```typescript
   const getRequiredDocumentStatus = useCallback(async (
     employeeId: string,
     designationId: string
   ): Promise<{
     required: DocumentType[];
     uploaded: DocumentType[];
     verified: DocumentType[];
     missing: DocumentType[];
   }> => {
     // Query designation_required_documents
     // Compare with uploaded documents
   }, []);
   ```

---

### 2.3 `usePayroll.ts`

**Strengths:**
- ✅ `calculateSalary` function with proper formula
- ✅ Pro-rata basic calculation based on attendance
- ✅ PF, ESIC, PT deduction logic
- ✅ Batch payslip generation
- ✅ Cycle status workflow (draft → processing → computed → approved → disbursed)

**Gaps vs. Horilla:**

| Feature | Current | Horilla Pattern | Priority |
|---------|---------|-----------------|----------|
| Dynamic Components | Hardcoded columns | Salary Structure template | **High** |
| Attendance Auto-Fetch | Manual input | Query attendance module | **High** |
| Leave Without Pay | Not calculated | Deducted from payment days | Medium |
| Arrears Calculation | Not implemented | For backdated changes | Low |
| TDS Calculation | Placeholder (0) | Tax slab based | Medium |

**Critical Recommendations:**

1. **Integrate with Attendance Module** (High Priority)
   ```typescript
   const fetchAttendanceForCycle = useCallback(async (
     cycleId: string
   ): Promise<Map<string, AttendanceData>> => {
     const cycle = getCycleById(cycleId);
     if (!cycle) throw new Error('Cycle not found');
     
     const { data: attendance } = await supabase
       .from('attendance')
       .select('employee_id, status')
       .gte('date', cycle.period_start)
       .lte('date', cycle.period_end);
     
     const { data: leaves } = await supabase
       .from('leave_applications')
       .select('employee_id, total_days, leave_types(is_paid)')
       .eq('status', 'approved')
       .overlaps('start_date', 'end_date', [cycle.period_start, cycle.period_end]);
     
     // Aggregate by employee
     const attendanceMap = new Map<string, AttendanceData>();
     // ... calculation logic
     
     return attendanceMap;
   }, [getCycleById]);
   ```

2. **Make Components Dynamic** (High Priority)
   - Instead of hardcoded `hra`, `special_allowance`, `pf_deduction` columns
   - Use `salary_components` table and `employee_salary_structure`
   - Calculate dynamically:
   ```typescript
   const calculateSalaryFromStructure = async (
     employeeId: string,
     attendance: AttendanceData,
     totalWorkingDays: number
   ) => {
     // Fetch employee's salary structure
     const { data: structure } = await supabase
       .from('employee_salary_structure')
       .select('*, salary_components(*)')
       .eq('employee_id', employeeId)
       .is('effective_to', null);
     
     let earnings: Record<string, number> = {};
     let deductions: Record<string, number> = {};
     
     for (const item of structure) {
       const component = item.salary_components;
       let amount = item.amount;
       
       // Apply formula if exists
       if (component.formula) {
         amount = evaluateFormula(component.formula, { base: earnings['basic'] ?? 0 });
       }
       
       // Pro-rate if depends on payment days
       if (component.depends_on_payment_days) {
         amount = (amount * attendance.present_days) / totalWorkingDays;
       }
       
       if (component.type === 'earning') {
         earnings[component.abbr] = amount;
       } else {
         deductions[component.abbr] = amount;
       }
     }
     
     // ... return calculated payslip
   };
   ```

3. **Add TDS Calculation** (Medium Priority)
   ```typescript
   const calculateTDS = (annualIncome: number): number => {
     // FY 2024-25 Old Regime (simplified)
     const taxSlabs = [
       { limit: 250000, rate: 0 },
       { limit: 500000, rate: 0.05 },
       { limit: 1000000, rate: 0.20 },
       { limit: Infinity, rate: 0.30 },
     ];
     
     let tax = 0;
     let remaining = annualIncome;
     let previousLimit = 0;
     
     for (const slab of taxSlabs) {
       const taxableInSlab = Math.min(remaining, slab.limit - previousLimit);
       tax += taxableInSlab * slab.rate;
       remaining -= taxableInSlab;
       previousLimit = slab.limit;
       if (remaining <= 0) break;
     }
     
     // Add 4% cess
     tax = tax * 1.04;
     
     // Return monthly TDS
     return Math.round(tax / 12);
   };
   ```

---

## 3. Pages Audit

### 3.1 `hrms/recruitment/page.tsx`

**Strengths:**
- ✅ Uses `useCandidates` hook (no mock data)
- ✅ Loading and error states
- ✅ Status statistics cards
- ✅ Add candidate dialog with form validation
- ✅ Status change dialog with context-aware notes
- ✅ Action dropdown with transition validation

**Gaps:**

| Feature | Current | Enhancement | Priority |
|---------|---------|-------------|----------|
| View Details | Button exists, no dialog | Add detail view | Medium |
| Edit Candidate | Menu item, no dialog | Add edit dialog | Medium |
| Interview Scheduling | Not implemented | Add interview dialog | Medium |
| Bulk Actions | None | Select multiple, bulk reject | Low |
| Filters | None visible | Filter by status, department | Medium |

**Recommendations:**

1. **Add Filter Controls** (Medium Priority)
   ```tsx
   <div className="flex gap-2 mb-4">
     <Select 
       value={filters.status || 'all'} 
       onValueChange={(v) => setFilters({ ...filters, status: v === 'all' ? undefined : v })}
     >
       <SelectTrigger className="w-[180px]">
         <SelectValue placeholder="All Statuses" />
       </SelectTrigger>
       <SelectContent>
         <SelectItem value="all">All Statuses</SelectItem>
         {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
           <SelectItem key={key} value={key}>{label}</SelectItem>
         ))}
       </SelectContent>
     </Select>
   </div>
   ```

2. **Add Candidate Detail View** (Medium Priority)
   - Implement slide-over or dialog showing full candidate details
   - Include interview history, BGV status, offer details
   - Show document checklist

---

## 4. Gap Summary & Priority Matrix

### Critical Gaps (Must Fix)

| Gap | Component | Effort | Impact |
|-----|-----------|--------|--------|
| Line-item reconciliation | Schema | High | Required for PRD compliance |
| Residual tracking | Schema | Medium | Required for partial matching |
| Attendance integration | usePayroll | Medium | Accuracy of payroll |

### High Priority Gaps (Should Fix)

| Gap | Component | Effort | Impact |
|-----|-----------|--------|--------|
| Salary components table | Schema | Medium | Flexibility, maintainability |
| Dynamic payroll calculation | usePayroll | Medium | Business requirement |
| Interview rounds tracking | Schema + Hook | Medium | Complete recruitment workflow |

### Medium Priority Gaps (Nice to Have)

| Gap | Component | Effort | Impact |
|-----|-----------|--------|--------|
| TDS calculation | usePayroll | Low | Payroll accuracy |
| Document compliance tracking | Schema + Hook | Low | Compliance reporting |
| Page filters | recruitment/page | Low | UX improvement |
| Auto-expiry trigger | Schema | Low | Automation |

### Low Priority Gaps (Future Enhancement)

| Gap | Component | Effort | Impact |
|-----|-----------|--------|--------|
| Offer letter generation | useCandidates | Medium | Workflow convenience |
| Bulk document upload | useEmployeeDocuments | Medium | Onboarding speed |
| Email notifications | All hooks | High | User engagement |

---

## 5. Recommended Implementation Order

### Phase C.1 (Immediate - Before Go-Live)

1. Add `reconciliation_lines` table and update reconciliation logic
2. Add residual columns to PO/GRN/Bill items
3. Integrate payroll with attendance module

### Phase C.2 (Short-Term - First Sprint After)

1. Add `salary_components` and `employee_salary_structure` tables
2. Implement dynamic payroll calculation
3. Add `candidate_interviews` table
4. Add interview scheduling to recruitment page

### Phase C.3 (Medium-Term)

1. Add TDS calculation with tax slabs
2. Implement document compliance tracking
3. Add page filters and detail views
4. Create auto-expiry trigger for documents

---

## 6. Files Audited

| File | Lines | Status |
|------|-------|--------|
| `supabase/PhaseC/schema_phaseC.sql` | 757 | Reviewed |
| `hooks/useCandidates.ts` | 572 | Reviewed |
| `hooks/useEmployeeDocuments.ts` | 561 | Reviewed |
| `hooks/usePayroll.ts` | 686 | Reviewed |
| `app/(dashboard)/hrms/recruitment/page.tsx` | 541 | Reviewed |
| `docs/PhaseC/PATTERNS.md` | 315 | Referenced |

---

*Document created: Phase C Code Audit*
*Last updated: 2024*
