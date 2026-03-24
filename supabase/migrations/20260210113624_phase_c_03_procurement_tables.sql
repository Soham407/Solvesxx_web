
-- ============================================
-- PHASE C MIGRATION 03: PROCUREMENT TABLES
-- ============================================

-- RECONCILIATIONS TABLE
CREATE TABLE reconciliations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reconciliation_number VARCHAR(20) UNIQUE,
    purchase_bill_id UUID,
    purchase_order_id UUID,
    material_receipt_id UUID,
    bill_amount DECIMAL(14, 2),
    po_amount DECIMAL(14, 2),
    grn_amount DECIMAL(14, 2),
    bill_po_variance DECIMAL(14, 2),
    bill_grn_variance DECIMAL(14, 2),
    po_grn_variance DECIMAL(14, 2),
    status reconciliation_status DEFAULT 'pending' NOT NULL,
    discrepancy_type VARCHAR(100),
    discrepancy_notes TEXT,
    resolution_action VARCHAR(100),
    resolution_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id),
    adjusted_amount DECIMAL(14, 2),
    adjustment_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_reconciliations_status ON reconciliations(status);
CREATE INDEX idx_reconciliations_bill ON reconciliations(purchase_bill_id);
CREATE INDEX idx_reconciliations_po ON reconciliations(purchase_order_id);
CREATE INDEX idx_reconciliations_grn ON reconciliations(material_receipt_id);
CREATE INDEX idx_reconciliations_created ON reconciliations(created_at DESC);

ALTER TABLE reconciliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View Reconciliations" ON reconciliations FOR SELECT TO authenticated
    USING (get_user_role() IN ('admin', 'account', 'company_hod', 'company_md'));
CREATE POLICY "Manage Reconciliations" ON reconciliations FOR ALL TO authenticated
    USING (get_user_role() IN ('admin', 'account'));

-- RECONCILIATION LINES TABLE
CREATE TABLE reconciliation_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reconciliation_id UUID NOT NULL REFERENCES reconciliations(id) ON DELETE CASCADE,
    po_item_id UUID,
    grn_item_id UUID,
    bill_item_id UUID,
    product_id UUID REFERENCES products(id),
    matched_qty DECIMAL(10, 2) NOT NULL DEFAULT 0,
    matched_amount BIGINT NOT NULL DEFAULT 0,
    po_unit_price BIGINT,
    grn_unit_price BIGINT,
    bill_unit_price BIGINT,
    unit_price_variance BIGINT DEFAULT 0,
    qty_ordered DECIMAL(10, 2),
    qty_received DECIMAL(10, 2),
    qty_billed DECIMAL(10, 2),
    qty_variance DECIMAL(10, 2) DEFAULT 0,
    match_type TEXT NOT NULL CHECK (match_type IN ('PO_GRN', 'GRN_BILL', 'PO_BILL', 'THREE_WAY')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'variance', 'resolved')),
    resolution_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reconciliation_lines_reconciliation ON reconciliation_lines(reconciliation_id);
CREATE INDEX idx_reconciliation_lines_po_item ON reconciliation_lines(po_item_id) WHERE po_item_id IS NOT NULL;
CREATE INDEX idx_reconciliation_lines_grn_item ON reconciliation_lines(grn_item_id) WHERE grn_item_id IS NOT NULL;
CREATE INDEX idx_reconciliation_lines_bill_item ON reconciliation_lines(bill_item_id) WHERE bill_item_id IS NOT NULL;
CREATE INDEX idx_reconciliation_lines_product ON reconciliation_lines(product_id);
CREATE INDEX idx_reconciliation_lines_status ON reconciliation_lines(status);

ALTER TABLE reconciliation_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View Reconciliation Lines" ON reconciliation_lines FOR SELECT TO authenticated
    USING (get_user_role() IN ('admin', 'account', 'company_hod', 'company_md'));
CREATE POLICY "Manage Reconciliation Lines" ON reconciliation_lines FOR ALL TO authenticated
    USING (get_user_role() IN ('admin', 'account'));

-- INDENTS TABLE
CREATE TABLE IF NOT EXISTS indents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    indent_number VARCHAR(20) UNIQUE,
    requester_id UUID NOT NULL REFERENCES employees(id),
    department VARCHAR(100),
    location_id UUID REFERENCES company_locations(id),
    society_id UUID REFERENCES societies(id),
    title VARCHAR(200),
    purpose TEXT,
    required_date DATE,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status indent_status DEFAULT 'draft' NOT NULL,
    total_items INTEGER DEFAULT 0,
    total_estimated_value BIGINT DEFAULT 0,
    submitted_at TIMESTAMP WITH TIME ZONE,
    submitted_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES auth.users(id),
    approver_notes TEXT,
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejected_by UUID REFERENCES auth.users(id),
    rejection_reason TEXT,
    po_created_at TIMESTAMP WITH TIME ZONE,
    linked_po_id UUID,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- INDENT ITEMS TABLE
