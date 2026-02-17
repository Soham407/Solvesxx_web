# Phase E — Operational Truth Implementation Plan (MCP-Enhanced)

**Status:** READY FOR EXECUTION  
**Last Updated:** 2026-02-17  
**Prerequisite:** SYSTEM_STATE_V1.md (Baseline v1 Complete)  
**Estimated Effort:** 7 days (Go-Live Sprint)  
**Estimated LOC:** ~800 lines (SQL + TypeScript + React)

---

## 🎯 Executive Summary

This implementation plan converts **"Placeholder UI"** into **"Operational Truth"** by enforcing evidence capture and hardcoded business rules at the **database level** using Supabase MCP Server. The plan is designed for a **Production Delivery Engineer** to execute over a **7-day Go-Live sprint**.

### Core Principle: "Thin-Client, Fat-Database"

All business logic is enforced via:
- **PostgreSQL Constraints** (NOT NULL, CHECK constraints)
- **Row-Level Security (RLS)** policies
- **Database Functions (RPCs)** with SECURITY DEFINER
- **Triggers** for audit trails

The mobile/web UI becomes a **"dumb terminal"** that cannot bypass these rules.

---

## 🛠️ Phase 1: Operational Truth Requirements

### Critical Gap Analysis (From Current State)

| Module | Current State | Required State | Risk Level |
|--------|--------------|----------------|------------|
| **Delivery Dashboard** | `ComingSoon` shell | Photo + Signature mandatory | 🔴 HIGH |
| **Service Boy Dashboard** | No evidence capture | Before/After photos required | 🔴 HIGH |
| **Finance (3-Way Match)** | Manual reconciliation | DB-enforced gate | 🔴 CRITICAL |
| **Guard Directory** | No resident lookup | Privacy-safe search | 🟡 MEDIUM |
| **HRMS BGV** | Text field only | PDF upload mandatory | 🟡 MEDIUM |
| **Type Safety** | 65 `as any` casts | Generated types | 🟢 LOW |

---

## 📅 7-Day Execution Timeline

### Day 1: Delivery Truth Engine (Database Foundation)

**Objective:** Create the "material arrival" proof-of-work system.

#### 1.1 Database Schema (via Supabase MCP)

```sql
-- Migration: 001_delivery_truth_engine.sql

-- Create material arrival logs table
CREATE TABLE IF NOT EXISTS material_arrival_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    vehicle_number TEXT NOT NULL CHECK (length(vehicle_number) >= 4),
    arrival_photo_url TEXT NOT NULL, -- MANDATORY
    arrival_signature_url TEXT, -- Optional for Phase 1
    logged_by UUID NOT NULL REFERENCES users(id),
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    gate_location TEXT,
    notes TEXT,
    
    -- Audit trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS Policies
ALTER TABLE material_arrival_logs ENABLE ROW LEVEL SECURITY;

-- Only delivery_boy and security_guard can create logs
CREATE POLICY "delivery_boy_can_log_arrivals"
ON material_arrival_logs FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('delivery_boy', 'security_guard')
    )
);

-- All authenticated users can view logs
CREATE POLICY "all_can_view_arrival_logs"
ON material_arrival_logs FOR SELECT
TO authenticated
USING (true);

-- Create indexes for performance
CREATE INDEX idx_material_arrival_po ON material_arrival_logs(po_id);
CREATE INDEX idx_material_arrival_logged_by ON material_arrival_logs(logged_by);
CREATE INDEX idx_material_arrival_logged_at ON material_arrival_logs(logged_at DESC);

-- RPC: Log material arrival with validation
CREATE OR REPLACE FUNCTION log_material_arrival(
    p_po_id UUID,
    p_vehicle_number TEXT,
    p_arrival_photo_url TEXT,
    p_arrival_signature_url TEXT DEFAULT NULL,
    p_gate_location TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_log_id UUID;
    v_user_role TEXT;
BEGIN
    -- Verify user role
    SELECT role INTO v_user_role
    FROM users
    WHERE id = auth.uid();
    
    IF v_user_role NOT IN ('delivery_boy', 'security_guard') THEN
        RAISE EXCEPTION 'Unauthorized: Only delivery_boy or security_guard can log arrivals';
    END IF;
    
    -- Verify PO exists
    IF NOT EXISTS (SELECT 1 FROM purchase_orders WHERE id = p_po_id) THEN
        RAISE EXCEPTION 'Invalid PO ID: %', p_po_id;
    END IF;
    
    -- Validate photo URL (must be from Supabase Storage)
    IF p_arrival_photo_url IS NULL OR p_arrival_photo_url = '' THEN
        RAISE EXCEPTION 'Arrival photo is mandatory';
    END IF;
    
    IF NOT p_arrival_photo_url LIKE '%/storage/v1/object/%' THEN
        RAISE EXCEPTION 'Invalid photo URL: Must be from Supabase Storage';
    END IF;
    
    -- Insert log
    INSERT INTO material_arrival_logs (
        po_id,
        vehicle_number,
        arrival_photo_url,
        arrival_signature_url,
        logged_by,
        gate_location,
        notes
    ) VALUES (
        p_po_id,
        p_vehicle_number,
        p_arrival_photo_url,
        p_arrival_signature_url,
        auth.uid(),
        p_gate_location,
        p_notes
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION log_material_arrival TO authenticated;
```

