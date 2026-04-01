-- Ensure super_admin has the same procurement visibility/management access as admin paths.

-- INDENTS
DROP POLICY IF EXISTS "View Indents" ON public.indents;
CREATE POLICY "View Indents" ON public.indents FOR SELECT TO authenticated
    USING (
        requester_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
        OR get_user_role() IN ('admin', 'super_admin', 'company_hod', 'account', 'company_md')
    );

DROP POLICY IF EXISTS "Create Indents" ON public.indents;
CREATE POLICY "Create Indents" ON public.indents FOR INSERT TO authenticated
    WITH CHECK (get_user_role() IN ('admin', 'super_admin', 'company_hod', 'account', 'security_supervisor', 'society_manager'));

DROP POLICY IF EXISTS "Update Own Indents" ON public.indents;
CREATE POLICY "Update Own Indents" ON public.indents FOR UPDATE TO authenticated
    USING (
        (requester_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid()) AND status = 'draft')
        OR get_user_role() IN ('admin', 'super_admin', 'company_hod')
    );

DROP POLICY IF EXISTS "Delete Draft Indents" ON public.indents;
CREATE POLICY "Delete Draft Indents" ON public.indents FOR DELETE TO authenticated
    USING (
        (requester_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid()) AND status = 'draft')
        OR get_user_role() IN ('admin', 'super_admin')
    );

-- INDENT ITEMS
DROP POLICY IF EXISTS "View Indent Items" ON public.indent_items;
CREATE POLICY "View Indent Items" ON public.indent_items FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.indents i 
            WHERE i.id = indent_items.indent_id
            AND (
                i.requester_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
                OR get_user_role() IN ('admin', 'super_admin', 'company_hod', 'account', 'company_md')
            )
        )
    );

DROP POLICY IF EXISTS "Manage Indent Items" ON public.indent_items;
CREATE POLICY "Manage Indent Items" ON public.indent_items FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.indents i 
            WHERE i.id = indent_items.indent_id
            AND (
                (i.requester_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid()) AND i.status = 'draft')
                OR get_user_role() IN ('admin', 'super_admin', 'company_hod')
            )
        )
    );

-- PURCHASE ORDERS
DROP POLICY IF EXISTS "View Purchase Orders" ON public.purchase_orders;
CREATE POLICY "View Purchase Orders" ON public.purchase_orders FOR SELECT TO authenticated
    USING (get_user_role() IN ('admin', 'super_admin', 'company_hod', 'account', 'company_md'));

DROP POLICY IF EXISTS "Manage Purchase Orders" ON public.purchase_orders;
CREATE POLICY "Manage Purchase Orders" ON public.purchase_orders FOR ALL TO authenticated
    USING (get_user_role() IN ('admin', 'super_admin', 'company_hod', 'account'));

-- PURCHASE ORDER ITEMS
DROP POLICY IF EXISTS "View Purchase Order Items" ON public.purchase_order_items;
CREATE POLICY "View Purchase Order Items" ON public.purchase_order_items FOR SELECT TO authenticated
    USING (get_user_role() IN ('admin', 'super_admin', 'company_hod', 'account', 'company_md'));

DROP POLICY IF EXISTS "Manage Purchase Order Items" ON public.purchase_order_items;
CREATE POLICY "Manage Purchase Order Items" ON public.purchase_order_items FOR ALL TO authenticated
    USING (get_user_role() IN ('admin', 'super_admin', 'company_hod', 'account'));

-- RECONCILIATIONS
DROP POLICY IF EXISTS "View Reconciliations" ON public.reconciliations;
CREATE POLICY "View Reconciliations" ON public.reconciliations FOR SELECT TO authenticated
    USING (get_user_role() IN ('admin', 'super_admin', 'account', 'company_hod', 'company_md'));

DROP POLICY IF EXISTS "Manage Reconciliations" ON public.reconciliations;
CREATE POLICY "Manage Reconciliations" ON public.reconciliations FOR ALL TO authenticated
    USING (get_user_role() IN ('admin', 'super_admin', 'account'));

-- RECONCILIATION LINES
DROP POLICY IF EXISTS "View Reconciliation Lines" ON public.reconciliation_lines;
CREATE POLICY "View Reconciliation Lines" ON public.reconciliation_lines FOR SELECT TO authenticated
    USING (get_user_role() IN ('admin', 'super_admin', 'account', 'company_hod', 'company_md'));

DROP POLICY IF EXISTS "Manage Reconciliation Lines" ON public.reconciliation_lines;
CREATE POLICY "Manage Reconciliation Lines" ON public.reconciliation_lines FOR ALL TO authenticated
    USING (get_user_role() IN ('admin', 'super_admin', 'account'));
