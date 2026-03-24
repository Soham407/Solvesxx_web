-- 1. Update Enums
ALTER TYPE public.po_status ADD VALUE IF NOT EXISTS 'dispatched';

-- 2. Enhance Users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id);

-- 3. Enhance Purchase Orders table for dispatch
ALTER TABLE public.purchase_orders 
ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS vehicle_details TEXT,
ADD COLUMN IF NOT EXISTS dispatch_notes TEXT;

-- 4. Enhance Requests table for supplier link
ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id),
ADD COLUMN IF NOT EXISTS indent_id UUID REFERENCES public.indents(id);

-- 5. RLS Policies for Supplier

-- Policy for requests: Suppliers can see and update requests assigned to them
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Suppliers can view assigned requests" ON public.requests;
CREATE POLICY "Suppliers can view assigned requests" 
ON public.requests 
FOR SELECT 
USING (
  supplier_id IN (
    SELECT supplier_id FROM public.users WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Suppliers can update assigned requests" ON public.requests;
CREATE POLICY "Suppliers can update assigned requests" 
ON public.requests 
FOR UPDATE
USING (
  supplier_id IN (
    SELECT supplier_id FROM public.users WHERE id = auth.uid()
  )
)
WITH CHECK (
  supplier_id IN (
    SELECT supplier_id FROM public.users WHERE id = auth.uid()
  )
);

-- Policy for purchase_orders: Suppliers can see and update their own POs
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Suppliers can view own purchase orders" ON public.purchase_orders;
CREATE POLICY "Suppliers can view own purchase orders" 
ON public.purchase_orders 
FOR SELECT 
USING (
  supplier_id IN (
    SELECT supplier_id FROM public.users WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Suppliers can update own purchase orders" ON public.purchase_orders;
CREATE POLICY "Suppliers can update own purchase orders" 
ON public.purchase_orders 
FOR UPDATE
USING (
  supplier_id IN (
    SELECT supplier_id FROM public.users WHERE id = auth.uid()
  )
)
WITH CHECK (
  supplier_id IN (
    SELECT supplier_id FROM public.users WHERE id = auth.uid()
  )
);

-- Policy for purchase_bills: Suppliers can see and create their own bills
ALTER TABLE public.purchase_bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Suppliers can view own purchase bills" ON public.purchase_bills;
CREATE POLICY "Suppliers can view own purchase bills" 
ON public.purchase_bills 
FOR SELECT 
USING (
  supplier_id IN (
    SELECT supplier_id FROM public.users WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Suppliers can create purchase bills" ON public.purchase_bills;
CREATE POLICY "Suppliers can create purchase bills" 
ON public.purchase_bills 
FOR INSERT 
WITH CHECK (
  supplier_id IN (
    SELECT supplier_id FROM public.users WHERE id = auth.uid()
  )
);
;