#### 1.2 Frontend Hook (TypeScript)

**File:** `hooks/useDeliveryLogs.ts`

```typescript
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface LogArrivalParams {
  poId: string;
  vehicleNumber: string;
  arrivalPhotoUrl: string;
  arrivalSignatureUrl?: string;
  gateLocation?: string;
  notes?: string;
}

export function useDeliveryLogs() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  const logMaterialArrival = async (params: LogArrivalParams) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('log_material_arrival', {
        p_po_id: params.poId,
        p_vehicle_number: params.vehicleNumber,
        p_arrival_photo_url: params.arrivalPhotoUrl,
        p_arrival_signature_url: params.arrivalSignatureUrl,
        p_gate_location: params.gateLocation,
        p_notes: params.notes,
      });

      if (error) throw error;

      toast({
        title: 'Arrival Logged',
        description: 'Material arrival has been recorded successfully.',
      });

      return { success: true, logId: data };
    } catch (error: any) {
      toast({
        title: 'Failed to Log Arrival',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const getArrivalLogs = async (poId?: string) => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('material_arrival_logs')
        .select(`
          *,
          purchase_orders (
            po_number,
            supplier:suppliers (
              supplier_name
            )
          ),
          logged_by_user:users!logged_by (
            full_name,
            role
          )
        `)
        .order('logged_at', { ascending: false });

      if (poId) {
        query = query.eq('po_id', poId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, logs: data };
    } catch (error: any) {
      toast({
        title: 'Failed to Fetch Logs',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, logs: [] };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    logMaterialArrival,
    getArrivalLogs,
    isLoading,
  };
}
```

#### 1.3 UI Component Update

**File:** `components/dashboards/DeliveryDashboard.tsx`

Replace the `ComingSoon` component with a functional delivery logging interface. The component will:
1. Fetch assigned POs for the delivery boy
2. Display a "Verify Arrival" button for each PO
3. Open a modal with `EvidenceUploader` for photo capture
4. Call `logMaterialArrival` RPC on submission

**Implementation Note:** This will be done on Day 1 after the database migration is applied.

---

### Day 2: Service Boy Evidence Capture

**Objective:** Enforce "Before/After" photo requirement for service completion.

#### 2.1 Database Schema (via Supabase MCP)

