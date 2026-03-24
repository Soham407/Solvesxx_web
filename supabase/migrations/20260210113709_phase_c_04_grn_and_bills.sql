
-- ============================================
-- PHASE C MIGRATION 04: GRN & BILLS
-- ============================================

-- MATERIAL RECEIPTS (GRN) TABLE
CREATE TABLE IF NOT EXISTS material_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grn_number VARCHAR(20) UNIQUE,
    purchase_order_id UUID REFERENCES purchase_orders(id),
    supplier_id UUID REFERENCES suppliers(id),
    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    received_by UUID REFERENCES employees(id),
    warehouse_id UUID REFERENCES warehouses(id),
    status grn_status DEFAULT 'draft' NOT NULL,
    quality_checked_by UUID REFERENCES employees(id),
    quality_checked_at TIMESTAMP WITH TIME ZONE,
    total_received_value BIGINT DEFAULT 0,
    delivery_challan_number VARCHAR(100),
    vehicle_number VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- MATERIAL RECEIPT ITEMS TABLE
CREATE TABLE IF NOT EXISTS material_receipt_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_receipt_id UUID NOT NULL REFERENCES material_receipts(id) ON DELETE CASCADE,
    po_item_id UUID REFERENCES purchase_order_items(id),
    product_id UUID REFERENCES products(id),
    item_description TEXT,
    ordered_quantity DECIMAL(10, 2),
    received_quantity DECIMAL(10, 2) NOT NULL,
    accepted_quantity DECIMAL(10, 2),
    rejected_quantity DECIMAL(10, 2) DEFAULT 0,
    quality_status VARCHAR(20) DEFAULT 'pending' CHECK (quality_status IN ('pending', 'good', 'damaged', 'partial', 'rejected')),
    rejection_reason TEXT,
    unit_price BIGINT,
    line_total BIGINT,
    unmatched_qty DECIMAL(10, 2),
    unmatched_amount BIGINT,
    batch_number VARCHAR(50),
    expiry_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_material_receipts_status ON material_receipts(status);
CREATE INDEX IF NOT EXISTS idx_material_receipts_po ON material_receipts(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_material_receipts_supplier ON material_receipts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_material_receipts_created_at ON material_receipts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_material_receipt_items_grn ON material_receipt_items(material_receipt_id);
CREATE INDEX IF NOT EXISTS idx_material_receipt_items_po_item ON material_receipt_items(po_item_id);
CREATE INDEX IF NOT EXISTS idx_material_receipt_items_product ON material_receipt_items(product_id);

ALTER TABLE material_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_receipt_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View Material Receipts" ON material_receipts FOR SELECT TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod', 'account', 'company_md'));
CREATE POLICY "Manage Material Receipts" ON material_receipts FOR ALL TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod', 'account'));
CREATE POLICY "View Material Receipt Items" ON material_receipt_items FOR SELECT TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod', 'account', 'company_md'));
CREATE POLICY "Manage Material Receipt Items" ON material_receipt_items FOR ALL TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod', 'account'));

-- PURCHASE BILLS TABLE
CREATE TABLE IF NOT EXISTS purchase_bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_number VARCHAR(30) UNIQUE,
    supplier_invoice_number VARCHAR(100),
    purchase_order_id UUID REFERENCES purchase_orders(id),
    material_receipt_id UUID REFERENCES material_receipts(id),
    supplier_id UUID REFERENCES suppliers(id),
    bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'disputed')),
    payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
    subtotal BIGINT DEFAULT 0,
    tax_amount BIGINT DEFAULT 0,
    discount_amount BIGINT DEFAULT 0,
    total_amount BIGINT NOT NULL DEFAULT 0,
    paid_amount BIGINT DEFAULT 0,
    due_amount BIGINT DEFAULT 0,
    last_payment_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- PURCHASE BILL ITEMS TABLE
CREATE TABLE IF NOT EXISTS purchase_bill_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_bill_id UUID NOT NULL REFERENCES purchase_bills(id) ON DELETE CASCADE,
    po_item_id UUID REFERENCES purchase_order_items(id),
    grn_item_id UUID REFERENCES material_receipt_items(id),
    product_id UUID REFERENCES products(id),
    item_description TEXT,
    billed_quantity DECIMAL(10, 2) NOT NULL,
    unit_of_measure VARCHAR(20) DEFAULT 'pcs',
    unit_price BIGINT NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    tax_amount BIGINT DEFAULT 0,
    discount_amount BIGINT DEFAULT 0,
    line_total BIGINT NOT NULL,
    unmatched_qty DECIMAL(10, 2),
    unmatched_amount BIGINT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_purchase_bills_status ON purchase_bills(status);
CREATE INDEX IF NOT EXISTS idx_purchase_bills_payment_status ON purchase_bills(payment_status);
CREATE INDEX IF NOT EXISTS idx_purchase_bills_supplier ON purchase_bills(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_bills_po ON purchase_bills(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_bills_grn ON purchase_bills(material_receipt_id);
CREATE INDEX IF NOT EXISTS idx_purchase_bills_created_at ON purchase_bills(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_bill_items_bill ON purchase_bill_items(purchase_bill_id);
CREATE INDEX IF NOT EXISTS idx_purchase_bill_items_product ON purchase_bill_items(product_id);

ALTER TABLE purchase_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_bill_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View Purchase Bills" ON purchase_bills FOR SELECT TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod', 'account', 'company_md'));
CREATE POLICY "Manage Purchase Bills" ON purchase_bills FOR ALL TO authenticated
    USING (get_user_role() IN ('admin', 'account'));
CREATE POLICY "View Purchase Bill Items" ON purchase_bill_items FOR SELECT TO authenticated
    USING (get_user_role() IN ('admin', 'company_hod', 'account', 'company_md'));
CREATE POLICY "Manage Purchase Bill Items" ON purchase_bill_items FOR ALL TO authenticated
    USING (get_user_role() IN ('admin', 'account'));

-- Now add FK references from reconciliations to the newly created tables
ALTER TABLE reconciliations ADD CONSTRAINT reconciliations_purchase_bill_id_fkey 
    FOREIGN KEY (purchase_bill_id) REFERENCES purchase_bills(id);
ALTER TABLE reconciliations ADD CONSTRAINT reconciliations_purchase_order_id_fkey 
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id);
ALTER TABLE reconciliations ADD CONSTRAINT reconciliations_material_receipt_id_fkey 
    FOREIGN KEY (material_receipt_id) REFERENCES material_receipts(id);
;