CREATE TABLE IF NOT EXISTS indent_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    indent_id UUID NOT NULL REFERENCES indents(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    item_description TEXT,
    specifications TEXT,
    requested_quantity DECIMAL(10, 2) NOT NULL,
    unit_of_measure VARCHAR(20) DEFAULT 'pcs',
    estimated_unit_price BIGINT,
    estimated_total BIGINT,
    approved_quantity DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_indents_status ON indents(status);
CREATE INDEX IF NOT EXISTS idx_indents_requester ON indents(requester_id);
CREATE INDEX IF NOT EXISTS idx_indents_department ON indents(department);
CREATE INDEX IF NOT EXISTS idx_indents_created_at ON indents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_indents_location ON indents(location_id);
CREATE INDEX IF NOT EXISTS idx_indents_society ON indents(society_id);
CREATE INDEX IF NOT EXISTS idx_indent_items_indent ON indent_items(indent_id);
CREATE INDEX IF NOT EXISTS idx_indent_items_product ON indent_items(product_id);

ALTER TABLE indents ENABLE ROW LEVEL SECURITY;
ALTER TABLE indent_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View Indents" ON indents FOR SELECT TO authenticated
    USING (
        requester_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
        OR get_user_role() IN ('admin', 'company_hod', 'account', 'company_md')
    );
CREATE POLICY "Create Indents" ON indents FOR INSERT TO authenticated
    WITH CHECK (get_user_role() IN ('admin', 'company_hod', 'account', 'security_supervisor', 'society_manager'));
CREATE POLICY "Update Own Indents" ON indents FOR UPDATE TO authenticated
    USING (
        (requester_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid()) AND status = 'draft')
        OR get_user_role() IN ('admin', 'company_hod')
    );
CREATE POLICY "Delete Draft Indents" ON indents FOR DELETE TO authenticated
    USING (
        (requester_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid()) AND status = 'draft')
        OR get_user_role() IN ('admin')
    );

CREATE POLICY "View Indent Items" ON indent_items FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM indents i 
            WHERE i.id = indent_items.indent_id
            AND (
                i.requester_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
                OR get_user_role() IN ('admin', 'company_hod', 'account', 'company_md')
            )
        )
    );
CREATE POLICY "Manage Indent Items" ON indent_items FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM indents i 
            WHERE i.id = indent_items.indent_id
            AND (
                (i.requester_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid()) AND i.status = 'draft')
                OR get_user_role() IN ('admin', 'company_hod')
            )
        )
    );

-- PURCHASE ORDERS TABLE
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number VARCHAR(20) UNIQUE,
    indent_id UUID REFERENCES indents(id),
    supplier_id UUID REFERENCES suppliers(id),
    po_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    status po_status DEFAULT 'draft' NOT NULL,
    shipping_address TEXT,
    billing_address TEXT,
    subtotal BIGINT DEFAULT 0,
    tax_amount BIGINT DEFAULT 0,
    discount_amount BIGINT DEFAULT 0,
    shipping_cost BIGINT DEFAULT 0,
    grand_total BIGINT DEFAULT 0,
    payment_terms TEXT,
    sent_to_vendor_at TIMESTAMP WITH TIME ZONE,
    vendor_acknowledged_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    terms_and_conditions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- PURCHASE ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    indent_item_id UUID REFERENCES indent_items(id),
    product_id UUID REFERENCES products(id),
    item_description TEXT,
    specifications TEXT,
    ordered_quantity DECIMAL(10, 2) NOT NULL,
    unit_of_measure VARCHAR(20) DEFAULT 'pcs',
    received_quantity DECIMAL(10, 2) DEFAULT 0,
    unit_price BIGINT NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    tax_amount BIGINT DEFAULT 0,
    discount_percent DECIMAL(5, 2) DEFAULT 0,
    discount_amount BIGINT DEFAULT 0,
    line_total BIGINT NOT NULL,
    unmatched_qty DECIMAL(10, 2),
    unmatched_amount BIGINT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_indent ON purchase_orders(indent_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_at ON purchase_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product ON purchase_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_indent_item ON purchase_order_items(indent_item_id);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View Purchase Orders" ON purchase_orders FOR SELECT TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod', 'account', 'company_md'));
CREATE POLICY "Manage Purchase Orders" ON purchase_orders FOR ALL TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod', 'account'));
CREATE POLICY "View Purchase Order Items" ON purchase_order_items FOR SELECT TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod', 'account', 'company_md'));
CREATE POLICY "Manage Purchase Order Items" ON purchase_order_items FOR ALL TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod', 'account'));

-- Add FK from indents to purchase_orders
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'indents_linked_po_fk'
    ) THEN
        ALTER TABLE indents 
        ADD CONSTRAINT indents_linked_po_fk 
        FOREIGN KEY (linked_po_id) REFERENCES purchase_orders(id);
    END IF;
END $$;
;