```sql
-- Migration: 002_service_evidence_enforcement.sql

-- Add evidence columns to service_requests table
ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS before_photo_url TEXT,
ADD COLUMN IF NOT EXISTS after_photo_url TEXT,
ADD COLUMN IF NOT EXISTS completion_signature_url TEXT;

-- Create CHECK constraint: Cannot mark as 'completed' without after_photo
ALTER TABLE service_requests
ADD CONSTRAINT service_completion_requires_photo
CHECK (
    (status != 'completed') OR 
    (status = 'completed' AND after_photo_url IS NOT NULL)
);

-- RPC: Complete service task with evidence validation
CREATE OR REPLACE FUNCTION complete_service_task(
    p_request_id UUID,
    p_after_photo_url TEXT,
    p_completion_signature_url TEXT DEFAULT NULL,
    p_completion_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_status TEXT;
    v_assigned_to UUID;
BEGIN
    -- Fetch current status and assigned technician
    SELECT status, assigned_to
    INTO v_current_status, v_assigned_to
    FROM service_requests
    WHERE id = p_request_id;
    
    -- Verify request exists
    IF v_current_status IS NULL THEN
        RAISE EXCEPTION 'Service request not found: %', p_request_id;
    END IF;
    
    -- Verify user is assigned to this task
    IF v_assigned_to != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: You are not assigned to this task';
    END IF;
    
    -- Validate after photo
    IF p_after_photo_url IS NULL OR p_after_photo_url = '' THEN
        RAISE EXCEPTION 'After photo is mandatory for task completion';
    END IF;
    
    IF NOT p_after_photo_url LIKE '%/storage/v1/object/%' THEN
        RAISE EXCEPTION 'Invalid photo URL: Must be from Supabase Storage';
    END IF;
    
    -- Update service request
    UPDATE service_requests
    SET 
        status = 'completed',
        after_photo_url = p_after_photo_url,
        completion_signature_url = p_completion_signature_url,
        completion_notes = p_completion_notes,
        completed_at = now(),
        updated_at = now()
    WHERE id = p_request_id;
    
    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION complete_service_task TO authenticated;

-- RPC: Start service task (capture before photo)
CREATE OR REPLACE FUNCTION start_service_task(
    p_request_id UUID,
    p_before_photo_url TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Validate before photo
    IF p_before_photo_url IS NULL OR p_before_photo_url = '' THEN
        RAISE EXCEPTION 'Before photo is mandatory to start task';
    END IF;
    
    -- Update service request
    UPDATE service_requests
    SET 
        status = 'in_progress',
        before_photo_url = p_before_photo_url,
        started_at = now(),
        updated_at = now()
    WHERE id = p_request_id
    AND assigned_to = auth.uid();
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Service request not found or not assigned to you';
    END IF;
    
    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION start_service_task TO authenticated;
```

#### 2.2 Frontend Hook Update

**File:** `hooks/useServiceRequests.ts`

Add two new methods:
- `startServiceTask(requestId, beforePhotoUrl)`
- `completeServiceTask(requestId, afterPhotoUrl, signatureUrl?, notes?)`

Both methods will call the respective RPCs and handle errors.

#### 2.3 UI Component Update

**File:** `components/dashboards/ServiceBoyDashboard.tsx`

Update the existing dashboard to:
1. Show a "Start Task" button that opens a modal to capture the "Before" photo
2. Show a "Complete Task" button (only if task is in_progress) that captures the "After" photo
3. Disable the "Complete" button until the after photo is uploaded

---

### Day 3: Finance 3-Way Match Hard-Lock

**Objective:** Prevent unauthorized payouts by enforcing reconciliation at the database level.

#### 3.1 Database Schema (via Supabase MCP)

```sql
-- Migration: 003_finance_3way_match_enforcement.sql

-- Add reconciliation_status to supplier_bills if not exists
ALTER TABLE supplier_bills
ADD COLUMN IF NOT EXISTS reconciliation_status TEXT DEFAULT 'pending'
CHECK (reconciliation_status IN ('pending', 'matched', 'discrepancy', 'force_matched'));

-- Create CHECK constraint: Cannot pay bill unless reconciled
ALTER TABLE supplier_bills
ADD CONSTRAINT payment_requires_reconciliation
CHECK (
    (status != 'paid') OR 
    (status = 'paid' AND reconciliation_status IN ('matched', 'force_matched'))
);

-- Create audit_logs table for override tracking
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    performed_by UUID NOT NULL REFERENCES users(id),
    performed_by_email TEXT NOT NULL,
    reason TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "admins_can_view_audit_logs"
ON audit_logs FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'finance_manager')
    )
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_performed_by ON audit_logs(performed_by);

-- RPC: Validate bill for payout
CREATE OR REPLACE FUNCTION validate_bill_for_payout(
    p_bill_id UUID
)
RETURNS TABLE (
    can_pay BOOLEAN,
    reason TEXT,
    reconciliation_status TEXT,
    po_amount NUMERIC,
    grn_amount NUMERIC,
    bill_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_bill RECORD;
BEGIN
    -- Fetch bill details with PO and GRN amounts
    SELECT 
        sb.id,
        sb.reconciliation_status,
        sb.total_amount as bill_amount,
        sb.status,
        po.total_amount as po_amount,
        COALESCE(grn.total_received_amount, 0) as grn_amount
    INTO v_bill
    FROM supplier_bills sb
    LEFT JOIN purchase_orders po ON sb.po_id = po.id
    LEFT JOIN (
        SELECT 
            po_id,
            SUM(received_quantity * unit_price) as total_received_amount
        FROM grn_items
        GROUP BY po_id
    ) grn ON po.id = grn.po_id
    WHERE sb.id = p_bill_id;
    
    -- Check if bill exists
    IF v_bill.id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Bill not found', NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC;
        RETURN;
    END IF;
    
    -- Check if already paid
    IF v_bill.status = 'paid' THEN
        RETURN QUERY SELECT FALSE, 'Bill already paid', v_bill.reconciliation_status, v_bill.po_amount, v_bill.grn_amount, v_bill.bill_amount;
        RETURN;
    END IF;
    
    -- Check reconciliation status
    IF v_bill.reconciliation_status NOT IN ('matched', 'force_matched') THEN
        RETURN QUERY SELECT FALSE, 'Bill not reconciled. Please complete 3-way match.', v_bill.reconciliation_status, v_bill.po_amount, v_bill.grn_amount, v_bill.bill_amount;
        RETURN;
    END IF;
    
    -- All checks passed
    RETURN QUERY SELECT TRUE, 'Bill is ready for payout', v_bill.reconciliation_status, v_bill.po_amount, v_bill.grn_amount, v_bill.bill_amount;
END;
$$;

GRANT EXECUTE ON FUNCTION validate_bill_for_payout TO authenticated;

-- RPC: Force match with audit trail
CREATE OR REPLACE FUNCTION force_match_bill(
    p_bill_id UUID,
    p_override_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_role TEXT;
    v_user_email TEXT;
BEGIN
    -- Verify user is admin or finance_manager
    SELECT role, email INTO v_user_role, v_user_email
    FROM users
    WHERE id = auth.uid();
    
    IF v_user_role NOT IN ('admin', 'finance_manager') THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can force match bills';
    END IF;
    
    -- Validate reason
    IF p_override_reason IS NULL OR length(trim(p_override_reason)) < 10 THEN
        RAISE EXCEPTION 'Override reason must be at least 10 characters';
    END IF;
    
    -- Update bill status
    UPDATE supplier_bills
    SET 
        reconciliation_status = 'force_matched',
        updated_at = now()
    WHERE id = p_bill_id;
    
    -- Log to audit trail
    INSERT INTO audit_logs (
        action_type,
        entity_type,
        entity_id,
        performed_by,
        performed_by_email,
        reason
    ) VALUES (
        'force_match',
        'supplier_bill',
        p_bill_id,
        auth.uid(),
        v_user_email,
        p_override_reason
    );
    
    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION force_match_bill TO authenticated;
```

#### 3.2 Frontend Update

**File:** `app/(dashboard)/finance/supplier-bills/page.tsx`

Update the "Record Payout" button logic:
1. Call `validate_bill_for_payout(bill_id)` before enabling the button
2. Disable button if `can_pay = false`
3. Show tooltip with the `reason` if disabled
4. Add a "Force Match" button (admin only) that opens a modal requiring a reason

---

### Day 4: Privacy-Safe Resident Directory

**Objective:** Enable guards to verify residents without exposing private phone numbers.

#### 4.1 Database Schema (via Supabase MCP)

```sql
-- Migration: 004_resident_verification_view.sql

-- Create privacy-safe view for guards
CREATE OR REPLACE VIEW resident_verification_view AS
SELECT 
    r.id,
    r.full_name,
    r.flat_number,
    r.profile_photo_url,
    -- Mask phone number: Show first 2 and last 2 digits only
    CASE 
        WHEN r.phone IS NOT NULL THEN
            LEFT(r.phone, 2) || '****' || RIGHT(r.phone, 2)
        ELSE NULL
    END as masked_phone,
    r.society_id,
    r.is_owner,
    r.move_in_date,
    r.status
FROM residents r
WHERE r.status = 'active';

-- RLS on view
ALTER VIEW resident_verification_view SET (security_invoker = true);

-- Grant select to authenticated users with guard role
GRANT SELECT ON resident_verification_view TO authenticated;

-- RPC: Search residents (for guards)
CREATE OR REPLACE FUNCTION search_residents(
    p_query TEXT,
    p_society_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    flat_number TEXT,
    profile_photo_url TEXT,
    masked_phone TEXT,
    is_owner BOOLEAN,
    move_in_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_role TEXT;
BEGIN
    -- Verify user is a guard or security personnel
    SELECT role INTO v_user_role
    FROM users
    WHERE id = auth.uid();
    
    IF v_user_role NOT IN ('security_guard', 'admin', 'supervisor') THEN
        RAISE EXCEPTION 'Unauthorized: Only security personnel can search residents';
    END IF;
    
    -- Search residents
    RETURN QUERY
    SELECT 
        rv.id,
        rv.full_name,
        rv.flat_number,
        rv.profile_photo_url,
        rv.masked_phone,
        rv.is_owner,
        rv.move_in_date
    FROM resident_verification_view rv
    WHERE 
        (p_society_id IS NULL OR rv.society_id = p_society_id)
        AND (
            rv.full_name ILIKE '%' || p_query || '%'
            OR rv.flat_number ILIKE '%' || p_query || '%'
        )
    ORDER BY rv.flat_number
    LIMIT 50;
END;
$$;

GRANT EXECUTE ON FUNCTION search_residents TO authenticated;
```

#### 4.2 Frontend Hook

**File:** `hooks/useResidentLookup.ts`

```typescript
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ResidentSearchResult {
  id: string;
  full_name: string;
  flat_number: string;
  profile_photo_url: string | null;
  masked_phone: string | null;
  is_owner: boolean;
  move_in_date: string | null;
}

export function useResidentLookup() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ResidentSearchResult[]>([]);
  const supabase = createClient();

  const searchResidents = async (query: string, societyId?: string) => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('search_residents', {
        p_query: query.trim(),
        p_society_id: societyId || null,
      });

      if (error) throw error;

      setResults(data || []);
    } catch (error: any) {
      console.error('Failed to search residents:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    searchResidents,
    results,
    isLoading,
  };
}
```

#### 4.3 UI Component

**File:** `app/(dashboard)/test-guard/page.tsx`

Add a search interface:
1. Search input with debounce (300ms)
2. Display results in a card grid
3. Show profile photo, name, flat number, and masked phone
4. Add a "Verify" button that marks the resident as verified in the visitor log

---

### Day 5: HRMS Compliance (BGV & Payroll)

**Objective:** Enforce BGV document uploads and implement payslip generation.

#### 5.1 Database Schema (via Supabase MCP)

```sql
-- Migration: 005_hrms_compliance_enforcement.sql

-- Add BGV document tracking to employees
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS bgv_docs_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bgv_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS bgv_verified_by UUID REFERENCES users(id);

-- Create CHECK constraint: Cannot hire without BGV docs
ALTER TABLE employees
ADD CONSTRAINT hiring_requires_bgv
CHECK (
    (status != 'hired') OR 
    (status = 'hired' AND bgv_docs_count >= 2)
);

-- Trigger: Update bgv_docs_count when documents are uploaded
CREATE OR REPLACE FUNCTION update_bgv_docs_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE employees
    SET bgv_docs_count = (
        SELECT COUNT(*)
        FROM employee_documents
        WHERE employee_id = NEW.employee_id
        AND document_type IN ('police_verification', 'address_proof')
        AND document_url IS NOT NULL
    )
    WHERE id = NEW.employee_id;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_bgv_docs_count
AFTER INSERT OR UPDATE ON employee_documents
FOR EACH ROW
EXECUTE FUNCTION update_bgv_docs_count();
```

#### 5.2 Payslip Generation

**File:** `hooks/usePayroll.ts`

Add a method `generatePayslip(employeeId, month, year)` that:
1. Fetches employee data, salary components, and attendance
2. Calculates deductions based on attendance
3. Uses `jspdf` to generate a PDF on the client side
4. Returns a downloadable blob

**Implementation Note:** Use a template that includes:
- Company logo and details
- Employee name, ID, designation
- Salary breakdown (base, allowances, deductions)
- Net pay
- Attendance summary

---

### Day 6: Type Safety & Stability Sprint

**Objective:** Remove `as any` casts and improve type safety.

#### 6.1 Generate Supabase Types

```bash
npx supabase gen types typescript --project-id <your-project-id> > src/types/supabase.ts
```

#### 6.2 Refactor Top 10 Hooks

Priority targets (based on usage frequency):
1. `hooks/usePurchaseOrders.ts`
2. `hooks/useAttendance.ts`
3. `hooks/useVisitors.ts`
4. `hooks/useServiceRequests.ts`
5. `hooks/useGRN.ts`
6. `hooks/useSupplierBills.ts`
7. `hooks/useReconciliation.ts`
8. `hooks/useEmployees.ts`
9. `hooks/useInventory.ts`
10. `hooks/usePayroll.ts`

For each hook:
- Replace `as any` with proper types from `src/types/supabase.ts`
- Add explicit return types
- Use `Database['public']['Tables']['table_name']['Row']` for row types

#### 6.3 Mobile Optimization

Identify 3 high-traffic pages and optimize for mobile:
1. **Dashboard** — Remove `"use client"` where possible, use Server Components
2. **Visitor Logs** — Implement virtualized list for performance
3. **Service Requests** — Add skeleton loaders for better perceived performance

---

### Day 7: Final Audit & Production Smoke Test

**Objective:** Verify all changes against `SYSTEM_STATE_V1.md` and ensure production readiness.

#### 7.1 Verification Checklist

- [ ] All database migrations applied successfully
- [ ] All RPCs tested with valid and invalid inputs
- [ ] RLS policies verified (no unauthorized access)
- [ ] All UI components render correctly on mobile
- [ ] Evidence upload flow tested end-to-end
- [ ] 3-Way Match gate prevents unauthorized payouts
- [ ] Resident search returns masked phone numbers
- [ ] BGV constraint blocks hiring without documents
- [ ] Payslip generation works for all employees
- [ ] Type errors resolved (zero `as any` in top 10 hooks)

#### 7.2 Production Smoke Test

Run the following scenarios:
1. **Delivery Boy:** Log material arrival with photo
2. **Service Boy:** Start and complete a task with before/after photos
3. **Finance Manager:** Attempt to pay an unreconciled bill (should fail)
4. **Guard:** Search for a resident and verify identity
5. **HR Manager:** Attempt to hire a candidate without BGV docs (should fail)
6. **Employee:** Download payslip for the current month

---

## 🔧 MCP Server Usage Guide

### How to Use Supabase MCP for This Plan

For each **"Database Schema (via Supabase MCP)"** section:

1. **Check Current Schema:**
   ```
   Use the Supabase MCP to describe the current schema of the [table_name] table.
   ```

2. **Apply Migration:**
   ```
   Use the Supabase MCP to execute the following SQL migration:
   [Paste the SQL from the migration section]
   ```

3. **Verify RPC:**
   ```
   Use the Supabase MCP to test the [function_name] RPC with the following parameters:
   [Provide test parameters]
   ```

4. **Check RLS Policies:**
   ```
   Use the Supabase MCP to list all RLS policies on the [table_name] table.
   ```

### Example MCP Workflow (Day 1)

```
Step 1: Check if material_arrival_logs table exists
> Use Supabase MCP to check if the table 'material_arrival_logs' exists in the public schema.

Step 2: Apply migration
> Use Supabase MCP to execute the migration from 001_delivery_truth_engine.sql

Step 3: Verify RPC
> Use Supabase MCP to test the log_material_arrival RPC with:
  - p_po_id: [valid PO UUID]
  - p_vehicle_number: "MH01AB1234"
  - p_arrival_photo_url: "https://[project].supabase.co/storage/v1/object/public/deliveries/test.jpg"

Step 4: Verify RLS
> Use Supabase MCP to verify that only delivery_boy and security_guard roles can insert into material_arrival_logs.
```

---

## 📊 Success Criteria

Phase E (Operational Truth) is complete when:

1. ✅ **Delivery Dashboard** is fully functional with photo/signature capture
2. ✅ **Service Boy Dashboard** enforces before/after photo requirement
3. ✅ **Finance 3-Way Match** blocks unauthorized payouts at the database level
4. ✅ **Guard Directory** provides privacy-safe resident lookup
5. ✅ **HRMS BGV** blocks hiring without mandatory documents
6. ✅ **Type Safety** — Zero `as any` in top 10 hooks
7. ✅ **Production Smoke Test** — All scenarios pass without errors
8. ✅ **Audit Trail** — All critical actions logged in `audit_logs` table

---

## 🚨 Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Database constraints break existing flows | Medium | High | Test all existing features after migration |
| Photo upload fails on poor network | High | Medium | Implement retry logic with exponential backoff |
| Guards bypass resident verification | Low | High | Audit log all searches; periodic review |
| BGV constraint blocks legitimate hires | Medium | Medium | Add admin override with mandatory reason |
| Type refactoring introduces bugs | Medium | High | Incremental refactoring; test after each hook |

---

## 📚 References

### Internal
- `SYSTEM_STATE_V1.md` — Current baseline
- `docs/PhaseE/IMPLEMENTATION_PLAN.md` — Original Phase E plan
- `supabase/migrations/` — Existing migrations
- `hooks/` — Existing frontend hooks

### External
- [Supabase RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL CHECK Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [jsPDF Documentation](https://github.com/parallax/jsPDF)

---

**Document Owner:** Production Delivery Engineer  
**Reviewers:** System Architect, Tech Lead  
**Next Review:** Post-implementation (Day 7)

---

*This is a living document. Update as implementation details are refined.*
